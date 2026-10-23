package config

import (
	"errors"
	"os"
	"strings"
)

const defaultPathPrefix = "/tasteroute/api"

type Config struct {
	AppEnv         string
	Port           string
	AppPathPrefix  string
	DatabaseURL    string
	RedisURL       string
	GuestJWTSecret string
	AdminToken     string
	CORSOrigins    []string
}

func Load() (Config, error) {
	cfg := Config{
		AppEnv:         envOr("APP_ENV", "development"),
		Port:           envOr("PORT", "8080"),
		AppPathPrefix:  normalizePrefix(envOr("APP_PATH_PREFIX", defaultPathPrefix)),
		DatabaseURL:    strings.TrimSpace(os.Getenv("DATABASE_URL")),
		RedisURL:       envOr("REDIS_URL", "redis://localhost:6379/0"),
		GuestJWTSecret: strings.TrimSpace(os.Getenv("GUEST_JWT_SECRET")),
		AdminToken:     strings.TrimSpace(os.Getenv("ADMIN_TOKEN")),
		CORSOrigins:    parseOrigins(envOr("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	if cfg.RedisURL == "" {
		return Config{}, errors.New("REDIS_URL is required")
	}
	if len(cfg.GuestJWTSecret) < 16 {
		return Config{}, errors.New("GUEST_JWT_SECRET is required and must be at least 16 characters")
	}
	if len(cfg.AdminToken) < 8 {
		return Config{}, errors.New("ADMIN_TOKEN is required and must be at least 8 characters")
	}

	return cfg, nil
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func normalizePrefix(v string) string {
	v = strings.TrimSpace(v)
	if v == "" || v == "/" {
		return ""
	}
	if !strings.HasPrefix(v, "/") {
		v = "/" + v
	}
	return strings.TrimRight(v, "/")
}

func parseOrigins(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, strings.TrimRight(p, "/"))
		}
	}
	return out
}
