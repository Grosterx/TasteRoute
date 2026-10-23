package auth

import "testing"

func TestIssueAndParse(t *testing.T) {
	secret := "0123456789abcdef0123456789abcdef"
	token, err := Issue(secret, "participant-1", "ABC234")
	if err != nil {
		t.Fatalf("Issue() error = %v", err)
	}
	claims, err := Parse(secret, token)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	if claims.ParticipantID != "participant-1" || claims.RoomCode != "ABC234" {
		t.Fatalf("unexpected claims: %#v", claims)
	}
}

func TestParseRejectsWrongSecret(t *testing.T) {
	token, err := Issue("0123456789abcdef0123456789abcdef", "participant-1", "ABC234")
	if err != nil {
		t.Fatalf("Issue() error = %v", err)
	}
	if _, err := Parse("fedcba9876543210fedcba9876543210", token); err == nil {
		t.Fatal("expected an error")
	}
}

func TestParseRejectsGarbage(t *testing.T) {
	if _, err := Parse("0123456789abcdef0123456789abcdef", "not-a-token"); err == nil {
		t.Fatal("expected an error")
	}
}
