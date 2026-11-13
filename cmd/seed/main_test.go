package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestRestaurantSeedsHaveRealCoordinates(t *testing.T) {
	path := filepath.Join("..", "..", "seeds", "restaurants.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read seeds: %v", err)
	}

	var restaurants []restaurantSeed
	if err := json.Unmarshal(data, &restaurants); err != nil {
		t.Fatalf("parse seeds: %v", err)
	}
	if len(restaurants) == 0 {
		t.Fatal("restaurant seeds are empty")
	}

	ids := make(map[string]struct{}, len(restaurants))
	slugs := make(map[string]struct{}, len(restaurants))
	for _, r := range restaurants {
		if r.ID == "" {
			t.Errorf("restaurant %q: empty id", r.Name)
		}
		if r.Slug == "" {
			t.Errorf("restaurant %q: empty slug", r.Name)
		}
		if r.Address == "" {
			t.Errorf("restaurant %q: empty address", r.Name)
		}
		if r.Lat == 0 || r.Lon == 0 {
			t.Errorf("restaurant %q: zero coordinates", r.Name)
		}
		// Границы Тольятти: координаты должны быть в черте города, а не в центре карты мира.
		if r.Lat < 53.40 || r.Lat > 53.60 || r.Lon < 49.15 || r.Lon > 49.60 {
			t.Errorf("restaurant %q: coordinates %.6f, %.6f are outside Tolyatti", r.Name, r.Lat, r.Lon)
		}
		if _, ok := ids[r.ID]; ok {
			t.Errorf("duplicate restaurant id %q", r.ID)
		}
		ids[r.ID] = struct{}{}
		if _, ok := slugs[r.Slug]; ok {
			t.Errorf("duplicate restaurant slug %q", r.Slug)
		}
		slugs[r.Slug] = struct{}{}
	}
}
