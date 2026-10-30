package httpapi

import (
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/Grosterx/tasteroute/internal/analytics"
)

func (a *API) restaurantAnalytics(w http.ResponseWriter, r *http.Request) {
	claims, ok := restaurantClaimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}

	now := time.Now().UTC()
	from := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, -29)
	to := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, 1)

	if raw := strings.TrimSpace(r.URL.Query().Get("from")); raw != "" {
		parsed, err := time.Parse("2006-01-02", raw)
		if err != nil {
			writeError(w, http.StatusBadRequest, "некорректная дата начала")
			return
		}
		from = parsed
	}
	if raw := strings.TrimSpace(r.URL.Query().Get("to")); raw != "" {
		parsed, err := time.Parse("2006-01-02", raw)
		if err != nil {
			writeError(w, http.StatusBadRequest, "некорректная дата окончания")
			return
		}
		to = parsed.AddDate(0, 0, 1)
	}
	if !to.After(from) || to.Sub(from) > 366*24*time.Hour {
		writeError(w, http.StatusBadRequest, "некорректный период")
		return
	}

	stats, err := analytics.ForRestaurant(r.Context(), a.db, claims.RestaurantID, from, to)
	if err != nil {
		slog.Error("restaurant analytics", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить аналитику")
		return
	}
	writeJSON(w, http.StatusOK, stats)
}
