/**
 * Seed demo WMS data — bins, barcodes, lots, serials, receipts, cycle counts.
 * Run: pnpm --filter @workspace/db run seed:wms
 * Safe to re-run: cleans up existing WMS data for the org first.
 */
import { db, organizations } from "./index";
import {
  wmsBins, wmsBarcodes, wmsLots, wmsSerials,
  wmsReceipts, wmsReceiptLines, wmsCycleCounts, wmsCycleCountLines,
} from "./schema/advancedWms";
import { invWarehouses, invProducts } from "./schema/inventory";
import { eq, and } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding WMS demo data...");

  const [org] = await db.select().from(organizations).limit(1);
  if (!org) { console.error("No org found — run seed first"); process.exit(1); }
  const orgId = org.id;

  // ── Clean up existing WMS data for this org ────────────────────────────────
  await db.delete(wmsCycleCountLines);
  await db.delete(wmsCycleCounts).where(eq(wmsCycleCounts.orgId, orgId));
  await db.delete(wmsReceiptLines);
  await db.delete(wmsReceipts).where(eq(wmsReceipts.orgId, orgId));
  await db.delete(wmsSerials).where(eq(wmsSerials.orgId, orgId));
  await db.delete(wmsLots).where(eq(wmsLots.orgId, orgId));
  await db.delete(wmsBarcodes).where(eq(wmsBarcodes.orgId, orgId));
  await db.delete(wmsBins).where(eq(wmsBins.orgId, orgId));

  // ── Warehouses & products (must exist from inventory seed) ────────────────
  const warehouses = await db.select().from(invWarehouses).where(eq(invWarehouses.orgId, orgId));
  const products = await db.select().from(invProducts).where(eq(invProducts.orgId, orgId));
  if (!warehouses.length || !products.length) {
    console.error("No warehouses/products found — run seed:inventory first");
    process.exit(1);
  }
  const wh2 = warehouses.find(w => w.code === "WH-02") ?? warehouses[0];
  const wh3 = warehouses.find(w => w.code === "WH-03") ?? warehouses[1] ?? warehouses[0];
  const hwProducts = products.filter(p => p.sku.startsWith("PRD-043"));
  const p439 = hwProducts.find(p => p.sku === "PRD-0439") ?? hwProducts[0];
  const p438 = hwProducts.find(p => p.sku === "PRD-0438") ?? hwProducts[1] ?? hwProducts[0];
  const p437 = hwProducts.find(p => p.sku === "PRD-0437") ?? hwProducts[2] ?? hwProducts[0];
  const p433 = hwProducts.find(p => p.sku === "PRD-0433") ?? hwProducts[3] ?? hwProducts[0];

  // ── Bins ───────────────────────────────────────────────────────────────────
  const bins = await db.insert(wmsBins).values([
    { orgId, warehouseId: wh2.id, code: "A-01-01", name: "Aisle A / Rack 01 / Level 01", zone: "Zone A", binType: "bulk", capacity: "500", barcode: "BIN-A-01-01", isActive: true },
    { orgId, warehouseId: wh2.id, code: "A-01-02", name: "Aisle A / Rack 01 / Level 02", zone: "Zone A", binType: "picking", capacity: "200", barcode: "BIN-A-01-02", isActive: true },
    { orgId, warehouseId: wh2.id, code: "B-02-01", name: "Aisle B / Rack 02 / Level 01", zone: "Zone B", binType: "picking", capacity: "300", barcode: "BIN-B-02-01", isActive: true },
    { orgId, warehouseId: wh2.id, code: "R-01-01", name: "Receiving Dock 01", zone: "Receiving", binType: "receiving", capacity: "400", barcode: "BIN-R-01-01", isActive: true },
    { orgId, warehouseId: wh2.id, code: "S-01-01", name: "Shipping Staging 01", zone: "Shipping", binType: "shipping", capacity: "400", barcode: "BIN-S-01-01", isActive: true },
    { orgId, warehouseId: wh2.id, code: "Q-01-01", name: "Quarantine Bay 01", zone: "Quarantine", binType: "quarantine", capacity: "100", barcode: "BIN-Q-01-01", isActive: true },
    { orgId, warehouseId: wh3.id, code: "A-01-01", name: "Aisle A / Rack 01 / Level 01", zone: "Zone A", binType: "bulk", capacity: "500", barcode: "BIN-EA-01-01", isActive: true },
    { orgId, warehouseId: wh3.id, code: "A-01-02", name: "Aisle A / Rack 01 / Level 02", zone: "Zone A", binType: "picking", capacity: "200", barcode: "BIN-EA-01-02", isActive: true },
  ]).returning();
  console.log("✓ Bins seeded");

  const binA1 = bins.find(b => b.code === "A-01-01" && b.warehouseId === wh2.id)!;
  const binA2 = bins.find(b => b.code === "A-01-02" && b.warehouseId === wh2.id)!;
  const binB1 = bins.find(b => b.code === "B-02-01" && b.warehouseId === wh2.id)!;
  const binR1 = bins.find(b => b.code === "R-01-01" && b.warehouseId === wh2.id)!;
  const binEA1 = bins.find(b => b.code === "A-01-01" && b.warehouseId === wh3.id)!;

  // ── Barcodes / QR ──────────────────────────────────────────────────────────
  await db.insert(wmsBarcodes).values([
    { orgId, productId: p439.id, barcode: "8901234567890", barcodeType: "barcode", isPrimary: true },
    { orgId, productId: p438.id, barcode: "8901234567891", barcodeType: "barcode", isPrimary: true },
    { orgId, productId: p437.id, barcode: "8901234567892", barcodeType: "barcode", isPrimary: true },
    { orgId, productId: p433.id, barcode: "QR-PRD-0433", barcodeType: "qr", isPrimary: true },
  ]);
  console.log("✓ Barcodes seeded");

  // ── Lots ───────────────────────────────────────────────────────────────────
  const lots = await db.insert(wmsLots).values([
    { orgId, productId: p439.id, warehouseId: wh2.id, binId: binA1.id, lotNumber: "LOT-2026-001", manufactureDate: "2026-01-15", expiryDate: "2027-01-15", qtyOnHand: "50", qtyReserved: "0", status: "available" },
    { orgId, productId: p438.id, warehouseId: wh2.id, binId: binA2.id, lotNumber: "LOT-2026-002", manufactureDate: "2026-02-01", expiryDate: "2027-02-01", qtyOnHand: "120", qtyReserved: "0", status: "available" },
    { orgId, productId: p437.id, warehouseId: wh2.id, binId: binB1.id, lotNumber: "LOT-2026-003", manufactureDate: "2026-03-10", expiryDate: "2027-03-10", qtyOnHand: "18", qtyReserved: "0", status: "available" },
    { orgId, productId: p433.id, warehouseId: wh2.id, binId: binA1.id, lotNumber: "LOT-2026-004", manufactureDate: "2026-04-20", expiryDate: "2027-04-20", qtyOnHand: "43", qtyReserved: "0", status: "available" },
    { orgId, productId: p439.id, warehouseId: wh3.id, binId: binEA1.id, lotNumber: "LOT-2026-005", manufactureDate: "2026-05-05", expiryDate: "2027-05-05", qtyOnHand: "22", qtyReserved: "0", status: "available" },
    { orgId, productId: p438.id, warehouseId: wh2.id, binId: binR1.id, lotNumber: "LOT-2026-006", manufactureDate: "2026-08-01", expiryDate: "2026-09-01", qtyOnHand: "10", qtyReserved: "0", status: "available" },
  ]).returning();
  console.log("✓ Lots seeded");

  const lot1 = lots.find(l => l.lotNumber === "LOT-2026-001")!;
  const lot2 = lots.find(l => l.lotNumber === "LOT-2026-002")!;

  // ── Serials ────────────────────────────────────────────────────────────────
  await db.insert(wmsSerials).values([
    { orgId, productId: p439.id, warehouseId: wh2.id, binId: binA1.id, lotId: lot1.id, serialNumber: "SN-439-0001", status: "available" },
    { orgId, productId: p439.id, warehouseId: wh2.id, binId: binA1.id, lotId: lot1.id, serialNumber: "SN-439-0002", status: "available" },
    { orgId, productId: p439.id, warehouseId: wh2.id, binId: binA1.id, lotId: lot1.id, serialNumber: "SN-439-0003", status: "available" },
    { orgId, productId: p438.id, warehouseId: wh2.id, binId: binA2.id, lotId: lot2.id, serialNumber: "SN-438-0001", status: "available" },
    { orgId, productId: p438.id, warehouseId: wh2.id, binId: binA2.id, lotId: lot2.id, serialNumber: "SN-438-0002", status: "available" },
    { orgId, productId: p438.id, warehouseId: wh2.id, binId: binA2.id, lotId: lot2.id, serialNumber: "SN-438-0003", status: "available" },
  ]);
  console.log("✓ Serials seeded");

  // ── Receipts (GRN) ─────────────────────────────────────────────────────────
  const [receipt] = await db.insert(wmsReceipts).values({
    orgId, receiptNumber: "WMS-GRN-0001", warehouseId: wh2.id, supplierName: "Acme Hardware Supply",
    receiptDate: "2026-08-10", status: "received", notes: "Demo inbound GRN awaiting putaway",
  }).returning();

  await db.insert(wmsReceiptLines).values([
    { receiptId: receipt.id, productId: p439.id, binId: binR1.id, lotNumber: "LOT-2026-007", expiryDate: "2027-08-10", qty: "30", acceptedQty: "30", rejectedQty: "0", serialNumbers: "SN-439-0101, SN-439-0102, SN-439-0103", notes: "RFID scanner batch" },
    { receiptId: receipt.id, productId: p438.id, binId: binR1.id, lotNumber: "LOT-2026-008", expiryDate: "2027-08-10", qty: "40", acceptedQty: "38", rejectedQty: "2", serialNumbers: "SN-438-0101, SN-438-0102", notes: "2 units rejected on inspection" },
  ]);
  console.log("✓ Receipts seeded");

  // ── Cycle counts ───────────────────────────────────────────────────────────
  const [count] = await db.insert(wmsCycleCounts).values({
    orgId, countNumber: "CC-0001", warehouseId: wh2.id, binId: binA1.id,
    status: "in_progress", scheduledDate: "2026-08-20",
  }).returning();

  await db.insert(wmsCycleCountLines).values([
    { countId: count.id, productId: p439.id, binId: binA1.id, expectedQty: "50", countedQty: "48", varianceQty: "-2", notes: "2 units damaged" },
    { countId: count.id, productId: p433.id, binId: binA1.id, expectedQty: "43", countedQty: null, varianceQty: null, notes: null },
  ]);
  console.log("✓ Cycle counts seeded");

  console.log("\n✅ WMS demo data seeded successfully!");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });