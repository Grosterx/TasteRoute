package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	roompkg "github.com/Grosterx/tasteroute/internal/room"
	routepkg "github.com/Grosterx/tasteroute/internal/route"
)

func (a *API) route(w http.ResponseWriter, r *http.Request) {
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
		slog.Error("route room", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить комнату")
		return
	}

	built, err := routepkg.BuildForRoom(r.Context(), a.db, found.ID)
	if errors.Is(err, routepkg.ErrNotEnoughMatches) {
		writeError(w, http.StatusConflict, "нужно минимум два совпадения в разных ресторанах")
		return
	}
	if err != nil {
		slog.Error("build route", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось собрать маршрут")
		return
	}
	writeJSON(w, http.StatusOK, built)
}
