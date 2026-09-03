CREATE TABLE IF NOT EXISTS "bank_statement_imports" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade,
  "bank_account_id" integer NOT NULL REFERENCES "bank_accounts"("id") ON DELETE cascade,
  "file_name" text NOT NULL,
  "statement_date" text,
  "transaction_count" integer DEFAULT 0 NOT NULL,
  "imported_by" integer REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "import_id" integer REFERENCES "bank_statement_imports"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "matched_journal_entry_id" integer;
--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN IF NOT EXISTS "match_confidence" numeric(5, 2);