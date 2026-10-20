package binding

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	platformwindows "token-order-mgmt-desktop/internal/platform/windows"
)

type DesktopBinding struct {
	ctx     context.Context
	service Service
	paths   platformwindows.Paths
}

func NewDesktopBinding(service Service, paths platformwindows.Paths) *DesktopBinding {
	return &DesktopBinding{service: service, paths: paths}
}

func (b *DesktopBinding) Startup(ctx context.Context) { b.ctx = ctx }

func (b *DesktopBinding) Shutdown(ctx context.Context) {
	if err := b.service.Close(ctx); err != nil {
		runtime.LogErrorf(ctx, "close desktop service: %v", err)
	}
}

func (b *DesktopBinding) context() (context.Context, error) {
	if b.ctx == nil {
		return nil, errors.New("application is not ready")
	}
	return b.ctx, nil
}

func (b *DesktopBinding) LoadData() (DataSet, error) {
	ctx, err := b.context()
	if err != nil {
		return DataSet{}, err
	}
	return b.service.LoadData(ctx)
}
func (b *DesktopBinding) GetProvider(id string) (Provider, error) {
	ctx, err := b.context()
	if err != nil {
		return Provider{}, err
	}
	return b.service.GetProvider(ctx, requiredID(id))
}
func (b *DesktopBinding) SaveProvider(input ProviderInput) (Provider, error) {
	ctx, err := b.context()
	if err != nil {
		return Provider{}, err
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Website = strings.TrimSpace(input.Website)
	if input.Name == "" {
		return Provider{}, errors.New("provider name is required")
	}
	return b.service.SaveProvider(ctx, input)
}
func (b *DesktopBinding) DeleteProviders(ids []string) error {
	ctx, err := b.context()
	if err != nil {
		return err
	}
	return b.service.DeleteProviders(ctx, uniqueIDs(ids))
}
func (b *DesktopBinding) GetInvoiceTitle(id string) (InvoiceTitle, error) {
	ctx, err := b.context()
	if err != nil {
		return InvoiceTitle{}, err
	}
	return b.service.GetInvoiceTitle(ctx, requiredID(id))
}
func (b *DesktopBinding) SaveInvoiceTitle(input InvoiceTitleInput) (InvoiceTitle, error) {
	ctx, err := b.context()
	if err != nil {
		return InvoiceTitle{}, err
	}
	input.Name = strings.TrimSpace(input.Name)
	input.TaxCode = strings.TrimSpace(input.TaxCode)
	if input.Name == "" {
		return InvoiceTitle{}, errors.New("invoice title name is required")
	}
	return b.service.SaveInvoiceTitle(ctx, input)
}
func (b *DesktopBinding) DeleteInvoiceTitles(ids []string) error {
	ctx, err := b.context()
	if err != nil {
		return err
	}
	return b.service.DeleteInvoiceTitles(ctx, uniqueIDs(ids))
}
func (b *DesktopBinding) GetTokenOrder(id string) (TokenOrder, error) {
	ctx, err := b.context()
	if err != nil {
		return TokenOrder{}, err
	}
	return b.service.GetTokenOrder(ctx, requiredID(id))
}
func (b *DesktopBinding) GetInvoiceOrders(id string) ([]TokenOrder, error) {
	ctx, err := b.context()
	if err != nil {
		return nil, err
	}
	return b.service.GetInvoiceOrders(ctx, requiredID(id))
}
func (b *DesktopBinding) SaveTokenOrder(input TokenOrderInput) (TokenOrder, error) {
	ctx, err := b.context()
	if err != nil {
		return TokenOrder{}, err
	}
	input.OrderNo = strings.TrimSpace(input.OrderNo)
	input.Amount = strings.TrimSpace(input.Amount)
	if input.OrderNo == "" || input.Amount == "" || input.ProviderID == "" {
		return TokenOrder{}, errors.New("order number, amount and provider are required")
	}
	return b.service.SaveTokenOrder(ctx, input)
}
func (b *DesktopBinding) TrashTokenOrders(ids []string) error {
	ctx, err := b.context()
	if err != nil {
		return err
	}
	return b.service.TrashTokenOrders(ctx, uniqueIDs(ids))
}
func (b *DesktopBinding) RecoverTokenOrders(ids []string) error {
	ctx, err := b.context()
	if err != nil {
		return err
	}
	return b.service.RecoverTokenOrders(ctx, uniqueIDs(ids))
}
func (b *DesktopBinding) DeleteTokenOrders(ids []string) error {
	ctx, err := b.context()
	if err != nil {
		return err
	}
	return b.service.DeleteTokenOrders(ctx, uniqueIDs(ids))
}
func (b *DesktopBinding) GetInvoice(id string) (Invoice, error) {
	ctx, err := b.context()
	if err != nil {
		return Invoice{}, err
	}
	return b.service.GetInvoice(ctx, requiredID(id))
}
func (b *DesktopBinding) CreateInvoice(input InvoiceInput, ids []string) (Invoice, error) {
	ctx, err := b.context()
	if err != nil {
		return Invoice{}, err
	}
	input.InvoiceNo = strings.TrimSpace(input.InvoiceNo)
	input.InvoiceTitleID = strings.TrimSpace(input.InvoiceTitleID)
	if input.InvoiceNo == "" || input.InvoiceDate == "" || input.InvoiceTitleID == "" {
		return Invoice{}, errors.New("invoice number, date and title are required")
	}
	return b.service.CreateInvoice(ctx, input, uniqueIDs(ids))
}
func (b *DesktopBinding) VoidInvoice(id string) error {
	ctx, err := b.context()
	if err != nil {
		return err
	}
	return b.service.VoidInvoice(ctx, requiredID(id))
}
func (b *DesktopBinding) OpenExternalURL(rawURL string) error {
	ctx, err := b.context()
	if err != nil {
		return err
	}
	parsed, err := url.ParseRequestURI(strings.TrimSpace(rawURL))
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return errors.New("only absolute http and https URLs are allowed")
	}
	runtime.BrowserOpenURL(ctx, parsed.String())
	return nil
}
func (b *DesktopBinding) GetAppInfo() AppInfo {
	return AppInfo{Name: "TokenOrderMgmt", Version: "0.1.0", DatabasePath: b.paths.DatabasePath}
}

func requiredID(id string) string { return strings.TrimSpace(id) }
func uniqueIDs(ids []string) []string {
	seen := make(map[string]struct{}, len(ids))
	result := make([]string, 0, len(ids))
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		result = append(result, id)
	}
	return result
}

func wrapError(code int, err error) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("{\"code\":%d,\"message\":%q}", code, err.Error())
}
