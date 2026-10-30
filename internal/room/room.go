package room

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/Grosterx/tasteroute/internal/id"
	"github.com/Grosterx/tasteroute/internal/restaurant"
)

const (
	MaxParticipants = 8
	defaultCity     = "Тольятти"
	startLat        = 53.5078
	startLon        = 49.4204
	codeAlphabet    = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
)

var (
	ErrNotFound     = errors.New("room not found")
	ErrRoomFull     = errors.New("room is full")
	ErrDishNotFound = errors.New("dish not found")
	ErrInvalidSwipe = errors.New("invalid swipe")
)

type Room struct {
	ID                string  `json:"room_id"`
	Code              string  `json:"code"`
	City              string  `json:"city"`
	ParticipantsCount int     `json:"participants_count"`
	Mode              string  `json:"mode"`
	Source            string  `json:"source"`
	RestaurantID      string  `json:"restaurant_id,omitempty"`
	RestaurantName    string  `json:"restaurant_name,omitempty"`
	RestaurantSlug    string  `json:"restaurant_slug,omitempty"`
	StartLat          float64 `json:"-"`
	StartLon          float64 `json:"-"`
}

type CreateInput struct {
	City           string
	RestaurantSlug string
	Source         string
}

type Participant struct {
	ID          string `json:"participant_id"`
	RoomID      string `json:"-"`
	DisplayName string `json:"name"`
}

type SwipeResult struct {
	Recorded     bool   `json:"recorded"`
	DishID       string `json:"dish_id"`
	Likes        int64  `json:"likes"`
	Matched      bool   `json:"matched"`
	MatchCreated bool   `json:"match_created"`
}

func Create(ctx context.Context, db *pgxpool.Pool, input CreateInput) (Room, error) {
	input.City = strings.TrimSpace(input.City)
	input.RestaurantSlug = strings.TrimSpace(input.RestaurantSlug)
	input.Source = strings.TrimSpace(input.Source)
	if input.City == "" {
		input.City = defaultCity
	}
	if input.Source == "" {
		input.Source = "direct"
	}
	if len([]rune(input.Source)) > 40 {
		input.Source = string([]rune(input.Source)[:40])
	}

	mode := "city"
	var restaurantID, restaurantName, restaurantSlug string
	lat, lon := startLat, startLon
	if input.RestaurantSlug != "" {
		found, err := restaurant.GetBySlug(ctx, db, input.RestaurantSlug)
		if err != nil {
			return Room{}, err
		}
		mode = "restaurant"
		restaurantID = found.ID
		restaurantName = found.Name
		restaurantSlug = found.Slug
		input.City = found.City
		lat = found.Lat
		lon = found.Lon
	}

	for attempt := 0; attempt < 8; attempt++ {
		code, err := randomCode(6)
		if err != nil {
			return Room{}, err
		}
		roomID := id.New()
		var restaurantRef any
		if restaurantID != "" {
			restaurantRef = restaurantID
		}
		_, err = db.Exec(ctx, `
			INSERT INTO rooms (id, code, city, start_lat, start_lon, restaurant_id, mode, source)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			roomID, code, input.City, lat, lon, restaurantRef, mode, input.Source,
		)
		if err == nil {
			return Room{
				ID:             roomID,
				Code:           code,
				City:           input.City,
				Mode:           mode,
				Source:         input.Source,
				RestaurantID:   restaurantID,
				RestaurantName: restaurantName,
				RestaurantSlug: restaurantSlug,
				StartLat:       lat,
				StartLon:       lon,
			}, nil
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			continue
		}
		return Room{}, fmt.Errorf("create room: %w", err)
	}
	return Room{}, errors.New("could not generate a unique room code")
}

func Get(ctx context.Context, db *pgxpool.Pool, code string) (Room, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	var r Room
	var count int64
	err := db.QueryRow(ctx, `
		SELECT r.id, r.code, r.city, r.start_lat, r.start_lon, r.mode, r.source,
		       COALESCE(r.restaurant_id::text, ''), COALESCE(rt.name, ''), COALESCE(rt.slug, ''),
		       COUNT(p.id)
		FROM rooms r
		LEFT JOIN restaurants rt ON rt.id = r.restaurant_id
		LEFT JOIN participants p ON p.room_id = r.id
		WHERE r.code = $1
		GROUP BY r.id, rt.name, rt.slug`, code,
	).Scan(
		&r.ID, &r.Code, &r.City, &r.StartLat, &r.StartLon, &r.Mode, &r.Source,
		&r.RestaurantID, &r.RestaurantName, &r.RestaurantSlug, &count,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Room{}, ErrNotFound
	}
	if err != nil {
		return Room{}, fmt.Errorf("get room: %w", err)
	}
	r.ParticipantsCount = int(count)
	return r, nil
}

func Join(ctx context.Context, db *pgxpool.Pool, code, displayName string) (Participant, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	displayName = strings.TrimSpace(displayName)
	if displayName == "" {
		displayName = "Гость"
	}
	if runes := []rune(displayName); len(runes) > 40 {
		displayName = string(runes[:40])
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return Participant{}, fmt.Errorf("begin join: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var roomID string
	err = tx.QueryRow(ctx, `SELECT id FROM rooms WHERE code = $1 FOR UPDATE`, code).Scan(&roomID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Participant{}, ErrNotFound
	}
	if err != nil {
		return Participant{}, fmt.Errorf("lock room: %w", err)
	}

	var count int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM participants WHERE room_id = $1`, roomID).Scan(&count); err != nil {
		return Participant{}, fmt.Errorf("count participants: %w", err)
	}
	if count >= MaxParticipants {
		return Participant{}, ErrRoomFull
	}

	participantID := id.New()
	if _, err := tx.Exec(ctx, `
		INSERT INTO participants (id, room_id, display_name)
		VALUES ($1, $2, $3)`, participantID, roomID, displayName,
	); err != nil {
		return Participant{}, fmt.Errorf("insert participant: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return Participant{}, fmt.Errorf("commit join: %w", err)
	}
	return Participant{ID: participantID, RoomID: roomID, DisplayName: displayName}, nil
}

func Swipe(ctx context.Context, db *pgxpool.Pool, rdb *redis.Client, roomID, roomCode, participantID, dishID string, liked bool) (SwipeResult, error) {
	dishID = strings.TrimSpace(dishID)
	if dishID == "" {
		return SwipeResult{}, ErrInvalidSwipe
	}

	var dishExists bool
	err := db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM dishes d
			JOIN restaurants r ON r.id = d.restaurant_id
			JOIN rooms rm ON rm.id = $2
			WHERE d.id = $1 AND d.active AND r.active
			  AND (rm.restaurant_id IS NULL OR d.restaurant_id = rm.restaurant_id)
		)`, dishID, roomID).Scan(&dishExists)
	if err != nil {
		return SwipeResult{}, fmt.Errorf("check dish: %w", err)
	}
	if !dishExists {
		return SwipeResult{}, ErrDishNotFound
	}

	inserted := true
	var swipeID string
	err = db.QueryRow(ctx, `
		INSERT INTO swipes (id, room_id, participant_id, dish_id, liked)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (participant_id, dish_id) DO NOTHING
		RETURNING id`, id.New(), roomID, participantID, dishID, liked,
	).Scan(&swipeID)
	if errors.Is(err, pgx.ErrNoRows) {
		inserted = false
		var existingLiked bool
		if err := db.QueryRow(ctx, `
			SELECT liked FROM swipes
			WHERE participant_id = $1 AND dish_id = $2`, participantID, dishID,
		).Scan(&existingLiked); err != nil {
			return SwipeResult{}, fmt.Errorf("load existing swipe: %w", err)
		}
		if !existingLiked {
			return SwipeResult{Recorded: false, DishID: dishID}, nil
		}
	} else if err != nil {
		return SwipeResult{}, fmt.Errorf("insert swipe: %w", err)
	}

	result := SwipeResult{Recorded: inserted, DishID: dishID}
	if !liked {
		return result, nil
	}

	var likes int64
	if err := db.QueryRow(ctx, `
		SELECT count(*) FROM swipes
		WHERE room_id = $1 AND dish_id = $2 AND liked`, roomID, dishID,
	).Scan(&likes); err != nil {
		return result, fmt.Errorf("count likes: %w", err)
	}
	result.Likes = likes

	if rdb != nil {
		if err := rdb.Set(ctx, likesKey(roomCode, dishID), likes, 24*time.Hour).Err(); err != nil {
			slog.Warn("cache likes", "error", err, "room", roomCode, "dish", dishID)
		}
	}

	var participants int
	if err := db.QueryRow(ctx, `SELECT COUNT(*) FROM participants WHERE room_id = $1`, roomID).Scan(&participants); err != nil {
		return result, fmt.Errorf("count participants: %w", err)
	}
	if likes >= int64(MatchThreshold(participants)) {
		result.Matched = true
		var matchID string
		err = db.QueryRow(ctx, `
			INSERT INTO matches (id, room_id, dish_id, likes)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (room_id, dish_id) DO NOTHING
			RETURNING id`, id.New(), roomID, dishID, likes,
		).Scan(&matchID)
		switch {
		case err == nil:
			result.MatchCreated = true
		case errors.Is(err, pgx.ErrNoRows):
			// The match was already created by another participant.
		default:
			return result, fmt.Errorf("insert match: %w", err)
		}
	}
	return result, nil
}

// MatchThreshold implements the MVP rule: min(2, ceil(participants/2)).
func MatchThreshold(participants int) int {
	if participants < 1 {
		return 1
	}
	half := (participants + 1) / 2
	if half < 2 {
		return half
	}
	return 2
}

func likesKey(roomCode, dishID string) string {
	return "room:" + strings.ToUpper(roomCode) + ":likes:" + dishID
}

func randomCode(length int) (string, error) {
	buf := make([]byte, length)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("random room code: %w", err)
	}
	out := make([]byte, length)
	for i, b := range buf {
		out[i] = codeAlphabet[int(b)%len(codeAlphabet)]
	}
	return string(out), nil
}
