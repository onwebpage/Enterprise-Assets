/**
 * /api/finance/accounts — Chart of Accounts CRUD
 *
 * All routes require authentication.
 * Write routes (POST / PUT / DELETE) additionally require the 'finance' module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, isNull } from "drizzle-orm";
import { db, chartOfAccounts, permissions, roles } from "@workspace/db";
import { insertChartOfAccountSchema, updateChartOfAccountSchema } from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

// ── Helpers ───────────────────────────────────────────────────────────────────

function scopeFilter(req: AuthRequest) {
  const { orgId } = req.user!;
  // Return accounts belonging to this org OR global (null) accounts
  return orgId !== null
    ? or(eq(chartOfAccounts.orgId, orgId), isNull(chartOfAccounts.orgId))
    : isNull(chartOfAccounts.orgId);
}

// ── GET /api/finance/accounts ─────────────────────────────────────────────────
// Query params: search, type, status, parentId ("root" for top-level), page, limit
router.get("/", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  try {
    const page  = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 50))));
    const offset = (page - 1) * limit;

    const { search, type, status, parentId } = req.query as Record<string, string>;

    const filters: ReturnType<typeof eq>[] = [];
    const scope = scopeFilter(req);
    if (scope) filters.push(scope as any);

    if (search?.trim()) {
      filters.push(
        or(
          ilike(chartOfAccounts.code, `%${search.trim()}%`),
          ilike(chartOfAccounts.name, `%${search.trim()}%`),
        ) as any,
      );
    }
    if (type)   filters.push(eq(chartOfAccounts.type,   type)   as any);
    if (status) filters.push(eq(chartOfAccounts.status, status) as any);
    if (parentId === "root") {
      filters.push(isNull(chartOfAccounts.parentId) as any);
    } else if (parentId) {
      filters.push(eq(chartOfAccounts.parentId, parseInt(parentId)) as any);
    }

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(chartOfAccounts)
        .where(where)
        .orderBy(chartOfAccounts.code)
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(chartOfAccounts)
        .where(where),
    ]);

    // For each row, check if it has children (so the UI can show expand indicators)
    const parentIds = rows.map((r) => r.id);
    let childCounts: Record<number, number> = {};
    if (parentIds.length > 0) {
      const counts = await db
        .select({
          parentId: chartOfAccounts.parentId,
          cnt: sql<number>`count(*)::int`,
        })
        .from(chartOfAccounts)
        .where(
          and(
            sql`${chartOfAccounts.parentId} = any(${sql.raw(`ARRAY[${parentIds.join(",")}]::int[]`)})`,
          ),
        )
        .groupBy(chartOfAccounts.parentId);
      counts.forEach((c) => { if (c.parentId) childCounts[c.parentId] = c.cnt; });
    }

    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, childCount: childCounts[r.id] ?? 0 })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch accounts" });
  }
});

// ── GET /api/finance/accounts/parents — lightweight list for dropdowns ────────
router.get("/parents", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  try {
    const scope = scopeFilter(req);
    const rows = await db
      .select({ id: chartOfAccounts.id, code: chartOfAccounts.code, name: chartOfAccounts.name, type: chartOfAccounts.type })
      .from(chartOfAccounts)
      .where(scope as any)
      .orderBy(chartOfAccounts.code);
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch parent options" });
  }
});

// ── GET /api/finance/accounts/my-permissions — current user's finance perms ───
router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;

    // No roleId → super-admin
    if (roleId === null) {
      return res.json({
        success: true,
        data: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      });
    }

    // System roles bypass per-module checks
    const [role] = await db
      .select({ isSystem: roles.isSystem })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (role?.isSystem) {
      return res.json({
        success: true,
        data: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      });
    }

    // Look up the Finance module permission (case-insensitive)
    const [perm] = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.roleId, roleId), sql`lower(${permissions.module}) = 'finance'`))
      .limit(1);

    res.json({
      success: true,
      data: perm
        ? { canView: perm.canView, canCreate: perm.canCreate, canEdit: perm.canEdit, canDelete: perm.canDelete }
        : { canView: false, canCreate: false, canEdit: false, canDelete: false },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch permissions" });
  }
});

// ── POST /api/finance/accounts ────────────────────────────────────────────────
router.post("/", requirePermission("finance", "create"), async (req: AuthRequest, res) => {
  const parsed = insertChartOfAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
  }

  try {
    const { orgId } = req.user!;
    const data = parsed.data;

    // Ensure code is unique within scope
    const [existing] = await db
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.code, data.code), scopeFilter(req) as any))
      .limit(1);
    if (existing) {
      return res.status(409).json({ success: false, error: `Account code "${data.code}" already exists` });
    }

    // Validate parent belongs to same scope
    if (data.parentId) {
      const [parent] = await db
        .select({ id: chartOfAccounts.id })
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.id, data.parentId), scopeFilter(req) as any))
        .limit(1);
      if (!parent) {
        return res.status(422).json({ success: false, error: "Parent account not found" });
      }
    }

    const [created] = await db
      .insert(chartOfAccounts)
      .values({ ...data, orgId: data.orgId ?? orgId })
      .returning();

    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create account" });
  }
});

// ── GET /api/finance/accounts/:id ─────────────────────────────────────────────
router.get("/:id", requirePermission("finance", "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });

  try {
    const [row] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.id, id), scopeFilter(req) as any))
      .limit(1);

    if (!row) return res.status(404).json({ success: false, error: "Account not found" });
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch account" });
  }
});

// ── PUT /api/finance/accounts/:id ─────────────────────────────────────────────
router.put("/:id", requirePermission("finance", "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });

  const parsed = updateChartOfAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
  }

  try {
    // Confirm exists in scope
    const [existing] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.id, id), scopeFilter(req) as any))
      .limit(1);
    if (!existing) return res.status(404).json({ success: false, error: "Account not found" });

    const data = parsed.data;

    // Code uniqueness check (excluding self)
    if (data.code && data.code !== existing.code) {
      const [dup] = await db
        .select({ id: chartOfAccounts.id })
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.code, data.code), scopeFilter(req) as any))
        .limit(1);
      if (dup && dup.id !== id) {
        return res.status(409).json({ success: false, error: `Account code "${data.code}" already exists` });
      }
    }

    // Prevent circular parent reference
    if (data.parentId && data.parentId === id) {
      return res.status(422).json({ success: false, error: "An account cannot be its own parent" });
    }

    const [updated] = await db
      .update(chartOfAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(chartOfAccounts.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update account" });
  }
});

// ── DELETE /api/finance/accounts/:id ──────────────────────────────────────────
router.delete("/:id", requirePermission("finance", "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });

  try {
    const [existing] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.id, id), scopeFilter(req) as any))
      .limit(1);
    if (!existing) return res.status(404).json({ success: false, error: "Account not found" });

    // Refuse if any children exist (DB constraint would also catch it, but give a clear message)
    const [{ childCount }] = await db
      .select({ childCount: sql<number>`count(*)::int` })
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.parentId, id));

    if (childCount > 0) {
      return res.status(409).json({
        success: false,
        error: `Cannot delete account "${existing.name}" — it has ${childCount} child account(s). Remove or re-parent them first.`,
      });
    }

    await db.delete(chartOfAccounts).where(eq(chartOfAccounts.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete account" });
  }
});

export default router;
