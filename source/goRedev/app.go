package main

import (
	"context"

	"token-order-mgmt-desktop/internal/binding"
)

// App is the only object exposed to the WebView renderer.
// It deliberately forwards a small, typed command surface.
type App struct {
	desktop *binding.DesktopBinding
}

func NewApp(desktop *binding.DesktopBinding) *App {
	return &App{desktop: desktop}
}

func (a *App) Startup(ctx context.Context) {
	a.desktop.Startup(ctx)
}

func (a *App) Shutdown(ctx context.Context) {
	a.desktop.Shutdown(ctx)
}

func (a *App) LoadData() (binding.DataSet, error) { return a.desktop.LoadData() }
func (a *App) GetProvider(id string) (binding.Provider, error) {
	return a.desktop.GetProvider(id)
}
func (a *App) SaveProvider(input binding.ProviderInput) (binding.Provider, error) {
	return a.desktop.SaveProvider(input)
}
func (a *App) DeleteProviders(ids []string) error { return a.desktop.DeleteProviders(ids) }
func (a *App) GetInvoiceTitle(id string) (binding.InvoiceTitle, error) {
	return a.desktop.GetInvoiceTitle(id)
}
func (a *App) SaveInvoiceTitle(input binding.InvoiceTitleInput) (binding.InvoiceTitle, error) {
	return a.desktop.SaveInvoiceTitle(input)
}
func (a *App) DeleteInvoiceTitles(ids []string) error {
	return a.desktop.DeleteInvoiceTitles(ids)
}
func (a *App) GetTokenOrder(id string) (binding.TokenOrder, error) {
	return a.desktop.GetTokenOrder(id)
}
func (a *App) GetInvoiceOrders(id string) ([]binding.TokenOrder, error) {
	return a.desktop.GetInvoiceOrders(id)
}
func (a *App) SaveTokenOrder(input binding.TokenOrderInput) (binding.TokenOrder, error) {
	return a.desktop.SaveTokenOrder(input)
}
func (a *App) TrashTokenOrders(ids []string) error   { return a.desktop.TrashTokenOrders(ids) }
func (a *App) RecoverTokenOrders(ids []string) error { return a.desktop.RecoverTokenOrders(ids) }
func (a *App) DeleteTokenOrders(ids []string) error  { return a.desktop.DeleteTokenOrders(ids) }
func (a *App) GetInvoice(id string) (binding.Invoice, error) {
	return a.desktop.GetInvoice(id)
}
func (a *App) CreateInvoice(
	input binding.InvoiceInput,
	orderIDs []string,
) (binding.Invoice, error) {
	return a.desktop.CreateInvoice(input, orderIDs)
}
func (a *App) VoidInvoice(id string) error         { return a.desktop.VoidInvoice(id) }
func (a *App) OpenExternalURL(rawURL string) error { return a.desktop.OpenExternalURL(rawURL) }
func (a *App) GetAppInfo() binding.AppInfo         { return a.desktop.GetAppInfo() }
