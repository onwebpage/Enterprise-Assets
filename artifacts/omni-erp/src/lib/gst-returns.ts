import type { GSTReturn, GSTReturnEntry } from "@/hooks/useGST";
import Ajv from "ajv";
import gstr1Schema from "./gst-schemas/gstr1-v5.0.json";
import gstr3bSchema from "./gst-schemas/gstr3b-v7.1.json";

export interface GSTValidationIssue { field: string; message: string; entryId?: number }

const amount = (value: string | null | undefined) => Number(value ?? 0);
const money = (value: number) => Number(value.toFixed(2));
const schemaValidator = new Ajv({ allErrors: true, strict: false });
const validateGstr1Schema = schemaValidator.compile(gstr1Schema);
const validateGstr3bSchema = schemaValidator.compile(gstr3bSchema);

function periodParts(period: string): { fp: string; month: number; year: number } | null {
  const normalized = period.trim();
  let match = /^(\d{4})[-/](\d{1,2})$/.exec(normalized);
  if (match) return { year: Number(match[1]), month: Number(match[2]), fp: `${match[2].padStart(2, "0")}${match[1]}` };
  match = /^(\d{1,2})[-/]?(\d{4})$/.exec(normalized);
  if (match) return { month: Number(match[1]), year: Number(match[2]), fp: `${match[1].padStart(2, "0")}${match[2]}` };
  return null;
}

export function validateGSTReturn(ret: GSTReturn, entries: GSTReturnEntry[]): GSTValidationIssue[] {
  const issues: GSTValidationIssue[] = [];
  if (!ret.gstin || !/^\d{2}[A-Z0-9]{13}$/.test(ret.gstin)) issues.push({ field: "GSTIN", message: "Enter a valid 15-character GSTIN on the return." });
  const period = periodParts(ret.period);
  if (!period || period.month < 1 || period.month > 12) issues.push({ field: "Period", message: "Use a monthly tax period such as 2025-04 or 04-2025." });
  if (ret.returnType !== "gstr1" && ret.returnType !== "gstr3b") issues.push({ field: "Return type", message: "Only GSTR-1 and GSTR-3B export are supported." });
  if (ret.returnType === "gstr1" && entries.some(e => ["export", "nil_exempt", "other"].includes(e.entryType))) issues.push({ field: "Supply section", message: "This entry type needs additional GSTN table data (export payment/shipping details or separate nil/exempt/non-GST classifications) that is not stored on this return. It has not been omitted from an export silently." });
  if (ret.returnType === "gstr3b" && entries.some(e => e.entryType === "import")) issues.push({ field: "Import ITC", message: "GSTR-3B needs goods-versus-services import ITC classification, which this entry type does not store. Select/import-classify the supplies before export." });
  const componentItc = amount(ret.itcIgst) + amount(ret.itcCgst) + amount(ret.itcSgst) + amount(ret.itcCess);
  if (ret.returnType === "gstr3b" && amount(ret.totalItc) > 0 && componentItc === 0) issues.push({ field: "Input tax credit", message: "Add the IGST, CGST, SGST and cess ITC breakdown required by GSTR-3B Table 4. The total ITC is not divided across tax heads automatically." });
  if (ret.returnType === "gstr3b" && Math.abs(componentItc - amount(ret.totalItc)) > 0.01) issues.push({ field: "Input tax credit", message: "The ITC component amounts must add up to the return's total ITC." });
  entries.forEach((entry) => {
    const prefix = `Entry ${entry.invoiceNumber || entry.id}`;
    if (!Number.isFinite(amount(entry.taxableValue)) || amount(entry.taxableValue) < 0) issues.push({ field: "Taxable value", message: `${prefix}: taxable value must be a non-negative number.`, entryId: entry.id });
    if (entry.invoiceDate && !/^\d{4}-\d{2}-\d{2}$/.test(entry.invoiceDate)) issues.push({ field: "Invoice date", message: `${prefix}: invoice date must use YYYY-MM-DD.`, entryId: entry.id });
    if (entry.invoiceDate && Number.isNaN(Date.parse(`${entry.invoiceDate}T00:00:00Z`))) issues.push({ field: "Invoice date", message: `${prefix}: invoice date is invalid.`, entryId: entry.id });
    if (ret.returnType === "gstr1" && ["b2b", "b2c_large"].includes(entry.entryType) && !entry.invoiceNumber) issues.push({ field: "Invoice number", message: `${prefix}: invoice number is required for invoice-level outward supplies.`, entryId: entry.id });
    if (ret.returnType === "gstr1" && ["b2b", "b2c_large"].includes(entry.entryType) && !entry.invoiceDate) issues.push({ field: "Invoice date", message: `${prefix}: invoice date is required for invoice-level outward supplies.`, entryId: entry.id });
    if (ret.returnType === "gstr1" && ["b2b", "b2c_large", "b2c_small"].includes(entry.entryType) && !entry.placeOfSupply) issues.push({ field: "Place of supply", message: `${prefix}: place of supply is required for outward supplies.`, entryId: entry.id });
    if (ret.returnType === "gstr1" && ["b2b", "b2c_large", "b2c_small"].includes(entry.entryType)) {
      if (!entry.productName?.trim()) issues.push({ field: "Product / service", message: `${prefix}: product or service description is required.`, entryId: entry.id });
      if (!entry.hsnSacCode || !/^\d{4,8}$/.test(entry.hsnSacCode)) issues.push({ field: "HSN / SAC", message: `${prefix}: enter a valid 4–8 digit HSN/SAC code.`, entryId: entry.id });
      if (!entry.hsnDescription?.trim()) issues.push({ field: "HSN / SAC description", message: `${prefix}: HSN / SAC description is required for the GSTR-1 HSN summary.`, entryId: entry.id });
      if (!entry.uqc?.trim()) issues.push({ field: "UQC", message: `${prefix}: unit quantity code is required.`, entryId: entry.id });
      if (!entry.quantity || !Number.isFinite(amount(entry.quantity)) || amount(entry.quantity) <= 0) issues.push({ field: "Quantity", message: `${prefix}: quantity must be greater than zero.`, entryId: entry.id });
      if (entry.taxRate === null || entry.taxRate === undefined || !Number.isFinite(amount(entry.taxRate))) issues.push({ field: "Tax rate", message: `${prefix}: provide the applicable GST rate.`, entryId: entry.id });
      else if (!Number.isFinite(amount(entry.taxRate)) || amount(entry.taxRate) < 0 || amount(entry.taxRate) > 100) issues.push({ field: "Tax rate", message: `${prefix}: tax rate must be between 0 and 100%.`, entryId: entry.id });
      if (amount(entry.taxableValue) > 0 && entry.taxRate != null) {
        const actualRate = (amount(entry.cgstAmount) + amount(entry.sgstAmount) + amount(entry.igstAmount)) / amount(entry.taxableValue) * 100;
        if (Math.abs(actualRate - amount(entry.taxRate)) > 0.02) issues.push({ field: "Tax rate", message: `${prefix}: entered rate does not reconcile with tax amounts.`, entryId: entry.id });
      }
    }
    if (entry.entryType === "b2b" && (!entry.partyGstin || !/^\d{2}[A-Z0-9]{13}$/.test(entry.partyGstin))) issues.push({ field: "Recipient GSTIN", message: `${prefix}: B2B supply requires a valid recipient GSTIN.`, entryId: entry.id });
    if (amount(entry.cgstAmount) > 0 && amount(entry.igstAmount) > 0) issues.push({ field: "Tax split", message: `${prefix}: CGST and IGST cannot both be charged on the same supply.`, entryId: entry.id });
  });
  if (!issues.length) {
    try {
      const payload = buildGSTReturnJSON(ret, entries);
      const validate = ret.returnType === "gstr1" ? validateGstr1Schema : validateGstr3bSchema;
      if (!validate(payload)) for (const error of validate.errors ?? []) issues.push({ field: "GSTN schema", message: `${error.instancePath || "/"} ${error.message ?? "does not match the official GSTN schema"}` });
    } catch (error) {
      issues.push({ field: "GSTN schema", message: error instanceof Error ? error.message : "Could not validate generated payload." });
    }
  }
  return issues;
}

const tax = (e: GSTReturnEntry) => {
  const txval = amount(e.taxableValue);
  const rt = amount(e.taxRate);
  return { rt, txval: money(txval), iamt: money(amount(e.igstAmount)), camt: money(amount(e.cgstAmount)), samt: money(amount(e.sgstAmount)), csamt: money(amount(e.cessAmount)) };
};

export function buildGSTReturnJSON(ret: GSTReturn, entries: GSTReturnEntry[]) {
  const p = periodParts(ret.period);
  if (!p || !ret.gstin) throw new Error("A valid GSTIN and monthly period are required before export.");
  if (ret.returnType === "gstr1") {
    const invoiceValue = (e: GSTReturnEntry) => money(amount(e.taxableValue) + amount(e.totalTax));
    const invoiceGroups = (subset: GSTReturnEntry[], keyOf: (entry: GSTReturnEntry) => string) => {
      const grouped = new Map<string, GSTReturnEntry[]>();
      subset.forEach(entry => { const key = keyOf(entry); grouped.set(key, [...(grouped.get(key) ?? []), entry]); });
      return [...grouped.values()];
    };
    const invoiceLineItems = (group: GSTReturnEntry[]) => group.map((entry, index) => ({ num: index + 1, itm_det: tax(entry) }));
    const b2b = invoiceGroups(entries.filter(e => e.entryType === "b2b"), e => `${e.partyGstin}|${e.invoiceNumber}`).map(group => {
      const first = group[0];
      return { ctin: first.partyGstin, inv: [{ inum: first.invoiceNumber, idt: first.invoiceDate?.split("-").reverse().join("-"), val: money(group.reduce((sum, e) => sum + invoiceValue(e), 0)), pos: first.placeOfSupply, rchrg: "N", inv_typ: "R", itms: invoiceLineItems(group) }] };
    });
    const b2cl = invoiceGroups(entries.filter(e => e.entryType === "b2c_large"), e => `${e.placeOfSupply}|${e.invoiceNumber}`).map(group => {
      const first = group[0];
      return { pos: first.placeOfSupply, inv: [{ inum: first.invoiceNumber, idt: first.invoiceDate?.split("-").reverse().join("-"), val: money(group.reduce((sum, e) => sum + invoiceValue(e), 0)), itms: invoiceLineItems(group) }] };
    });
    const small = entries.filter(e => e.entryType === "b2c_small");
    const smallGroups = new Map<string, GSTReturnEntry[]>();
    for (const entry of small) {
      const item = tax(entry);
      const key = `${entry.placeOfSupply ?? ""}|${item.rt}|${amount(entry.igstAmount) > 0 ? "INTER" : "INTRA"}`;
      smallGroups.set(key, [...(smallGroups.get(key) ?? []), entry]);
    }
    const b2cs = [...smallGroups.values()].map(group => {
      const first = group[0];
      const rate = tax(first).rt;
      return { sply_ty: amount(first.igstAmount) > 0 ? "INTER" : "INTRA", typ: "OE", pos: first.placeOfSupply, rt: rate, txval: money(group.reduce((s,e) => s + amount(e.taxableValue),0)), iamt: money(group.reduce((s,e) => s + amount(e.igstAmount),0)), camt: money(group.reduce((s,e) => s + amount(e.cgstAmount),0)), samt: money(group.reduce((s,e) => s + amount(e.sgstAmount),0)), csamt: money(group.reduce((s,e) => s + amount(e.cessAmount),0)) };
    });
    const hsnSummary = (subset: GSTReturnEntry[]) => {
      const grouped = new Map<string, GSTReturnEntry[]>();
      subset.forEach(e => { const k = `${e.hsnSacCode}|${e.uqc}|${e.taxRate}`; grouped.set(k, [...(grouped.get(k) ?? []), e]); });
      return [...grouped.values()].map((group, i) => ({ num: i + 1, hsn_sc: group[0].hsnSacCode, desc: group[0].hsnDescription, uqc: group[0].uqc, qty: money(group.reduce((s,e) => s + amount(e.quantity),0)), ...tax(group[0]), txval: money(group.reduce((s,e) => s + amount(e.taxableValue),0)), iamt: money(group.reduce((s,e) => s + amount(e.igstAmount),0)), camt: money(group.reduce((s,e) => s + amount(e.cgstAmount),0)), samt: money(group.reduce((s,e) => s + amount(e.sgstAmount),0)), csamt: money(group.reduce((s,e) => s + amount(e.cessAmount),0)) }));
    };
    const taxableOutward = entries.filter(e => ["b2b", "b2c_large", "b2c_small"].includes(e.entryType));
    const issued = [...new Set(entries.filter(e => e.invoiceNumber).map(e => e.invoiceNumber!))].sort();
    const hsnGroups = taxableOutward.length ? { hsn_b2b: hsnSummary(taxableOutward.filter(e => e.entryType === "b2b")), hsn_b2c: hsnSummary(taxableOutward.filter(e => e.entryType !== "b2b")) } : undefined;
    const documentIssue = issued.length ? { doc_det_new: [{ doc_num: "1", doc_typ: "Invoices for outward supply", docs: [{ num: 1, from: issued[0], to: issued[issued.length - 1], totnum: issued.length, cancel: 0, net_issue: issued.length }] }] } : undefined;
    return { version: "GST3.2.4", gstin: ret.gstin, fp: p.fp, b2b, b2cl, b2cs, ...(hsnGroups ? { hsn: hsnGroups } : {}), ...(documentIssue ? { doc_issue: documentIssue } : {}) };
  }
  const sums = (subset: GSTReturnEntry[]) => ({ txval: money(subset.reduce((s,e) => s + amount(e.taxableValue),0)), iamt: money(subset.reduce((s,e) => s + amount(e.igstAmount),0)), camt: money(subset.reduce((s,e) => s + amount(e.cgstAmount),0)), samt: money(subset.reduce((s,e) => s + amount(e.sgstAmount),0)), csamt: money(subset.reduce((s,e) => s + amount(e.cessAmount),0)) });
  const outward = entries.filter(e => !["import","rcm","nil_exempt","export"].includes(e.entryType));
  const reverse = entries.filter(e => e.entryType === "rcm");
  const zeroRated = entries.filter(e => e.entryType === "export");
  const b2cInterState = entries.filter(e => ["b2c_large", "b2c_small"].includes(e.entryType) && amount(e.igstAmount) > 0);
  const unregisteredByPlace = new Map<string, GSTReturnEntry[]>();
  b2cInterState.forEach(e => { const pos = e.placeOfSupply ?? ""; unregisteredByPlace.set(pos, [...(unregisteredByPlace.get(pos) ?? []), e]); });
  const unregDetails = [...unregisteredByPlace.entries()].map(([pos, rows]) => ({ pos, txval: money(rows.reduce((s,e) => s + amount(e.taxableValue),0)), iamt: money(rows.reduce((s,e) => s + amount(e.igstAmount),0)) }));
  const zeroItc = { iamt: 0, camt: 0, samt: 0, csamt: 0 };
  // GSTR-3B is a GSTN API/offline-tool data shape; it is not a portal filing receipt.
  const itc = { iamt: money(amount(ret.itcIgst)), camt: money(amount(ret.itcCgst)), samt: money(amount(ret.itcSgst)), csamt: money(amount(ret.itcCess)) };
  return { gstin: ret.gstin, ret_period: p.fp, sup_details: { osup_det: sums(outward), osup_zero: { txval: money(zeroRated.reduce((s,e) => s + amount(e.taxableValue),0)), iamt: money(zeroRated.reduce((s,e) => s + amount(e.igstAmount),0)), csamt: money(zeroRated.reduce((s,e) => s + amount(e.cessAmount),0)) }, osup_nil_exmp: { txval: money(entries.filter(e => e.entryType === "nil_exempt").reduce((s,e) => s + amount(e.taxableValue),0)) }, isup_rev: sums(reverse), osup_nongst: { txval: 0 } }, inter_sup: { unreg_details: unregDetails, comp_details: [], uin_details: [] }, eco_dtls: { eco_sup: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 }, eco_reg_sup: { txval: 0 } }, itc_elg: { itc_avl: [{ ty: "OTH", ...itc }], itc_rev: [], itc_net: itc, itc_inelg: [] }, inward_sup: { isup_details: [{ ty: "GST", inter: 0, intra: 0 }, { ty: "NONGST", inter: 0, intra: 0 }] }, intr_ltfee: { intr_details: { iamt: 0, camt: 0, samt: 0, csamt: 0 } } };
}

export function downloadGSTJSON(ret: GSTReturn, entries: GSTReturnEntry[]) {
  const payload = buildGSTReturnJSON(ret, entries);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `${ret.returnType}_${ret.period.replace(/[^\dA-Za-z-]/g, "-")}_${ret.gstin}.json`; link.click();
  URL.revokeObjectURL(url);
}
