package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/Grosterx/tasteroute/internal/booking"
	restaurantpkg "github.com/Grosterx/tasteroute/internal/restaurant"
	roompkg "github.com/Grosterx/tasteroute/internal/room"
	"github.com/Grosterx/tasteroute/internal/selection"
)

type summaryRestaurant struct {
	ID          string           `json:"id"`
	Slug        string           `json:"slug"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Address     string           `json:"address"`
	City        string           `json:"city"`
	Cuisine     string           `json:"cuisine"`
	Phone       string           `json:"phone"`
	Hours       string           `json:"hours"`
	ImageURL    string           `json:"image_url"`
	CoverURL    string           `json:"cover_url"`
	Lat         float64          `json:"lat"`
	Lon         float64          `json:"lon"`
	Matches     int              `json:"matches"`
	Dishes      []selection.Dish `json:"dishes"`
}

type roomSummaryResponse struct {
	Room        roompkg.Room        `json:"room"`
	Restaurants []summaryRestaurant `json:"restaurants"`
	Booking     *booking.Booking    `json:"booking"`
}

func (a *API) roomSummary(w http.ResponseWriter, r *http.Request) {
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
		slog.Error("summary room", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить комнату")
		return
	}

	restaurants, err := a.summaryRestaurants(r, found)
	if err != nil {
		slog.Error("summary restaurants", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить рестораны")
		return
	}

	var existing *booking.Booking
	b, err := booking.LatestForRoom(r.Context(), a.db, found.ID)
	switch {
	case errors.Is(err, booking.ErrNotFound):
	case err != nil:
		slog.Error("summary booking", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить бронь")
		return
	default:
		if b.ParticipantID != claims.ParticipantID {
			b.Phone = booking.MaskPhone(b.Phone)
		}
		existing = &b
	}

	writeJSON(w, http.StatusOK, roomSummaryResponse{
		Room:        found,
		Restaurants: restaurants,
		Booking:     existing,
	})
}

func (a *API) summaryRestaurants(r *http.Request, found roompkg.Room) ([]summaryRestaurant, error) {
	matched, err := selection.MatchedDishesByRestaurant(r.Context(), a.db, found.ID)
	if err != nil {
		return nil, err
	}

	var venues []restaurantpkg.Restaurant
	if found.Mode == "restaurant" && found.RestaurantID != "" {
		venue, err := restaurantpkg.GetByID(r.Context(), a.db, found.RestaurantID)
		if err != nil {
			return nil, err
		}
		venues = []restaurantpkg.Restaurant{venue}
	} else {
		venues, err = restaurantpkg.ListPublic(r.Context(), a.db, found.City)
		if err != nil {
			return nil, err
		}
	}

	out := make([]summaryRestaurant, 0, len(venues))
	for _, venue := range venues {
		dishes := matched[venue.ID]
		if dishes == nil {
			dishes = []selection.Dish{}
		}
		out = append(out, summaryRestaurant{
			ID:          venue.ID,
			Slug:        venue.Slug,
			Name:        venue.Name,
			Description: venue.Description,
			Address:     venue.Address,
			City:        venue.City,
			Cuisine:     venue.Cuisine,
			Phone:       venue.Phone,
			Hours:       venue.Hours,
			ImageURL:    venue.ImageURL,
			CoverURL:    venue.CoverURL,
			Lat:         venue.Lat,
			Lon:         venue.Lon,
			Matches:     len(dishes),
			Dishes:      dishes,
		})
	}
	return out, nil
}

func (a *API) roomBookings(w http.ResponseWriter, r *http.Request) {
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
		slog.Error("room bookings", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить комнату")
		return
	}

	items, err := booking.ListByRoom(r.Context(), a.db, found.ID)
	if err != nil {
		slog.Error("list room bookings", "error", err)
		writeError(w, http.StatusInternalServerError, "не удалось загрузить брони")
		return
	}
	for i := range items {
		if items[i].ParticipantID != claims.ParticipantID {
			items[i].Phone = booking.MaskPhone(items[i].Phone)
		}
	}
	writeJSON(w, http.StatusOK, items)
}
