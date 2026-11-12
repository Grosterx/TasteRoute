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
	Blind             bool     `json:"blind"`
	BlindRiddle       string   `json:"-"`
	RestaurantID      string   `json:"restaurant_id"`
	RestaurantName    string   `json:"restaurant_name"`
	RestaurantAddress string   `json:"restaurant_address"`
	RestaurantCuisine string   `json:"restaurant_cuisine"`
}

// blindDishName — как секретное блюдо выглядит для гостей до мэтча.
const blindDishName = "Блюдо вслепую"

// RoomDeckSize — сколько блюд получает одна комната. Колода детерминирована
// room_id, поэтому все участники видят одни и те же блюда в одном порядке.
const RoomDeckSize = 30

func normalizeLimit(limit int) int {
	if limit <= 0 || limit > 200 {
		return RoomDeckSize
	}
	return limit
}

// MaskBlind прячет название, фото и теги секретного блюда: вместо них гости видят загадку.
func MaskBlind(dish Dish) Dish {
	if !dish.Blind {
		return dish
	}
	masked := dish
	masked.Name = blindDishName
	masked.Description = dish.BlindRiddle
	if masked.Description == "" {
		masked.Description = "Шеф прячет название — попробуйте угадать по вкусу"
	}
	masked.ImageURL = ""
	masked.Tags = []string{}
	masked.BlindRiddle = ""
	return masked
}

func List(ctx context.Context, db *pgxpool.Pool, roomID string, limit int) ([]Dish, error) {
	limit = normalizeLimit(limit)
	rows, err := db.Query(ctx, `
		WITH eligible AS (
			SELECT d.id, d.name, COALESCE(d.description, '') AS description, d.price, d.tags,
			       COALESCE(d.image_url, '') AS image_url,
			       d.blind, COALESCE(d.blind_riddle, '') AS blind_riddle,
			       r.id AS restaurant_id, r.name AS restaurant_name, r.address, r.cuisine,
			       row_number() OVER (
			           PARTITION BY d.restaurant_id
			           ORDER BY md5(rm.id::text || d.id::text)
			       ) AS deck_round,
			       md5(rm.id::text || d.id::text) AS deck_pick
			FROM dishes d
			JOIN restaurants r ON r.id = d.restaurant_id
			JOIN rooms rm ON rm.id = $1
			WHERE d.active AND r.active
			  AND (rm.restaurant_id IS NULL OR d.restaurant_id = rm.restaurant_id)
		)
		SELECT id, name, description, price, tags, image_url, blind, blind_riddle,
		       restaurant_id, restaurant_name, address, cuisine
		FROM eligible
		ORDER BY deck_round, deck_pick
		LIMIT $2`, roomID, limit)
	if err != nil {
		return nil, fmt.Errorf("list catalog: %w", err)
	}
	defer rows.Close()

	dishes := make([]Dish, 0, 100)
	for rows.Next() {
		var d Dish
		if err := rows.Scan(
			&d.DishID, &d.Name, &d.Description, &d.Price, &d.Tags, &d.ImageURL,
			&d.Blind, &d.BlindRiddle,
			&d.RestaurantID, &d.RestaurantName, &d.RestaurantAddress, &d.RestaurantCuisine,
		); err != nil {
			return nil, fmt.Errorf("scan dish: %w", err)
		}
		if d.Tags == nil {
			d.Tags = []string{}
		}
		dishes = append(dishes, MaskBlind(d))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate catalog: %w", err)
	}
	return dishes, nil
}
