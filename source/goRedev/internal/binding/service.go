package binding

import "context"

// Service is the seam implemented by the future application/service layer.
// Bindings contain no persistence or business rules.
type Service interface {
	Close(context.Context) error
	LoadData(context.Context) (DataSet, error)
	GetProvider(context.Context, string) (Provider, error)
	SaveProvider(context.Context, ProviderInput) (Provider, error)
	DeleteProviders(context.Context, []string) error
	GetInvoiceTitle(context.Context, string) (InvoiceTitle, error)
	SaveInvoiceTitle(context.Context, InvoiceTitleInput) (InvoiceTitle, error)
	DeleteInvoiceTitles(context.Context, []string) error
	GetTokenOrder(context.Context, string) (TokenOrder, error)
	GetInvoiceOrders(context.Context, string) ([]TokenOrder, error)
	SaveTokenOrder(context.Context, TokenOrderInput) (TokenOrder, error)
	TrashTokenOrders(context.Context, []string) error
	RecoverTokenOrders(context.Context, []string) error
	DeleteTokenOrders(context.Context, []string) error
	GetInvoice(context.Context, string) (Invoice, error)
	CreateInvoice(context.Context, InvoiceInput, []string) (Invoice, error)
	VoidInvoice(context.Context, string) error
}
