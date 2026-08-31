/**
 * Accounts Receivable seed — demo customers, invoices, lines, payments, and permissions.
 * Run: pnpm --filter @workspace/db run seed:ar
 * Safe to re-run: uses onConflictDoNothing or explicit checks.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import {
  organizations, roles, permissions,
  arCustomers, arInvoices, arInvoiceLines, arPayments,
} from "./schema";
import { eq, and } from "drizzle-orm";
import { databaseUrl } from "./connection";

const { Pool } = pg;

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool, { schema });

async function seedAR() {
  console.log("🌱 Seeding Accounts Receivable...");

  // ── Org & role IDs ───────────────────────────────────────────────────────
  const [org] = await db.select({ id: organizations.id }).from(organizations).limit(1);
  if (!org) throw new Error("No organization found — run the main seed first");
  const orgId = org.id;

  const allRoles = await db.select({ id: roles.id, name: roles.name, isSystem: roles.isSystem })
    .from(roles).where(eq(roles.orgId, orgId));

  // ── AR permissions ────────────────────────────────────────────────────────
  const MODULE = "Accounts Receivable";
  for (const role of allRoles) {
    // System roles already have super-admin bypass; seed anyway for completeness
    if (role.isSystem) {
      await db.insert(permissions).values({
        roleId: role.id, module: MODULE,
        canView: true, canCreate: true, canEdit: true, canDelete: true,
      }).onConflictDoNothing();
      continue;
    }
    if (role.name === "Finance Manager" || role.name === "Accountant") {
      await db.insert(permissions).values({
        roleId: role.id, module: MODULE,
        canView: true, canCreate: true, canEdit: true,
        canDelete: role.name === "Finance Manager",
      }).onConflictDoNothing();
    }
    if (role.name === "Sales Manager" || role.name === "Sales Rep") {
      await db.insert(permissions).values({
        roleId: role.id, module: MODULE,
        canView: true, canCreate: true, canEdit: false, canDelete: false,
      }).onConflictDoNothing();
    }
  }
  console.log("✓ AR permissions seeded");

  // ── Customers ─────────────────────────────────────────────────────────────
  const customerRows = await db.insert(arCustomers).values([
    { orgId, name: "Stratford Industries",  email: "ap@stratford.com",    phone: "+1 312 555 0101", city: "Chicago",      country: "USA",    creditLimit: "500000", currency: "USD", status: "active" },
    { orgId, name: "Apex Global Inc.",      email: "billing@apexglobal.io", phone: "+1 212 555 0202", city: "New York",   country: "USA",    creditLimit: "750000", currency: "USD", status: "active" },
    { orgId, name: "Meridian Corp",         email: "finance@meridian.com", phone: "+1 512 555 0303", city: "Austin",      country: "USA",    creditLimit: "250000", currency: "USD", status: "active" },
    { orgId, name: "BlueSky Technologies",  email: "ar@bluesky.tech",      phone: "+1 415 555 0404", city: "San Francisco", country: "USA",  creditLimit: "300000", currency: "USD", status: "active" },
    { orgId, name: "Vertex Solutions GmbH", email: "rechnungen@vertex.de", phone: "+49 30 555 0505", city: "Berlin",      country: "Germany", creditLimit: "200000", currency: "EUR", status: "active" },
    { orgId, name: "NovaTech Ltd",          email: "accounts@novatech.io", phone: "+44 20 5550 0606", city: "London",     country: "UK",     creditLimit: "150000", currency: "GBP", status: "inactive" },
  ]).onConflictDoNothing().returning();

  if (customerRows.length === 0) {
    console.log("ℹ  Customers already seeded, skipping invoices/payments");
    await pool.end();
    return;
  }
  console.log("✓ AR customers seeded");

  const [stratford, apex, meridian, bluesky, vertex] = customerRows;

  // ── Invoices + lines ──────────────────────────────────────────────────────
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
  const subDays = (d: Date, n: number) => addDays(d, -n);

  type LineInput = { description: string; quantity: string; unitPrice: string; amount: string; sequence: number };
  type InvoiceInput = {
    orgId: number; customerId: number; invoiceNumber: string; issueDate: string; dueDate: string;
    status: string; subtotal: string; taxAmount: string; totalAmount: string; amountPaid: string; notes?: string;
  };

  const invoiceData: InvoiceInput[] = [
    {
      orgId, customerId: stratford.id, invoiceNumber: "INV-0001",
      issueDate: fmt(subDays(today, 60)), dueDate: fmt(subDays(today, 30)),
      status: "paid", subtotal: "48200.00", taxAmount: "0.00", totalAmount: "48200.00", amountPaid: "48200.00",
      notes: "Enterprise software license Q2",
    },
    {
      orgId, customerId: apex.id, invoiceNumber: "INV-0002",
      issueDate: fmt(subDays(today, 45)), dueDate: fmt(subDays(today, 15)),
      status: "overdue", subtotal: "31500.00", taxAmount: "0.00", totalAmount: "31500.00", amountPaid: "0.00",
      notes: "Consulting services — May",
    },
    {
      orgId, customerId: meridian.id, invoiceNumber: "INV-0003",
      issueDate: fmt(subDays(today, 30)), dueDate: fmt(addDays(today, 0)),
      status: "sent", subtotal: "92750.00", taxAmount: "7750.00", totalAmount: "100500.00", amountPaid: "0.00",
      notes: "Annual support contract renewal",
    },
    {
      orgId, customerId: bluesky.id, invoiceNumber: "INV-0004",
      issueDate: fmt(subDays(today, 10)), dueDate: fmt(addDays(today, 20)),
      status: "partial", subtotal: "15000.00", taxAmount: "1500.00", totalAmount: "16500.00", amountPaid: "8000.00",
      notes: "Implementation phase 1",
    },
    {
      orgId, customerId: stratford.id, invoiceNumber: "INV-0005",
      issueDate: fmt(subDays(today, 5)), dueDate: fmt(addDays(today, 25)),
      status: "sent", subtotal: "24800.00", taxAmount: "0.00", totalAmount: "24800.00", amountPaid: "0.00",
      notes: "Software modules — add-on licenses",
    },
    {
      orgId, customerId: vertex.id, invoiceNumber: "INV-0006",
      issueDate: fmt(subDays(today, 3)), dueDate: fmt(addDays(today, 27)),
      status: "draft", subtotal: "18600.00", taxAmount: "3534.00", totalAmount: "22134.00", amountPaid: "0.00",
    },
    {
      orgId, customerId: apex.id, invoiceNumber: "INV-0007",
      issueDate: fmt(subDays(today, 20)), dueDate: fmt(addDays(today, 10)),
      status: "sent", subtotal: "67000.00", taxAmount: "0.00", totalAmount: "67000.00", amountPaid: "0.00",
      notes: "Platform subscription — annual",
    },
    {
      orgId, customerId: meridian.id, invoiceNumber: "INV-0008",
      issueDate: fmt(subDays(today, 2)), dueDate: fmt(addDays(today, 28)),
      status: "draft", subtotal: "9800.00", taxAmount: "980.00", totalAmount: "10780.00", amountPaid: "0.00",
    },
  ];

  const invoiceRows = await db.insert(arInvoices).values(invoiceData as any).returning();
  console.log("✓ AR invoices seeded");

  // ── Invoice lines ─────────────────────────────────────────────────────────
  const allLines: LineInput[] = [];
  for (const [i, inv] of invoiceRows.entries()) {
    const lines: LineInput[] = i % 3 === 0
      ? [
          { description: "Software License (Annual)", quantity: "1", unitPrice: String(parseFloat(inv.subtotal) * 0.6), amount: String(parseFloat(inv.subtotal) * 0.6), sequence: 0 },
          { description: "Implementation & Setup",   quantity: "1", unitPrice: String(parseFloat(inv.subtotal) * 0.25), amount: String(parseFloat(inv.subtotal) * 0.25), sequence: 1 },
          { description: "Training & Onboarding",   quantity: "1", unitPrice: String(parseFloat(inv.subtotal) * 0.15), amount: String(parseFloat(inv.subtotal) * 0.15), sequence: 2 },
        ]
      : i % 3 === 1
      ? [
          { description: "Professional Services",    quantity: "40", unitPrice: String(parseFloat(inv.subtotal) / 40), amount: inv.subtotal, sequence: 0 },
          { description: "Travel & Expenses",        quantity: "1",  unitPrice: "0.00", amount: "0.00", sequence: 1 },
        ]
      : [
          { description: "Monthly Subscription",     quantity: "12", unitPrice: String(parseFloat(inv.subtotal) / 12), amount: inv.subtotal, sequence: 0 },
        ];
    allLines.push(...lines.map((l) => ({ ...l, invoiceId: inv.id } as any)));
  }

  await db.insert(arInvoiceLines).values(allLines as any).onConflictDoNothing();
  console.log("✓ AR invoice lines seeded");

  // ── Payments ──────────────────────────────────────────────────────────────
  // Match amountPaid values already set on invoices
  const inv0001 = invoiceRows.find((r) => r.invoiceNumber === "INV-0001")!;
  const inv0004 = invoiceRows.find((r) => r.invoiceNumber === "INV-0004")!;

  await db.insert(arPayments).values([
    {
      orgId, invoiceId: inv0001.id, customerId: stratford.id,
      paymentDate: fmt(subDays(today, 28)), amount: "48200.00",
      method: "bank_transfer", reference: "TXN-STR-9921", notes: "Full payment received",
    },
    {
      orgId, invoiceId: inv0004.id, customerId: bluesky.id,
      paymentDate: fmt(subDays(today, 3)), amount: "8000.00",
      method: "bank_transfer", reference: "TXN-BSK-0044", notes: "Partial payment — Phase 1 milestone",
    },
  ]).onConflictDoNothing();
  console.log("✓ AR payments seeded");

  console.log("\n✅ Accounts Receivable seed complete!");
  await pool.end();
}

seedAR().catch((err) => {
  console.error("❌ AR seed failed:", err);
  process.exit(1);
});
