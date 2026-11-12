package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/Grosterx/tasteroute/internal/restaurant"
	"github.com/Grosterx/tasteroute/internal/sales"
)

func (a *API) publicConfig(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"public_app_url": a.cfg.PublicAppURL})
}

func (a *API) publicRestaurants(w http.ResponseWriter, r *http.Request) {
	city := strings.TrimSpace(r.URL.Query().Get("city"))
	list, err := restaurant.ListPublic(r.Context(), a.db, city)
	if err != nil {
		slog.Error("public restaurants", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить рестораны")
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) publicCities(w http.ResponseWriter, r *http.Request) {
	cities, err := restaurant.ListCities(r.Context(), a.db)
	if err != nil {
		slog.Error("public cities", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить города")
		return
	}
	writeJSON(w, http.StatusOK, cities)
}

func (a *API) publicRestaurant(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	found, err := restaurant.GetPublic(r.Context(), a.db, slug)
	if errors.Is(err, restaurant.ErrNotFound) {
		writeError(w, http.StatusNotFound, "ресторан не найден")
		return
	}
	if err != nil {
		slog.Error("public restaurant", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить ресторан")
		return
	}
	writeJSON(w, http.StatusOK, found)
}

func (a *API) trackRestaurantView(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	found, err := restaurant.GetBySlug(r.Context(), a.db, slug)
	if errors.Is(err, restaurant.ErrNotFound) {
		writeError(w, http.StatusNotFound, "ресторан не найден")
		return
	}
	if err != nil {
		slog.Error("track restaurant view lookup", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось сохранить просмотр")
		return
	}

	var body struct {
		Source string `json:"source"`
	}
	_ = decodeJSON(r, &body)
	source := strings.TrimSpace(body.Source)
	if source == "" {
		source = strings.TrimSpace(r.URL.Query().Get("src"))
	}
	if source == "" {
		source = "direct"
	}
	if len([]rune(source)) > 40 {
		source = string([]rune(source)[:40])
	}
	if !a.firstViewToday(r, found.ID, source) {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	if err := restaurant.TrackView(r.Context(), a.db, found.ID, source); err != nil {
		slog.Error("track restaurant view", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось сохранить просмотр")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]bool{"ok": true})
}

func (a *API) createSalesLead(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RestaurantName string `json:"restaurant_name"`
		ContactName    string `json:"contact_name"`
		Phone          string `json:"phone"`
		Email          string `json:"email"`
		City           string `json:"city"`
		Message        string `json:"message"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}
	created, err := sales.Create(r.Context(), a.db, sales.CreateInput{
		RestaurantName: body.RestaurantName,
		ContactName:    body.ContactName,
		Phone:          body.Phone,
		Email:          body.Email,
		City:           body.City,
		Message:        body.Message,
	})
	if errors.Is(err, sales.ErrInvalid) {
		writeError(w, http.StatusBadRequest, "укажите название ресторана, имя и телефон")
		return
	}
	if err != nil {
		slog.Error("create sales lead", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось отправить заявку")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true, "id": created.ID})
}
