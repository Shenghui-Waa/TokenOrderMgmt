-- 启用外键约束
PRAGMA foreign_keys = ON;

-- 1. invoice_title 表
CREATE TABLE IF NOT EXISTS "invoice_title" (
    "id"            TEXT PRIMARY KEY,
    "title_type"    TEXT,
    "name"          TEXT,
    "tax_code"      TEXT,
    "created_at"    TEXT,
    "updated_at"    TEXT
);

-- 2. provider 表
CREATE TABLE IF NOT EXISTS "provider" (
    "id"         TEXT PRIMARY KEY,
    "name"       TEXT,
    "website"    TEXT,
    "created_at" TEXT,
    "updated_at" TEXT
);

-- 3. invoice 表，依赖 invoice_title
CREATE TABLE IF NOT EXISTS "invoice" (
    "id"                TEXT PRIMARY KEY,
    "invoice_no"        TEXT,
    "total_amount_cent" INTEGER,
    "invoice_date"      TEXT,
    "invoice_title_id"  TEXT,
    "status"            TEXT,
    "created_at"        TEXT,
    "updated_at"        TEXT,
    FOREIGN KEY ("invoice_title_id") REFERENCES "invoice_title" ("id")
);

-- 4. token_order 表，依赖 provider 和 invoice
CREATE TABLE IF NOT EXISTS "token_order" (
    "id"             TEXT PRIMARY KEY,
    "order_no"       TEXT,
    "amount_cent"    INTEGER,
    "payment_type"   TEXT,
    "provider_id"    TEXT,
    "invoice_id"     TEXT,
    "created_at"     TEXT,
    "updated_at"     TEXT,
    "deleted_at"     TEXT,
    FOREIGN KEY ("provider_id") REFERENCES "provider" ("id"),
    FOREIGN KEY ("invoice_id") REFERENCES "invoice" ("id")
);