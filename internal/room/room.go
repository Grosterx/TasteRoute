package room

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/Grosterx/tasteroute/internal/id"
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
	StartLat          float64 `json:"-"`
	StartLon          float64 `json:"-"`
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

func Create(ctx context.Context, db *pgxpool.Pool, city string) (Room, error) {
	city = strings.TrimSpace(city)
	if city == "" {
		city = defaultCity
	}

	for attempt := 0; attempt < 8; attempt++ {
		code, err := randomCode(6)
		if err != nil {
			return Room{}, err
		}
		roomID := id.New()
		_, err = db.Exec(ctx, `
			INSERT INTO rooms (id, code, city, start_lat, start_lon)
			VALUES ($1, $2, $3, $4, $5)`,
			roomID, code, city, startLat, startLon,
		)
		if err == nil {
			return Room{ID: roomID, Code: code, City: city, StartLat: startLat, StartLon: startLon}, nil
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
		SELECT r.id, r.code, r.city, r.start_lat, r.start_lon, COUNT(p.id)
		FROM rooms r
		LEFT JOIN participants p ON p.room_id = r.id
		WHERE r.code = $1
		GROUP BY r.id`, code,
	).Scan(&r.ID, &r.Code, &r.City, &r.StartLat, &r.StartLon, &count)
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
			WHERE d.id = $1 AND d.active AND r.active
		)`, dishID).Scan(&dishExists)
	if err != nil {
		return SwipeResult{}, fmt.Errorf("check dish: %w", err)
	}
	if !dishExists {
		return SwipeResult{}, ErrDishNotFound
	}

	var swipeID string
	err = db.QueryRow(ctx, `
		INSERT INTO swipes (id, room_id, participant_id, dish_id, liked)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (participant_id, dish_id) DO NOTHING
		RETURNING id`, id.New(), roomID, participantID, dishID, liked,
	).Scan(&swipeID)
	if errors.Is(err, pgx.ErrNoRows) {
		return SwipeResult{Recorded: false, DishID: dishID}, nil
	}
	if err != nil {
		return SwipeResult{}, fmt.Errorf("insert swipe: %w", err)
	}

	result := SwipeResult{Recorded: true, DishID: dishID}
	if !liked {
		return result, nil
	}

	likes, err := rdb.Incr(ctx, likesKey(roomCode, dishID)).Result()
	if err != nil {
		return result, fmt.Errorf("increment likes: %w", err)
	}
	result.Likes = likes

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
