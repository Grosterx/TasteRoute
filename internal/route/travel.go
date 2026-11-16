package route

import "math"

const (
	roadFactor      = 1.35
	walkSpeedKMH    = 4.5
	driveSpeedKMH   = 25.0
	transitSpeedKMH = 15.0

	walkOverheadMin    = 2
	driveOverheadMin   = 5
	taxiOverheadMin    = 3
	transitOverheadMin = 8
)

// Leg is an approximate travel estimate between two consecutive stops. It is
// deliberately based on straight-line distance: the project has no routing
// provider, so these numbers are rough plan hints rather than real ETAs.
type Leg struct {
	FromRestaurantID string  `json:"from_restaurant_id"`
	ToRestaurantID   string  `json:"to_restaurant_id"`
	DistanceKM       float64 `json:"distance_km"`
	WalkMin          int     `json:"walk_min"`
	DriveMin         int     `json:"drive_min"`
	TaxiMin          int     `json:"taxi_min"`
	TransitMin       int     `json:"transit_min"`
}

// Totals sums the legs of a route.
type Totals struct {
	DistanceKM float64 `json:"distance_km"`
	WalkMin    int     `json:"walk_min"`
	DriveMin   int     `json:"drive_min"`
	TaxiMin    int     `json:"taxi_min"`
	TransitMin int     `json:"transit_min"`
}

// BuildLegs returns travel estimates for every pair of consecutive stops.
func BuildLegs(stops []Stop) ([]Leg, Totals) {
	legs := make([]Leg, 0, max(len(stops)-1, 0))
	var total Totals
	for i := 0; i+1 < len(stops); i++ {
		from := stops[i]
		to := stops[i+1]
		distance := math.Round(Haversine(
			Point{Lat: from.Lat, Lon: from.Lon},
			Point{Lat: to.Lat, Lon: to.Lon},
		)*100) / 100
		road := distance * roadFactor

		leg := Leg{
			FromRestaurantID: from.RestaurantID,
			ToRestaurantID:   to.RestaurantID,
			DistanceKM:       distance,
			WalkMin:          travelMinutes(road, walkSpeedKMH, walkOverheadMin),
			DriveMin:         travelMinutes(road, driveSpeedKMH, driveOverheadMin),
			TaxiMin:          travelMinutes(road, driveSpeedKMH, taxiOverheadMin),
			TransitMin:       travelMinutes(road, transitSpeedKMH, transitOverheadMin),
		}
		legs = append(legs, leg)

		total.DistanceKM += distance
		total.WalkMin += leg.WalkMin
		total.DriveMin += leg.DriveMin
		total.TaxiMin += leg.TaxiMin
		total.TransitMin += leg.TransitMin
	}
	total.DistanceKM = math.Round(total.DistanceKM*100) / 100
	return legs, total
}

func travelMinutes(roadKM, speedKMH float64, overhead int) int {
	if speedKMH <= 0 {
		return overhead
	}
	return int(math.Ceil(roadKM/speedKMH*60)) + overhead
}
