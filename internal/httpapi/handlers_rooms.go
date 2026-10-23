package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/Grosterx/tasteroute/internal/auth"
	"github.com/Grosterx/tasteroute/internal/room"
)

func (a *API) createRoom(w http.ResponseWriter, r *http.Request) {
	var body struct {
		City string `json:"city"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}
	created, err := room.Create(r.Context(), a.db, body.City)
	if err != nil {
		slog.Error("create room", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось создать комнату")
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (a *API) getRoom(w http.ResponseWriter, r *http.Request) {
	found, err := room.Get(r.Context(), a.db, chi.URLParam(r, "code"))
	if errors.Is(err, room.ErrNotFound) {
		writeError(w, http.StatusNotFound, "комната не найдена")
		return
	}
	if err != nil {
		slog.Error("get room", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить комнату")
		return
	}
	writeJSON(w, http.StatusOK, found)
}

func (a *API) joinRoom(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}

	code := strings.ToUpper(strings.TrimSpace(chi.URLParam(r, "code")))
	participant, err := room.Join(r.Context(), a.db, code, body.Name)
	switch {
	case errors.Is(err, room.ErrNotFound):
		writeError(w, http.StatusNotFound, "комната не найдена")
		return
	case errors.Is(err, room.ErrRoomFull):
		writeError(w, http.StatusConflict, "в комнате уже 8 участников")
		return
	case err != nil:
		slog.Error("join room", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось войти в комнату")
		return
	}

	token, err := auth.Issue(a.cfg.GuestJWTSecret, participant.ID, code)
	if err != nil {
		slog.Error("issue token", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось выдать токен")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{
		"participant_id": participant.ID,
		"token":          token,
		"name":           participant.DisplayName,
	})
	a.broadcastParticipants(r, code)
}

func (a *API) broadcastParticipants(r *http.Request, code string) {
	found, err := room.Get(r.Context(), a.db, code)
	if err != nil {
		slog.Warn("participants broadcast: room lookup failed", "error", err)
		return
	}
	payload, err := json.Marshal(map[string]any{
		"type":  "participants",
		"count": found.ParticipantsCount,
	})
	if err != nil {
		return
	}
	a.hub.Broadcast(code, payload)
}
