package restaurant

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Grosterx/tasteroute/internal/id"
)

var (
	ErrNotFound = errors.New("restaurant not found")
	ErrInvalid  = errors.New("invalid restaurant data")
)

var slugPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$`)

type Restaurant struct {
	ID          string     `json:"id"`
	Slug        string     `json:"slug"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Address     string     `json:"address"`
	City        string     `json:"city"`
	Cuisine     string     `json:"cuisine"`
	Phone       string     `json:"phone"`
	Website     string     `json:"website"`
	Hours       string     `json:"hours"`
	Lat         float64    `json:"lat"`
	Lon         float64    `json:"lon"`
	ImageURL    string     `json:"image_url"`
	CoverURL    string     `json:"cover_url"`
	Plan        string     `json:"plan,omitempty"`
	PlanStatus  string     `json:"plan_status,omitempty"`
	TrialEndsAt *time.Time `json:"trial_ends_at,omitempty"`
	Featured    bool       `json:"featured"`
	IsDemo      bool       `json:"is_demo,omitempty"`
	Active      bool       `json:"active"`
	CreatedAt   time.Time  `json:"created_at,omitempty"`
}

type PublicRestaurant struct {
	Restaurant
	Dishes []Dish `json:"dishes"`
}

type CreateInput struct {
	Slug        string     `json:"slug"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Address     string     `json:"address"`
	City        string     `json:"city"`
	Cuisine     string     `json:"cuisine"`
	Phone       string     `json:"phone"`
	Website     string     `json:"website"`
	Hours       string     `json:"hours"`
	Lat         float64    `json:"lat"`
	Lon         float64    `json:"lon"`
	ImageURL    string     `json:"image_url"`
	CoverURL    string     `json:"cover_url"`
	Plan        string     `json:"plan"`
	PlanStatus  string     `json:"plan_status"`
	TrialEndsAt *time.Time `json:"trial_ends_at"`
	Featured    bool       `json:"featured"`
	IsDemo      bool       `json:"is_demo"`
	Active      bool       `json:"active"`
}

type ProfileInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Address     string `json:"address"`
	Cuisine     string `json:"cuisine"`
	Phone       string `json:"phone"`
	Website     string `json:"website"`
	Hours       string `json:"hours"`
	ImageURL    string `json:"image_url"`
	CoverURL    string `json:"cover_url"`
}

type AdminUpdate struct {
	Slug        *string    `json:"slug"`
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
	Address     *string    `json:"address"`
	City        *string    `json:"city"`
	Cuisine     *string    `json:"cuisine"`
	Phone       *string    `json:"phone"`
	Website     *string    `json:"website"`
	Hours       *string    `json:"hours"`
	Lat         *float64   `json:"lat"`
	Lon         *float64   `json:"lon"`
	ImageURL    *string    `json:"image_url"`
	CoverURL    *string    `json:"cover_url"`
	Plan        *string    `json:"plan"`
	PlanStatus  *string    `json:"plan_status"`
	TrialEndsAt *time.Time `json:"trial_ends_at"`
	Featured    *bool      `json:"featured"`
	IsDemo      *bool      `json:"is_demo"`
	Active      *bool      `json:"active"`
}

const restaurantColumns = `
	id, slug, name, description, address, city, cuisine, phone, website, hours,
	lat, lon, image_url, cover_url, plan, plan_status, trial_ends_at,
	featured, is_demo, active, created_at`

func scanRestaurant(row pgx.Row) (Restaurant, error) {
	var r Restaurant
	err := row.Scan(
		&r.ID, &r.Slug, &r.Name, &r.Description, &r.Address, &r.City, &r.Cuisine,
		&r.Phone, &r.Website, &r.Hours, &r.Lat, &r.Lon, &r.ImageURL, &r.CoverURL,
		&r.Plan, &r.PlanStatus, &r.TrialEndsAt, &r.Featured, &r.IsDemo, &r.Active, &r.CreatedAt,
	)
	return r, err
}

func GetBySlug(ctx context.Context, db *pgxpool.Pool, slug string) (Restaurant, error) {
	slug = normalizeSlug(slug)
	var r Restaurant
	row := db.QueryRow(ctx, `SELECT `+restaurantColumns+` FROM restaurants WHERE slug = $1 AND active`, slug)
	r, err := scanRestaurant(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Restaurant{}, ErrNotFound
	}
	if err != nil {
		return Restaurant{}, fmt.Errorf("get restaurant by slug: %w", err)
	}
	return r, nil
}

func GetByID(ctx context.Context, db *pgxpool.Pool, restaurantID string) (Restaurant, error) {
	var r Restaurant
	row := db.QueryRow(ctx, `SELECT `+restaurantColumns+` FROM restaurants WHERE id = $1`, restaurantID)
	r, err := scanRestaurant(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Restaurant{}, ErrNotFound
	}
	if err != nil {
		return Restaurant{}, fmt.Errorf("get restaurant: %w", err)
	}
	return r, nil
}

func ListPublic(ctx context.Context, db *pgxpool.Pool, city string) ([]Restaurant, error) {
	city = strings.TrimSpace(city)
	rows, err := db.Query(ctx, `
		SELECT `+restaurantColumns+`
		FROM restaurants
		WHERE active AND ($1 = '' OR city = $1)
		ORDER BY featured DESC, name`, city)
	if err != nil {
		return nil, fmt.Errorf("list restaurants: %w", err)
	}
	defer rows.Close()

	out := make([]Restaurant, 0)
	for rows.Next() {
		r, err := scanRestaurant(rows)
		if err != nil {
			return nil, fmt.Errorf("scan restaurant: %w", err)
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate restaurants: %w", err)
	}
	return out, nil
}

func ListAdmin(ctx context.Context, db *pgxpool.Pool) ([]Restaurant, error) {
	rows, err := db.Query(ctx, `SELECT `+restaurantColumns+` FROM restaurants ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list admin restaurants: %w", err)
	}
	defer rows.Close()

	out := make([]Restaurant, 0)
	for rows.Next() {
		r, err := scanRestaurant(rows)
		if err != nil {
			return nil, fmt.Errorf("scan admin restaurant: %w", err)
		}
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin restaurants: %w", err)
	}
	return out, nil
}

func GetPublic(ctx context.Context, db *pgxpool.Pool, slug string) (PublicRestaurant, error) {
	found, err := GetBySlug(ctx, db, slug)
	if err != nil {
		return PublicRestaurant{}, err
	}
	dishes, err := ListDishes(ctx, db, found.ID, true)
	if err != nil {
		return PublicRestaurant{}, err
	}
	return PublicRestaurant{Restaurant: found, Dishes: dishes}, nil
}

func Create(ctx context.Context, db *pgxpool.Pool, input CreateInput) (Restaurant, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Slug = normalizeSlug(input.Slug)
	input.City = strings.TrimSpace(input.City)
	if input.City == "" {
		input.City = "Тольятти"
	}
	if input.Name == "" {
		return Restaurant{}, fmt.Errorf("%w: name is required", ErrInvalid)
	}
	if input.Slug == "" {
		input.Slug = generatedSlug()
	}
	if !slugPattern.MatchString(input.Slug) {
		return Restaurant{}, fmt.Errorf("%w: invalid slug", ErrInvalid)
	}
	if input.Plan == "" {
		input.Plan = "pilot"
	}
	if input.PlanStatus == "" {
		input.PlanStatus = "trial"
	}
	if !validPlan(input.Plan) || !validPlanStatus(input.PlanStatus) {
		return Restaurant{}, fmt.Errorf("%w: invalid plan", ErrInvalid)
	}
	if input.CoverURL == "" {
		input.CoverURL = input.ImageURL
	}

	restaurantID := id.New()
	row := db.QueryRow(ctx, `
		INSERT INTO restaurants (
			id, slug, name, description, address, city, cuisine, phone, website, hours,
			lat, lon, image_url, cover_url, plan, plan_status, trial_ends_at,
			featured, is_demo, active
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
		RETURNING `+restaurantColumns,
		restaurantID, input.Slug, input.Name, input.Description, input.Address, input.City,
		input.Cuisine, input.Phone, input.Website, input.Hours, input.Lat, input.Lon,
		input.ImageURL, input.CoverURL, input.Plan, input.PlanStatus, input.TrialEndsAt,
		input.Featured, input.IsDemo, input.Active,
	)
	r, err := scanRestaurant(row)
	if err != nil {
		return Restaurant{}, fmt.Errorf("create restaurant: %w", err)
	}
	return r, nil
}

func UpdateProfile(ctx context.Context, db *pgxpool.Pool, restaurantID string, input ProfileInput) (Restaurant, error) {
	input.Name = strings.TrimSpace(input.Name)
	if input.Name == "" {
		return Restaurant{}, fmt.Errorf("%w: name is required", ErrInvalid)
	}
	row := db.QueryRow(ctx, `
		UPDATE restaurants SET
			name = $2, description = $3, address = $4, cuisine = $5,
			phone = $6, website = $7, hours = $8, image_url = $9,
			cover_url = $10, updated_at = now()
		WHERE id = $1
		RETURNING `+restaurantColumns,
		restaurantID, input.Name, input.Description, input.Address, input.Cuisine,
		input.Phone, input.Website, input.Hours, input.ImageURL, input.CoverURL,
	)
	r, err := scanRestaurant(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Restaurant{}, ErrNotFound
	}
	if err != nil {
		return Restaurant{}, fmt.Errorf("update restaurant profile: %w", err)
	}
	return r, nil
}

func UpdateAdmin(ctx context.Context, db *pgxpool.Pool, restaurantID string, input AdminUpdate) (Restaurant, error) {
	if input.Slug != nil {
		value := normalizeSlug(*input.Slug)
		if !slugPattern.MatchString(value) {
			return Restaurant{}, fmt.Errorf("%w: invalid slug", ErrInvalid)
		}
		input.Slug = &value
	}
	if input.Plan != nil && !validPlan(*input.Plan) {
		return Restaurant{}, fmt.Errorf("%w: invalid plan", ErrInvalid)
	}
	if input.PlanStatus != nil && !validPlanStatus(*input.PlanStatus) {
		return Restaurant{}, fmt.Errorf("%w: invalid plan status", ErrInvalid)
	}

	row := db.QueryRow(ctx, `
		UPDATE restaurants SET
			slug = COALESCE($2, slug),
			name = COALESCE($3, name),
			description = COALESCE($4, description),
			address = COALESCE($5, address),
			city = COALESCE($6, city),
			cuisine = COALESCE($7, cuisine),
			phone = COALESCE($8, phone),
			website = COALESCE($9, website),
			hours = COALESCE($10, hours),
			lat = COALESCE($11, lat),
			lon = COALESCE($12, lon),
			image_url = COALESCE($13, image_url),
			cover_url = COALESCE($14, cover_url),
			plan = COALESCE($15, plan),
			plan_status = COALESCE($16, plan_status),
			trial_ends_at = COALESCE($17, trial_ends_at),
			featured = COALESCE($18, featured),
			is_demo = COALESCE($19, is_demo),
			active = COALESCE($20, active),
			updated_at = now()
		WHERE id = $1
		RETURNING `+restaurantColumns,
		restaurantID, input.Slug, input.Name, input.Description, input.Address, input.City,
		input.Cuisine, input.Phone, input.Website, input.Hours, input.Lat, input.Lon,
		input.ImageURL, input.CoverURL, input.Plan, input.PlanStatus, input.TrialEndsAt,
		input.Featured, input.IsDemo, input.Active,
	)
	r, err := scanRestaurant(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Restaurant{}, ErrNotFound
	}
	if err != nil {
		return Restaurant{}, fmt.Errorf("update restaurant: %w", err)
	}
	return r, nil
}

func TrackView(ctx context.Context, db *pgxpool.Pool, restaurantID, source string) error {
	source = strings.TrimSpace(source)
	if source == "" {
		source = "direct"
	}
	if len([]rune(source)) > 40 {
		source = string([]rune(source)[:40])
	}
	_, err := db.Exec(ctx, `
		INSERT INTO restaurant_views (id, restaurant_id, source)
		VALUES ($1, $2, $3)`, id.New(), restaurantID, source)
	if err != nil {
		return fmt.Errorf("track restaurant view: %w", err)
	}
	return nil
}

func normalizeSlug(v string) string {
	return strings.ToLower(strings.TrimSpace(v))
}

func generatedSlug() string {
	raw := strings.ReplaceAll(id.New(), "-", "")
	return "partner-" + raw[:8]
}

func validPlan(v string) bool {
	return v == "pilot" || v == "basic" || v == "pro"
}

func validPlanStatus(v string) bool {
	return v == "trial" || v == "active" || v == "paused" || v == "cancelled"
}
