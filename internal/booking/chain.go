package booking

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Grosterx/tasteroute/internal/id"
)

// MaxChainStops caps an evening route at three restaurants.
const MaxChainStops = 3

var (
	chainActiveStatuses = []string{"new", "contacted", "confirmed"}
)

type ChainStopInput struct {
	RestaurantID string
	RequestedAt  *time.Time
	DishIDs      []string
}

type ChainInput struct {
	Name      string
	Phone     string
	PartySize int
	Comment   string
	Stops     []ChainStopInput
}

type ChainStop struct {
	BookingID         string     `json:"booking_id"`
	RestaurantID      string     `json:"restaurant_id"`
	RestaurantName    string     `json:"restaurant_name"`
	RestaurantAddress string     `json:"restaurant_address"`
	RestaurantCity    string     `json:"restaurant_city"`
	StopOrder         int        `json:"stop_order"`
	RequestedAt       *time.Time `json:"requested_at"`
	Status            string     `json:"status"`
	Dishes            []DishRef  `json:"dishes"`
	CreatedAt         time.Time  `json:"created_at"`
}

type Chain struct {
	ID            string      `json:"id"`
	RouteID       string      `json:"route_id,omitempty"`
	ParticipantID string      `json:"participant_id"`
	Name          string      `json:"name"`
	Phone         string      `json:"phone"`
	PartySize     int         `json:"party_size"`
	Comment       string      `json:"comment"`
	Status        string      `json:"status"`
	Stops         []ChainStop `json:"stops"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
}

// CreateChain saves one company evening: an ordered set of requests to 1-3
// restaurants. It is atomic: either every stop is created or nothing is.
func CreateChain(ctx context.Context, db *pgxpool.Pool, roomID, participantID, routeID, source string, input ChainInput) (Chain, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Phone = strings.TrimSpace(input.Phone)
	input.Comment = strings.TrimSpace(input.Comment)
	if err := validateContact(input.Name, input.Phone, input.Comment, input.PartySize); err != nil {
		return Chain{}, err
	}
	if len(input.Stops) == 0 || len(input.Stops) > MaxChainStops {
		return Chain{}, fmt.Errorf("%w: route must have 1-3 stops", ErrInvalid)
	}

	routeID = strings.TrimSpace(routeID)
	if routeID == "" {
		return Chain{}, fmt.Errorf("%w: route is required", ErrInvalid)
	}

	seen := make(map[string]struct{}, len(input.Stops))
	for i := range input.Stops {
		stop := &input.Stops[i]
		stop.RestaurantID = strings.TrimSpace(stop.RestaurantID)
		if stop.RestaurantID == "" {
			return Chain{}, fmt.Errorf("%w: restaurant is required", ErrInvalid)
		}
		if _, ok := seen[stop.RestaurantID]; ok {
			return Chain{}, fmt.Errorf("%w: duplicate restaurant", ErrInvalid)
		}
		seen[stop.RestaurantID] = struct{}{}
		if err := validateRequestedAt(stop.RequestedAt); err != nil {
			return Chain{}, err
		}
	}
	if len(input.Stops) > 1 {
		for i := range input.Stops {
			if input.Stops[i].RequestedAt == nil {
				return Chain{}, fmt.Errorf("%w: time is required for every stop", ErrInvalid)
			}
		}
		for i := 1; i < len(input.Stops); i++ {
			if !input.Stops[i].RequestedAt.After(*input.Stops[i-1].RequestedAt) {
				return Chain{}, fmt.Errorf("%w: stop times must increase", ErrInvalid)
			}
		}
	}

	source = strings.TrimSpace(source)
	if source == "" {
		source = "city"
	}
	if len([]rune(source)) > 40 {
		source = string([]rune(source)[:40])
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return Chain{}, fmt.Errorf("begin chain: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var roomCity string
	if err := tx.QueryRow(ctx, `
		SELECT city FROM rooms WHERE id = $1 FOR UPDATE`, roomID).Scan(&roomCity); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Chain{}, ErrInvalid
		}
		return Chain{}, fmt.Errorf("lock room: %w", err)
	}

	var activeParticipant string
	err = tx.QueryRow(ctx, `
		SELECT participant_id FROM bookings
		WHERE room_id = $1 AND status = ANY($2)
		ORDER BY created_at DESC
		LIMIT 1`, roomID, activeBookingStatuses).Scan(&activeParticipant)
	switch {
	case err == nil:
		if activeParticipant != participantID {
			return Chain{}, ErrOwnedByOther
		}
		return Chain{}, fmt.Errorf("%w: cancel the current booking first", ErrLocked)
	case !errors.Is(err, pgx.ErrNoRows):
		return Chain{}, fmt.Errorf("find active booking: %w", err)
	}

	var storedRouteID string
	err = tx.QueryRow(ctx, `
		SELECT id FROM routes WHERE id = $1 AND room_id = $2`, routeID, roomID).Scan(&storedRouteID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Chain{}, fmt.Errorf("%w: route not found", ErrInvalid)
	}
	if err != nil {
		return Chain{}, fmt.Errorf("find route: %w", err)
	}

	routeRestaurants, err := routeRestaurantIDs(ctx, tx, storedRouteID)
	if err != nil {
		return Chain{}, err
	}
	inRoute := make(map[string]struct{}, len(routeRestaurants))
	for _, restaurantID := range routeRestaurants {
		inRoute[restaurantID] = struct{}{}
	}
	for _, stop := range input.Stops {
		if _, ok := inRoute[stop.RestaurantID]; !ok {
			return Chain{}, fmt.Errorf("%w: restaurant is not in the route", ErrInvalid)
		}
	}

	chainID := id.New()
	for i, stop := range input.Stops {
		if err := validateChainRestaurant(ctx, tx, roomCity, stop.RestaurantID); err != nil {
			return Chain{}, err
		}
		if _, err := upsertChainStop(ctx, tx, roomID, participantID, stop.RestaurantID,
			chainID, storedRouteID, source, i+1, CreateInput{
				Name:        input.Name,
				Phone:       input.Phone,
				PartySize:   input.PartySize,
				RequestedAt: stop.RequestedAt,
				Comment:     input.Comment,
				DishIDs:     stop.DishIDs,
			}); err != nil {
			return Chain{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return Chain{}, fmt.Errorf("commit chain: %w", err)
	}
	return GetChainForRoom(ctx, db, roomID)
}

// GetChainForRoom returns the latest evening chain of a room. Replaced stops
// keep their declined row as history; guests see the newest row per position.
func GetChainForRoom(ctx context.Context, db *pgxpool.Pool, roomID string) (Chain, error) {
	var chainID string
	err := db.QueryRow(ctx, `
		SELECT chain_id FROM bookings
		WHERE room_id = $1 AND chain_id IS NOT NULL
		ORDER BY updated_at DESC, created_at DESC
		LIMIT 1`, roomID).Scan(&chainID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Chain{}, ErrNotFound
	}
	if err != nil {
		return Chain{}, fmt.Errorf("find room chain: %w", err)
	}

	rows, err := db.Query(ctx, bookingSelect+`
		WHERE b.chain_id = $1
		ORDER BY b.stop_order, b.created_at, b.updated_at`, chainID)
	if err != nil {
		return Chain{}, fmt.Errorf("list chain stops: %w", err)
	}
	defer rows.Close()

	byOrder := make(map[int]ChainStop, MaxChainStops)
	var header *Booking
	for rows.Next() {
		item, err := scanBooking(rows)
		if err != nil {
			return Chain{}, fmt.Errorf("scan chain stop: %w", err)
		}
		if header == nil || item.UpdatedAt.After(header.UpdatedAt) {
			copied := item
			header = &copied
		}
		// A replacement keeps the same stop position; the newest row wins.
		byOrder[item.StopOrder] = ChainStop{
			BookingID:         item.ID,
			RestaurantID:      item.RestaurantID,
			RestaurantName:    item.RestaurantName,
			RestaurantAddress: item.RestaurantAddress,
			RestaurantCity:    item.RestaurantCity,
			StopOrder:         item.StopOrder,
			RequestedAt:       item.RequestedAt,
			Status:            item.Status,
			Dishes:            item.Dishes,
			CreatedAt:         item.CreatedAt,
		}
	}
	if err := rows.Err(); err != nil {
		return Chain{}, fmt.Errorf("iterate chain stops: %w", err)
	}
	if header == nil {
		return Chain{}, ErrNotFound
	}

	orders := make([]int, 0, len(byOrder))
	for order := range byOrder {
		orders = append(orders, order)
	}
	sort.Ints(orders)
	stops := make([]ChainStop, 0, len(orders))
	for _, order := range orders {
		stops = append(stops, byOrder[order])
	}

	return Chain{
		ID:            chainID,
		RouteID:       header.RouteID,
		ParticipantID: header.ParticipantID,
		Name:          header.Name,
		Phone:         header.Phone,
		PartySize:     header.PartySize,
		Comment:       header.Comment,
		Status:        chainStatus(stops),
		Stops:         stops,
		CreatedAt:     header.CreatedAt,
		UpdatedAt:     header.UpdatedAt,
	}, nil
}

// CancelChain cancels every active stop of the evening. Only its creator can
// do that.
func CancelChain(ctx context.Context, db *pgxpool.Pool, roomID, participantID, chainID string) (Chain, error) {
	var owner string
	err := db.QueryRow(ctx, `
		SELECT participant_id FROM bookings
		WHERE room_id = $1 AND chain_id = $2
		ORDER BY created_at
		LIMIT 1`, roomID, chainID).Scan(&owner)
	if errors.Is(err, pgx.ErrNoRows) {
		return Chain{}, ErrNotFound
	}
	if err != nil {
		return Chain{}, fmt.Errorf("load chain owner: %w", err)
	}
	if owner != participantID {
		return Chain{}, ErrOwnedByOther
	}

	if _, err := db.Exec(ctx, `
		UPDATE bookings SET status = 'cancelled', updated_at = now()
		WHERE room_id = $1 AND chain_id = $2 AND status = ANY($3)`,
		roomID, chainID, chainActiveStatuses); err != nil {
		return Chain{}, fmt.Errorf("cancel chain: %w", err)
	}
	return GetChainForRoom(ctx, db, roomID)
}

// CancelChainStop cancels one stop of the evening, keeping the rest.
func CancelChainStop(ctx context.Context, db *pgxpool.Pool, roomID, participantID, bookingID string) (Chain, error) {
	var owner, status, chainID string
	err := db.QueryRow(ctx, `
		SELECT participant_id, status, chain_id FROM bookings
		WHERE id = $1 AND room_id = $2 AND chain_id IS NOT NULL`, bookingID, roomID,
	).Scan(&owner, &status, &chainID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Chain{}, ErrNotFound
	}
	if err != nil {
		return Chain{}, fmt.Errorf("load chain stop: %w", err)
	}
	if owner != participantID {
		return Chain{}, ErrOwnedByOther
	}
	if isActiveStatus(status) {
		if _, err := db.Exec(ctx, `
			UPDATE bookings SET status = 'cancelled', updated_at = now()
			WHERE id = $1 AND room_id = $2`, bookingID, roomID); err != nil {
			return Chain{}, fmt.Errorf("cancel chain stop: %w", err)
		}
	} else if status != "cancelled" {
		return Chain{}, fmt.Errorf("%w: this stop is already processed", ErrInvalid)
	}
	return GetChainForRoom(ctx, db, roomID)
}

// AddChainStop adds a replacement point at the position of a declined or
// cancelled stop. Only the chain creator can call it.
func AddChainStop(ctx context.Context, db *pgxpool.Pool, roomID, participantID, chainID, replaceBookingID string, stopOrder int, input ChainStopInput) (Chain, error) {
	input.RestaurantID = strings.TrimSpace(input.RestaurantID)
	if input.RestaurantID == "" {
		return Chain{}, fmt.Errorf("%w: restaurant is required", ErrInvalid)
	}
	if err := validateRequestedAt(input.RequestedAt); err != nil {
		return Chain{}, err
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return Chain{}, fmt.Errorf("begin chain stop: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var roomCity string
	if err := tx.QueryRow(ctx, `
		SELECT city FROM rooms WHERE id = $1 FOR UPDATE`, roomID).Scan(&roomCity); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Chain{}, ErrInvalid
		}
		return Chain{}, fmt.Errorf("lock room: %w", err)
	}

	rows, err := tx.Query(ctx, `
		SELECT id, participant_id, status, stop_order, route_id, source,
		       name, phone, party_size, COALESCE(comment, ''), requested_at, restaurant_id
		FROM bookings
		WHERE room_id = $1 AND chain_id = $2
		ORDER BY stop_order, created_at
		FOR UPDATE`, roomID, chainID)
	if err != nil {
		return Chain{}, fmt.Errorf("load chain: %w", err)
	}

	type chainRow struct {
		id, participantID, status, routeID, source string
		stopOrder                                  int
		name, phone, comment, restaurantID         string
		partySize                                  int
		requestedAt                                *time.Time
	}
	items := make([]chainRow, 0, MaxChainStops)
	for rows.Next() {
		var item chainRow
		if err := rows.Scan(&item.id, &item.participantID, &item.status, &item.stopOrder,
			&item.routeID, &item.source, &item.name, &item.phone, &item.partySize,
			&item.comment, &item.requestedAt, &item.restaurantID); err != nil {
			rows.Close()
			return Chain{}, fmt.Errorf("scan chain: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return Chain{}, fmt.Errorf("iterate chain: %w", err)
	}
	rows.Close()
	if len(items) == 0 {
		return Chain{}, ErrNotFound
	}
	owner := items[0].participantID
	if owner != participantID {
		return Chain{}, ErrOwnedByOther
	}

	active := 0
	var replaceRow *chainRow
	for i := range items {
		if isActiveStatus(items[i].status) {
			active++
		}
		if items[i].id == replaceBookingID {
			replaceRow = &items[i]
		}
	}
	if active == 0 {
		return Chain{}, fmt.Errorf("%w: the evening is already cancelled", ErrInvalid)
	}
	if replaceBookingID != "" {
		if replaceRow == nil {
			return Chain{}, ErrNotFound
		}
		if replaceRow.status != "declined" && replaceRow.status != "cancelled" {
			return Chain{}, fmt.Errorf("%w: only a declined stop can be replaced", ErrInvalid)
		}
		if stopOrder == 0 {
			stopOrder = replaceRow.stopOrder
		} else if stopOrder != replaceRow.stopOrder {
			return Chain{}, fmt.Errorf("%w: stop position mismatch", ErrInvalid)
		}
	}
	if stopOrder < 1 || stopOrder > MaxChainStops {
		return Chain{}, fmt.Errorf("%w: invalid stop position", ErrInvalid)
	}
	routeRestaurants, err := routeRestaurantIDs(ctx, tx, items[0].routeID)
	if err != nil {
		return Chain{}, err
	}
	if stopOrder > len(routeRestaurants) {
		return Chain{}, fmt.Errorf("%w: stop position is outside the route", ErrInvalid)
	}
	inRoute := false
	for _, restaurantID := range routeRestaurants {
		if restaurantID == input.RestaurantID {
			inRoute = true
			break
		}
	}
	if !inRoute {
		return Chain{}, fmt.Errorf("%w: restaurant is not in the route", ErrInvalid)
	}
	for i := range items {
		if items[i].id == replaceBookingID || !isActiveStatus(items[i].status) {
			continue
		}
		if items[i].stopOrder == stopOrder {
			return Chain{}, fmt.Errorf("%w: stop position is already booked", ErrInvalid)
		}
		if items[i].restaurantID == input.RestaurantID {
			return Chain{}, fmt.Errorf("%w: restaurant is already in the evening", ErrInvalid)
		}
	}

	if err := validateChainRestaurant(ctx, tx, roomCity, input.RestaurantID); err != nil {
		return Chain{}, err
	}

	// Validate the time against neighbouring active stops.
	totalActive := active
	if replaceRow == nil || !isActiveStatus(replaceRow.status) {
		totalActive++
	}
	var previous, next *time.Time
	for i := range items {
		if items[i].id == replaceBookingID || !isActiveStatus(items[i].status) {
			continue
		}
		if items[i].requestedAt == nil {
			continue
		}
		if items[i].stopOrder < stopOrder && (previous == nil || items[i].requestedAt.After(*previous)) {
			previous = items[i].requestedAt
		}
		if items[i].stopOrder > stopOrder && (next == nil || items[i].requestedAt.Before(*next)) {
			next = items[i].requestedAt
		}
	}
	if totalActive > 1 && input.RequestedAt == nil {
		return Chain{}, fmt.Errorf("%w: time is required for every stop", ErrInvalid)
	}
	if input.RequestedAt != nil {
		if previous != nil && !input.RequestedAt.After(*previous) {
			return Chain{}, fmt.Errorf("%w: stop time must be after the previous stop", ErrInvalid)
		}
		if next != nil && !input.RequestedAt.Before(*next) {
			return Chain{}, fmt.Errorf("%w: stop time must be before the next stop", ErrInvalid)
		}
	}

	if _, err := upsertChainStop(ctx, tx, roomID, participantID, input.RestaurantID,
		chainID, items[0].routeID, items[0].source, stopOrder, CreateInput{
			Name:        items[0].name,
			Phone:       items[0].phone,
			PartySize:   items[0].partySize,
			RequestedAt: input.RequestedAt,
			Comment:     items[0].comment,
			DishIDs:     input.DishIDs,
		}); err != nil {
		return Chain{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Chain{}, fmt.Errorf("commit chain stop: %w", err)
	}
	return GetChainForRoom(ctx, db, roomID)
}

func upsertChainStop(ctx context.Context, tx pgx.Tx, roomID, participantID, restaurantID,
	chainID, routeID, source string, stopOrder int, input CreateInput,
) (string, error) {
	dishIDs, err := normalizeDishIDs(input.DishIDs)
	if err != nil {
		return "", err
	}

	var bookingID string
	err = tx.QueryRow(ctx, `
		SELECT id FROM bookings
		WHERE room_id = $1 AND restaurant_id = $2
		ORDER BY created_at DESC
		LIMIT 1
		FOR UPDATE`, roomID, restaurantID).Scan(&bookingID)
	switch {
	case err == nil:
		if _, err := tx.Exec(ctx, `
			UPDATE bookings SET
				participant_id = $2, name = $3, phone = $4, party_size = $5,
				requested_at = $6, comment = $7, source = $8, status = 'new',
				chain_id = $9, stop_order = $10, route_id = $11,
				created_at = now(), updated_at = now()
			WHERE id = $1`,
			bookingID, participantID, input.Name, input.Phone, input.PartySize,
			input.RequestedAt, input.Comment, source, chainID, stopOrder, routeID,
		); err != nil {
			return "", fmt.Errorf("update chain stop: %w", err)
		}
	case errors.Is(err, pgx.ErrNoRows):
		err = tx.QueryRow(ctx, `
			INSERT INTO bookings (
				id, restaurant_id, room_id, participant_id, name, phone, party_size,
				requested_at, comment, source, chain_id, stop_order, route_id
			)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
			RETURNING id`,
			id.New(), restaurantID, roomID, participantID, input.Name, input.Phone,
			input.PartySize, input.RequestedAt, input.Comment, source, chainID, stopOrder, routeID,
		).Scan(&bookingID)
		if err != nil {
			return "", fmt.Errorf("create chain stop: %w", err)
		}
	default:
		return "", fmt.Errorf("find chain stop: %w", err)
	}

	if err := replaceDishes(ctx, tx, bookingID, restaurantID, dishIDs); err != nil {
		return "", err
	}
	return bookingID, nil
}

func routeRestaurantIDs(ctx context.Context, tx pgx.Tx, routeID string) ([]string, error) {
	routeID = strings.TrimSpace(routeID)
	if routeID == "" {
		return nil, fmt.Errorf("%w: route is required", ErrInvalid)
	}
	var payload []byte
	if err := tx.QueryRow(ctx, `
		SELECT stops FROM routes WHERE id = $1`, routeID).Scan(&payload); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("%w: route not found", ErrInvalid)
		}
		return nil, fmt.Errorf("load route: %w", err)
	}
	var stops []struct {
		RestaurantID string `json:"restaurant_id"`
	}
	if err := json.Unmarshal(payload, &stops); err != nil {
		return nil, fmt.Errorf("decode route: %w", err)
	}
	out := make([]string, 0, len(stops))
	for _, stop := range stops {
		out = append(out, stop.RestaurantID)
	}
	return out, nil
}

func validateChainRestaurant(ctx context.Context, tx pgx.Tx, roomCity, restaurantID string) error {
	var active bool
	var city string
	err := tx.QueryRow(ctx, `
		SELECT active, city FROM restaurants WHERE id = $1`, restaurantID).Scan(&active, &city)
	if errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("%w: restaurant not found", ErrInvalid)
	}
	if err != nil {
		return fmt.Errorf("load restaurant: %w", err)
	}
	if !active {
		return fmt.Errorf("%w: restaurant is not accepting bookings", ErrInvalid)
	}
	if !strings.EqualFold(strings.TrimSpace(city), strings.TrimSpace(roomCity)) {
		return fmt.Errorf("%w: restaurant is in another city", ErrInvalid)
	}
	return nil
}

func validateContact(name, phone, comment string, partySize int) error {
	if name == "" || phone == "" {
		return fmt.Errorf("%w: name and phone are required", ErrInvalid)
	}
	if len([]rune(name)) > 80 || len([]rune(phone)) > 40 || len([]rune(comment)) > 500 {
		return ErrInvalid
	}
	if partySize < 1 || partySize > 20 {
		return fmt.Errorf("%w: invalid party size", ErrInvalid)
	}
	return nil
}

func validateRequestedAt(at *time.Time) error {
	if at == nil {
		return nil
	}
	if at.Before(time.Now().Add(-24 * time.Hour)) {
		return fmt.Errorf("%w: requested time is in the past", ErrInvalid)
	}
	if at.After(time.Now().AddDate(1, 0, 0)) {
		return fmt.Errorf("%w: requested time is too far away", ErrInvalid)
	}
	return nil
}

func isActiveStatus(status string) bool {
	switch status {
	case "new", "contacted", "confirmed":
		return true
	default:
		return false
	}
}

func chainStatus(stops []ChainStop) string {
	if len(stops) == 0 {
		return "empty"
	}
	confirmed, cancelled, active := 0, 0, 0
	for _, stop := range stops {
		switch stop.Status {
		case "confirmed":
			confirmed++
		case "cancelled":
			cancelled++
		}
		if isActiveStatus(stop.Status) {
			active++
		}
	}
	switch {
	case confirmed == len(stops):
		return "confirmed"
	case active == len(stops):
		return "pending"
	case active > 0:
		return "partial"
	case cancelled == len(stops):
		return "cancelled"
	default:
		return "declined"
	}
}
