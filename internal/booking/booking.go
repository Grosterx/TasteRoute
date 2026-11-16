package booking

import (
	"context"
	"encoding/json"
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
	ErrInvalid      = errors.New("invalid booking")
	ErrNotFound     = errors.New("booking not found")
	ErrOwnedByOther = errors.New("booking belongs to another participant")
	ErrLocked       = errors.New("booking is already processed")
	ErrActiveChain  = errors.New("room has an active booking chain")
)

var validStatuses = map[string]bool{
	"new":       true,
	"contacted": true,
	"confirmed": true,
	"declined":  true,
	"completed": true,
	"cancelled": true,
}

var activeBookingStatuses = []string{"new", "contacted", "confirmed"}

var dishIDPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

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

	ChainID           string `json:"chain_id,omitempty"`
	StopOrder         int    `json:"stop_order,omitempty"`
	RouteID           string `json:"route_id,omitempty"`
	RestaurantName    string `json:"restaurant_name,omitempty"`
	RestaurantAddress string `json:"restaurant_address,omitempty"`
	RestaurantCity    string `json:"restaurant_city,omitempty"`
	ChainSize         int    `json:"chain_size,omitempty"`

	Dishes    []DishRef `json:"dishes"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateInput struct {
	Name        string
	Phone       string
	PartySize   int
	RequestedAt *time.Time
	Comment     string
	DishIDs     []string
}

// Create saves one company booking for a room. A room can only have one active
// booking at a time: the first participant becomes its owner, and other
// participants cannot overwrite it.
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
	dishIDs, err := normalizeDishIDs(input.DishIDs)
	if err != nil {
		return Booking{}, err
	}
	source = strings.TrimSpace(source)
	if source == "" {
		source = "room"
	}
	if len([]rune(source)) > 40 {
		source = string([]rune(source)[:40])
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return Booking{}, fmt.Errorf("begin booking: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Serialize bookings inside one room so two participants cannot create two
	// active bookings at the same time.
	var lockedRoomID string
	if err := tx.QueryRow(ctx, `SELECT id FROM rooms WHERE id = $1 FOR UPDATE`, roomID).Scan(&lockedRoomID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Booking{}, ErrInvalid
		}
		return Booking{}, fmt.Errorf("lock room: %w", err)
	}

	// A room can have either one active single booking or one active evening
	// chain, never both.
	var activeChainID string
	err = tx.QueryRow(ctx, `
		SELECT chain_id FROM bookings
		WHERE room_id = $1 AND chain_id IS NOT NULL AND status = ANY($2)
		LIMIT 1`, roomID, activeBookingStatuses).Scan(&activeChainID)
	switch {
	case err == nil:
		return Booking{}, ErrActiveChain
	case !errors.Is(err, pgx.ErrNoRows):
		return Booking{}, fmt.Errorf("find active chain: %w", err)
	}

	var activeID, activeParticipant, activeRestaurant, activeStatus string
	err = tx.QueryRow(ctx, `
		SELECT id, participant_id, restaurant_id, status
		FROM bookings
		WHERE room_id = $1 AND chain_id IS NULL AND status = ANY($2)
		ORDER BY created_at DESC
		LIMIT 1
		FOR UPDATE`, roomID, activeBookingStatuses,
	).Scan(&activeID, &activeParticipant, &activeRestaurant, &activeStatus)

	var bookingID string
	switch {
	case err == nil:
		if activeParticipant != participantID {
			return Booking{}, ErrOwnedByOther
		}
		if activeRestaurant != restaurantID {
			return Booking{}, fmt.Errorf("%w: cancel the current booking first", ErrLocked)
		}
		bookingID = activeID
		if _, err := tx.Exec(ctx, `
			UPDATE bookings SET
				name = $2, phone = $3, party_size = $4, requested_at = $5,
				comment = $6, source = $7, updated_at = now()
			WHERE id = $1`,
			bookingID, input.Name, input.Phone, input.PartySize,
			input.RequestedAt, input.Comment, source,
		); err != nil {
			return Booking{}, fmt.Errorf("update booking: %w", err)
		}
	case errors.Is(err, pgx.ErrNoRows):
		var existingID string
		err = tx.QueryRow(ctx, `
			SELECT id FROM bookings
			WHERE room_id = $1 AND restaurant_id = $2
			ORDER BY created_at DESC
			LIMIT 1
			FOR UPDATE`, roomID, restaurantID).Scan(&existingID)
		switch {
		case err == nil:
			// Reuse a cancelled or declined booking instead of hitting the
			// (room_id, restaurant_id) unique constraint.
			bookingID = existingID
			if _, err := tx.Exec(ctx, `
				UPDATE bookings SET
					participant_id = $2, name = $3, phone = $4, party_size = $5,
					requested_at = $6, comment = $7, source = $8, status = 'new',
					chain_id = NULL, stop_order = NULL, route_id = NULL,
					created_at = now(), updated_at = now()
				WHERE id = $1`,
				bookingID, participantID, input.Name, input.Phone, input.PartySize,
				input.RequestedAt, input.Comment, source,
			); err != nil {
				return Booking{}, fmt.Errorf("recreate booking: %w", err)
			}
		case errors.Is(err, pgx.ErrNoRows):
			err = tx.QueryRow(ctx, `
				INSERT INTO bookings (
					id, restaurant_id, room_id, participant_id, name, phone, party_size,
					requested_at, comment, source
				)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
				RETURNING id`,
				id.New(), restaurantID, roomID, participantID, input.Name, input.Phone,
				input.PartySize, input.RequestedAt, input.Comment, source,
			).Scan(&bookingID)
			if err != nil {
				return Booking{}, fmt.Errorf("create booking: %w", err)
			}
		default:
			return Booking{}, fmt.Errorf("find room booking: %w", err)
		}
	default:
		return Booking{}, fmt.Errorf("find active booking: %w", err)
	}

	if err := replaceDishes(ctx, tx, bookingID, restaurantID, dishIDs); err != nil {
		return Booking{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Booking{}, fmt.Errorf("commit booking: %w", err)
	}
	return getByID(ctx, db, bookingID)
}

func normalizeDishIDs(values []string) ([]string, error) {
	if len(values) > 30 {
		return nil, fmt.Errorf("%w: too many dishes", ErrInvalid)
	}
	out := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		value = strings.ToLower(strings.TrimSpace(value))
		if value == "" {
			continue
		}
		if !dishIDPattern.MatchString(value) {
			return nil, fmt.Errorf("%w: invalid dish", ErrInvalid)
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out, nil
}

func replaceDishes(ctx context.Context, tx pgx.Tx, bookingID, restaurantID string, dishIDs []string) error {
	if _, err := tx.Exec(ctx, `DELETE FROM booking_dishes WHERE booking_id = $1`, bookingID); err != nil {
		return fmt.Errorf("clear booking dishes: %w", err)
	}
	if len(dishIDs) == 0 {
		return nil
	}

	rows, err := tx.Query(ctx, `
		SELECT id FROM dishes
		WHERE restaurant_id = $1 AND active AND id = ANY($2::uuid[])`, restaurantID, dishIDs)
	if err != nil {
		return fmt.Errorf("check booking dishes: %w", err)
	}
	valid := make(map[string]struct{}, len(dishIDs))
	for rows.Next() {
		var dishID string
		if err := rows.Scan(&dishID); err != nil {
			rows.Close()
			return fmt.Errorf("scan booking dish: %w", err)
		}
		valid[dishID] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return fmt.Errorf("iterate booking dishes: %w", err)
	}
	rows.Close()
	if len(valid) != len(dishIDs) {
		return fmt.Errorf("%w: dish does not belong to restaurant", ErrInvalid)
	}

	for _, dishID := range dishIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO booking_dishes (booking_id, dish_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING`, bookingID, dishID); err != nil {
			return fmt.Errorf("save booking dish: %w", err)
		}
	}
	return nil
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

func ListByRoom(ctx context.Context, db *pgxpool.Pool, roomID string) ([]Booking, error) {
	rows, err := db.Query(ctx, bookingSelect+`
		WHERE b.room_id = $1
		ORDER BY b.created_at DESC`, roomID)
	if err != nil {
		return nil, fmt.Errorf("list room bookings: %w", err)
	}
	defer rows.Close()

	out := make([]Booking, 0)
	for rows.Next() {
		item, err := scanBooking(rows)
		if err != nil {
			return nil, fmt.Errorf("scan room booking: %w", err)
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate room bookings: %w", err)
	}
	return out, nil
}

func LatestForRoom(ctx context.Context, db *pgxpool.Pool, roomID string) (Booking, error) {
	row := db.QueryRow(ctx, bookingSelect+`
		WHERE b.room_id = $1 AND b.chain_id IS NULL
		ORDER BY b.created_at DESC
		LIMIT 1`, roomID)
	item, err := scanBooking(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Booking{}, ErrNotFound
	}
	if err != nil {
		return Booking{}, fmt.Errorf("get latest room booking: %w", err)
	}
	return item, nil
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
		WHERE b.room_id = $1 AND b.restaurant_id = $2
		ORDER BY b.created_at DESC
		LIMIT 1`, roomID, restaurantID)
	item, err := scanBooking(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Booking{}, ErrNotFound
	}
	if err != nil {
		return Booking{}, fmt.Errorf("get room booking: %w", err)
	}
	return item, nil
}

func getByID(ctx context.Context, db *pgxpool.Pool, bookingID string) (Booking, error) {
	row := db.QueryRow(ctx, bookingSelect+` WHERE b.id = $1`, bookingID)
	item, err := scanBooking(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Booking{}, ErrNotFound
	}
	if err != nil {
		return Booking{}, fmt.Errorf("get booking by id: %w", err)
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

// Cancel lets the booking creator cancel an active booking. Another
// participant cannot cancel or rewrite the company booking.
func Cancel(ctx context.Context, db *pgxpool.Pool, roomID, participantID, bookingID string) (Booking, error) {
	var ownerID, status string
	err := db.QueryRow(ctx, `
		SELECT participant_id, status FROM bookings
		WHERE id = $1 AND room_id = $2 AND chain_id IS NULL`, bookingID, roomID).Scan(&ownerID, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return Booking{}, ErrNotFound
	}
	if err != nil {
		return Booking{}, fmt.Errorf("load booking for cancel: %w", err)
	}
	if ownerID != participantID {
		return Booking{}, ErrOwnedByOther
	}
	if status == "cancelled" {
		return getByID(ctx, db, bookingID)
	}
	if status != "new" && status != "contacted" && status != "confirmed" {
		return Booking{}, fmt.Errorf("%w: cannot cancel a processed booking", ErrInvalid)
	}
	if _, err := db.Exec(ctx, `
		UPDATE bookings SET status = 'cancelled', updated_at = now()
		WHERE id = $1 AND room_id = $2`, bookingID, roomID); err != nil {
		return Booking{}, fmt.Errorf("cancel booking: %w", err)
	}
	return getByID(ctx, db, bookingID)
}

// MaskPhone hides most digits of another participant's phone in guest-facing
// responses.
func MaskPhone(phone string) string {
	runes := []rune(strings.TrimSpace(phone))
	if len(runes) <= 4 {
		return "***"
	}
	return string(runes[:2]) + strings.Repeat("*", len(runes)-4) + string(runes[len(runes)-2:])
}

const bookingSelect = `
	SELECT b.id, b.restaurant_id, b.room_id, r.code, b.participant_id,
	       b.name, b.phone, b.party_size, b.requested_at, COALESCE(b.comment, ''),
	       b.status, b.source, b.chain_id, b.stop_order, b.route_id,
	       rest.name, rest.address, rest.city,
	       CASE WHEN b.chain_id IS NULL THEN 1 ELSE (
	           SELECT count(DISTINCT b2.stop_order) FROM bookings b2 WHERE b2.chain_id = b.chain_id
	       ) END,
	       COALESCE((
	           SELECT jsonb_agg(jsonb_build_object(
	               'dish_id', d.id, 'name', d.name, 'price', d.price,
	               'likes', COALESCE((
	                   SELECT m.likes FROM matches m
	                   WHERE m.room_id = b.room_id AND m.dish_id = d.id
	               ), 0)
	           ) ORDER BY d.name)
	           FROM booking_dishes bd
	           JOIN dishes d ON d.id = bd.dish_id
	           WHERE bd.booking_id = b.id
	       ), COALESCE((
	           SELECT jsonb_agg(jsonb_build_object(
	               'dish_id', d.id, 'name', d.name, 'price', d.price, 'likes', m.likes
	           ) ORDER BY m.likes DESC, d.name)
	           FROM matches m
	           JOIN dishes d ON d.id = m.dish_id
	           WHERE m.room_id = b.room_id AND d.restaurant_id = b.restaurant_id
	       ), '[]'::jsonb)) AS dishes,
	       b.created_at, b.updated_at
	FROM bookings b
	JOIN rooms r ON r.id = b.room_id
	JOIN restaurants rest ON rest.id = b.restaurant_id`

func scanBooking(row pgx.Row) (Booking, error) {
	var b Booking
	var chainID, routeID *string
	var stopOrder *int
	var dishesJSON []byte
	err := row.Scan(
		&b.ID, &b.RestaurantID, &b.RoomID, &b.RoomCode, &b.ParticipantID,
		&b.Name, &b.Phone, &b.PartySize, &b.RequestedAt, &b.Comment,
		&b.Status, &b.Source, &chainID, &stopOrder, &routeID,
		&b.RestaurantName, &b.RestaurantAddress, &b.RestaurantCity, &b.ChainSize,
		&dishesJSON, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return Booking{}, err
	}
	if chainID != nil {
		b.ChainID = *chainID
	}
	if stopOrder != nil {
		b.StopOrder = *stopOrder
	}
	if routeID != nil {
		b.RouteID = *routeID
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
