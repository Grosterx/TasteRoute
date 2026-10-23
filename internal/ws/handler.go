package ws

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/Grosterx/tasteroute/internal/auth"
	roompkg "github.com/Grosterx/tasteroute/internal/room"
)

type Handler struct {
	secret  string
	db      *pgxpool.Pool
	rdb     *redis.Client
	hub     *Hub
	origins []string
}

func NewHandler(secret string, db *pgxpool.Pool, rdb *redis.Client, hub *Hub, origins []string) *Handler {
	return &Handler{secret: secret, db: db, rdb: rdb, hub: hub, origins: origins}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	roomCode := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("room")))
	rawToken := strings.TrimSpace(r.URL.Query().Get("token"))
	if roomCode == "" || rawToken == "" {
		http.Error(w, "room and token are required", http.StatusUnauthorized)
		return
	}

	claims, err := auth.Parse(h.secret, rawToken)
	if err != nil || claims.RoomCode != roomCode {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	found, err := roompkg.Get(r.Context(), h.db, roomCode)
	if errors.Is(err, roompkg.ErrNotFound) {
		http.Error(w, "room not found", http.StatusNotFound)
		return
	}
	if err != nil {
		slog.Error("ws room lookup", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	var participantExists bool
	err = h.db.QueryRow(r.Context(), `
		SELECT EXISTS(SELECT 1 FROM participants WHERE id = $1 AND room_id = $2)`,
		claims.ParticipantID, found.ID,
	).Scan(&participantExists)
	if err != nil {
		slog.Error("ws participant lookup", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if !participantExists {
		http.Error(w, "participant not found", http.StatusForbidden)
		return
	}

	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return originAllowed(r, h.origins)
		},
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{
		Room: roomCode,
		Conn: conn,
		Send: make(chan []byte, 32),
	}
	h.hub.Join(client)
	go client.WritePump()
	defer func() {
		h.hub.Leave(client)
		client.Close()
	}()

	h.broadcastParticipants(r.Context(), roomCode)
	h.readLoop(client, found, claims.ParticipantID)
}

func (h *Handler) readLoop(client *Client, found roompkg.Room, participantID string) {
	client.Conn.SetReadLimit(8 << 10)
	for {
		_, data, err := client.Conn.ReadMessage()
		if err != nil {
			return
		}

		var msg struct {
			Type   string `json:"type"`
			DishID string `json:"dish_id"`
			Liked  bool   `json:"liked"`
		}
		if err := json.Unmarshal(data, &msg); err != nil {
			h.sendError(client, "некорректное сообщение")
			continue
		}
		if msg.Type != "swipe" {
			continue
		}

		result, err := roompkg.Swipe(context.Background(), h.db, h.rdb, found.ID, found.Code, participantID, msg.DishID, msg.Liked)
		if errors.Is(err, roompkg.ErrDishNotFound) {
			h.sendError(client, "блюдо не найдено")
			continue
		}
		if err != nil {
			slog.Error("swipe", "error", err, "room", found.Code, "dish", msg.DishID)
			h.sendError(client, "не удалось сохранить свайп")
			continue
		}
		if result.MatchCreated {
			payload, err := json.Marshal(map[string]any{
				"type":    "match",
				"dish_id": result.DishID,
				"likes":   result.Likes,
			})
			if err == nil {
				h.hub.Broadcast(found.Code, payload)
			}
		}
	}
}

func (h *Handler) broadcastParticipants(ctx context.Context, roomCode string) {
	found, err := roompkg.Get(ctx, h.db, roomCode)
	if err != nil {
		slog.Warn("ws participants lookup", "error", err)
		return
	}
	payload, err := json.Marshal(map[string]any{
		"type":  "participants",
		"count": found.ParticipantsCount,
	})
	if err != nil {
		return
	}
	h.hub.Broadcast(roomCode, payload)
}

func (h *Handler) sendError(client *Client, message string) {
	payload, err := json.Marshal(map[string]string{"type": "error", "message": message})
	if err != nil {
		return
	}
	select {
	case client.Send <- payload:
	default:
	}
}

func originAllowed(r *http.Request, origins []string) bool {
	origin := strings.TrimRight(r.Header.Get("Origin"), "/")
	if origin == "" {
		return true
	}
	for _, allowed := range origins {
		if allowed == "*" || strings.EqualFold(strings.TrimRight(allowed, "/"), origin) {
			return true
		}
	}
	return false
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		_ = c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
