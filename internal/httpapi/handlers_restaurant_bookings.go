package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/Grosterx/tasteroute/internal/booking"
)

func (a *API) restaurantBookings(w http.ResponseWriter, r *http.Request) {
	claims, ok := restaurantClaimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	items, err := booking.ListByRestaurant(r.Context(), a.db, claims.RestaurantID, status, 100)
	if errors.Is(err, booking.ErrInvalid) {
		writeError(w, http.StatusBadRequest, "некорректный статус")
		return
	}
	if err != nil {
		slog.Error("list restaurant bookings", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить брони")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) updateRestaurantBooking(w http.ResponseWriter, r *http.Request) {
	claims, ok := restaurantClaimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}
	updated, err := booking.UpdateStatus(r.Context(), a.db, claims.RestaurantID,
		chi.URLParam(r, "bookingID"), body.Status)
	switch {
	case errors.Is(err, booking.ErrInvalid):
		writeError(w, http.StatusBadRequest, "некорректный статус")
		return
	case errors.Is(err, booking.ErrNotFound):
		writeError(w, http.StatusNotFound, "бронь не найдена")
		return
	case err != nil:
		slog.Error("update restaurant booking", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось обновить бронь")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}
