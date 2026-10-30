package httpapi

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func securityHeaders(appEnv string) func(http.Handler) http.Handler {
	production := strings.EqualFold(strings.TrimSpace(appEnv), "production")
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
			w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
			w.Header().Set("Cross-Origin-Opener-Policy", "same-origin")
			if production {
				w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (a *API) rateLimit(bucket string, limit int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if a.rdb == nil || limit <= 0 || window <= 0 {
				next.ServeHTTP(w, r)
				return
			}

			windowSeconds := int64(window / time.Second)
			if windowSeconds < 1 {
				windowSeconds = 1
			}
			key := fmt.Sprintf("ratelimit:%s:%s:%d", bucket, clientIP(r), time.Now().Unix()/windowSeconds)

			ctx, cancel := context.WithTimeout(r.Context(), 250*time.Millisecond)
			defer cancel()

			count, err := a.rdb.Incr(ctx, key).Result()
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			if count == 1 {
				_ = a.rdb.Expire(ctx, key, window).Err()
			}
			if count > int64(limit) {
				w.Header().Set("Retry-After", strconv.FormatInt(windowSeconds, 10))
				writeError(w, http.StatusTooManyRequests, "слишком много запросов, попробуйте позже")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (a *API) firstViewToday(r *http.Request, restaurantID, source string) bool {
	if a.rdb == nil {
		return true
	}
	key := fmt.Sprintf("view:%s:%s:%s:%s", restaurantID, source, clientIP(r), time.Now().UTC().Format("2006-01-02"))
	ctx, cancel := context.WithTimeout(r.Context(), 250*time.Millisecond)
	defer cancel()
	ok, err := a.rdb.SetNX(ctx, key, 1, 26*time.Hour).Result()
	if err != nil {
		return true
	}
	return ok
}

func clientIP(r *http.Request) string {
	for _, header := range []string{"CF-Connecting-IP", "X-Real-IP"} {
		if ip := parseIP(r.Header.Get(header)); ip != "" {
			return ip
		}
	}
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		for _, value := range strings.Split(forwarded, ",") {
			if ip := parseIP(value); ip != "" {
				return ip
			}
		}
	}
	if ip := parseIP(r.RemoteAddr); ip != "" {
		return ip
	}
	return "unknown"
}

func parseIP(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if ip := net.ParseIP(value); ip != nil {
		return ip.String()
	}
	if host, _, err := net.SplitHostPort(value); err == nil {
		if ip := net.ParseIP(host); ip != nil {
			return ip.String()
		}
	}
	return ""
}
