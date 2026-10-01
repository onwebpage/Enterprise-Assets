/**
 * PDF export of an invoice in the selected print format:
 *   A4 portrait, A5 landscape, or an 80mm-wide receipt page sized to its content.
 *
 * Renders from the same InvoicePrintModel as the HTML print layouts. jsPDF and
 * the embedded font are loaded on demand so they stay out of the main bundle.
 */
import type { jsPDF as JsPdf } from 'jspdf';
import { encodeQr } from './qr';
import { invoiceFileName, type InvoicePrintFormat, type InvoicePrintModel, type PaymentStatusTone } from './model';
import { saveFileNatively } from '@/lib/native';
import { getBrandLogoDataUrl } from '@/lib/brand-logo';

type Rgb = [number, number, number];

const INK: Rgb = [23, 32, 51];
const MUTED: Rgb = [71, 85, 105];
const LABEL: Rgb = [100, 116, 139];
const ACCENT: Rgb = [37, 99, 235];
const RULE: Rgb = [226, 232, 240];
const BLACK: Rgb = [0, 0, 0];
const TONE_COLORS: Record<PaymentStatusTone, Rgb> = {
  paid: [4, 120, 87], partial: [180, 83, 9], due: [29, 78, 216], overdue: [185, 28, 28], muted: [100, 116, 139],
};

const PT_TO_MM = 25.4 / 72;
/** jsPDF rejects pages longer than 14400pt (5080mm). */
const MAX_RECEIPT_HEIGHT_MM = 5000;

interface TextOptions {
  size: number;
  bold?: boolean;
  color?: Rgb;
  align?: 'left' | 'right' | 'center';
}

/** Thin drawing helper: positions are in mm and `y` is always the top of the text line. */
class Pen {
  constructor(readonly doc: JsPdf, private readonly family: string) {}

  lineHeight(size: number): number {
    return size * PT_TO_MM * 1.32;
  }

  private apply(options: TextOptions) {
    this.doc.setFont(this.family, options.bold ? 'bold' : 'normal');
    this.doc.setFontSize(options.size);
    const [r, g, b] = options.color ?? INK;
    this.doc.setTextColor(r, g, b);
  }

  /** Wrap text to `width` mm, honouring explicit line breaks. */
  wrap(text: string, width: number, options: TextOptions): string[] {
    this.apply(options);
    return text.split(/\r?\n/).flatMap((paragraph) => {
      const lines = this.doc.splitTextToSize(paragraph || ' ', width) as string[];
      return lines.length > 0 ? lines : [' '];
    });
  }

  width(text: string, options: TextOptions): number {
    this.apply(options);
    return this.doc.getTextWidth(text);
  }

  /** Draw one or more lines; returns the y below the last line. */
  text(lines: string | string[], x: number, y: number, options: TextOptions): number {
    this.apply(options);
    const list = Array.isArray(lines) ? lines : [lines];
    const height = this.lineHeight(options.size);
    const ascent = options.size * PT_TO_MM * 0.95;
    list.forEach((line, i) => {
      this.doc.text(line, x, y + ascent + i * height, { align: options.align ?? 'left' });
    });
    return y + list.length * height;
  }

  rule(x1: number, y: number, x2: number, color: Rgb = RULE, width = 0.2, dashed = false) {
    this.doc.setDrawColor(color[0], color[1], color[2]);
    this.doc.setLineWidth(width);
    this.doc.setLineDashPattern(dashed ? [0.8, 0.6] : [], 0);
    this.doc.line(x1, y, x2, y);
    this.doc.setLineDashPattern([], 0);
  }

  qr(payload: string, x: number, y: number, size: number): boolean {
    let modules: boolean[][];
    try { modules = encodeQr(payload); } catch { return false; }
    const quiet = 4;
    const cell = size / (modules.length + quiet * 2);
    this.doc.setFillColor(255, 255, 255);
    this.doc.rect(x, y, size, size, 'F');
    this.doc.setFillColor(0, 0, 0);
    modules.forEach((row, rowIndex) => {
      let column = 0;
      while (column < row.length) {
        if (!row[column]) { column++; continue; }
        let run = 1;
        while (column + run < row.length && row[column + run]) run++;
        // Slight overlap hides hairline seams between adjacent modules in PDF viewers.
        this.doc.rect(x + (column + quiet) * cell, y + (rowIndex + quiet) * cell, run * cell + 0.02, cell + 0.02, 'F');
        column += run;
      }
    });
    return true;
  }
}

// ── A4 portrait / A5 landscape ────────────────────────────────────────────────

function drawSheet(pen: Pen, model: InvoicePrintModel, format: 'a4' | 'a5', brandLogo: string) {
  const { doc } = pen;
  const a5 = format === 'a5';
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = a5 ? 8 : 12;
  const left = margin;
  const right = pageWidth - margin;
  const contentWidth = right - left;
  const bottom = pageHeight - margin - 5; // leaves room for the page footer
  const base = a5 ? 8 : 9.5;
  const labelSize = a5 ? 6.5 : 7.5;
  const gap = a5 ? 2 : 5;
  let y = margin;

  const label = (text: string, x: number, top: number, align: TextOptions['align'] = 'left') =>
    pen.text(text.toUpperCase(), x, top, { size: labelSize, bold: true, color: LABEL, align });
  const newPage = () => { doc.addPage(); y = margin; };
  const ensure = (height: number) => { if (y + height > bottom) newPage(); };

  // Header: seller on the left, document identity on the right.
  const docBlockWidth = a5 ? 58 : 66;
  let leftY = pen.text(pen.wrap(model.company.name, contentWidth - docBlockWidth, { size: a5 ? 13 : 17, bold: true }), left, y, { size: a5 ? 13 : 17, bold: true });
  if (model.company.legalName) leftY = pen.text(model.company.legalName, left, leftY, { size: base, color: MUTED });
  const sellerIds = [
    model.company.gstin && `GSTIN ${model.company.gstin}`,
    model.company.taxId && `Tax ID ${model.company.taxId}`,
    model.company.country,
  ].filter(Boolean) as string[];
  if (a5) {
    if (sellerIds.length > 0) leftY = pen.text(sellerIds.join('   '), left, leftY, { size: base });
  } else {
    for (const part of sellerIds) leftY = pen.text(part, left, leftY, { size: base });
  }

  let rightY = pen.text(model.documentTitle.toUpperCase(), right, y, { size: a5 ? 11 : 15, bold: true, color: ACCENT, align: 'right' });
  rightY = pen.text(model.invoiceNumber, right, rightY, { size: a5 ? 10 : 12, bold: true, align: 'right' });
  const statusText = model.paymentStatus.label.toUpperCase();
  const statusColor = TONE_COLORS[model.paymentStatus.tone];
  const statusWidth = pen.width(statusText, { size: labelSize, bold: true }) + 5;
  const statusHeight = pen.lineHeight(labelSize) + 1.2;
  doc.setDrawColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(right - statusWidth, rightY + 1, statusWidth, statusHeight, 0.8, 0.8, 'S');
  pen.text(statusText, right - statusWidth / 2, rightY + 1.6, { size: labelSize, bold: true, color: statusColor, align: 'center' });
  rightY += statusHeight + 1;

  y = Math.max(leftY, rightY) + gap;
  pen.rule(left, y, right, ACCENT, 0.7);
  y += gap;

  // Parties: bill-to on the left, invoice meta on the right (A5 puts the pay QR between them).
  const metaWidth = a5 ? 58 : 64;
  const metaLeft = right - metaWidth;
  const metaRows = [
    ['Invoice no.', model.invoiceNumber], ['Invoice date', model.issueDate],
    ['Due date', model.dueDate], ['Place of supply', model.placeOfSupply],
  ].filter(([, value]) => value);
  let metaY = y;
  for (const [name, value] of metaRows) {
    label(name, metaLeft, metaY + 0.4);
    metaY = pen.text(value, right, metaY, { size: base, bold: true, align: 'right' }) + 0.6;
  }

  const qrSize = 21;
  const showA5Pay = a5 && !!model.upi;
  const payBlockWidth = showA5Pay ? qrSize + 34 : 0;
  const partiesWidth = metaLeft - left - (showA5Pay ? payBlockWidth + 8 : 6);
  // A4 gives Ship To its own column beside Bill To; the half-sheet prints it as one line under Bill To.
  const shipToColumn = !a5 && !!model.shipTo;
  const billWidth = shipToColumn ? (partiesWidth - 6) / 2 : partiesWidth;
  let billY = label('Bill to', left, y) + 0.4;
  billY = pen.text(pen.wrap(model.customer.name, billWidth, { size: a5 ? 9.5 : 11.5, bold: true }), left, billY, { size: a5 ? 9.5 : 11.5, bold: true });
  const customerLines = a5
    ? (model.customer.addressLines.length > 0 ? [model.customer.addressLines.join(', ')] : [])
    : model.customer.addressLines;
  const contact = [model.customer.phone, model.customer.email].filter(Boolean).join(' · ');
  for (const line of [...customerLines, contact].filter(Boolean)) {
    billY = pen.text(pen.wrap(line, billWidth, { size: base }), left, billY, { size: base, color: MUTED });
  }
  if (model.customer.gstin) billY = pen.text(`GSTIN ${model.customer.gstin}`, left, billY, { size: base });

  if (model.shipTo && shipToColumn) {
    const shipLeft = left + billWidth + 6;
    let shipY = label('Ship to', shipLeft, y) + 0.4;
    shipY = pen.text(pen.wrap(model.shipTo.name, billWidth, { size: 11.5, bold: true }), shipLeft, shipY, { size: 11.5, bold: true });
    for (const line of [...model.shipTo.addressLines, model.shipTo.phone].filter(Boolean)) {
      shipY = pen.text(pen.wrap(line, billWidth, { size: base }), shipLeft, shipY, { size: base, color: MUTED });
    }
    billY = Math.max(billY, shipY);
  } else if (model.shipTo) {
    const shipLine = ['Ship to:', [model.shipTo.name, ...model.shipTo.addressLines, model.shipTo.phone].filter(Boolean).join(', ')].join(' ');
    billY = pen.text(pen.wrap(shipLine, billWidth, { size: base }), left, billY, { size: base });
  }

  let payY = y;
  if (showA5Pay && model.upi) {
    const payLeft = metaLeft - 4 - payBlockWidth;
    const drawn = pen.qr(model.upi.uri, payLeft, y, qrSize);
    const textLeft = drawn ? payLeft + qrSize + 2.5 : payLeft;
    let textY = pen.text(pen.wrap('SCAN TO PAY WITH ANY UPI APP', 30, { size: labelSize, bold: true }), textLeft, y, { size: labelSize, bold: true, color: LABEL });
    textY = pen.text(model.upi.amount, textLeft, textY, { size: 9.5, bold: true });
    textY = pen.text(pen.wrap(`UPI ID: ${model.upi.id}`, 30, { size: base }), textLeft, textY, { size: base, color: MUTED });
    payY = Math.max(textY, drawn ? y + qrSize : textY);
  }

  y = Math.max(billY, metaY, payY) + gap;

  // Items table.
  const padX = a5 ? 2 : 2.5;
  const padY = a5 ? 0.9 : 2.2;
  const indexWidth = a5 ? 7 : 9;
  const amountRight = right - padX;
  const rateRight = right - (a5 ? 32 : 36) - padX;
  const quantityRight = rateRight - (a5 ? 30 : 32);
  const descriptionLeft = left + indexWidth;
  const descriptionWidth = quantityRight - (a5 ? 20 : 22) - descriptionLeft;
  const headerHeight = pen.lineHeight(labelSize) + padY * 2;

  const drawTableHeader = () => {
    doc.setFillColor(INK[0], INK[1], INK[2]);
    doc.rect(left, y, contentWidth, headerHeight, 'F');
    const white: Rgb = [255, 255, 255];
    const options = { size: labelSize, bold: true, color: white };
    pen.text('#', left + padX, y + padY, options);
    pen.text('DESCRIPTION', descriptionLeft, y + padY, options);
    pen.text('QTY', quantityRight, y + padY, { ...options, align: 'right' });
    pen.text('RATE', rateRight, y + padY, { ...options, align: 'right' });
    pen.text('AMOUNT', amountRight, y + padY, { ...options, align: 'right' });
    y += headerHeight;
  };

  ensure(headerHeight + 12);
  drawTableHeader();
  for (const line of model.lines) {
    const description = pen.wrap(line.description, descriptionWidth, { size: base });
    const rowHeight = description.length * pen.lineHeight(base) + padY * 2;
    if (y + rowHeight > bottom) { // rows are never split across pages
      newPage();
      drawTableHeader();
    }
    pen.text(String(line.index), left + padX, y + padY, { size: base, color: LABEL });
    pen.text(description, descriptionLeft, y + padY, { size: base });
    pen.text(line.quantity, quantityRight, y + padY, { size: base, align: 'right' });
    pen.text(line.unitPrice, rateRight, y + padY, { size: base, align: 'right' });
    pen.text(line.amount, amountRight, y + padY, { size: base, align: 'right' });
    y += rowHeight;
    pen.rule(left, y, right);
  }
  y += a5 ? 2 : 4;

  // Summary: words / payments / notes on the left, totals on the right.
  const totalsWidth = a5 ? 66 : 76;
  const totalsLeft = right - totalsWidth;
  const summaryWidth = contentWidth - totalsWidth - (a5 ? 5 : 8);
  const blockGap = a5 ? 2 : 3.5;

  type TotalRow = { name: string; value: string; kind?: 'grand' | 'balance' | 'rule' };
  const totalRows: TotalRow[] = [
    { name: 'Subtotal', value: model.subtotal },
    ...(model.discount ? [{ name: 'Discount', value: model.discount }] : []),
    ...(model.discount && model.taxRows.length > 0 ? [{ name: 'Taxable amount', value: model.taxableAmount, kind: 'rule' as const }] : []),
    ...model.taxRows.map((row) => ({ name: row.label, value: row.amount })),
    { name: 'Grand total', value: model.grandTotal, kind: 'grand' },
    { name: 'Amount paid', value: model.amountPaid },
    { name: 'Balance due', value: model.balanceDue, kind: 'balance' },
  ];
  const rowGap = a5 ? 0.7 : 2.2;
  const grandSize = a5 ? 10.5 : 12.5;
  const totalsHeight = totalRows.reduce((sum, row) => sum + pen.lineHeight(row.kind === 'grand' ? grandSize : base) + rowGap + (row.kind === 'grand' ? rowGap : 0), 0);

  const words = pen.wrap(model.amountInWords, summaryWidth, { size: base, bold: true });
  const notes = model.notes ? pen.wrap(model.notes, summaryWidth - 6, { size: base }) : [];
  const leftHeight = pen.lineHeight(labelSize) + words.length * pen.lineHeight(base)
    + (model.payments.length > 0 ? blockGap + pen.lineHeight(labelSize) + model.payments.length * (pen.lineHeight(base) + 0.6) : 0)
    + (notes.length > 0 ? blockGap + pen.lineHeight(labelSize) + notes.length * pen.lineHeight(base) + 4 : 0);
  ensure(Math.min(Math.max(totalsHeight, leftHeight), bottom - margin));

  const summaryTop = y;
  let totalsY = summaryTop;
  for (const row of totalRows) {
    if (row.kind === 'grand') {
      pen.rule(totalsLeft, totalsY, right, INK, 0.5);
      totalsY += rowGap;
    } else if (row.kind === 'rule') {
      pen.rule(totalsLeft, totalsY - rowGap / 2, right, [203, 213, 225]);
    }
    const options: TextOptions = row.kind === 'grand'
      ? { size: grandSize, bold: true }
      : row.kind === 'balance' ? { size: base, bold: true, color: TONE_COLORS.due } : { size: base };
    pen.text(row.name, totalsLeft, totalsY, options);
    totalsY = pen.text(row.value, right, totalsY, { ...options, align: 'right' }) + rowGap;
  }

  let summaryY = label('Amount in words', left, summaryTop);
  summaryY = pen.text(words, left, summaryY, { size: base, bold: true });
  if (model.payments.length > 0) {
    summaryY = label('Payments received', left, summaryY + blockGap);
    for (const payment of model.payments) {
      pen.text(payment.date, left, summaryY, { size: base });
      pen.text(payment.method, left + (a5 ? 20 : 24), summaryY, { size: base });
      const referenceLeft = left + (a5 ? 44 : 50);
      const referenceWidth = summaryWidth - (referenceLeft - left) - pen.width(payment.amount, { size: base }) - 2;
      if (payment.reference) pen.text(pen.wrap(payment.reference, referenceWidth, { size: base })[0], referenceLeft, summaryY, { size: base });
      summaryY = pen.text(payment.amount, left + summaryWidth, summaryY, { size: base, align: 'right' }) + 0.6;
    }
  }
  if (notes.length > 0) {
    summaryY += blockGap;
    const boxHeight = pen.lineHeight(labelSize) + notes.length * pen.lineHeight(base) + 4;
    doc.setFillColor(248, 250, 252);
    doc.rect(left, summaryY, summaryWidth, boxHeight, 'F');
    doc.setFillColor(203, 213, 225);
    doc.rect(left, summaryY, 0.7, boxHeight, 'F');
    const notesY = label('Notes & terms', left + 3.5, summaryY + 2);
    pen.text(notes, left + 3.5, notesY, { size: base });
    summaryY += boxHeight;
  }
  y = Math.max(summaryY, totalsY);

  // A4 payment box.
  if (!a5 && model.upi) {
    const boxSize = 30;
    ensure(boxSize + 11);
    y += 5;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.roundedRect(left, y, contentWidth, boxSize + 6, 1.5, 1.5, 'S');
    const drawn = pen.qr(model.upi.uri, left + 3, y + 3, boxSize);
    const textLeft = left + (drawn ? boxSize + 7 : 4);
    let textY = label('Scan to pay with any UPI app', textLeft, y + 8);
    textY = pen.text(model.upi.amount, textLeft, textY + 0.5, { size: 12, bold: true });
    textY = pen.text(`UPI ID: ${model.upi.id}`, textLeft, textY + 0.5, { size: base, color: MUTED });
    pen.text(pen.wrap(`Payee: ${model.upi.payee}`, right - textLeft - 4, { size: base })[0], textLeft, textY, { size: base, color: MUTED });
    y += boxSize + 6;
  }

  // Closing line.
  ensure(a5 ? 6 : 14);
  y += a5 ? 1.5 : 8;
  pen.rule(left, y, right);
  y += a5 ? 1 : 3;
  pen.text('This is a computer-generated invoice.', left, y, { size: labelSize, color: LABEL });
  const brandWidth = pen.width(model.brand, { size: labelSize, bold: true });
  pen.text(model.brand, right, y, { size: labelSize, bold: true, color: ACCENT, align: 'right' });
  const logoSize = brandLogo ? (a5 ? 3.4 : 4) : 0;
  if (brandLogo) {
    try {
      doc.addImage(brandLogo, 'PNG', right - brandWidth - logoSize - 1, y - (logoSize - pen.lineHeight(labelSize)) / 2, logoSize, logoSize);
    } catch { /* the PDF is still valid without the logo */ }
  }
  pen.text('Generated with ', right - brandWidth - (brandLogo ? logoSize + 2 : 0), y, { size: labelSize, color: LABEL, align: 'right' });

  // Page footer on every page.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const footerY = pageHeight - margin + (a5 ? 1.5 : 3);
    pen.text(`${model.invoiceNumber} · ${model.brand}`, left, footerY, { size: 7, color: LABEL });
    pen.text(`Page ${page} of ${pages}`, right, footerY, { size: 7, color: LABEL, align: 'right' });
  }
}

// ── 80mm thermal receipt ──────────────────────────────────────────────────────

/**
 * Draws the receipt and returns the y where the content ends. With
 * `allowPageBreaks` off the content is drawn as one continuous page.
 */
function drawReceipt(pen: Pen, model: InvoicePrintModel, allowPageBreaks: boolean): number {
  const { doc } = pen;
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 4;
  const right = 76;
  const width = right - left;
  const center = 40;
  const base = 9;
  const small = 8;
  let y = 3;

  const ensure = (height: number) => {
    if (allowPageBreaks && y + height > pageHeight - 4) { doc.addPage(); y = 3; }
  };
  const rule = (solid = false) => { y += 1.6; pen.rule(left, y, right, BLACK, 0.3, !solid); y += 1.6; };
  const centered = (text: string, options: TextOptions) => {
    const lines = pen.wrap(text, width, options);
    ensure(lines.length * pen.lineHeight(options.size));
    y = pen.text(lines, center, y, { ...options, color: BLACK, align: 'center' });
  };
  /** Label on the left, value right-aligned; whichever side is long wraps. */
  const pair = (name: string, value: string, options: TextOptions = { size: base }, wrapName = false) => {
    if (!value) return;
    const style = { ...options, color: BLACK };
    if (wrapName) {
      const valueWidth = pen.width(value, style);
      const lines = pen.wrap(name, width - valueWidth - 2, style);
      ensure(lines.length * pen.lineHeight(style.size));
      pen.text(value, right, y, { ...style, align: 'right' });
      y = pen.text(lines, left, y, style) + 0.3;
      return;
    }
    const nameWidth = pen.width(name, style);
    const lines = pen.wrap(value, width - nameWidth - 2, style);
    ensure(lines.length * pen.lineHeight(style.size));
    pen.text(name, left, y, style);
    y = pen.text(lines, right, y, { ...style, align: 'right' }) + 0.3;
  };

  centered(model.company.name, { size: 13, bold: true });
  if (model.company.legalName) centered(model.company.legalName, { size: small });
  if (model.company.gstin) centered(`GSTIN: ${model.company.gstin}`, { size: small });
  else if (model.company.taxId) centered(`Tax ID: ${model.company.taxId}`, { size: small });
  rule();
  centered(model.documentTitle.toUpperCase(), { size: 10, bold: true });
  rule();
  pair('Invoice no.', model.invoiceNumber);
  pair('Date', model.issueDate);
  pair('Due', model.dueDate);
  pair('Customer', model.customer.name);
  pair('Phone', model.customer.phone);
  pair('GSTIN', model.customer.gstin);
  pair('Place of supply', model.placeOfSupply);
  if (model.shipTo) pair('Ship to', [model.shipTo.name, ...model.shipTo.addressLines, model.shipTo.phone].filter(Boolean).join(', '));
  rule();
  pen.text('ITEM / QTY × RATE', left, y, { size: small, bold: true, color: BLACK });
  y = pen.text('AMOUNT', right, y, { size: small, bold: true, color: BLACK, align: 'right' });
  rule();

  for (const line of model.lines) {
    const description = pen.wrap(line.description, width, { size: base });
    ensure((description.length + 1) * pen.lineHeight(base) + 1.4); // keep an item together
    y = pen.text(description, left, y + 0.7, { size: base, color: BLACK });
    pen.text(`${line.quantity} × ${line.unitPrice}`, left, y, { size: base, color: BLACK });
    y = pen.text(line.amount, right, y, { size: base, color: BLACK, align: 'right' }) + 0.7;
  }

  rule();
  pair('Items', String(model.lines.length), { size: small });
  pair('Total qty', model.totalQuantity, { size: small });
  pair('Subtotal', model.subtotal);
  pair('Discount', model.discount);
  if (model.discount && model.taxRows.length > 0) pair('Taxable amount', model.taxableAmount);
  for (const row of model.taxRows) pair(row.label, row.amount);
  ensure(24);
  rule(true);
  pair('TOTAL', model.grandTotal, { size: 12, bold: true });
  rule(true);
  pair('Amount paid', model.amountPaid);
  pair('Balance due', model.balanceDue);

  const statusHeight = pen.lineHeight(base) + 1.6;
  ensure(statusHeight + 2);
  y += 1.2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(left, y, width, statusHeight, 'S');
  pen.text(model.paymentStatus.label.toUpperCase(), center, y + 0.8, { size: base, bold: true, color: BLACK, align: 'center' });
  y += statusHeight;

  if (model.payments.length > 0) {
    rule();
    y = pen.text('PAYMENTS RECEIVED', left, y, { size: small, bold: true, color: BLACK });
    for (const payment of model.payments) {
      pair([payment.date, payment.method, payment.reference].filter(Boolean).join(' · '), payment.amount, { size: small }, true);
    }
  }

  if (model.upi) {
    const qrSize = 38;
    ensure(qrSize + 16);
    rule();
    centered(`SCAN TO PAY ${model.upi.amount}`, { size: base, bold: true });
    if (pen.qr(model.upi.uri, center - qrSize / 2, y + 1, qrSize)) y += qrSize + 1;
    centered(`UPI: ${model.upi.id}`, { size: small });
  }

  if (model.notes) {
    const lines = pen.wrap(`Notes: ${model.notes}`, width, { size: small });
    ensure(lines.length * pen.lineHeight(small) + 4);
    rule();
    y = pen.text(lines, left, y, { size: small, color: BLACK });
  }

  ensure(14);
  rule();
  centered('Thank you for your business!', { size: small });
  centered(`Generated with ${model.brand}`, { size: small, bold: true });
  return y + 4;
}

// ── Entry points ──────────────────────────────────────────────────────────────

export async function createInvoicePdf(model: InvoicePrintModel, format: InvoicePrintFormat): Promise<Blob> {
  const [{ jsPDF }, fonts, brandLogo] = await Promise.all([import('jspdf'), import('./pdf-fonts'), getBrandLogoDataUrl()]);

  const create = (pageFormat: string | [number, number], orientation: 'portrait' | 'landscape') => {
    const doc = new jsPDF({ unit: 'mm', format: pageFormat, orientation });
    doc.addFileToVFS('InvoiceSans-Regular.ttf', fonts.INVOICE_PDF_FONT_REGULAR);
    doc.addFont('InvoiceSans-Regular.ttf', fonts.INVOICE_PDF_FONT_FAMILY, 'normal');
    doc.addFileToVFS('InvoiceSans-Bold.ttf', fonts.INVOICE_PDF_FONT_BOLD);
    doc.addFont('InvoiceSans-Bold.ttf', fonts.INVOICE_PDF_FONT_FAMILY, 'bold');
    doc.setProperties({ title: `${model.invoiceNumber} · ${model.brand}`, creator: model.brand });
    return doc;
  };

  if (format === 'thermal80') {
    // First pass measures the receipt; the second draws it on a page of exactly that length.
    const draft = create([80, MAX_RECEIPT_HEIGHT_MM], 'portrait');
    const measured = drawReceipt(new Pen(draft, fonts.INVOICE_PDF_FONT_FAMILY), model, true);
    // A receipt longer than the maximum PDF page keeps the paginated draft.
    if (draft.getNumberOfPages() > 1) return draft.output('blob');
    const doc = create([80, Math.max(40, Math.ceil(measured))], 'portrait');
    drawReceipt(new Pen(doc, fonts.INVOICE_PDF_FONT_FAMILY), model, false);
    return doc.output('blob');
  }

  const doc = create(format, format === 'a5' ? 'landscape' : 'portrait');
  drawSheet(new Pen(doc, fonts.INVOICE_PDF_FONT_FAMILY), model, format, brandLogo);
  return doc.output('blob');
}

const PDF_SUFFIX: Record<InvoicePrintFormat, string> = { a4: 'A4', a5: 'A5', thermal80: '80mm' };

export async function downloadInvoicePdf(model: InvoicePrintModel, format: InvoicePrintFormat): Promise<void> {
  const blob = await createInvoicePdf(model, format);
  const filename = `${invoiceFileName(model.invoiceNumber)}-${PDF_SUFFIX[format]}.pdf`;
  // Android app: WebViews ignore download links, so hand the PDF to the share/save sheet.
  if (await saveFileNatively(blob, filename)) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
