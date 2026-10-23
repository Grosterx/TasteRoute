package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		fail("DATABASE_URL is required")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		fail("open database: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		fail("ping database: %v", err)
	}

	if err := goose.SetDialect("postgres"); err != nil {
		fail("set goose dialect: %v", err)
	}

	command := "up"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	switch command {
	case "up":
		err = goose.Up(db, "migrations")
	case "down":
		err = goose.Down(db, "migrations")
	case "status":
		err = goose.Status(db, "migrations")
	default:
		fail("unknown command %q: use up, down or status", command)
	}
	if err != nil {
		fail("migrate %s: %v", command, err)
	}
	fmt.Printf("migrations %s: ok\n", command)
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
