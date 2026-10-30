package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/Grosterx/tasteroute/internal/booking"
	roompkg "github.com/Grosterx/tasteroute/internal/room"
)

func (a *API) createBooking(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	var body struct {
		Name        string `json:"name"`
		Phone       string `json:"phone"`
		PartySize   int    `json:"party_size"`
		RequestedAt string `json:"requested_at"`
		Comment     string `json:"comment"`
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
	if found.Mode != "restaurant" || found.RestaurantID == "" {
		writeError(w, http.StatusConflict, "бронирование доступно только в комнате ресторана")
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
		found.RestaurantID, found.Source, booking.CreateInput{
			Name:        body.Name,
			Phone:       body.Phone,
			PartySize:   partySize,
			RequestedAt: requestedAt,
			Comment:     body.Comment,
		})
	if errors.Is(err, booking.ErrInvalid) {
		writeError(w, http.StatusBadRequest, "проверьте имя, телефон и количество гостей")
		return
	}
	if errors.Is(err, booking.ErrOwnedByOther) {
		writeError(w, http.StatusConflict, "бронь уже создана другим участником комнаты")
		return
	}
	if err != nil {
		slog.Error("create booking", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось создать бронь")
		return
	}
	writeJSON(w, http.StatusCreated, created)
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
