package restaurant

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Grosterx/tasteroute/internal/id"
)

type Dish struct {
	DishID       string   `json:"dish_id"`
	RestaurantID string   `json:"restaurant_id"`
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Price        int      `json:"price"`
	Tags         []string `json:"tags"`
	ImageURL     string   `json:"image_url"`
	Category     string   `json:"category"`
	SortOrder    int      `json:"sort_order"`
	Active       bool     `json:"active"`
}

type DishInput struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Price       int      `json:"price"`
	Tags        []string `json:"tags"`
	ImageURL    string   `json:"image_url"`
	Category    string   `json:"category"`
	SortOrder   int      `json:"sort_order"`
	Active      *bool    `json:"active"`
}

func ListDishes(ctx context.Context, db *pgxpool.Pool, restaurantID string, activeOnly bool) ([]Dish, error) {
	rows, err := db.Query(ctx, `
		SELECT id, restaurant_id, name, COALESCE(description, ''), price, tags,
		       COALESCE(image_url, ''), category, sort_order, active
		FROM dishes
		WHERE restaurant_id = $1 AND ($2 = false OR active)
		ORDER BY category, sort_order, name`, restaurantID, activeOnly)
	if err != nil {
		return nil, fmt.Errorf("list dishes: %w", err)
	}
	defer rows.Close()

	out := make([]Dish, 0)
	for rows.Next() {
		var d Dish
		if err := rows.Scan(
			&d.DishID, &d.RestaurantID, &d.Name, &d.Description, &d.Price, &d.Tags,
			&d.ImageURL, &d.Category, &d.SortOrder, &d.Active,
		); err != nil {
			return nil, fmt.Errorf("scan dish: %w", err)
		}
		if d.Tags == nil {
			d.Tags = []string{}
		}
		out = append(out, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate dishes: %w", err)
	}
	return out, nil
}

func CreateDish(ctx context.Context, db *pgxpool.Pool, restaurantID string, input DishInput) (Dish, error) {
	input, err := validateDishInput(input)
	if err != nil {
		return Dish{}, err
	}
	active := true
	if input.Active != nil {
		active = *input.Active
	}
	var d Dish
	err = db.QueryRow(ctx, `
		INSERT INTO dishes (
			id, restaurant_id, name, description, price, tags, image_url,
			category, sort_order, active
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING id, restaurant_id, name, COALESCE(description, ''), price, tags,
		          COALESCE(image_url, ''), category, sort_order, active`,
		id.New(), restaurantID, input.Name, input.Description, input.Price, input.Tags,
		input.ImageURL, input.Category, input.SortOrder, active,
	).Scan(
		&d.DishID, &d.RestaurantID, &d.Name, &d.Description, &d.Price, &d.Tags,
		&d.ImageURL, &d.Category, &d.SortOrder, &d.Active,
	)
	if err != nil {
		return Dish{}, fmt.Errorf("create dish: %w", err)
	}
	if d.Tags == nil {
		d.Tags = []string{}
	}
	return d, nil
}

func UpdateDish(ctx context.Context, db *pgxpool.Pool, restaurantID, dishID string, input DishInput) (Dish, error) {
	input, err := validateDishInput(input)
	if err != nil {
		return Dish{}, err
	}
	var d Dish
	err = db.QueryRow(ctx, `
		UPDATE dishes SET
			name = $3, description = $4, price = $5, tags = $6, image_url = $7,
			category = $8, sort_order = $9, active = COALESCE($10, active),
			updated_at = now()
		WHERE id = $1 AND restaurant_id = $2
		RETURNING id, restaurant_id, name, COALESCE(description, ''), price, tags,
		          COALESCE(image_url, ''), category, sort_order, active`,
		dishID, restaurantID, input.Name, input.Description, input.Price, input.Tags,
		input.ImageURL, input.Category, input.SortOrder, input.Active,
	).Scan(
		&d.DishID, &d.RestaurantID, &d.Name, &d.Description, &d.Price, &d.Tags,
		&d.ImageURL, &d.Category, &d.SortOrder, &d.Active,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Dish{}, ErrNotFound
	}
	if err != nil {
		return Dish{}, fmt.Errorf("update dish: %w", err)
	}
	if d.Tags == nil {
		d.Tags = []string{}
	}
	return d, nil
}

func ArchiveDish(ctx context.Context, db *pgxpool.Pool, restaurantID, dishID string) error {
	tag, err := db.Exec(ctx, `
		UPDATE dishes SET active = false, updated_at = now()
		WHERE id = $1 AND restaurant_id = $2`, dishID, restaurantID)
	if err != nil {
		return fmt.Errorf("archive dish: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func validateDishInput(input DishInput) (DishInput, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Description = strings.TrimSpace(input.Description)
	input.Category = strings.TrimSpace(input.Category)
	input.ImageURL = strings.TrimSpace(input.ImageURL)
	if input.Name == "" {
		return DishInput{}, fmt.Errorf("%w: dish name is required", ErrInvalid)
	}
	if len([]rune(input.Name)) > 120 {
		return DishInput{}, fmt.Errorf("%w: dish name is too long", ErrInvalid)
	}
	if len([]rune(input.Description)) > 1000 {
		return DishInput{}, fmt.Errorf("%w: dish description is too long", ErrInvalid)
	}
	if len([]rune(input.Category)) > 60 {
		return DishInput{}, fmt.Errorf("%w: category is too long", ErrInvalid)
	}
	if input.Price < 0 || input.Price > 1_000_000 {
		return DishInput{}, fmt.Errorf("%w: invalid price", ErrInvalid)
	}
	if input.SortOrder < -1000 || input.SortOrder > 10000 {
		return DishInput{}, fmt.Errorf("%w: invalid sort order", ErrInvalid)
	}
	if len(input.Tags) > 10 {
		return DishInput{}, fmt.Errorf("%w: too many tags", ErrInvalid)
	}
	tags := make([]string, 0, len(input.Tags))
	seen := make(map[string]struct{}, len(input.Tags))
	for _, tag := range input.Tags {
		tag = strings.TrimSpace(tag)
		if tag == "" || len([]rune(tag)) > 30 {
			continue
		}
		if _, ok := seen[tag]; ok {
			continue
		}
		seen[tag] = struct{}{}
		tags = append(tags, tag)
	}
	input.Tags = tags
	return input, nil
}
