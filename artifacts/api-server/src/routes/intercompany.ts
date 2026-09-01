import { Router } from "express";
import { and, asc, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import {
  chartOfAccounts,
  db,
  financialPeriods,
  intercompanyEliminations,
  intercompanyRelationships,
  intercompanyTransactions,
  journalEntries,
  journalEntryLines,
  organizations,
  permissions,
  roles,
} from "@workspace/db";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const relationshipInput = z.object({
  fromOrgId: z.coerce.number().int().positive(),
  toOrgId: z.coerce.number().int().positive(),
  fromDueFromAccountId: z.coerce.number().int().positive(),
  toDueToAccountId: z.coerce.number().int().positive(),
  currency: z.string().trim().length(3).default("INR").transform((value) => value.toUpperCase()),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  notes: z.string().trim().max(500).optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.fromOrgId === value.toOrgId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["toOrgId"], message: "A company cannot transact with itself" });
  }
});

const transactionInput = z.object({
  relationshipId: z.coerce.number().int().positive(),
  transactionDate: z.string().regex(ISO_DATE, "Date must be YYYY-MM-DD"),
  dueDate: z.string().regex(ISO_DATE, "Due date must be YYYY-MM-DD").optional().nullable(),
  description: z.string().trim().min(1).max(500),
  reference: z.string().trim().max(100).optional().nullable(),
  amount: z.coerce.number().positive().finite(),
  currency: z.string().trim().length(3).default("INR").transform((value) => value.toUpperCase()),
  fromSettlementAccountId: z.coerce.number().int().positive(),
  toSettlementAccountId: z.coerce.number().int().positive(),
});

const companyInput = z.object({
  name: z.string().trim().min(1).max(160),
  legalName: z.string().trim().max(200).optional().nullable(),
  currency: z.string().trim().length(3).default("INR").transform((value) => value.toUpperCase()),
  type: z.enum(["Parent", "Subsidiary"]).default("Subsidiary"),
  status: z.enum(["active", "inactive"]).default("active"),
  country: z.string().trim().max(80).optional().nullable(),
  gstin: z.string().trim().max(30).optional().nullable(),
});

function idFromParam(value: string | string[]) {
  const id = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validCalendarDate(value: string | null | undefined) {
  if (!value || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function relationshipScope(req: AuthRequest) {
  return req.user!.orgId === null
    ? undefined
    : or(eq(intercompanyRelationships.fromOrgId, req.user!.orgId), eq(intercompanyRelationships.toOrgId, req.user!.orgId));
}

function transactionScope(req: AuthRequest) {
  return req.user!.orgId === null
    ? undefined
    : or(eq(intercompanyTransactions.fromOrgId, req.user!.orgId), eq(intercompanyTransactions.toOrgId, req.user!.orgId));
}

function accountScope(accountId: number, orgId: number) {
  return and(eq(chartOfAccounts.id, accountId), eq(chartOfAccounts.status, "active"),
    or(eq(chartOfAccounts.orgId, orgId), isNull(chartOfAccounts.orgId)));
}

async function getRelationship(req: AuthRequest, id: number) {
  const [relationship] = await db.select({
    id: intercompanyRelationships.id,
    fromOrgId: intercompanyRelationships.fromOrgId,
    toOrgId: intercompanyRelationships.toOrgId,
    fromDueFromAccountId: intercompanyRelationships.fromDueFromAccountId,
    toDueToAccountId: intercompanyRelationships.toDueToAccountId,
    currency: intercompanyRelationships.currency,
    status: intercompanyRelationships.status,
    notes: intercompanyRelationships.notes,
    fromCompany: organizations.name,
  }).from(intercompanyRelationships)
    .innerJoin(organizations, eq(organizations.id, intercompanyRelationships.fromOrgId))
    .where(and(eq(intercompanyRelationships.id, id), relationshipScope(req)))
    .limit(1);
  if (!relationship) return null;
  const [toCompany] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, relationship.toOrgId)).limit(1);
  return { ...relationship, toCompany: toCompany?.name ?? `Company ${relationship.toOrgId}` };
}

async function getTransaction(req: AuthRequest, id: number) {
  const [transaction] = await db.select({
    id: intercompanyTransactions.id,
    relationshipId: intercompanyTransactions.relationshipId,
    transactionNumber: intercompanyTransactions.transactionNumber,
    fromOrgId: intercompanyTransactions.fromOrgId,
    toOrgId: intercompanyTransactions.toOrgId,
    transactionDate: intercompanyTransactions.transactionDate,
    dueDate: intercompanyTransactions.dueDate,
    description: intercompanyTransactions.description,
    reference: intercompanyTransactions.reference,
    amount: intercompanyTransactions.amount,
    currency: intercompanyTransactions.currency,
    fromSettlementAccountId: intercompanyTransactions.fromSettlementAccountId,
    toSettlementAccountId: intercompanyTransactions.toSettlementAccountId,
    status: intercompanyTransactions.status,
    fromJournalEntryId: intercompanyTransactions.fromJournalEntryId,
    toJournalEntryId: intercompanyTransactions.toJournalEntryId,
    postedAt: intercompanyTransactions.postedAt,
    postedBy: intercompanyTransactions.postedBy,
    settledAt: intercompanyTransactions.settledAt,
    eliminatedAt: intercompanyTransactions.eliminatedAt,
    createdAt: intercompanyTransactions.createdAt,
    updatedAt: intercompanyTransactions.updatedAt,
    fromCompany: sql<string>`${organizations.name}`,
  }).from(intercompanyTransactions)
    .innerJoin(organizations, eq(organizations.id, intercompanyTransactions.fromOrgId))
    .where(and(eq(intercompanyTransactions.id, id), transactionScope(req)))
    .limit(1);
  if (!transaction) return null;
  const [toCompany] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, transaction.toOrgId)).limit(1);
  const [relationship] = await db.select({
    fromDueFromAccountId: intercompanyRelationships.fromDueFromAccountId,
    toDueToAccountId: intercompanyRelationships.toDueToAccountId,
    currency: intercompanyRelationships.currency,
  }).from(intercompanyRelationships).where(eq(intercompanyRelationships.id, transaction.relationshipId)).limit(1);
  const [elimination] = await db.select().from(intercompanyEliminations).where(eq(intercompanyEliminations.transactionId, id)).limit(1);
  return { ...transaction, toCompany: toCompany?.name ?? `Company ${transaction.toOrgId}`, relationship, elimination: elimination ?? null };
}

async function ensureOpenForOrg(orgId: number, date: string) {
  const [period] = await db.select({ status: financialPeriods.status, name: financialPeriods.name })
    .from(financialPeriods)
    .where(and(eq(financialPeriods.orgId, orgId), lte(financialPeriods.startDate, date), gte(financialPeriods.endDate, date)))
    .orderBy(desc(financialPeriods.id))
    .limit(1);
  if (period && period.status !== "open") {
    throw new Error(`The ${period.name} period is ${period.status.replace("_", " ")} and does not accept postings`);
  }
}

async function validateCompany(id: number) {
  const [company] = await db.select({ id: organizations.id, name: organizations.name, status: organizations.status })
    .from(organizations).where(eq(organizations.id, id)).limit(1);
  return company?.status === "active" ? company : null;
}

async function validateAccount(id: number, orgId: number) {
  const [account] = await db.select({
    id: chartOfAccounts.id, code: chartOfAccounts.code, name: chartOfAccounts.name,
    type: chartOfAccounts.type, normalBalance: chartOfAccounts.normalBalance,
  }).from(chartOfAccounts).where(accountScope(id, orgId)).limit(1);
  return account ?? null;
}

async function nextTransactionNumber(tx: any = db) {
  const [row] = await tx.select({ max: sql<string>`max(${intercompanyTransactions.transactionNumber})` }).from(intercompanyTransactions);
  const max = row?.max ? parseInt(row.max.replace(/^IC-0*/, "") || "0", 10) : 0;
  return `IC-${String(max + 1).padStart(4, "0")}`;
}

async function nextEntryNumber(orgId: number, tx: any) {
  const [row] = await tx.select({ max: sql<string>`max(${journalEntries.entryNumber})` })
    .from(journalEntries).where(eq(journalEntries.orgId, orgId));
  const max = row?.max ? parseInt(row.max.replace(/^JE-0*/, "") || "0", 10) : 0;
  return `JE-${String(max + 1).padStart(4, "0")}`;
}

async function updateAccountBalance(tx: any, accountId: number, debit: number, credit: number) {
  const [account] = await tx.select({
    id: chartOfAccounts.id, balance: chartOfAccounts.balance, normalBalance: chartOfAccounts.normalBalance,
  }).from(chartOfAccounts).where(eq(chartOfAccounts.id, accountId)).limit(1);
  if (!account) throw new Error("An account referenced by the transaction no longer exists");
  const current = parseFloat(account.balance ?? "0");
  const balance = account.normalBalance === "Debit" ? current + debit - credit : current + credit - debit;
  await tx.update(chartOfAccounts).set({ balance: balance.toFixed(2), updatedAt: new Date() }).where(eq(chartOfAccounts.id, accountId));
}

async function createJournalEntry(tx: any, values: {
  orgId: number; date: string; memo: string; reference: string | null;
  createdBy: number; debitAccountId: number; creditAccountId: number; amount: string;
}) {
  const entryNumber = await nextEntryNumber(values.orgId, tx);
  const [entry] = await tx.insert(journalEntries).values({
    orgId: values.orgId,
    entryNumber,
    date: values.date,
    reference: values.reference,
    memo: values.memo,
    status: "posted",
    totalDebit: values.amount,
    totalCredit: values.amount,
    createdBy: values.createdBy,
  }).returning();
  await tx.insert(journalEntryLines).values([
    { journalEntryId: entry.id, accountId: values.debitAccountId, description: values.memo, debit: values.amount, credit: "0", sequence: 0 },
    { journalEntryId: entry.id, accountId: values.creditAccountId, description: values.memo, debit: "0", credit: values.amount, sequence: 1 },
  ]);
  const amount = parseFloat(values.amount);
  await updateAccountBalance(tx, values.debitAccountId, amount, 0);
  await updateAccountBalance(tx, values.creditAccountId, 0, amount);
  return entry;
}

router.get("/permissions", async (req: AuthRequest, res) => {
  try {
    if (req.user!.roleId === null) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true, canManageCompanies: req.user!.orgId === null } }); return;
    }
    const [role] = await db.select({ isSystem: roles.isSystem }).from(roles).where(eq(roles.id, req.user!.roleId)).limit(1);
    if (role?.isSystem) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true, canManageCompanies: req.user!.orgId === null } }); return;
    }
    const [permission] = await db.select().from(permissions)
      .where(and(eq(permissions.roleId, req.user!.roleId), sql`lower(${permissions.module}) = 'finance'`)).limit(1);
    res.json({ success: true, data: permission ? {
      canView: permission.canView, canCreate: permission.canCreate, canEdit: permission.canEdit, canDelete: permission.canDelete,
    } : { canView: false, canCreate: false, canEdit: false, canDelete: false, canManageCompanies: false } });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch intercompany permissions" }); }
});

router.get("/companies", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  try {
    const data = await db.select({
      id: organizations.id, name: organizations.name, legalName: organizations.legalName,
      currency: organizations.currency, type: organizations.type, status: organizations.status,
    }).from(organizations)
      .where(req.user!.orgId === null ? undefined : eq(organizations.id, req.user!.orgId))
      .orderBy(asc(organizations.name));
    res.json({ success: true, data });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch companies" }); }
});

router.post("/companies", requirePermission("finance", "create"), async (req: AuthRequest, res) => {
  if (req.user!.orgId !== null) { res.status(403).json({ success: false, error: "Only a group administrator can create companies" }); return; }
  const parsed = companyInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const value = parsed.data;
    const [created] = await db.insert(organizations).values({
      ...value,
      legalName: value.legalName ?? null,
      country: value.country ?? null,
      gstin: value.gstin ?? null,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) { console.error(error); res.status(500).json({ success: false, error: "Failed to create company" }); }
});

router.put("/companies/:id", requirePermission("finance", "edit"), async (req: AuthRequest, res) => {
  if (req.user!.orgId !== null) { res.status(403).json({ success: false, error: "Only a group administrator can edit companies" }); return; }
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid company id" }); return; }
  const parsed = companyInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [updated] = await db.update(organizations).set({
      ...parsed.data,
      legalName: parsed.data.legalName ?? null,
      country: parsed.data.country ?? null,
      gstin: parsed.data.gstin ?? null,
      updatedAt: new Date(),
    }).where(eq(organizations.id, id)).returning();
    if (!updated) { res.status(404).json({ success: false, error: "Company not found" }); return; }
    res.json({ success: true, data: updated });
  } catch { res.status(500).json({ success: false, error: "Failed to update company" }); }
});

router.delete("/companies/:id", requirePermission("finance", "delete"), async (req: AuthRequest, res) => {
  if (req.user!.orgId !== null) { res.status(403).json({ success: false, error: "Only a group administrator can delete companies" }); return; }
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid company id" }); return; }
  try {
    const [relationship] = await db.select({ id: intercompanyRelationships.id }).from(intercompanyRelationships)
      .where(or(eq(intercompanyRelationships.fromOrgId, id), eq(intercompanyRelationships.toOrgId, id))).limit(1);
    const [transaction] = await db.select({ id: intercompanyTransactions.id }).from(intercompanyTransactions)
      .where(or(eq(intercompanyTransactions.fromOrgId, id), eq(intercompanyTransactions.toOrgId, id))).limit(1);
    if (relationship || transaction) {
      res.status(409).json({ success: false, error: "Companies with intercompany history cannot be deleted; mark the company inactive instead" }); return;
    }
    const [deleted] = await db.delete(organizations).where(eq(organizations.id, id)).returning({ id: organizations.id });
    if (!deleted) { res.status(404).json({ success: false, error: "Company not found" }); return; }
    res.json({ success: true, data: deleted });
  } catch { res.status(409).json({ success: false, error: "Company cannot be deleted because other business records still reference it" }); }
});

router.get("/accounts", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  const orgId = Number(req.query.orgId);
  if (!Number.isInteger(orgId) || orgId <= 0) { res.status(400).json({ success: false, error: "A valid company is required" }); return; }
  try {
    if (req.user!.orgId !== null && orgId !== req.user!.orgId) {
      res.status(403).json({ success: false, error: "You can only view accounts for your company" }); return;
    }
    const data = await db.select({
      id: chartOfAccounts.id, code: chartOfAccounts.code, name: chartOfAccounts.name,
      type: chartOfAccounts.type, normalBalance: chartOfAccounts.normalBalance, balance: chartOfAccounts.balance,
    }).from(chartOfAccounts).where(or(eq(chartOfAccounts.orgId, orgId), isNull(chartOfAccounts.orgId)))
      .orderBy(asc(chartOfAccounts.code));
    res.json({ success: true, data });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch company accounts" }); }
});

router.get("/relationships", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  try {
    const data = await db.select({
      id: intercompanyRelationships.id,
      fromOrgId: intercompanyRelationships.fromOrgId,
      toOrgId: intercompanyRelationships.toOrgId,
      fromDueFromAccountId: intercompanyRelationships.fromDueFromAccountId,
      toDueToAccountId: intercompanyRelationships.toDueToAccountId,
      currency: intercompanyRelationships.currency,
      status: intercompanyRelationships.status,
      notes: intercompanyRelationships.notes,
      createdAt: intercompanyRelationships.createdAt,
    }).from(intercompanyRelationships)
      .innerJoin(organizations, eq(organizations.id, intercompanyRelationships.fromOrgId))
      .where(relationshipScope(req))
      .orderBy(desc(intercompanyRelationships.createdAt));
    const companies = await db.select({ id: organizations.id, name: organizations.name }).from(organizations);
    const names = new Map(companies.map((company) => [company.id, company.name]));
    res.json({ success: true, data: data.map((row) => ({
      ...row, fromCompany: names.get(row.fromOrgId) ?? `Company ${row.fromOrgId}`, toCompany: names.get(row.toOrgId) ?? `Company ${row.toOrgId}`,
    })) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch intercompany relationships" });
  }
});

router.post("/relationships", requirePermission("finance", "create"), async (req: AuthRequest, res) => {
  const parsed = relationshipInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const value = parsed.data;
    if (req.user!.orgId !== null && value.fromOrgId !== req.user!.orgId && value.toOrgId !== req.user!.orgId) {
      res.status(403).json({ success: false, error: "You can only configure relationships involving your company" }); return;
    }
    if (!(await validateCompany(value.fromOrgId)) || !(await validateCompany(value.toOrgId))) {
      res.status(422).json({ success: false, error: "Both companies must be active" }); return;
    }
    const fromAccount = await validateAccount(value.fromDueFromAccountId, value.fromOrgId);
    const toAccount = await validateAccount(value.toDueToAccountId, value.toOrgId);
    if (!fromAccount || fromAccount.type !== "Asset") { res.status(422).json({ success: false, error: "The due-from account must be an active Asset account in the sending company" }); return; }
    if (!toAccount || toAccount.type !== "Liability") { res.status(422).json({ success: false, error: "The due-to account must be an active Liability account in the receiving company" }); return; }
    const [duplicate] = await db.select({ id: intercompanyRelationships.id }).from(intercompanyRelationships)
      .where(and(eq(intercompanyRelationships.fromOrgId, value.fromOrgId), eq(intercompanyRelationships.toOrgId, value.toOrgId))).limit(1);
    if (duplicate) { res.status(409).json({ success: false, error: "This company direction already has a relationship" }); return; }
    const [created] = await db.insert(intercompanyRelationships).values({ ...value, createdBy: req.user!.userId, notes: value.notes ?? null }).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) { console.error(error); res.status(500).json({ success: false, error: "Failed to create intercompany relationship" }); }
});

router.put("/relationships/:id", requirePermission("finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid relationship id" }); return; }
  const parsed = relationshipInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const existing = await getRelationship(req, id);
    if (!existing) { res.status(404).json({ success: false, error: "Relationship not found" }); return; }
    const value = parsed.data;
    if (value.fromOrgId !== existing.fromOrgId || value.toOrgId !== existing.toOrgId) {
      res.status(409).json({ success: false, error: "Company direction cannot be changed after setup" }); return;
    }
    const fromAccount = await validateAccount(value.fromDueFromAccountId, value.fromOrgId);
    const toAccount = await validateAccount(value.toDueToAccountId, value.toOrgId);
    if (!fromAccount || fromAccount.type !== "Asset" || !toAccount || toAccount.type !== "Liability") {
      res.status(422).json({ success: false, error: "Due-from must be an Asset and due-to must be a Liability account" }); return;
    }
    const [updated] = await db.update(intercompanyRelationships).set({ ...value, notes: value.notes ?? null, updatedAt: new Date() })
      .where(and(eq(intercompanyRelationships.id, id), relationshipScope(req))).returning();
    res.json({ success: true, data: updated });
  } catch { res.status(500).json({ success: false, error: "Failed to update intercompany relationship" }); }
});

router.delete("/relationships/:id", requirePermission("finance", "delete"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid relationship id" }); return; }
  try {
    const existing = await getRelationship(req, id);
    if (!existing) { res.status(404).json({ success: false, error: "Relationship not found" }); return; }
    const [used] = await db.select({ id: intercompanyTransactions.id }).from(intercompanyTransactions).where(eq(intercompanyTransactions.relationshipId, id)).limit(1);
    if (used) { res.status(409).json({ success: false, error: "Relationships with transaction history cannot be deleted; mark them inactive instead" }); return; }
    await db.delete(intercompanyRelationships).where(and(eq(intercompanyRelationships.id, id), relationshipScope(req)));
    res.json({ success: true, data: { id } });
  } catch { res.status(500).json({ success: false, error: "Failed to delete intercompany relationship" }); }
});

router.get("/summary", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  try {
    const rows = await db.select({
      status: intercompanyTransactions.status,
      amount: intercompanyTransactions.amount,
    }).from(intercompanyTransactions).where(transactionScope(req));
    const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
    const open = rows.filter((row) => row.status === "draft" || row.status === "posted").reduce((sum, row) => sum + Number(row.amount), 0);
    const posted = rows.filter((row) => row.status === "posted" || row.status === "settled").reduce((sum, row) => sum + Number(row.amount), 0);
    res.json({ success: true, data: {
      relationshipCount: await db.select({ count: sql<number>`count(*)::int` }).from(intercompanyRelationships).where(relationshipScope(req)).then(([row]) => row?.count ?? 0),
      transactionCount: rows.length, totalAmount: total, openAmount: open, postedAmount: posted,
      draftCount: rows.filter((row) => row.status === "draft").length,
      postedCount: rows.filter((row) => row.status === "posted" || row.status === "settled").length,
      eliminationCount: rows.filter((row) => row.status === "eliminated").length,
    } });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch intercompany summary" }); }
});

router.get("/transactions", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filters = [transactionScope(req)];
    if (status && ["draft", "posted", "settled", "eliminated", "void"].includes(status)) filters.push(eq(intercompanyTransactions.status, status));
    if (search) filters.push(or(ilike(intercompanyTransactions.transactionNumber, `%${search}%`), ilike(intercompanyTransactions.description, `%${search}%`), ilike(intercompanyTransactions.reference, `%${search}%`))!);
    const rows = await db.select({
      id: intercompanyTransactions.id,
      relationshipId: intercompanyTransactions.relationshipId,
      transactionNumber: intercompanyTransactions.transactionNumber,
      fromOrgId: intercompanyTransactions.fromOrgId,
      toOrgId: intercompanyTransactions.toOrgId,
      transactionDate: intercompanyTransactions.transactionDate,
      dueDate: intercompanyTransactions.dueDate,
      description: intercompanyTransactions.description,
      reference: intercompanyTransactions.reference,
      amount: intercompanyTransactions.amount,
      currency: intercompanyTransactions.currency,
      status: intercompanyTransactions.status,
      fromJournalEntryId: intercompanyTransactions.fromJournalEntryId,
      toJournalEntryId: intercompanyTransactions.toJournalEntryId,
      postedAt: intercompanyTransactions.postedAt,
      settledAt: intercompanyTransactions.settledAt,
      eliminatedAt: intercompanyTransactions.eliminatedAt,
      createdAt: intercompanyTransactions.createdAt,
    }).from(intercompanyTransactions)
      .innerJoin(organizations, eq(organizations.id, intercompanyTransactions.fromOrgId))
      .where(and(...filters)).orderBy(desc(intercompanyTransactions.transactionDate), desc(intercompanyTransactions.id));
    const companies = await db.select({ id: organizations.id, name: organizations.name }).from(organizations);
    const names = new Map(companies.map((company) => [company.id, company.name]));
    res.json({ success: true, data: rows.map((row) => ({
      ...row, fromCompany: names.get(row.fromOrgId) ?? `Company ${row.fromOrgId}`, toCompany: names.get(row.toOrgId) ?? `Company ${row.toOrgId}`,
    })) });
  } catch (error) { console.error(error); res.status(500).json({ success: false, error: "Failed to fetch intercompany transactions" }); }
});

router.get("/transactions/:id", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid transaction id" }); return; }
  try {
    const transaction = await getTransaction(req, id);
    if (!transaction) { res.status(404).json({ success: false, error: "Intercompany transaction not found" }); return; }
    res.json({ success: true, data: transaction });
  } catch { res.status(500).json({ success: false, error: "Failed to fetch intercompany transaction" }); }
});

router.post("/transactions", requirePermission("finance", "create"), async (req: AuthRequest, res) => {
  const parsed = transactionInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const value = parsed.data;
    if (!validCalendarDate(value.transactionDate) || (value.dueDate && !validCalendarDate(value.dueDate))) {
      res.status(422).json({ success: false, error: "Transaction and due dates must be real calendar dates" }); return;
    }
    const relationship = await getRelationship(req, value.relationshipId);
    if (!relationship) { res.status(404).json({ success: false, error: "Intercompany relationship not found" }); return; }
    if (relationship.status !== "active") { res.status(409).json({ success: false, error: "Only active relationships can create transactions" }); return; }
    if (value.currency !== relationship.currency) { res.status(422).json({ success: false, error: `Transaction currency must match the relationship currency (${relationship.currency})` }); return; }
    const fromAccount = await validateAccount(value.fromSettlementAccountId, relationship.fromOrgId);
    const toAccount = await validateAccount(value.toSettlementAccountId, relationship.toOrgId);
    if (!fromAccount || !toAccount) { res.status(422).json({ success: false, error: "Settlement accounts must be active accounts in their respective companies" }); return; }
    if (value.dueDate && value.dueDate < value.transactionDate) { res.status(422).json({ success: false, error: "Due date cannot be before transaction date" }); return; }
    const [created] = await db.insert(intercompanyTransactions).values({
      ...value,
      amount: value.amount.toFixed(2),
      fromOrgId: relationship.fromOrgId,
      toOrgId: relationship.toOrgId,
      transactionNumber: await nextTransactionNumber(),
      createdBy: req.user!.userId,
      reference: value.reference ?? null,
      dueDate: value.dueDate ?? null,
      currency: value.currency,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) { console.error(error); res.status(500).json({ success: false, error: "Failed to create intercompany transaction" }); }
});

router.put("/transactions/:id", requirePermission("finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid transaction id" }); return; }
  const parsed = transactionInput.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const existing = await getTransaction(req, id);
    if (!existing) { res.status(404).json({ success: false, error: "Intercompany transaction not found" }); return; }
    if (existing.status !== "draft") { res.status(409).json({ success: false, error: "Only draft transactions can be edited" }); return; }
    const value = parsed.data;
    if (!validCalendarDate(value.transactionDate) || (value.dueDate && !validCalendarDate(value.dueDate))) {
      res.status(422).json({ success: false, error: "Transaction and due dates must be real calendar dates" }); return;
    }
    if (value.dueDate && value.dueDate < value.transactionDate) { res.status(422).json({ success: false, error: "Due date cannot be before transaction date" }); return; }
    const relationship = await getRelationship(req, value.relationshipId);
    if (!relationship || relationship.status !== "active") { res.status(409).json({ success: false, error: "Select an active intercompany relationship" }); return; }
    if (value.currency !== relationship.currency) { res.status(422).json({ success: false, error: `Transaction currency must match the relationship currency (${relationship.currency})` }); return; }
    if (existing.fromOrgId !== relationship.fromOrgId || existing.toOrgId !== relationship.toOrgId) {
      res.status(409).json({ success: false, error: "Company direction cannot change on an existing transaction" }); return;
    }
    if (!await validateAccount(value.fromSettlementAccountId, relationship.fromOrgId) || !await validateAccount(value.toSettlementAccountId, relationship.toOrgId)) {
      res.status(422).json({ success: false, error: "Settlement accounts must be active accounts in their respective companies" }); return;
    }
    const [updated] = await db.update(intercompanyTransactions).set({
      ...value, amount: value.amount.toFixed(2), reference: value.reference ?? null, dueDate: value.dueDate ?? null, updatedAt: new Date(),
    }).where(and(eq(intercompanyTransactions.id, id), transactionScope(req))).returning();
    res.json({ success: true, data: updated });
  } catch { res.status(500).json({ success: false, error: "Failed to update intercompany transaction" }); }
});

router.delete("/transactions/:id", requirePermission("finance", "delete"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid transaction id" }); return; }
  try {
    const existing = await getTransaction(req, id);
    if (!existing) { res.status(404).json({ success: false, error: "Intercompany transaction not found" }); return; }
    if (existing.status !== "draft") { res.status(409).json({ success: false, error: "Only draft transactions can be deleted" }); return; }
    await db.delete(intercompanyTransactions).where(and(eq(intercompanyTransactions.id, id), transactionScope(req)));
    res.json({ success: true, data: { id } });
  } catch { res.status(500).json({ success: false, error: "Failed to delete intercompany transaction" }); }
});

router.post("/transactions/:id/post", requirePermission("finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid transaction id" }); return; }
  try {
    const transaction = await getTransaction(req, id);
    if (!transaction) { res.status(404).json({ success: false, error: "Intercompany transaction not found" }); return; }
    if (transaction.status !== "draft") { res.status(409).json({ success: false, error: "Only draft transactions can be posted" }); return; }
    const relationship = await getRelationship(req, transaction.relationshipId);
    if (!relationship || relationship.status !== "active") { res.status(409).json({ success: false, error: "The related company relationship is not active" }); return; }
    await ensureOpenForOrg(transaction.fromOrgId, transaction.transactionDate);
    await ensureOpenForOrg(transaction.toOrgId, transaction.transactionDate);
    const amount = Number(transaction.amount).toFixed(2);
    const result = await db.transaction(async (tx) => {
      const fromEntry = await createJournalEntry(tx, {
          orgId: transaction.fromOrgId, date: transaction.transactionDate, reference: transaction.reference,
          createdBy: req.user!.userId, debitAccountId: relationship.fromDueFromAccountId,
          creditAccountId: transaction.fromSettlementAccountId, amount,
          memo: `Intercompany ${transaction.transactionNumber} → ${transaction.toCompany}`,
        });
      const toEntry = await createJournalEntry(tx, {
          orgId: transaction.toOrgId, date: transaction.transactionDate, reference: transaction.reference,
          createdBy: req.user!.userId, debitAccountId: transaction.toSettlementAccountId,
          creditAccountId: relationship.toDueToAccountId, amount,
          memo: `Intercompany ${transaction.transactionNumber} ← ${transaction.fromCompany}`,
        });
      const [updated] = await tx.update(intercompanyTransactions).set({
        status: "posted", fromJournalEntryId: fromEntry.id, toJournalEntryId: toEntry.id,
        postedAt: new Date(), postedBy: req.user!.userId, updatedAt: new Date(),
      }).where(and(eq(intercompanyTransactions.id, id), eq(intercompanyTransactions.status, "draft"))).returning();
      if (!updated) throw new Error("Transaction was already posted by another request");
      return { updated, fromEntry, toEntry };
    });
    res.json({ success: true, data: result });
  } catch (error: any) { console.error(error); res.status(error?.message?.includes("period") ? 409 : 500).json({ success: false, error: error?.message ?? "Failed to post intercompany transaction" }); }
});

router.post("/transactions/:id/settle", requirePermission("finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid transaction id" }); return; }
  try {
    const transaction = await getTransaction(req, id);
    if (!transaction) { res.status(404).json({ success: false, error: "Intercompany transaction not found" }); return; }
    if (transaction.status !== "posted") { res.status(409).json({ success: false, error: "Only posted transactions can be settled" }); return; }
    const [updated] = await db.update(intercompanyTransactions).set({ status: "settled", settledAt: new Date(), updatedAt: new Date() })
      .where(and(eq(intercompanyTransactions.id, id), transactionScope(req))).returning();
    res.json({ success: true, data: updated });
  } catch { res.status(500).json({ success: false, error: "Failed to settle intercompany transaction" }); }
});

router.post("/transactions/:id/eliminate", requirePermission("finance", "edit"), async (req: AuthRequest, res) => {
  const id = idFromParam(req.params.id);
  if (!id) { res.status(400).json({ success: false, error: "Invalid transaction id" }); return; }
  try {
    const transaction = await getTransaction(req, id);
    if (!transaction) { res.status(404).json({ success: false, error: "Intercompany transaction not found" }); return; }
    if (transaction.status !== "posted" && transaction.status !== "settled") { res.status(409).json({ success: false, error: "Only posted or settled transactions can be eliminated" }); return; }
    if (!transaction.relationship) { res.status(409).json({ success: false, error: "The company relationship could not be found" }); return; }
    await ensureOpenForOrg(transaction.fromOrgId, transaction.transactionDate);
    await ensureOpenForOrg(transaction.toOrgId, transaction.transactionDate);
    const amount = Number(transaction.amount).toFixed(2);
    const result = await db.transaction(async (tx) => {
      const fromEntry = await createJournalEntry(tx, {
          orgId: transaction.fromOrgId, date: transaction.transactionDate, reference: `ELIM-${transaction.transactionNumber}`,
          createdBy: req.user!.userId, debitAccountId: transaction.fromSettlementAccountId,
          creditAccountId: transaction.relationship!.fromDueFromAccountId, amount,
          memo: `Eliminate ${transaction.transactionNumber} — ${transaction.fromCompany}`,
        });
      const toEntry = await createJournalEntry(tx, {
          orgId: transaction.toOrgId, date: transaction.transactionDate, reference: `ELIM-${transaction.transactionNumber}`,
          createdBy: req.user!.userId, debitAccountId: transaction.relationship!.toDueToAccountId,
          creditAccountId: transaction.toSettlementAccountId, amount,
          memo: `Eliminate ${transaction.transactionNumber} — ${transaction.toCompany}`,
        });
      const [elimination] = await tx.insert(intercompanyEliminations).values({
        transactionId: id, fromJournalEntryId: fromEntry.id, toJournalEntryId: toEntry.id,
        notes: typeof req.body?.notes === "string" ? req.body.notes.trim().slice(0, 500) : null,
        eliminatedBy: req.user!.userId,
      }).returning();
      const [updated] = await tx.update(intercompanyTransactions).set({ status: "eliminated", eliminatedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(intercompanyTransactions.id, id), or(eq(intercompanyTransactions.status, "posted"), eq(intercompanyTransactions.status, "settled")))).returning();
      if (!updated) throw new Error("Transaction was already eliminated by another request");
      return { updated, elimination, fromEntry, toEntry };
    });
    res.json({ success: true, data: result });
  } catch (error: any) { console.error(error); res.status(error?.message?.includes("period") ? 409 : 500).json({ success: false, error: error?.message ?? "Failed to eliminate intercompany transaction" }); }
});

export default router;