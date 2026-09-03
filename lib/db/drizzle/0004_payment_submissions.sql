CREATE TABLE IF NOT EXISTS "payment_submissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "subscription_id" integer REFERENCES "billing_subscriptions"("id") ON DELETE set null,
  "amount" numeric(12, 2) NOT NULL,
  "currency" text DEFAULT 'INR' NOT NULL,
  "payment_method" text DEFAULT 'razorpay_upi' NOT NULL,
  "utr" text NOT NULL,
  "paid_at" timestamp NOT NULL,
  "proof_data" text,
  "proof_file_name" text,
  "notes" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "reviewed_by" integer,
  "reviewed_at" timestamp,
  "rejection_reason" text,
  "billing_invoice_id" integer REFERENCES "billing_invoices"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "payment_submissions_org_utr_unique" UNIQUE("org_id", "utr")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_submissions_status_idx" ON "payment_submissions" ("status", "created_at");