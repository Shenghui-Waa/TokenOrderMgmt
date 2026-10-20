package service

import (
	"context"
	"path/filepath"
	"testing"
	"time"
	"token-order-mgmt-desktop/internal/binding"
	"token-order-mgmt-desktop/internal/database"
	"token-order-mgmt-desktop/internal/domain"
)

func newService(t *testing.T) *Service {
	t.Helper()
	db, err := database.Open(context.Background(), filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	s := New(db)
	s.now = func() time.Time { return time.Date(2026, 10, 20, 3, 4, 5, 0, time.Local) }
	t.Cleanup(func() { _ = s.Close(context.Background()) })
	return s
}
func TestInvoiceTransactionAndVoid(t *testing.T) {
	s := newService(t)
	ctx := context.Background()
	p, err := s.SaveProvider(ctx, binding.ProviderInput{Name: "p", Website: "https://p"})
	if err != nil {
		t.Fatal(err)
	}
	title, err := s.SaveInvoiceTitle(ctx, binding.InvoiceTitleInput{Name: "t", TitleType: "COMPANY"})
	if err != nil {
		t.Fatal(err)
	}
	order, err := s.SaveTokenOrder(ctx, binding.TokenOrderInput{OrderNo: "o", Amount: "12.34", PaymentType: "VISA", ProviderID: p.ID})
	if err != nil {
		t.Fatal(err)
	}
	invoice, err := s.CreateInvoice(ctx, binding.InvoiceInput{InvoiceNo: "i", InvoiceDate: "2026-10-20", InvoiceTitleID: title.ID}, []string{order.ID, order.ID})
	if err != nil {
		t.Fatal(err)
	}
	if invoice.TotalAmountCent != 1234 {
		t.Fatalf("total=%d", invoice.TotalAmountCent)
	}
	if _, err := s.SaveTokenOrder(ctx, binding.TokenOrderInput{ID: order.ID, OrderNo: "x", Amount: "12.34", PaymentType: "VISA", ProviderID: p.ID}); !domain.IsCode(err, domain.CodeForbidden) {
		t.Fatalf("expected forbidden, got %v", err)
	}
	if err := s.VoidInvoice(ctx, invoice.ID); err != nil {
		t.Fatal(err)
	}
	got, err := s.GetTokenOrder(ctx, order.ID)
	if err != nil || got.InvoiceID != nil {
		t.Fatalf("order not released: %+v %v", got, err)
	}
}
