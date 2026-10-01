/**
 * Renders an invoice print model as a complete, self-contained HTML document
 * for one of the supported print formats. The same document is shown in the
 * preview and sent to the browser's print dialog, so what is previewed is what
 * prints. Page size and orientation come from CSS `@page`.
 */
import { encodeQr, qrToSvg } from './qr';
import {
  INVOICE_PRINT_FORMAT_SPECS,
  type InvoicePrintFormat,
  type InvoicePrintModel,
} from './model';

const CSS_PX_PER_MM = 96 / 25.4;
/** Fallback page length for receipt paper until the content has been measured. */
const THERMAL_FALLBACK_HEIGHT_MM = 297;
export const THERMAL_PAGE_STYLE_ID = 'invoice-thermal-page-size';

export function mmToPx(mm: number): number {
  return mm * CSS_PX_PER_MM;
}

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character
  ));
}

function qrSvg(model: InvoicePrintModel): string {
  if (!model.upi) return '';
  try {
    return qrToSvg(encodeQr(model.upi.uri));
  } catch {
    return ''; // payload too long for a QR code — the UPI ID is still printed as text
  }
}

/** `@page` rule for a receipt whose content is `contentHeightPx` tall, so it prints as one continuous page. */
export function thermalPageRule(contentHeightPx: number): string {
  const heightMm = Math.max(40, Math.ceil(contentHeightPx / CSS_PX_PER_MM) + 4);
  return `@page { size: 80mm ${heightMm}mm; margin: 0; }`;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html { background: #fff; -webkit-text-size-adjust: 100%; }
  body {
    margin: 0; color: #172033; background: #fff;
    font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr, .keep { break-inside: avoid; page-break-inside: avoid; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .wrap { white-space: pre-wrap; overflow-wrap: anywhere; }
`;

// ── A4 portrait / A5 landscape ────────────────────────────────────────────────

function sheetCss(format: 'a4' | 'a5', model: InvoicePrintModel): string {
  const spec = INVOICE_PRINT_FORMAT_SPECS[format];
  const a5 = format === 'a5';
  const size = a5 ? 'A5 landscape' : 'A4 portrait';
  const footerText = `${model.invoiceNumber} · ${model.brand}`.replace(/["\\\n\r]/g, ' ');
  return `
  @page {
    size: ${size}; margin: ${spec.marginMm}mm;
    @bottom-left { content: "${footerText}"; font: 7pt "Segoe UI", Arial, sans-serif; color: #64748b; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7pt "Segoe UI", Arial, sans-serif; color: #64748b; }
  }
  ${BASE_CSS}
  body { font-size: ${a5 ? '8pt' : '9.5pt'}; line-height: ${a5 ? '1.3' : '1.4'}; }
  @media screen { body { width: ${spec.widthMm}mm; padding: ${spec.marginMm}mm; } }
  .label { color: #64748b; font-size: ${a5 ? '6.5pt' : '7.5pt'}; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  .muted { color: #475569; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; padding-bottom: ${a5 ? '2mm' : '5mm'}; border-bottom: 0.7mm solid #2563eb; }
  .company { font-size: ${a5 ? '13pt' : '17pt'}; font-weight: 800; line-height: 1.15; color: #172033; overflow-wrap: anywhere; }
  .seller { min-width: 0; }
  .inline { display: flex; flex-wrap: wrap; column-gap: 4mm; }
  .doc { text-align: right; flex-shrink: 0; }
  .doc-title { color: #2563eb; font-size: ${a5 ? '11pt' : '15pt'}; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; line-height: 1.15; }
  .doc-no { font-size: ${a5 ? '10pt' : '12pt'}; font-weight: 700; margin-top: 0.6mm; }
  .status { display: inline-block; margin-top: 1.2mm; padding: 0.5mm 2.4mm; border: 0.3mm solid currentColor; border-radius: 1mm; font-size: ${a5 ? '6.5pt' : '7.5pt'}; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  .tone-paid { color: #047857; } .tone-partial { color: #b45309; } .tone-due { color: #1d4ed8; }
  .tone-overdue { color: #b91c1c; } .tone-muted { color: #64748b; }
  .parties { display: flex; justify-content: space-between; align-items: flex-start; gap: ${a5 ? '6mm' : '8mm'}; padding: ${a5 ? '2mm 0' : '5mm 0'}; }
  .party { min-width: 0; flex: 1; }
  .party-name { font-size: ${a5 ? '9.5pt' : '11.5pt'}; font-weight: 700; margin-top: 0.6mm; overflow-wrap: anywhere; }
  .meta { flex-shrink: 0; min-width: ${a5 ? '58mm' : '64mm'}; }
  .meta table td { padding: 0.5mm 0; vertical-align: top; }
  .meta table td:last-child { text-align: right; font-weight: 600; padding-left: 4mm; }
  .items th { padding: ${a5 ? '1.3mm 2mm' : '2.2mm 2.5mm'}; color: #fff; background: #172033; font-size: ${a5 ? '6.5pt' : '7.5pt'}; letter-spacing: .06em; text-align: left; text-transform: uppercase; }
  .items th.num { text-align: right; }
  .items td { padding: ${a5 ? '0.9mm 2mm' : '2.2mm 2.5mm'}; border-bottom: 0.2mm solid #e2e8f0; vertical-align: top; }
  .items .idx { width: ${a5 ? '7mm' : '9mm'}; color: #64748b; }
  .items .qty { width: ${a5 ? '20mm' : '22mm'}; } .items .rate { width: ${a5 ? '30mm' : '32mm'}; } .items .amt { width: ${a5 ? '32mm' : '36mm'}; }
  .summary { display: flex; justify-content: space-between; align-items: flex-start; gap: ${a5 ? '5mm' : '8mm'}; padding-top: ${a5 ? '2mm' : '4mm'}; }
  .summary-left { flex: 1; min-width: 0; }
  .summary-left > * + * { margin-top: ${a5 ? '2mm' : '3.5mm'}; }
  .totals { flex-shrink: 0; width: ${a5 ? '66mm' : '76mm'}; }
  .totals td { padding: ${a5 ? '0.35mm 0' : '1.1mm 0'}; }
  .totals .grand td { border-top: 0.5mm solid #172033; padding-top: ${a5 ? '1.2mm' : '2mm'}; font-size: ${a5 ? '10.5pt' : '12.5pt'}; font-weight: 800; }
  .totals .rule td { border-top: 0.2mm solid #cbd5e1; }
  .totals .balance td { color: #1d4ed8; font-weight: 700; }
  .words { font-weight: 600; }
  .received td { padding: 0.5mm 3mm 0.5mm 0; }
  .received td:last-child { padding-right: 0; }
  .received .nowrap { white-space: nowrap; }
  .notes { padding: ${a5 ? '1.5mm 2.5mm' : '2.5mm 3.5mm'}; background: #f8fafc; border-left: 0.7mm solid #cbd5e1; }
  .pay { display: flex; align-items: center; gap: ${a5 ? '2.5mm' : '4mm'}; flex-shrink: 0; ${a5 ? '' : 'margin-top: 5mm; padding: 3mm; border: 0.2mm solid #cbd5e1; border-radius: 1.5mm;'} }
  .pay svg { width: ${a5 ? '21mm' : '30mm'}; height: ${a5 ? '21mm' : '30mm'}; flex-shrink: 0; display: block; }
  .pay-amount { font-size: ${a5 ? '9.5pt' : '12pt'}; font-weight: 800; }
  .pay-text { min-width: 0; overflow-wrap: anywhere; ${a5 ? 'max-width: 38mm;' : ''} }
  .foot { margin-top: ${a5 ? '1.5mm' : '8mm'}; padding-top: ${a5 ? '1mm' : '3mm'}; border-top: 0.2mm solid #e2e8f0; color: #64748b; font-size: ${a5 ? '6.5pt' : '7.5pt'}; display: flex; justify-content: space-between; gap: 6mm; }
  .foot strong { color: #2563eb; }
  `;
}

function sheetBody(format: 'a4' | 'a5', model: InvoicePrintModel): string {
  const a5 = format === 'a5';
  const { company, customer } = model;

  // The half-sheet runs registration details on one line to save vertical space.
  const sellerIds = [
    company.gstin && `<span><span class="label">GSTIN</span> ${esc(company.gstin)}</span>`,
    company.taxId && `<span><span class="label">Tax ID</span> ${esc(company.taxId)}</span>`,
    company.country && `<span class="muted">${esc(company.country)}</span>`,
  ].filter(Boolean);
  const sellerDetails = [
    company.legalName && `<div class="muted">${esc(company.legalName)}</div>`,
    a5 ? (sellerIds.length > 0 && `<div class="inline">${sellerIds.join('')}</div>`) : sellerIds.map((part) => `<div>${part}</div>`).join(''),
  ].filter(Boolean).join('');

  const customerDetails = [
    ...(a5
      ? (customer.addressLines.length > 0 ? [`<div class="muted wrap">${esc(customer.addressLines.join(', '))}</div>`] : [])
      : customer.addressLines.map((line) => `<div class="muted wrap">${esc(line)}</div>`)),
    (customer.phone || customer.email) && `<div class="muted wrap">${esc([customer.phone, customer.email].filter(Boolean).join(' · '))}</div>`,
    customer.gstin && `<div><span class="label">GSTIN</span> ${esc(customer.gstin)}</div>`,
  ].filter(Boolean).join('');

  const metaRows = [
    ['Invoice no.', model.invoiceNumber],
    ['Invoice date', model.issueDate],
    ['Due date', model.dueDate],
    ['Place of supply', model.placeOfSupply],
  ].filter(([, value]) => value)
    .map(([label, value]) => `<tr><td class="label">${esc(label)}</td><td>${esc(value)}</td></tr>`).join('');

  const itemRows = model.lines.map((line) => `
        <tr>
          <td class="idx">${line.index}</td>
          <td class="wrap">${esc(line.description)}</td>
          <td class="num">${esc(line.quantity)}</td>
          <td class="num">${esc(line.unitPrice)}</td>
          <td class="num">${esc(line.amount)}</td>
        </tr>`).join('');

  const totalRows = [
    `<tr><td>Subtotal</td><td class="num">${esc(model.subtotal)}</td></tr>`,
    model.discount && `<tr><td>Discount</td><td class="num">${esc(model.discount)}</td></tr>`,
    model.discount && model.taxRows.length > 0 && `<tr class="rule"><td>Taxable amount</td><td class="num">${esc(model.taxableAmount)}</td></tr>`,
    ...model.taxRows.map((row) => `<tr><td>${esc(row.label)}</td><td class="num">${esc(row.amount)}</td></tr>`),
    `<tr class="grand"><td>Grand total</td><td class="num">${esc(model.grandTotal)}</td></tr>`,
    `<tr><td>Amount paid</td><td class="num">${esc(model.amountPaid)}</td></tr>`,
    `<tr class="balance"><td>Balance due</td><td class="num">${esc(model.balanceDue)}</td></tr>`,
  ].filter(Boolean).join('');

  const received = model.payments.length > 0 ? `
        <div class="keep">
          <div class="label">Payments received</div>
          <table class="received">${model.payments.map((payment) => `
            <tr><td class="nowrap">${esc(payment.date)}</td><td class="nowrap">${esc(payment.method)}</td><td class="wrap">${esc(payment.reference)}</td><td class="num">${esc(payment.amount)}</td></tr>`).join('')}
          </table>
        </div>` : '';

  const notes = model.notes ? `
        <div class="notes keep"><div class="label">Notes &amp; terms</div><div class="wrap">${esc(model.notes)}</div></div>` : '';

  const qr = qrSvg(model);
  const pay = model.upi ? `
      <div class="pay keep">
        ${qr}
        <div class="pay-text">
          <div class="label">Scan to pay with any UPI app</div>
          <div class="pay-amount">${esc(model.upi.amount)}</div>
          <div class="muted">UPI ID: ${esc(model.upi.id)}</div>
          ${a5 ? '' : `<div class="muted">Payee: ${esc(model.upi.payee)}</div>`}
        </div>
      </div>` : '';

  return `
    <header class="head">
      <div class="seller">
        <div class="company">${esc(company.name)}</div>
        ${sellerDetails}
      </div>
      <div class="doc">
        <div class="doc-title">${esc(model.documentTitle)}</div>
        <div class="doc-no">${esc(model.invoiceNumber)}</div>
        <div class="status tone-${model.paymentStatus.tone}">${esc(model.paymentStatus.label)}</div>
      </div>
    </header>

    <section class="parties">
      <div class="party">
        <div class="label">Bill to</div>
        <div class="party-name">${esc(customer.name)}</div>
        ${customerDetails}
      </div>
      ${a5 ? pay : ''}
      <div class="meta"><table>${metaRows}</table></div>
    </section>

    <table class="items">
      <thead>
        <tr><th class="idx">#</th><th>Description</th><th class="num qty">Qty</th><th class="num rate">Rate</th><th class="num amt">Amount</th></tr>
      </thead>
      <tbody>${itemRows}
      </tbody>
    </table>

    <section class="summary">
      <div class="summary-left">
        <div class="keep"><div class="label">Amount in words</div><div class="words">${esc(model.amountInWords)}</div></div>${received}${notes}
      </div>
      <table class="totals keep">${totalRows}</table>
    </section>
    ${a5 ? '' : pay}

    <footer class="foot keep">
      <span>This is a computer-generated invoice.</span>
      <span>Generated with <strong>${esc(model.brand)}</strong></span>
    </footer>`;
}

// ── 80mm thermal receipt ──────────────────────────────────────────────────────

function thermalCss(): string {
  return `
  @page { size: 80mm ${THERMAL_FALLBACK_HEIGHT_MM}mm; margin: 0; }
  ${BASE_CSS}
  body { width: 80mm; padding: 3mm 4mm 4mm; color: #000; font-size: 9pt; line-height: 1.3; }
  .c { text-align: center; }
  .b { font-weight: 700; }
  .company { font-size: 13pt; font-weight: 800; line-height: 1.15; overflow-wrap: anywhere; }
  .title { font-size: 10pt; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
  .rule { border: 0; border-top: 0.3mm dashed #000; margin: 1.6mm 0; }
  .rule.solid { border-top-style: solid; }
  .kv td { padding: 0.2mm 0; vertical-align: top; }
  .kv td:first-child { white-space: nowrap; padding-right: 2mm; }
  .kv td:last-child { text-align: right; overflow-wrap: anywhere; }
  .kv.amounts td:first-child { white-space: normal; overflow-wrap: anywhere; }
  .kv.amounts td:last-child { white-space: nowrap; overflow-wrap: normal; }
  .cols { display: flex; justify-content: space-between; gap: 2mm; font-size: 8pt; font-weight: 700; text-transform: uppercase; }
  .item { padding: 0.7mm 0; break-inside: avoid; page-break-inside: avoid; }
  .item-row { display: flex; justify-content: space-between; gap: 2mm; }
  .item-row span:last-child { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .grand td { font-size: 12pt; font-weight: 800; padding: 0.6mm 0; }
  .status { margin-top: 1.2mm; padding: 0.8mm 0; border: 0.3mm solid #000; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  .qr { margin: 1mm auto 0; width: 38mm; }
  .qr svg { display: block; width: 38mm; height: 38mm; }
  .small { font-size: 8pt; }
  `;
}

function thermalBody(model: InvoicePrintModel): string {
  const { company, customer } = model;
  const kv = (rows: Array<[string, string]>, className = 'kv') => `<table class="${className}">${rows
    .filter(([, value]) => value)
    .map(([label, value]) => `<tr><td>${esc(label)}</td><td>${esc(value)}</td></tr>`).join('')}</table>`;

  const items = model.lines.map((line) => `
    <div class="item">
      <div class="wrap">${esc(line.description)}</div>
      <div class="item-row"><span>${esc(line.quantity)} × ${esc(line.unitPrice)}</span><span>${esc(line.amount)}</span></div>
    </div>`).join('');

  const totals: Array<[string, string]> = [
    ['Subtotal', model.subtotal],
    ['Discount', model.discount],
    ...(model.discount && model.taxRows.length > 0 ? [['Taxable amount', model.taxableAmount] as [string, string]] : []),
    ...model.taxRows.map((row) => [row.label, row.amount] as [string, string]),
  ];

  const payments = model.payments.length > 0 ? `
    <hr class="rule">
    <div class="b small">PAYMENTS RECEIVED</div>
    ${kv(model.payments.map((payment) => [
      [payment.date, payment.method, payment.reference].filter(Boolean).join(' · '),
      payment.amount,
    ] as [string, string]), 'kv small amounts')}` : '';

  const qr = qrSvg(model);
  const pay = model.upi ? `
    <hr class="rule">
    <div class="keep c">
      <div class="b">SCAN TO PAY ${esc(model.upi.amount)}</div>
      ${qr ? `<div class="qr">${qr}</div>` : ''}
      <div class="small wrap">UPI: ${esc(model.upi.id)}</div>
    </div>` : '';

  const notes = model.notes ? `
    <hr class="rule">
    <div class="keep small"><span class="b">Notes:</span> <span class="wrap">${esc(model.notes)}</span></div>` : '';

  return `
    <div class="c">
      <div class="company">${esc(company.name)}</div>
      ${company.legalName ? `<div class="small">${esc(company.legalName)}</div>` : ''}
      ${company.gstin ? `<div class="small">GSTIN: ${esc(company.gstin)}</div>` : ''}
      ${!company.gstin && company.taxId ? `<div class="small">Tax ID: ${esc(company.taxId)}</div>` : ''}
    </div>
    <hr class="rule">
    <div class="c title">${esc(model.documentTitle)}</div>
    <hr class="rule">
    ${kv([
      ['Invoice no.', model.invoiceNumber],
      ['Date', model.issueDate],
      ['Due', model.dueDate],
      ['Customer', customer.name],
      ['Phone', customer.phone],
      ['GSTIN', customer.gstin],
      ['Place of supply', model.placeOfSupply],
    ])}
    <hr class="rule">
    <div class="cols"><span>Item / Qty × Rate</span><span>Amount</span></div>
    <hr class="rule">
    ${items}
    <hr class="rule">
    ${kv([['Items', String(model.lines.length)], ['Total qty', model.totalQuantity]], 'kv small')}
    ${kv(totals)}
    <hr class="rule solid">
    <table class="kv grand"><tr><td>TOTAL</td><td>${esc(model.grandTotal)}</td></tr></table>
    <hr class="rule solid">
    ${kv([['Amount paid', model.amountPaid], ['Balance due', model.balanceDue]])}
    <div class="c status">${esc(model.paymentStatus.label)}</div>${payments}${pay}${notes}
    <hr class="rule">
    <div class="c small">
      <div>Thank you for your business!</div>
      <div>Generated with <span class="b">${esc(model.brand)}</span></div>
    </div>`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function renderInvoiceDocument(model: InvoicePrintModel, format: InvoicePrintFormat): string {
  const css = format === 'thermal80' ? thermalCss() : sheetCss(format, model);
  const body = format === 'thermal80' ? thermalBody(model) : sheetBody(format, model);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(model.invoiceNumber)} · ${esc(model.brand)}</title>
<style>${css}</style>
<style id="${THERMAL_PAGE_STYLE_ID}"></style>
</head>
<body class="invoice-${format}">${body}
</body>
</html>`;
}
