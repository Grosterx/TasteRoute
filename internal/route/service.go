package route

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Grosterx/tasteroute/internal/id"
)

var ErrNotEnoughMatches = errors.New("not enough matches")

const (
	cityCenterLat = 53.5078
	cityCenterLon = 49.4204
	maxStops      = 3
)

func BuildForRoom(ctx context.Context, db *pgxpool.Pool, roomID string) (Route, error) {
	rows, err := db.Query(ctx, `
		SELECT m.dish_id, d.name, r.id, r.name, r.address, r.lat, r.lon
		FROM matches m
		JOIN dishes d ON d.id = m.dish_id
		JOIN restaurants r ON r.id = d.restaurant_id
		WHERE m.room_id = $1 AND d.active AND r.active
		ORDER BY r.id, d.name`, roomID)
	if err != nil {
		return Route{}, fmt.Errorf("load matches: %w", err)
	}
	defer rows.Close()

	byRestaurant := make(map[string]*Stop)
	order := make([]string, 0, maxStops)
	for rows.Next() {
		var dishID, dishName, restaurantID, restaurantName, address string
		var lat, lon float64
		if err := rows.Scan(&dishID, &dishName, &restaurantID, &restaurantName, &address, &lat, &lon); err != nil {
			return Route{}, fmt.Errorf("scan match: %w", err)
		}
		stop, ok := byRestaurant[restaurantID]
		if !ok {
			stop = &Stop{
				RestaurantID: restaurantID,
				Name:         restaurantName,
				Address:      address,
				Lat:          lat,
				Lon:          lon,
				Dishes:       []DishRef{},
			}
			byRestaurant[restaurantID] = stop
			order = append(order, restaurantID)
		}
		stop.Dishes = append(stop.Dishes, DishRef{DishID: dishID, Name: dishName})
	}
	if err := rows.Err(); err != nil {
		return Route{}, fmt.Errorf("iterate matches: %w", err)
	}
	if len(order) < 2 {
		return Route{}, ErrNotEnoughMatches
	}

	stops := make([]Stop, 0, len(order))
	for _, restaurantID := range order {
		stops = append(stops, *byRestaurant[restaurantID])
	}
	ordered := OrderNearest(Point{Lat: cityCenterLat, Lon: cityCenterLon}, stops, maxStops)
	payload, err := json.Marshal(ordered)
	if err != nil {
		return Route{}, fmt.Errorf("marshal route: %w", err)
	}

	var routeID string
	err = db.QueryRow(ctx, `
		INSERT INTO routes (id, room_id, stops, created_at, updated_at)
		VALUES ($1, $2, $3, now(), now())
		ON CONFLICT (room_id) DO UPDATE
		SET stops = EXCLUDED.stops, updated_at = now()
		RETURNING id`, id.New(), roomID, payload,
	).Scan(&routeID)
	if err != nil {
		return Route{}, fmt.Errorf("save route: %w", err)
	}
	return Route{RouteID: routeID, Stops: ordered}, nil
}
