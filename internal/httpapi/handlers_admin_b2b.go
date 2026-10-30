package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/Grosterx/tasteroute/internal/analytics"
	"github.com/Grosterx/tasteroute/internal/booking"
	restaurantpkg "github.com/Grosterx/tasteroute/internal/restaurant"
	"github.com/Grosterx/tasteroute/internal/sales"
)

type adminRestaurant struct {
	restaurantpkg.Restaurant
	Accounts []restaurantpkg.Account `json:"accounts"`
}

func (a *API) adminRestaurants(w http.ResponseWriter, r *http.Request) {
	list, err := restaurantpkg.ListAdmin(r.Context(), a.db)
	if err != nil {
		slog.Error("admin restaurants", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить рестораны")
		return
	}
	out := make([]adminRestaurant, 0, len(list))
	for _, item := range list {
		accounts, err := restaurantpkg.ListAccounts(r.Context(), a.db, item.ID)
		if err != nil {
			slog.Error("admin restaurant accounts", "error", err)
			writeError(w, http.StatusInternalServerError, "не удалось загрузить аккаунты")
			return
		}
		if accounts == nil {
			accounts = []restaurantpkg.Account{}
		}
		out = append(out, adminRestaurant{Restaurant: item, Accounts: accounts})
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *API) adminCreateRestaurant(w http.ResponseWriter, r *http.Request) {
	var body restaurantpkg.CreateInput
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}
	body.Active = true
	created, err := restaurantpkg.Create(r.Context(), a.db, body)
	if errors.Is(err, restaurantpkg.ErrInvalid) {
		writeError(w, http.StatusBadRequest, "проверьте название, slug и тариф")
		return
	}
	if err != nil {
		slog.Error("admin create restaurant", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось создать ресторан")
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (a *API) adminUpdateRestaurant(w http.ResponseWriter, r *http.Request) {
	var body restaurantpkg.AdminUpdate
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}
	updated, err := restaurantpkg.UpdateAdmin(r.Context(), a.db, chi.URLParam(r, "restaurantID"), body)
	switch {
	case errors.Is(err, restaurantpkg.ErrInvalid):
		writeError(w, http.StatusBadRequest, "проверьте slug и тариф")
		return
	case errors.Is(err, restaurantpkg.ErrNotFound):
		writeError(w, http.StatusNotFound, "ресторан не найден")
		return
	case err != nil:
		slog.Error("admin update restaurant", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось сохранить ресторан")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (a *API) adminSetRestaurantAccount(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}
	account, err := restaurantpkg.CreateOrUpdateAccount(r.Context(), a.db,
		chi.URLParam(r, "restaurantID"), body.Email, body.Password)
	switch {
	case errors.Is(err, restaurantpkg.ErrInvalid):
		writeError(w, http.StatusBadRequest, "некорректный email")
		return
	case errors.Is(err, restaurantpkg.ErrWeakPassword):
		writeError(w, http.StatusBadRequest, "пароль должен быть не короче 8 символов")
		return
	case errors.Is(err, restaurantpkg.ErrEmailTaken):
		writeError(w, http.StatusConflict, "этот email уже занят другим рестораном")
		return
	case err != nil:
		slog.Error("admin set restaurant account", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось сохранить аккаунт")
		return
	}
	writeJSON(w, http.StatusOK, account)
}

func (a *API) adminSalesLeads(w http.ResponseWriter, r *http.Request) {
	list, err := sales.List(r.Context(), a.db)
	if err != nil {
		slog.Error("admin sales leads", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить заявки")
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) adminUpdateSalesLead(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Status string `json:"status"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}
	updated, err := sales.UpdateStatus(r.Context(), a.db, chi.URLParam(r, "leadID"), body.Status)
	switch {
	case errors.Is(err, sales.ErrInvalid):
		writeError(w, http.StatusBadRequest, "некорректный статус")
		return
	case errors.Is(err, sales.ErrNotFound):
		writeError(w, http.StatusNotFound, "заявка не найдена")
		return
	case err != nil:
		slog.Error("admin update sales lead", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось обновить заявку")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (a *API) adminBookings(w http.ResponseWriter, r *http.Request) {
	restaurantID := strings.TrimSpace(r.URL.Query().Get("restaurant_id"))
	var (
		items []booking.Booking
		err   error
	)
	if restaurantID == "" {
		items, err = booking.ListAll(r.Context(), a.db, 200)
	} else {
		items, err = booking.ListByRestaurant(r.Context(), a.db, restaurantID, "", 200)
	}
	if err != nil {
		slog.Error("admin bookings", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить брони")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) adminMetrics(w http.ResponseWriter, r *http.Request) {
	stats, err := analytics.PlatformStats(r.Context(), a.db)
	if err != nil {
		slog.Error("admin metrics", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить метрики")
		return
	}
	writeJSON(w, http.StatusOK, stats)
}
