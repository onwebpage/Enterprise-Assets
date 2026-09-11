/**
 * /api/eway-bill — E-Way Bill Management
 *
 * Covers: E-Way Bill CRUD, generate, cancel, extend validity, and summary.
 * All routes require authentication + "E-Way Bill" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import {
  db, permissions, roles,
  ewayBills,
  organizations,
} from "@workspace/db";
import {
  insertEWayBillSchema, updateEWayBillSchema, cancelEWayBillSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "E-Way Bill";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Compute tax amounts from taxable value and rates. */
function computeTaxAmounts(taxableValue: number, cgstRate: number, sgstRate: number, igstRate: number, cessRate: number) {
  const cgst  = (taxableValue * cgstRate)  / 100;
  const sgst  = (taxableValue * sgstRate)  / 100;
  const igst  = (taxableValue * igstRate)  / 100;
  const cess  = (taxableValue * cessRate)  / 100;
  const total = cgst + sgst + igst + cess;
  return { cgst, sgst, igst, cess, total };
}

/** Generate a pseudo-unique 12-digit EWB number. */
function generateEWBNumber(): string {
  const ts   = Date.now().toString().slice(-9);
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return ts + rand; // 12 digits
}

/** Compute validity end datetime from generate time (distance-based, min 1 day). */
function computeValidUpto(distanceKm: number | null | undefined): { validFrom: string; validUpto: string } {
  const now      = new Date();
  const validFrom = now.toISOString().slice(0, 16);      // YYYY-MM-DDTHH:mm
  const days     = distanceKm && distanceKm > 0
    ? Math.ceil(distanceKm / 100)   // 1 day per 100 km (simplified rule)
    : 1;
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return { validFrom, validUpto: until.toISOString().slice(0, 16) };
}

// ── My Permissions ────────────────────────────────────────────────────────────

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;
    if (roleId === null) {
      res.json({ success: true, data: { canView: false, canCreate: false, canEdit: false, canDelete: false } });
      return;
    }
    const [role] = await db.select({ isSystem: roles.isSystem }).from(roles).where(eq(roles.id, roleId)).limit(1);
    if (role?.isSystem) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
      return;
    }
    const [perm] = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.roleId, roleId), sql`lower(${permissions.module}) = lower(${MODULE})`))
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

// ── Summary ───────────────────────────────────────────────────────────────────

router.get("/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId = req.user!.orgId!;

    const [{ total }]      = await db.select({ total:      sql<number>`count(*)::int` }).from(ewayBills).where(eq(ewayBills.orgId, orgId));
    const [{ generated }]  = await db.select({ generated:  sql<number>`count(*)::int` }).from(ewayBills).where(and(eq(ewayBills.orgId, orgId), eq(ewayBills.status, "generated")));
    const [{ draft }]      = await db.select({ draft:      sql<number>`count(*)::int` }).from(ewayBills).where(and(eq(ewayBills.orgId, orgId), eq(ewayBills.status, "draft")));
    const [{ cancelled }]  = await db.select({ cancelled:  sql<number>`count(*)::int` }).from(ewayBills).where(and(eq(ewayBills.orgId, orgId), eq(ewayBills.status, "cancelled")));
    const [{ expired }]    = await db.select({ expired:    sql<number>`count(*)::int` }).from(ewayBills).where(and(eq(ewayBills.orgId, orgId), eq(ewayBills.status, "expired")));

    const [{ totalValue }] = await db
      .select({ totalValue: sql<string>`coalesce(sum(total_value), 0)::text` })
      .from(ewayBills)
      .where(and(eq(ewayBills.orgId, orgId), sql`status in ('generated', 'draft')`));

    const [{ totalTax }] = await db
      .select({ totalTax: sql<string>`coalesce(sum(total_tax_amount), 0)::text` })
      .from(ewayBills)
      .where(and(eq(ewayBills.orgId, orgId), sql`status in ('generated', 'draft')`));

    // Bills expiring in next 24 hours
    const now     = new Date();
    const in24h   = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const [{ expiringSoon }] = await db
      .select({ expiringSoon: sql<number>`count(*)::int` })
      .from(ewayBills)
      .where(and(
        eq(ewayBills.orgId, orgId),
        eq(ewayBills.status, "generated"),
        sql`valid_upto IS NOT NULL AND valid_upto::timestamp <= ${in24h.toISOString()} AND valid_upto::timestamp >= ${now.toISOString()}`,
      ));

    res.json({
      success: true,
      data: { total, generated, draft, cancelled, expired, totalValue, totalTax, expiringSoon },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch E-Way Bill summary" });
  }
});

// ── List ──────────────────────────────────────────────────────────────────────

router.get("/", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status, supplyType, transportMode } = req.query as Record<string, string>;

    const filters: any[] = [eq(ewayBills.orgId, orgId)];
    if (search?.trim()) {
      filters.push(or(
        ilike(ewayBills.ewbNumber,       `%${search.trim()}%`),
        ilike(ewayBills.docNumber,       `%${search.trim()}%`),
        ilike(ewayBills.fromTradeName,   `%${search.trim()}%`),
        ilike(ewayBills.toTradeName,     `%${search.trim()}%`),
        ilike(ewayBills.productName,     `%${search.trim()}%`),
        ilike(ewayBills.vehicleNumber,   `%${search.trim()}%`),
      ));
    }
    if (status)        filters.push(eq(ewayBills.status,        status));
    if (supplyType)    filters.push(eq(ewayBills.supplyType,    supplyType));
    if (transportMode) filters.push(eq(ewayBills.transportMode, transportMode));
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(ewayBills).where(where).orderBy(desc(ewayBills.createdAt)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(ewayBills).where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch E-Way Bills" });
  }
});

// ── Get one ───────────────────────────────────────────────────────────────────

router.get("/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select().from(ewayBills)
      .where(and(eq(ewayBills.id, id), eq(ewayBills.orgId, req.user!.orgId!))).limit(1);
    if (!row) { res.status(404).json({ success: false, error: "E-Way Bill not found" }); return; }
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch E-Way Bill" });
  }
});

// ── Create ────────────────────────────────────────────────────────────────────

router.post("/", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertEWayBillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const d     = parsed.data;

    const tv   = parseFloat(d.taxableValue);
    const tax  = computeTaxAmounts(tv, parseFloat(d.cgstRate ?? "0"), parseFloat(d.sgstRate ?? "0"), parseFloat(d.igstRate ?? "0"), parseFloat(d.cessRate ?? "0"));

    const [created] = await db.insert(ewayBills).values({
      ...d,
      orgId,
      status: "draft",
      cgstAmount:     tax.cgst.toFixed(2),
      sgstAmount:     tax.sgst.toFixed(2),
      igstAmount:     tax.igst.toFixed(2),
      cessAmount:     tax.cess.toFixed(2),
      totalTaxAmount: tax.total.toFixed(2),
      createdBy: req.user!.userId,
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create E-Way Bill" });
  }
});

// ── Update ────────────────────────────────────────────────────────────────────

router.put("/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }

  const parsed = updateEWayBillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(ewayBills)
      .where(and(eq(ewayBills.id, id), eq(ewayBills.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "E-Way Bill not found" }); return; }
    if (existing.status === "generated") {
      res.status(409).json({ success: false, error: "Generated bills cannot be edited. Cancel and create a new one." });
      return;
    }
    if (existing.status === "cancelled") {
      res.status(409).json({ success: false, error: "Cancelled bills cannot be edited." });
      return;
    }

    const d  = parsed.data;
    const tv = parseFloat(String(d.taxableValue ?? existing.taxableValue));
    const tax = computeTaxAmounts(
      tv,
      parseFloat(String(d.cgstRate ?? existing.cgstRate)),
      parseFloat(String(d.sgstRate ?? existing.sgstRate)),
      parseFloat(String(d.igstRate ?? existing.igstRate)),
      parseFloat(String(d.cessRate ?? existing.cessRate)),
    );

    const [updated] = await db.update(ewayBills).set({
      ...d,
      cgstAmount:     tax.cgst.toFixed(2),
      sgstAmount:     tax.sgst.toFixed(2),
      igstAmount:     tax.igst.toFixed(2),
      cessAmount:     tax.cess.toFixed(2),
      totalTaxAmount: tax.total.toFixed(2),
      updatedAt: new Date(),
    }).where(eq(ewayBills.id, id)).returning();

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update E-Way Bill" });
  }
});

// ── Generate ──────────────────────────────────────────────────────────────────

router.post("/:id/generate", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(ewayBills)
      .where(and(eq(ewayBills.id, id), eq(ewayBills.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "E-Way Bill not found" }); return; }
    if (existing.status === "generated") {
      res.status(409).json({ success: false, error: "E-Way Bill is already generated" }); return;
    }
    if (existing.status === "cancelled") {
      res.status(409).json({ success: false, error: "Cancelled bills cannot be generated" }); return;
    }

    const ewbNumber          = generateEWBNumber();
    const { validFrom, validUpto } = computeValidUpto(existing.distance);

    const [updated] = await db.update(ewayBills).set({
      status: "generated",
      ewbNumber,
      validFrom,
      validUpto,
      updatedAt: new Date(),
    }).where(eq(ewayBills.id, id)).returning();

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to generate E-Way Bill" });
  }
});

// ── Cancel ────────────────────────────────────────────────────────────────────

router.post("/:id/cancel", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }

  const parsed = cancelEWayBillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues });
    return;
  }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(ewayBills)
      .where(and(eq(ewayBills.id, id), eq(ewayBills.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "E-Way Bill not found" }); return; }
    if (existing.status === "cancelled") {
      res.status(409).json({ success: false, error: "Bill is already cancelled" }); return;
    }

    // Cannot cancel if generated >24 hours ago
    if (existing.status === "generated" && existing.validFrom) {
      const generatedAt = new Date(existing.validFrom);
      const hoursSince  = (Date.now() - generatedAt.getTime()) / 3_600_000;
      if (hoursSince > 24) {
        res.status(409).json({ success: false, error: "E-Way Bills can only be cancelled within 24 hours of generation" });
        return;
      }
    }

    const [updated] = await db.update(ewayBills).set({
      status: "cancelled",
      cancelReason: parsed.data.cancelReason,
      updatedAt: new Date(),
    }).where(eq(ewayBills.id, id)).returning();

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to cancel E-Way Bill" });
  }
});

// ── Extend Validity ───────────────────────────────────────────────────────────

router.post("/:id/extend", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }

  const { vehicleNumber, vehicleType, reason } = req.body as { vehicleNumber?: string; vehicleType?: string; reason?: string };
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(ewayBills)
      .where(and(eq(ewayBills.id, id), eq(ewayBills.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "E-Way Bill not found" }); return; }
    if (existing.status !== "generated") {
      res.status(409).json({ success: false, error: "Only generated bills can be extended" }); return;
    }

    // Extend by same number of days as original validity
    const currentUpto   = existing.validUpto ? new Date(existing.validUpto) : new Date();
    const { validUpto } = computeValidUpto(existing.distance);
    const extendedUpto  = new Date(Math.max(currentUpto.getTime(), new Date(validUpto).getTime()));

    const [updated] = await db.update(ewayBills).set({
      validUpto:     extendedUpto.toISOString().slice(0, 16),
      vehicleNumber: vehicleNumber ?? existing.vehicleNumber,
      vehicleType:   vehicleType  ?? existing.vehicleType,
      notes:         reason ? `${existing.notes ?? ""}\n[Extended] ${reason}`.trim() : existing.notes,
      updatedAt: new Date(),
    }).where(eq(ewayBills.id, id)).returning();

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to extend E-Way Bill" });
  }
});

// ── Delete (draft only) ───────────────────────────────────────────────────────

router.delete("/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [existing] = await db.select().from(ewayBills)
      .where(and(eq(ewayBills.id, id), eq(ewayBills.orgId, orgId))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "E-Way Bill not found" }); return; }
    if (existing.status !== "draft") {
      res.status(409).json({ success: false, error: "Only draft bills can be deleted. Cancel generated bills instead." });
      return;
    }
    await db.delete(ewayBills).where(eq(ewayBills.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete E-Way Bill" });
  }
});

export default router;
