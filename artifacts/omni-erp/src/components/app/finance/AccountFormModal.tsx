import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  type Account, type AccountFormValues, type AccountParent,
  type AccountType, normalBalanceForType,
  ACCOUNT_TYPES,
} from '@/hooks/useChartOfAccounts';

// ── Validation schema ─────────────────────────────────────────────────────────
const schema = z.object({
  code: z.string().min(1, 'Code is required').max(20, 'Max 20 characters'),
  name: z.string().min(1, 'Name is required').max(120, 'Max 120 characters'),
  type: z.enum(['Asset', 'Liability', 'Equity', 'Income', 'Expense'] as const),
  parentId: z.number().int().positive().nullable().optional(),
  description: z.string().max(500, 'Max 500 characters').nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelCls = 'block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5';
const inputCls = 'bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-9 text-sm focus:border-[#2563EB]/60 focus:ring-0';
const errorCls = 'text-[11px] text-red-400 mt-1';

const TYPE_COLORS: Record<string, string> = {
  Asset:     'border-blue-500/30 bg-blue-500/10 text-blue-400',
  Liability: 'border-red-500/30 bg-red-500/10 text-red-400',
  Equity:    'border-purple-500/30 bg-purple-500/10 text-purple-400',
  Income:    'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  Expense:   'border-amber-500/30 bg-amber-500/10 text-amber-400',
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface AccountFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: AccountFormValues) => Promise<void>;
  isSubmitting: boolean;
  account?: Account | null;       // null/undefined = create mode
  parents: AccountParent[];
  error?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AccountFormModal({
  open, onClose, onSubmit, isSubmitting, account, parents, error,
}: AccountFormModalProps) {
  const isEdit = !!account;

  const {
    register, handleSubmit, control, watch, reset, setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '',
      name: '',
      type: 'Asset',
      parentId: null,
      description: null,
      status: 'active',
    },
  });

  const watchedType = watch('type');

  // Populate form when editing
  useEffect(() => {
    if (open) {
      reset(
        account
          ? {
              code:        account.code,
              name:        account.name,
              type:        account.type,
              parentId:    account.parentId ?? null,
              description: account.description ?? null,
              status:      account.status,
            }
          : { code: '', name: '', type: 'Asset', parentId: null, description: null, status: 'active' },
      );
    }
  }, [open, account, reset]);

  async function handleFormSubmit(values: FormValues) {
    await onSubmit({
      ...values,
      normalBalance: normalBalanceForType(values.type),
    });
  }

  // Exclude self from parent options in edit mode
  const parentOptions = isEdit
    ? parents.filter((p) => p.id !== account!.id)
    : parents;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-[#0d1225] border border-white/[0.09] text-white p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="flex-row items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <DialogTitle className="text-base font-semibold text-white">
            {isEdit ? 'Edit Account' : 'New Account'}
          </DialogTitle>
          <DialogClose asChild>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        {/* Body */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="px-6 py-5 space-y-4">

          {/* Error banner */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Code + Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Account Code *</label>
              <Input
                {...register('code')}
                placeholder="e.g. 1000"
                className={inputCls}
              />
              {errors.code && <p className={errorCls}>{errors.code.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Account Name *</label>
              <Input
                {...register('name')}
                placeholder="e.g. Cash & Equivalents"
                className={inputCls}
              />
              {errors.name && <p className={errorCls}>{errors.name.message}</p>}
            </div>
          </div>

          {/* Account Type */}
          <div>
            <label className={labelCls}>Account Type *</label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-5 gap-1.5">
                  {ACCOUNT_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => field.onChange(t)}
                      className={cn(
                        'py-1.5 rounded-lg border text-[11px] font-semibold transition-all',
                        field.value === t
                          ? TYPE_COLORS[t]
                          : 'border-white/[0.06] bg-white/[0.02] text-white/35 hover:bg-white/[0.05] hover:text-white/60',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            />
            {errors.type && <p className={errorCls}>{errors.type.message}</p>}

            {/* Normal balance derived label */}
            <p className="text-[11px] text-white/30 mt-1.5">
              Normal balance:&nbsp;
              <span className={watchedType === 'Asset' || watchedType === 'Expense' ? 'text-emerald-400' : 'text-blue-400'}>
                {normalBalanceForType(watchedType)}
              </span>
              &nbsp;(auto-set by type)
            </p>
          </div>

          {/* Parent Account */}
          <div>
            <label className={labelCls}>Parent Account <span className="text-white/25 normal-case font-normal">(optional)</span></label>
            <Controller
              name="parentId"
              control={control}
              render={({ field }) => (
                <select
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  className={cn(
                    'w-full rounded-md border px-3 h-9 text-sm',
                    inputCls,
                    'appearance-none',
                  )}
                >
                  <option value="">— None (top-level account) —</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} · {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description <span className="text-white/25 normal-case font-normal">(optional)</span></label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="Optional notes about this account…"
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm resize-none',
                inputCls,
              )}
            />
            {errors.description && <p className={errorCls}>{errors.description.message}</p>}
          </div>

          {/* Status — only shown on edit */}
          {isEdit && (
            <div>
              <label className={labelCls}>Status</label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    {(['active', 'inactive'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => field.onChange(s)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all',
                          field.value === s
                            ? s === 'active'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-white/[0.12] bg-white/[0.06] text-white/50'
                            : 'border-white/[0.06] bg-transparent text-white/30 hover:text-white/50',
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.07] mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8 min-w-[100px]"
            >
              {isSubmitting ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</>
              ) : isEdit ? 'Save Changes' : 'Create Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
