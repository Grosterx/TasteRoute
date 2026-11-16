package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/Grosterx/tasteroute/internal/booking"
	restaurantpkg "github.com/Grosterx/tasteroute/internal/restaurant"
	roompkg "github.com/Grosterx/tasteroute/internal/room"
)

func (a *API) createBooking(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	var body struct {
		RestaurantID string   `json:"restaurant_id"`
		DishIDs      []string `json:"dish_ids"`
		Name         string   `json:"name"`
		Phone        string   `json:"phone"`
		PartySize    int      `json:"party_size"`
		RequestedAt  string   `json:"requested_at"`
		Comment      string   `json:"comment"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}

	found, err := roompkg.Get(r.Context(), a.db, claims.RoomCode)
	if errors.Is(err, roompkg.ErrNotFound) {
		writeError(w, http.StatusNotFound, "комната не найдена")
		return
	}
	if err != nil {
		slog.Error("booking room", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить комнату")
		return
	}

	restaurantID, ok := a.resolveBookingRestaurant(w, r, found, strings.TrimSpace(body.RestaurantID))
	if !ok {
		return
	}

	requestedAt, err := parseRequestedAt(body.RequestedAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "некорректная дата и время")
		return
	}
	partySize := body.PartySize
	if partySize == 0 {
		partySize = found.ParticipantsCount
	}
	if partySize < 1 {
		partySize = 1
	}

	created, err := booking.Create(r.Context(), a.db, found.ID, claims.ParticipantID,
		restaurantID, found.Source, booking.CreateInput{
			Name:        body.Name,
			Phone:       body.Phone,
			PartySize:   partySize,
			RequestedAt: requestedAt,
			Comment:     body.Comment,
			DishIDs:     body.DishIDs,
		})
	switch {
	case errors.Is(err, booking.ErrInvalid):
		writeError(w, http.StatusBadRequest, "проверьте имя, телефон, блюда и количество гостей")
		return
	case errors.Is(err, booking.ErrOwnedByOther):
		writeError(w, http.StatusConflict, "бронь уже создана другим участником комнаты")
		return
	case errors.Is(err, booking.ErrLocked):
		writeError(w, http.StatusConflict, "сначала отмените текущую бронь, потом выбирайте другой ресторан")
		return
	case errors.Is(err, booking.ErrActiveChain):
		writeError(w, http.StatusConflict, "вечер уже забронирован по маршруту: отмените его, чтобы забронировать одно место")
		return
	case err != nil:
		slog.Error("create booking", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось создать бронь")
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (a *API) resolveBookingRestaurant(w http.ResponseWriter, r *http.Request, found roompkg.Room, requested string) (string, bool) {
	if found.Mode == "restaurant" {
		if found.RestaurantID == "" {
			writeError(w, http.StatusConflict, "ресторан комнаты не найден")
			return "", false
		}
		if requested != "" && requested != found.RestaurantID {
			writeError(w, http.StatusConflict, "в комнате ресторана доступен только его ресторан")
			return "", false
		}
		return found.RestaurantID, true
	}

	if requested == "" {
		writeError(w, http.StatusBadRequest, "выберите ресторан для брони")
		return "", false
	}
	rest, err := restaurantpkg.GetByID(r.Context(), a.db, requested)
	if errors.Is(err, restaurantpkg.ErrNotFound) {
		writeError(w, http.StatusNotFound, "ресторан не найден")
		return "", false
	}
	if err != nil {
		slog.Error("booking restaurant", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить ресторан")
		return "", false
	}
	if !rest.Active {
		writeError(w, http.StatusConflict, "ресторан временно не принимает брони")
		return "", false
	}
	if !strings.EqualFold(strings.TrimSpace(rest.City), strings.TrimSpace(found.City)) {
		writeError(w, http.StatusConflict, "ресторан находится в другом городе")
		return "", false
	}
	return rest.ID, true
}

func (a *API) cancelBooking(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	found, err := roompkg.Get(r.Context(), a.db, claims.RoomCode)
	if errors.Is(err, roompkg.ErrNotFound) {
		writeError(w, http.StatusNotFound, "комната не найдена")
		return
	}
	if err != nil {
		slog.Error("cancel booking room", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить комнату")
		return
	}

	updated, err := booking.Cancel(r.Context(), a.db, found.ID, claims.ParticipantID,
		chi.URLParam(r, "bookingID"))
	switch {
	case errors.Is(err, booking.ErrNotFound):
		writeError(w, http.StatusNotFound, "бронь не найдена")
		return
	case errors.Is(err, booking.ErrOwnedByOther):
		writeError(w, http.StatusConflict, "отменить бронь может только её автор")
		return
	case errors.Is(err, booking.ErrInvalid):
		writeError(w, http.StatusConflict, "эту бронь уже нельзя отменить")
		return
	case err != nil:
		slog.Error("cancel booking", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось отменить бронь")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func parseRequestedAt(raw string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02T15:04", "2006-01-02T15:04:05"} {
		parsed, err := time.Parse(layout, raw)
		if err == nil {
			return &parsed, nil
		}
	}
	return nil, errors.New("invalid requested_at")
}
