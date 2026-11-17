import assert from "node:assert/strict";
import path from "node:path";
import { createServer } from "vite";
import { PDFDocument } from "pdf-lib";
import { buildGSTReturnJSON, downloadGSTJSON, validateGSTReturn } from "../src/lib/gst-returns";
import type { GSTReturn, GSTReturnEntry } from "../src/hooks/useGST";

const baseReturn: GSTReturn = {
  id: 1, orgId: 1, returnType: "gstr1", period: "2026-10", dueDate: "2026-11-11",
  submissionDate: null, status: "draft", gstin: "29ABCDE1234F1Z5", totalTaxableValue: "75000",
  totalCgst: "0", totalSgst: "0", totalIgst: "13500", totalCess: "0", totalTaxLiability: "13500",
  totalItc: "5000", itcIgst: "1000", itcCgst: "2000", itcSgst: "2000", itcCess: "0", netPayable: "8500",
  notes: null, createdBy: 1, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z",
};

function transaction(id: number, overrides: Partial<GSTReturnEntry> = {}): GSTReturnEntry {
  return {
    id, returnId: 1, orgId: 1, entryType: "b2b", invoiceNumber: "INV-2026-1001", invoiceDate: "2026-10-10",
    partyGstin: "27ABCDE1234F1Z5", partyName: "Maharashtra Systems Pvt Ltd", placeOfSupply: "27",
    productName: "Enterprise software subscription", hsnSacCode: "998313", hsnDescription: "Information technology services",
    uqc: "OTH", quantity: "1", taxRate: "18", taxableValue: "50000", cgstAmount: "0", sgstAmount: "0",
    igstAmount: "9000", cessAmount: "0", totalTax: "9000", notes: null, createdAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

function expectValid(name: string, ret: GSTReturn, entries: GSTReturnEntry[]) {
  const issues = validateGSTReturn(ret, entries);
  assert.deepEqual(issues, [], `${name} should pass local checks and the official GSTN schema`);
  console.log(`PASS ${name}: local checks + official schema`);
  return buildGSTReturnJSON(ret, entries) as Record<string, any>;
}

const line1 = transaction(1);
const line2 = transaction(2, { hsnSacCode: "847130", hsnDescription: "Portable automatic data processing machines", productName: "Laptop computers", taxableValue: "25000", igstAmount: "4500", totalTax: "4500" });
const b2b = expectValid("GSTR-1 B2B invoice with multiple HSN lines", baseReturn, [line1, line2]);
assert.equal(b2b.b2b.length, 1, "same invoice lines are grouped into one invoice");
assert.equal(b2b.b2b[0].inv[0].itms.length, 2, "invoice lines stay itemized");
assert.equal(b2b.hsn.hsn_b2b.length, 2, "HSN summary is grouped by HSN/UQC/rate");

const b2c = expectValid("GSTR-1 B2C small intra-state supplies", baseReturn, [transaction(3, {
  entryType: "b2c_small", invoiceNumber: null, partyGstin: null, placeOfSupply: "29", taxableValue: "10000",
  cgstAmount: "900", sgstAmount: "900", igstAmount: "0", totalTax: "1800",
})]);
assert.equal(b2c.b2cs[0].sply_ty, "INTRA");
assert.equal(b2c.hsn.hsn_b2c[0].rt, 18);

const emptyGstr1 = expectValid("GSTR-1 empty period", baseReturn, []);
assert.deepEqual(emptyGstr1.b2b, []);
const gstr3bReturn = { ...baseReturn, returnType: "gstr3b" as const };
const gstr3b = expectValid("GSTR-3B outward supplies and ITC tax-head split", gstr3bReturn, [transaction(4, { entryType: "other" })]);
assert.equal(gstr3b.sup_details.osup_det.iamt, 9000);
assert.equal(gstr3b.itc_elg.itc_net.camt, 2000);
expectValid("GSTR-3B empty period", { ...gstr3bReturn, totalItc: "0", itcIgst: "0", itcCgst: "0", itcSgst: "0", itcCess: "0" }, []);

const invalid = validateGSTReturn({ ...baseReturn, gstin: "bad", period: "2026-13" }, [transaction(9, {
  invoiceDate: null, placeOfSupply: null, partyGstin: "bad", hsnSacCode: null, hsnDescription: null, uqc: null, quantity: null, taxRate: null,
})]);
assert(invalid.length >= 8, "invalid GSTIN/period/transaction data must report multiple actionable errors");
console.log(`PASS invalid GST data: ${invalid.length} validation issues reported`);

const missingItc = validateGSTReturn({ ...gstr3bReturn, itcIgst: "0", itcCgst: "0", itcSgst: "0", itcCess: "0" }, [transaction(10, { entryType: "other" })]);
assert(missingItc.some(issue => issue.field === "Input tax credit"));
console.log("PASS incomplete ITC breakdown is rejected");

let downloadedName = "";
let downloadedPayload = "";
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
URL.createObjectURL = ((blob: Blob) => { void blob.text().then(text => { downloadedPayload = text; }); return "blob:test"; }) as typeof URL.createObjectURL;
URL.revokeObjectURL = (() => undefined) as typeof URL.revokeObjectURL;
(globalThis as any).document = { createElement: () => ({ click() { downloadedName = this.download; }, href: "", download: "" }) };
downloadGSTJSON(baseReturn, [line1]);
await new Promise(resolve => setTimeout(resolve, 0));
assert(downloadedName.startsWith("gstr1_2026-10_"));
assert.equal(JSON.parse(downloadedPayload).gstin, baseReturn.gstin);
console.log("PASS JSON download: expected filename and generated return data captured");
URL.createObjectURL = originalCreateObjectURL;
URL.revokeObjectURL = originalRevokeObjectURL;

// A synthetic invoice fixture checks the existing PDF renderer's page geometry;
// live Supabase invoice retrieval remains an environment-dependent browser test.
(globalThis as any).Image = class { onerror?: () => void; set src(_value: string) { queueMicrotask(() => this.onerror?.()); } };
const appRoot = process.cwd();
const vite = await createServer({
  configFile: false,
  root: appRoot,
  resolve: { alias: {
    "@": path.resolve(appRoot, "src"),
    "@assets": path.resolve(appRoot, "../../attached_assets"),
    "@native-bridge": path.resolve(appRoot, "src/lib/native/bridge.web.ts"),
  } },
  optimizeDeps: { noDiscovery: true, entries: [] },
  server: { middlewareMode: true }, appType: "custom",
});
try {
  const { createInvoicePdf } = await vite.ssrLoadModule("/src/lib/invoice-print/pdf.ts") as { createInvoicePdf: (model: any, format: "a4" | "a5" | "thermal80") => Promise<Blob> };
  const { renderInvoiceDocument } = await vite.ssrLoadModule("/src/lib/invoice-print/html.ts") as { renderInvoiceDocument: (model: any, format: "a4" | "a5" | "thermal80") => string };
  const model = {
    brand: "ZorvanI ERP", documentTitle: "Tax Invoice", company: { name: "ZorvanI Services", legalName: "ZorvanI Services Pvt Ltd", gstin: "29ABCDE1234F1Z5", taxId: "", country: "India" },
    customer: { name: "Maharashtra Systems Pvt Ltd", addressLines: ["Mumbai, Maharashtra"], phone: "", email: "", gstin: "27ABCDE1234F1Z5" },
    shipTo: null, invoiceNumber: "INV-2026-1001", issueDate: "10 Oct 2026", dueDate: "09 Nov 2026", placeOfSupply: "Maharashtra",
    lines: [{ index: 1, description: "Enterprise software subscription", quantity: "1", unitPrice: "50000.00", amount: "50000.00" }], totalQuantity: "1", subtotal: "₹50,000.00", discount: "", taxableAmount: "₹50,000.00",
    taxRows: [{ label: "IGST @ 18%", amount: "₹9,000.00" }], taxTotal: "₹9,000.00", grandTotal: "₹59,000.00", amountInWords: "Rupees Fifty Nine Thousand Only",
    amountPaid: "₹0.00", balanceDue: "₹59,000.00", hasBalance: true, paymentStatus: { label: "Due", tone: "due" }, payments: [], upi: null, notes: "",
  };
  for (const [format, widthMm, heightMm] of [["a4", 210, 297], ["a5", 210, 148], ["thermal80", 80, null]] as const) {
    const printHtml = renderInvoiceDocument(model, format);
    assert(printHtml.includes(`class="invoice-${format}"`) && printHtml.includes("INV-2026-1001"), `${format} print HTML contains invoice data`);
    if (format === "a4") assert(printHtml.includes("size: A4 portrait"));
    if (format === "a5") assert(printHtml.includes("size: A5 landscape"));
    if (format === "thermal80") assert(printHtml.includes("size: 80mm"));
    const blob = await createInvoicePdf(model, format);
    assert(blob.size > 1000, `${format} PDF has content`);
    const pdf = await PDFDocument.load(await blob.arrayBuffer());
    const page = pdf.getPages()[0].getSize();
    assert(Math.abs(page.width * 25.4 / 72 - widthMm) < 1, `${format} PDF width`);
    if (heightMm) assert(Math.abs(page.height * 25.4 / 72 - heightMm) < 1, `${format} PDF height`);
    else assert(page.height > 0, "thermal receipt has a content-sized page");
    console.log(`PASS invoice ${format} PDF: ${Math.round(page.width * 25.4 / 72)}mm × ${Math.round(page.height * 25.4 / 72)}mm`);
  }
} finally {
  await vite.close();
}
