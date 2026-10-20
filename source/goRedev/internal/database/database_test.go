package database

import (
	"context"
	"path/filepath"
	"testing"
)

func TestOpenCreatesCompatibleSchema(t *testing.T) {
	db, err := Open(context.Background(), filepath.Join(t.TempDir(), "data", "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var count int
	if err := db.QueryRow(`select count(*) from sqlite_master where type='table' and name in ('provider','invoice_title','invoice','token_order')`).Scan(&count); err != nil || count != 4 {
		t.Fatalf("tables=%d err=%v", count, err)
	}
	var enabled int
	_ = db.QueryRow("PRAGMA foreign_keys").Scan(&enabled)
	if enabled != 1 {
		t.Fatal("foreign keys disabled")
	}
}
