/**
 * Seed demo Cash & Treasury Management data.
 * Run: pnpm --filter @workspace/db run seed:cash-treasury
 * Safe to re-run: cleans up existing treasury data for the org first.
 */
import { db, organizations } from "./index";
import {
  treasuryAccounts, treasuryPositions, treasuryLiquidityForecasts,
  treasuryPaymentPlans, treasuryCollectionPlans, treasuryTransfers,
} from "./schema/cashTreasury";
import { eq } from "drizzle-orm";

function addDays(base: string, days: number): string {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log("Seeding Cash & Treasury demo data...");

  const [org] = await db.select().from(organizations).limit(1);
  if (!org) { console.error("No org found - run seed first"); process.exit(1); }
  const orgId = org.id;

  await db.delete(treasuryPositions).where(eq(treasuryPositions.orgId, orgId));
  await db.delete(treasuryLiquidityForecasts).where(eq(treasuryLiquidityForecasts.orgId, orgId));
  await db.delete(treasuryPaymentPlans).where(eq(treasuryPaymentPlans.orgId, orgId));
  await db.delete(treasuryCollectionPlans).where(eq(treasuryCollectionPlans.orgId, orgId));
  await db.delete(treasuryTransfers).where(eq(treasuryTransfers.orgId, orgId));
  await db.delete(treasuryAccounts).where(eq(treasuryAccounts.orgId, orgId));

  const accounts = await db.insert(treasuryAccounts).values([
    { orgId, name: "Operations Checking", accountNumber: "**** 4521", bankName: "Chase", bankBranch: "Chicago HQ", currency: "INR", currentBalance: "1284500.00", availableBalance: "1268000.00", accountType: "checking", status: "active", isPrimary: true, notes: "Primary operating account" },
    { orgId, name: "Payroll Account", accountNumber: "**** 8874", bankName: "Wells Fargo", bankBranch: "New York", currency: "INR", currentBalance: "420000.00", availableBalance: "420000.00", accountType: "checking", status: "active", isPrimary: false, notes: "Payroll disbursements" },
    { orgId, name: "Reserve Fund", accountNumber: "**** 0192", bankName: "Bank of America", bankBranch: "Chicago", currency: "INR", currentBalance: "2500000.00", availableBalance: "2500000.00", accountType: "savings", status: "active", isPrimary: false, notes: "Cash reserve" },
    { orgId, name: "Short-term Investments", accountNumber: "**** 3345", bankName: "Vanguard", bankBranch: "Online", currency: "INR", currentBalance: "1800000.00", availableBalance: "1800000.00", accountType: "investment", status: "active", isPrimary: false, notes: "T-bill ladder" },
    { orgId, name: "Petty Cash Desk", accountNumber: "CASH-01", bankName: "Onsite", bankBranch: "Chicago HQ", currency: "INR", currentBalance: "5000.00", availableBalance: "5000.00", accountType: "petty_cash", status: "active", isPrimary: false, notes: "Office petty cash" },
  ]).returning();
  console.log("Accounts seeded");

  const checking = accounts.find(a => a.accountType === "checking")!;
  const payroll = accounts.find(a => a.name === "Payroll Account")!;
  const reserve = accounts.find(a => a.accountType === "savings")!;
  const investments = accounts.find(a => a.accountType === "investment")!;
  const petty = accounts.find(a => a.accountType === "petty_cash")!;

  const today = new Date().toISOString().slice(0, 10);

  // Positions - last 14 days
  const positions: any[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = addDays(today, -i);
    const inflow = 120000 + i * 3500;
    const outflow = 98000 + i * 1200;
    const net = inflow - outflow;
    positions.push({ orgId, accountId: checking.id, positionDate: date, openingBalance: String(985000 + i * 15000), closingBalance: String(985000 + i * 15000 + net), netCashflow: String(net), currency: "INR", notes: i === 0 ? "Today's position" : null });
  }
  await db.insert(treasuryPositions).values(positions);
  console.log("Positions seeded");

  // Liquidity forecasts - next 30 days
  const forecasts: any[] = [];
  for (let i = 1; i <= 30; i++) {
    const date = addDays(today, i);
    const credits = Math.round(140000 + Math.sin(i) * 40000 + (i % 5 === 0 ? 50000 : 0));
    const debits = Math.round(115000 + (i % 7 === 3 ? 55000 : 0));
    const balance = 1268000 + credits - debits + (i - 1) * 3500;
    forecasts.push({
      orgId, accountId: checking.id, forecastDate: date,
      projectedInflow: String(credits), projectedOutflow: String(debits),
      netCashflow: String(credits - debits), projectedBalance: String(balance),
      confidence: i <= 7 ? "high" : i <= 14 ? "medium" : "low",
      scenario: "base", notes: null,
    });
  }
  await db.insert(treasuryLiquidityForecasts).values(forecasts);
  console.log("Liquidity forecasts seeded");

  // Payments
  await db.insert(treasuryPaymentPlans).values([
    { orgId, paymentNumber: "PMT-0001", accountId: checking.id, payeeName: "Azure Cloud Services", vendorName: "Microsoft", amount: "48000", paymentDate: addDays(today, 2), method: "ach", category: "operating", status: "approved" },
    { orgId, paymentNumber: "PMT-0002", accountId: payroll.id, payeeName: "Employee Payroll", vendorName: null, amount: "125000", paymentDate: addDays(today, 5), method: "bank_transfer", category: "payroll", status: "scheduled" },
    { orgId, paymentNumber: "PMT-0003", accountId: checking.id, payeeName: "Global Bank (loan EMI)", vendorName: "Global Bank", amount: "22000", paymentDate: addDays(today, 7), method: "rtgs", category: "loan", status: "approved" },
    { orgId, paymentNumber: "PMT-0004", accountId: checking.id, payeeName: "State Tax Authority", vendorName: null, amount: "16300", paymentDate: addDays(today, 10), method: "ach", category: "tax", status: "draft" },
    { orgId, paymentNumber: "PMT-0005", accountId: checking.id, payeeName: "InnoSoft Ltd", vendorName: "InnoSoft Ltd", amount: "89500", paymentDate: addDays(today, 12), method: "wire", category: "vendor", status: "draft" },
    { orgId, paymentNumber: "PMT-0006", accountId: checking.id, payeeName: "MegaConstruct Inc", vendorName: "MegaConstruct Inc", amount: "75000", paymentDate: addDays(today, 15), method: "check", category: "capex", status: "draft" },
    { orgId, paymentNumber: "PMT-0007", accountId: checking.id, payeeName: "Office Rent Chicago HQ", vendorName: "Chicago Properties", amount: "28000", paymentDate: addDays(today, 20), method: "ach", category: "operating", status: "approved" },
  ]);
  console.log("Payment plans seeded");

  // Collections
  await db.insert(treasuryCollectionPlans).values([
    { orgId, collectionNumber: "COL-0001", accountId: checking.id, payerName: "Acme Retail Group", customerName: "Acme Retail Group", amount: "156000", collectionDate: addDays(today, 1), method: "ach", status: "scheduled", reference: "INV-2026-1101" },
    { orgId, collectionNumber: "COL-0002", accountId: checking.id, payerName: "Meridian Corp", customerName: "Meridian Corp", amount: "98000", collectionDate: addDays(today, 3), method: "wire", status: "approved", reference: "INV-2026-1095" },
    { orgId, collectionNumber: "COL-0003", accountId: checking.id, payerName: "Nova Logistics", customerName: "Nova Logistics", amount: "42000", collectionDate: addDays(today, 6), method: "ach", status: "scheduled", reference: "INV-2026-1088" },
    { orgId, collectionNumber: "COL-0004", accountId: checking.id, payerName: "Stratford Industries", customerName: "Stratford Industries", amount: "210000", collectionDate: addDays(today, 9), method: "wire", status: "draft", reference: "INV-2026-1073" },
    { orgId, collectionNumber: "COL-0005", accountId: checking.id, payerName: "Horizon Foods", customerName: "Horizon Foods", amount: "64000", collectionDate: addDays(today, 11), method: "ach", status: "draft", reference: "INV-2026-1064" },
    { orgId, collectionNumber: "COL-0006", accountId: checking.id, payerName: "Vertex Analytics", customerName: "Vertex Analytics", amount: "31000", collectionDate: addDays(today, 14), method: "bank_transfer", status: "draft", reference: "INV-2026-1052" },
  ]);
  console.log("Collection plans seeded");

  // Transfers
  await db.insert(treasuryTransfers).values([
    { orgId, transferNumber: "TRF-0001", fromAccountId: checking.id, toAccountId: reserve.id, amount: "100000", transferDate: today, status: "executed", reference: "Weekly sweep to reserve", notes: null },
    { orgId, transferNumber: "TRF-0002", fromAccountId: reserve.id, toAccountId: checking.id, amount: "75000", transferDate: addDays(today, -2), status: "executed", reference: "Top-up operating", notes: null },
    { orgId, transferNumber: "TRF-0003", fromAccountId: checking.id, toAccountId: investments.id, amount: "150000", transferDate: addDays(today, 6), status: "authorized", reference: "Investment purchase", notes: null },
    { orgId, transferNumber: "TRF-0004", fromAccountId: checking.id, toAccountId: payroll.id, amount: "125000", transferDate: addDays(today, 5), status: "authorized", reference: "Payroll funding", notes: null },
    { orgId, transferNumber: "TRF-0005", fromAccountId: petty.id, toAccountId: checking.id, amount: "500", transferDate: addDays(today, -1), status: "executed", reference: "Petty cash replenish", notes: null },
  ]);
  console.log("Transfers seeded");

  console.log("Cash & Treasury demo data seeded successfully!");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });