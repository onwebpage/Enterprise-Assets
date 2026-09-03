CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" text NOT NULL,
	"legal_name" text,
	"tax_id" text,
	"industry" text,
	"founded_year" integer,
	"employee_count" integer DEFAULT 0,
	"logo_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"currency" text DEFAULT 'USD',
	"fiscal_year_start" text DEFAULT 'Jan',
	"type" text DEFAULT 'Parent',
	"country" text,
	"gstin" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "tenants" ("name") SELECT "name" FROM "organizations";
--> statement-breakpoint
UPDATE "organizations" SET "tenant_id" = "organizations"."id";
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"country" text,
	"postal_code" text,
	"phone" text,
	"type" text DEFAULT 'Branch' NOT NULL,
	"is_headquarters" boolean DEFAULT false NOT NULL,
	"employee_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"name" text NOT NULL,
	"head_name" text,
	"budget" text,
	"cost_center" text,
	"employee_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"module" text NOT NULL,
	"can_view" boolean DEFAULT false NOT NULL,
	"can_create" boolean DEFAULT false NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"user_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"branch_id" integer,
	"dept_id" integer,
	"role_id" integer,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "finance_monthly_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"year" integer NOT NULL,
	"revenue" numeric(10, 3) NOT NULL,
	"cogs" numeric(10, 3) NOT NULL,
	"gross" numeric(10, 3) NOT NULL,
	"opex" numeric(10, 3) NOT NULL,
	"net" numeric(10, 3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"direction" text NOT NULL,
	"category" text NOT NULL,
	"reference" text,
	"transacted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"normal_balance" text NOT NULL,
	"parent_id" integer,
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"entry_number" text NOT NULL,
	"date" text NOT NULL,
	"reference" text,
	"memo" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_debit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_credit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entry_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"journal_entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"description" text,
	"debit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"credit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ar_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"country" text,
	"tax_id" text,
	"credit_limit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ar_invoice_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 4) DEFAULT '1' NOT NULL,
	"unit_price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ar_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"customer_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"issue_date" text NOT NULL,
	"due_date" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(15, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ar_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"invoice_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"payment_date" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"method" text DEFAULT 'bank_transfer' NOT NULL,
	"reference" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ap_bill_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 4) DEFAULT '1' NOT NULL,
	"unit_price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ap_bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"vendor_id" integer NOT NULL,
	"bill_number" text NOT NULL,
	"issue_date" text NOT NULL,
	"due_date" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(15, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ap_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"bill_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"payment_date" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"method" text DEFAULT 'bank_transfer' NOT NULL,
	"reference" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ap_vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"country" text,
	"tax_id" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"payment_terms" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"name" text NOT NULL,
	"account_number" text,
	"bank_name" text,
	"bank_branch" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"current_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"account_type" text DEFAULT 'checking' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_reconciliation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"reconciliation_id" integer NOT NULL,
	"transaction_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_reconciliations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"bank_account_id" integer NOT NULL,
	"statement_date" text NOT NULL,
	"opening_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"closing_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"reconciled_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"difference" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" integer,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"bank_account_id" integer NOT NULL,
	"transaction_date" text NOT NULL,
	"description" text NOT NULL,
	"reference" text,
	"amount" numeric(15, 2) NOT NULL,
	"type" text DEFAULT 'credit' NOT NULL,
	"category" text,
	"status" text DEFAULT 'unreconciled' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_depreciation_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"org_id" integer,
	"period_date" text NOT NULL,
	"depreciation_amount" numeric(15, 2) NOT NULL,
	"accumulated_depreciation" numeric(15, 2) NOT NULL,
	"book_value" numeric(15, 2) NOT NULL,
	"posted" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"asset_number" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"description" text,
	"purchase_date" text NOT NULL,
	"purchase_cost" numeric(15, 2) DEFAULT '0' NOT NULL,
	"salvage_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"useful_life_months" integer DEFAULT 60 NOT NULL,
	"depreciation_method" text DEFAULT 'straight_line' NOT NULL,
	"accumulated_depreciation" numeric(15, 2) DEFAULT '0' NOT NULL,
	"current_book_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"location" text,
	"serial_number" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gst_return_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_id" integer NOT NULL,
	"org_id" integer,
	"entry_type" text DEFAULT 'b2b' NOT NULL,
	"invoice_number" text,
	"invoice_date" text,
	"party_gstin" text,
	"party_name" text,
	"place_of_supply" text,
	"taxable_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"cgst_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sgst_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"igst_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"cess_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_tax" numeric(15, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gst_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"return_type" text NOT NULL,
	"period" text NOT NULL,
	"due_date" text NOT NULL,
	"submission_date" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"gstin" text,
	"total_taxable_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_cgst" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_sgst" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_igst" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_cess" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_tax_liability" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_itc" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_payable" numeric(15, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"payment_type" text DEFAULT 'gst' NOT NULL,
	"period" text NOT NULL,
	"payment_date" text NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"cgst" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sgst" numeric(15, 2) DEFAULT '0' NOT NULL,
	"igst" numeric(15, 2) DEFAULT '0' NOT NULL,
	"cess" numeric(15, 2) DEFAULT '0' NOT NULL,
	"interest" numeric(15, 2) DEFAULT '0' NOT NULL,
	"penalty" numeric(15, 2) DEFAULT '0' NOT NULL,
	"challan_number" text,
	"bank_reference" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"name" text NOT NULL,
	"type" text DEFAULT 'cgst' NOT NULL,
	"rate" numeric(8, 4) DEFAULT '0' NOT NULL,
	"hsn_sac_code" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tds_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"entry_type" text DEFAULT 'tds' NOT NULL,
	"section" text NOT NULL,
	"party_name" text NOT NULL,
	"party_pan" text,
	"transaction_date" text NOT NULL,
	"gross_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"deposit_date" text,
	"challan_number" text,
	"assessment_year" text,
	"status" text DEFAULT 'deducted' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "einv_buyers" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"name" text NOT NULL,
	"gstin" text,
	"pan" text,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"pincode" text,
	"country" text DEFAULT 'India' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "einv_invoice_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"description" text NOT NULL,
	"hsn_code" text,
	"quantity" numeric(12, 4) DEFAULT '1' NOT NULL,
	"unit_price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"taxable_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"cgst_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cgst_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sgst_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"sgst_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"igst_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"igst_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"cess_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cess_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "einv_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"invoice_number" text NOT NULL,
	"invoice_type" text DEFAULT 'B2B' NOT NULL,
	"supply_type" text DEFAULT 'regular' NOT NULL,
	"buyer_id" integer,
	"issue_date" text NOT NULL,
	"place_of_supply" text,
	"irn" text,
	"ack_number" text,
	"ack_date" text,
	"qr_code" text,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_taxable" numeric(15, 2) DEFAULT '0' NOT NULL,
	"cgst_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sgst_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"igst_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"cess_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"cancel_reason" text,
	"cancelled_at" timestamp,
	"rejection_reason" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eway_bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"ewb_number" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"supply_type" text DEFAULT 'outward' NOT NULL,
	"supply_sub_type" text DEFAULT 'supply' NOT NULL,
	"doc_type" text DEFAULT 'tax_invoice' NOT NULL,
	"doc_number" text NOT NULL,
	"doc_date" text NOT NULL,
	"from_gstin" text,
	"from_trade_name" text NOT NULL,
	"from_address1" text,
	"from_address2" text,
	"from_place" text,
	"from_pincode" text,
	"from_state" text,
	"to_gstin" text,
	"to_trade_name" text NOT NULL,
	"to_address1" text,
	"to_address2" text,
	"to_place" text,
	"to_pincode" text,
	"to_state" text,
	"place_of_delivery" text,
	"product_name" text NOT NULL,
	"product_desc" text,
	"hsn_code" text,
	"quantity" numeric(15, 4) DEFAULT '0' NOT NULL,
	"unit" text,
	"total_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"taxable_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"cgst_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
	"sgst_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
	"igst_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
	"cess_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
	"cgst_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sgst_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"igst_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"cess_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"transport_mode" text DEFAULT 'road' NOT NULL,
	"transporter_id" text,
	"transporter_name" text,
	"vehicle_number" text,
	"vehicle_type" text DEFAULT 'regular',
	"distance" integer,
	"valid_from" text,
	"valid_upto" text,
	"cancel_reason" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"grn_id" integer NOT NULL,
	"po_line_id" integer NOT NULL,
	"description" text NOT NULL,
	"ordered_qty" numeric(12, 4) DEFAULT '0' NOT NULL,
	"received_qty" numeric(12, 4) DEFAULT '0' NOT NULL,
	"accepted_qty" numeric(12, 4) DEFAULT '0' NOT NULL,
	"rejected_qty" numeric(12, 4) DEFAULT '0' NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"notes" text,
	"sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"po_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"grn_number" text NOT NULL,
	"receipt_date" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"po_id" integer NOT NULL,
	"item_code" text,
	"description" text NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"quantity" numeric(12, 4) DEFAULT '1' NOT NULL,
	"unit_price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(8, 4) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"received_qty" numeric(12, 4) DEFAULT '0' NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"vendor_id" integer NOT NULL,
	"po_number" text NOT NULL,
	"order_date" text NOT NULL,
	"expected_delivery" text,
	"delivery_address" text,
	"currency" text DEFAULT 'INR' NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"terms_conditions" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_rfqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"vendor_id" integer,
	"rfq_number" text NOT NULL,
	"rfq_date" text NOT NULL,
	"due_date" text,
	"items_description" text,
	"estimated_value" numeric(15, 2),
	"status" text DEFAULT 'draft' NOT NULL,
	"converted_po_id" integer,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"code" text,
	"name" text NOT NULL,
	"category" text DEFAULT 'goods' NOT NULL,
	"gstin" text,
	"pan" text,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'India' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"payment_terms" text,
	"credit_limit" numeric(15, 2),
	"status" text DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"movement_number" text NOT NULL,
	"product_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"movement_type" text NOT NULL,
	"qty" numeric(15, 4) NOT NULL,
	"reference" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category_id" integer,
	"unit" text DEFAULT 'each' NOT NULL,
	"cost_price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"selling_price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"reorder_point" integer DEFAULT 0 NOT NULL,
	"reorder_qty" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_stock_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"product_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"qty_on_hand" numeric(15, 4) DEFAULT '0' NOT NULL,
	"qty_reserved" numeric(15, 4) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_transfer_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"transfer_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"qty" numeric(15, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"transfer_number" text NOT NULL,
	"from_warehouse_id" integer NOT NULL,
	"to_warehouse_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"transfer_date" text NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"manager" text,
	"capacity" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfg_bom_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"bom_id" integer NOT NULL,
	"sequence" integer DEFAULT 1 NOT NULL,
	"component_name" text NOT NULL,
	"component_sku" text,
	"qty" numeric(15, 4) NOT NULL,
	"unit" text DEFAULT 'each' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfg_boms" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"bom_number" text NOT NULL,
	"product_name" text NOT NULL,
	"product_sku" text,
	"output_qty" numeric(15, 4) DEFAULT '1' NOT NULL,
	"unit" text DEFAULT 'each' NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfg_work_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'machine' NOT NULL,
	"description" text,
	"capacity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"cost_per_hour" numeric(15, 2) DEFAULT '0' NOT NULL,
	"operator" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfg_work_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"wo_number" text NOT NULL,
	"bom_id" integer,
	"product_name" text NOT NULL,
	"work_center_id" integer,
	"planned_qty" numeric(15, 4) NOT NULL,
	"produced_qty" numeric(15, 4) DEFAULT '0' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"planned_start_date" text,
	"planned_end_date" text,
	"actual_start_date" text,
	"actual_end_date" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"emp_number" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"dept_id" integer,
	"job_title" text NOT NULL,
	"employment_type" text DEFAULT 'full_time' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"salary" numeric(15, 2) DEFAULT '0' NOT NULL,
	"salary_type" text DEFAULT 'monthly' NOT NULL,
	"date_of_joining" text NOT NULL,
	"date_of_birth" text,
	"gender" text,
	"address" text,
	"city" text,
	"state" text,
	"bank_account" text,
	"bank_name" text,
	"ifsc_code" text,
	"manager_id" integer,
	"notes" text,
	"user_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_job_postings" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"job_number" text NOT NULL,
	"title" text NOT NULL,
	"dept_id" integer,
	"location" text,
	"employment_type" text DEFAULT 'full_time' NOT NULL,
	"description" text,
	"requirements" text,
	"status" text DEFAULT 'open' NOT NULL,
	"openings" integer DEFAULT 1 NOT NULL,
	"closing_date" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"request_number" text NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type_id" integer NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"total_days" numeric(5, 1) DEFAULT '1' NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by_id" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_leave_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"allowed_days" integer DEFAULT 0 NOT NULL,
	"is_carry_forward" boolean DEFAULT false NOT NULL,
	"is_paid" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_payroll_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"basic_pay" numeric(15, 2) DEFAULT '0' NOT NULL,
	"hra" numeric(15, 2) DEFAULT '0' NOT NULL,
	"other_allowances" numeric(15, 2) DEFAULT '0' NOT NULL,
	"gross_pay" numeric(15, 2) DEFAULT '0' NOT NULL,
	"pf" numeric(15, 2) DEFAULT '0' NOT NULL,
	"esi" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tds" numeric(15, 2) DEFAULT '0' NOT NULL,
	"other_deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(15, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_payroll_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"run_number" text NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_gross" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_net" numeric(15, 2) DEFAULT '0' NOT NULL,
	"employee_count" integer DEFAULT 0 NOT NULL,
	"approved_by_id" integer,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"user_id" integer,
	"title" text DEFAULT 'New Conversation' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"liked" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wf_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'General' NOT NULL,
	"trigger_type" text DEFAULT 'manual' NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"run_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"last_run_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wf_instance_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"instance_id" integer NOT NULL,
	"step_id" integer,
	"step_name" text NOT NULL,
	"step_order" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"output" jsonb DEFAULT '{}'::jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wf_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"org_id" integer,
	"status" text DEFAULT 'running' NOT NULL,
	"trigger_type" text DEFAULT 'manual' NOT NULL,
	"trigger_data" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"error_message" text,
	"triggered_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wf_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"step_order" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"action_type" text DEFAULT 'send_notification' NOT NULL,
	"action_config" jsonb DEFAULT '{}'::jsonb,
	"condition_config" jsonb DEFAULT '{}'::jsonb,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"folder_id" integer,
	"doc_number" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"file_type" text DEFAULT 'other' NOT NULL,
	"mime_type" text,
	"file_size" bigint DEFAULT 0 NOT NULL,
	"file_content" text,
	"tags" text,
	"is_starred" boolean DEFAULT false NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"name" text NOT NULL,
	"description" text,
	"parent_id" integer,
	"color" text DEFAULT 'blue' NOT NULL,
	"icon" text DEFAULT 'folder' NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"shared_with_email" text NOT NULL,
	"shared_by" integer,
	"permission" text DEFAULT 'view' NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"version" integer NOT NULL,
	"change_note" text,
	"file_content" text,
	"file_size" bigint DEFAULT 0 NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cp_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"customer_code" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"phone" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"avatar_color" text DEFAULT 'blue' NOT NULL,
	"notes" text,
	"last_login" timestamp,
	"portal_enabled" boolean DEFAULT true NOT NULL,
	"invite_sent_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cp_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"customer_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"invoice_date" text NOT NULL,
	"due_date" text,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"description" text,
	"notes" text,
	"viewed_at" timestamp,
	"paid_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cp_ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"sender_type" text DEFAULT 'staff' NOT NULL,
	"sender_name" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cp_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"customer_id" integer NOT NULL,
	"ticket_number" text NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to" integer,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vp_bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"vendor_id" integer NOT NULL,
	"bill_number" text NOT NULL,
	"bill_date" text NOT NULL,
	"due_date" text,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"po_reference" text,
	"description" text,
	"notes" text,
	"paid_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vp_ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"sender_type" text DEFAULT 'staff' NOT NULL,
	"sender_name" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vp_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"vendor_id" integer NOT NULL,
	"ticket_number" text NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to" integer,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vp_vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"vendor_code" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"phone" text,
	"category" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"avatar_color" text DEFAULT 'blue' NOT NULL,
	"rating" numeric(3, 1) DEFAULT '0',
	"on_time_pct" numeric(5, 2) DEFAULT '0',
	"notes" text,
	"portal_enabled" boolean DEFAULT true NOT NULL,
	"invite_sent_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_dept_id_departments_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_chart_of_accounts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_customers" ADD CONSTRAINT "ar_customers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_invoice_lines" ADD CONSTRAINT "ar_invoice_lines_invoice_id_ar_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."ar_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_invoices" ADD CONSTRAINT "ar_invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_invoices" ADD CONSTRAINT "ar_invoices_customer_id_ar_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."ar_customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_invoices" ADD CONSTRAINT "ar_invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_payments" ADD CONSTRAINT "ar_payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_payments" ADD CONSTRAINT "ar_payments_invoice_id_ar_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."ar_invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_payments" ADD CONSTRAINT "ar_payments_customer_id_ar_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."ar_customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_payments" ADD CONSTRAINT "ar_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ap_bill_lines" ADD CONSTRAINT "ap_bill_lines_bill_id_ap_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."ap_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ap_bills" ADD CONSTRAINT "ap_bills_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ap_bills" ADD CONSTRAINT "ap_bills_vendor_id_ap_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."ap_vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ap_bills" ADD CONSTRAINT "ap_bills_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ap_payments" ADD CONSTRAINT "ap_payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ap_payments" ADD CONSTRAINT "ap_payments_bill_id_ap_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."ap_bills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ap_payments" ADD CONSTRAINT "ap_payments_vendor_id_ap_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."ap_vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ap_payments" ADD CONSTRAINT "ap_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ap_vendors" ADD CONSTRAINT "ap_vendors_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliation_items" ADD CONSTRAINT "bank_reconciliation_items_reconciliation_id_bank_reconciliations_id_fk" FOREIGN KEY ("reconciliation_id") REFERENCES "public"."bank_reconciliations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliation_items" ADD CONSTRAINT "bank_reconciliation_items_transaction_id_bank_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."bank_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_depreciation_entries" ADD CONSTRAINT "asset_depreciation_entries_asset_id_fixed_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."fixed_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_depreciation_entries" ADD CONSTRAINT "asset_depreciation_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_depreciation_entries" ADD CONSTRAINT "asset_depreciation_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gst_return_entries" ADD CONSTRAINT "gst_return_entries_return_id_gst_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."gst_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gst_return_entries" ADD CONSTRAINT "gst_return_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gst_returns" ADD CONSTRAINT "gst_returns_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gst_returns" ADD CONSTRAINT "gst_returns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tds_entries" ADD CONSTRAINT "tds_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tds_entries" ADD CONSTRAINT "tds_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "einv_buyers" ADD CONSTRAINT "einv_buyers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "einv_invoice_lines" ADD CONSTRAINT "einv_invoice_lines_invoice_id_einv_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."einv_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "einv_invoices" ADD CONSTRAINT "einv_invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "einv_invoices" ADD CONSTRAINT "einv_invoices_buyer_id_einv_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."einv_buyers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "einv_invoices" ADD CONSTRAINT "einv_invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eway_bills" ADD CONSTRAINT "eway_bills_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eway_bills" ADD CONSTRAINT "eway_bills_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_grn_id_goods_receipt_notes_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."goods_receipt_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_po_line_id_purchase_order_lines_id_fk" FOREIGN KEY ("po_line_id") REFERENCES "public"."purchase_order_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_vendor_id_purchase_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."purchase_vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_purchase_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."purchase_vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_vendor_id_purchase_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."purchase_vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_converted_po_id_purchase_orders_id_fk" FOREIGN KEY ("converted_po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_vendors" ADD CONSTRAINT "purchase_vendors_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_vendors" ADD CONSTRAINT "purchase_vendors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_categories" ADD CONSTRAINT "inv_categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_product_id_inv_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inv_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_warehouse_id_inv_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_products" ADD CONSTRAINT "inv_products_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_products" ADD CONSTRAINT "inv_products_category_id_inv_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inv_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_levels" ADD CONSTRAINT "inv_stock_levels_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_levels" ADD CONSTRAINT "inv_stock_levels_product_id_inv_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inv_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_levels" ADD CONSTRAINT "inv_stock_levels_warehouse_id_inv_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_transfer_lines" ADD CONSTRAINT "inv_transfer_lines_transfer_id_inv_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."inv_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_transfer_lines" ADD CONSTRAINT "inv_transfer_lines_product_id_inv_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inv_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_transfers" ADD CONSTRAINT "inv_transfers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_transfers" ADD CONSTRAINT "inv_transfers_from_warehouse_id_inv_warehouses_id_fk" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_transfers" ADD CONSTRAINT "inv_transfers_to_warehouse_id_inv_warehouses_id_fk" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_transfers" ADD CONSTRAINT "inv_transfers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_warehouses" ADD CONSTRAINT "inv_warehouses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfg_bom_lines" ADD CONSTRAINT "mfg_bom_lines_bom_id_mfg_boms_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."mfg_boms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfg_boms" ADD CONSTRAINT "mfg_boms_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfg_boms" ADD CONSTRAINT "mfg_boms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfg_work_centers" ADD CONSTRAINT "mfg_work_centers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfg_work_orders" ADD CONSTRAINT "mfg_work_orders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfg_work_orders" ADD CONSTRAINT "mfg_work_orders_bom_id_mfg_boms_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."mfg_boms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfg_work_orders" ADD CONSTRAINT "mfg_work_orders_work_center_id_mfg_work_centers_id_fk" FOREIGN KEY ("work_center_id") REFERENCES "public"."mfg_work_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfg_work_orders" ADD CONSTRAINT "mfg_work_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_dept_id_departments_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_postings" ADD CONSTRAINT "hr_job_postings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_postings" ADD CONSTRAINT "hr_job_postings_dept_id_departments_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_postings" ADD CONSTRAINT "hr_job_postings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_leave_type_id_hr_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."hr_leave_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_types" ADD CONSTRAINT "hr_leave_types_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_payroll_lines" ADD CONSTRAINT "hr_payroll_lines_run_id_hr_payroll_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."hr_payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_payroll_lines" ADD CONSTRAINT "hr_payroll_lines_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_payroll_runs" ADD CONSTRAINT "hr_payroll_runs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_payroll_runs" ADD CONSTRAINT "hr_payroll_runs_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_payroll_runs" ADD CONSTRAINT "hr_payroll_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_definitions" ADD CONSTRAINT "wf_definitions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_definitions" ADD CONSTRAINT "wf_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_instance_logs" ADD CONSTRAINT "wf_instance_logs_instance_id_wf_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."wf_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_instance_logs" ADD CONSTRAINT "wf_instance_logs_step_id_wf_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."wf_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_instances" ADD CONSTRAINT "wf_instances_workflow_id_wf_definitions_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."wf_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_instances" ADD CONSTRAINT "wf_instances_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_instances" ADD CONSTRAINT "wf_instances_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wf_steps" ADD CONSTRAINT "wf_steps_workflow_id_wf_definitions_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."wf_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_documents" ADD CONSTRAINT "doc_documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_documents" ADD CONSTRAINT "doc_documents_folder_id_doc_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."doc_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_documents" ADD CONSTRAINT "doc_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_documents" ADD CONSTRAINT "doc_documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_folders" ADD CONSTRAINT "doc_folders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_folders" ADD CONSTRAINT "doc_folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_shares" ADD CONSTRAINT "doc_shares_document_id_doc_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."doc_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_shares" ADD CONSTRAINT "doc_shares_shared_by_users_id_fk" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_versions" ADD CONSTRAINT "doc_versions_document_id_doc_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."doc_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_versions" ADD CONSTRAINT "doc_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_customers" ADD CONSTRAINT "cp_customers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_customers" ADD CONSTRAINT "cp_customers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_invoices" ADD CONSTRAINT "cp_invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_invoices" ADD CONSTRAINT "cp_invoices_customer_id_cp_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."cp_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_invoices" ADD CONSTRAINT "cp_invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_ticket_messages" ADD CONSTRAINT "cp_ticket_messages_ticket_id_cp_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."cp_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_tickets" ADD CONSTRAINT "cp_tickets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_tickets" ADD CONSTRAINT "cp_tickets_customer_id_cp_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."cp_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_tickets" ADD CONSTRAINT "cp_tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vp_bills" ADD CONSTRAINT "vp_bills_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vp_bills" ADD CONSTRAINT "vp_bills_vendor_id_vp_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vp_vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vp_bills" ADD CONSTRAINT "vp_bills_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vp_ticket_messages" ADD CONSTRAINT "vp_ticket_messages_ticket_id_vp_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."vp_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vp_tickets" ADD CONSTRAINT "vp_tickets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vp_tickets" ADD CONSTRAINT "vp_tickets_vendor_id_vp_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vp_vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vp_tickets" ADD CONSTRAINT "vp_tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vp_vendors" ADD CONSTRAINT "vp_vendors_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vp_vendors" ADD CONSTRAINT "vp_vendors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"branch_id" integer,
	"role_id" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_memberships_user_id_organization_id_unique" UNIQUE("user_id","organization_id")
);
--> statement-breakpoint
INSERT INTO "organization_memberships" ("user_id", "organization_id", "branch_id", "role_id", "is_default")
SELECT "id", "org_id", "branch_id", "role_id", true FROM "users" WHERE "org_id" IS NOT NULL
ON CONFLICT ("user_id", "organization_id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;