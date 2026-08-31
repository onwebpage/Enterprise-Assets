/**
 * Financial Controls seed — creates an idempotent control register with
 * representative execution history and one open exception.
 *
 * Run: pnpm --filter @workspace/db run seed:financial-controls
 */
import { and, eq } from "drizzle-orm";
import pg from "pg";
import {
  controlExceptions,
  controlRuns,
  financialControls,
  users,
} from "./schema";
import { databaseUrl } from "./connection";
import { drizzle } from "drizzle-orm/node-postgres";

const { Pool } = pg;
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function getUserId(orgId: number, email: string) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.email, email)))
    .limit(1);
  return user?.id ?? null;
}

async function findOrCreateControl(value: {
  orgId: number;
  controlNumber: string;
  name: string;
  description: string;
  category: "reconciliation" | "approval" | "segregation_of_duties" | "period_close" | "journal_review" | "access" | "other";
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "event";
  riskLevel: "low" | "medium" | "high" | "critical";
  ownerId: number | null;
  reviewerId: number | null;
  threshold?: string | null;
  dueDay?: number | null;
}) {
  const [existing] = await db
    .select()
    .from(financialControls)
    .where(eq(financialControls.controlNumber, value.controlNumber))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(financialControls).values({
    ...value,
    status: "active",
    createdBy: value.ownerId,
  }).returning();
  return created;
}

async function findOrCreateRun(value: {
  controlId: number;
  orgId: number;
  runNumber: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: "pending" | "in_progress" | "completed" | "waived";
  result: "pending" | "passed" | "failed" | "partial";
  performedBy: number | null;
  reviewedBy: number | null;
  performedAt?: Date | null;
  reviewedAt?: Date | null;
  notes: string;
  evidenceReference: string;
  exceptionCount?: number;
}) {
  const [existing] = await db
    .select()
    .from(controlRuns)
    .where(eq(controlRuns.runNumber, value.runNumber))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(controlRuns).values({
    ...value,
    createdBy: value.performedBy,
    exceptionCount: value.exceptionCount ?? 0,
  }).returning();
  return created;
}

async function seed() {
  const [org] = await db.select({ id: users.orgId }).from(users).where(eq(users.email, "admin@omnierp.io")).limit(1);
  const orgId = org?.id;
  if (!orgId) throw new Error("Seed the core organization and admin user before financial controls.");

  const [adminId, accountantId, reviewerId] = await Promise.all([
    getUserId(orgId, "admin@omnierp.io"),
    getUserId(orgId, "r.shaw@apexglobal.io"),
    getUserId(orgId, "a.park@apexglobal.io"),
  ]);

  const bankRecon = await findOrCreateControl({
    orgId,
    controlNumber: "FC-0001",
    name: "Monthly bank reconciliation",
    description: "Reconcile all operating bank accounts to the general ledger and retain the signed reconciliation.",
    category: "reconciliation",
    frequency: "monthly",
    riskLevel: "high",
    ownerId: accountantId,
    reviewerId: reviewerId ?? adminId,
    threshold: "1000",
    dueDay: 5,
  });
  const journalReview = await findOrCreateControl({
    orgId,
    controlNumber: "FC-0002",
    name: "Journal entry approval review",
    description: "Review manual journal entries above the approval threshold for support, accuracy, and authorization.",
    category: "journal_review",
    frequency: "weekly",
    riskLevel: "high",
    ownerId: adminId,
    reviewerId: reviewerId ?? adminId,
    threshold: "10000",
  });
  const closeChecklist = await findOrCreateControl({
    orgId,
    controlNumber: "FC-0003",
    name: "Month-end close checklist",
    description: "Confirm subledgers, accruals, reconciliations, and management review are complete before closing the period.",
    category: "period_close",
    frequency: "monthly",
    riskLevel: "critical",
    ownerId: adminId,
    reviewerId: reviewerId ?? accountantId,
    dueDay: 7,
  });
  const segregation = await findOrCreateControl({
    orgId,
    controlNumber: "FC-0004",
    name: "Payment duties segregation review",
    description: "Review payment preparation and approval access to identify conflicting duties before the payment run.",
    category: "segregation_of_duties",
    frequency: "quarterly",
    riskLevel: "critical",
    ownerId: adminId,
    reviewerId: reviewerId ?? accountantId,
  });

  const passedRun = await findOrCreateRun({
    controlId: bankRecon.id,
    orgId,
    runNumber: "CR-0001",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    dueDate: "2026-08-05",
    status: "completed",
    result: "passed",
    performedBy: accountantId,
    reviewedBy: reviewerId ?? adminId,
    performedAt: new Date("2026-08-03T09:00:00Z"),
    reviewedAt: new Date("2026-08-04T11:30:00Z"),
    notes: "All bank accounts reconciled and review signed off.",
    evidenceReference: "BANK-RECON-JUL-2026",
  });
  const journalRun = await findOrCreateRun({
    controlId: journalReview.id,
    orgId,
    runNumber: "CR-0002",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    dueDate: "2026-08-31",
    status: "completed",
    result: "partial",
    performedBy: adminId,
    reviewedBy: reviewerId ?? accountantId,
    performedAt: new Date("2026-08-31T10:00:00Z"),
    reviewedAt: null,
    notes: "One manual entry requires supporting documentation.",
    evidenceReference: "JE-REVIEW-W35-2026",
    exceptionCount: 1,
  });
  await findOrCreateRun({
    controlId: closeChecklist.id,
    orgId,
    runNumber: "CR-0003",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    dueDate: "2026-09-07",
    status: "in_progress",
    result: "pending",
    performedBy: adminId,
    reviewedBy: null,
    notes: "August close is in progress.",
    evidenceReference: "CLOSE-CHECKLIST-AUG-2026",
  });
  await findOrCreateRun({
    controlId: segregation.id,
    orgId,
    runNumber: "CR-0004",
    periodStart: "2026-07-01",
    periodEnd: "2026-09-30",
    dueDate: "2026-10-07",
    status: "pending",
    result: "pending",
    performedBy: null,
    reviewedBy: null,
    notes: "Scheduled quarterly access review.",
    evidenceReference: "SOD-REVIEW-Q3-2026",
  });

  const [existingException] = await db
    .select()
    .from(controlExceptions)
    .where(eq(controlExceptions.exceptionNumber, "EX-0001"))
    .limit(1);
  if (!existingException) {
    await db.insert(controlExceptions).values({
      controlRunId: journalRun.id,
      orgId,
      exceptionNumber: "EX-0001",
      title: "Manual journal entry missing supporting document",
      description: "The weekly journal review identified one entry above the threshold without an attached invoice or approval note.",
      severity: "high",
      status: "open",
      assignedTo: accountantId,
      dueDate: "2026-09-05",
      createdBy: adminId,
    });
    await db.update(controlRuns).set({ exceptionCount: 1 }).where(eq(controlRuns.id, journalRun.id));
  } else if (existingException.controlRunId !== journalRun.id) {
    await db.update(controlExceptions)
      .set({ controlRunId: journalRun.id, updatedAt: new Date() })
      .where(eq(controlExceptions.id, existingException.id));
    await db.update(controlRuns).set({ exceptionCount: 0 }).where(eq(controlRuns.id, passedRun.id));
    await db.update(controlRuns).set({ exceptionCount: 1 }).where(eq(controlRuns.id, journalRun.id));
  }

  console.log("Financial controls seed complete.");
  await pool.end();
}

seed().catch((error) => {
  console.error("Financial controls seed failed:", error);
  process.exit(1);
});