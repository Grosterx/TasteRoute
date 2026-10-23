package ws

import (
	"sync"
	"testing"
)

func TestHubJoinBroadcastLeave(t *testing.T) {
	h := NewHub()
	a := &Client{Room: "ROOM01", Send: make(chan []byte, 4)}
	b := &Client{Room: "ROOM01", Send: make(chan []byte, 4)}
	other := &Client{Room: "ROOM02", Send: make(chan []byte, 4)}

	h.Join(a)
	h.Join(b)
	h.Join(other)
	if got := h.Count("ROOM01"); got != 2 {
		t.Fatalf("Count() = %d, want 2", got)
	}

	h.Broadcast("ROOM01", []byte("hello"))
	for _, client := range []*Client{a, b} {
		select {
		case got := <-client.Send:
			if string(got) != "hello" {
				t.Fatalf("message = %q", got)
			}
		default:
			t.Fatal("expected a message")
		}
	}
	select {
	case <-other.Send:
		t.Fatal("message leaked into another room")
	default:
	}

	h.Leave(a)
	h.Leave(b)
	if got := h.Count("ROOM01"); got != 0 {
		t.Fatalf("Count() after leave = %d, want 0", got)
	}
}

func TestHubConcurrent(t *testing.T) {
	h := NewHub()
	const clients = 50
	var wg sync.WaitGroup
	wg.Add(clients)
	for i := 0; i < clients; i++ {
		go func() {
			defer wg.Done()
			c := &Client{Room: "ROOM01", Send: make(chan []byte, 1)}
			h.Join(c)
			h.Broadcast("ROOM01", []byte("x"))
			h.Leave(c)
		}()
	}
	wg.Wait()
}
