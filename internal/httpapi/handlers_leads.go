package httpapi

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/Grosterx/tasteroute/internal/lead"
	roompkg "github.com/Grosterx/tasteroute/internal/room"
)

func (a *API) createLead(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	var body struct {
		Name    string `json:"name"`
		Phone   string `json:"phone"`
		Comment string `json:"comment"`
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
		slog.Error("lead room", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить комнату")
		return
	}

	err = lead.Create(r.Context(), a.db, found.ID, claims.ParticipantID, body.Name, body.Phone, body.Comment)
	if errors.Is(err, lead.ErrInvalidLead) {
		writeError(w, http.StatusBadRequest, "укажите имя и телефон")
		return
	}
	if err != nil {
		slog.Error("create lead", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось сохранить заявку")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]bool{"ok": true})
}
