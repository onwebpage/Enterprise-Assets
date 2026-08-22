/**
 * Seed demo Expense Management data — categories, policies, claims, items.
 * Run: pnpm --filter @workspace/db run seed:expense
 * Safe to re-run: cleans up existing expense data for the org first.
 */
import { db, organizations } from "./index";
import {
  expenseCategories, expensePolicies, expenseClaims, expenseItems,
} from "./schema/expense";
import { users } from "./schema/users";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding Expense Management demo data...");

  const [org] = await db.select().from(organizations).limit(1);
  if (!org) { console.error("No org found — run seed first"); process.exit(1); }
  const orgId = org.id;

  // ── Clean up existing expense data for this org ─────────────────────────────
  await db.delete(expenseItems);
  await db.delete(expenseClaims).where(eq(expenseClaims.orgId, orgId));
  await db.delete(expensePolicies).where(eq(expensePolicies.orgId, orgId));
  await db.delete(expenseCategories).where(eq(expenseCategories.orgId, orgId));

  // ── Categories ──────────────────────────────────────────────────────────────
  const categories = await db.insert(expenseCategories).values([
    { orgId, code: "TRAVEL", name: "Travel", description: "Airfare, train, taxi and travel-related expenses", isActive: true },
    { orgId, code: "MEALS", name: "Meals", description: "Business meals and client entertainment", isActive: true },
    { orgId, code: "LODGING", name: "Lodging", description: "Hotel and accommodation expenses", isActive: true },
    { orgId, code: "TRANSPORT", name: "Transport", description: "Local transport, parking and tolls", isActive: true },
    { orgId, code: "OFFICE", name: "Office Supplies", description: "Stationery and office consumables", isActive: true },
    { orgId, code: "SOFTWARE", name: "Software", description: "Software licenses and subscriptions", isActive: true },
    { orgId, code: "HARDWARE", name: "Hardware", description: "Computer hardware and peripherals", isActive: true },
    { orgId, code: "TRAINING", name: "Training", description: "Courses, certifications and workshops", isActive: true },
    { orgId, code: "CLIENT", name: "Client Entertainment", description: "Client dinners and entertainment", isActive: true },
    { orgId, code: "FUEL", name: "Fuel", description: "Vehicle fuel expenses", isActive: true },
    { orgId, code: "TELECOM", name: "Telecom", description: "Phone and internet expenses", isActive: true },
    { orgId, code: "MISC", name: "Miscellaneous", description: "Other business expenses", isActive: true },
  ]).returning();
  console.log("✓ Categories seeded");

  const travel = categories.find(c => c.code === "TRAVEL")!;
  const meals = categories.find(c => c.code === "MEALS")!;
  const lodging = categories.find(c => c.code === "LODGING")!;
  const transport = categories.find(c => c.code === "TRANSPORT")!;
  const software = categories.find(c => c.code === "SOFTWARE")!;
  const hardware = categories.find(c => c.code === "HARDWARE")!;
  const client = categories.find(c => c.code === "CLIENT")!;

  // ── Policies ────────────────────────────────────────────────────────────────
  await db.insert(expensePolicies).values([
    { orgId, policyNumber: "POL-0001", name: "Travel Expense Limit", policyType: "max_amount", category: "Travel", maxAmount: "2000", perDiemRate: "0", approvalThreshold: "500", requiresReceipt: true, requiresApproval: true, description: "Maximum travel expense per trip", status: "active" },
    { orgId, policyNumber: "POL-0002", name: "Meals Per Diem", policyType: "per_diem", category: "Meals", maxAmount: "0", perDiemRate: "75", approvalThreshold: "0", requiresReceipt: false, requiresApproval: false, description: "Daily meal allowance for business travel", status: "active" },
    { orgId, policyNumber: "POL-0003", name: "Lodging Limit", policyType: "max_amount", category: "Lodging", maxAmount: "350", perDiemRate: "0", approvalThreshold: "0", requiresReceipt: true, requiresApproval: false, description: "Maximum nightly hotel rate", status: "active" },
    { orgId, policyNumber: "POL-0004", name: "Software Purchase Approval", policyType: "approval_threshold", category: "Software", maxAmount: "0", perDiemRate: "0", approvalThreshold: "500", requiresReceipt: true, requiresApproval: true, description: "Software purchases over $500 require approval", status: "active" },
    { orgId, policyNumber: "POL-0005", name: "Client Entertainment Limit", policyType: "category_limit", category: "Client Entertainment", maxAmount: "300", perDiemRate: "0", approvalThreshold: "0", requiresReceipt: true, requiresApproval: true, description: "Maximum per client entertainment event", status: "active" },
    { orgId, policyNumber: "POL-0006", name: "Office Supplies", policyType: "max_amount", category: "Office Supplies", maxAmount: "200", perDiemRate: "0", approvalThreshold: "0", requiresReceipt: true, requiresApproval: false, description: "Office supply purchases under $200", status: "active" },
  ]);
  console.log("✓ Policies seeded");

  // ── Users for employees ─────────────────────────────────────────────────────
  const empUsers = await db.select().from(users).where(eq(users.orgId, orgId)).limit(5);
  const emp1 = empUsers[0] ?? { id: 1, firstName: "James", lastName: "Doyle" };
  const emp2 = empUsers[1] ?? { id: 2, firstName: "Sarah", lastName: "Kim" };
  const emp3 = empUsers[2] ?? { id: 3, firstName: "Anna", lastName: "Park" };

  // ── Claims ──────────────────────────────────────────────────────────────────
  const [claim1] = await db.insert(expenseClaims).values({
    orgId, claimNumber: "EXP-0001", employeeId: emp1.id, employeeName: `${emp1.firstName} ${emp1.lastName}`,
    department: "Engineering", title: "Client visit to Austin", description: "Travel and accommodation for client meeting",
    claimDate: "2026-08-10", totalAmount: "1250", status: "reimbursed",
    submittedDate: "2026-08-12", approvedDate: "2026-08-14", approvedBy: "admin@omnierp.io",
    reimbursedDate: "2026-08-16", reimbursementMethod: "bank_transfer",
    notes: "Client meeting at Austin R&D Center",
  }).returning();

  await db.insert(expenseItems).values([
    { orgId, claimId: claim1.id, categoryId: travel.id, categoryName: "Travel", expenseDate: "2026-08-10", description: "Flight to Austin", amount: "450", hasReceipt: true, status: "approved" },
    { orgId, claimId: claim1.id, categoryId: lodging.id, categoryName: "Lodging", expenseDate: "2026-08-10", description: "Hotel - 2 nights", amount: "600", hasReceipt: true, status: "approved" },
    { orgId, claimId: claim1.id, categoryId: meals.id, categoryName: "Meals", expenseDate: "2026-08-10", description: "Meals during trip", amount: "200", hasReceipt: true, status: "approved" },
  ]);

  const [claim2] = await db.insert(expenseClaims).values({
    orgId, claimNumber: "EXP-0002", employeeId: emp2.id, employeeName: `${emp2.firstName} ${emp2.lastName}`,
    department: "Sales & Marketing", title: "Sales conference travel", description: "Travel to industry conference",
    claimDate: "2026-08-15", totalAmount: "850", status: "approved",
    submittedDate: "2026-08-16", approvedDate: "2026-08-18", approvedBy: "admin@omnierp.io",
    notes: "Annual industry conference",
  }).returning();

  await db.insert(expenseItems).values([
    { orgId, claimId: claim2.id, categoryId: travel.id, categoryName: "Travel", expenseDate: "2026-08-15", description: "Train tickets", amount: "250", hasReceipt: true, status: "approved" },
    { orgId, claimId: claim2.id, categoryId: lodging.id, categoryName: "Lodging", expenseDate: "2026-08-15", description: "Hotel - 1 night", amount: "300", hasReceipt: true, status: "approved" },
    { orgId, claimId: claim2.id, categoryId: meals.id, categoryName: "Meals", expenseDate: "2026-08-15", description: "Conference meals", amount: "150", hasReceipt: true, status: "approved" },
    { orgId, claimId: claim2.id, categoryId: transport.id, categoryName: "Transport", expenseDate: "2026-08-15", description: "Local transport", amount: "150", hasReceipt: false, status: "approved" },
  ]);

  const [claim3] = await db.insert(expenseClaims).values({
    orgId, claimNumber: "EXP-0003", employeeId: emp3.id, employeeName: `${emp3.firstName} ${emp3.lastName}`,
    department: "Engineering", title: "Software licenses", description: "Annual software subscription renewals",
    claimDate: "2026-08-18", totalAmount: "1200", status: "submitted",
    submittedDate: "2026-08-18",
    notes: "Annual renewals for development tools",
  }).returning();

  await db.insert(expenseItems).values([
    { orgId, claimId: claim3.id, categoryId: software.id, categoryName: "Software", expenseDate: "2026-08-18", description: "IDE licenses", amount: "800", hasReceipt: true, status: "pending" },
    { orgId, claimId: claim3.id, categoryId: software.id, categoryName: "Software", expenseDate: "2026-08-18", description: "CI/CD subscription", amount: "400", hasReceipt: true, status: "pending" },
  ]);

  const [claim4] = await db.insert(expenseClaims).values({
    orgId, claimNumber: "EXP-0004", employeeId: emp1.id, employeeName: `${emp1.firstName} ${emp1.lastName}`,
    department: "Engineering", title: "Hardware upgrade", description: "New development workstation",
    claimDate: "2026-08-20", totalAmount: "1800", status: "draft",
    notes: "Awaiting manager approval",
  }).returning();

  await db.insert(expenseItems).values([
    { orgId, claimId: claim4.id, categoryId: hardware.id, categoryName: "Hardware", expenseDate: "2026-08-20", description: "Development laptop", amount: "1500", hasReceipt: true, status: "pending" },
    { orgId, claimId: claim4.id, categoryId: hardware.id, categoryName: "Hardware", expenseDate: "2026-08-20", description: "External monitor", amount: "300", hasReceipt: true, status: "pending" },
  ]);

  const [claim5] = await db.insert(expenseClaims).values({
    orgId, claimNumber: "EXP-0005", employeeId: emp2.id, employeeName: `${emp2.firstName} ${emp2.lastName}`,
    department: "Sales & Marketing", title: "Client dinner", description: "Dinner with key client",
    claimDate: "2026-08-22", totalAmount: "280", status: "rejected",
    submittedDate: "2026-08-22", approvalNotes: "Exceeds client entertainment limit without prior approval",
    notes: "Rejected - over policy limit",
  }).returning();

  await db.insert(expenseItems).values([
    { orgId, claimId: claim5.id, categoryId: client.id, categoryName: "Client Entertainment", expenseDate: "2026-08-22", description: "Client dinner at restaurant", amount: "280", hasReceipt: true, status: "rejected" },
  ]);

  console.log("✓ Claims seeded");

  console.log("\n✅ Expense Management demo data seeded successfully!");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });