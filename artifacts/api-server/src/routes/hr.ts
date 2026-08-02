/**
 * /api/hr — HR & Payroll module
 *
 * Covers: Employees, Leave Types, Leave Requests, Payroll Runs, Job Postings
 * All routes require authentication + "HR & Payroll" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import {
  db, permissions, roles, departments,
  hrEmployees, hrLeaveTypes, hrLeaveRequests,
  hrPayrollRuns, hrPayrollLines, hrJobPostings,
} from "@workspace/db";
import {
  insertHrEmployeeSchema, updateHrEmployeeSchema,
  insertHrLeaveTypeSchema, updateHrLeaveTypeSchema,
  insertHrLeaveRequestSchema, updateHrLeaveRequestSchema,
  insertHrPayrollRunSchema, updateHrPayrollRunSchema,
  insertHrPayrollLineSchema,
  insertHrJobPostingSchema, updateHrJobPostingSchema,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "HR & Payroll";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextEmpNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(hrEmployees)
    .where(eq(hrEmployees.orgId, orgId));
  return `EMP-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

async function nextPayRunNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(hrPayrollRuns)
    .where(eq(hrPayrollRuns.orgId, orgId));
  return `PAY-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

async function nextLeaveRequestNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(hrLeaveRequests)
    .where(eq(hrLeaveRequests.orgId, orgId));
  return `LR-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

async function nextJobNumber(orgId: number): Promise<string> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(hrJobPostings)
    .where(eq(hrJobPostings.orgId, orgId));
  return `JP-${String((cnt ?? 0) + 1).padStart(4, "0")}`;
}

/** Recompute run totals from lines */
async function recomputeRunTotals(runId: number) {
  const lines = await db.select().from(hrPayrollLines).where(eq(hrPayrollLines.runId, runId));
  const totals = lines.reduce(
    (acc, l) => ({
      gross: acc.gross + parseFloat(l.grossPay),
      ded:   acc.ded   + parseFloat(l.totalDeductions),
      net:   acc.net   + parseFloat(l.netPay),
    }),
    { gross: 0, ded: 0, net: 0 },
  );
  await db.update(hrPayrollRuns).set({
    totalGross:      totals.gross.toFixed(2),
    totalDeductions: totals.ded.toFixed(2),
    totalNet:        totals.net.toFixed(2),
    employeeCount:   lines.length,
    updatedAt:       new Date(),
  }).where(eq(hrPayrollRuns.id, runId));
}

// ── My Permissions ────────────────────────────────────────────────────────────

router.get("/my-permissions", async (req: AuthRequest, res) => {
  try {
    const { roleId } = req.user!;
    if (roleId === null) {
      res.json({ success: true, data: { canView: true, canCreate: true, canEdit: true, canDelete: true } });
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

    const [[{ totalEmployees }], [{ activeEmployees }], [{ onLeaveCount }], [{ openPositions }], [{ pendingLeaves }]] = await Promise.all([
      db.select({ totalEmployees: sql<number>`count(*)::int` }).from(hrEmployees).where(eq(hrEmployees.orgId, orgId)),
      db.select({ activeEmployees: sql<number>`count(*)::int` }).from(hrEmployees).where(and(eq(hrEmployees.orgId, orgId), eq(hrEmployees.status, "active"))),
      db.select({ onLeaveCount: sql<number>`count(*)::int` }).from(hrEmployees).where(and(eq(hrEmployees.orgId, orgId), eq(hrEmployees.status, "on_leave"))),
      db.select({ openPositions: sql<number>`count(*)::int` }).from(hrJobPostings).where(and(eq(hrJobPostings.orgId, orgId), eq(hrJobPostings.status, "open"))),
      db.select({ pendingLeaves: sql<number>`count(*)::int` }).from(hrLeaveRequests).where(and(eq(hrLeaveRequests.orgId, orgId), eq(hrLeaveRequests.status, "pending"))),
    ]);

    // Latest paid/approved payroll run total
    const [latestRun] = await db
      .select({ totalNet: hrPayrollRuns.totalNet })
      .from(hrPayrollRuns)
      .where(and(eq(hrPayrollRuns.orgId, orgId), sql`status in ('approved','paid')`))
      .orderBy(desc(hrPayrollRuns.createdAt))
      .limit(1);

    // Department breakdown
    const deptBreakdown = await db
      .select({
        deptName: departments.name,
        count:    sql<number>`count(*)::int`,
      })
      .from(hrEmployees)
      .leftJoin(departments, eq(hrEmployees.deptId, departments.id))
      .where(and(eq(hrEmployees.orgId, orgId), eq(hrEmployees.status, "active")))
      .groupBy(departments.name)
      .orderBy(sql`count(*) desc`)
      .limit(7);

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        onLeaveCount,
        openPositions,
        pendingLeaves,
        monthlyPayroll: latestRun?.totalNet ?? "0",
        deptBreakdown: deptBreakdown.map(d => ({ deptName: d.deptName ?? "Unassigned", count: d.count })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch HR summary" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// EMPLOYEES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/employees", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status, deptId } = req.query as Record<string, string>;

    const filters: any[] = [eq(hrEmployees.orgId, orgId)];
    if (status) filters.push(eq(hrEmployees.status, status));
    if (deptId) filters.push(eq(hrEmployees.deptId, parseInt(deptId)));
    if (search?.trim()) {
      filters.push(or(
        ilike(hrEmployees.empNumber, `%${search.trim()}%`),
        ilike(hrEmployees.firstName, `%${search.trim()}%`),
        ilike(hrEmployees.lastName,  `%${search.trim()}%`),
        ilike(hrEmployees.email,     `%${search.trim()}%`),
        ilike(hrEmployees.jobTitle,  `%${search.trim()}%`),
      ));
    }
    const where = and(...filters);

    // Self-join alias for manager — use subquery approach
    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id:             hrEmployees.id,
        orgId:          hrEmployees.orgId,
        empNumber:      hrEmployees.empNumber,
        firstName:      hrEmployees.firstName,
        lastName:       hrEmployees.lastName,
        email:          hrEmployees.email,
        phone:          hrEmployees.phone,
        deptId:         hrEmployees.deptId,
        deptName:       departments.name,
        jobTitle:       hrEmployees.jobTitle,
        employmentType: hrEmployees.employmentType,
        status:         hrEmployees.status,
        salary:         hrEmployees.salary,
        salaryType:     hrEmployees.salaryType,
        dateOfJoining:  hrEmployees.dateOfJoining,
        dateOfBirth:    hrEmployees.dateOfBirth,
        gender:         hrEmployees.gender,
        address:        hrEmployees.address,
        city:           hrEmployees.city,
        state:          hrEmployees.state,
        bankAccount:    hrEmployees.bankAccount,
        bankName:       hrEmployees.bankName,
        ifscCode:       hrEmployees.ifscCode,
        managerId:      hrEmployees.managerId,
        notes:          hrEmployees.notes,
        userId:         hrEmployees.userId,
        createdAt:      hrEmployees.createdAt,
        updatedAt:      hrEmployees.updatedAt,
      })
        .from(hrEmployees)
        .leftJoin(departments, eq(hrEmployees.deptId, departments.id))
        .where(where)
        .orderBy(hrEmployees.empNumber)
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` })
        .from(hrEmployees)
        .leftJoin(departments, eq(hrEmployees.deptId, departments.id))
        .where(where),
    ]);

    // Attach manager names in a single follow-up query
    const managerIds = [...new Set(rows.map(r => r.managerId).filter(Boolean))] as number[];
    let managerMap: Record<number, string> = {};
    if (managerIds.length > 0) {
      const mgrs = await db
        .select({ id: hrEmployees.id, firstName: hrEmployees.firstName, lastName: hrEmployees.lastName })
        .from(hrEmployees)
        .where(sql`id = any(${sql.raw(`ARRAY[${managerIds.join(",")}]::int[]`)})`);
      mgrs.forEach(m => { managerMap[m.id] = `${m.firstName} ${m.lastName}`; });
    }

    res.json({
      success: true,
      data: rows.map(r => ({ ...r, managerName: r.managerId ? (managerMap[r.managerId] ?? null) : null })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch employees" });
  }
});

router.get("/employees/:id", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [row] = await db.select({
      id: hrEmployees.id, orgId: hrEmployees.orgId, empNumber: hrEmployees.empNumber,
      firstName: hrEmployees.firstName, lastName: hrEmployees.lastName,
      email: hrEmployees.email, phone: hrEmployees.phone,
      deptId: hrEmployees.deptId, deptName: departments.name,
      jobTitle: hrEmployees.jobTitle, employmentType: hrEmployees.employmentType,
      status: hrEmployees.status, salary: hrEmployees.salary, salaryType: hrEmployees.salaryType,
      dateOfJoining: hrEmployees.dateOfJoining, dateOfBirth: hrEmployees.dateOfBirth,
      gender: hrEmployees.gender, address: hrEmployees.address, city: hrEmployees.city,
      state: hrEmployees.state, bankAccount: hrEmployees.bankAccount,
      bankName: hrEmployees.bankName, ifscCode: hrEmployees.ifscCode,
      managerId: hrEmployees.managerId, notes: hrEmployees.notes,
      userId: hrEmployees.userId, createdAt: hrEmployees.createdAt, updatedAt: hrEmployees.updatedAt,
    })
      .from(hrEmployees)
      .leftJoin(departments, eq(hrEmployees.deptId, departments.id))
      .where(and(eq(hrEmployees.id, id), eq(hrEmployees.orgId, req.user!.orgId!)))
      .limit(1);
    if (!row) { res.status(404).json({ success: false, error: "Employee not found" }); return; }
    res.json({ success: true, data: { ...row, managerName: null } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch employee" });
  }
});

router.post("/employees", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertHrEmployeeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const empNumber = await nextEmpNumber(orgId);
    const [created] = await db.insert(hrEmployees).values({
      orgId, empNumber, ...parsed.data,
      createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create employee" });
  }
});

router.put("/employees/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateHrEmployeeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select({ id: hrEmployees.id }).from(hrEmployees)
      .where(and(eq(hrEmployees.id, id), eq(hrEmployees.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Employee not found" }); return; }
    const [updated] = await db.update(hrEmployees).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(hrEmployees.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update employee" });
  }
});

router.delete("/employees/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: hrEmployees.id, status: hrEmployees.status, empNumber: hrEmployees.empNumber }).from(hrEmployees)
      .where(and(eq(hrEmployees.id, id), eq(hrEmployees.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Employee not found" }); return; }
    if (existing.status === "active") {
      res.status(409).json({ success: false, error: `Cannot delete active employee "${existing.empNumber}". Terminate first.` });
      return;
    }
    await db.delete(hrEmployees).where(eq(hrEmployees.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete employee" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE TYPES
// ══════════════════════════════════════════════════════════════════════════════

router.get("/leaves/types", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(hrLeaveTypes)
      .where(eq(hrLeaveTypes.orgId, req.user!.orgId!))
      .orderBy(hrLeaveTypes.name);
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch leave types" });
  }
});

router.post("/leaves/types", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertHrLeaveTypeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [dup] = await db.select({ id: hrLeaveTypes.id }).from(hrLeaveTypes)
      .where(and(eq(hrLeaveTypes.orgId, orgId), ilike(hrLeaveTypes.code, parsed.data.code))).limit(1);
    if (dup) { res.status(409).json({ success: false, error: `Leave code "${parsed.data.code}" already exists` }); return; }
    const [created] = await db.insert(hrLeaveTypes).values({ ...parsed.data, orgId }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create leave type" });
  }
});

router.put("/leaves/types/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateHrLeaveTypeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select({ id: hrLeaveTypes.id }).from(hrLeaveTypes)
      .where(and(eq(hrLeaveTypes.id, id), eq(hrLeaveTypes.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Leave type not found" }); return; }
    const [updated] = await db.update(hrLeaveTypes).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(hrLeaveTypes.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update leave type" });
  }
});

router.delete("/leaves/types/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: hrLeaveTypes.id }).from(hrLeaveTypes)
      .where(and(eq(hrLeaveTypes.id, id), eq(hrLeaveTypes.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Leave type not found" }); return; }
    const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` }).from(hrLeaveRequests)
      .where(eq(hrLeaveRequests.leaveTypeId, id));
    if (cnt > 0) {
      res.status(409).json({ success: false, error: `Cannot delete — ${cnt} leave request(s) use this type.` });
      return;
    }
    await db.delete(hrLeaveTypes).where(eq(hrLeaveTypes.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete leave type" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE REQUESTS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/leaves/requests", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status, employeeId } = req.query as Record<string, string>;

    const filters: any[] = [eq(hrLeaveRequests.orgId, orgId)];
    if (status)     filters.push(eq(hrLeaveRequests.status, status));
    if (employeeId) filters.push(eq(hrLeaveRequests.employeeId, parseInt(employeeId)));
    if (search?.trim()) {
      filters.push(or(
        ilike(hrLeaveRequests.requestNumber, `%${search.trim()}%`),
        ilike(hrEmployees.firstName, `%${search.trim()}%`),
        ilike(hrEmployees.lastName,  `%${search.trim()}%`),
      ));
    }
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id:              hrLeaveRequests.id,
        orgId:           hrLeaveRequests.orgId,
        requestNumber:   hrLeaveRequests.requestNumber,
        employeeId:      hrLeaveRequests.employeeId,
        leaveTypeId:     hrLeaveRequests.leaveTypeId,
        startDate:       hrLeaveRequests.startDate,
        endDate:         hrLeaveRequests.endDate,
        totalDays:       hrLeaveRequests.totalDays,
        reason:          hrLeaveRequests.reason,
        status:          hrLeaveRequests.status,
        approvedById:    hrLeaveRequests.approvedById,
        approvedAt:      hrLeaveRequests.approvedAt,
        rejectionReason: hrLeaveRequests.rejectionReason,
        createdAt:       hrLeaveRequests.createdAt,
        updatedAt:       hrLeaveRequests.updatedAt,
        empNumber:       hrEmployees.empNumber,
        employeeName:    sql<string>`${hrEmployees.firstName} || ' ' || ${hrEmployees.lastName}`,
        leaveTypeName:   hrLeaveTypes.name,
        leaveTypeCode:   hrLeaveTypes.code,
      })
        .from(hrLeaveRequests)
        .innerJoin(hrEmployees,  eq(hrLeaveRequests.employeeId,  hrEmployees.id))
        .innerJoin(hrLeaveTypes, eq(hrLeaveRequests.leaveTypeId, hrLeaveTypes.id))
        .where(where)
        .orderBy(desc(hrLeaveRequests.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` })
        .from(hrLeaveRequests)
        .innerJoin(hrEmployees,  eq(hrLeaveRequests.employeeId,  hrEmployees.id))
        .innerJoin(hrLeaveTypes, eq(hrLeaveRequests.leaveTypeId, hrLeaveTypes.id))
        .where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch leave requests" });
  }
});

router.post("/leaves/requests", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertHrLeaveRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    // Verify employee belongs to org
    const [emp] = await db.select({ id: hrEmployees.id }).from(hrEmployees)
      .where(and(eq(hrEmployees.id, parsed.data.employeeId), eq(hrEmployees.orgId, orgId))).limit(1);
    if (!emp) { res.status(422).json({ success: false, error: "Employee not found" }); return; }
    // Verify leave type belongs to org
    const [lt] = await db.select({ id: hrLeaveTypes.id }).from(hrLeaveTypes)
      .where(and(eq(hrLeaveTypes.id, parsed.data.leaveTypeId), eq(hrLeaveTypes.orgId, orgId))).limit(1);
    if (!lt) { res.status(422).json({ success: false, error: "Leave type not found" }); return; }
    const requestNumber = await nextLeaveRequestNumber(orgId);
    const [created] = await db.insert(hrLeaveRequests).values({ orgId, requestNumber, ...parsed.data }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create leave request" });
  }
});

router.put("/leaves/requests/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateHrLeaveRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select({ id: hrLeaveRequests.id, status: hrLeaveRequests.status }).from(hrLeaveRequests)
      .where(and(eq(hrLeaveRequests.id, id), eq(hrLeaveRequests.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Leave request not found" }); return; }
    if (existing.status === "approved" || existing.status === "rejected") {
      res.status(409).json({ success: false, error: `Cannot change a ${existing.status} leave request.` });
      return;
    }
    const updateData: any = { status: parsed.data.status, updatedAt: new Date() };
    if (parsed.data.status === "approved") {
      updateData.approvedById = req.user!.userId;
      updateData.approvedAt   = new Date();
    }
    if (parsed.data.status === "rejected" && parsed.data.rejectionReason) {
      updateData.rejectionReason = parsed.data.rejectionReason;
    }
    const [updated] = await db.update(hrLeaveRequests).set(updateData).where(eq(hrLeaveRequests.id, id)).returning();

    // Keep employee status in sync
    if (parsed.data.status === "approved") {
      await db.update(hrEmployees).set({ status: "on_leave", updatedAt: new Date() })
        .where(eq(hrEmployees.id, existing.id));
    }

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update leave request" });
  }
});

router.delete("/leaves/requests/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: hrLeaveRequests.id, status: hrLeaveRequests.status }).from(hrLeaveRequests)
      .where(and(eq(hrLeaveRequests.id, id), eq(hrLeaveRequests.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Leave request not found" }); return; }
    if (existing.status === "approved") {
      res.status(409).json({ success: false, error: "Cannot delete an approved leave request." });
      return;
    }
    await db.delete(hrLeaveRequests).where(eq(hrLeaveRequests.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete leave request" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PAYROLL RUNS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/payroll/runs", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? 12))));
    const offset = (page - 1) * limit;
    const [rows, [{ total }]] = await Promise.all([
      db.select().from(hrPayrollRuns).where(eq(hrPayrollRuns.orgId, orgId))
        .orderBy(desc(hrPayrollRuns.period)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(hrPayrollRuns).where(eq(hrPayrollRuns.orgId, orgId)),
    ]);
    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch payroll runs" });
  }
});

router.get("/payroll/runs/:id/lines", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [run] = await db.select({ id: hrPayrollRuns.id }).from(hrPayrollRuns)
      .where(and(eq(hrPayrollRuns.id, id), eq(hrPayrollRuns.orgId, req.user!.orgId!))).limit(1);
    if (!run) { res.status(404).json({ success: false, error: "Payroll run not found" }); return; }

    const lines = await db.select({
      id:              hrPayrollLines.id,
      runId:           hrPayrollLines.runId,
      employeeId:      hrPayrollLines.employeeId,
      basicPay:        hrPayrollLines.basicPay,
      hra:             hrPayrollLines.hra,
      otherAllowances: hrPayrollLines.otherAllowances,
      grossPay:        hrPayrollLines.grossPay,
      pf:              hrPayrollLines.pf,
      esi:             hrPayrollLines.esi,
      tds:             hrPayrollLines.tds,
      otherDeductions: hrPayrollLines.otherDeductions,
      totalDeductions: hrPayrollLines.totalDeductions,
      netPay:          hrPayrollLines.netPay,
      notes:           hrPayrollLines.notes,
      createdAt:       hrPayrollLines.createdAt,
      empNumber:       hrEmployees.empNumber,
      employeeName:    sql<string>`${hrEmployees.firstName} || ' ' || ${hrEmployees.lastName}`,
      jobTitle:        hrEmployees.jobTitle,
      deptName:        departments.name,
    })
      .from(hrPayrollLines)
      .innerJoin(hrEmployees,  eq(hrPayrollLines.employeeId, hrEmployees.id))
      .leftJoin(departments,   eq(hrEmployees.deptId, departments.id))
      .where(eq(hrPayrollLines.runId, id))
      .orderBy(hrEmployees.empNumber);

    res.json({ success: true, data: lines });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch payroll lines" });
  }
});

router.post("/payroll/runs", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertHrPayrollRunSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    // Check for duplicate period
    const [dup] = await db.select({ id: hrPayrollRuns.id }).from(hrPayrollRuns)
      .where(and(eq(hrPayrollRuns.orgId, orgId), eq(hrPayrollRuns.period, parsed.data.period))).limit(1);
    if (dup) { res.status(409).json({ success: false, error: `A payroll run for ${parsed.data.period} already exists.` }); return; }
    const runNumber = await nextPayRunNumber(orgId);

    // Auto-populate lines from active employees
    const employees = await db.select({
      id: hrEmployees.id, salary: hrEmployees.salary, salaryType: hrEmployees.salaryType,
    }).from(hrEmployees)
      .where(and(eq(hrEmployees.orgId, orgId), eq(hrEmployees.status, "active")));

    const run = await db.transaction(async (tx) => {
      const [created] = await tx.insert(hrPayrollRuns).values({
        orgId, runNumber, period: parsed.data.period,
        notes: parsed.data.notes ?? null,
        createdBy: req.user!.userId,
      }).returning();

      if (employees.length > 0) {
        const lineValues = employees.map(emp => {
          const monthly = emp.salaryType === "annual"
            ? parseFloat(emp.salary) / 12
            : parseFloat(emp.salary);
          const basicPay        = (monthly * 0.5).toFixed(2);
          const hra             = (monthly * 0.2).toFixed(2);
          const otherAllowances = (monthly * 0.3).toFixed(2);
          const grossPay        = monthly.toFixed(2);
          const pf              = (monthly * 0.12).toFixed(2);
          const esi             = monthly <= 21000 ? (monthly * 0.0175).toFixed(2) : "0.00";
          const tds             = (monthly * 0.1 > 0 ? monthly * 0.05 : 0).toFixed(2);
          const otherDeductions = "0.00";
          const totalDeductions = (parseFloat(pf) + parseFloat(esi) + parseFloat(tds)).toFixed(2);
          const netPay          = (monthly - parseFloat(totalDeductions)).toFixed(2);
          return {
            runId: created.id, employeeId: emp.id,
            basicPay, hra, otherAllowances, grossPay,
            pf, esi, tds, otherDeductions, totalDeductions, netPay,
          };
        });
        await tx.insert(hrPayrollLines).values(lineValues);
      }
      return created;
    });

    await recomputeRunTotals(run.id);
    const [finalRun] = await db.select().from(hrPayrollRuns).where(eq(hrPayrollRuns.id, run.id)).limit(1);
    res.status(201).json({ success: true, data: finalRun });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create payroll run" });
  }
});

router.put("/payroll/runs/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateHrPayrollRunSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select({ id: hrPayrollRuns.id, status: hrPayrollRuns.status }).from(hrPayrollRuns)
      .where(and(eq(hrPayrollRuns.id, id), eq(hrPayrollRuns.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Payroll run not found" }); return; }
    if (existing.status === "paid") {
      res.status(409).json({ success: false, error: "Cannot modify a paid payroll run." });
      return;
    }
    const updateData: any = { status: parsed.data.status, updatedAt: new Date() };
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
    if (parsed.data.status === "approved") {
      updateData.approvedById = req.user!.userId;
      updateData.approvedAt   = new Date();
    }
    if (parsed.data.status === "paid") updateData.paidAt = new Date();
    const [updated] = await db.update(hrPayrollRuns).set(updateData).where(eq(hrPayrollRuns.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update payroll run" });
  }
});

/** Upsert a single payroll line within a draft run */
router.post("/payroll/runs/:id/lines", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const runId = parseInt(req.params.id as string);
  if (isNaN(runId)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = insertHrPayrollLineSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [run] = await db.select({ id: hrPayrollRuns.id, status: hrPayrollRuns.status }).from(hrPayrollRuns)
      .where(and(eq(hrPayrollRuns.id, runId), eq(hrPayrollRuns.orgId, req.user!.orgId!))).limit(1);
    if (!run) { res.status(404).json({ success: false, error: "Payroll run not found" }); return; }
    if (run.status !== "draft") { res.status(409).json({ success: false, error: "Can only edit lines in a draft run." }); return; }

    const d = parsed.data;
    const grossPay       = (parseFloat(d.basicPay ?? "0") + parseFloat(d.hra ?? "0") + parseFloat(d.otherAllowances ?? "0")).toFixed(2);
    const totalDeductions = (parseFloat(d.pf ?? "0") + parseFloat(d.esi ?? "0") + parseFloat(d.tds ?? "0") + parseFloat(d.otherDeductions ?? "0")).toFixed(2);
    const netPay          = (parseFloat(grossPay) - parseFloat(totalDeductions)).toFixed(2);

    const [existing] = await db.select({ id: hrPayrollLines.id }).from(hrPayrollLines)
      .where(and(eq(hrPayrollLines.runId, runId), eq(hrPayrollLines.employeeId, d.employeeId))).limit(1);

    let line;
    if (existing) {
      [line] = await db.update(hrPayrollLines).set({
        basicPay: d.basicPay ?? "0", hra: d.hra ?? "0",
        otherAllowances: d.otherAllowances ?? "0", grossPay,
        pf: d.pf ?? "0", esi: d.esi ?? "0", tds: d.tds ?? "0",
        otherDeductions: d.otherDeductions ?? "0", totalDeductions, netPay,
        notes: d.notes ?? null,
      }).where(eq(hrPayrollLines.id, existing.id)).returning();
    } else {
      [line] = await db.insert(hrPayrollLines).values({
        runId, employeeId: d.employeeId,
        basicPay: d.basicPay ?? "0", hra: d.hra ?? "0",
        otherAllowances: d.otherAllowances ?? "0", grossPay,
        pf: d.pf ?? "0", esi: d.esi ?? "0", tds: d.tds ?? "0",
        otherDeductions: d.otherDeductions ?? "0", totalDeductions, netPay,
        notes: d.notes ?? null,
      }).returning();
    }

    await recomputeRunTotals(runId);
    res.status(201).json({ success: true, data: line });
  } catch {
    res.status(500).json({ success: false, error: "Failed to upsert payroll line" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// JOB POSTINGS
// ══════════════════════════════════════════════════════════════════════════════

router.get("/jobs", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const orgId  = req.user!.orgId!;
    const page   = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 25))));
    const offset = (page - 1) * limit;
    const { search, status } = req.query as Record<string, string>;

    const filters: any[] = [eq(hrJobPostings.orgId, orgId)];
    if (status) filters.push(eq(hrJobPostings.status, status));
    if (search?.trim()) {
      filters.push(or(
        ilike(hrJobPostings.title,     `%${search.trim()}%`),
        ilike(hrJobPostings.jobNumber, `%${search.trim()}%`),
        ilike(hrJobPostings.location,  `%${search.trim()}%`),
      ));
    }
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select({
        id:             hrJobPostings.id,
        orgId:          hrJobPostings.orgId,
        jobNumber:      hrJobPostings.jobNumber,
        title:          hrJobPostings.title,
        deptId:         hrJobPostings.deptId,
        deptName:       departments.name,
        location:       hrJobPostings.location,
        employmentType: hrJobPostings.employmentType,
        description:    hrJobPostings.description,
        requirements:   hrJobPostings.requirements,
        status:         hrJobPostings.status,
        openings:       hrJobPostings.openings,
        closingDate:    hrJobPostings.closingDate,
        createdAt:      hrJobPostings.createdAt,
        updatedAt:      hrJobPostings.updatedAt,
      })
        .from(hrJobPostings)
        .leftJoin(departments, eq(hrJobPostings.deptId, departments.id))
        .where(where)
        .orderBy(desc(hrJobPostings.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(hrJobPostings).where(where),
    ]);

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch job postings" });
  }
});

router.post("/jobs", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertHrJobPostingSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const jobNumber = await nextJobNumber(orgId);
    const [created] = await db.insert(hrJobPostings).values({
      orgId, jobNumber, ...parsed.data,
      createdBy: req.user!.userId,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create job posting" });
  }
});

router.put("/jobs/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateHrJobPostingSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select({ id: hrJobPostings.id }).from(hrJobPostings)
      .where(and(eq(hrJobPostings.id, id), eq(hrJobPostings.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Job posting not found" }); return; }
    const [updated] = await db.update(hrJobPostings).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(hrJobPostings.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update job posting" });
  }
});

router.delete("/jobs/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: hrJobPostings.id, status: hrJobPostings.status }).from(hrJobPostings)
      .where(and(eq(hrJobPostings.id, id), eq(hrJobPostings.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Job posting not found" }); return; }
    if (existing.status === "open") {
      res.status(409).json({ success: false, error: "Close or fill the job posting before deleting." });
      return;
    }
    await db.delete(hrJobPostings).where(eq(hrJobPostings.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete job posting" });
  }
});

export default router;
