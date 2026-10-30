package sales

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Grosterx/tasteroute/internal/id"
)

var (
	ErrInvalid  = errors.New("invalid sales lead")
	ErrNotFound = errors.New("sales lead not found")
)

var validStatuses = map[string]bool{
	"new":       true,
	"contacted": true,
	"demo":      true,
	"won":       true,
	"lost":      true,
}

type Lead struct {
	ID             string    `json:"id"`
	RestaurantName string    `json:"restaurant_name"`
	ContactName    string    `json:"contact_name"`
	Phone          string    `json:"phone"`
	Email          string    `json:"email"`
	City           string    `json:"city"`
	Message        string    `json:"message"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type CreateInput struct {
	RestaurantName string
	ContactName    string
	Phone          string
	Email          string
	City           string
	Message        string
}

const columns = `id, restaurant_name, contact_name, phone, email, city, message, status, created_at, updated_at`

func Create(ctx context.Context, db *pgxpool.Pool, input CreateInput) (Lead, error) {
	input.RestaurantName = strings.TrimSpace(input.RestaurantName)
	input.ContactName = strings.TrimSpace(input.ContactName)
	input.Phone = strings.TrimSpace(input.Phone)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	input.City = strings.TrimSpace(input.City)
	input.Message = strings.TrimSpace(input.Message)
	if input.City == "" {
		input.City = "Тольятти"
	}
	if input.RestaurantName == "" || input.ContactName == "" || input.Phone == "" {
		return Lead{}, fmt.Errorf("%w: restaurant, contact and phone are required", ErrInvalid)
	}
	if len([]rune(input.RestaurantName)) > 120 || len([]rune(input.ContactName)) > 80 ||
		len([]rune(input.Phone)) > 40 || len([]rune(input.Email)) > 120 ||
		len([]rune(input.City)) > 80 || len([]rune(input.Message)) > 1000 {
		return Lead{}, ErrInvalid
	}

	var lead Lead
	err := db.QueryRow(ctx, `
		INSERT INTO sales_leads (
			id, restaurant_name, contact_name, phone, email, city, message
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING `+columns,
		id.New(), input.RestaurantName, input.ContactName, input.Phone,
		input.Email, input.City, input.Message,
	).Scan(
		&lead.ID, &lead.RestaurantName, &lead.ContactName, &lead.Phone,
		&lead.Email, &lead.City, &lead.Message, &lead.Status,
		&lead.CreatedAt, &lead.UpdatedAt,
	)
	if err != nil {
		return Lead{}, fmt.Errorf("create sales lead: %w", err)
	}
	return lead, nil
}

func List(ctx context.Context, db *pgxpool.Pool) ([]Lead, error) {
	rows, err := db.Query(ctx, `
		SELECT `+columns+`
		FROM sales_leads
		ORDER BY created_at DESC
		LIMIT 200`)
	if err != nil {
		return nil, fmt.Errorf("list sales leads: %w", err)
	}
	defer rows.Close()

	out := make([]Lead, 0)
	for rows.Next() {
		var lead Lead
		if err := rows.Scan(
			&lead.ID, &lead.RestaurantName, &lead.ContactName, &lead.Phone,
			&lead.Email, &lead.City, &lead.Message, &lead.Status,
			&lead.CreatedAt, &lead.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan sales lead: %w", err)
		}
		out = append(out, lead)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate sales leads: %w", err)
	}
	return out, nil
}

func UpdateStatus(ctx context.Context, db *pgxpool.Pool, leadID, status string) (Lead, error) {
	status = strings.TrimSpace(status)
	if !validStatuses[status] {
		return Lead{}, fmt.Errorf("%w: invalid status", ErrInvalid)
	}
	var lead Lead
	err := db.QueryRow(ctx, `
		UPDATE sales_leads SET status = $2, updated_at = now()
		WHERE id = $1
		RETURNING `+columns,
		leadID, status,
	).Scan(
		&lead.ID, &lead.RestaurantName, &lead.ContactName, &lead.Phone,
		&lead.Email, &lead.City, &lead.Message, &lead.Status,
		&lead.CreatedAt, &lead.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Lead{}, ErrNotFound
	}
	if err != nil {
		return Lead{}, fmt.Errorf("update sales lead: %w", err)
	}
	return lead, nil
}
