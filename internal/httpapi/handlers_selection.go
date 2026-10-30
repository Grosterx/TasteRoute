package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/Grosterx/tasteroute/internal/booking"
	restaurantpkg "github.com/Grosterx/tasteroute/internal/restaurant"
	roompkg "github.com/Grosterx/tasteroute/internal/room"
	"github.com/Grosterx/tasteroute/internal/selection"
)

type selectionResponse struct {
	Room       roompkg.Room             `json:"room"`
	Restaurant restaurantpkg.Restaurant `json:"restaurant"`
	Dishes     []selection.Dish         `json:"dishes"`
	Booking    *booking.Booking         `json:"booking"`
}

func (a *API) selection(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	code := strings.ToUpper(strings.TrimSpace(chi.URLParam(r, "code")))
	if claims.RoomCode != code {
		writeError(w, http.StatusForbidden, "токен выдан для другой комнаты")
		return
	}
	found, err := roompkg.Get(r.Context(), a.db, code)
	if errors.Is(err, roompkg.ErrNotFound) {
		writeError(w, http.StatusNotFound, "комната не найдена")
		return
	}
	if err != nil {
		slog.Error("selection room", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить комнату")
		return
	}
	if found.Mode != "restaurant" || found.RestaurantID == "" {
		writeError(w, http.StatusConflict, "это городская комната")
		return
	}

	rest, err := restaurantpkg.GetByID(r.Context(), a.db, found.RestaurantID)
	if errors.Is(err, restaurantpkg.ErrNotFound) {
		writeError(w, http.StatusNotFound, "ресторан не найден")
		return
	}
	if err != nil {
		slog.Error("selection restaurant", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить ресторан")
		return
	}

	dishes, err := selection.MatchedDishes(r.Context(), a.db, found.ID, found.RestaurantID)
	if err != nil {
		slog.Error("selection dishes", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить выбор")
		return
	}

	var existing *booking.Booking
	b, err := booking.GetForRoom(r.Context(), a.db, found.ID, found.RestaurantID)
	switch {
	case errors.Is(err, booking.ErrNotFound):
	case err != nil:
		slog.Error("selection booking", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить бронь")
		return
	default:
		existing = &b
	}

	writeJSON(w, http.StatusOK, selectionResponse{
		Room:       found,
		Restaurant: rest,
		Dishes:     dishes,
		Booking:    existing,
	})
}
