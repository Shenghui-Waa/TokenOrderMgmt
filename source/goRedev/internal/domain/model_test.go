package domain

import (
	"math"
	"testing"
)

func TestParseAmountCent(t *testing.T) {
	cases := map[string]int64{"0": 0, "0.01": 1, "1": 100, "1.20": 120, "-1.25": -125}
	for input, want := range cases {
		got, err := ParseAmountCent(input)
		if err != nil || got != want {
			t.Fatalf("ParseAmountCent(%q) = %d, %v", input, got, err)
		}
	}
	for _, input := range []string{"0.001", "1e2", "", "92233720368547759"} {
		if _, err := ParseAmountCent(input); err == nil {
			t.Fatalf("expected error for %q", input)
		}
	}
}
func TestAddAmountOverflow(t *testing.T) {
	if _, err := AddAmount(math.MaxInt64, 1); !IsCode(err, CodeForbidden) {
		t.Fatalf("expected forbidden overflow, got %v", err)
	}
}
func TestNewID(t *testing.T) {
	id, err := NewID()
	if err != nil || len(id) != 32 {
		t.Fatalf("unexpected id %q: %v", id, err)
	}
}
