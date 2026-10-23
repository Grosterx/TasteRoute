package route

type DishRef struct {
	DishID string `json:"dish_id"`
	Name   string `json:"name"`
}

type Stop struct {
	RestaurantID string    `json:"restaurant_id"`
	Name         string    `json:"name"`
	Address      string    `json:"address"`
	Lat          float64   `json:"lat"`
	Lon          float64   `json:"lon"`
	Dishes       []DishRef `json:"dishes"`
}

type Route struct {
	RouteID string `json:"route_id"`
	Stops   []Stop `json:"stops"`
}

// OrderNearest orders stops greedily by distance from start and returns at most max stops.
func OrderNearest(start Point, stops []Stop, max int) []Stop {
	if max <= 0 || len(stops) == 0 {
		return []Stop{}
	}
	remaining := append([]Stop(nil), stops...)
	out := make([]Stop, 0, min(max, len(remaining)))
	current := start

	for len(out) < max && len(remaining) > 0 {
		best := 0
		bestDistance := Haversine(current, Point{Lat: remaining[0].Lat, Lon: remaining[0].Lon})
		for i := 1; i < len(remaining); i++ {
			d := Haversine(current, Point{Lat: remaining[i].Lat, Lon: remaining[i].Lon})
			if d < bestDistance {
				best = i
				bestDistance = d
			}
		}
		next := remaining[best]
		out = append(out, next)
		current = Point{Lat: next.Lat, Lon: next.Lon}
		remaining = append(remaining[:best], remaining[best+1:]...)
	}
	return out
}
