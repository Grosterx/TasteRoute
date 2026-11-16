package route

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Grosterx/tasteroute/internal/id"
)

var ErrNotEnoughMatches = errors.New("not enough matches")

const (
	cityCenterLat = 53.5078
	cityCenterLon = 49.4204
	maxStops      = 3
)

// BuildForRoom returns the evening route for a room. By default it reuses the
// stored route so stops do not shift under guests while they pick dishes and
// fill in the booking form. Pass refresh to rebuild from the current matches.
func BuildForRoom(ctx context.Context, db *pgxpool.Pool, roomID string, refresh bool) (Route, error) {
	if !refresh {
		stored, ok, err := loadStored(ctx, db, roomID)
		if err != nil {
			return Route{}, err
		}
		if ok {
			return stored, nil
		}
	}

	var startLat, startLon float64
	if err := db.QueryRow(ctx, `
		SELECT start_lat, start_lon FROM rooms WHERE id = $1`, roomID,
	).Scan(&startLat, &startLon); err != nil {
		return Route{}, fmt.Errorf("load room center: %w", err)
	}
	if startLat == 0 && startLon == 0 {
		startLat, startLon = cityCenterLat, cityCenterLon
	}

	rows, err := db.Query(ctx, `
		SELECT m.dish_id, d.name, d.blind, r.id, r.name, r.address, r.lat, r.lon
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
		var blind bool
		if err := rows.Scan(&dishID, &dishName, &blind, &restaurantID, &restaurantName, &address, &lat, &lon); err != nil {
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
		stop.Dishes = append(stop.Dishes, DishRef{DishID: dishID, Name: dishName, Blind: blind})
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
	ordered := OrderNearest(Point{Lat: startLat, Lon: startLon}, stops, maxStops)
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

	legs, total := BuildLegs(ordered)
	return Route{RouteID: routeID, Stops: ordered, Legs: legs, Total: total}, nil
}

func loadStored(ctx context.Context, db *pgxpool.Pool, roomID string) (Route, bool, error) {
	var routeID string
	var payload []byte
	err := db.QueryRow(ctx, `
		SELECT id, stops FROM routes WHERE room_id = $1`, roomID).Scan(&routeID, &payload)
	if errors.Is(err, pgx.ErrNoRows) {
		return Route{}, false, nil
	}
	if err != nil {
		return Route{}, false, fmt.Errorf("load stored route: %w", err)
	}

	var stops []Stop
	if err := json.Unmarshal(payload, &stops); err != nil {
		return Route{}, false, nil
	}
	if len(stops) < 2 {
		return Route{}, false, nil
	}

	valid, err := storedStopsValid(ctx, db, roomID, stops)
	if err != nil {
		return Route{}, false, err
	}
	if !valid {
		return Route{}, false, nil
	}

	legs, total := BuildLegs(stops)
	return Route{RouteID: routeID, Stops: stops, Legs: legs, Total: total}, true, nil
}

func storedStopsValid(ctx context.Context, db *pgxpool.Pool, roomID string, stops []Stop) (bool, error) {
	seen := make(map[string]struct{}, len(stops))
	for _, stop := range stops {
		if stop.RestaurantID == "" || len(stop.Dishes) == 0 {
			return false, nil
		}
		if _, ok := seen[stop.RestaurantID]; ok {
			return false, nil
		}
		seen[stop.RestaurantID] = struct{}{}

		dishIDs := make([]string, 0, len(stop.Dishes))
		for _, dish := range stop.Dishes {
			if dish.DishID == "" {
				return false, nil
			}
			dishIDs = append(dishIDs, dish.DishID)
		}

		var validDishes int
		err := db.QueryRow(ctx, `
			SELECT count(*)
			FROM dishes d
			JOIN matches m ON m.dish_id = d.id AND m.room_id = $1
			JOIN restaurants r ON r.id = d.restaurant_id
			WHERE d.restaurant_id = $2 AND d.active AND r.active
			  AND d.id = ANY($3::uuid[])`, roomID, stop.RestaurantID, dishIDs).Scan(&validDishes)
		if err != nil {
			return false, fmt.Errorf("validate stored route: %w", err)
		}
		if validDishes != len(dishIDs) {
			return false, nil
		}
	}
	return true, nil
}
