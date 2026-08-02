/**
 * Seed demo inventory data — warehouses, categories, products, stock levels, movements, transfers
 */
import { db, organizations } from "./index";
import {
  invCategories, invWarehouses, invProducts,
  invStockLevels, invMovements, invTransfers, invTransferLines,
} from "./schema/inventory";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding inventory demo data...");

  // Get first org
  const [org] = await db.select().from(organizations).limit(1);
  if (!org) { console.error("No org found — run seed first"); process.exit(1); }
  const orgId = org.id;

  // ── Clean up existing inventory data for this org ─────────────────────────
  await db.delete(invTransferLines);
  await db.delete(invTransfers).where(eq(invTransfers.orgId, orgId));
  await db.delete(invMovements).where(eq(invMovements.orgId, orgId));
  await db.delete(invStockLevels).where(eq(invStockLevels.orgId, orgId));
  await db.delete(invProducts).where(eq(invProducts.orgId, orgId));
  await db.delete(invWarehouses).where(eq(invWarehouses.orgId, orgId));
  await db.delete(invCategories).where(eq(invCategories.orgId, orgId));

  // ── Categories ────────────────────────────────────────────────────────────
  const [catHW, catSW, catSvc] = await db.insert(invCategories).values([
    { orgId, name: "Hardware",              description: "Physical hardware products" },
    { orgId, name: "Software",              description: "Software licenses and subscriptions" },
    { orgId, name: "Professional Services", description: "Consulting and implementation services" },
  ]).returning();
  console.log("✓ Categories seeded");

  // ── Warehouses ────────────────────────────────────────────────────────────
  const [wh1, wh2, wh3, wh4] = await db.insert(invWarehouses).values([
    { orgId, code: "WH-01", name: "Main Office / Digital",    location: "Toronto, ON",     manager: "Sarah Kim",   capacity: 500,  status: "active" },
    { orgId, code: "WH-02", name: "HW Distribution Centre",   location: "Mississauga, ON", manager: "Tom Brown",   capacity: 5000, status: "active" },
    { orgId, code: "WH-03", name: "East Coast Hub",            location: "Halifax, NS",     manager: "Anna Park",   capacity: 2000, status: "active" },
    { orgId, code: "WH-04", name: "West Coast Staging",        location: "Vancouver, BC",   manager: "James Doyle", capacity: 1500, status: "maintenance" },
  ]).returning();
  console.log("✓ Warehouses seeded");

  // ── Products ──────────────────────────────────────────────────────────────
  const products = await db.insert(invProducts).values([
    { orgId, sku: "PRD-0441", name: "Enterprise ERP License (Annual)",  categoryId: catSW.id,  unit: "each", costPrice: "24800.00", sellingPrice: "29900.00", reorderPoint: 0, reorderQty: 0,  status: "active" },
    { orgId, sku: "PRD-0440", name: "Cloud Connector Module",           categoryId: catSW.id,  unit: "each", costPrice: "4200.00",  sellingPrice: "5800.00",  reorderPoint: 0, reorderQty: 0,  status: "active" },
    { orgId, sku: "PRD-0439", name: "Industrial RFID Scanner Pro",      categoryId: catHW.id,  unit: "each", costPrice: "1280.00",  sellingPrice: "1850.00",  reorderPoint: 20, reorderQty: 50, status: "active" },
    { orgId, sku: "PRD-0438", name: "Portable Barcode Terminal 3K",     categoryId: catHW.id,  unit: "each", costPrice: "890.00",   sellingPrice: "1250.00",  reorderPoint: 40, reorderQty: 80, status: "active" },
    { orgId, sku: "PRD-0437", name: "Network Switch 48P Managed",       categoryId: catHW.id,  unit: "each", costPrice: "3400.00",  sellingPrice: "4200.00",  reorderPoint: 25, reorderQty: 30, status: "active" },
    { orgId, sku: "PRD-0436", name: "UPS Battery Module 3KVA",          categoryId: catHW.id,  unit: "each", costPrice: "2100.00",  sellingPrice: "2800.00",  reorderPoint: 15, reorderQty: 20, status: "active" },
    { orgId, sku: "PRD-0435", name: "Implementation Services — SME",    categoryId: catSvc.id, unit: "each", costPrice: "12000.00", sellingPrice: "18000.00", reorderPoint: 0, reorderQty: 0,  status: "active" },
    { orgId, sku: "PRD-0434", name: "Server Rack 42U Cabinet",          categoryId: catHW.id,  unit: "each", costPrice: "1840.00",  sellingPrice: "2400.00",  reorderPoint: 5, reorderQty: 10,  status: "active" },
    { orgId, sku: "PRD-0433", name: "Wireless AP Industrial Dual-Band", categoryId: catHW.id,  unit: "each", costPrice: "640.00",   sellingPrice: "920.00",   reorderPoint: 10, reorderQty: 25, status: "active" },
    { orgId, sku: "PRD-0432", name: "Training Package (5 Users)",       categoryId: catSvc.id, unit: "each", costPrice: "2800.00",  sellingPrice: "4500.00",  reorderPoint: 0, reorderQty: 0,  status: "active" },
  ]).returning();
  console.log("✓ Products seeded");

  // Helper index
  const [p441, p440, p439, p438, p437, p436, p435, p434, p433, p432] = products;

  // ── Stock Levels ─────────────────────────────────────────────────────────
  await db.insert(invStockLevels).values([
    // WH-01 (software/services)
    { orgId, productId: p441.id, warehouseId: wh1.id, qtyOnHand: "42",  qtyReserved: "0" },
    { orgId, productId: p440.id, warehouseId: wh1.id, qtyOnHand: "78",  qtyReserved: "5" },
    { orgId, productId: p435.id, warehouseId: wh1.id, qtyOnHand: "0",   qtyReserved: "0" },
    { orgId, productId: p432.id, warehouseId: wh1.id, qtyOnHand: "0",   qtyReserved: "0" },
    // WH-02 (main hardware)
    { orgId, productId: p439.id, warehouseId: wh2.id, qtyOnHand: "84",  qtyReserved: "12" },
    { orgId, productId: p438.id, warehouseId: wh2.id, qtyOnHand: "156", qtyReserved: "24" },
    { orgId, productId: p437.id, warehouseId: wh2.id, qtyOnHand: "18",  qtyReserved: "8" },
    { orgId, productId: p433.id, warehouseId: wh2.id, qtyOnHand: "43",  qtyReserved: "0" },
    // WH-03 (east coast)
    { orgId, productId: p436.id, warehouseId: wh3.id, qtyOnHand: "7",   qtyReserved: "2" },
    { orgId, productId: p434.id, warehouseId: wh3.id, qtyOnHand: "0",   qtyReserved: "0" },
    { orgId, productId: p439.id, warehouseId: wh3.id, qtyOnHand: "22",  qtyReserved: "0" },
  ]);
  console.log("✓ Stock levels seeded");

  // ── Movements (recent history) ────────────────────────────────────────────
  await db.insert(invMovements).values([
    { orgId, movementNumber: "MV-0001", productId: p439.id, warehouseId: wh2.id, movementType: "receipt",    qty: "50",  reference: "PO-1120", notes: "RFID scanner batch receipt" },
    { orgId, movementNumber: "MV-0002", productId: p438.id, warehouseId: wh2.id, movementType: "dispatch",   qty: "-12", reference: "SO-3341", notes: "Barcode terminals shipped" },
    { orgId, movementNumber: "MV-0003", productId: p437.id, warehouseId: wh2.id, movementType: "transfer",   qty: "-8",  reference: "TF-0001", notes: "Transfer to east coast" },
    { orgId, movementNumber: "MV-0004", productId: p433.id, warehouseId: wh2.id, movementType: "receipt",    qty: "20",  reference: "PO-1119", notes: "Wireless AP restock" },
    { orgId, movementNumber: "MV-0005", productId: p439.id, warehouseId: wh3.id, movementType: "dispatch",   qty: "-6",  reference: "SO-3339", notes: "East coast dispatch" },
    { orgId, movementNumber: "MV-0006", productId: p436.id, warehouseId: wh3.id, movementType: "adjustment", qty: "-2",  reference: "ADJ-041", notes: "Damaged units written off" },
    { orgId, movementNumber: "MV-0007", productId: p438.id, warehouseId: wh2.id, movementType: "receipt",    qty: "80",  reference: "PO-1115", notes: "Initial stock receipt" },
    { orgId, movementNumber: "MV-0008", productId: p437.id, warehouseId: wh2.id, movementType: "receipt",    qty: "26",  reference: "PO-1114", notes: "Initial stock receipt" },
  ]);
  console.log("✓ Movements seeded");

  // ── Transfers ─────────────────────────────────────────────────────────────
  const [tf1, tf2, tf3] = await db.insert(invTransfers).values([
    { orgId, transferNumber: "TF-0001", fromWarehouseId: wh2.id, toWarehouseId: wh3.id, status: "in_transit", transferDate: "2026-07-26", notes: "Barcode terminals batch" },
    { orgId, transferNumber: "TF-0002", fromWarehouseId: wh2.id, toWarehouseId: wh4.id, status: "pending",    transferDate: "2026-07-28", notes: "West coast re-stock" },
    { orgId, transferNumber: "TF-0003", fromWarehouseId: wh1.id, toWarehouseId: wh3.id, status: "completed",  transferDate: "2026-07-21", notes: "Software license keys" },
  ]).returning();

  await db.insert(invTransferLines).values([
    { transferId: tf1.id, productId: p438.id, qty: "24" },
    { transferId: tf1.id, productId: p437.id, qty: "8"  },
    { transferId: tf2.id, productId: p439.id, qty: "30" },
    { transferId: tf2.id, productId: p433.id, qty: "15" },
    { transferId: tf3.id, productId: p441.id, qty: "5"  },
  ]);
  console.log("✓ Transfers seeded");

  console.log("\n✅ Inventory demo data seeded successfully!");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
