/**
 * Seed script — populates demo data for OmniERP.
 * Run: pnpm --filter @workspace/db run seed
 * Safe to re-run: skips inserts on conflict.
 */
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { organizations, branches, departments, roles, permissions, users } from "./schema";
import { sql } from "drizzle-orm";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("🌱 Starting seed...");

  // ── Organizations ────────────────────────────────────────────────────────
  const [apexUS] = await db.insert(organizations).values({
    name: "Apex Global Inc.",
    legalName: "Apex Global Incorporated",
    taxId: "12-3456789",
    industry: "Technology & Manufacturing",
    foundedYear: 2014,
    employeeCount: 342,
    status: "active",
    currency: "USD",
    fiscalYearStart: "Jan",
    type: "Parent",
    country: "USA",
    gstin: "N/A",
  }).onConflictDoNothing().returning();

  const [apexIndia] = await db.insert(organizations).values({
    name: "Apex India Pvt. Ltd.",
    legalName: "Apex India Private Limited",
    taxId: "AABCA1234B",
    industry: "Technology",
    foundedYear: 2017,
    employeeCount: 128,
    status: "active",
    currency: "INR",
    fiscalYearStart: "Apr",
    type: "Subsidiary",
    country: "India",
    gstin: "27AABCA1234B1Z5",
  }).onConflictDoNothing().returning();

  const [apexEU] = await db.insert(organizations).values({
    name: "Apex Europe GmbH",
    legalName: "Apex Europe Gesellschaft mit beschränkter Haftung",
    industry: "Manufacturing",
    foundedYear: 2019,
    employeeCount: 64,
    status: "active",
    currency: "EUR",
    fiscalYearStart: "Jan",
    type: "Subsidiary",
    country: "Germany",
    gstin: "N/A",
  }).onConflictDoNothing().returning();

  const orgId = apexUS?.id ?? 1;
  console.log("✓ Organizations seeded");

  // ── Branches ─────────────────────────────────────────────────────────────
  await db.insert(branches).values([
    { orgId, name: "Chicago HQ", address: "123 Enterprise Blvd", city: "Chicago", state: "IL", country: "USA", postalCode: "60601", phone: "+1 (312) 555-0100", type: "Headquarters", isHeadquarters: true, employeeCount: 218 },
    { orgId, name: "New York Office", address: "456 Commerce St", city: "New York", state: "NY", country: "USA", postalCode: "10001", phone: "+1 (212) 555-0200", type: "Branch", isHeadquarters: false, employeeCount: 84 },
    { orgId, name: "Austin R&D Center", address: "789 Innovation Dr", city: "Austin", state: "TX", country: "USA", postalCode: "78701", phone: "+1 (512) 555-0300", type: "R&D", isHeadquarters: false, employeeCount: 40 },
    { orgId: apexIndia?.id ?? 2, name: "Mumbai Office", address: "Business Bay, Andheri East", city: "Mumbai", state: "MH", country: "India", postalCode: "400069", phone: "+91 22 5555-0400", type: "Branch", isHeadquarters: false, employeeCount: 128 },
    { orgId: apexEU?.id ?? 3, name: "Berlin Office", address: "Unter den Linden 10", city: "Berlin", country: "Germany", postalCode: "10117", phone: "+49 30 5555-0500", type: "Branch", isHeadquarters: false, employeeCount: 64 },
  ]).onConflictDoNothing();
  console.log("✓ Branches seeded");

  // ── Departments ───────────────────────────────────────────────────────────
  await db.insert(departments).values([
    { orgId, name: "Engineering",         headName: "Anna Park",    budget: "$9.8M",  costCenter: "CC-ENG",   employeeCount: 84 },
    { orgId, name: "Sales & Marketing",   headName: "Sarah Kim",    budget: "$7.6M",  costCenter: "CC-SALES", employeeCount: 93 },
    { orgId, name: "Finance & Accounts",  headName: "Linda Chen",   budget: "$2.8M",  costCenter: "CC-FIN",   employeeCount: 28 },
    { orgId, name: "Operations",          headName: "Mike Roberts", budget: "$6.4M",  costCenter: "CC-OPS",   employeeCount: 94 },
    { orgId, name: "HR & Admin",          headName: "James Doyle",  budget: "$1.9M",  costCenter: "CC-HR",    employeeCount: 24 },
    { orgId, name: "Customer Success",    headName: "Tom Brown",    budget: "$1.6M",  costCenter: "CC-CS",    employeeCount: 19 },
  ]).onConflictDoNothing();
  console.log("✓ Departments seeded");

  // ── Roles ─────────────────────────────────────────────────────────────────
  const modules = ["Finance", "Sales", "Purchase", "Inventory", "Manufacturing", "Projects", "HR", "Reports", "Settings", "Accounts Receivable", "Accounts Payable", "General Ledger", "GST & Tax", "E-Way Bill", "TDS & TCS", "Purchase & Procurement"];

  const [adminRole] = await db.insert(roles).values({
    orgId, name: "System Admin", description: "Full system access", isSystem: true, userCount: 2,
  }).onConflictDoNothing().returning();

  const roleRows = await db.insert(roles).values([
    { orgId, name: "Finance Manager",  description: "Full access to Finance, Reports",      isSystem: false, userCount: 2 },
    { orgId, name: "Sales Manager",    description: "Manage sales pipeline and CRM",         isSystem: false, userCount: 3 },
    { orgId, name: "Developer",        description: "Engineering tools and integrations",     isSystem: false, userCount: 12 },
    { orgId, name: "Sales Rep",        description: "Create and update sales records",        isSystem: false, userCount: 28 },
    { orgId, name: "DevOps Engineer",  description: "Infrastructure and deployments",         isSystem: false, userCount: 5 },
    { orgId, name: "HR Manager",       description: "HR and payroll management",              isSystem: false, userCount: 3 },
    { orgId, name: "Accountant",       description: "View and manage financial records",      isSystem: false, userCount: 8 },
  ]).onConflictDoNothing().returning();
  console.log("✓ Roles seeded");

  // Admin gets all permissions
  if (adminRole?.id) {
    await db.insert(permissions).values(
      modules.map((module) => ({
        roleId: adminRole.id,
        module,
        canView: true, canCreate: true, canEdit: true, canDelete: true,
      }))
    ).onConflictDoNothing();
  }

  // Finance Manager permissions
  const finRole = roleRows.find(r => r.name === "Finance Manager");
  if (finRole?.id) {
    await db.insert(permissions).values([
      { roleId: finRole.id, module: "Finance",   canView: true, canCreate: true,  canEdit: true,  canDelete: false },
      { roleId: finRole.id, module: "Reports",   canView: true, canCreate: true,  canEdit: false, canDelete: false },
      { roleId: finRole.id, module: "Settings",  canView: true, canCreate: false, canEdit: false, canDelete: false },
    ]).onConflictDoNothing();
  }
  console.log("✓ Permissions seeded");

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminRoleId = adminRole?.id ?? null;
  const salesMgrId = roleRows.find(r => r.name === "Sales Manager")?.id ?? null;
  const devId      = roleRows.find(r => r.name === "Developer")?.id ?? null;
  const salesRepId = roleRows.find(r => r.name === "Sales Rep")?.id ?? null;
  const finMgrId   = roleRows.find(r => r.name === "Finance Manager")?.id ?? null;
  const devOpsId   = roleRows.find(r => r.name === "DevOps Engineer")?.id ?? null;
  const hrId       = roleRows.find(r => r.name === "HR Manager")?.id ?? null;
  const acctId     = roleRows.find(r => r.name === "Accountant")?.id ?? null;

  const pw = async (p: string) => bcrypt.hash(p, 10);

  await db.insert(users).values([
    { orgId, email: "admin@omnierp.io",  passwordHash: await pw("Admin@1234"),  firstName: "James",  lastName: "Doyle",   roleId: adminRoleId, status: "active", mfaEnabled: true  },
    { orgId, email: "s.kim@apexglobal.io",  passwordHash: await pw("Pass@1234"), firstName: "Sarah",  lastName: "Kim",     roleId: salesMgrId,  status: "active", mfaEnabled: true  },
    { orgId, email: "a.park@apexglobal.io", passwordHash: await pw("Pass@1234"), firstName: "Anna",   lastName: "Park",    roleId: devId,        status: "active", mfaEnabled: false },
    { orgId, email: "m.roberts@apexglobal.io", passwordHash: await pw("Pass@1234"), firstName: "Mike", lastName: "Roberts", roleId: salesRepId, status: "active", mfaEnabled: true },
    { orgId, email: "l.chen@apexglobal.io", passwordHash: await pw("Pass@1234"),  firstName: "Linda", lastName: "Chen",    roleId: finMgrId,    status: "on_leave", mfaEnabled: true },
    { orgId, email: "t.brown@apexglobal.io", passwordHash: await pw("Pass@1234"), firstName: "Tom",   lastName: "Brown",   roleId: devOpsId,    status: "active", mfaEnabled: false },
    { orgId, email: "e.wilson@apexglobal.io",passwordHash: await pw("Pass@1234"), firstName: "Emma",  lastName: "Wilson",  roleId: hrId,        status: "inactive", mfaEnabled: false },
    { orgId, email: "r.shaw@apexglobal.io",  passwordHash: await pw("Pass@1234"), firstName: "Robert",lastName: "Shaw",    roleId: acctId,      status: "active", mfaEnabled: true  },
  ]).onConflictDoNothing();
  console.log("✓ Users seeded");

  console.log("\n✅ Seed complete!");
  console.log("   Login: admin@omnierp.io / Admin@1234");

  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
