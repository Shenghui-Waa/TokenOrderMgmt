package domain

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"math/big"
	"regexp"
	"strings"
	"time"
)

const (
	CodeError      = 400
	CodeForbidden  = 403
	CodeNotFound   = 404
	InvoiceValid   = "VALID"
	InvoiceInvalid = "INVALID"
	Invoiced       = "INVOICED"
	Uninvoiced     = "UNINVOICED"
)

var amountPattern = regexp.MustCompile(`^([+-]?)([0-9]+)(?:\.([0-9]{1,2}))?$`)

type BusinessError struct {
	Code    int
	Message string
}

func (e *BusinessError) Error() string        { return e.Message }
func NewError(code int, message string) error { return &BusinessError{Code: code, Message: message} }
func IsCode(err error, code int) bool {
	var target *BusinessError
	return errors.As(err, &target) && target.Code == code
}

type Provider struct{ ID, Name, Website, CreatedAt, UpdatedAt string }
type InvoiceTitle struct {
	ID, TitleType, Name, CreatedAt, UpdatedAt string
	TaxCode                                   *string
}
type TokenOrder struct {
	ID, OrderNo, PaymentType, ProviderID, CreatedAt, UpdatedAt string
	AmountCent                                                 int64
	InvoiceID, DeletedAt                                       *string
}
type Invoice struct {
	ID, InvoiceNo, InvoiceDate, InvoiceTitleID, Status, CreatedAt, UpdatedAt string
	TotalAmountCent                                                          int64
}

type ProviderView struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Website string `json:"website"`
}
type InvoiceTitleView struct {
	ID        string  `json:"id"`
	TitleType string  `json:"titleType"`
	Name      string  `json:"name"`
	TaxCode   *string `json:"taxCode"`
}
type TokenOrderView struct {
	ID            string  `json:"id"`
	OrderNo       string  `json:"orderNo"`
	AmountCent    int64   `json:"amountCent"`
	PaymentType   string  `json:"paymentType"`
	ProviderID    string  `json:"providerId"`
	ProviderName  *string `json:"providerName"`
	InvoiceID     *string `json:"invoiceId"`
	InvoiceStatus string  `json:"invoiceStatus"`
	InvoiceType   *string `json:"invoiceType"`
	Deleted       int     `json:"deleted"`
	UpdatedAt     *string `json:"updatedAt"`
}
type InvoiceView struct {
	ID               string  `json:"id"`
	InvoiceNo        string  `json:"invoiceNo"`
	TotalAmountCent  int64   `json:"totalAmountCent"`
	InvoiceDate      string  `json:"invoiceDate"`
	InvoiceType      string  `json:"invoiceType"`
	InvoiceTitleID   string  `json:"invoiceTitleId"`
	InvoiceTitleName string  `json:"invoiceTitleName"`
	Status           string  `json:"status"`
	UpdatedAt        *string `json:"updatedAt"`
}

type ProviderInput struct{ ID, Name, Website string }
type InvoiceTitleInput struct{ ID, TitleType, Name, TaxCode string }
type TokenOrderInput struct{ ID, OrderNo, Amount, PaymentType, ProviderID string }
type InvoiceInput struct{ InvoiceNo, InvoiceDate, InvoiceTitleID string }

func NewID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return hex.EncodeToString(b), nil
}
func FormatTime(t time.Time) string { return t.Format("2006-01-02T15:04:05.999999999") }
func ParseAmountCent(value string) (int64, error) {
	m := amountPattern.FindStringSubmatch(strings.TrimSpace(value))
	if m == nil {
		return 0, NewError(CodeError, "The amount is invalid.")
	}
	whole := new(big.Int)
	if _, ok := whole.SetString(m[2], 10); !ok {
		return 0, NewError(CodeError, "The amount is invalid.")
	}
	whole.Mul(whole, big.NewInt(100))
	fraction := m[3]
	if len(fraction) == 1 {
		fraction += "0"
	}
	if fraction != "" {
		n, _ := new(big.Int).SetString(fraction, 10)
		whole.Add(whole, n)
	}
	if m[1] == "-" {
		whole.Neg(whole)
	}
	if !whole.IsInt64() {
		return 0, NewError(CodeError, "The amount is invalid.")
	}
	return whole.Int64(), nil
}
func AddAmount(a, b int64) (int64, error) {
	if (b > 0 && a > math.MaxInt64-b) || (b < 0 && a < math.MinInt64-b) {
		return 0, NewError(CodeForbidden, "The total amount cent is too large")
	}
	return a + b, nil
}
func ValidateDate(value string, now time.Time) error {
	_, err := time.Parse("2006-01-02", value)
	if err != nil {
		return fmt.Errorf("invalid invoice date")
	}
	today := fmt.Sprintf("%04d-%02d-%02d", now.Year(), now.Month(), now.Day())
	if value > today {
		return fmt.Errorf("invalid invoice date")
	}
	return nil
}
