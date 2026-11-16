package route

import "testing"

func TestBuildLegsUsesStraightLineDistance(t *testing.T) {
	stops := []Stop{
		{RestaurantID: "a", Lat: 53.5078, Lon: 49.4204},
		{RestaurantID: "b", Lat: 53.5178, Lon: 49.4204},
		{RestaurantID: "c", Lat: 53.5278, Lon: 49.4204},
	}
	legs, total := BuildLegs(stops)
	if len(legs) != 2 {
		t.Fatalf("len(legs) = %d, want 2", len(legs))
	}
	if legs[0].FromRestaurantID != "a" || legs[0].ToRestaurantID != "b" {
		t.Fatalf("first leg = %#v", legs[0])
	}
	if legs[1].FromRestaurantID != "b" || legs[1].ToRestaurantID != "c" {
		t.Fatalf("second leg = %#v", legs[1])
	}
	for _, leg := range legs {
		if leg.DistanceKM <= 1 || leg.DistanceKM >= 1.5 {
			t.Fatalf("distance = %v, want about 1.11 km", leg.DistanceKM)
		}
		// 1.11 km * 1.35 = 1.5 road km; at 4.5 km/h that is 20 minutes.
		if leg.WalkMin < 21 || leg.WalkMin > 23 {
			t.Fatalf("walk = %d, want about 22", leg.WalkMin)
		}
		if leg.TaxiMin >= leg.DriveMin {
			t.Fatalf("taxi must not be slower than a car: taxi %d, drive %d", leg.TaxiMin, leg.DriveMin)
		}
		if leg.TransitMin <= leg.DriveMin {
			t.Fatalf("transit must be slower than a car: transit %d, drive %d", leg.TransitMin, leg.DriveMin)
		}
	}
	if total.WalkMin != legs[0].WalkMin+legs[1].WalkMin {
		t.Fatalf("total walk = %d, want sum of legs", total.WalkMin)
	}
	if total.DistanceKM <= 2.2 || total.DistanceKM >= 2.5 {
		t.Fatalf("total distance = %v, want about 2.22 km", total.DistanceKM)
	}
}

func TestBuildLegsSingleStop(t *testing.T) {
	legs, total := BuildLegs([]Stop{{RestaurantID: "a"}})
	if len(legs) != 0 {
		t.Fatalf("len(legs) = %d, want 0", len(legs))
	}
	if total != (Totals{}) {
		t.Fatalf("total = %#v, want zero", total)
	}
}

func TestTravelMinutesOverheadOnlyForShortLegs(t *testing.T) {
	if got := travelMinutes(0, walkSpeedKMH, walkOverheadMin); got != walkOverheadMin {
		t.Fatalf("travelMinutes(0) = %d, want %d", got, walkOverheadMin)
	}
	if got := travelMinutes(4.5, walkSpeedKMH, walkOverheadMin); got != 62 {
		t.Fatalf("travelMinutes(4.5 km) = %d, want 62", got)
	}
	if got := travelMinutes(1, 0, 7); got != 7 {
		t.Fatalf("travelMinutes with zero speed = %d, want 7", got)
	}
}
