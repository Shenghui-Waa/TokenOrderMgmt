package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"token-order-mgmt-desktop/internal/binding"
	"token-order-mgmt-desktop/internal/domain"
	"token-order-mgmt-desktop/internal/repository"
)

type Service struct {
	db   *sql.DB
	repo *repository.Store
	now  func() time.Time
}

func New(db *sql.DB) *Service                  { return &Service{db: db, repo: repository.New(db), now: time.Now} }
func (s *Service) Close(context.Context) error { return s.db.Close() }
func (s *Service) transaction(ctx context.Context, fn func(*repository.Store) error) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if err = fn(s.repo.With(tx)); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}
func missing(err error, message string) error {
	if errors.Is(err, sql.ErrNoRows) {
		return domain.NewError(domain.CodeNotFound, message)
	}
	return err
}
func nowText(s *Service) string { return domain.FormatTime(s.now()) }
func toProvider(v domain.Provider) binding.Provider {
	return binding.Provider{ID: v.ID, Name: v.Name, Website: v.Website}
}
func toTitle(v domain.InvoiceTitle) binding.InvoiceTitle {
	return binding.InvoiceTitle{ID: v.ID, Name: v.Name, TitleType: binding.TitleType(v.TitleType), TaxCode: v.TaxCode}
}

func (s *Service) LoadData(ctx context.Context) (binding.DataSet, error) {
	providers, err := s.repo.ListProviders(ctx)
	if err != nil {
		return binding.DataSet{}, err
	}
	titles, err := s.repo.ListTitles(ctx)
	if err != nil {
		return binding.DataSet{}, err
	}
	orders, err := s.repo.ListOrders(ctx)
	if err != nil {
		return binding.DataSet{}, err
	}
	invoices, err := s.repo.ListInvoices(ctx)
	if err != nil {
		return binding.DataSet{}, err
	}
	out := binding.DataSet{Providers: make([]binding.Provider, 0, len(providers)), Titles: make([]binding.InvoiceTitle, 0, len(titles)), Orders: make([]binding.TokenOrder, 0, len(orders)), Invoices: make([]binding.Invoice, 0, len(invoices))}
	for _, v := range providers {
		out.Providers = append(out.Providers, toProvider(v))
	}
	for _, v := range titles {
		out.Titles = append(out.Titles, toTitle(v))
	}
	for _, v := range orders {
		x, err := s.orderView(ctx, s.repo, v)
		if err != nil {
			return binding.DataSet{}, err
		}
		out.Orders = append(out.Orders, x)
	}
	for _, v := range invoices {
		x, err := s.invoiceView(ctx, s.repo, v)
		if err != nil {
			return binding.DataSet{}, err
		}
		out.Invoices = append(out.Invoices, x)
	}
	return out, nil
}
func (s *Service) GetProvider(ctx context.Context, id string) (binding.Provider, error) {
	v, err := s.repo.Provider(ctx, id)
	if err != nil {
		return binding.Provider{}, missing(err, "Provider not found")
	}
	return toProvider(v), nil
}
func (s *Service) SaveProvider(ctx context.Context, input binding.ProviderInput) (binding.Provider, error) {
	name := strings.TrimSpace(input.Name)
	var result domain.Provider
	err := s.transaction(ctx, func(r *repository.Store) error {
		if input.ID == "" {
			if _, err := r.ProviderByName(ctx, name); err == nil {
				return domain.NewError(domain.CodeError, "There has been a provider named "+name)
			} else if !errors.Is(err, sql.ErrNoRows) {
				return err
			}
			id, err := domain.NewID()
			if err != nil {
				return err
			}
			now := nowText(s)
			result = domain.Provider{ID: id, Name: name, Website: input.Website, CreatedAt: now, UpdatedAt: now}
			return r.InsertProvider(ctx, result)
		}
		current, err := r.Provider(ctx, input.ID)
		if err != nil {
			return missing(err, "The provider does not exist")
		}
		if name != current.Name {
			other, err := r.ProviderByName(ctx, name)
			if err == nil && other.ID != current.ID {
				return domain.NewError(domain.CodeError, "The provider ["+name+"] already exists")
			}
			if err != nil && !errors.Is(err, sql.ErrNoRows) {
				return err
			}
		}
		current.Name = name
		current.Website = input.Website
		current.UpdatedAt = nowText(s)
		result = current
		return r.UpdateProvider(ctx, current)
	})
	return toProvider(result), err
}
func (s *Service) DeleteProviders(ctx context.Context, ids []string) error {
	return s.repo.DeleteProviders(ctx, ids)
}
func (s *Service) GetInvoiceTitle(ctx context.Context, id string) (binding.InvoiceTitle, error) {
	v, err := s.repo.Title(ctx, id)
	if err != nil {
		return binding.InvoiceTitle{}, missing(err, "Invoice Title not found")
	}
	return toTitle(v), nil
}
func (s *Service) SaveInvoiceTitle(ctx context.Context, input binding.InvoiceTitleInput) (binding.InvoiceTitle, error) {
	name := strings.TrimSpace(input.Name)
	var result domain.InvoiceTitle
	err := s.transaction(ctx, func(r *repository.Store) error {
		tax := input.TaxCode
		var taxPtr *string
		if tax != "" {
			taxPtr = &tax
		}
		if input.ID == "" {
			if _, err := r.TitleByName(ctx, name); err == nil {
				return domain.NewError(domain.CodeError, "There has been a invoice title named "+name)
			} else if !errors.Is(err, sql.ErrNoRows) {
				return err
			}
			id, err := domain.NewID()
			if err != nil {
				return err
			}
			now := nowText(s)
			result = domain.InvoiceTitle{ID: id, TitleType: string(input.TitleType), Name: name, TaxCode: taxPtr, CreatedAt: now, UpdatedAt: now}
			return r.InsertTitle(ctx, result)
		}
		current, err := r.Title(ctx, input.ID)
		if err != nil {
			return missing(err, "The invoice title does not exist")
		}
		if name != current.Name {
			other, err := r.TitleByName(ctx, name)
			if err == nil && other.ID != current.ID {
				return domain.NewError(domain.CodeError, "The invoice title ["+name+"] already exists")
			}
			if err != nil && !errors.Is(err, sql.ErrNoRows) {
				return err
			}
		}
		current.TitleType = string(input.TitleType)
		current.Name = name
		current.TaxCode = taxPtr
		current.UpdatedAt = nowText(s)
		result = current
		return r.UpdateTitle(ctx, current)
	})
	return toTitle(result), err
}
func (s *Service) DeleteInvoiceTitles(ctx context.Context, ids []string) error {
	return s.repo.DeleteTitles(ctx, ids)
}

func (s *Service) orderView(ctx context.Context, r *repository.Store, v domain.TokenOrder) (binding.TokenOrder, error) {
	p, err := r.Provider(ctx, v.ProviderID)
	if err != nil {
		return binding.TokenOrder{}, err
	}
	name := p.Name
	out := binding.TokenOrder{ID: v.ID, OrderNo: v.OrderNo, AmountCent: v.AmountCent, PaymentType: binding.PaymentType(v.PaymentType), ProviderID: v.ProviderID, ProviderName: &name, InvoiceID: v.InvoiceID, InvoiceStatus: domain.Uninvoiced, UpdatedAt: &v.UpdatedAt}
	if v.DeletedAt != nil {
		out.Deleted = 1
	}
	if v.InvoiceID != nil {
		out.InvoiceStatus = domain.Invoiced
		invoice, err := r.Invoice(ctx, *v.InvoiceID)
		if err != nil {
			return binding.TokenOrder{}, err
		}
		title, err := r.Title(ctx, invoice.InvoiceTitleID)
		if err != nil {
			return binding.TokenOrder{}, err
		}
		kind := binding.TitleType(title.TitleType)
		out.InvoiceType = &kind
	}
	return out, nil
}
func (s *Service) GetTokenOrder(ctx context.Context, id string) (binding.TokenOrder, error) {
	v, err := s.repo.Order(ctx, id)
	if err != nil {
		return binding.TokenOrder{}, missing(err, "The token order does not exist")
	}
	return s.orderView(ctx, s.repo, v)
}
func (s *Service) GetInvoiceOrders(ctx context.Context, id string) ([]binding.TokenOrder, error) {
	items, err := s.repo.OrdersByInvoice(ctx, id)
	if err != nil {
		return nil, err
	}
	out := make([]binding.TokenOrder, 0, len(items))
	for _, v := range items {
		x, err := s.orderView(ctx, s.repo, v)
		if err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, nil
}
func (s *Service) SaveTokenOrder(ctx context.Context, input binding.TokenOrderInput) (binding.TokenOrder, error) {
	amount, err := domain.ParseAmountCent(input.Amount)
	if err != nil {
		return binding.TokenOrder{}, err
	}
	var result domain.TokenOrder
	err = s.transaction(ctx, func(r *repository.Store) error {
		if input.ID == "" {
			id, err := domain.NewID()
			if err != nil {
				return err
			}
			now := nowText(s)
			result = domain.TokenOrder{ID: id, OrderNo: input.OrderNo, AmountCent: amount, PaymentType: string(input.PaymentType), ProviderID: input.ProviderID, CreatedAt: now, UpdatedAt: now}
			return r.InsertOrder(ctx, result)
		}
		current, err := r.Order(ctx, input.ID)
		if err != nil {
			return missing(err, "The token order does not exist")
		}
		current.OrderNo = input.OrderNo
		if current.InvoiceID != nil {
			return domain.NewError(domain.CodeForbidden, "The token order amount cannot be changed.")
		}
		current.AmountCent = amount
		current.PaymentType = string(input.PaymentType)
		current.ProviderID = input.ProviderID
		current.UpdatedAt = nowText(s)
		result = current
		return r.UpdateOrder(ctx, current)
	})
	if err != nil {
		return binding.TokenOrder{}, err
	}
	return s.orderView(ctx, s.repo, result)
}
func (s *Service) TrashTokenOrders(ctx context.Context, ids []string) error {
	return s.transaction(ctx, func(r *repository.Store) error {
		items, err := r.ActiveOrdersByIDs(ctx, ids)
		if err != nil {
			return err
		}
		now := nowText(s)
		for _, v := range items {
			if v.InvoiceID != nil {
				return domain.NewError(domain.CodeForbidden, "The token order cannot be deleted.")
			}
			v.DeletedAt = &now
			v.UpdatedAt = now
			if err := r.UpdateOrder(ctx, v); err != nil {
				return err
			}
		}
		return nil
	})
}
func (s *Service) RecoverTokenOrders(ctx context.Context, ids []string) error {
	return s.repo.RecoverOrders(ctx, ids, nowText(s))
}
func (s *Service) DeleteTokenOrders(ctx context.Context, ids []string) error {
	return s.transaction(ctx, func(r *repository.Store) error {
		items, err := r.OrdersByIDs(ctx, ids)
		if err != nil {
			return err
		}
		for _, v := range items {
			if v.InvoiceID != nil {
				return domain.NewError(domain.CodeForbidden, "The token order cannot be deleted.")
			}
		}
		return r.DeleteOrders(ctx, ids)
	})
}

func (s *Service) invoiceView(ctx context.Context, r *repository.Store, v domain.Invoice) (binding.Invoice, error) {
	title, err := r.Title(ctx, v.InvoiceTitleID)
	if err != nil {
		return binding.Invoice{}, err
	}
	updated := v.UpdatedAt
	return binding.Invoice{ID: v.ID, InvoiceNo: v.InvoiceNo, TotalAmountCent: v.TotalAmountCent, InvoiceDate: v.InvoiceDate, InvoiceType: binding.TitleType(title.TitleType), InvoiceTitleID: v.InvoiceTitleID, InvoiceTitle: title.Name, Status: binding.InvoiceStatus(v.Status), UpdatedAt: &updated}, nil
}
func (s *Service) GetInvoice(ctx context.Context, id string) (binding.Invoice, error) {
	v, err := s.repo.Invoice(ctx, id)
	if err != nil {
		return binding.Invoice{}, missing(err, "The invoice does not exist")
	}
	return s.invoiceView(ctx, s.repo, v)
}
func unique(ids []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}
func (s *Service) CreateInvoice(ctx context.Context, input binding.InvoiceInput, ids []string) (binding.Invoice, error) {
	if err := domain.ValidateDate(input.InvoiceDate, s.now()); err != nil {
		return binding.Invoice{}, err
	}
	ids = unique(ids)
	if len(ids) == 0 {
		return binding.Invoice{}, domain.NewError(domain.CodeForbidden, "The batch id is empty")
	}
	var result domain.Invoice
	err := s.transaction(ctx, func(r *repository.Store) error {
		if _, err := r.Title(ctx, input.InvoiceTitleID); err != nil {
			return missing(err, "The invoice title does not exist")
		}
		items, err := r.OrdersByIDs(ctx, ids)
		if err != nil {
			return err
		}
		if len(items) != len(ids) {
			return domain.NewError(domain.CodeNotFound, "Some token orders do not exist")
		}
		var total int64
		for _, v := range items {
			if v.DeletedAt != nil || v.InvoiceID != nil {
				return domain.NewError(domain.CodeForbidden, "The token order is disabled")
			}
			if v.AmountCent <= 0 {
				return domain.NewError(domain.CodeForbidden, "The amount cent is invalid")
			}
			total, err = domain.AddAmount(total, v.AmountCent)
			if err != nil {
				return err
			}
		}
		id, err := domain.NewID()
		if err != nil {
			return err
		}
		now := nowText(s)
		result = domain.Invoice{ID: id, InvoiceNo: input.InvoiceNo, TotalAmountCent: total, InvoiceDate: input.InvoiceDate, InvoiceTitleID: input.InvoiceTitleID, Status: domain.InvoiceValid, CreatedAt: now, UpdatedAt: now}
		if err := r.InsertInvoice(ctx, result); err != nil {
			return err
		}
		return r.SetOrderInvoice(ctx, ids, id, now)
	})
	if err != nil {
		return binding.Invoice{}, err
	}
	return s.invoiceView(ctx, s.repo, result)
}
func (s *Service) VoidInvoice(ctx context.Context, id string) error {
	return s.transaction(ctx, func(r *repository.Store) error {
		v, err := r.Invoice(ctx, id)
		if err != nil {
			return missing(err, "The invoice does not exist")
		}
		now := nowText(s)
		if err := r.CancelInvoice(ctx, id, now); err != nil {
			return err
		}
		v.Status = domain.InvoiceInvalid
		v.UpdatedAt = now
		return r.UpdateInvoice(ctx, v)
	})
}

var _ binding.Service = (*Service)(nil)

func (s *Service) String() string { return fmt.Sprintf("Service(%p)", s.db) }
