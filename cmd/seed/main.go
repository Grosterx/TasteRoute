package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type restaurantSeed struct {
	ID       string  `json:"id"`
	Slug     string  `json:"slug"`
	Name     string  `json:"name"`
	Address  string  `json:"address"`
	Lat      float64 `json:"lat"`
	Lon      float64 `json:"lon"`
	Cuisine  string  `json:"cuisine"`
	ImageURL string  `json:"image_url"`
	Active   bool    `json:"active"`
}

type dishSeed struct {
	ID           string   `json:"id"`
	RestaurantID string   `json:"restaurant_id"`
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Price        int      `json:"price"`
	Tags         []string `json:"tags"`
	ImageURL     string   `json:"image_url"`
	Category     string   `json:"category"`
	SortOrder    int      `json:"sort_order"`
	Active       bool     `json:"active"`
	Blind        bool     `json:"blind"`
	BlindRiddle  string   `json:"blind_riddle"`
}

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		fail("DATABASE_URL is required")
	}
	seedsDir := os.Getenv("SEEDS_DIR")
	if seedsDir == "" {
		seedsDir = "seeds"
	}

	var restaurants []restaurantSeed
	if err := readJSON(filepath.Join(seedsDir, "restaurants.json"), &restaurants); err != nil {
		fail("read restaurants: %v", err)
	}
	var dishes []dishSeed
	if err := readJSON(filepath.Join(seedsDir, "dishes.json"), &dishes); err != nil {
		fail("read dishes: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	db, err := pgxpool.New(ctx, dsn)
	if err != nil {
		fail("connect database: %v", err)
	}
	defer db.Close()
	if err := db.Ping(ctx); err != nil {
		fail("ping database: %v", err)
	}

	for _, r := range restaurants {
		if r.Slug == "" {
			r.Slug = "rest-" + r.ID[len(r.ID)-8:]
		}
		_, err := db.Exec(ctx, `
			INSERT INTO restaurants (id, slug, name, address, lat, lon, cuisine, image_url, active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (id) DO UPDATE SET
				slug = EXCLUDED.slug,
				name = EXCLUDED.name,
				address = EXCLUDED.address,
				lat = EXCLUDED.lat,
				lon = EXCLUDED.lon,
				cuisine = EXCLUDED.cuisine,
				image_url = EXCLUDED.image_url,
				active = EXCLUDED.active`,
			r.ID, r.Slug, r.Name, r.Address, r.Lat, r.Lon, r.Cuisine, r.ImageURL, r.Active,
		)
		if err != nil {
			fail("upsert restaurant %s: %v", r.Name, err)
		}
	}

	for _, d := range dishes {
		if d.Category == "" && len(d.Tags) > 0 {
			d.Category = d.Tags[0]
		}
		_, err := db.Exec(ctx, `
			INSERT INTO dishes (id, restaurant_id, name, description, price, tags, image_url, category, sort_order, active, blind, blind_riddle)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			ON CONFLICT (id) DO UPDATE SET
				restaurant_id = EXCLUDED.restaurant_id,
				name = EXCLUDED.name,
				description = EXCLUDED.description,
				price = EXCLUDED.price,
				tags = EXCLUDED.tags,
				image_url = EXCLUDED.image_url,
				category = EXCLUDED.category,
				sort_order = EXCLUDED.sort_order,
				active = EXCLUDED.active,
				blind = EXCLUDED.blind,
				blind_riddle = EXCLUDED.blind_riddle`,
			d.ID, d.RestaurantID, d.Name, d.Description, d.Price, d.Tags, d.ImageURL,
			d.Category, d.SortOrder, d.Active, d.Blind, d.BlindRiddle,
		)
		if err != nil {
			fail("upsert dish %s: %v", d.Name, err)
		}
	}

	fmt.Printf("seeded %d restaurants and %d dishes\n", len(restaurants), len(dishes))
}

func readJSON(path string, dst any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, dst)
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
