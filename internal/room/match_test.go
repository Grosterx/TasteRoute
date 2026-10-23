package room

import "testing"

func TestMatchThreshold(t *testing.T) {
	cases := []struct {
		participants int
		want         int
	}{
		{1, 1},
		{2, 1},
		{3, 2},
		{4, 2},
		{5, 2},
		{8, 2},
	}
	for _, tc := range cases {
		if got := MatchThreshold(tc.participants); got != tc.want {
			t.Fatalf("MatchThreshold(%d) = %d, want %d", tc.participants, got, tc.want)
		}
	}
}

func TestLikesKey(t *testing.T) {
	if got, want := likesKey("abc234", "dish-1"), "room:ABC234:likes:dish-1"; got != want {
		t.Fatalf("likesKey() = %q, want %q", got, want)
	}
}
