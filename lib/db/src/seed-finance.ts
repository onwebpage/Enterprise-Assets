/**
 * Finance seed — populates finance_transactions and finance_monthly_summary.
 * Run with: pnpm --filter @workspace/db run seed:finance
 */
import { db, financeTransactions, financeMonthlySummary, organizations } from "./index";

// ── Monthly P&L (mirrors the static plData in the finance page) ───────────────
const monthlyRows = [
  { month: "Jan", year: 2026, revenue: "4.200", cogs: "2.100", gross: "2.100", opex: "1.400", net: "0.700" },
  { month: "Feb", year: 2026, revenue: "5.100", cogs: "2.600", gross: "2.500", opex: "1.500", net: "1.000" },
  { month: "Mar", year: 2026, revenue: "4.800", cogs: "2.400", gross: "2.400", opex: "1.400", net: "1.000" },
  { month: "Apr", year: 2026, revenue: "6.300", cogs: "3.100", gross: "3.200", opex: "1.700", net: "1.500" },
  { month: "May", year: 2026, revenue: "5.900", cogs: "2.900", gross: "3.000", opex: "1.600", net: "1.400" },
  { month: "Jun", year: 2026, revenue: "7.200", cogs: "3.500", gross: "3.700", opex: "1.900", net: "1.800" },
  { month: "Jul", year: 2026, revenue: "8.100", cogs: "3.900", gross: "4.200", opex: "2.100", net: "2.100" },
];

// ── Recent transactions ───────────────────────────────────────────────────────
// Ordered most-recent first; timestamps spaced realistically.
const now = new Date("2026-08-01T19:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const txRows = [
  { description: "Payment — Stratford Industries", amount: "48200.00", direction: "credit", category: "revenue",  reference: "INV-4821", transactedAt: ago(2 * MIN) },
  { description: "Bill — TechParts Ltd.",           amount: "12400.00", direction: "debit",  category: "expense",  reference: "BILL-0912", transactedAt: ago(3 * HOUR) },
  { description: "Payment — Meridian Corp",          amount: "31500.00", direction: "credit", category: "revenue",  reference: "INV-4819", transactedAt: ago(1 * DAY) },
  { description: "Payroll — Jul 2026",               amount: "184000.00",direction: "debit",  category: "expense",  reference: "SAL-0712", transactedAt: ago(2 * DAY) },
  { description: "Receipt — Nexus Logistics",        amount: "24500.00", direction: "credit", category: "revenue",  reference: "INV-4816", transactedAt: ago(3 * DAY) },
  { description: "Vendor payment — Omega Suppliers", amount: "8900.00",  direction: "debit",  category: "expense",  reference: "BILL-0911", transactedAt: ago(4 * DAY) },
  { description: "Sales — BlueSky Technologies",     amount: "7800.00",  direction: "credit", category: "revenue",  reference: "INV-4818", transactedAt: ago(5 * DAY) },
  { description: "Rent & Utilities — July",          amount: "22000.00", direction: "debit",  category: "expense",  reference: "UTIL-071", transactedAt: ago(6 * DAY) },
  { description: "Receipt — Global Ventures Inc.",   amount: "156000.00",direction: "credit", category: "revenue",  reference: "INV-4817", transactedAt: ago(7 * DAY) },
  { description: "CloudInfra SaaS subscription",     amount: "3200.00",  direction: "debit",  category: "expense",  reference: "BILL-0910", transactedAt: ago(8 * DAY) },
];

async function main() {
  console.log("Seeding finance tables…");
  const [organization] = await db.select({ id: organizations.id }).from(organizations).orderBy(organizations.id).limit(1);
  if (!organization) throw new Error("No organization exists; seed organizations before finance.");

  // Upsert monthly summary — delete existing year rows then re-insert
  await db.delete(financeMonthlySummary);
  await db.insert(financeMonthlySummary).values(monthlyRows.map((row) => ({ ...row, orgId: organization.id })));
  console.log(`  ✔ finance_monthly_summary — ${monthlyRows.length} rows`);

  // Replace transactions
  await db.delete(financeTransactions);
  await db.insert(financeTransactions).values(txRows.map((row) => ({ ...row, orgId: organization.id })));
  console.log(`  ✔ finance_transactions — ${txRows.length} rows`);

  console.log("Finance seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
