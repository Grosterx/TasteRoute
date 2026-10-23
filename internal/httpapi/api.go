package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"

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
	r.Use(corsMiddleware(cfg.CORSOrigins))

	mount := func(r chi.Router) {
		r.Get("/healthz", api.health)
		r.Post("/rooms", api.createRoom)
		r.Get("/rooms/{code}", api.getRoom)
		r.Post("/rooms/{code}/join", api.joinRoom)
		r.Get("/ws", wsHandler.ServeHTTP)

		r.Group(func(r chi.Router) {
			r.Use(api.auth)
			r.Get("/rooms/{code}/catalog", api.catalog)
			r.Get("/rooms/{code}/route", api.route)
			r.Post("/leads", api.createLead)
		})

		r.Group(func(r chi.Router) {
			r.Use(api.adminAuth)
			r.Get("/admin/leads", api.adminLeads)
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
