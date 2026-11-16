package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/Grosterx/tasteroute/internal/booking"
	roompkg "github.com/Grosterx/tasteroute/internal/room"
)

type chainStopBody struct {
	RestaurantID string   `json:"restaurant_id"`
	DishIDs      []string `json:"dish_ids"`
	RequestedAt  string   `json:"requested_at"`
}

// createChainBooking saves one evening: a company books 1-3 stops of its city
// route in a single request. Every stop is confirmed by its restaurant
// independently.
func (a *API) createChainBooking(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	var body struct {
		RouteID   string          `json:"route_id"`
		Name      string          `json:"name"`
		Phone     string          `json:"phone"`
		PartySize int             `json:"party_size"`
		Comment   string          `json:"comment"`
		Stops     []chainStopBody `json:"stops"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}

	found, ok := a.guestRoom(w, r)
	if !ok {
		return
	}
	if found.Mode != "city" {
		writeError(w, http.StatusConflict, "вечерний маршрут доступен только для городской комнаты")
		return
	}

	stops := make([]booking.ChainStopInput, 0, len(body.Stops))
	for _, item := range body.Stops {
		requestedAt, err := parseRequestedAt(item.RequestedAt)
		if err != nil {
			writeError(w, http.StatusBadRequest, "некорректная дата и время")
			return
		}
		stops = append(stops, booking.ChainStopInput{
			RestaurantID: strings.TrimSpace(item.RestaurantID),
			RequestedAt:  requestedAt,
			DishIDs:      item.DishIDs,
		})
	}

	partySize := body.PartySize
	if partySize == 0 {
		partySize = found.ParticipantsCount
	}

	created, err := booking.CreateChain(r.Context(), a.db, found.ID, claims.ParticipantID,
		body.RouteID, found.Source, booking.ChainInput{
			Name:      body.Name,
			Phone:     body.Phone,
			PartySize: partySize,
			Comment:   body.Comment,
			Stops:     stops,
		})
	switch {
	case errors.Is(err, booking.ErrActiveChain), errors.Is(err, booking.ErrLocked):
		writeError(w, http.StatusConflict, "сначала отмените текущую бронь, потом собирайте маршрут")
		return
	case errors.Is(err, booking.ErrOwnedByOther):
		writeError(w, http.StatusConflict, "бронь уже создана другим участником комнаты")
		return
	case errors.Is(err, booking.ErrInvalid):
		writeError(w, http.StatusBadRequest, "проверьте точки маршрута, время, телефон и количество гостей")
		return
	case err != nil:
		slog.Error("create chain booking", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось создать вечерний маршрут")
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

// cancelChainBooking cancels the whole evening, keeping the guest history.
func (a *API) cancelChainBooking(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	found, ok := a.guestRoom(w, r)
	if !ok {
		return
	}

	updated, err := booking.CancelChain(r.Context(), a.db, found.ID, claims.ParticipantID,
		chi.URLParam(r, "chainID"))
	if writeChainError(w, err, "не удалось отменить вечерний маршрут") {
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// cancelChainStop cancels one stop of the evening. The other stops stay active
// and the guest is offered a replacement for this position.
func (a *API) cancelChainStop(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	found, ok := a.guestRoom(w, r)
	if !ok {
		return
	}

	updated, err := booking.CancelChainStop(r.Context(), a.db, found.ID, claims.ParticipantID,
		chi.URLParam(r, "bookingID"))
	if writeChainError(w, err, "не удалось отменить точку маршрута") {
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// addChainStop replaces a declined or cancelled stop with another restaurant
// from the same route position.
func (a *API) addChainStop(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	var body struct {
		chainStopBody
		ReplaceBookingID string `json:"replace_booking_id"`
		StopOrder        int    `json:"stop_order"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}
	found, ok := a.guestRoom(w, r)
	if !ok {
		return
	}

	requestedAt, err := parseRequestedAt(body.RequestedAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, "некорректная дата и время")
		return
	}

	updated, err := booking.AddChainStop(r.Context(), a.db, found.ID, claims.ParticipantID,
		chi.URLParam(r, "chainID"), strings.TrimSpace(body.ReplaceBookingID), body.StopOrder,
		booking.ChainStopInput{
			RestaurantID: strings.TrimSpace(body.RestaurantID),
			RequestedAt:  requestedAt,
			DishIDs:      body.DishIDs,
		})
	if writeChainError(w, err, "не удалось заменить точку маршрута") {
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// guestRoom loads the room of the current guest token. Chain endpoints live
// under /bookings, so the room comes from the JWT rather than the URL.
func (a *API) guestRoom(w http.ResponseWriter, r *http.Request) (roompkg.Room, bool) {
	claims, ok := claimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return roompkg.Room{}, false
	}
	found, err := roompkg.Get(r.Context(), a.db, claims.RoomCode)
	if errors.Is(err, roompkg.ErrNotFound) {
		writeError(w, http.StatusNotFound, "комната не найдена")
		return roompkg.Room{}, false
	}
	if err != nil {
		slog.Error("guest room", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить комнату")
		return roompkg.Room{}, false
	}
	return found, true
}

// writeChainError maps chain service errors to HTTP responses. It returns true
// when the error was written.
func writeChainError(w http.ResponseWriter, err error, fallback string) bool {
	switch {
	case err == nil:
		return false
	case errors.Is(err, booking.ErrNotFound):
		writeError(w, http.StatusNotFound, "вечерний маршрут не найден")
	case errors.Is(err, booking.ErrOwnedByOther):
		writeError(w, http.StatusConflict, "изменить вечерний маршрут может только его автор")
	case errors.Is(err, booking.ErrActiveChain):
		writeError(w, http.StatusConflict, "в комнате уже есть активная бронь")
	case errors.Is(err, booking.ErrLocked):
		writeError(w, http.StatusConflict, "сначала отмените текущую бронь")
	case errors.Is(err, booking.ErrInvalid):
		writeError(w, http.StatusConflict, "эту точку маршрута уже нельзя изменить")
	default:
		slog.Error("chain booking", "error", err)
		writeError(w, http.StatusInternalServerError, fallback)
	}
	return true
}
