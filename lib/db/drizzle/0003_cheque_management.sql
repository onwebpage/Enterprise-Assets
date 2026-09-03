CREATE TABLE IF NOT EXISTS "cheque_books" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade,
  "bank_account_id" integer NOT NULL REFERENCES "bank_accounts"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "prefix" text,
  "start_number" integer NOT NULL,
  "end_number" integer NOT NULL,
  "next_number" integer NOT NULL,
  "issue_date" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "notes" text,
  "created_by" integer REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cheques" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade,
  "bank_account_id" integer NOT NULL REFERENCES "bank_accounts"("id") ON DELETE cascade,
  "cheque_book_id" integer REFERENCES "cheque_books"("id") ON DELETE set null,
  "cheque_number" text NOT NULL,
  "direction" text NOT NULL,
  "issue_date" text NOT NULL,
  "cheque_date" text NOT NULL,
  "party_name" text NOT NULL,
  "amount" numeric(15, 2) NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "cleared_date" text,
  "bounced_date" text,
  "bounce_reason" text,
  "reference" text,
  "notes" text,
  "journal_entry_id" integer,
  "created_by" integer REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "cheques_org_account_number_direction_unique" UNIQUE("org_id", "bank_account_id", "cheque_number", "direction")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cheques_org_status_idx" ON "cheques" ("org_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cheques_account_date_idx" ON "cheques" ("bank_account_id", "cheque_date");
