package selection

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Dish struct {
	DishID      string   `json:"dish_id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Price       int      `json:"price"`
	Tags        []string `json:"tags"`
	ImageURL    string   `json:"image_url"`
	Likes       int64    `json:"likes"`
	Blind       bool     `json:"blind"`
}

func MatchedDishes(ctx context.Context, db *pgxpool.Pool, roomID, restaurantID string) ([]Dish, error) {
	rows, err := db.Query(ctx, matchedDishSelect+`
		WHERE m.room_id = $1 AND d.restaurant_id = $2 AND d.active
		ORDER BY m.likes DESC, d.name`, roomID, restaurantID)
	if err != nil {
		return nil, fmt.Errorf("list matched dishes: %w", err)
	}
	defer rows.Close()
	return scanDishes(rows)
}

// MatchedDishesByRestaurant loads every matched dish of the room grouped by its
// restaurant. It powers the city-room summary without an N+1 query per venue.
func MatchedDishesByRestaurant(ctx context.Context, db *pgxpool.Pool, roomID string) (map[string][]Dish, error) {
	rows, err := db.Query(ctx, matchedDishSelect+`
		WHERE m.room_id = $1 AND d.active
		ORDER BY d.restaurant_id, m.likes DESC, d.name`, roomID)
	if err != nil {
		return nil, fmt.Errorf("list matched dishes by restaurant: %w", err)
	}
	defer rows.Close()

	out := make(map[string][]Dish)
	for rows.Next() {
		var restaurantID string
		var d Dish
		if err := rows.Scan(
			&restaurantID, &d.DishID, &d.Name, &d.Description, &d.Price,
			&d.Tags, &d.ImageURL, &d.Likes, &d.Blind,
		); err != nil {
			return nil, fmt.Errorf("scan matched dish: %w", err)
		}
		if d.Tags == nil {
			d.Tags = []string{}
		}
		out[restaurantID] = append(out[restaurantID], d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate matched dishes: %w", err)
	}
	return out, nil
}

const matchedDishSelect = `
	SELECT d.restaurant_id, d.id, d.name, COALESCE(d.description, ''), d.price, d.tags,
	       COALESCE(d.image_url, ''), m.likes, d.blind
	FROM matches m
	JOIN dishes d ON d.id = m.dish_id`

func scanDishes(rows interface {
	Next() bool
	Scan(...any) error
	Err() error
}) ([]Dish, error) {
	out := make([]Dish, 0)
	for rows.Next() {
		var restaurantID string
		var d Dish
		if err := rows.Scan(
			&restaurantID, &d.DishID, &d.Name, &d.Description, &d.Price,
			&d.Tags, &d.ImageURL, &d.Likes, &d.Blind,
		); err != nil {
			return nil, fmt.Errorf("scan matched dish: %w", err)
		}
		if d.Tags == nil {
			d.Tags = []string{}
		}
		out = append(out, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate matched dishes: %w", err)
	}
	return out, nil
}
