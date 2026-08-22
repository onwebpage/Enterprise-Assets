/**
 * Seed demo Maintenance Management data — assets, schedules, breakdowns, work orders, AMCs, spare parts, history.
 * Run: pnpm --filter @workspace/db run seed:maintenance
 * Safe to re-run: cleans up existing maintenance data for the org first.
 */
import { db, organizations } from "./index";
import {
  maintenanceAssets, maintenanceSchedules, maintenanceBreakdowns,
  maintenanceWorkOrders, maintenanceAmcs, maintenanceSpareParts,
  maintenanceWorkOrderParts, maintenanceHistory,
} from "./schema/maintenance";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding Maintenance Management demo data...");

  const [org] = await db.select().from(organizations).limit(1);
  if (!org) { console.error("No org found — run seed first"); process.exit(1); }
  const orgId = org.id;

  // ── Clean up existing maintenance data for this org ─────────────────────────
  await db.delete(maintenanceWorkOrderParts);
  await db.delete(maintenanceHistory);
  await db.delete(maintenanceWorkOrders).where(eq(maintenanceWorkOrders.orgId, orgId));
  await db.delete(maintenanceBreakdowns).where(eq(maintenanceBreakdowns.orgId, orgId));
  await db.delete(maintenanceSchedules).where(eq(maintenanceSchedules.orgId, orgId));
  await db.delete(maintenanceAmcs).where(eq(maintenanceAmcs.orgId, orgId));
  await db.delete(maintenanceSpareParts).where(eq(maintenanceSpareParts.orgId, orgId));
  await db.delete(maintenanceAssets).where(eq(maintenanceAssets.orgId, orgId));

  // ── Assets ──────────────────────────────────────────────────────────────────
  const assets = await db.insert(maintenanceAssets).values([
    { orgId, assetNumber: "AST-0001", name: "CNC Milling Machine M-01", assetType: "machinery", manufacturer: "Haas", model: "VF-2SS", serialNumber: "HAAS-VF2-8841", location: "Plant A — Bay 1", purchaseDate: "2022-03-15", expectedLifeMonths: 180, status: "operational", notes: "Primary milling machine for precision parts" },
    { orgId, assetNumber: "AST-0002", name: "Injection Molding Press P-03", assetType: "machinery", manufacturer: "Arburg", model: "Allrounder 470C", serialNumber: "ARB-470C-2210", location: "Plant A — Bay 2", purchaseDate: "2021-07-20", expectedLifeMonths: 200, status: "under_maintenance", notes: "Undergoing scheduled maintenance" },
    { orgId, assetNumber: "AST-0003", name: "Forklift FL-02", assetType: "vehicle", manufacturer: "Toyota", model: "8FGU25", serialNumber: "TOY-8FGU-5523", location: "Warehouse B", purchaseDate: "2023-01-10", expectedLifeMonths: 120, status: "operational", notes: "Warehouse forklift" },
    { orgId, assetNumber: "AST-0004", name: "Air Compressor AC-01", assetType: "equipment", manufacturer: "Atlas Copco", model: "GA 30", serialNumber: "AC-GA30-1187", location: "Plant A — Utility Room", purchaseDate: "2020-11-05", expectedLifeMonths: 240, status: "breakdown", notes: "Compressor fault — awaiting repair" },
    { orgId, assetNumber: "AST-0005", name: "Packaging Line PL-01", assetType: "machinery", manufacturer: "Bosch", model: "Pack 301", serialNumber: "BOS-P301-3345", location: "Plant B — Line 1", purchaseDate: "2022-09-01", expectedLifeMonths: 180, status: "operational", notes: "Automated packaging line" },
    { orgId, assetNumber: "AST-0006", name: "Conveyor System CV-02", assetType: "equipment", manufacturer: "Dematic", model: "CS-200", serialNumber: "DEM-CS200-7789", location: "Warehouse B", purchaseDate: "2023-05-12", expectedLifeMonths: 150, status: "operational", notes: "Main warehouse conveyor" },
  ]).returning();
  console.log("✓ Assets seeded");

  const cnc = assets.find(a => a.assetNumber === "AST-0001")!;
  const press = assets.find(a => a.assetNumber === "AST-0002")!;
  const forklift = assets.find(a => a.assetNumber === "AST-0003")!;
  const compressor = assets.find(a => a.assetNumber === "AST-0004")!;
  const packaging = assets.find(a => a.assetNumber === "AST-0005")!;
  const conveyor = assets.find(a => a.assetNumber === "AST-0006")!;

  // ── Schedules (Preventive Maintenance) ──────────────────────────────────────
  await db.insert(maintenanceSchedules).values([
    { orgId, assetId: cnc.id, scheduleNumber: "PM-0001", scheduleType: "preventive", title: "Monthly CNC calibration & lubrication", frequencyType: "monthly", frequencyValue: 1, lastRunDate: "2026-07-20", nextDueDate: "2026-08-20", assignedTo: "Mike Roberts", estimatedHours: "4", status: "active", notes: "Calibrate axes and lubricate guideways" },
    { orgId, assetId: press.id, scheduleNumber: "PM-0002", scheduleType: "inspection", title: "Injection press safety inspection", frequencyType: "quarterly", frequencyValue: 1, lastRunDate: "2026-05-15", nextDueDate: "2026-08-15", assignedTo: "Anna Park", estimatedHours: "2", status: "active", notes: "Check safety interlocks and hydraulic pressure" },
    { orgId, assetId: forklift.id, scheduleNumber: "PM-0003", scheduleType: "preventive", title: "Forklift service & brake check", frequencyType: "monthly", frequencyValue: 1, lastRunDate: "2026-07-25", nextDueDate: "2026-08-25", assignedTo: "Tom Brown", estimatedHours: "3", status: "active", notes: "Service engine, check brakes and hydraulics" },
    { orgId, assetId: compressor.id, scheduleNumber: "PM-0004", scheduleType: "lubrication", title: "Compressor oil change & filter", frequencyType: "quarterly", frequencyValue: 1, lastRunDate: "2026-04-10", nextDueDate: "2026-07-10", assignedTo: "Mike Roberts", estimatedHours: "2", status: "active", notes: "Change oil and replace air filters" },
    { orgId, assetId: packaging.id, scheduleNumber: "PM-0005", scheduleType: "cleaning", title: "Packaging line deep clean", frequencyType: "weekly", frequencyValue: 1, lastRunDate: "2026-08-14", nextDueDate: "2026-08-21", assignedTo: "Anna Park", estimatedHours: "1", status: "active", notes: "Deep clean all contact surfaces" },
    { orgId, assetId: conveyor.id, scheduleNumber: "PM-0006", scheduleType: "inspection", title: "Conveyor belt tension check", frequencyType: "monthly", frequencyValue: 1, lastRunDate: "2026-07-18", nextDueDate: "2026-08-18", assignedTo: "Tom Brown", estimatedHours: "1.5", status: "active", notes: "Check belt tension and tracking" },
  ]);
  console.log("✓ Schedules seeded");

  // ── Breakdowns ──────────────────────────────────────────────────────────────
  await db.insert(maintenanceBreakdowns).values([
    { orgId, assetId: compressor.id, breakdownNumber: "BD-0001", breakdownType: "mechanical", reportedDate: "2026-08-10", reportedTime: "09:30", downtimeHours: "6", rootCause: "Worn piston ring causing pressure loss", actionTaken: "Replaced piston ring and seals", status: "resolved", resolvedDate: "2026-08-10", resolvedBy: "Mike Roberts", notes: "Compressor back online after repair" },
    { orgId, assetId: press.id, breakdownNumber: "BD-0002", breakdownType: "hydraulic", reportedDate: "2026-08-12", reportedTime: "14:00", downtimeHours: "0", rootCause: "Hydraulic fluid leak detected", actionTaken: "", status: "diagnosing", notes: "Leak source being investigated" },
    { orgId, assetId: cnc.id, breakdownNumber: "BD-0003", breakdownType: "electrical", reportedDate: "2026-08-15", reportedTime: "11:15", downtimeHours: "3", rootCause: "Faulty spindle drive board", actionTaken: "Replaced spindle drive board", status: "resolved", resolvedDate: "2026-08-15", resolvedBy: "Anna Park", notes: "Spindle drive replaced and tested" },
  ]);
  console.log("✓ Breakdowns seeded");

  // ── Spare Parts ─────────────────────────────────────────────────────────────
  const parts = await db.insert(maintenanceSpareParts).values([
    { orgId, partCode: "PRT-001", name: "Spindle Drive Board", description: "Replacement spindle drive board for CNC", category: "Electrical", quantityOnHand: "3", reorderPoint: "2", unitCost: "850", location: "Store A — Rack 1", status: "active" },
    { orgId, partCode: "PRT-002", name: "Hydraulic Seal Kit", description: "Seal kit for injection press hydraulics", category: "Hydraulic", quantityOnHand: "5", reorderPoint: "3", unitCost: "120", location: "Store A — Rack 2", status: "active" },
    { orgId, partCode: "PRT-003", name: "Air Filter Element", description: "Replacement air filter for compressor", category: "Filters", quantityOnHand: "8", reorderPoint: "4", unitCost: "45", location: "Store A — Rack 3", status: "active" },
    { orgId, partCode: "PRT-004", name: "Conveyor Belt 200mm", description: "Replacement conveyor belt", category: "Mechanical", quantityOnHand: "2", reorderPoint: "3", unitCost: "320", location: "Store B — Rack 1", status: "active" },
    { orgId, partCode: "PRT-005", name: "Forklift Brake Pads", description: "Brake pad set for forklift", category: "Vehicle", quantityOnHand: "4", reorderPoint: "2", unitCost: "95", location: "Store B — Rack 2", status: "active" },
    { orgId, partCode: "PRT-006", name: "Piston Ring Set", description: "Piston ring set for compressor", category: "Mechanical", quantityOnHand: "1", reorderPoint: "2", unitCost: "210", location: "Store A — Rack 1", status: "active" },
  ]).returning();
  console.log("✓ Spare parts seeded");

  const spindleBoard = parts.find(p => p.partCode === "PRT-001")!;
  const pistonRing = parts.find(p => p.partCode === "PRT-006")!;

  // ── AMCs ────────────────────────────────────────────────────────────────────
  await db.insert(maintenanceAmcs).values([
    { orgId, contractNumber: "AMC-0001", vendorName: "Haas Service Center", title: "CNC Milling Machine Annual Maintenance", startDate: "2026-01-01", endDate: "2026-12-31", contractValue: "12000", coverage: "Preventive maintenance, calibration, and priority repair for CNC Milling Machine M-01", status: "active", notes: "Includes 2 preventive visits per year" },
    { orgId, contractNumber: "AMC-0002", vendorName: "Atlas Copco Service", title: "Air Compressor AMC", startDate: "2026-03-01", endDate: "2027-02-28", contractValue: "8500", coverage: "Quarterly service, oil changes, and filter replacements for Air Compressor AC-01", status: "active", notes: "24/7 emergency callout included" },
    { orgId, contractNumber: "AMC-0003", vendorName: "Toyota Material Handling", title: "Forklift Fleet AMC", startDate: "2026-06-01", endDate: "2027-05-31", contractValue: "15000", coverage: "Monthly service and brake checks for all forklifts", status: "active", notes: "Covers FL-01 through FL-04" },
  ]);
  console.log("✓ AMCs seeded");

  // ── Work Orders ─────────────────────────────────────────────────────────────
  const [wo1] = await db.insert(maintenanceWorkOrders).values({
    orgId, workOrderNumber: "WO-0001", assetId: compressor.id, workType: "breakdown",
    title: "Repair air compressor pressure loss", description: "Compressor losing pressure — replace piston ring and seals",
    priority: "high", status: "completed", plannedStart: "2026-08-10", plannedEnd: "2026-08-10",
    actualStart: "2026-08-10", actualEnd: "2026-08-10", assignedTo: "Mike Roberts",
    laborCost: "150", partsCost: "210", totalCost: "360", notes: "Piston ring replaced",
  }).returning();

  await db.insert(maintenanceWorkOrderParts).values([
    { orgId, workOrderId: wo1.id, partId: pistonRing.id, quantity: "1", unitCost: "210", lineTotal: "210" },
  ]);

  const [wo2] = await db.insert(maintenanceWorkOrders).values({
    orgId, workOrderNumber: "WO-0002", assetId: cnc.id, workType: "breakdown",
    title: "Replace CNC spindle drive board", description: "Spindle drive board faulty — replace and test",
    priority: "critical", status: "completed", plannedStart: "2026-08-15", plannedEnd: "2026-08-15",
    actualStart: "2026-08-15", actualEnd: "2026-08-15", assignedTo: "Anna Park",
    laborCost: "200", partsCost: "850", totalCost: "1050", notes: "Drive board replaced and calibrated",
  }).returning();

  await db.insert(maintenanceWorkOrderParts).values([
    { orgId, workOrderId: wo2.id, partId: spindleBoard.id, quantity: "1", unitCost: "850", lineTotal: "850" },
  ]);

  const [wo3] = await db.insert(maintenanceWorkOrders).values({
    orgId, workOrderNumber: "WO-0003", assetId: press.id, workType: "corrective",
    title: "Investigate hydraulic fluid leak", description: "Hydraulic fluid leak detected on injection press — diagnose and repair",
    priority: "high", status: "in_progress", plannedStart: "2026-08-12", plannedEnd: "2026-08-18",
    assignedTo: "Mike Roberts", laborCost: "0", partsCost: "0", totalCost: "0",
    notes: "Leak source being investigated",
  }).returning();

  await db.insert(maintenanceWorkOrders).values({
    orgId, workOrderNumber: "WO-0004", assetId: forklift.id, workType: "preventive",
    title: "Forklift monthly service", description: "Monthly service including brake check and oil change",
    priority: "medium", status: "open", plannedStart: "2026-08-20", plannedEnd: "2026-08-21",
    assignedTo: "Tom Brown", laborCost: "0", partsCost: "0", totalCost: "0",
    notes: "Scheduled preventive maintenance",
  });
  console.log("✓ Work orders seeded");

  // ── History ─────────────────────────────────────────────────────────────────
  await db.insert(maintenanceHistory).values([
    { orgId, assetId: compressor.id, workOrderId: wo1.id, historyType: "breakdown", title: "Repair air compressor pressure loss", description: "Replaced piston ring and seals", datePerformed: "2026-08-10", technician: "Mike Roberts", cost: "360", hoursSpent: "6", notes: "Compressor back online" },
    { orgId, assetId: cnc.id, workOrderId: wo2.id, historyType: "breakdown", title: "Replace CNC spindle drive board", description: "Replaced faulty spindle drive board", datePerformed: "2026-08-15", technician: "Anna Park", cost: "1050", hoursSpent: "3", notes: "Drive board replaced and tested" },
    { orgId, assetId: press.id, workOrderId: wo3.id, historyType: "corrective", title: "Investigate hydraulic fluid leak", description: "Diagnosing hydraulic leak on injection press", datePerformed: "2026-08-12", technician: "Mike Roberts", cost: "0", hoursSpent: "2", notes: "Investigation in progress" },
    { orgId, assetId: cnc.id, historyType: "preventive", title: "Monthly CNC calibration & lubrication", description: "Calibrated axes and lubricated guideways", datePerformed: "2026-07-20", technician: "Mike Roberts", cost: "0", hoursSpent: "4", notes: "Routine preventive maintenance" },
    { orgId, assetId: forklift.id, historyType: "preventive", title: "Forklift service & brake check", description: "Serviced engine and checked brakes", datePerformed: "2026-07-25", technician: "Tom Brown", cost: "0", hoursSpent: "3", notes: "All checks passed" },
  ]);
  console.log("✓ History seeded");

  console.log("\n✅ Maintenance Management demo data seeded successfully!");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });