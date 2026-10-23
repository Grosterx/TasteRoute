package route

import "math"

const earthRadiusKM = 6371.0088

type Point struct {
	Lat float64
	Lon float64
}

// Haversine returns the great-circle distance between two points in kilometres.
func Haversine(a, b Point) float64 {
	lat1 := a.Lat * math.Pi / 180
	lat2 := b.Lat * math.Pi / 180
	dLat := (b.Lat - a.Lat) * math.Pi / 180
	dLon := (b.Lon - a.Lon) * math.Pi / 180

	sinLat := math.Sin(dLat / 2)
	sinLon := math.Sin(dLon / 2)
	h := sinLat*sinLat + math.Cos(lat1)*math.Cos(lat2)*sinLon*sinLon
	return 2 * earthRadiusKM * math.Asin(math.Sqrt(h))
}
