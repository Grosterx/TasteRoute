package route

import "testing"

func TestOrderNearest(t *testing.T) {
	stops := []Stop{
		{RestaurantID: "far", Lat: 0, Lon: 3},
		{RestaurantID: "near", Lat: 0, Lon: 1},
		{RestaurantID: "middle", Lat: 0, Lon: 2},
	}
	got := OrderNearest(Point{Lat: 0, Lon: 0}, stops, 3)
	want := []string{"near", "middle", "far"}
	if len(got) != len(want) {
		t.Fatalf("len = %d, want %d", len(got), len(want))
	}
	for i := range want {
		if got[i].RestaurantID != want[i] {
			t.Fatalf("stop %d = %q, want %q", i, got[i].RestaurantID, want[i])
		}
	}
}

func TestOrderNearestLimit(t *testing.T) {
	stops := []Stop{
		{RestaurantID: "a", Lat: 0, Lon: 1},
		{RestaurantID: "b", Lat: 0, Lon: 2},
		{RestaurantID: "c", Lat: 0, Lon: 3},
	}
	got := OrderNearest(Point{Lat: 0, Lon: 0}, stops, 2)
	if len(got) != 2 || got[0].RestaurantID != "a" || got[1].RestaurantID != "b" {
		t.Fatalf("unexpected order: %#v", got)
	}
}
