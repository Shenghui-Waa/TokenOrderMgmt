package binding

import (
	"context"
	"errors"
)

type unavailableService struct{ message string }

func NewUnavailableService(message string) Service                      { return &unavailableService{message: message} }
func (s *unavailableService) err() error                                { return errors.New(s.message) }
func (s *unavailableService) Close(context.Context) error               { return nil }
func (s *unavailableService) LoadData(context.Context) (DataSet, error) { return DataSet{}, s.err() }
func (s *unavailableService) GetProvider(context.Context, string) (Provider, error) {
	return Provider{}, s.err()
}
func (s *unavailableService) SaveProvider(context.Context, ProviderInput) (Provider, error) {
	return Provider{}, s.err()
}
func (s *unavailableService) DeleteProviders(context.Context, []string) error { return s.err() }
func (s *unavailableService) GetInvoiceTitle(context.Context, string) (InvoiceTitle, error) {
	return InvoiceTitle{}, s.err()
}
func (s *unavailableService) SaveInvoiceTitle(context.Context, InvoiceTitleInput) (InvoiceTitle, error) {
	return InvoiceTitle{}, s.err()
}
func (s *unavailableService) DeleteInvoiceTitles(context.Context, []string) error { return s.err() }
func (s *unavailableService) GetTokenOrder(context.Context, string) (TokenOrder, error) {
	return TokenOrder{}, s.err()
}
func (s *unavailableService) GetInvoiceOrders(context.Context, string) ([]TokenOrder, error) {
	return nil, s.err()
}
func (s *unavailableService) SaveTokenOrder(context.Context, TokenOrderInput) (TokenOrder, error) {
	return TokenOrder{}, s.err()
}
func (s *unavailableService) TrashTokenOrders(context.Context, []string) error   { return s.err() }
func (s *unavailableService) RecoverTokenOrders(context.Context, []string) error { return s.err() }
func (s *unavailableService) DeleteTokenOrders(context.Context, []string) error  { return s.err() }
func (s *unavailableService) GetInvoice(context.Context, string) (Invoice, error) {
	return Invoice{}, s.err()
}
func (s *unavailableService) CreateInvoice(context.Context, InvoiceInput, []string) (Invoice, error) {
	return Invoice{}, s.err()
}
func (s *unavailableService) VoidInvoice(context.Context, string) error { return s.err() }
