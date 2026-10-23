package route

import (
	"math"
	"testing"
)

func TestHaversineKnownDistance(t *testing.T) {
	// Moscow -> Saint Petersburg is about 634 km.
	got := Haversine(Point{Lat: 55.7558, Lon: 37.6173}, Point{Lat: 59.9343, Lon: 30.3351})
	want := 634.0
	if math.Abs(got-want)/want > 0.01 {
		t.Fatalf("Haversine() = %.2f km, want about %.2f km", got, want)
	}
}

func TestHaversineSamePoint(t *testing.T) {
	if got := Haversine(Point{Lat: 53.5, Lon: 49.4}, Point{Lat: 53.5, Lon: 49.4}); got != 0 {
		t.Fatalf("Haversine() = %v, want 0", got)
	}
}
