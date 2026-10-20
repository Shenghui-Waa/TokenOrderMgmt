package database

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

const Schema = `PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS "invoice_title" ("id" TEXT PRIMARY KEY, "title_type" TEXT, "name" TEXT, "tax_code" TEXT, "created_at" TEXT, "updated_at" TEXT);
CREATE TABLE IF NOT EXISTS "provider" ("id" TEXT PRIMARY KEY, "name" TEXT, "website" TEXT, "created_at" TEXT, "updated_at" TEXT);
CREATE TABLE IF NOT EXISTS "invoice" ("id" TEXT PRIMARY KEY, "invoice_no" TEXT, "total_amount_cent" INTEGER, "invoice_date" TEXT, "invoice_title_id" TEXT, "status" TEXT, "created_at" TEXT, "updated_at" TEXT, FOREIGN KEY ("invoice_title_id") REFERENCES "invoice_title" ("id"));
CREATE TABLE IF NOT EXISTS "token_order" ("id" TEXT PRIMARY KEY, "order_no" TEXT, "amount_cent" INTEGER, "payment_type" TEXT, "provider_id" TEXT, "invoice_id" TEXT, "created_at" TEXT, "updated_at" TEXT, "deleted_at" TEXT, FOREIGN KEY ("provider_id") REFERENCES "provider" ("id"), FOREIGN KEY ("invoice_id") REFERENCES "invoice" ("id"));`

func Open(ctx context.Context, path string) (*sql.DB, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("create database directory: %w", err)
	}
	values := url.Values{}
	values.Set("_pragma", "foreign_keys(1)")
	values.Add("_pragma", "busy_timeout(5000)")
	db, err := sql.Open("sqlite", "file:"+filepath.ToSlash(path)+"?"+values.Encode())
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("open database: %w", err)
	}
	if _, err := db.ExecContext(ctx, Schema); err != nil {
		db.Close()
		return nil, fmt.Errorf("initialize schema: %w", err)
	}
	var enabled int
	if err := db.QueryRowContext(ctx, "PRAGMA foreign_keys").Scan(&enabled); err != nil || enabled != 1 {
		db.Close()
		return nil, fmt.Errorf("foreign keys are not enabled")
	}
	var check string
	if err := db.QueryRowContext(ctx, "PRAGMA quick_check").Scan(&check); err != nil || check != "ok" {
		db.Close()
		return nil, fmt.Errorf("database integrity check failed: %s", check)
	}
	return db, nil
}
