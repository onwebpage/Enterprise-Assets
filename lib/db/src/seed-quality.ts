/**
 * Seed demo Quality Management data — parameters, inspections, rejections, CAPAs, certificates.
 * Run: pnpm --filter @workspace/db run seed:quality
 * Safe to re-run: cleans up existing quality data for the org first.
 */
import { db, organizations } from "./index";
import {
  qcParameters, qcInspections, qcInspectionLines,
  qcRejections, qcCapas, qcCertificates, qcCertificateLines,
} from "./schema/quality";
import { invProducts, invWarehouses } from "./schema/inventory";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding Quality Management demo data...");

  const [org] = await db.select().from(organizations).limit(1);
  if (!org) { console.error("No org found — run seed first"); process.exit(1); }
  const orgId = org.id;

  // ── Clean up existing quality data for this org ────────────────────────────
  await db.delete(qcCertificateLines);
  await db.delete(qcCertificates).where(eq(qcCertificates.orgId, orgId));
  await db.delete(qcCapas).where(eq(qcCapas.orgId, orgId));
  await db.delete(qcRejections).where(eq(qcRejections.orgId, orgId));
  await db.delete(qcInspectionLines);
  await db.delete(qcInspections).where(eq(qcInspections.orgId, orgId));
  await db.delete(qcParameters).where(eq(qcParameters.orgId, orgId));

  // ── Reference data (must exist from inventory seed) ────────────────────────
  const products = await db.select().from(invProducts).where(eq(invProducts.orgId, orgId));
  const warehouses = await db.select().from(invWarehouses).where(eq(invWarehouses.orgId, orgId));
  if (!products.length || !warehouses.length) {
    console.error("No products/warehouses found — run seed:inventory first");
    process.exit(1);
  }
  const hwProducts = products.filter(p => p.sku.startsWith("PRD-043"));
  const p439 = hwProducts.find(p => p.sku === "PRD-0439") ?? hwProducts[0];
  const p438 = hwProducts.find(p => p.sku === "PRD-0438") ?? hwProducts[1] ?? hwProducts[0];
  const p437 = hwProducts.find(p => p.sku === "PRD-0437") ?? hwProducts[2] ?? hwProducts[0];
  const p433 = hwProducts.find(p => p.sku === "PRD-0433") ?? hwProducts[3] ?? hwProducts[0];
  const wh2 = warehouses.find(w => w.code === "WH-02") ?? warehouses[0];
  const wh3 = warehouses.find(w => w.code === "WH-03") ?? warehouses[1] ?? warehouses[0];

  // ── Parameters ─────────────────────────────────────────────────────────────
  const params = await db.insert(qcParameters).values([
    { orgId, code: "PAR-WT", name: "Weight (kg)", parameterType: "numeric", unit: "kg", minValue: "0.5", maxValue: "2.5", description: "Unit weight in kilograms", isActive: true },
    { orgId, code: "PAR-DIM", name: "Dimensions (cm)", parameterType: "numeric", unit: "cm", minValue: "5", maxValue: "50", description: "Package dimensions", isActive: true },
    { orgId, code: "PAR-COL", name: "Colour", parameterType: "enum", allowedValues: "Black,White,Silver,Blue", description: "Product colour", isActive: true },
    { orgId, code: "PAR-DEF", name: "Defect rate (%)", parameterType: "numeric", unit: "%", minValue: "0", maxValue: "2", description: "Maximum acceptable defect rate", isActive: true },
    { orgId, code: "PAR-FUNC", name: "Functional test", parameterType: "boolean", description: "Pass/fail functional test", isActive: true },
    { orgId, code: "PAR-PACK", name: "Packaging integrity", parameterType: "boolean", description: "Packaging intact and sealed", isActive: true },
    { orgId, code: "PAR-SN", name: "Serial number present", parameterType: "boolean", description: "Serial number label present and legible", isActive: true },
    { orgId, code: "PAR-EXP", name: "Expiry date valid", parameterType: "boolean", description: "Expiry date is in the future", isActive: true },
  ]).returning();
  console.log("✓ Parameters seeded");

  const pWeight = params.find(p => p.code === "PAR-WT")!;
  const pDim = params.find(p => p.code === "PAR-DIM")!;
  const pCol = params.find(p => p.code === "PAR-COL")!;
  const pDef = params.find(p => p.code === "PAR-DEF")!;
  const pFunc = params.find(p => p.code === "PAR-FUNC")!;
  const pPack = params.find(p => p.code === "PAR-PACK")!;
  const pSn = params.find(p => p.code === "PAR-SN")!;
  const pExp = params.find(p => p.code === "PAR-EXP")!;

  // ── Inspections ────────────────────────────────────────────────────────────
  const [incoming] = await db.insert(qcInspections).values({
    orgId, inspectionNumber: "QC-0001", inspectionType: "incoming",
    productId: p439.id, warehouseId: wh2.id, referenceNumber: "PO-1120",
    lotNumber: "LOT-2026-001", quantity: "50", inspectedQty: "50",
    passedQty: "48", rejectedQty: "2", status: "failed",
    inspector: "Anna Park", inspectionDate: "2026-08-12",
    notes: "2 units failed visual inspection",
  }).returning();

  await db.insert(qcInspectionLines).values([
    { inspectionId: incoming.id, parameterId: pWeight.id, measuredValue: "1.2", expectedValue: "0.5-2.5", result: "pass" },
    { inspectionId: incoming.id, parameterId: pDim.id, measuredValue: "25", expectedValue: "5-50", result: "pass" },
    { inspectionId: incoming.id, parameterId: pCol.id, measuredValue: "Black", expectedValue: "Black,White,Silver,Blue", result: "pass" },
    { inspectionId: incoming.id, parameterId: pDef.id, measuredValue: "1.5", expectedValue: "0-2", result: "pass" },
    { inspectionId: incoming.id, parameterId: pFunc.id, measuredValue: "true", expectedValue: "true", result: "pass" },
    { inspectionId: incoming.id, parameterId: pPack.id, measuredValue: "false", expectedValue: "true", result: "fail" },
    { inspectionId: incoming.id, parameterId: pSn.id, measuredValue: "true", expectedValue: "true", result: "pass" },
  ]);
  console.log("✓ Incoming inspection seeded");

  const [inProcess] = await db.insert(qcInspections).values({
    orgId, inspectionNumber: "QC-0002", inspectionType: "in_process",
    productId: p438.id, warehouseId: wh2.id, referenceNumber: "WO-0042",
    batchNumber: "BATCH-2026-08", quantity: "120", inspectedQty: "120",
    passedQty: "118", rejectedQty: "2", status: "passed",
    inspector: "Mike Roberts", inspectionDate: "2026-08-14",
    notes: "In-process quality check passed",
  }).returning();

  await db.insert(qcInspectionLines).values([
    { inspectionId: inProcess.id, parameterId: pWeight.id, measuredValue: "0.9", expectedValue: "0.5-2.5", result: "pass" },
    { inspectionId: inProcess.id, parameterId: pDim.id, measuredValue: "18", expectedValue: "5-50", result: "pass" },
    { inspectionId: inProcess.id, parameterId: pCol.id, measuredValue: "Silver", expectedValue: "Black,White,Silver,Blue", result: "pass" },
    { inspectionId: inProcess.id, parameterId: pDef.id, measuredValue: "0.5", expectedValue: "0-2", result: "pass" },
    { inspectionId: inProcess.id, parameterId: pFunc.id, measuredValue: "true", expectedValue: "true", result: "pass" },
    { inspectionId: inProcess.id, parameterId: pPack.id, measuredValue: "true", expectedValue: "true", result: "pass" },
  ]);
  console.log("✓ In-process inspection seeded");

  const [finished] = await db.insert(qcInspections).values({
    orgId, inspectionNumber: "QC-0003", inspectionType: "finished_goods",
    productId: p437.id, warehouseId: wh3.id, referenceNumber: "SO-3341",
    lotNumber: "LOT-2026-003", quantity: "18", inspectedQty: "18",
    passedQty: "18", rejectedQty: "0", status: "passed",
    inspector: "Sarah Kim", inspectionDate: "2026-08-15",
    notes: "Finished goods inspection passed",
  }).returning();

  await db.insert(qcInspectionLines).values([
    { inspectionId: finished.id, parameterId: pWeight.id, measuredValue: "3.4", expectedValue: "0.5-2.5", result: "fail" },
    { inspectionId: finished.id, parameterId: pDim.id, measuredValue: "42", expectedValue: "5-50", result: "pass" },
    { inspectionId: finished.id, parameterId: pCol.id, measuredValue: "Black", expectedValue: "Black,White,Silver,Blue", result: "pass" },
    { inspectionId: finished.id, parameterId: pDef.id, measuredValue: "0", expectedValue: "0-2", result: "pass" },
    { inspectionId: finished.id, parameterId: pFunc.id, measuredValue: "true", expectedValue: "true", result: "pass" },
    { inspectionId: finished.id, parameterId: pPack.id, measuredValue: "true", expectedValue: "true", result: "pass" },
  ]);
  console.log("✓ Finished-goods inspection seeded");

  // ── Rejections ─────────────────────────────────────────────────────────────
  await db.insert(qcRejections).values([
    { orgId, rejectionNumber: "REJ-0001", inspectionId: incoming.id, productId: p439.id, warehouseId: wh2.id, lotNumber: "LOT-2026-001", quantity: "2", reason: "Packaging damaged during transit", disposition: "return", status: "returned", notes: "Returned to supplier for credit" },
    { orgId, rejectionNumber: "REJ-0002", inspectionId: inProcess.id, productId: p438.id, warehouseId: wh2.id, batchNumber: "BATCH-2026-08", quantity: "2", reason: "Colour mismatch on 2 units", disposition: "rework", status: "reworked", notes: "Reworked and re-inspected" },
  ]);
  console.log("✓ Rejections seeded");

  // ── CAPAs ──────────────────────────────────────────────────────────────────
  await db.insert(qcCapas).values([
    { orgId, capaNumber: "CAPA-0001", capaType: "corrective", title: "Packaging damage on inbound RFID scanners", description: "2 units received with damaged packaging from supplier", sourceType: "inspection", sourceId: incoming.id, priority: "high", status: "in_progress", rootCause: "Inadequate packaging material from supplier", actionPlan: "Request improved packaging from supplier; add packaging check to receiving SOP", assignedTo: "Anna Park", dueDate: "2026-09-01", notes: "Supplier notified" },
    { orgId, capaNumber: "CAPA-0002", capaType: "preventive", title: "Prevent colour mismatch in production batches", description: "Colour deviation detected in 2 units during in-process inspection", sourceType: "inspection", sourceId: inProcess.id, priority: "medium", status: "action_planned", rootCause: "Insufficient colour calibration on production line", actionPlan: "Implement weekly colour calibration checks on production equipment", assignedTo: "Mike Roberts", dueDate: "2026-08-30", notes: "Preventive action to avoid recurrence" },
  ]);
  console.log("✓ CAPAs seeded");

  // ── Certificates ───────────────────────────────────────────────────────────
  const [cert] = await db.insert(qcCertificates).values({
    orgId, certificateNumber: "COA-0001", productId: p437.id, inspectionId: finished.id,
    lotNumber: "LOT-2026-003", certificateType: "coa", issueDate: "2026-08-15",
    expiryDate: "2027-08-15", status: "issued", issuedBy: "Sarah Kim",
    notes: "Certificate of Analysis for finished goods lot",
  }).returning();

  await db.insert(qcCertificateLines).values([
    { certificateId: cert.id, parameterId: pWeight.id, measuredValue: "3.4", expectedValue: "0.5-2.5", result: "fail" },
    { certificateId: cert.id, parameterId: pDim.id, measuredValue: "42", expectedValue: "5-50", result: "pass" },
    { certificateId: cert.id, parameterId: pCol.id, measuredValue: "Black", expectedValue: "Black,White,Silver,Blue", result: "pass" },
    { certificateId: cert.id, parameterId: pDef.id, measuredValue: "0", expectedValue: "0-2", result: "pass" },
    { certificateId: cert.id, parameterId: pFunc.id, measuredValue: "true", expectedValue: "true", result: "pass" },
    { certificateId: cert.id, parameterId: pPack.id, measuredValue: "true", expectedValue: "true", result: "pass" },
  ]);
  console.log("✓ Certificates seeded");

  console.log("\n✅ Quality Management demo data seeded successfully!");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });