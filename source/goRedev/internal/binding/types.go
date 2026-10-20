package binding

type TitleType string
type PaymentType string
type InvoiceStatus string

type Provider struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Website string `json:"website"`
}

type InvoiceTitle struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	TitleType TitleType `json:"titleType"`
	TaxCode   *string   `json:"taxCode"`
}

type TokenOrder struct {
	ID            string      `json:"id"`
	OrderNo       string      `json:"orderNo"`
	AmountCent    int64       `json:"amountCent"`
	PaymentType   PaymentType `json:"paymentType"`
	ProviderID    string      `json:"providerId"`
	ProviderName  *string     `json:"providerName"`
	InvoiceID     *string     `json:"invoiceId"`
	InvoiceStatus string      `json:"invoiceStatus"`
	InvoiceType   *TitleType  `json:"invoiceType"`
	Deleted       int         `json:"deleted"`
	UpdatedAt     *string     `json:"updatedAt"`
}

type Invoice struct {
	ID              string        `json:"id"`
	InvoiceNo       string        `json:"invoiceNo"`
	TotalAmountCent int64         `json:"totalAmountCent"`
	InvoiceDate     string        `json:"invoiceDate"`
	InvoiceType     TitleType     `json:"invoiceType"`
	InvoiceTitleID  string        `json:"invoiceTitleId"`
	InvoiceTitle    string        `json:"invoiceTitleName"`
	Status          InvoiceStatus `json:"status"`
	UpdatedAt       *string       `json:"updatedAt"`
}

type DataSet struct {
	Providers []Provider     `json:"providers"`
	Titles    []InvoiceTitle `json:"titles"`
	Orders    []TokenOrder   `json:"orders"`
	Invoices  []Invoice      `json:"invoices"`
}

type ProviderInput struct {
	ID      string `json:"id,omitempty"`
	Name    string `json:"name"`
	Website string `json:"website"`
}

type InvoiceTitleInput struct {
	ID        string    `json:"id,omitempty"`
	Name      string    `json:"name"`
	TitleType TitleType `json:"titleType"`
	TaxCode   string    `json:"taxCode"`
}

type TokenOrderInput struct {
	ID          string      `json:"id,omitempty"`
	OrderNo     string      `json:"orderNo"`
	Amount      string      `json:"amount"`
	PaymentType PaymentType `json:"paymentType"`
	ProviderID  string      `json:"providerId"`
}

type InvoiceInput struct {
	InvoiceNo      string `json:"invoiceNo"`
	InvoiceDate    string `json:"invoiceDate"`
	InvoiceTitleID string `json:"invoiceTitleId"`
}

type AppInfo struct {
	Name         string `json:"name"`
	Version      string `json:"version"`
	DatabasePath string `json:"databasePath"`
}
