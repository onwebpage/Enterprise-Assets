/**
 * /api/hr — HR & Payroll module
 *
 * Covers: Employees, Leave Types, Leave Requests, Payroll Runs, Job Postings
 * All routes require authentication + "HR & Payroll" module permission.
 */
import { Router } from "express";
import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import {
  db, pool, permissions, roles, departments,
  hrEmployees, hrLeaveTypes, hrLeaveRequests,
  hrPayrollRuns, hrPayrollLines, hrJobPostings,
  hrStatutoryConfigs, hrPayrollStatutoryLines, hrStatutoryFilings,
} from "@workspace/db";
import {
  insertHrEmployeeSchema, updateHrEmployeeSchema,
  insertHrLeaveTypeSchema, updateHrLeaveTypeSchema,
  insertHrLeaveRequestSchema, updateHrLeaveRequestSchema,
  insertHrPayrollRunSchema, updateHrPayrollRunSchema,
  insertHrPayrollLineSchema,
  insertHrJobPostingSchema, updateHrJobPostingSchema,
  insertHrStatutoryConfigSchema, updateHrStatutoryConfigSchema,
  insertHrStatutoryFilingSchema, updateHrStatutoryFilingSchema,
  HR_STATUTORY_CODES, HR_STATUTORY_FILINGS_STATUSES,
} from "@workspace/db/schema";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { requirePermission } from "../middlewares/requirePermission";

const router = Router();
router.use(requireAuth);

const MODULE = "HR & Payroll";

const PAYROLL_TRANSITIONS: Record<string, string[]> = {
  draft: ["draft", "processing"],
  processing: ["processing", "approved"],
  approved: ["approved", "paid"],
  paid: ["paid"],
};

const FILING_TRANSITIONS: Record<string, string[]> = {
  draft: ["draft", "ready", "overdue"],
  ready: ["ready", "filed", "overdue"],
  overdue: ["overdue", "ready", "filed"],
  filed: ["filed", "paid"],
  paid: ["paid"],
};

const DEFAULT_STATUTORY_CONFIGS = [
  { code: "PF", name: "Provident Fund", employeeRate: "12.0000", employerRate: "12.0000", wageCeiling: "15000", threshold: null, fixedAmount: "0", jurisdiction: "India", registrationNumber: null },
  { code: "ESI", name: "Employees' State Insurance", employeeRate: "0.7500", employerRate: "3.2500", wageCeiling: null, threshold: "21000", fixedAmount: "0", jurisdiction: "India", registrationNumber: null },
  { code: "PT", name: "Professional Tax", employeeRate: "0.0000", employerRate: "0.0000", wageCeiling: null, threshold: "15000", fixedAmount: "200", jurisdiction: "Maharashtra", registrationNumber: null },
  { code: "TDS", name: "Tax Deducted at Source", employeeRate: "5.0000", employerRate: "0.0000", wageCeiling: null, threshold: "0", fixedAmount: "0", jurisdiction: "India", registrationNumber: null },
] as const;

function money(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

async function ensureStatutoryConfigs(orgId: number, userId: number) {
  const existing = await db.select({ code: hrStatutoryConfigs.code })
    .from(hrStatutoryConfigs)
    .where(eq(hrStatutoryConfigs.orgId, orgId));
  const existingCodes = new Set(existing.map((row) => row.code));
  const missing = DEFAULT_STATUTORY_CONFIGS
    .filter((config) => !existingCodes.has(config.code))
    .map((config) => ({ ...config, orgId, createdBy: userId, effectiveFrom: new Date().toISOString().slice(0, 10) }));
  if (missing.length > 0) {
    await db.insert(hrStatutoryConfigs)
      .values(missing)
      .onConflictDoNothing({
        target: [hrStatutoryConfigs.orgId, hrStatutoryConfigs.code],
      });
  }
}

async function calculateStatutoryForRun(runId: number, orgId: number) {
  const [run] = await db.select({ id: hrPayrollRuns.id, status: hrPayrollRuns.status })
    .from(hrPayrollRuns)
    .where(and(eq(hrPayrollRuns.id, runId), eq(hrPayrollRuns.orgId, orgId)))
    .limit(1);
  if (!run) throw new Error("Payroll run not found");
  if (run.status === "approved" || run.status === "paid") {
    throw new Error("Approved and paid payroll runs cannot be recalculated");
  }

  const [configs, lines] = await Promise.all([
    db.select().from(hrStatutoryConfigs).where(and(eq(hrStatutoryConfigs.orgId, orgId), eq(hrStatutoryConfigs.enabled, true))),
    db.select().from(hrPayrollLines).where(eq(hrPayrollLines.runId, runId)),
  ]);
  const previousPtRows = await db.select({
    employeeId: hrPayrollStatutoryLines.employeeId,
    amount: hrPayrollStatutoryLines.employeeAmount,
  }).from(hrPayrollStatutoryLines).where(and(
    eq(hrPayrollStatutoryLines.runId, runId),
    eq(hrPayrollStatutoryLines.orgId, orgId),
    eq(hrPayrollStatutoryLines.code, "PT"),
  ));
  const previousPt = new Map(previousPtRows.map((row) => [row.employeeId, Number(row.amount)]));
  await db.delete(hrPayrollStatutoryLines).where(and(eq(hrPayrollStatutoryLines.runId, runId), eq(hrPayrollStatutoryLines.orgId, orgId)));

  const statutoryLines: typeof hrPayrollStatutoryLines.$inferInsert[] = [];
  for (const line of lines) {
    const basic = Number(line.basicPay);
    const gross = Number(line.grossPay);
    let pf = 0;
    let esi = 0;
    let tds = 0;
    let pt = 0;
    let pfEmployer = 0;
    let esiEmployer = 0;
    for (const config of configs) {
      const employeeRate = Number(config.employeeRate);
      const employerRate = Number(config.employerRate);
      const ceiling = config.wageCeiling ? Number(config.wageCeiling) : null;
      const threshold = config.threshold ? Number(config.threshold) : 0;
      let base = 0;
      let employeeAmount = 0;
      let employerAmount = 0;
      let applicable = true;
      let note = "";
      if (config.code === "PF") {
        base = ceiling ? Math.min(basic, ceiling) : basic;
        employeeAmount = money(base * employeeRate / 100);
        employerAmount = money(base * employerRate / 100);
        pf += employeeAmount;
        pfEmployer += employerAmount;
        note = `Capped PF wage base at ₹${ceiling ?? base}`;
      } else if (config.code === "ESI") {
        applicable = threshold <= 0 || gross <= threshold;
        base = gross;
        employeeAmount = applicable ? money(base * employeeRate / 100) : 0;
        employerAmount = applicable ? money(base * employerRate / 100) : 0;
        esi += employeeAmount;
        esiEmployer += employerAmount;
        note = applicable ? `ESI applies below ₹${threshold} gross` : `Exempt above ₹${threshold} gross`;
      } else if (config.code === "PT") {
        applicable = gross > threshold;
        base = gross;
        employeeAmount = applicable ? money(Number(config.fixedAmount)) : 0;
        pt += employeeAmount;
        note = applicable ? `Fixed professional tax for ${config.jurisdiction ?? "jurisdiction"}` : `Not applicable below ₹${threshold}`;
      } else if (config.code === "TDS") {
        applicable = gross > threshold;
        base = gross;
        employeeAmount = applicable ? money(base * employeeRate / 100) : 0;
        tds += employeeAmount;
        note = `Configured withholding rate ${employeeRate}%`;
      }
      statutoryLines.push({
        orgId, runId, employeeId: line.employeeId, code: config.code,
        baseAmount: money(base).toFixed(2),
        employeeAmount: money(employeeAmount).toFixed(2),
        employerAmount: money(employerAmount).toFixed(2),
        isApplicable: applicable,
        calculationNote: note,
      });
    }
    const otherDeductions = Math.max(0, Number(line.otherDeductions) - (previousPt.get(line.employeeId) ?? 0));
    const newOtherDeductions = money(Math.max(0, otherDeductions) + pt);
    const totalDeductions = money(pf + esi + tds + newOtherDeductions);
    const netPay = money(gross - totalDeductions);
    await db.update(hrPayrollLines).set({
      pf: money(pf).toFixed(2),
      esi: money(esi).toFixed(2),
      tds: money(tds).toFixed(2),
      otherDeductions: newOtherDeductions.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      netPay: netPay.toFixed(2),
    }).where(eq(hrPayrollLines.id, line.id));
  }
  if (statutoryLines.length > 0) await db.insert(hrPayrollStatutoryLines).values(statutoryLines);
  await recomputeRunTotals(runId);
  return statutoryLines.length;
}

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

// ── Workforce analytics ───────────────────────────────────────────────────────

router.get("/analytics", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const orgId = req.user?.orgId;
  if (!orgId) {
    res.status(400).json({ success: false, error: "User is not assigned to an organization" });
    return;
  }
  try {
    const [headcount, payroll, leaveMix, hiring, salaryByDepartment, recentActivity] = await Promise.all([
      pool.query(
        `select to_char(month_start, 'Mon') as month,
                (select count(*)::int
                   from hr_employees e
                  where e.org_id=$1
                    and e.status <> 'terminated'
                    and e.date_of_joining::date < month_start + interval '1 month') as count
           from generate_series(
             date_trunc('month', current_date) - interval '5 months',
             date_trunc('month', current_date),
             interval '1 month'
           ) as months(month_start)
          order by month_start`,
        [orgId],
      ),
      pool.query(
        `select period, status, total_gross, total_deductions, total_net, employee_count
           from hr_payroll_runs
          where org_id=$1
          order by period desc
          limit 6`,
        [orgId],
      ),
      pool.query(
        `select lt.code, lt.name,
                count(lr.id)::int as requests,
                coalesce(sum(lr.total_days), 0)::numeric as days
           from hr_leave_types lt
           left join hr_leave_requests lr
             on lr.leave_type_id=lt.id and lr.org_id=$1 and lr.status <> 'cancelled'
          where lt.org_id=$1
          group by lt.id
          order by requests desc, lt.name`,
        [orgId],
      ),
      pool.query(
        `select status, coalesce(sum(openings), 0)::int as openings, count(*)::int as postings
           from hr_job_postings
          where org_id=$1
          group by status
          order by case status when 'open' then 0 when 'on_hold' then 1 when 'filled' then 2 else 3 end`,
        [orgId],
      ),
      pool.query(
        `select coalesce(d.name, 'Unassigned') as department,
                count(*)::int as employees,
                coalesce(sum(case when e.salary_type='annual' then e.salary / 12 else e.salary end), 0)::numeric as monthly_cost
           from hr_employees e
           left join departments d on d.id=e.dept_id
          where e.org_id=$1 and e.status in ('active','on_leave')
          group by d.name
          order by monthly_cost desc
          limit 7`,
        [orgId],
      ),
      pool.query(
        `select * from (
           select created_at as happened_at, 'employee' as type,
                  concat('Joined ', first_name, ' ', last_name) as label,
                  emp_number as reference
             from hr_employees where org_id=$1
           union all
           select created_at, 'leave',
                  concat('Leave request from ', employee_name), request_number
             from (
               select lr.created_at, lr.request_number,
                      e.first_name || ' ' || e.last_name as employee_name
                 from hr_leave_requests lr
                 join hr_employees e on e.id=lr.employee_id
                where lr.org_id=$1
             ) leaves
           union all
           select created_at, 'payroll',
                  concat('Payroll ', run_number, ' · ', status), run_number
             from hr_payroll_runs where org_id=$1
         ) events order by happened_at desc limit 10`,
        [orgId],
      ),
    ]);

    res.json({
      success: true,
      data: {
        headcountTrend: headcount.rows.map((row) => ({ month: row.month, count: Number(row.count) })),
        payrollTrend: payroll.rows.map((row) => ({
          period: row.period,
          status: row.status,
          gross: Number(row.total_gross ?? 0),
          deductions: Number(row.total_deductions ?? 0),
          net: Number(row.total_net ?? 0),
          employees: Number(row.employee_count ?? 0),
        })).reverse(),
        leaveMix: leaveMix.rows.map((row) => ({
          code: row.code, name: row.name, requests: Number(row.requests), days: Number(row.days),
        })),
        hiringPipeline: hiring.rows.map((row) => ({
          status: row.status, openings: Number(row.openings), postings: Number(row.postings),
        })),
        salaryByDepartment: salaryByDepartment.rows.map((row) => ({
          department: row.department, employees: Number(row.employees), monthlyCost: Number(row.monthly_cost),
        })),
        recentActivity: recentActivity.rows.map((row) => ({
          happenedAt: row.happened_at, type: row.type, label: row.label, reference: row.reference,
        })),
      },
    });
  } catch (err) {
    console.error("HR analytics query failed", err);
    res.status(500).json({ success: false, error: "Failed to fetch HR analytics" });
  }
});

// ── Statutory compliance ──────────────────────────────────────────────────────

router.get("/payroll/statutory/summary", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const orgId = req.user!.orgId!;
  try {
    await ensureStatutoryConfigs(orgId, req.user!.userId);
    const [configs, filings, latest, byCode] = await Promise.all([
      db.select({ code: hrStatutoryConfigs.code, enabled: hrStatutoryConfigs.enabled })
        .from(hrStatutoryConfigs).where(eq(hrStatutoryConfigs.orgId, orgId)),
      db.select({
        status: hrStatutoryFilings.status,
        count: sql<number>`count(*)::int`,
        liability: sql<string>`coalesce(sum(${hrStatutoryFilings.totalLiability}), 0)`,
      }).from(hrStatutoryFilings)
        .where(eq(hrStatutoryFilings.orgId, orgId))
        .groupBy(hrStatutoryFilings.status),
      pool.query(
        `select r.period,
                count(distinct l.employee_id)::int as employees,
                coalesce(sum(l.employee_amount), 0)::numeric as employee_amount,
                coalesce(sum(l.employer_amount), 0)::numeric as employer_amount,
                coalesce(sum(l.employee_amount + l.employer_amount), 0)::numeric as liability
           from hr_payroll_statutory_lines l
           join hr_payroll_runs r on r.id=l.run_id and r.org_id=$1
          where l.org_id=$1
          group by r.period
          order by r.period desc
          limit 6`,
        [orgId],
      ),
      pool.query(
        `select l.code,
                count(distinct l.employee_id)::int as employees,
                coalesce(sum(l.employee_amount), 0)::numeric as employee_amount,
                coalesce(sum(l.employer_amount), 0)::numeric as employer_amount,
                coalesce(sum(l.employee_amount + l.employer_amount), 0)::numeric as liability
           from hr_payroll_statutory_lines l
           join hr_payroll_runs r on r.id=l.run_id and r.org_id=$1
          where l.org_id=$1
            and r.period=(select max(period) from hr_payroll_runs where org_id=$1)
          group by l.code
          order by l.code`,
        [orgId],
      ),
    ]);
    res.json({
      success: true,
      data: {
        configured: configs.filter((row) => row.enabled).length,
        totalConfigured: configs.length,
        filingSummary: filings.map((row) => ({
          status: row.status, count: Number(row.count), liability: Number(row.liability),
        })),
        recentPeriods: latest.rows.map((row) => ({
          period: row.period, employees: Number(row.employees),
          employeeAmount: Number(row.employee_amount), employerAmount: Number(row.employer_amount),
          liability: Number(row.liability),
        })),
        latestByCode: byCode.rows.map((row) => ({
          code: row.code, employees: Number(row.employees),
          employeeAmount: Number(row.employee_amount), employerAmount: Number(row.employer_amount),
          liability: Number(row.liability),
        })),
      },
    });
  } catch (err) {
    console.error("HR statutory summary query failed", err);
    res.status(500).json({ success: false, error: "Failed to fetch statutory summary" });
  }
});

router.get("/payroll/statutory/config", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    await ensureStatutoryConfigs(req.user!.orgId!, req.user!.userId);
    const rows = await db.select().from(hrStatutoryConfigs)
      .where(eq(hrStatutoryConfigs.orgId, req.user!.orgId!))
      .orderBy(hrStatutoryConfigs.code);
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch statutory configuration" });
  }
});

router.post("/payroll/statutory/config", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertHrStatutoryConfigSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [duplicate] = await db.select({ id: hrStatutoryConfigs.id }).from(hrStatutoryConfigs)
      .where(and(eq(hrStatutoryConfigs.orgId, orgId), eq(hrStatutoryConfigs.code, parsed.data.code))).limit(1);
    if (duplicate) { res.status(409).json({ success: false, error: `${parsed.data.code} configuration already exists` }); return; }
    const [created] = await db.insert(hrStatutoryConfigs).values({
      ...parsed.data, orgId, createdBy: req.user!.userId,
      wageCeiling: parsed.data.wageCeiling ?? null,
      threshold: parsed.data.threshold ?? null,
      jurisdiction: parsed.data.jurisdiction ?? null,
      registrationNumber: parsed.data.registrationNumber ?? null,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create statutory configuration" });
  }
});

router.put("/payroll/statutory/config/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateHrStatutoryConfigSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select({ id: hrStatutoryConfigs.id }).from(hrStatutoryConfigs)
      .where(and(eq(hrStatutoryConfigs.id, id), eq(hrStatutoryConfigs.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Statutory configuration not found" }); return; }
    const [updated] = await db.update(hrStatutoryConfigs).set({
      ...parsed.data,
      wageCeiling: parsed.data.wageCeiling ?? null,
      threshold: parsed.data.threshold ?? null,
      jurisdiction: parsed.data.jurisdiction ?? null,
      registrationNumber: parsed.data.registrationNumber ?? null,
      updatedAt: new Date(),
    }).where(eq(hrStatutoryConfigs.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update statutory configuration" });
  }
});

router.delete("/payroll/statutory/config/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: hrStatutoryConfigs.id }).from(hrStatutoryConfigs)
      .where(and(eq(hrStatutoryConfigs.id, id), eq(hrStatutoryConfigs.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Statutory configuration not found" }); return; }
    await db.delete(hrStatutoryConfigs).where(eq(hrStatutoryConfigs.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete statutory configuration" });
  }
});

router.get("/payroll/statutory/filings", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  try {
    const filters = [eq(hrStatutoryFilings.orgId, req.user!.orgId!)];
    if (typeof req.query.status === "string" && HR_STATUTORY_FILINGS_STATUSES.includes(req.query.status as typeof HR_STATUTORY_FILINGS_STATUSES[number])) {
      filters.push(eq(hrStatutoryFilings.status, req.query.status));
    }
    if (typeof req.query.period === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.period)) {
      filters.push(eq(hrStatutoryFilings.period, req.query.period));
    }
    const rows = await db.select().from(hrStatutoryFilings)
      .where(and(...filters)).orderBy(desc(hrStatutoryFilings.period), hrStatutoryFilings.code);
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch statutory filings" });
  }
});

router.post("/payroll/statutory/filings", requirePermission(MODULE, "create"), async (req: AuthRequest, res) => {
  const parsed = insertHrStatutoryFilingSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const orgId = req.user!.orgId!;
    const [duplicate] = await db.select({ id: hrStatutoryFilings.id }).from(hrStatutoryFilings)
      .where(and(eq(hrStatutoryFilings.orgId, orgId), eq(hrStatutoryFilings.code, parsed.data.code), eq(hrStatutoryFilings.period, parsed.data.period))).limit(1);
    if (duplicate) { res.status(409).json({ success: false, error: `${parsed.data.code} filing for ${parsed.data.period} already exists` }); return; }
    const [totals] = await db.select({
      employeeCount: sql<number>`count(distinct ${hrPayrollStatutoryLines.employeeId})::int`,
      employeeAmount: sql<string>`coalesce(sum(${hrPayrollStatutoryLines.employeeAmount}), 0)`,
      employerAmount: sql<string>`coalesce(sum(${hrPayrollStatutoryLines.employerAmount}), 0)`,
    }).from(hrPayrollStatutoryLines)
      .innerJoin(hrPayrollRuns, and(eq(hrPayrollStatutoryLines.runId, hrPayrollRuns.id), eq(hrPayrollRuns.orgId, orgId)))
      .where(and(eq(hrPayrollStatutoryLines.orgId, orgId), eq(hrPayrollStatutoryLines.code, parsed.data.code), eq(hrPayrollRuns.period, parsed.data.period)));
    const [created] = await db.insert(hrStatutoryFilings).values({
      ...parsed.data, orgId, status: "draft", createdBy: req.user!.userId,
      employeeCount: totals?.employeeCount ?? 0,
      employeeAmount: totals?.employeeAmount ?? "0",
      employerAmount: totals?.employerAmount ?? "0",
      totalLiability: (Number(totals?.employeeAmount ?? 0) + Number(totals?.employerAmount ?? 0)).toFixed(2),
      notes: parsed.data.notes ?? null,
    }).returning();
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create statutory filing" });
  }
});

router.put("/payroll/statutory/filings/:id", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  const parsed = updateHrStatutoryFilingSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ success: false, error: "Validation failed", details: parsed.error.issues }); return; }
  try {
    const [existing] = await db.select().from(hrStatutoryFilings)
      .where(and(eq(hrStatutoryFilings.id, id), eq(hrStatutoryFilings.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Statutory filing not found" }); return; }
    if (!FILING_TRANSITIONS[existing.status]?.includes(parsed.data.status)) {
      res.status(409).json({ success: false, error: `Invalid filing transition from ${existing.status} to ${parsed.data.status}` });
      return;
    }
    if (existing.status === "paid") {
      res.status(409).json({ success: false, error: "Paid filings are immutable." });
      return;
    }
    if (existing.status === "filed" && parsed.data.status !== "paid") {
      res.status(409).json({ success: false, error: "Filed filings are immutable except for recording payment." });
      return;
    }
    const updateData: any = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.status === "filed") updateData.filedAt = new Date();
    if (parsed.data.status === "paid") {
      updateData.paidAt = new Date();
      if (!existing.filedAt) updateData.filedAt = new Date();
    }
    const [updated] = await db.update(hrStatutoryFilings).set(updateData).where(eq(hrStatutoryFilings.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update statutory filing" });
  }
});

router.delete("/payroll/statutory/filings/:id", requirePermission(MODULE, "delete"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [existing] = await db.select({ id: hrStatutoryFilings.id, status: hrStatutoryFilings.status }).from(hrStatutoryFilings)
      .where(and(eq(hrStatutoryFilings.id, id), eq(hrStatutoryFilings.orgId, req.user!.orgId!))).limit(1);
    if (!existing) { res.status(404).json({ success: false, error: "Statutory filing not found" }); return; }
    if (existing.status !== "draft") { res.status(409).json({ success: false, error: "Only draft filings can be deleted" }); return; }
    await db.delete(hrStatutoryFilings).where(eq(hrStatutoryFilings.id, id));
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete statutory filing" });
  }
});

router.get("/payroll/runs/:id/statutory", requirePermission(MODULE, "view"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    const [run] = await db.select({ id: hrPayrollRuns.id }).from(hrPayrollRuns)
      .where(and(eq(hrPayrollRuns.id, id), eq(hrPayrollRuns.orgId, req.user!.orgId!))).limit(1);
    if (!run) { res.status(404).json({ success: false, error: "Payroll run not found" }); return; }
    const rows = await db.select().from(hrPayrollStatutoryLines)
      .where(and(eq(hrPayrollStatutoryLines.runId, id), eq(hrPayrollStatutoryLines.orgId, req.user!.orgId!)))
      .orderBy(hrPayrollStatutoryLines.employeeId, hrPayrollStatutoryLines.code);
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch payroll statutory lines" });
  }
});

router.post("/payroll/runs/:id/calculate-statutory", requirePermission(MODULE, "edit"), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ success: false, error: "Invalid id" }); return; }
  try {
    await ensureStatutoryConfigs(req.user!.orgId!, req.user!.userId);
    const count = await calculateStatutoryForRun(id, req.user!.orgId!);
    res.json({ success: true, data: { runId: id, calculatedLines: count } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to calculate statutory deductions";
    res.status(message.includes("not found") ? 404 : 409).json({ success: false, error: message });
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
        .where(and(
          eq(hrEmployees.orgId, req.user!.orgId!),
          sql`id = any(${sql.raw(`ARRAY[${managerIds.join(",")}]::int[]`)})`,
        ));
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
    if (parsed.data.endDate < parsed.data.startDate) {
      res.status(422).json({ success: false, error: "End date must be on or after start date" });
      return;
    }
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
    const [existing] = await db.select({
      id: hrLeaveRequests.id,
      employeeId: hrLeaveRequests.employeeId,
      status: hrLeaveRequests.status,
    }).from(hrLeaveRequests)
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
        .where(and(eq(hrEmployees.id, existing.employeeId), eq(hrEmployees.orgId, req.user!.orgId!)));
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
    await ensureStatutoryConfigs(orgId, req.user!.userId);
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
    await calculateStatutoryForRun(run.id, orgId);
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
    if (!PAYROLL_TRANSITIONS[existing.status]?.includes(parsed.data.status)) {
      res.status(409).json({
        success: false,
        error: `Invalid payroll transition from ${existing.status} to ${parsed.data.status}.`,
      });
      return;
    }
    if (existing.status === "paid") {
      res.status(409).json({ success: false, error: "Paid payroll runs are immutable." });
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
    const [employee] = await db.select({ id: hrEmployees.id }).from(hrEmployees)
      .where(and(eq(hrEmployees.id, d.employeeId), eq(hrEmployees.orgId, req.user!.orgId!))).limit(1);
    if (!employee) { res.status(404).json({ success: false, error: "Employee not found in your organization" }); return; }
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
    await calculateStatutoryForRun(runId, req.user!.orgId!);
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
