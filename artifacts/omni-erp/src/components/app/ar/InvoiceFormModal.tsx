import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Trash2, Search, ChevronDown, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/currency';
import {
  AR_INVOICE_STATUSES, useARCustomer, useARCustomers,
  type ARCustomer, type ARInvoice, type ARInvoiceFormValues, type ARInvoiceStatus,
} from '@/hooks/useAccountsReceivable';

// ── Validation ────────────────────────────────────────────────────────────────

const lineSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(500, 'Max 500 characters'),
  quantity:    z.string()
    .regex(/^\d+(\.\d{1,4})?$/, 'Enter a quantity, e.g. 1 or 2.5')
    .refine((value) => parseFloat(value) > 0, 'Quantity must be more than 0'),
  unitPrice:   z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a price, e.g. 1500 or 1500.50'),
  sequence:    z.number().int().optional(),
});

const schema = z.object({
  customerId:    z.number().int().positive('Select a customer to bill'),
  invoiceNumber: z.string().max(50).optional().or(z.literal('')),
  issueDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Required'),
  dueDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Required'),
  status:        z.enum(AR_INVOICE_STATUSES as unknown as [string, ...string[]]).optional(),
  discountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valid amount').optional(),
  taxAmount:     z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valid amount').optional(),
  notes:         z.string().max(1000).nullable().optional(),
  lines:         z.array(lineSchema).min(1, 'Add at least one line item'),
}).refine((values) => {
  const subtotal = values.lines.reduce((sum, l) => sum + lineAmount(l.quantity, l.unitPrice), 0);
  return parseFloat(values.discountAmount || '0') <= subtotal + 0.005;
}, { message: 'Discount cannot exceed the subtotal', path: ['discountAmount'] });

type FormValues = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Amount = Quantity × Unit Price, rounded to paise. Unparseable input counts as 0. */
function lineAmount(quantity: string | undefined, unitPrice: string | undefined): number {
  const amount = (parseFloat(quantity || '0') || 0) * (parseFloat(unitPrice || '0') || 0);
  return Math.round(amount * 100) / 100;
}

/** Keep only digits and a single decimal point, limited to `decimals` places ("1,500.5" → "1500.5"). */
function sanitizeDecimal(value: string, decimals: number): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole;
  return `${whole || '0'}.${rest.join('').slice(0, decimals)}`;
}

/** "2.0000" (as stored) → "2" for editing. */
function trimNumber(value: string): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : value;
}

const EMPTY_LINE = { description: '', quantity: '1', unitPrice: '' };

const labelCls = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inputCls = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-9 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const invalidCls = 'border-red-500/60 focus:border-red-500/70';
const errorCls = 'text-[11px] text-red-400 mt-1';
const mobileLabelCls = 'block sm:hidden text-[10px] font-semibold text-white/30 uppercase tracking-wide mb-1';

const STATUS_COLORS: Record<string, string> = {
  draft:   'border-white/[0.12] bg-white/[0.06] text-white/50',
  sent:    'border-blue-500/30 bg-blue-500/10 text-blue-400',
  partial: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  paid:    'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  overdue: 'border-red-500/30 bg-red-500/10 text-red-400',
  void:    'border-white/[0.08] bg-transparent text-white/25',
};

// ── Customer picker ───────────────────────────────────────────────────────────

interface CustomerPickerProps {
  selected: ARCustomer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: ARCustomer) => void;
  invalid?: boolean;
}

/** Searchable customer dropdown backed by the AR customers API (server-side search). */
function CustomerPicker({ selected, open, onOpenChange, onSelect, invalid }: CustomerPickerProps) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Debounce typing before querying the API.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isFetching, isError, refetch } = useARCustomers({ search: search || undefined, limit: 50 });
  const customers = data?.data ?? [];
  const total = data?.total ?? 0;

  useEffect(() => { setActiveIndex(0); }, [search, open]);

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    searchRef.current?.focus();
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, onOpenChange]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, customers.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault(); // never submit the invoice form from the search box
      const customer = customers[activeIndex];
      if (customer) { onSelect(customer); onOpenChange(false); }
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="invoice-customer-options"
        data-testid="invoice-customer-trigger"
        onClick={() => onOpenChange(!open)}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-md border px-3 h-9 text-sm text-left',
          inputCls, invalid && invalidCls,
        )}
      >
        <span className={cn('truncate', !selected && 'text-white/30')}>
          {selected ? selected.name : 'Select customer…'}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 text-white/40 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-white/[0.1] bg-[#0d1225] shadow-[0_12px_32px_rgba(0,0,0,0.55)] overflow-hidden">
          <div className="relative border-b border-white/[0.07]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search customers by name or email…"
              aria-label="Search customers"
              data-testid="invoice-customer-search"
              className="w-full h-9 pl-9 pr-8 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
            {isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 animate-spin" />}
          </div>
          <ul id="invoice-customer-options" role="listbox" className="max-h-52 overflow-y-auto overscroll-contain py-1">
            {isLoading ? (
              <li className="px-3 py-3 text-xs text-white/40">Loading customers…</li>
            ) : isError ? (
              <li className="px-3 py-3 text-xs text-red-400">
                Could not load customers.{' '}
                <button type="button" onClick={() => refetch()} className="underline text-white/70">Retry</button>
              </li>
            ) : customers.length === 0 ? (
              <li className="px-3 py-3 text-xs text-white/40">
                {search ? `No customers match “${search}”.` : 'No customers yet — add one in the Customers tab.'}
              </li>
            ) : customers.map((customer, index) => (
              <li key={customer.id} role="option" aria-selected={selected?.id === customer.id}>
                <button
                  type="button"
                  data-testid={`invoice-customer-option-${customer.id}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => { onSelect(customer); onOpenChange(false); }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                    index === activeIndex ? 'bg-white/[0.07]' : 'hover:bg-white/[0.05]',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white truncate">{customer.name}</span>
                    <span className="block text-[11px] text-white/40 truncate">
                      {[customer.email, [customer.city, customer.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || 'No contact details'}
                    </span>
                  </span>
                  {customer.status !== 'active' && (
                    <span className="shrink-0 rounded border border-white/[0.1] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/40">{customer.status}</span>
                  )}
                  {selected?.id === customer.id && <Check className="w-3.5 h-3.5 shrink-0 text-[#60a5fa]" />}
                </button>
              </li>
            ))}
          </ul>
          {total > customers.length && (
            <p className="px-3 py-1.5 border-t border-white/[0.07] text-[11px] text-white/35">
              Showing {customers.length} of {total} — type to narrow the list.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ARInvoiceFormValues) => Promise<void>;
  isSubmitting: boolean;
  invoice?: ARInvoice | null;
  error?: string | null;
}

export default function InvoiceFormModal({ open, onClose, onSubmit, isSubmitting, invoice, error }: Props) {
  const isEdit = !!invoice;
  const today  = new Date().toISOString().slice(0, 10);
  const due30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const { register, handleSubmit, reset, setValue, control, formState: { errors, submitCount } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: 0,
      invoiceNumber: '',
      issueDate: today, dueDate: due30, status: 'draft', discountAmount: '0', taxAmount: '0', notes: '',
      lines: [{ ...EMPTY_LINE }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const watchedLines    = useWatch({ control, name: 'lines' });
  const watchedTax      = useWatch({ control, name: 'taxAmount' });
  const watchedDiscount = useWatch({ control, name: 'discountAmount' });
  const watchedStatus   = useWatch({ control, name: 'status' });
  const customerId      = useWatch({ control, name: 'customerId' });

  const subtotal    = Math.round((watchedLines ?? []).reduce((sum, l) => sum + lineAmount(l?.quantity, l?.unitPrice), 0) * 100) / 100;
  const discountAmt = parseFloat(watchedDiscount || '0') || 0;
  const taxAmt      = parseFloat(watchedTax || '0') || 0;
  const totalAmount = subtotal - discountAmt + taxAmt;

  // Bill To: the customer picked in the dropdown, kept fresh from the customer API.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedCustomer, setPickedCustomer] = useState<ARCustomer | null>(null);
  const { data: customerRes, isLoading: customerLoading } = useARCustomer(open && customerId > 0 ? customerId : null);
  const billTo = customerRes?.data ?? (pickedCustomer?.id === customerId ? pickedCustomer : null);

  // Reset only when the modal opens or a different invoice is loaded — not on background refetches.
  const invoiceKey = invoice ? `${invoice.id}:${invoice.updatedAt}:${invoice.lines?.length ?? 0}` : 'new';
  useEffect(() => {
    if (!open) return;
    setPickerOpen(false);
    setPickedCustomer(null);
    if (invoice) {
      reset({
        customerId:    invoice.customerId,
        invoiceNumber: invoice.invoiceNumber,
        issueDate:     invoice.issueDate,
        dueDate:       invoice.dueDate,
        status:        invoice.status,
        discountAmount: invoice.discountAmount ?? '0',
        taxAmount:     invoice.taxAmount,
        notes:         invoice.notes ?? '',
        lines: (invoice.lines && invoice.lines.length > 0)
          ? invoice.lines.map((l) => ({ description: l.description, quantity: trimNumber(l.quantity), unitPrice: l.unitPrice, sequence: l.sequence }))
          : [{ ...EMPTY_LINE }],
      });
    } else {
      reset({
        customerId: 0, invoiceNumber: '', issueDate: today, dueDate: due30,
        status: 'draft', discountAmount: '0', taxAmount: '0', notes: '',
        lines: [{ ...EMPTY_LINE }],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoiceKey, reset]);

  async function onFormSubmit(values: FormValues) {
    await onSubmit({
      ...values,
      customerId: Number(values.customerId),
      invoiceNumber: values.invoiceNumber || undefined,
      status: (values.status as ARInvoiceStatus) ?? 'draft',
      discountAmount: values.discountAmount || '0',
      taxAmount: values.taxAmount || '0',
      notes: values.notes || null,
      lines: values.lines.map((l, i) => ({ description: l.description.trim(), quantity: l.quantity, unitPrice: l.unitPrice, sequence: i })),
    });
  }

  const canEditLines = !isEdit || invoice?.status === 'draft' || invoice?.status === 'sent';
  const lineErrors = Array.isArray(errors.lines) ? errors.lines : [];
  const linesMessage = errors.lines?.root?.message ?? errors.lines?.message;
  const invalidLineCount = lineErrors.filter(Boolean).length;
  const hasErrors = submitCount > 0 && Object.keys(errors).length > 0;

  const decimalField = (name: `lines.${number}.quantity` | `lines.${number}.unitPrice` | 'discountAmount' | 'taxAmount', decimals: number) => {
    const field = register(name);
    return {
      ...field,
      inputMode: 'decimal' as const,
      autoComplete: 'off',
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        event.target.value = sanitizeDecimal(event.target.value, decimals);
        return field.onChange(event);
      },
    };
  };

  const billToLines = useMemo(() => {
    if (!billTo) return [];
    return [
      ...(billTo.address ?? '').split(/\r?\n/).map((part) => part.trim()).filter(Boolean),
      [billTo.city, billTo.country].map((part) => part?.trim()).filter(Boolean).join(', '),
    ].filter(Boolean);
  }, [billTo]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onEscapeKeyDown={(event) => { if (pickerOpen) { event.preventDefault(); setPickerOpen(false); } }}
        className="max-w-2xl w-[calc(100vw-1rem)] sm:w-full max-h-[92vh] bg-[#0d1225] border border-white/[0.09] text-white p-0 gap-0 overflow-hidden flex flex-col"
      >
        {/* The dialog supplies its own close button (top right). */}
        <DialogHeader className="px-4 sm:px-6 py-4 pr-12 border-b border-white/[0.07] space-y-0 text-left">
          <DialogTitle className="text-base font-semibold text-white">
            {isEdit ? `Edit Invoice ${invoice!.invoiceNumber}` : 'New Invoice'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} noValidate className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-5 space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-2.5 text-sm text-red-400">{error}</div>}

            {/* Customer + Invoice # */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Customer *</label>
                <CustomerPicker
                  selected={billTo}
                  open={pickerOpen}
                  onOpenChange={setPickerOpen}
                  invalid={!!errors.customerId}
                  onSelect={(customer) => {
                    setPickedCustomer(customer);
                    setValue('customerId', customer.id, { shouldDirty: true, shouldValidate: true });
                  }}
                />
                {errors.customerId && <p className={errorCls}>{errors.customerId.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Invoice # <span className="text-white/25 normal-case font-normal">(auto if blank)</span></label>
                <Input {...register('invoiceNumber')} placeholder="INV-0001" disabled={isEdit}
                  className={cn(inputCls, isEdit && 'opacity-50')} />
              </div>
            </div>

            {/* Bill To */}
            <section aria-label="Bill To" data-testid="invoice-bill-to"
              className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wide mb-1.5">Bill To</p>
              {billTo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white break-words">{billTo.name}</p>
                    {billToLines.length > 0
                      ? billToLines.map((line, i) => <p key={i} className="text-white/55 break-words">{line}</p>)
                      : <p className="text-white/30">No address on file</p>}
                  </div>
                  <dl className="min-w-0 space-y-0.5">
                    {[
                      ['Phone', billTo.phone],
                      ['Email', billTo.email],
                      ['GSTIN / Tax ID', billTo.taxId],
                    ].map(([label, value]) => (
                      <div key={label} className="flex gap-2">
                        <dt className="shrink-0 text-white/35">{label}</dt>
                        <dd className={cn('min-w-0 break-all', value ? 'text-white/70' : 'text-white/25')}>{value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : customerId > 0 && customerLoading ? (
                <p className="flex items-center gap-2 text-xs text-white/40"><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading customer…</p>
              ) : (
                <p className="text-xs text-white/35">Select a customer above to fill in the billing details.</p>
              )}
            </section>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Issue Date *</label>
                <Input type="date" {...register('issueDate')} className={cn(inputCls, errors.issueDate && invalidCls)} />
                {errors.issueDate && <p className={errorCls}>{errors.issueDate.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Due Date *</label>
                <Input type="date" {...register('dueDate')} className={cn(inputCls, errors.dueDate && invalidCls)} />
                {errors.dueDate && <p className={errorCls}>{errors.dueDate.message}</p>}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className={labelCls}>Status</label>
              <div className="flex flex-wrap gap-1.5">
                {(isEdit ? AR_INVOICE_STATUSES : (['draft', 'sent'] as ARInvoiceStatus[])).map((s) => (
                  <button key={s} type="button" onClick={() => setValue('status', s, { shouldDirty: true })}
                    className={cn('px-2.5 py-1 rounded-md border text-[11px] font-semibold capitalize transition-all',
                      watchedStatus === s ? STATUS_COLORS[s] : 'border-white/[0.06] bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Line items */}
            <div>
              <label className={labelCls}>Line Items</label>
              <div className="border border-white/[0.07] rounded-lg overflow-hidden" data-testid="invoice-lines">
                {/* Column headings (desktop) */}
                <div className="hidden sm:grid grid-cols-[1fr_80px_110px_100px_32px] gap-2 px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
                  {['Description', 'Qty', 'Unit Price', 'Amount', ''].map((h, i) => (
                    <span key={i} className={cn('text-[10px] font-semibold text-white/30 uppercase tracking-wide', i === 3 && 'text-right')}>{h}</span>
                  ))}
                </div>
                {fields.map((field, idx) => {
                  const rowErrors = lineErrors[idx];
                  const amount = lineAmount(watchedLines?.[idx]?.quantity, watchedLines?.[idx]?.unitPrice);
                  const removable = canEditLines && fields.length > 1;
                  return (
                    <div key={field.id} data-testid={`invoice-line-${idx}`}
                      className="grid grid-cols-2 sm:grid-cols-[1fr_80px_110px_100px_32px] gap-2 px-3 py-2.5 sm:py-2 border-b border-white/[0.04] last:border-0 items-start">
                      <div className="col-span-2 sm:col-span-1 min-w-0">
                        <span className={mobileLabelCls}>Item {idx + 1} · Description</span>
                        <Input {...register(`lines.${idx}.description`)} placeholder="Service / product…"
                          aria-label={`Line ${idx + 1} description`} aria-invalid={!!rowErrors?.description}
                          disabled={!canEditLines}
                          className={cn(inputCls, 'h-8 text-xs', rowErrors?.description && invalidCls, !canEditLines && 'opacity-50')} />
                        {rowErrors?.description && <p className={errorCls}>{rowErrors.description.message}</p>}
                      </div>
                      <div className="min-w-0">
                        <span className={mobileLabelCls}>Qty</span>
                        <Input {...decimalField(`lines.${idx}.quantity`, 4)} placeholder="1"
                          aria-label={`Line ${idx + 1} quantity`} aria-invalid={!!rowErrors?.quantity}
                          disabled={!canEditLines}
                          className={cn(inputCls, 'h-8 text-xs sm:text-center', rowErrors?.quantity && invalidCls, !canEditLines && 'opacity-50')} />
                        {rowErrors?.quantity && <p className={errorCls}>{rowErrors.quantity.message}</p>}
                      </div>
                      <div className="min-w-0">
                        <span className={mobileLabelCls}>Unit Price</span>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30 text-xs">₹</span>
                          <Input {...decimalField(`lines.${idx}.unitPrice`, 2)} placeholder="0.00"
                            aria-label={`Line ${idx + 1} unit price`} aria-invalid={!!rowErrors?.unitPrice}
                            disabled={!canEditLines}
                            className={cn(inputCls, 'h-8 text-xs pl-5', rowErrors?.unitPrice && invalidCls, !canEditLines && 'opacity-50')} />
                        </div>
                        {rowErrors?.unitPrice && <p className={errorCls}>{rowErrors.unitPrice.message}</p>}
                      </div>
                      <div className="col-span-2 sm:col-span-2 sm:contents flex items-center justify-between gap-2">
                        <p className="sm:h-8 sm:flex sm:items-center sm:justify-end text-xs text-white/70 tabular-nums min-w-0"
                          data-testid={`invoice-line-amount-${idx}`}>
                          <span className="sm:hidden text-[10px] font-semibold text-white/30 uppercase tracking-wide mr-2">Amount</span>
                          <span className="truncate">{formatINR(amount)}</span>
                        </p>
                        {removable ? (
                          <button type="button" onClick={() => remove(idx)} aria-label={`Remove line ${idx + 1}`}
                            className="h-8 w-8 shrink-0 flex items-center justify-center rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : <span className="hidden sm:block" />}
                      </div>
                    </div>
                  );
                })}
              </div>
              {linesMessage && <p className={errorCls}>{linesMessage}</p>}
              {!linesMessage && invalidLineCount > 0 && (
                <p className={errorCls}>
                  {invalidLineCount === 1 ? '1 line item needs attention' : `${invalidLineCount} line items need attention`} — see the highlighted fields, or remove unused lines.
                </p>
              )}
              {canEditLines && (
                <button type="button" onClick={() => append({ ...EMPTY_LINE }, { focusName: `lines.${fields.length}.description` })}
                  className="mt-2 h-8 px-2 -ml-2 flex items-center gap-1.5 rounded text-xs text-[#2563EB] hover:text-blue-400 hover:bg-white/[0.04] transition-colors">
                  <Plus className="w-3.5 h-3.5" />Add line
                </button>
              )}
              {!canEditLines && (
                <p className="mt-2 text-[11px] text-white/35">Line items can only be changed while the invoice is a draft or sent.</p>
              )}
            </div>

            {/* Discount + Tax + Totals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
                <div>
                  <label className={labelCls}>Discount <span className="text-white/25 normal-case font-normal">(before tax)</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">₹</span>
                    <Input {...decimalField('discountAmount', 2)} placeholder="0.00" disabled={!canEditLines}
                      className={cn(inputCls, 'pl-6', errors.discountAmount && invalidCls, !canEditLines && 'opacity-50')} />
                  </div>
                  {errors.discountAmount && <p className={errorCls}>{errors.discountAmount.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Tax Amount (GST)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">₹</span>
                    <Input {...decimalField('taxAmount', 2)} placeholder="0.00" disabled={!canEditLines}
                      className={cn(inputCls, 'pl-6', errors.taxAmount && invalidCls, !canEditLines && 'opacity-50')} />
                  </div>
                  {errors.taxAmount && <p className={errorCls}>{errors.taxAmount.message}</p>}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 space-y-1.5 self-start" data-testid="invoice-totals">
                <div className="flex justify-between gap-3 text-xs text-white/40">
                  <span>Subtotal</span>
                  <span className="tabular-nums" data-testid="invoice-subtotal">{formatINR(subtotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between gap-3 text-xs text-white/40">
                    <span>Discount</span>
                    <span className="tabular-nums">-{formatINR(discountAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3 text-xs text-white/40">
                  <span>Tax</span>
                  <span className="tabular-nums" data-testid="invoice-tax">{formatINR(taxAmt)}</span>
                </div>
                <div className="flex justify-between gap-3 text-sm font-semibold text-white border-t border-white/[0.06] pt-1.5">
                  <span>Grand Total</span>
                  <span className="tabular-nums" data-testid="invoice-grand-total">{formatINR(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>Notes <span className="text-white/25 normal-case font-normal">(optional)</span></label>
              <textarea {...register('notes')} rows={2} placeholder="Payment terms, references…"
                className={cn('w-full rounded-md border px-3 py-2 text-sm resize-none', inputCls, 'h-auto')} />
              {errors.notes && <p className={errorCls}>{errors.notes.message}</p>}
            </div>
          </div>

          {/* Footer — stays visible while the form scrolls */}
          <div className="flex flex-wrap items-center justify-end gap-2 px-4 sm:px-6 py-3 border-t border-white/[0.07] bg-[#0d1225]">
            {hasErrors && (
              <p className="text-[11px] text-red-400 mr-auto" role="alert">Please fix the highlighted fields.</p>
            )}
            <Button type="button" variant="outline" size="sm" onClick={onClose}
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-9 sm:h-8">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#2563EB] hover:bg-[#1d4ed8] h-9 sm:h-8 min-w-[120px]">
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
