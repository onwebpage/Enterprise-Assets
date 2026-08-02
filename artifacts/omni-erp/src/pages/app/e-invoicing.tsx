import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, CheckCircle, Clock, XCircle, TrendingUp, Building2,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { cn } from '@/lib/utils';
import { useEInvSummary, useEInvPermissions } from '@/hooks/useEInvoicing';
import InvoicesTab from '@/components/app/einvoicing/InvoicesTab';
import BuyersTab   from '@/components/app/einvoicing/BuyersTab';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'invoices' | 'buyers';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAmt(v: string | undefined) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  loading?: boolean;
}

function KpiCard({ label, value, sub, icon: Icon, accent, loading }: KpiCardProps) {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-white/40 font-medium">{label}</p>
        {loading ? (
          <div className="h-6 w-24 bg-white/[0.04] rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-white mt-0.5 tabular-nums">{value}</p>
        )}
        {sub && !loading && (
          <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'invoices', label: 'E-Invoices', icon: FileText  },
  { id: 'buyers',   label: 'Buyers',     icon: Building2 },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EInvoicingPage() {
  const [tab, setTab] = useState<Tab>('invoices');

  const { data: summaryRes, isLoading: summaryLoading } = useEInvSummary();
  const { data: permsRes } = useEInvPermissions();

  const s     = summaryRes?.data;
  const perms = permsRes?.data;

  const kpis: KpiCardProps[] = [
    {
      label:   'Total Invoice Value',
      value:   fmtAmt(s?.totalValue),
      sub:     'excluding cancelled',
      icon:    TrendingUp,
      accent:  'bg-purple-500/15 text-purple-400',
      loading: summaryLoading,
    },
    {
      label:   'Acknowledged',
      value:   s?.acknowledged ?? 0,
      sub:     'IRN generated',
      icon:    CheckCircle,
      accent:  'bg-emerald-500/15 text-emerald-400',
      loading: summaryLoading,
    },
    {
      label:   'Pending',
      value:   s?.pending ?? 0,
      sub:     'draft + submitted',
      icon:    Clock,
      accent:  'bg-blue-500/15 text-blue-400',
      loading: summaryLoading,
    },
    {
      label:   'Total Tax',
      value:   fmtAmt(s?.totalTax),
      sub:     'CGST + SGST + IGST',
      icon:    FileText,
      accent:  'bg-amber-500/15 text-amber-400',
      loading: summaryLoading,
    },
  ];

  if (perms && !perms.canView) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh] flex-col gap-3">
          <XCircle className="w-10 h-10 text-white/20" />
          <p className="text-white/40 text-sm">You don't have permission to view E-Invoicing.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">E-Invoicing</h1>
              <p className="text-sm text-white/40 mt-0.5">
                Manage IRN generation, buyer registry, and invoice lifecycle
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-400 font-medium">IRP Connected</span>
            </div>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {kpis.map(k => <KpiCard key={k.label} {...k} />)}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-[#0a0f1e] border border-white/[0.07] rounded-2xl overflow-hidden"
        >
          {/* Tab header */}
          <div className="flex border-b border-white/[0.07] px-4 pt-2 gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px',
                  tab === t.id
                    ? 'text-white border-[#2563EB] bg-white/[0.03]'
                    : 'text-white/40 border-transparent hover:text-white/70 hover:bg-white/[0.02]',
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {tab === 'invoices' && <InvoicesTab />}
            {tab === 'buyers'   && <BuyersTab   />}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
