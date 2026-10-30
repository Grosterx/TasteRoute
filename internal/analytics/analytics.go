package analytics

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Summary struct {
	From       time.Time `json:"from"`
	To         time.Time `json:"to"`
	Views      int64     `json:"views"`
	QRViews    int64     `json:"qr_views"`
	Rooms      int64     `json:"rooms"`
	Guests     int64     `json:"guests"`
	Matches    int64     `json:"matches"`
	Bookings   int64     `json:"bookings"`
	Confirmed  int64     `json:"confirmed"`
	Conversion float64   `json:"conversion"`
}

type TopDish struct {
	DishID  string `json:"dish_id"`
	Name    string `json:"name"`
	Likes   int64  `json:"likes"`
	Matches int64  `json:"matches"`
}

type DayPoint struct {
	Date     string `json:"date"`
	Views    int64  `json:"views"`
	Rooms    int64  `json:"rooms"`
	Bookings int64  `json:"bookings"`
}

type SourcePoint struct {
	Source string `json:"source"`
	Rooms  int64  `json:"rooms"`
	Views  int64  `json:"views"`
}

type Analytics struct {
	Summary   Summary       `json:"summary"`
	TopDishes []TopDish     `json:"top_dishes"`
	Daily     []DayPoint    `json:"daily"`
	Sources   []SourcePoint `json:"sources"`
}

type Platform struct {
	Restaurants int64 `json:"restaurants"`
	Active      int64 `json:"active_restaurants"`
	Trials      int64 `json:"trials"`
	Rooms       int64 `json:"rooms"`
	Bookings    int64 `json:"bookings"`
	SalesLeads  int64 `json:"sales_leads"`
}

func ForRestaurant(ctx context.Context, db *pgxpool.Pool, restaurantID string, from, to time.Time) (Analytics, error) {
	if !to.After(from) {
		return Analytics{}, fmt.Errorf("invalid analytics range")
	}

	out := Analytics{
		Summary:   Summary{From: from, To: to},
		TopDishes: []TopDish{},
		Daily:     []DayPoint{},
		Sources:   []SourcePoint{},
	}

	err := db.QueryRow(ctx, `
		SELECT
			(SELECT count(*) FROM restaurant_views WHERE restaurant_id = $1 AND created_at >= $2 AND created_at < $3),
			(SELECT count(*) FROM restaurant_views WHERE restaurant_id = $1 AND source = 'qr' AND created_at >= $2 AND created_at < $3),
			(SELECT count(*) FROM rooms WHERE restaurant_id = $1 AND mode = 'restaurant' AND created_at >= $2 AND created_at < $3),
			(SELECT count(*) FROM participants p JOIN rooms r ON r.id = p.room_id
			 WHERE r.restaurant_id = $1 AND r.mode = 'restaurant' AND p.created_at >= $2 AND p.created_at < $3),
			(SELECT count(*) FROM matches m JOIN rooms r ON r.id = m.room_id
			 WHERE r.restaurant_id = $1 AND r.mode = 'restaurant' AND m.created_at >= $2 AND m.created_at < $3),
			(SELECT count(*) FROM bookings WHERE restaurant_id = $1 AND created_at >= $2 AND created_at < $3),
			(SELECT count(*) FROM bookings WHERE restaurant_id = $1
			 AND status IN ('confirmed', 'completed') AND created_at >= $2 AND created_at < $3)`,
		restaurantID, from, to,
	).Scan(
		&out.Summary.Views, &out.Summary.QRViews, &out.Summary.Rooms, &out.Summary.Guests,
		&out.Summary.Matches, &out.Summary.Bookings, &out.Summary.Confirmed,
	)
	if err != nil {
		return Analytics{}, fmt.Errorf("analytics summary: %w", err)
	}
	if out.Summary.Rooms > 0 {
		out.Summary.Conversion = float64(out.Summary.Bookings) / float64(out.Summary.Rooms)
	}

	top, err := topDishes(ctx, db, restaurantID, from, to)
	if err != nil {
		return Analytics{}, err
	}
	out.TopDishes = top

	daily, err := dailySeries(ctx, db, restaurantID, from, to)
	if err != nil {
		return Analytics{}, err
	}
	out.Daily = daily

	sources, err := sourceBreakdown(ctx, db, restaurantID, from, to)
	if err != nil {
		return Analytics{}, err
	}
	out.Sources = sources

	return out, nil
}

func topDishes(ctx context.Context, db *pgxpool.Pool, restaurantID string, from, to time.Time) ([]TopDish, error) {
	byDish := make(map[string]*TopDish)

	likeRows, err := db.Query(ctx, `
		SELECT d.id, d.name, count(*)
		FROM swipes s
		JOIN dishes d ON d.id = s.dish_id
		JOIN rooms r ON r.id = s.room_id
		WHERE d.restaurant_id = $1 AND r.restaurant_id = $1
		  AND s.liked AND s.created_at >= $2 AND s.created_at < $3
		GROUP BY d.id, d.name`, restaurantID, from, to)
	if err != nil {
		return nil, fmt.Errorf("analytics likes: %w", err)
	}
	for likeRows.Next() {
		var dish TopDish
		if err := likeRows.Scan(&dish.DishID, &dish.Name, &dish.Likes); err != nil {
			likeRows.Close()
			return nil, fmt.Errorf("scan analytics likes: %w", err)
		}
		byDish[dish.DishID] = &dish
	}
	if err := likeRows.Err(); err != nil {
		likeRows.Close()
		return nil, fmt.Errorf("iterate analytics likes: %w", err)
	}
	likeRows.Close()

	matchRows, err := db.Query(ctx, `
		SELECT d.id, d.name, count(*)
		FROM matches m
		JOIN dishes d ON d.id = m.dish_id
		JOIN rooms r ON r.id = m.room_id
		WHERE d.restaurant_id = $1 AND r.restaurant_id = $1
		  AND m.created_at >= $2 AND m.created_at < $3
		GROUP BY d.id, d.name`, restaurantID, from, to)
	if err != nil {
		return nil, fmt.Errorf("analytics matches: %w", err)
	}
	for matchRows.Next() {
		var dish TopDish
		if err := matchRows.Scan(&dish.DishID, &dish.Name, &dish.Matches); err != nil {
			matchRows.Close()
			return nil, fmt.Errorf("scan analytics matches: %w", err)
		}
		if existing, ok := byDish[dish.DishID]; ok {
			existing.Matches = dish.Matches
		} else {
			byDish[dish.DishID] = &dish
		}
	}
	if err := matchRows.Err(); err != nil {
		matchRows.Close()
		return nil, fmt.Errorf("iterate analytics matches: %w", err)
	}
	matchRows.Close()

	out := make([]TopDish, 0, len(byDish))
	for _, dish := range byDish {
		out = append(out, *dish)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Likes == out[j].Likes {
			return out[i].Matches > out[j].Matches
		}
		return out[i].Likes > out[j].Likes
	})
	if len(out) > 8 {
		out = out[:8]
	}
	return out, nil
}

func dailySeries(ctx context.Context, db *pgxpool.Pool, restaurantID string, from, to time.Time) ([]DayPoint, error) {
	rows, err := db.Query(ctx, `
		WITH days AS (
			SELECT generate_series($2::date, ($3::date - interval '1 day')::date, interval '1 day')::date AS day
		)
		SELECT to_char(d.day, 'YYYY-MM-DD'),
			(SELECT count(*) FROM restaurant_views v
			 WHERE v.restaurant_id = $1 AND v.created_at >= d.day AND v.created_at < d.day + interval '1 day'),
			(SELECT count(*) FROM rooms r
			 WHERE r.restaurant_id = $1 AND r.mode = 'restaurant'
			   AND r.created_at >= d.day AND r.created_at < d.day + interval '1 day'),
			(SELECT count(*) FROM bookings b
			 WHERE b.restaurant_id = $1
			   AND b.created_at >= d.day AND b.created_at < d.day + interval '1 day')
		FROM days d
		ORDER BY d.day`, restaurantID, from, to)
	if err != nil {
		return nil, fmt.Errorf("analytics daily: %w", err)
	}
	defer rows.Close()

	out := make([]DayPoint, 0)
	for rows.Next() {
		var p DayPoint
		if err := rows.Scan(&p.Date, &p.Views, &p.Rooms, &p.Bookings); err != nil {
			return nil, fmt.Errorf("scan analytics daily: %w", err)
		}
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate analytics daily: %w", err)
	}
	return out, nil
}

func sourceBreakdown(ctx context.Context, db *pgxpool.Pool, restaurantID string, from, to time.Time) ([]SourcePoint, error) {
	bySource := make(map[string]*SourcePoint)

	rows, err := db.Query(ctx, `
		SELECT source, count(*) FROM rooms
		WHERE restaurant_id = $1 AND mode = 'restaurant' AND created_at >= $2 AND created_at < $3
		GROUP BY source`, restaurantID, from, to)
	if err != nil {
		return nil, fmt.Errorf("analytics room sources: %w", err)
	}
	for rows.Next() {
		var source string
		var count int64
		if err := rows.Scan(&source, &count); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan analytics room sources: %w", err)
		}
		bySource[source] = &SourcePoint{Source: source, Rooms: count}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, fmt.Errorf("iterate analytics room sources: %w", err)
	}
	rows.Close()

	viewRows, err := db.Query(ctx, `
		SELECT source, count(*) FROM restaurant_views
		WHERE restaurant_id = $1 AND created_at >= $2 AND created_at < $3
		GROUP BY source`, restaurantID, from, to)
	if err != nil {
		return nil, fmt.Errorf("analytics view sources: %w", err)
	}
	for viewRows.Next() {
		var source string
		var count int64
		if err := viewRows.Scan(&source, &count); err != nil {
			viewRows.Close()
			return nil, fmt.Errorf("scan analytics view sources: %w", err)
		}
		if existing, ok := bySource[source]; ok {
			existing.Views = count
		} else {
			bySource[source] = &SourcePoint{Source: source, Views: count}
		}
	}
	if err := viewRows.Err(); err != nil {
		viewRows.Close()
		return nil, fmt.Errorf("iterate analytics view sources: %w", err)
	}
	viewRows.Close()

	out := make([]SourcePoint, 0, len(bySource))
	for _, source := range bySource {
		out = append(out, *source)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Rooms == out[j].Rooms {
			return out[i].Views > out[j].Views
		}
		return out[i].Rooms > out[j].Rooms
	})
	return out, nil
}

func PlatformStats(ctx context.Context, db *pgxpool.Pool) (Platform, error) {
	var p Platform
	err := db.QueryRow(ctx, `
		SELECT
			(SELECT count(*) FROM restaurants),
			(SELECT count(*) FROM restaurants WHERE active),
			(SELECT count(*) FROM restaurants WHERE plan_status = 'trial'),
			(SELECT count(*) FROM rooms),
			(SELECT count(*) FROM bookings),
			(SELECT count(*) FROM sales_leads)`).Scan(
		&p.Restaurants, &p.Active, &p.Trials, &p.Rooms, &p.Bookings, &p.SalesLeads,
	)
	if err != nil {
		return Platform{}, fmt.Errorf("platform stats: %w", err)
	}
	return p, nil
}
