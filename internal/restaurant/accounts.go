package restaurant

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/Grosterx/tasteroute/internal/id"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailTaken         = errors.New("email already used")
	ErrWeakPassword       = errors.New("password must be at least 8 characters")
)

type Account struct {
	ID           string     `json:"account_id"`
	RestaurantID string     `json:"restaurant_id"`
	Email        string     `json:"email"`
	Role         string     `json:"role"`
	Active       bool       `json:"active"`
	CreatedAt    time.Time  `json:"created_at"`
	LastLoginAt  *time.Time `json:"last_login_at,omitempty"`
	TokenVersion int        `json:"-"`
}

const accountColumns = `id, restaurant_id, email, role, active, created_at, last_login_at, token_version`

func scanAccount(row pgx.Row) (Account, error) {
	var a Account
	err := row.Scan(&a.ID, &a.RestaurantID, &a.Email, &a.Role, &a.Active, &a.CreatedAt, &a.LastLoginAt, &a.TokenVersion)
	return a, err
}

func CreateOrUpdateAccount(ctx context.Context, db *pgxpool.Pool, restaurantID, email, password string) (Account, error) {
	email = normalizeEmail(email)
	if !validEmail(email) {
		return Account{}, fmt.Errorf("%w: invalid email", ErrInvalid)
	}
	if len(password) < 8 {
		return Account{}, ErrWeakPassword
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return Account{}, fmt.Errorf("hash password: %w", err)
	}

	var existingID, existingRestaurantID string
	err = db.QueryRow(ctx, `
		SELECT id, restaurant_id FROM restaurant_accounts WHERE lower(email) = lower($1)`, email,
	).Scan(&existingID, &existingRestaurantID)
	switch {
	case err == nil:
		if existingRestaurantID != restaurantID {
			return Account{}, ErrEmailTaken
		}
		row := db.QueryRow(ctx, `
			UPDATE restaurant_accounts SET
				password_hash = $2, active = true, token_version = token_version + 1
			WHERE id = $1
			RETURNING `+accountColumns,
			existingID, string(hash),
		)
		account, err := scanAccount(row)
		if err != nil {
			return Account{}, fmt.Errorf("update account: %w", err)
		}
		return account, nil
	case !errors.Is(err, pgx.ErrNoRows):
		return Account{}, fmt.Errorf("find account: %w", err)
	}

	row := db.QueryRow(ctx, `
		INSERT INTO restaurant_accounts (id, restaurant_id, email, password_hash, role)
		VALUES ($1, $2, $3, $4, 'owner')
		RETURNING `+accountColumns,
		id.New(), restaurantID, email, string(hash),
	)
	account, err := scanAccount(row)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return Account{}, ErrEmailTaken
		}
		return Account{}, fmt.Errorf("create account: %w", err)
	}
	return account, nil
}

func Authenticate(ctx context.Context, db *pgxpool.Pool, email, password string) (Account, Restaurant, error) {
	email = normalizeEmail(email)
	if email == "" || password == "" {
		return Account{}, Restaurant{}, ErrInvalidCredentials
	}

	var account Account
	var hash string
	err := db.QueryRow(ctx, `
		SELECT `+accountColumns+`, password_hash
		FROM restaurant_accounts
		WHERE lower(email) = lower($1)`, email,
	).Scan(
		&account.ID, &account.RestaurantID, &account.Email, &account.Role,
		&account.Active, &account.CreatedAt, &account.LastLoginAt, &account.TokenVersion, &hash,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Account{}, Restaurant{}, ErrInvalidCredentials
	}
	if err != nil {
		return Account{}, Restaurant{}, fmt.Errorf("load account: %w", err)
	}
	if !account.Active {
		return Account{}, Restaurant{}, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return Account{}, Restaurant{}, ErrInvalidCredentials
	}

	found, err := GetByID(ctx, db, account.RestaurantID)
	if errors.Is(err, ErrNotFound) {
		return Account{}, Restaurant{}, ErrInvalidCredentials
	}
	if err != nil {
		return Account{}, Restaurant{}, err
	}
	if !found.Active {
		return Account{}, Restaurant{}, ErrInvalidCredentials
	}

	_, err = db.Exec(ctx, `UPDATE restaurant_accounts SET last_login_at = now() WHERE id = $1`, account.ID)
	if err != nil {
		return Account{}, Restaurant{}, fmt.Errorf("touch login: %w", err)
	}
	return account, found, nil
}

func GetAccountByID(ctx context.Context, db *pgxpool.Pool, accountID string) (Account, error) {
	row := db.QueryRow(ctx, `SELECT `+accountColumns+` FROM restaurant_accounts WHERE id = $1`, accountID)
	account, err := scanAccount(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Account{}, ErrNotFound
	}
	if err != nil {
		return Account{}, fmt.Errorf("get account: %w", err)
	}
	return account, nil
}

func ChangePassword(ctx context.Context, db *pgxpool.Pool, accountID, currentPassword, newPassword string) error {
	if len(newPassword) < 8 {
		return ErrWeakPassword
	}
	var hash string
	err := db.QueryRow(ctx, `SELECT password_hash FROM restaurant_accounts WHERE id = $1`, accountID).Scan(&hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("load password: %w", err)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(currentPassword)); err != nil {
		return ErrInvalidCredentials
	}
	next, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	if _, err := db.Exec(ctx, `
		UPDATE restaurant_accounts
		SET password_hash = $2, token_version = token_version + 1
		WHERE id = $1`, accountID, string(next)); err != nil {
		return fmt.Errorf("change password: %w", err)
	}
	return nil
}

func ListAccounts(ctx context.Context, db *pgxpool.Pool, restaurantID string) ([]Account, error) {
	rows, err := db.Query(ctx, `
		SELECT `+accountColumns+`
		FROM restaurant_accounts
		WHERE restaurant_id = $1
		ORDER BY created_at`, restaurantID)
	if err != nil {
		return nil, fmt.Errorf("list accounts: %w", err)
	}
	defer rows.Close()

	out := make([]Account, 0)
	for rows.Next() {
		account, err := scanAccount(rows)
		if err != nil {
			return nil, fmt.Errorf("scan account: %w", err)
		}
		out = append(out, account)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate accounts: %w", err)
	}
	return out, nil
}

func normalizeEmail(v string) string {
	return strings.ToLower(strings.TrimSpace(v))
}

func validEmail(v string) bool {
	at := strings.IndexByte(v, '@')
	return at > 0 && at < len(v)-1 && !strings.ContainsAny(v, " \t\r\n")
}
