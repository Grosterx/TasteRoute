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
}

func MatchedDishes(ctx context.Context, db *pgxpool.Pool, roomID, restaurantID string) ([]Dish, error) {
	rows, err := db.Query(ctx, `
		SELECT d.id, d.name, COALESCE(d.description, ''), d.price, d.tags,
		       COALESCE(d.image_url, ''), m.likes
		FROM matches m
		JOIN dishes d ON d.id = m.dish_id
		WHERE m.room_id = $1 AND d.restaurant_id = $2 AND d.active
		ORDER BY m.likes DESC, d.name`, roomID, restaurantID)
	if err != nil {
		return nil, fmt.Errorf("list matched dishes: %w", err)
	}
	defer rows.Close()

	out := make([]Dish, 0)
	for rows.Next() {
		var d Dish
		if err := rows.Scan(
			&d.DishID, &d.Name, &d.Description, &d.Price, &d.Tags, &d.ImageURL, &d.Likes,
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
