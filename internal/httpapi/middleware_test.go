package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientIP(t *testing.T) {
	tests := []struct {
		name    string
		remote  string
		headers map[string]string
		want    string
	}{
		{
			name:    "cloudflare header",
			remote:  "127.0.0.1:1234",
			headers: map[string]string{"CF-Connecting-IP": "203.0.113.10"},
			want:    "203.0.113.10",
		},
		{
			name:    "cloudflare header wins over forwarded",
			remote:  "127.0.0.1:1234",
			headers: map[string]string{"CF-Connecting-IP": "203.0.113.10", "X-Forwarded-For": "198.51.100.1"},
			want:    "203.0.113.10",
		},
		{
			name:    "invalid cloudflare falls back to real ip",
			remote:  "127.0.0.1:1234",
			headers: map[string]string{"CF-Connecting-IP": "not-an-ip", "X-Real-IP": "198.51.100.7"},
			want:    "198.51.100.7",
		},
		{
			name:    "first valid forwarded address",
			remote:  "127.0.0.1:1234",
			headers: map[string]string{"X-Forwarded-For": "unknown, 198.51.100.1, 10.0.0.1"},
			want:    "198.51.100.1",
		},
		{
			name:    "header with port",
			remote:  "127.0.0.1:1234",
			headers: map[string]string{"CF-Connecting-IP": "203.0.113.10:443"},
			want:    "203.0.113.10",
		},
		{
			name:   "remote address with port",
			remote: "192.0.2.5:443",
			want:   "192.0.2.5",
		},
		{
			name:   "remote ipv6",
			remote: "[2001:db8::1]:443",
			want:   "2001:db8::1",
		},
		{
			name:   "empty",
			remote: "",
			want:   "unknown",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.RemoteAddr = tc.remote
			for key, value := range tc.headers {
				req.Header.Set(key, value)
			}

			if got := clientIP(req); got != tc.want {
				t.Fatalf("clientIP() = %q, want %q", got, tc.want)
			}
		})
	}
}
