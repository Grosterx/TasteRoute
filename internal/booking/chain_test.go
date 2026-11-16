package booking

import "testing"

func TestChainStatus(t *testing.T) {
	cases := []struct {
		name  string
		stops []ChainStop
		want  string
	}{
		{"empty", nil, "empty"},
		{"pending", []ChainStop{{Status: "new"}, {Status: "new"}}, "pending"},
		{"confirmed with pending", []ChainStop{{Status: "confirmed"}, {Status: "new"}}, "pending"},
		{"declined single", []ChainStop{{Status: "declined"}}, "declined"},
		{"declined part", []ChainStop{{Status: "declined"}, {Status: "confirmed"}}, "partial"},
		{"all confirmed", []ChainStop{{Status: "confirmed"}, {Status: "confirmed"}}, "confirmed"},
		{"all cancelled", []ChainStop{{Status: "cancelled"}, {Status: "cancelled"}}, "cancelled"},
		{"cancelled part", []ChainStop{{Status: "cancelled"}, {Status: "new"}}, "partial"},
	}
	for _, tc := range cases {
		if got := chainStatus(tc.stops); got != tc.want {
			t.Fatalf("%s: chainStatus() = %q, want %q", tc.name, got, tc.want)
		}
	}
}

func TestIsActiveStatus(t *testing.T) {
	active := []string{"new", "contacted", "confirmed"}
	for _, status := range active {
		if !isActiveStatus(status) {
			t.Fatalf("%q must be active", status)
		}
	}
	for _, status := range []string{"declined", "cancelled", "completed", ""} {
		if isActiveStatus(status) {
			t.Fatalf("%q must not be active", status)
		}
	}
}

func TestValidateContact(t *testing.T) {
	if err := validateContact("Аня", "+79990000000", "", 2); err != nil {
		t.Fatalf("valid contact rejected: %v", err)
	}
	if err := validateContact("", "+79990000000", "", 2); err == nil {
		t.Fatal("empty name must be rejected")
	}
	if err := validateContact("Аня", "", "", 2); err == nil {
		t.Fatal("empty phone must be rejected")
	}
	if err := validateContact("Аня", "+79990000000", "", 0); err == nil {
		t.Fatal("zero party size must be rejected")
	}
	if err := validateContact("Аня", "+79990000000", "", 21); err == nil {
		t.Fatal("too many guests must be rejected")
	}
}
