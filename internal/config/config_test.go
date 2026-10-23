package config

import "testing"

func setBaseEnv(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgres://localhost/tasteroute")
	t.Setenv("REDIS_URL", "redis://localhost:6379/0")
	t.Setenv("GUEST_JWT_SECRET", "0123456789abcdef")
	t.Setenv("ADMIN_TOKEN", "test-admin-token")
	t.Setenv("APP_PATH_PREFIX", "/tasteroute/api/")
	t.Setenv("CORS_ORIGINS", "http://localhost:5173, http://127.0.0.1:5173/")
}

func TestLoad(t *testing.T) {
	setBaseEnv(t)
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.AppPathPrefix != "/tasteroute/api" {
		t.Fatalf("prefix = %q", cfg.AppPathPrefix)
	}
	if len(cfg.CORSOrigins) != 2 || cfg.CORSOrigins[1] != "http://127.0.0.1:5173" {
		t.Fatalf("origins = %#v", cfg.CORSOrigins)
	}
}

func TestLoadRequiresGuestSecret(t *testing.T) {
	setBaseEnv(t)
	t.Setenv("GUEST_JWT_SECRET", "")
	if _, err := Load(); err == nil {
		t.Fatal("expected an error for missing GUEST_JWT_SECRET")
	}
}

func TestLoadRequiresAdminToken(t *testing.T) {
	setBaseEnv(t)
	t.Setenv("ADMIN_TOKEN", "")
	if _, err := Load(); err == nil {
		t.Fatal("expected an error for missing ADMIN_TOKEN")
	}
}

func TestNormalizePrefix(t *testing.T) {
	cases := map[string]string{
		"":                 "",
		"/":                "",
		"tasteroute/api":   "/tasteroute/api",
		"/tasteroute/api/": "/tasteroute/api",
	}
	for in, want := range cases {
		if got := normalizePrefix(in); got != want {
			t.Fatalf("normalizePrefix(%q) = %q, want %q", in, got, want)
		}
	}
}
