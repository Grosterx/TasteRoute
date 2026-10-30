package httpapi

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/Grosterx/tasteroute/internal/auth"
	restaurantpkg "github.com/Grosterx/tasteroute/internal/restaurant"
)

func (a *API) restaurantLogin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}
	account, rest, err := restaurantpkg.Authenticate(r.Context(), a.db, body.Email, body.Password)
	if errors.Is(err, restaurantpkg.ErrInvalidCredentials) {
		writeError(w, http.StatusUnauthorized, "неверный email или пароль")
		return
	}
	if err != nil {
		slog.Error("restaurant login", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось войти")
		return
	}
	token, err := auth.IssueRestaurant(a.cfg.RestaurantJWTSecret, account.ID, account.RestaurantID, account.Role, account.TokenVersion)
	if err != nil {
		slog.Error("issue restaurant token", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось выдать токен")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"token":      token,
		"account":    account,
		"restaurant": rest,
	})
}

func (a *API) restaurantMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := restaurantClaimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	account, err := restaurantpkg.GetAccountByID(r.Context(), a.db, claims.AccountID)
	if errors.Is(err, restaurantpkg.ErrNotFound) || (err == nil && !account.Active) {
		writeError(w, http.StatusUnauthorized, "аккаунт недоступен")
		return
	}
	if err != nil {
		slog.Error("restaurant me account", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить аккаунт")
		return
	}
	rest, err := restaurantpkg.GetByID(r.Context(), a.db, claims.RestaurantID)
	if errors.Is(err, restaurantpkg.ErrNotFound) {
		writeError(w, http.StatusUnauthorized, "ресторан недоступен")
		return
	}
	if err != nil {
		slog.Error("restaurant me", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить ресторан")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"account": account, "restaurant": rest})
}

func (a *API) updateRestaurantProfile(w http.ResponseWriter, r *http.Request) {
	claims, ok := restaurantClaimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	var body restaurantpkg.ProfileInput
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}
	updated, err := restaurantpkg.UpdateProfile(r.Context(), a.db, claims.RestaurantID, body)
	if errors.Is(err, restaurantpkg.ErrInvalid) {
		writeError(w, http.StatusBadRequest, "укажите название ресторана")
		return
	}
	if errors.Is(err, restaurantpkg.ErrNotFound) {
		writeError(w, http.StatusNotFound, "ресторан не найден")
		return
	}
	if err != nil {
		slog.Error("update restaurant profile", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось сохранить профиль")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (a *API) changeRestaurantPassword(w http.ResponseWriter, r *http.Request) {
	claims, ok := restaurantClaimsFrom(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "требуется авторизация")
		return
	}
	var body struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "некорректный запрос")
		return
	}
	err := restaurantpkg.ChangePassword(r.Context(), a.db, claims.AccountID, body.CurrentPassword, body.NewPassword)
	switch {
	case errors.Is(err, restaurantpkg.ErrWeakPassword):
		writeError(w, http.StatusBadRequest, "новый пароль должен быть не короче 8 символов")
		return
	case errors.Is(err, restaurantpkg.ErrInvalidCredentials):
		writeError(w, http.StatusBadRequest, "неверный текущий пароль")
		return
	case errors.Is(err, restaurantpkg.ErrNotFound):
		writeError(w, http.StatusNotFound, "аккаунт не найден")
		return
	case err != nil:
		slog.Error("change restaurant password", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось изменить пароль")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
