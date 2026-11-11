package httpapi

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	restaurantpkg "github.com/Grosterx/tasteroute/internal/restaurant"
)

func (a *API) restaurantDishes(w http.ResponseWriter, r *http.Request) {
	claims, ok := restaurantClaimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	activeOnly := r.URL.Query().Get("all") != "1"
	dishes, err := restaurantpkg.ListDishes(r.Context(), a.db, claims.RestaurantID, activeOnly)
	if err != nil {
		slog.Error("list restaurant dishes", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить меню")
		return
	}
	writeJSON(w, http.StatusOK, dishes)
}

func (a *API) createRestaurantDish(w http.ResponseWriter, r *http.Request) {
	claims, ok := restaurantClaimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	var body restaurantpkg.DishInput
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}
	created, err := restaurantpkg.CreateDish(r.Context(), a.db, claims.RestaurantID, body)
	if errors.Is(err, restaurantpkg.ErrInvalid) {
		writeError(w, http.StatusBadRequest, "укажите название, корректную цену и загадку для секретного блюда")
		return
	}
	if err != nil {
		slog.Error("create restaurant dish", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось создать блюдо")
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (a *API) updateRestaurantDish(w http.ResponseWriter, r *http.Request) {
	claims, ok := restaurantClaimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	var body restaurantpkg.DishInput
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}
	updated, err := restaurantpkg.UpdateDish(r.Context(), a.db, claims.RestaurantID,
		chi.URLParam(r, "dishID"), body)
	switch {
	case errors.Is(err, restaurantpkg.ErrInvalid):
		writeError(w, http.StatusBadRequest, "укажите название, корректную цену и загадку для секретного блюда")
		return
	case errors.Is(err, restaurantpkg.ErrNotFound):
		writeError(w, http.StatusNotFound, "блюдо не найдено")
		return
	case err != nil:
		slog.Error("update restaurant dish", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось сохранить блюдо")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (a *API) archiveRestaurantDish(w http.ResponseWriter, r *http.Request) {
	claims, ok := restaurantClaimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	err := restaurantpkg.ArchiveDish(r.Context(), a.db, claims.RestaurantID, chi.URLParam(r, "dishID"))
	if errors.Is(err, restaurantpkg.ErrNotFound) {
		writeError(w, http.StatusNotFound, "блюдо не найдено")
		return
	}
	if err != nil {
		slog.Error("archive restaurant dish", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось удалить блюдо")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
