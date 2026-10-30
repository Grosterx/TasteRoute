package httpapi

import (
	"context"
	"crypto/subtle"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/Grosterx/tasteroute/internal/auth"
	restaurantpkg "github.com/Grosterx/tasteroute/internal/restaurant"
)

type claimsContextKey struct{}
type restaurantClaimsContextKey struct{}

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

func (a *API) restaurantAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := bearerToken(r)
		if raw == "" {
			writeError(w, http.StatusUnauthorized, "требуется авторизация ресторана")
			return
		}
		claims, err := auth.ParseRestaurant(a.cfg.RestaurantJWTSecret, raw)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "недействительный токен ресторана")
			return
		}

		account, err := restaurantpkg.GetAccountByID(r.Context(), a.db, claims.AccountID)
		switch {
		case errors.Is(err, restaurantpkg.ErrNotFound):
			writeError(w, http.StatusUnauthorized, "сессия ресторана недействительна")
			return
		case err != nil:
			slog.Error("restaurant auth account", "error", err)
			writeError(w, http.StatusInternalServerError, "не удалось проверить сессию")
			return
		case !account.Active || account.RestaurantID != claims.RestaurantID ||
			account.TokenVersion != claims.TokenVersion:
			writeError(w, http.StatusUnauthorized, "сессия ресторана недействительна, войдите снова")
			return
		}

		rest, err := restaurantpkg.GetByID(r.Context(), a.db, claims.RestaurantID)
		switch {
		case errors.Is(err, restaurantpkg.ErrNotFound):
			writeError(w, http.StatusUnauthorized, "ресторан недоступен")
			return
		case err != nil:
			slog.Error("restaurant auth restaurant", "error", err)
			writeError(w, http.StatusInternalServerError, "не удалось проверить ресторан")
			return
		case !rest.Active:
			writeError(w, http.StatusUnauthorized, "ресторан приостановлен")
			return
		}

		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), restaurantClaimsContextKey{}, claims)))
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

func restaurantClaimsFrom(r *http.Request) (*auth.RestaurantClaims, bool) {
	claims, ok := r.Context().Value(restaurantClaimsContextKey{}).(*auth.RestaurantClaims)
	return claims, ok
}

func bearerToken(r *http.Request) string {
	h := strings.TrimSpace(r.Header.Get("Authorization"))
	if len(h) > 7 && strings.EqualFold(h[:7], "Bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return ""
}
