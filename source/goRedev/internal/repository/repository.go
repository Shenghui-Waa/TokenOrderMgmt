package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"token-order-mgmt-desktop/internal/domain"
)

type DBTX interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}
type Store struct{ db DBTX }

func New(db DBTX) *Store             { return &Store{db: db} }
func (s *Store) With(db DBTX) *Store { return New(db) }

func placeholders(n int) string {
	if n == 0 {
		return "NULL"
	}
	return strings.TrimSuffix(strings.Repeat("?,", n), ",")
}
func args(ids []string) []any {
	result := make([]any, len(ids))
	for i := range ids {
		result[i] = ids[i]
	}
	return result
}
func nullString(value *string) any {
	if value == nil {
		return nil
	}
	return *value
}
func text(value sql.NullString) string {
	if value.Valid {
		return value.String
	}
	return ""
}

func scanProvider(scanner interface{ Scan(...any) error }) (domain.Provider, error) {
	var v domain.Provider
	var createdAt, updatedAt sql.NullString
	err := scanner.Scan(&v.ID, &v.Name, &v.Website, &createdAt, &updatedAt)
	v.CreatedAt = text(createdAt)
	v.UpdatedAt = text(updatedAt)
	return v, err
}

func (s *Store) ListProviders(ctx context.Context) ([]domain.Provider, error) {
	rows, err := s.db.QueryContext(ctx, `select id,name,website,created_at,updated_at from provider order by updated_at desc`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Provider
	for rows.Next() {
		v, err := scanProvider(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
func (s *Store) Provider(ctx context.Context, id string) (domain.Provider, error) {
	return scanProvider(s.db.QueryRowContext(ctx, `select id,name,website,created_at,updated_at from provider where id=?`, id))
}
func (s *Store) ProviderByName(ctx context.Context, name string) (domain.Provider, error) {
	return scanProvider(s.db.QueryRowContext(ctx, `select id,name,website,created_at,updated_at from provider where name=? limit 1`, name))
}
func (s *Store) InsertProvider(ctx context.Context, v domain.Provider) error {
	_, err := s.db.ExecContext(ctx, `insert into provider(id,name,website,created_at,updated_at) values(?,?,?,?,?)`, v.ID, v.Name, v.Website, v.CreatedAt, v.UpdatedAt)
	return err
}
func (s *Store) UpdateProvider(ctx context.Context, v domain.Provider) error {
	_, err := s.db.ExecContext(ctx, `update provider set name=?,website=?,updated_at=? where id=?`, v.Name, v.Website, v.UpdatedAt, v.ID)
	return err
}
func (s *Store) DeleteProviders(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `delete from provider where id in (`+placeholders(len(ids))+`)`, args(ids)...)
	return err
}

func (s *Store) ListTitles(ctx context.Context) ([]domain.InvoiceTitle, error) {
	rows, err := s.db.QueryContext(ctx, `select id,title_type,name,tax_code,created_at,updated_at from invoice_title order by updated_at desc`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.InvoiceTitle
	for rows.Next() {
		var v domain.InvoiceTitle
		var tax sql.NullString
		if err := rows.Scan(&v.ID, &v.TitleType, &v.Name, &tax, &v.CreatedAt, &v.UpdatedAt); err != nil {
			return nil, err
		}
		if tax.Valid {
			v.TaxCode = &tax.String
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
func (s *Store) Title(ctx context.Context, id string) (domain.InvoiceTitle, error) {
	var v domain.InvoiceTitle
	var tax sql.NullString
	err := s.db.QueryRowContext(ctx, `select id,title_type,name,tax_code,created_at,updated_at from invoice_title where id=?`, id).Scan(&v.ID, &v.TitleType, &v.Name, &tax, &v.CreatedAt, &v.UpdatedAt)
	if tax.Valid {
		v.TaxCode = &tax.String
	}
	return v, err
}
func (s *Store) TitleByName(ctx context.Context, name string) (domain.InvoiceTitle, error) {
	var v domain.InvoiceTitle
	var tax sql.NullString
	err := s.db.QueryRowContext(ctx, `select id,title_type,name,tax_code,created_at,updated_at from invoice_title where name=? limit 1`, name).Scan(&v.ID, &v.TitleType, &v.Name, &tax, &v.CreatedAt, &v.UpdatedAt)
	if tax.Valid {
		v.TaxCode = &tax.String
	}
	return v, err
}
func (s *Store) InsertTitle(ctx context.Context, v domain.InvoiceTitle) error {
	_, err := s.db.ExecContext(ctx, `insert into invoice_title(id,title_type,name,tax_code,created_at,updated_at) values(?,?,?,?,?,?)`, v.ID, v.TitleType, v.Name, nullString(v.TaxCode), v.CreatedAt, v.UpdatedAt)
	return err
}
func (s *Store) UpdateTitle(ctx context.Context, v domain.InvoiceTitle) error {
	_, err := s.db.ExecContext(ctx, `update invoice_title set title_type=?,name=?,tax_code=?,updated_at=? where id=?`, v.TitleType, v.Name, nullString(v.TaxCode), v.UpdatedAt, v.ID)
	return err
}
func (s *Store) DeleteTitles(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `delete from invoice_title where id in (`+placeholders(len(ids))+`)`, args(ids)...)
	return err
}

func scanOrder(scanner interface{ Scan(...any) error }) (domain.TokenOrder, error) {
	var v domain.TokenOrder
	var invoice, deleted sql.NullString
	err := scanner.Scan(&v.ID, &v.OrderNo, &v.AmountCent, &v.PaymentType, &v.ProviderID, &invoice, &v.CreatedAt, &v.UpdatedAt, &deleted)
	if invoice.Valid {
		v.InvoiceID = &invoice.String
	}
	if deleted.Valid {
		v.DeletedAt = &deleted.String
	}
	return v, err
}
func (s *Store) ListOrders(ctx context.Context) ([]domain.TokenOrder, error) {
	return s.queryOrders(ctx, `select id,order_no,amount_cent,payment_type,provider_id,invoice_id,created_at,updated_at,deleted_at from token_order order by updated_at desc`)
}
func (s *Store) OrdersByInvoice(ctx context.Context, id string) ([]domain.TokenOrder, error) {
	return s.queryOrders(ctx, `select id,order_no,amount_cent,payment_type,provider_id,invoice_id,created_at,updated_at,deleted_at from token_order where invoice_id=? order by updated_at`, id)
}
func (s *Store) OrdersByIDs(ctx context.Context, ids []string) ([]domain.TokenOrder, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	return s.queryOrders(ctx, `select id,order_no,amount_cent,payment_type,provider_id,invoice_id,created_at,updated_at,deleted_at from token_order where id in (`+placeholders(len(ids))+`)`, args(ids)...)
}
func (s *Store) ActiveOrdersByIDs(ctx context.Context, ids []string) ([]domain.TokenOrder, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	return s.queryOrders(ctx, `select id,order_no,amount_cent,payment_type,provider_id,invoice_id,created_at,updated_at,deleted_at from token_order where deleted_at is null and id in (`+placeholders(len(ids))+`)`, args(ids)...)
}
func (s *Store) queryOrders(ctx context.Context, q string, a ...any) ([]domain.TokenOrder, error) {
	rows, err := s.db.QueryContext(ctx, q, a...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.TokenOrder
	for rows.Next() {
		v, err := scanOrder(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
func (s *Store) Order(ctx context.Context, id string) (domain.TokenOrder, error) {
	return scanOrder(s.db.QueryRowContext(ctx, `select id,order_no,amount_cent,payment_type,provider_id,invoice_id,created_at,updated_at,deleted_at from token_order where id=?`, id))
}
func (s *Store) InsertOrder(ctx context.Context, v domain.TokenOrder) error {
	_, err := s.db.ExecContext(ctx, `insert into token_order(id,order_no,amount_cent,payment_type,provider_id,invoice_id,created_at,updated_at,deleted_at) values(?,?,?,?,?,?,?,?,?)`, v.ID, v.OrderNo, v.AmountCent, v.PaymentType, v.ProviderID, nullString(v.InvoiceID), v.CreatedAt, v.UpdatedAt, nullString(v.DeletedAt))
	return err
}
func (s *Store) UpdateOrder(ctx context.Context, v domain.TokenOrder) error {
	_, err := s.db.ExecContext(ctx, `update token_order set order_no=?,amount_cent=?,payment_type=?,provider_id=?,invoice_id=?,updated_at=?,deleted_at=? where id=?`, v.OrderNo, v.AmountCent, v.PaymentType, v.ProviderID, nullString(v.InvoiceID), v.UpdatedAt, nullString(v.DeletedAt), v.ID)
	return err
}
func (s *Store) RecoverOrders(ctx context.Context, ids []string, updated string) error {
	if len(ids) == 0 {
		return nil
	}
	a := append([]any{updated}, args(ids)...)
	_, err := s.db.ExecContext(ctx, `update token_order set deleted_at=null,updated_at=? where deleted_at is not null and id in (`+placeholders(len(ids))+`)`, a...)
	return err
}
func (s *Store) DeleteOrders(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `delete from token_order where id in (`+placeholders(len(ids))+`)`, args(ids)...)
	return err
}
func (s *Store) SetOrderInvoice(ctx context.Context, ids []string, invoiceID, updated string) error {
	if len(ids) == 0 {
		return nil
	}
	a := []any{invoiceID, updated}
	a = append(a, args(ids)...)
	result, err := s.db.ExecContext(ctx, `update token_order set invoice_id=?,updated_at=? where invoice_id is null and deleted_at is null and id in (`+placeholders(len(ids))+`)`, a...)
	if err != nil {
		return err
	}
	count, _ := result.RowsAffected()
	if count != int64(len(ids)) {
		return fmt.Errorf("updated %d of %d orders", count, len(ids))
	}
	return nil
}
func (s *Store) CancelInvoice(ctx context.Context, id, updated string) error {
	_, err := s.db.ExecContext(ctx, `update token_order set invoice_id=null,updated_at=? where invoice_id=?`, updated, id)
	return err
}

func scanInvoice(scanner interface{ Scan(...any) error }) (domain.Invoice, error) {
	var v domain.Invoice
	err := scanner.Scan(&v.ID, &v.InvoiceNo, &v.TotalAmountCent, &v.InvoiceDate, &v.InvoiceTitleID, &v.Status, &v.CreatedAt, &v.UpdatedAt)
	return v, err
}
func (s *Store) ListInvoices(ctx context.Context) ([]domain.Invoice, error) {
	rows, err := s.db.QueryContext(ctx, `select id,invoice_no,total_amount_cent,invoice_date,invoice_title_id,status,created_at,updated_at from invoice order by updated_at desc`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Invoice
	for rows.Next() {
		v, err := scanInvoice(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
func (s *Store) Invoice(ctx context.Context, id string) (domain.Invoice, error) {
	return scanInvoice(s.db.QueryRowContext(ctx, `select id,invoice_no,total_amount_cent,invoice_date,invoice_title_id,status,created_at,updated_at from invoice where id=?`, id))
}
func (s *Store) InsertInvoice(ctx context.Context, v domain.Invoice) error {
	_, err := s.db.ExecContext(ctx, `insert into invoice(id,invoice_no,total_amount_cent,invoice_date,invoice_title_id,status,created_at,updated_at) values(?,?,?,?,?,?,?,?)`, v.ID, v.InvoiceNo, v.TotalAmountCent, v.InvoiceDate, v.InvoiceTitleID, v.Status, v.CreatedAt, v.UpdatedAt)
	return err
}
func (s *Store) UpdateInvoice(ctx context.Context, v domain.Invoice) error {
	_, err := s.db.ExecContext(ctx, `update invoice set invoice_no=?,total_amount_cent=?,invoice_date=?,invoice_title_id=?,status=?,updated_at=? where id=?`, v.InvoiceNo, v.TotalAmountCent, v.InvoiceDate, v.InvoiceTitleID, v.Status, v.UpdatedAt, v.ID)
	return err
}
