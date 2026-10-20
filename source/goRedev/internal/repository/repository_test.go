package repository

import (
	"context"
	"path/filepath"
	"testing"
	"token-order-mgmt-desktop/internal/database"
	"token-order-mgmt-desktop/internal/domain"
)

func TestForeignKeyDeleteRejected(t *testing.T) {
	ctx := context.Background()
	db, err := database.Open(ctx, filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	r := New(db)
	p := domain.Provider{ID: "p", Name: "n", Website: "https://x", CreatedAt: "2026-01-01T00:00:00", UpdatedAt: "2026-01-01T00:00:00"}
	if err := r.InsertProvider(ctx, p); err != nil {
		t.Fatal(err)
	}
	o := domain.TokenOrder{ID: "o", OrderNo: "1", AmountCent: 1, PaymentType: "VISA", ProviderID: "p", CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt}
	if err := r.InsertOrder(ctx, o); err != nil {
		t.Fatal(err)
	}
	if err := r.DeleteProviders(ctx, []string{"p"}); err == nil {
		t.Fatal("expected foreign key error")
	}
}

func TestListProvidersAcceptsLegacyNullTimestamps(t *testing.T) {
	ctx := context.Background()
	db, err := database.Open(ctx, filepath.Join(t.TempDir(), "legacy.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if _, err := db.ExecContext(ctx,
		`insert into provider(id,name,website,created_at,updated_at) values(?,?,?,?,?)`,
		"legacy", "Legacy", "https://example.com", nil, "2026-09-08T20:51:48.090760800",
	); err != nil {
		t.Fatal(err)
	}
	providers, err := New(db).ListProviders(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(providers) != 1 || providers[0].CreatedAt != "" {
		t.Fatalf("unexpected providers: %+v", providers)
	}
}
