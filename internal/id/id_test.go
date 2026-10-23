package id

import (
	"regexp"
	"testing"
)

func TestNewIsUUIDv4(t *testing.T) {
	re := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
	seen := make(map[string]struct{}, 100)
	for i := 0; i < 100; i++ {
		got := New()
		if !re.MatchString(got) {
			t.Fatalf("not a uuid v4: %q", got)
		}
		if _, ok := seen[got]; ok {
			t.Fatalf("duplicate uuid: %q", got)
		}
		seen[got] = struct{}{}
	}
}
