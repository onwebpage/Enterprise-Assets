/**
 * Invoice print view-model.
 *
 * Every print format (A4, A5, 80mm thermal) and the PDF export render from the
 * single model built here, and the model is built only from records returned by
 * the API: the invoice with its lines, the organization, the customer and the
 * payments recorded against the invoice. Nothing is invented — a field that is
 * missing in the database is simply left off the printout.
 */
import type { ARCustomer, ARInvoice, ARPayment, ARPaymentMethod } from '@/hooks/useAccountsReceivable';
import type { Organization } from '@/hooks/useSettings';

export const PRODUCT_BRAND = 'ZorvanI ERP';

// ── Formats ───────────────────────────────────────────────────────────────────

export const INVOICE_PRINT_FORMATS = ['a4', 'a5', 'thermal80'] as const;
export type InvoicePrintFormat = (typeof INVOICE_PRINT_FORMATS)[number];

export interface InvoicePrintFormatSpec {
  id: InvoicePrintFormat;
  /** Short label for the selector, e.g. "A4". */
  label: string;
  /** What the format is for. */
  description: string;
  /** Human-readable paper size. */
  paper: string;
  /** Page width in mm. */
  widthMm: number;
  /** Page height in mm; `null` for continuous receipt paper. */
  heightMm: number | null;
  /** Page margin in mm, applied through CSS `@page`. */
  marginMm: number;
}

export const INVOICE_PRINT_FORMAT_SPECS: Record<InvoicePrintFormat, InvoicePrintFormatSpec> = {
  a4: {
    id: 'a4', label: 'A4', description: 'Portrait · Standard invoice', paper: '210 × 297 mm',
    widthMm: 210, heightMm: 297, marginMm: 12,
  },
  a5: {
    id: 'a5', label: 'A5', description: 'Landscape · Compact half-sheet', paper: '210 × 148 mm',
    widthMm: 210, heightMm: 148, marginMm: 8,
  },
  thermal80: {
    id: 'thermal80', label: '80mm', description: 'Thermal · POS receipt', paper: '80 mm roll',
    widthMm: 80, heightMm: null, marginMm: 0,
  },
};

export const DEFAULT_INVOICE_PRINT_FORMAT: InvoicePrintFormat = 'a4';
const FORMAT_STORAGE_KEY = 'zorvani.invoicePrintFormat';

export function isInvoicePrintFormat(value: unknown): value is InvoicePrintFormat {
  return typeof value === 'string' && (INVOICE_PRINT_FORMATS as readonly string[]).includes(value);
}

/** Last format the user picked on this device (falls back to A4). */
export function getStoredInvoicePrintFormat(): InvoicePrintFormat {
  try {
    const stored = localStorage.getItem(FORMAT_STORAGE_KEY);
    return isInvoicePrintFormat(stored) ? stored : DEFAULT_INVOICE_PRINT_FORMAT;
  } catch {
    return DEFAULT_INVOICE_PRINT_FORMAT;
  }
}

export function storeInvoicePrintFormat(format: InvoicePrintFormat): void {
  try { localStorage.setItem(FORMAT_STORAGE_KEY, format); } catch { /* storage unavailable */ }
}

// ── Source data ───────────────────────────────────────────────────────────────

export interface InvoicePrintSource {
  invoice: ARInvoice;
  organization: Organization | null;
  customer: ARCustomer | null;
  payments: ARPayment[];
}

// ── Model ─────────────────────────────────────────────────────────────────────

export type PaymentStatusTone = 'paid' | 'partial' | 'due' | 'overdue' | 'muted';

export interface InvoicePrintLine {
  index: number;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

export interface InvoicePrintTaxRow {
  label: string;
  amount: string;
}

export interface InvoicePrintPayment {
  date: string;
  method: string;
  reference: string;
  amount: string;
}

export interface InvoicePrintModel {
  brand: string;
  documentTitle: string;
  company: {
    name: string;
    legalName: string;
    gstin: string;
    taxId: string;
    country: string;
  };
  customer: {
    name: string;
    addressLines: string[];
    phone: string;
    email: string;
    gstin: string;
  };
  /** Delivery address; null when the invoice has no Ship To (then nothing is printed). */
  shipTo: { name: string; addressLines: string[]; phone: string } | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  placeOfSupply: string;
  lines: InvoicePrintLine[];
  totalQuantity: string;
  subtotal: string;
  /** Empty when the invoice has no discount. */
  discount: string;
  /** Subtotal less discount; only shown when a discount applies. */
  taxableAmount: string;
  /** GST breakdown rows (CGST + SGST, IGST, or a single GST/Tax row). Empty when no tax. */
  taxRows: InvoicePrintTaxRow[];
  taxTotal: string;
  grandTotal: string;
  amountInWords: string;
  amountPaid: string;
  balanceDue: string;
  hasBalance: boolean;
  paymentStatus: { label: string; tone: PaymentStatusTone };
  payments: InvoicePrintPayment[];
  /** UPI payment request for the outstanding balance, when the organization has a UPI ID. */
  upi: { id: string; payee: string; amount: string; uri: string } | null;
  notes: string;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

const rupeeFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Parse a decimal string/number into integer paise, avoiding float drift. */
export function toPaise(value: string | number | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

/** ₹ amount with Indian digit grouping, e.g. ₹1,23,456.00 */
export function formatRupees(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  return `${sign}₹${rupeeFormatter.format(Math.abs(paise) / 100)}`;
}

function formatQuantity(value: string): string {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return value;
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 4 }).format(quantity);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-02" → "02 Oct 2026". Unparseable values are returned unchanged. */
export function formatInvoiceDate(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return value ?? '';
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${match[3]} ${month} ${match[1]}` : (value ?? '');
}

const PAYMENT_METHOD_LABELS: Record<ARPaymentMethod, string> = {
  bank_transfer: 'Bank transfer',
  check: 'Cheque',
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
};

// ── GST helpers ───────────────────────────────────────────────────────────────

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

const GST_STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
  '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
  '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
};

function normalizeGstin(value: string | null | undefined): string {
  const gstin = (value ?? '').replace(/\s+/g, '').toUpperCase();
  return GSTIN_PATTERN.test(gstin) ? gstin : '';
}

/** "18" for an exact 18% rate; empty when the tax is not a clean percentage of the taxable value. */
function cleanRateLabel(taxPaise: number, taxablePaise: number, divisor = 1): string {
  if (taxablePaise <= 0 || taxPaise <= 0) return '';
  const rate = (taxPaise / taxablePaise) * 100 / divisor;
  const rounded = Math.round(rate * 4) / 4; // GST slabs are multiples of 0.25%
  if (Math.abs(rate - rounded) > 0.02) return '';
  return ` @ ${Number(rounded.toFixed(2))}%`;
}

function buildTaxRows(taxPaise: number, taxablePaise: number, sellerGstin: string, buyerGstin: string): InvoicePrintTaxRow[] {
  if (taxPaise <= 0) return [];
  if (sellerGstin && buyerGstin) {
    if (sellerGstin.slice(0, 2) === buyerGstin.slice(0, 2)) {
      // Intra-state supply: tax is split equally between centre and state.
      const cgst = Math.floor(taxPaise / 2);
      const halfRate = cleanRateLabel(taxPaise, taxablePaise, 2);
      return [
        { label: `CGST${halfRate}`, amount: formatRupees(cgst) },
        { label: `SGST${halfRate}`, amount: formatRupees(taxPaise - cgst) },
      ];
    }
    return [{ label: `IGST${cleanRateLabel(taxPaise, taxablePaise)}`, amount: formatRupees(taxPaise) }];
  }
  // Without both GSTINs the supply type is unknown, so the tax is shown as one line.
  const label = sellerGstin ? 'GST' : 'Tax';
  return [{ label: `${label}${cleanRateLabel(taxPaise, taxablePaise)}`, amount: formatRupees(taxPaise) }];
}

// ── Amount in words (Indian numbering) ────────────────────────────────────────

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function wordsBelowThousand(value: number): string {
  const parts: string[] = [];
  if (value >= 100) {
    parts.push(`${ONES[Math.floor(value / 100)]} Hundred`);
    value %= 100;
  }
  if (value >= 20) {
    parts.push(TENS[Math.floor(value / 10)] + (value % 10 ? `-${ONES[value % 10]}` : ''));
  } else if (value > 0) {
    parts.push(ONES[value]);
  }
  return parts.join(' ');
}

function indianNumberWords(value: number): string {
  if (value === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(value / 10_000_000);
  if (crore > 0) parts.push(`${indianNumberWords(crore)} Crore`);
  const lakh = Math.floor((value % 10_000_000) / 100_000);
  if (lakh > 0) parts.push(`${wordsBelowThousand(lakh)} Lakh`);
  const thousand = Math.floor((value % 100_000) / 1000);
  if (thousand > 0) parts.push(`${wordsBelowThousand(thousand)} Thousand`);
  const rest = value % 1000;
  if (rest > 0) parts.push(wordsBelowThousand(rest));
  return parts.join(' ');
}

export function rupeesInWords(paise: number): string {
  const absolute = Math.abs(paise);
  const rupees = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  const words = `Rupees ${indianNumberWords(rupees)}`;
  return remainder > 0 ? `${words} and ${wordsBelowThousand(remainder)} Paise Only` : `${words} Only`;
}

// ── UPI ───────────────────────────────────────────────────────────────────────

const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export function isValidUpiId(value: string | null | undefined): boolean {
  return UPI_ID_PATTERN.test((value ?? '').trim());
}

function buildUpiUri(upiId: string, payee: string, balancePaise: number, invoiceNumber: string): string {
  const params = [
    `pa=${encodeURIComponent(upiId).replace(/%40/g, '@')}`,
    `pn=${encodeURIComponent(payee)}`,
    `am=${(balancePaise / 100).toFixed(2)}`,
    'cu=INR',
    `tn=${encodeURIComponent(`Invoice ${invoiceNumber}`)}`,
  ];
  return `upi://pay?${params.join('&')}`;
}

// ── Payment status ────────────────────────────────────────────────────────────

function derivePaymentStatus(invoice: ARInvoice, paidPaise: number, balancePaise: number): InvoicePrintModel['paymentStatus'] {
  if (invoice.status === 'void') return { label: 'Void', tone: 'muted' };
  if (invoice.status === 'draft') return { label: 'Draft', tone: 'muted' };
  if (balancePaise <= 0) return { label: 'Paid', tone: 'paid' };
  if (invoice.status === 'overdue') {
    return { label: paidPaise > 0 ? 'Partially paid · Overdue' : 'Overdue', tone: 'overdue' };
  }
  if (paidPaise > 0) return { label: 'Partially paid', tone: 'partial' };
  return { label: 'Unpaid', tone: 'due' };
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildInvoicePrintModel(source: InvoicePrintSource): InvoicePrintModel {
  const { invoice, organization, customer, payments } = source;

  const subtotalPaise = toPaise(invoice.subtotal);
  const discountPaise = Math.max(0, toPaise(invoice.discountAmount));
  const taxPaise = toPaise(invoice.taxAmount);
  const totalPaise = toPaise(invoice.totalAmount);
  const paidPaise = toPaise(invoice.amountPaid);
  const balancePaise = Math.max(0, totalPaise - paidPaise);
  const taxablePaise = subtotalPaise - discountPaise;

  const sellerGstin = normalizeGstin(organization?.gstin);
  const buyerGstin = normalizeGstin(customer?.taxId);

  const companyName = organization?.name?.trim() || organization?.legalName?.trim() || '';
  const legalName = organization?.legalName?.trim() ?? '';
  const paymentStatus = derivePaymentStatus(invoice, paidPaise, balancePaise);

  const lines = [...(invoice.lines ?? [])]
    .sort((a, b) => a.sequence - b.sequence)
    .map((line, i) => ({
      index: i + 1,
      description: line.description,
      quantity: formatQuantity(line.quantity),
      unitPrice: formatRupees(toPaise(line.unitPrice)),
      amount: formatRupees(toPaise(line.amount)),
    }));
  const totalQuantity = (invoice.lines ?? []).reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

  const upiId = (organization?.upiId ?? '').trim();
  const canCollect = balancePaise > 0 && invoice.status !== 'void' && invoice.status !== 'draft';
  const upiPayee = legalName || companyName;
  const upi = canCollect && isValidUpiId(upiId)
    ? { id: upiId, payee: upiPayee, amount: formatRupees(balancePaise), uri: buildUpiUri(upiId, upiPayee, balancePaise, invoice.invoiceNumber) }
    : null;

  const cityLine = [customer?.city, customer?.country].map((part) => part?.trim()).filter(Boolean).join(', ');
  const addressLines = [
    ...(customer?.address ?? '').split(/\r?\n/).map((part) => part.trim()).filter(Boolean),
    ...(cityLine ? [cityLine] : []),
  ];

  const shipToCityLine = [invoice.shipToCity, invoice.shipToCountry].map((part) => part?.trim()).filter(Boolean).join(', ');
  const shipToLines = [
    ...(invoice.shipToAddress ?? '').split(/\r?\n/).map((part) => part.trim()).filter(Boolean),
    ...(shipToCityLine ? [shipToCityLine] : []),
  ];
  const shipTo = shipToLines.length > 0
    ? { name: invoice.shipToName?.trim() || customer?.name || invoice.customerName || '', addressLines: shipToLines, phone: invoice.shipToPhone?.trim() ?? '' }
    : null;

  return {
    brand: PRODUCT_BRAND,
    documentTitle: sellerGstin ? 'Tax Invoice' : 'Invoice',
    company: {
      name: companyName,
      legalName: legalName && legalName !== companyName ? legalName : '',
      gstin: sellerGstin || (organization?.gstin?.trim() ?? ''),
      taxId: organization?.taxId?.trim() ?? '',
      country: organization?.country?.trim() ?? '',
    },
    customer: {
      name: customer?.name ?? invoice.customerName ?? '',
      addressLines,
      phone: customer?.phone?.trim() ?? '',
      email: customer?.email?.trim() ?? '',
      gstin: buyerGstin || (customer?.taxId?.trim() ?? ''),
    },
    shipTo,
    invoiceNumber: invoice.invoiceNumber,
    issueDate: formatInvoiceDate(invoice.issueDate),
    dueDate: formatInvoiceDate(invoice.dueDate),
    placeOfSupply: buyerGstin ? `${GST_STATES[buyerGstin.slice(0, 2)] ?? ''} (${buyerGstin.slice(0, 2)})`.trim() : '',
    lines,
    totalQuantity: formatQuantity(String(totalQuantity)),
    subtotal: formatRupees(subtotalPaise),
    discount: discountPaise > 0 ? `-${formatRupees(discountPaise)}` : '',
    taxableAmount: formatRupees(taxablePaise),
    taxRows: buildTaxRows(taxPaise, taxablePaise, sellerGstin, buyerGstin),
    taxTotal: formatRupees(taxPaise),
    grandTotal: formatRupees(totalPaise),
    amountInWords: rupeesInWords(totalPaise),
    amountPaid: formatRupees(paidPaise),
    balanceDue: formatRupees(balancePaise),
    hasBalance: balancePaise > 0,
    paymentStatus,
    payments: [...payments]
      .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate) || a.id - b.id)
      .map((payment) => ({
        date: formatInvoiceDate(payment.paymentDate),
        method: PAYMENT_METHOD_LABELS[payment.method] ?? payment.method,
        reference: payment.reference?.trim() ?? '',
        amount: formatRupees(toPaise(payment.amount)),
      })),
    upi,
    notes: invoice.notes?.trim() ?? '',
  };
}

/** File-system safe base name for exports, e.g. "INV-0042". */
export function invoiceFileName(invoiceNumber: string): string {
  return invoiceNumber.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'invoice';
}
