package catalog

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Dish struct {
	DishID            string   `json:"dish_id"`
	Name              string   `json:"name"`
	Description       string   `json:"description"`
	Price             int      `json:"price"`
	Tags              []string `json:"tags"`
	ImageURL          string   `json:"image_url"`
	RestaurantID      string   `json:"restaurant_id"`
	RestaurantName    string   `json:"restaurant_name"`
	RestaurantAddress string   `json:"restaurant_address"`
	RestaurantCuisine string   `json:"restaurant_cuisine"`
}

func List(ctx context.Context, db *pgxpool.Pool, roomID string) ([]Dish, error) {
	rows, err := db.Query(ctx, `
		SELECT d.id, d.name, COALESCE(d.description, ''), d.price, d.tags, COALESCE(d.image_url, ''),
		       r.id, r.name, r.address, r.cuisine
		FROM dishes d
		JOIN restaurants r ON r.id = d.restaurant_id
		WHERE d.active AND r.active
		ORDER BY r.name, d.name`)
	if err != nil {
		return nil, fmt.Errorf("list catalog: %w", err)
	}
	defer rows.Close()

	dishes := make([]Dish, 0, 100)
	for rows.Next() {
		var d Dish
		if err := rows.Scan(
			&d.DishID, &d.Name, &d.Description, &d.Price, &d.Tags, &d.ImageURL,
			&d.RestaurantID, &d.RestaurantName, &d.RestaurantAddress, &d.RestaurantCuisine,
		); err != nil {
			return nil, fmt.Errorf("scan dish: %w", err)
		}
		if d.Tags == nil {
			d.Tags = []string{}
		}
		dishes = append(dishes, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate catalog: %w", err)
	}
	_ = roomID // catalog is global for the single-city MVP
	return dishes, nil
}
