package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/Grosterx/tasteroute/internal/config"
	"github.com/Grosterx/tasteroute/internal/ws"
)

type API struct {
	cfg config.Config
	db  *pgxpool.Pool
	rdb *redis.Client
	hub *ws.Hub
}

func New(cfg config.Config, db *pgxpool.Pool, rdb *redis.Client, hub *ws.Hub) http.Handler {
	api := &API{cfg: cfg, db: db, rdb: rdb, hub: hub}
	wsHandler := ws.NewHandler(cfg.GuestJWTSecret, db, rdb, hub, cfg.CORSOrigins)

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(securityHeaders(cfg.AppEnv))
	r.Use(corsMiddleware(cfg.CORSOrigins))

	mount := func(r chi.Router) {
		r.Get("/healthz", api.health)
		r.Get("/public/config", api.publicConfig)

		r.Get("/public/restaurants", api.publicRestaurants)
		r.Get("/public/cities", api.publicCities)
		r.Get("/public/restaurants/{slug}", api.publicRestaurant)
		r.With(api.rateLimit("view", 60, time.Minute)).Post("/public/restaurants/{slug}/view", api.trackRestaurantView)
		r.With(api.rateLimit("sales-lead", 5, 10*time.Minute)).Post("/sales-leads", api.createSalesLead)
		r.With(api.rateLimit("restaurant-login", 10, time.Minute)).Post("/restaurant/login", api.restaurantLogin)

		r.With(api.rateLimit("rooms-create", 30, time.Minute)).Post("/rooms", api.createRoom)
		r.Get("/rooms/{code}", api.getRoom)
		r.With(api.rateLimit("rooms-join", 30, time.Minute)).Post("/rooms/{code}/join", api.joinRoom)
		r.Get("/ws", wsHandler.ServeHTTP)

		r.Group(func(r chi.Router) {
			r.Use(api.auth)
			r.Get("/rooms/{code}/catalog", api.catalog)
			r.Get("/rooms/{code}/route", api.route)
			r.Get("/rooms/{code}/selection", api.selection)
			r.With(api.rateLimit("booking", 20, 10*time.Minute)).Post("/bookings", api.createBooking)
			r.With(api.rateLimit("lead", 10, 10*time.Minute)).Post("/leads", api.createLead)
		})

		r.Group(func(r chi.Router) {
			r.Use(api.restaurantAuth)
			r.Get("/restaurant/me", api.restaurantMe)
			r.Patch("/restaurant/me", api.updateRestaurantProfile)
			r.Post("/restaurant/change-password", api.changeRestaurantPassword)
			r.Get("/restaurant/dishes", api.restaurantDishes)
			r.Post("/restaurant/dishes", api.createRestaurantDish)
			r.Patch("/restaurant/dishes/{dishID}", api.updateRestaurantDish)
			r.Delete("/restaurant/dishes/{dishID}", api.archiveRestaurantDish)
			r.Get("/restaurant/bookings", api.restaurantBookings)
			r.Patch("/restaurant/bookings/{bookingID}", api.updateRestaurantBooking)
			r.Get("/restaurant/analytics", api.restaurantAnalytics)
		})

		r.Group(func(r chi.Router) {
			r.Use(api.rateLimit("admin", 180, time.Minute))
			r.Use(api.adminAuth)
			r.Get("/admin/leads", api.adminLeads)
			r.Get("/admin/restaurants", api.adminRestaurants)
			r.Post("/admin/restaurants", api.adminCreateRestaurant)
			r.Patch("/admin/restaurants/{restaurantID}", api.adminUpdateRestaurant)
			r.Post("/admin/restaurants/{restaurantID}/account", api.adminSetRestaurantAccount)
			r.Get("/admin/sales-leads", api.adminSalesLeads)
			r.Patch("/admin/sales-leads/{leadID}", api.adminUpdateSalesLead)
			r.Get("/admin/bookings", api.adminBookings)
			r.Get("/admin/metrics", api.adminMetrics)
		})
	}

	if cfg.AppPathPrefix == "" {
		mount(r)
	} else {
		r.Route(cfg.AppPathPrefix, mount)
	}
	return r
}

func (a *API) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		slog.Error("write json", "error", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func decodeJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	if err := dec.Decode(dst); err != nil {
		if errors.Is(err, io.EOF) {
			return nil
		}
		return err
	}
	return nil
}
