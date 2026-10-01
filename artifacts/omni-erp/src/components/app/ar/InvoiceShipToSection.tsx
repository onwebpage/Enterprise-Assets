import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useARShippingAddresses, useCreateARShippingAddress, useDeleteARShippingAddress,
  type ARCustomer, type ARInvoiceShipToInput, type ARShippingAddressFormValues,
} from '@/hooks/useAccountsReceivable';

/**
 * What the invoice ships to:
 *  - none     no Ship To (the default; always valid)
 *  - billing  same as the customer's billing address
 *  - saved    one of the customer's saved shipping addresses
 *  - keep     (editing only) the address already copied onto this invoice
 */
export type ShipToChoice =
  | { kind: 'none' }
  | { kind: 'billing' }
  | { kind: 'saved'; addressId: number }
  | { kind: 'keep' };

/** Address already stored on the invoice being edited, if any. */
export interface ShipToSnapshot {
  name: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
}

/** Value for the invoice API: null = none, undefined = leave the stored Ship To unchanged. */
export function shipToChoiceToInput(choice: ShipToChoice): ARInvoiceShipToInput | undefined {
  switch (choice.kind) {
    case 'billing': return { source: 'billing' };
    case 'saved':   return { source: 'saved', addressId: choice.addressId };
    case 'keep':    return undefined;
    default:        return null;
  }
}

const NEW_ADDRESS = 'new';
const EMPTY_ADDRESS: ARShippingAddressFormValues = { label: '', recipientName: '', address: '', city: '', country: '', phone: '' };

const labelCls = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inputCls = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-9 text-sm focus:border-[#2563EB]/60 focus:ring-0';

function addressLines(address: string | null | undefined, city: string | null | undefined, country: string | null | undefined): string[] {
  return [
    ...(address ?? '').split(/\r?\n/).map((part) => part.trim()).filter(Boolean),
    [city, country].map((part) => part?.trim()).filter(Boolean).join(', '),
  ].filter(Boolean);
}

interface Props {
  /** The Bill To customer; Ship To options come from this customer. */
  customer: ARCustomer | null;
  value: ShipToChoice;
  onChange: (choice: ShipToChoice) => void;
  /** Ship To already stored on the invoice (edit mode). */
  snapshot?: ShipToSnapshot | null;
}

export default function InvoiceShipToSection({ customer, value, onChange, snapshot }: Props) {
  const customerId = customer?.id ?? null;
  const { data: addressesRes, isLoading, isFetching, isError, refetch } = useARShippingAddresses(customerId);
  const createAddress = useCreateARShippingAddress();
  const deleteAddress = useDeleteARShippingAddress();
  const addresses = addressesRes?.data ?? [];

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ARShippingAddressFormValues>(EMPTY_ADDRESS);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Close the "new address" form when the customer changes.
  useEffect(() => { setAdding(false); setDraft(EMPTY_ADDRESS); setDraftError(null); }, [customerId]);

  // A saved address that no longer exists falls back to the invoice's own copy, or to none.
  useEffect(() => {
    if (value.kind !== 'saved' || !addressesRes || isFetching) return; // wait for a settled list
    if (!addressesRes.data.some((address) => address.id === value.addressId)) {
      onChange(snapshot?.address ? { kind: 'keep' } : { kind: 'none' });
    }
  }, [value, addressesRes, isFetching, snapshot, onChange]);

  const hasBillingAddress = !!customer?.address?.trim();
  const selected = value.kind === 'saved' ? addresses.find((address) => address.id === value.addressId) ?? null : null;
  const selectValue = adding ? NEW_ADDRESS
    : value.kind === 'saved' ? `saved:${value.addressId}`
    : value.kind;

  function handleSelect(next: string) {
    setDraftError(null);
    if (next === NEW_ADDRESS) { setAdding(true); return; }
    setAdding(false);
    if (next === 'billing') onChange({ kind: 'billing' });
    else if (next === 'keep') onChange({ kind: 'keep' });
    else if (next.startsWith('saved:')) onChange({ kind: 'saved', addressId: Number(next.slice(6)) });
    else onChange({ kind: 'none' });
  }

  async function handleSaveAddress() {
    if (!customerId) return;
    if (!draft.label.trim()) { setDraftError('Give this address a name, e.g. "Warehouse".'); return; }
    if (!draft.address.trim()) { setDraftError('Enter the street address.'); return; }
    setDraftError(null);
    try {
      const result = await createAddress.mutateAsync({ customerId, data: draft });
      onChange({ kind: 'saved', addressId: result.data.id });
      setAdding(false);
      setDraft(EMPTY_ADDRESS);
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : 'Could not save the address');
    }
  }

  async function handleDeleteSelected() {
    if (!customerId || !selected) return;
    try {
      await deleteAddress.mutateAsync({ customerId, addressId: selected.id });
      onChange({ kind: 'none' });
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : 'Could not remove the address');
    }
  }

  const field = (key: keyof ARShippingAddressFormValues) => ({
    value: draft[key] ?? '',
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((previous) => ({ ...previous, [key]: event.target.value })),
  });
  // The section sits inside the invoice <form>: Enter here saves the address, not the invoice.
  const saveOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); void handleSaveAddress(); }
  };

  // What will be shipped to, for the preview card.
  let preview: { name: string; lines: string[]; phone: string | null } | null = null;
  if (!adding) {
    if (value.kind === 'billing' && customer) {
      preview = { name: customer.name, lines: addressLines(customer.address, customer.city, customer.country), phone: customer.phone };
    } else if (value.kind === 'saved' && selected) {
      preview = { name: selected.recipientName?.trim() || customer?.name || '', lines: addressLines(selected.address, selected.city, selected.country), phone: selected.phone };
    } else if (value.kind === 'keep' && snapshot) {
      preview = { name: snapshot.name ?? '', lines: addressLines(snapshot.address, snapshot.city, snapshot.country), phone: snapshot.phone };
    }
  }

  return (
    <section aria-label="Ship To" data-testid="invoice-ship-to"
      className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wide mb-1.5">
        Ship To <span className="normal-case font-normal text-white/25">(optional)</span>
      </p>

      {!customer ? (
        <p className="text-xs text-white/35">Select a customer first. Shipping details are optional.</p>
      ) : (
        <div className="space-y-2.5">
          <select
            aria-label="Ship To address"
            data-testid="invoice-ship-to-select"
            value={selectValue}
            onChange={(event) => handleSelect(event.target.value)}
            className={cn('w-full rounded-md border px-3 appearance-none', inputCls)}
          >
            <option value="none" className="bg-[#0d1225]">No shipping address</option>
            <option value="billing" disabled={!hasBillingAddress} className="bg-[#0d1225]">
              Same as Bill To{hasBillingAddress ? '' : ' (customer has no billing address)'}
            </option>
            {value.kind === 'keep' && (
              <option value="keep" className="bg-[#0d1225]">Address saved on this invoice</option>
            )}
            {addresses.map((address) => (
              <option key={address.id} value={`saved:${address.id}`} className="bg-[#0d1225]">
                {address.label}{address.city ? ` — ${address.city}` : ''}
              </option>
            ))}
            <option value={NEW_ADDRESS} className="bg-[#0d1225]">+ Add a new shipping address…</option>
          </select>

          {isLoading && (
            <p className="flex items-center gap-2 text-xs text-white/40"><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading saved addresses…</p>
          )}
          {isError && (
            <p className="text-xs text-red-400">
              Could not load this customer's saved addresses.{' '}
              <button type="button" onClick={() => refetch()} className="underline text-white/70">Retry</button>
            </p>
          )}

          {preview && (
            <div className="flex items-start justify-between gap-3 text-xs" data-testid="invoice-ship-to-preview">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white break-words">{preview.name}</p>
                {preview.lines.map((line, i) => <p key={i} className="text-white/55 break-words">{line}</p>)}
                {preview.phone && <p className="text-white/45 break-all">{preview.phone}</p>}
              </div>
              {selected && (
                <button type="button" onClick={handleDeleteSelected} disabled={deleteAddress.isPending}
                  title="Remove this saved address from the customer"
                  aria-label={`Remove saved address ${selected.label}`}
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors disabled:opacity-40">
                  {deleteAddress.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          )}

          {adding && (
            <div className="rounded-md border border-white/[0.07] p-3 space-y-2.5" data-testid="invoice-ship-to-new">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={labelCls}>Address name *</label>
                  <Input {...field('label')} onKeyDown={saveOnEnter} maxLength={100} placeholder="Warehouse, Site office…" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Recipient <span className="text-white/25 normal-case font-normal">(optional)</span></label>
                  <Input {...field('recipientName')} onKeyDown={saveOnEnter} maxLength={200} placeholder={customer.name} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Address *</label>
                <textarea {...field('address')} rows={2} maxLength={500} placeholder="Street, area, PIN code"
                  className={cn('w-full rounded-md border px-3 py-2 resize-none h-auto', inputCls)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className={labelCls}>City</label>
                  <Input {...field('city')} onKeyDown={saveOnEnter} maxLength={100} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <Input {...field('country')} onKeyDown={saveOnEnter} maxLength={100} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <Input {...field('phone')} onKeyDown={saveOnEnter} maxLength={50} inputMode="tel" className={inputCls} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setAdding(false); setDraftError(null); }}
                  className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleSaveAddress} disabled={createAddress.isPending}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                  {createAddress.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</>
                    : <><Plus className="w-3.5 h-3.5 mr-1.5" />Save address</>}
                </Button>
              </div>
            </div>
          )}

          {draftError && <p className="text-[11px] text-red-400" role="alert">{draftError}</p>}
        </div>
      )}
    </section>
  );
}
