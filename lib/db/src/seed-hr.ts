/**
 * Seeds realistic HR records for the first organization.
 * Run: pnpm --filter @workspace/db run seed:hr
 *
 * The seed is intentionally additive only when HR is empty, so it never
 * overwrites an organization's employee or payroll data.
 */
import { eq, sql } from "drizzle-orm";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import {
  organizations, departments, hrEmployees, hrLeaveTypes, hrLeaveRequests,
  hrPayrollRuns, hrPayrollLines, hrJobPostings,
} from "./schema";
import { databaseUrl } from "./connection";

const { Pool } = pg;
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool, { schema });

async function seed() {
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .orderBy(organizations.id)
    .limit(1);
  if (!organization) throw new Error("No organization exists; seed organizations first.");

  const [{ employeeCount }] = await db
    .select({ employeeCount: sql<number>`count(*)::int` })
    .from(hrEmployees)
    .where(eq(hrEmployees.orgId, organization.id));
  if (employeeCount > 0) {
    console.log("HR tables already contain employees; skipping demo seed.");
    return;
  }

  const deptRows = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(eq(departments.orgId, organization.id));
  const dept = Object.fromEntries(deptRows.map((row) => [row.name, row.id]));

  const employeeRows = await db.insert(hrEmployees).values([
    { orgId: organization.id, empNumber: "EMP-0001", firstName: "Aarav", lastName: "Mehta", email: "aarav.mehta@apexglobal.io", phone: "+91 98765 10001", deptId: dept["Engineering"], jobTitle: "VP Engineering", employmentType: "full_time", status: "active", salary: "285000", salaryType: "monthly", dateOfJoining: "2023-04-17", dateOfBirth: "1986-08-12", gender: "male", city: "Bengaluru", state: "KA", createdBy: 1 },
    { orgId: organization.id, empNumber: "EMP-0002", firstName: "Nisha", lastName: "Kapoor", email: "nisha.kapoor@apexglobal.io", phone: "+91 98765 10002", deptId: dept["Finance & Accounts"], jobTitle: "Finance Controller", employmentType: "full_time", status: "active", salary: "210000", salaryType: "monthly", dateOfJoining: "2023-09-11", dateOfBirth: "1989-01-24", gender: "female", city: "Mumbai", state: "MH", managerId: 1, createdBy: 1 },
    { orgId: organization.id, empNumber: "EMP-0003", firstName: "Rohan", lastName: "Iyer", email: "rohan.iyer@apexglobal.io", phone: "+91 98765 10003", deptId: dept["Sales & Marketing"], jobTitle: "Regional Sales Lead", employmentType: "full_time", status: "active", salary: "165000", salaryType: "monthly", dateOfJoining: "2024-02-05", dateOfBirth: "1991-06-19", gender: "male", city: "Delhi", state: "DL", managerId: 1, createdBy: 1 },
    { orgId: organization.id, empNumber: "EMP-0004", firstName: "Priya", lastName: "Nair", email: "priya.nair@apexglobal.io", phone: "+91 98765 10004", deptId: dept["HR & Admin"], jobTitle: "People Operations Manager", employmentType: "full_time", status: "active", salary: "145000", salaryType: "monthly", dateOfJoining: "2024-06-24", dateOfBirth: "1990-11-07", gender: "female", city: "Pune", state: "MH", managerId: 1, createdBy: 1 },
    { orgId: organization.id, empNumber: "EMP-0005", firstName: "Vikram", lastName: "Shah", email: "vikram.shah@apexglobal.io", phone: "+91 98765 10005", deptId: dept["Operations"], jobTitle: "Operations Analyst", employmentType: "full_time", status: "on_leave", salary: "92000", salaryType: "monthly", dateOfJoining: "2025-01-13", dateOfBirth: "1995-03-28", gender: "male", city: "Ahmedabad", state: "GJ", managerId: 1, createdBy: 1 },
    { orgId: organization.id, empNumber: "EMP-0006", firstName: "Ananya", lastName: "Rao", email: "ananya.rao@apexglobal.io", phone: "+91 98765 10006", deptId: dept["Customer Success"], jobTitle: "Customer Success Partner", employmentType: "full_time", status: "active", salary: "105000", salaryType: "monthly", dateOfJoining: "2025-05-19", dateOfBirth: "1994-09-15", gender: "female", city: "Hyderabad", state: "TS", managerId: 1, createdBy: 1 },
    { orgId: organization.id, empNumber: "EMP-0007", firstName: "Kabir", lastName: "Singh", email: "kabir.singh@apexglobal.io", phone: "+91 98765 10007", deptId: dept["Engineering"], jobTitle: "Senior Software Engineer", employmentType: "full_time", status: "active", salary: "155000", salaryType: "monthly", dateOfJoining: "2026-04-06", dateOfBirth: "1993-12-03", gender: "male", city: "Bengaluru", state: "KA", managerId: 1, createdBy: 1 },
    { orgId: organization.id, empNumber: "EMP-0008", firstName: "Ishita", lastName: "Das", email: "ishita.das@apexglobal.io", phone: "+91 98765 10008", deptId: dept["Sales & Marketing"], jobTitle: "Growth Marketing Specialist", employmentType: "full_time", status: "active", salary: "98000", salaryType: "monthly", dateOfJoining: "2026-06-15", dateOfBirth: "1996-05-21", gender: "female", city: "Kolkata", state: "WB", managerId: 3, createdBy: 1 },
    { orgId: organization.id, empNumber: "EMP-0009", firstName: "Dev", lastName: "Malhotra", email: "dev.malhotra@apexglobal.io", phone: "+91 98765 10009", deptId: dept["Engineering"], jobTitle: "Product Engineer", employmentType: "full_time", status: "active", salary: "132000", salaryType: "monthly", dateOfJoining: "2026-08-03", dateOfBirth: "1997-02-14", gender: "male", city: "Bengaluru", state: "KA", managerId: 1, createdBy: 1 },
  ]).returning({ id: hrEmployees.id });

  const employeeId = Object.fromEntries(employeeRows.map((row, index) => [index + 1, row.id]));

  const leaveTypeRows = await db.insert(hrLeaveTypes).values([
    { orgId: organization.id, name: "Annual Leave", code: "AL", allowedDays: 24, isCarryForward: true, isPaid: true, description: "Planned annual time off" },
    { orgId: organization.id, name: "Sick Leave", code: "SL", allowedDays: 12, isCarryForward: false, isPaid: true, description: "Health and wellness leave" },
    { orgId: organization.id, name: "Casual Leave", code: "CL", allowedDays: 8, isCarryForward: false, isPaid: true, description: "Short personal absences" },
    { orgId: organization.id, name: "Unpaid Leave", code: "UL", allowedDays: 30, isCarryForward: false, isPaid: false, description: "Approved unpaid time away" },
  ]).returning({ id: hrLeaveTypes.id, code: hrLeaveTypes.code });
  const leaveTypeId = Object.fromEntries(leaveTypeRows.map((row) => [row.code, row.id]));

  await db.insert(hrLeaveRequests).values([
    { orgId: organization.id, requestNumber: "LR-0001", employeeId: employeeId[5], leaveTypeId: leaveTypeId.AL, startDate: "2026-08-29", endDate: "2026-09-02", totalDays: "5", reason: "Family function", status: "approved", approvedById: 1, approvedAt: new Date("2026-08-25T10:00:00Z") },
    { orgId: organization.id, requestNumber: "LR-0002", employeeId: employeeId[8], leaveTypeId: leaveTypeId.CL, startDate: "2026-09-12", endDate: "2026-09-12", totalDays: "1", reason: "Personal appointment", status: "pending" },
    { orgId: organization.id, requestNumber: "LR-0003", employeeId: employeeId[6], leaveTypeId: leaveTypeId.AL, startDate: "2026-10-05", endDate: "2026-10-09", totalDays: "5", reason: "Planned vacation", status: "pending" },
  ]);

  const payrollRunRows = await db.insert(hrPayrollRuns).values([
    { orgId: organization.id, runNumber: "PAY-0001", period: "2026-06", status: "paid", totalGross: "1103000", totalDeductions: "107000", totalNet: "996000", employeeCount: 8, approvedById: 1, approvedAt: new Date("2026-06-30T12:00:00Z"), paidAt: new Date("2026-07-01T12:00:00Z"), createdBy: 1 },
    { orgId: organization.id, runNumber: "PAY-0002", period: "2026-07", status: "paid", totalGross: "1117000", totalDeductions: "108000", totalNet: "1009000", employeeCount: 8, approvedById: 1, approvedAt: new Date("2026-07-31T12:00:00Z"), paidAt: new Date("2026-08-01T12:00:00Z"), createdBy: 1 },
    { orgId: organization.id, runNumber: "PAY-0003", period: "2026-08", status: "approved", totalGross: "1292000", totalDeductions: "125000", totalNet: "1167000", employeeCount: 9, approvedById: 1, approvedAt: new Date("2026-08-31T12:00:00Z"), createdBy: 1 },
  ]).returning({ id: hrPayrollRuns.id });

  for (const [runIndex, run] of payrollRunRows.entries()) {
    const basicPay = runIndex === 2 ? "1292000" : runIndex === 1 ? "1117000" : "1103000";
    await db.insert(hrPayrollLines).values({
      runId: run.id,
      employeeId: employeeId[1],
      basicPay,
      grossPay: basicPay,
      totalDeductions: runIndex === 2 ? "125000" : runIndex === 1 ? "108000" : "107000",
      netPay: runIndex === 2 ? "1167000" : runIndex === 1 ? "1009000" : "996000",
    });
  }

  await db.insert(hrJobPostings).values([
    { orgId: organization.id, jobNumber: "JP-0001", title: "Staff Software Engineer", deptId: dept["Engineering"], location: "Bengaluru / Hybrid", employmentType: "full_time", status: "open", openings: 2, closingDate: "2026-09-30", createdBy: 1 },
    { orgId: organization.id, jobNumber: "JP-0002", title: "Enterprise Account Executive", deptId: dept["Sales & Marketing"], location: "Mumbai / Hybrid", employmentType: "full_time", status: "open", openings: 3, closingDate: "2026-10-15", createdBy: 1 },
    { orgId: organization.id, jobNumber: "JP-0003", title: "Payroll Specialist", deptId: dept["HR & Admin"], location: "Pune", employmentType: "full_time", status: "on_hold", openings: 1, closingDate: "2026-10-01", createdBy: 1 },
    { orgId: organization.id, jobNumber: "JP-0004", title: "Implementation Consultant", deptId: dept["Customer Success"], location: "Delhi / Hybrid", employmentType: "full_time", status: "filled", openings: 1, closingDate: "2026-08-15", createdBy: 1 },
  ]);

  console.log(`HR demo seed complete: ${employeeRows.length} employees, ${payrollRunRows.length} payroll runs.`);
}

seed()
  .catch((error) => {
    console.error("HR seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());