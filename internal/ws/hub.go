package ws

import (
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	Room string
	Conn *websocket.Conn
	Send chan []byte
}

func (c *Client) Close() {
	if c == nil || c.Conn == nil {
		return
	}
	_ = c.Conn.Close()
}

type Hub struct {
	mu    sync.RWMutex
	rooms map[string]map[*Client]struct{}
}

func NewHub() *Hub {
	return &Hub{rooms: make(map[string]map[*Client]struct{})}
}

func (h *Hub) Join(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	clients, ok := h.rooms[client.Room]
	if !ok {
		clients = make(map[*Client]struct{})
		h.rooms[client.Room] = clients
	}
	clients[client] = struct{}{}
}

func (h *Hub) Leave(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	clients, ok := h.rooms[client.Room]
	if !ok {
		return
	}
	delete(clients, client)
	if len(clients) == 0 {
		delete(h.rooms, client.Room)
	}
}

func (h *Hub) Broadcast(room string, payload []byte) {
	h.mu.RLock()
	clients := make([]*Client, 0, len(h.rooms[room]))
	for client := range h.rooms[room] {
		clients = append(clients, client)
	}
	h.mu.RUnlock()

	for _, client := range clients {
		select {
		case client.Send <- payload:
		default:
			// A slow client must not block the room.
		}
	}
}

func (h *Hub) Count(room string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.rooms[room])
}
