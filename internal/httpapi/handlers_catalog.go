package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/Grosterx/tasteroute/internal/catalog"
	"github.com/Grosterx/tasteroute/internal/room"
)

func (a *API) catalog(w http.ResponseWriter, r *http.Request) {
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
	found, err := room.Get(r.Context(), a.db, code)
	if errors.Is(err, room.ErrNotFound) {
		writeError(w, http.StatusNotFound, "комната не найдена")
		return
	}
	if err != nil {
		slog.Error("catalog room", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить комнату")
		return
	}
	dishes, err := catalog.List(r.Context(), a.db, found.ID)
	if err != nil {
		slog.Error("catalog list", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить каталог")
		return
	}
	writeJSON(w, http.StatusOK, dishes)
}
