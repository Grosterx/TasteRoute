package httpapi

import (
	"context"
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/Grosterx/tasteroute/internal/auth"
)

type claimsContextKey struct{}

func (a *API) auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := bearerToken(r)
		if raw == "" {
			writeError(w, http.StatusUnauthorized, "требуется авторизация")
			return
		}
		claims, err := auth.Parse(a.cfg.GuestJWTSecret, raw)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "недействительный токен")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), claimsContextKey{}, claims)))
	})
}

func (a *API) adminAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got := strings.TrimSpace(r.Header.Get("X-Admin-Token"))
		if subtle.ConstantTimeCompare([]byte(got), []byte(a.cfg.AdminToken)) != 1 {
			writeError(w, http.StatusUnauthorized, "недействительный админ-токен")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func claimsFrom(r *http.Request) (*auth.Claims, bool) {
	claims, ok := r.Context().Value(claimsContextKey{}).(*auth.Claims)
	return claims, ok
}

func bearerToken(r *http.Request) string {
	h := strings.TrimSpace(r.Header.Get("Authorization"))
	if len(h) > 7 && strings.EqualFold(h[:7], "Bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return ""
}
