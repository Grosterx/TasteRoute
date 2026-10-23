package lead

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

var ErrInvalidLead = errors.New("name and phone are required")

type Lead struct {
	ID            string          `json:"id"`
	RoomID        string          `json:"-"`
	RoomCode      string          `json:"room_code"`
	RouteID       string          `json:"route_id,omitempty"`
	ParticipantID string          `json:"participant_id"`
	Name          string          `json:"name"`
	Phone         string          `json:"phone"`
	Comment       string          `json:"comment"`
	Status        string          `json:"status"`
	Route         json.RawMessage `json:"route"`
	CreatedAt     time.Time       `json:"created_at"`
}

func Create(ctx context.Context, db *pgxpool.Pool, roomID, participantID, name, phone, comment string) error {
	name = strings.TrimSpace(name)
	phone = strings.TrimSpace(phone)
	comment = strings.TrimSpace(comment)
	if name == "" || phone == "" {
		return ErrInvalidLead
	}
	if len([]rune(name)) > 80 || len([]rune(phone)) > 40 || len([]rune(comment)) > 500 {
		return ErrInvalidLead
	}

	var routeID *string
	var idValue string
	err := db.QueryRow(ctx, `SELECT id::text FROM routes WHERE room_id = $1`, roomID).Scan(&idValue)
	if err == nil {
		routeID = &idValue
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("load route: %w", err)
	}

	_, err = db.Exec(ctx, `
		INSERT INTO leads (id, room_id, route_id, participant_id, name, phone, comment)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id.New(), roomID, routeID, participantID, name, phone, comment,
	)
	if err != nil {
		return fmt.Errorf("create lead: %w", err)
	}
	return nil
}

func List(ctx context.Context, db *pgxpool.Pool) ([]Lead, error) {
	rows, err := db.Query(ctx, `
		SELECT l.id, l.room_id, r.code, COALESCE(l.route_id::text, ''),
		       l.participant_id, l.name, l.phone, COALESCE(l.comment, ''), l.status,
		       COALESCE(rt.stops, 'null'::jsonb), l.created_at
		FROM leads l
		JOIN rooms r ON r.id = l.room_id
		LEFT JOIN routes rt ON rt.id = l.route_id
		ORDER BY l.created_at DESC
		LIMIT 100`)
	if err != nil {
		return nil, fmt.Errorf("list leads: %w", err)
	}
	defer rows.Close()

	out := make([]Lead, 0)
	for rows.Next() {
		var l Lead
		if err := rows.Scan(
			&l.ID, &l.RoomID, &l.RoomCode, &l.RouteID, &l.ParticipantID,
			&l.Name, &l.Phone, &l.Comment, &l.Status, &l.Route, &l.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan lead: %w", err)
		}
		if l.RouteID != "" {
			wrapped, err := json.Marshal(map[string]any{
				"route_id": l.RouteID,
				"stops":    l.Route,
			})
			if err != nil {
				return nil, fmt.Errorf("wrap lead route: %w", err)
			}
			l.Route = wrapped
		}
		out = append(out, l)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate leads: %w", err)
	}
	return out, nil
}
