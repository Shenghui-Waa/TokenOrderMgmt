PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "invoice_title" (
    "id" TEXT PRIMARY KEY,
    "title_type" TEXT,
    "name" TEXT,
    "tax_code" TEXT,
    "created_at" TEXT,
    "updated_at" TEXT
);

CREATE TABLE IF NOT EXISTS "provider" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "website" TEXT,
    "created_at" TEXT,
    "updated_at" TEXT
);

CREATE TABLE IF NOT EXISTS "invoice" (
    "id" TEXT PRIMARY KEY,
    "invoice_no" TEXT,
    "total_amount_cent" INTEGER,
    "invoice_date" TEXT,
    "invoice_title_id" TEXT,
    "status" TEXT,
    "created_at" TEXT,
    "updated_at" TEXT,
    FOREIGN KEY ("invoice_title_id") REFERENCES "invoice_title" ("id")
);

CREATE TABLE IF NOT EXISTS "token_order" (
    "id" TEXT PRIMARY KEY,
    "order_no" TEXT,
    "amount_cent" INTEGER,
    "payment_type" TEXT,
    "provider_id" TEXT,
    "invoice_id" TEXT,
    "created_at" TEXT,
    "updated_at" TEXT,
    "deleted_at" TEXT,
    FOREIGN KEY ("provider_id") REFERENCES "provider" ("id"),
    FOREIGN KEY ("invoice_id") REFERENCES "invoice" ("id")
);
