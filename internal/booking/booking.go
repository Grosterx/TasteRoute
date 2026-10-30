package booking

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Grosterx/tasteroute/internal/id"
)

var (
	ErrInvalid      = errors.New("invalid booking")
	ErrNotFound     = errors.New("booking not found")
	ErrOwnedByOther = errors.New("booking belongs to another participant")
)

var validStatuses = map[string]bool{
	"new":       true,
	"contacted": true,
	"confirmed": true,
	"declined":  true,
	"completed": true,
}

type DishRef struct {
	DishID string `json:"dish_id"`
	Name   string `json:"name"`
	Price  int    `json:"price"`
	Likes  int64  `json:"likes"`
}

type Booking struct {
	ID            string     `json:"id"`
	RestaurantID  string     `json:"restaurant_id"`
	RoomID        string     `json:"-"`
	RoomCode      string     `json:"room_code"`
	ParticipantID string     `json:"participant_id"`
	Name          string     `json:"name"`
	Phone         string     `json:"phone"`
	PartySize     int        `json:"party_size"`
	RequestedAt   *time.Time `json:"requested_at"`
	Comment       string     `json:"comment"`
	Status        string     `json:"status"`
	Source        string     `json:"source"`
	Dishes        []DishRef  `json:"dishes"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type CreateInput struct {
	Name        string
	Phone       string
	PartySize   int
	RequestedAt *time.Time
	Comment     string
}

func Create(ctx context.Context, db *pgxpool.Pool, roomID, participantID, restaurantID, source string, input CreateInput) (Booking, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Phone = strings.TrimSpace(input.Phone)
	input.Comment = strings.TrimSpace(input.Comment)
	if input.Name == "" || input.Phone == "" {
		return Booking{}, fmt.Errorf("%w: name and phone are required", ErrInvalid)
	}
	if len([]rune(input.Name)) > 80 || len([]rune(input.Phone)) > 40 || len([]rune(input.Comment)) > 500 {
		return Booking{}, ErrInvalid
	}
	if input.PartySize < 1 || input.PartySize > 20 {
		return Booking{}, fmt.Errorf("%w: invalid party size", ErrInvalid)
	}
	if input.RequestedAt != nil {
		if input.RequestedAt.Before(time.Now().Add(-24 * time.Hour)) {
			return Booking{}, fmt.Errorf("%w: requested time is in the past", ErrInvalid)
		}
		if input.RequestedAt.After(time.Now().AddDate(1, 0, 0)) {
			return Booking{}, fmt.Errorf("%w: requested time is too far away", ErrInvalid)
		}
	}
	source = strings.TrimSpace(source)
	if source == "" {
		source = "room"
	}
	if len([]rune(source)) > 40 {
		source = string([]rune(source)[:40])
	}

	var bookingID string
	err := db.QueryRow(ctx, `
		INSERT INTO bookings (
			id, restaurant_id, room_id, participant_id, name, phone, party_size,
			requested_at, comment, source
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		ON CONFLICT (room_id, restaurant_id) DO UPDATE SET
			name = EXCLUDED.name,
			phone = EXCLUDED.phone,
			party_size = EXCLUDED.party_size,
			requested_at = EXCLUDED.requested_at,
			comment = EXCLUDED.comment,
			source = EXCLUDED.source,
			updated_at = now()
		WHERE bookings.participant_id = EXCLUDED.participant_id
		RETURNING id`,
		id.New(), restaurantID, roomID, participantID, input.Name, input.Phone,
		input.PartySize, input.RequestedAt, input.Comment, source,
	).Scan(&bookingID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Booking{}, ErrOwnedByOther
	}
	if err != nil {
		return Booking{}, fmt.Errorf("create booking: %w", err)
	}
	return GetForRestaurant(ctx, db, restaurantID, bookingID)
}

func ListByRestaurant(ctx context.Context, db *pgxpool.Pool, restaurantID, status string, limit int) ([]Booking, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	status = strings.TrimSpace(status)
	if status != "" && !validStatuses[status] {
		return nil, fmt.Errorf("%w: invalid status", ErrInvalid)
	}
	rows, err := db.Query(ctx, bookingSelect+`
		WHERE b.restaurant_id = $1 AND ($2 = '' OR b.status = $2)
		ORDER BY b.created_at DESC
		LIMIT $3`, restaurantID, status, limit)
	if err != nil {
		return nil, fmt.Errorf("list bookings: %w", err)
	}
	defer rows.Close()

	out := make([]Booking, 0)
	for rows.Next() {
		item, err := scanBooking(rows)
		if err != nil {
			return nil, fmt.Errorf("scan booking: %w", err)
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate bookings: %w", err)
	}
	return out, nil
}

func ListAll(ctx context.Context, db *pgxpool.Pool, limit int) ([]Booking, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	rows, err := db.Query(ctx, bookingSelect+`
		ORDER BY b.created_at DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("list all bookings: %w", err)
	}
	defer rows.Close()

	out := make([]Booking, 0)
	for rows.Next() {
		item, err := scanBooking(rows)
		if err != nil {
			return nil, fmt.Errorf("scan all booking: %w", err)
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate all bookings: %w", err)
	}
	return out, nil
}

func GetForRestaurant(ctx context.Context, db *pgxpool.Pool, restaurantID, bookingID string) (Booking, error) {
	row := db.QueryRow(ctx, bookingSelect+`
		WHERE b.restaurant_id = $1 AND b.id = $2`, restaurantID, bookingID)
	item, err := scanBooking(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Booking{}, ErrNotFound
	}
	if err != nil {
		return Booking{}, fmt.Errorf("get booking: %w", err)
	}
	return item, nil
}

func GetForRoom(ctx context.Context, db *pgxpool.Pool, roomID, restaurantID string) (Booking, error) {
	row := db.QueryRow(ctx, bookingSelect+`
		WHERE b.room_id = $1 AND b.restaurant_id = $2`, roomID, restaurantID)
	item, err := scanBooking(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Booking{}, ErrNotFound
	}
	if err != nil {
		return Booking{}, fmt.Errorf("get room booking: %w", err)
	}
	return item, nil
}

func UpdateStatus(ctx context.Context, db *pgxpool.Pool, restaurantID, bookingID, status string) (Booking, error) {
	status = strings.TrimSpace(status)
	if !validStatuses[status] {
		return Booking{}, fmt.Errorf("%w: invalid status", ErrInvalid)
	}
	tag, err := db.Exec(ctx, `
		UPDATE bookings SET status = $3, updated_at = now()
		WHERE id = $1 AND restaurant_id = $2`, bookingID, restaurantID, status)
	if err != nil {
		return Booking{}, fmt.Errorf("update booking status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return Booking{}, ErrNotFound
	}
	return GetForRestaurant(ctx, db, restaurantID, bookingID)
}

const bookingSelect = `
	SELECT b.id, b.restaurant_id, b.room_id, r.code, b.participant_id,
	       b.name, b.phone, b.party_size, b.requested_at, COALESCE(b.comment, ''),
	       b.status, b.source,
	       COALESCE((
	           SELECT jsonb_agg(jsonb_build_object(
	               'dish_id', d.id, 'name', d.name, 'price', d.price, 'likes', m.likes
	           ) ORDER BY m.likes DESC, d.name)
	           FROM matches m
	           JOIN dishes d ON d.id = m.dish_id
	           WHERE m.room_id = b.room_id AND d.restaurant_id = b.restaurant_id
	       ), '[]'::jsonb) AS dishes,
	       b.created_at, b.updated_at
	FROM bookings b
	JOIN rooms r ON r.id = b.room_id`

func scanBooking(row pgx.Row) (Booking, error) {
	var b Booking
	var dishesJSON []byte
	err := row.Scan(
		&b.ID, &b.RestaurantID, &b.RoomID, &b.RoomCode, &b.ParticipantID,
		&b.Name, &b.Phone, &b.PartySize, &b.RequestedAt, &b.Comment,
		&b.Status, &b.Source, &dishesJSON, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return Booking{}, err
	}
	if len(dishesJSON) > 0 {
		if err := json.Unmarshal(dishesJSON, &b.Dishes); err != nil {
			return Booking{}, fmt.Errorf("decode booking dishes: %w", err)
		}
	}
	if b.Dishes == nil {
		b.Dishes = []DishRef{}
	}
	return b, nil
}
