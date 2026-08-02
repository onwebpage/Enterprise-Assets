import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart, Users, PackageCheck, FileSearch,
  TrendingUp, Clock, CheckCircle, AlertCircle,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { cn } from '@/lib/utils';
import { usePurchaseSummary, usePurchasePermissions } from '@/hooks/usePurchase';
import VendorsTab  from '@/components/app/purchase/VendorsTab';
import OrdersTab   from '@/components/app/purchase/OrdersTab';
import GRNTab      from '@/components/app/purchase/GRNTab';
import RFQTab      from '@/components/app/purchase/RFQTab';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'vendors' | 'orders' | 'grn' | 'rfq';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(v: string | undefined) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 10_00_000)   return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
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
        {sub && !loading && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { data: summaryRes, isLoading } = usePurchaseSummary();
  const s = summaryRes?.data;

  const kpis: KpiCardProps[] = [
    {
      label:   'Total PO Value',
      value:   fmtMoney(s?.totalValue),
      sub:     s ? `${s.totalOrders} orders` : '',
      icon:    ShoppingCart,
      accent:  'bg-[#2563EB]/20 text-[#60a5fa]',
      loading: isLoading,
    },
    {
      label:   'Active Vendors',
      value:   String(s?.activeVendors ?? 0),
      sub:     s ? `${s.totalVendors} total vendors` : '',
      icon:    Users,
      accent:  'bg-violet-500/15 text-violet-400',
      loading: isLoading,
    },
    {
      label:   'Goods Receipts',
      value:   String(s?.totalGRNs ?? 0),
      sub:     s ? `${s.pendingGRNs} pending review` : '',
      icon:    PackageCheck,
      accent:  'bg-emerald-500/15 text-emerald-400',
      loading: isLoading,
    },
    {
      label:   'Open RFQs',
      value:   String(s?.openRFQs ?? 0),
      sub:     s ? `${s.totalRFQs} total RFQs` : '',
      icon:    FileSearch,
      accent:  'bg-amber-500/15 text-amber-400',
      loading: isLoading,
    },
  ];

  const statusBreakdown = s?.statusBreakdown ?? [];
  const topVendors      = s?.topVendors ?? [];
  const recentOrders    = s?.recentOrders ?? [];

  const STATUS_COLORS: Record<string, string> = {
    draft:     'bg-white/30',
    sent:      'bg-[#2563EB]',
    confirmed: 'bg-violet-500',
    partial:   'bg-amber-500',
    received:  'bg-emerald-500',
    cancelled: 'bg-red-500',
  };

  const PO_STATUS_BADGE: Record<string, string> = {
    draft:     'bg-white/[0.06] text-white/40 border-white/[0.1]',
    sent:      'bg-blue-500/12 text-blue-400 border-blue-500/25',
    confirmed: 'bg-violet-500/12 text-violet-400 border-violet-500/25',
    partial:   'bg-amber-500/12 text-amber-400 border-amber-500/25',
    received:  'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
    cancelled: 'bg-red-500/12 text-red-400 border-red-500/25',
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PO Status Breakdown */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Order Status</h3>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-8 bg-white/[0.04] rounded animate-pulse" />)}</div>
          ) : statusBreakdown.length === 0 ? (
            <p className="text-white/25 text-sm">No orders yet</p>
          ) : (
            <div className="space-y-2">
              {statusBreakdown.map((row) => {
                const total = statusBreakdown.reduce((a, b) => a + b.count, 0);
                const pct   = total > 0 ? (row.count / total) * 100 : 0;
                return (
                  <div key={row.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize text-white/60">{row.status}</span>
                      <span className="text-white/40">{row.count} orders</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', STATUS_COLORS[row.status] ?? 'bg-white/30')}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Vendors */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/70">Top Vendors</h3>
            <button onClick={() => onNavigate('vendors')}
              className="text-[11px] text-[#60a5fa] hover:text-[#93c5fd] transition-colors">View all →</button>
          </div>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-7 bg-white/[0.04] rounded animate-pulse" />)}</div>
          ) : topVendors.length === 0 ? (
            <p className="text-white/25 text-sm">No vendors yet</p>
          ) : (
            <div className="space-y-2">
              {topVendors.map((v) => (
                <div key={v.vendorId} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-white/70 font-medium truncate">{v.vendorName}</p>
                    <p className="text-[11px] text-white/35">{v.poCount} orders</p>
                  </div>
                  <span className="text-xs font-semibold text-[#60a5fa] tabular-nums shrink-0">{fmtMoney(v.totalValue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent POs */}
        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/70">Recent Orders</h3>
            <button onClick={() => onNavigate('orders')}
              className="text-[11px] text-[#60a5fa] hover:text-[#93c5fd] transition-colors">View all →</button>
          </div>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-white/[0.04] rounded animate-pulse" />)}</div>
          ) : recentOrders.length === 0 ? (
            <p className="text-white/25 text-sm">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#60a5fa] font-mono">{o.poNumber}</p>
                    <p className="text-[11px] text-white/40 truncate">{o.vendorName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-white/70 tabular-nums">{fmtMoney(o.totalAmount)}</p>
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize border', PO_STATUS_BADGE[o.status] ?? '')}>
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { label: 'Add Vendor',    sub: 'Register a new supplier',       tab: 'vendors' as Tab, color: 'text-violet-400',  bg: 'bg-violet-500/10 hover:bg-violet-500/15' },
          { label: 'New PO',        sub: 'Create a purchase order',       tab: 'orders'  as Tab, color: 'text-[#60a5fa]',   bg: 'bg-[#2563EB]/10  hover:bg-[#2563EB]/15' },
          { label: 'Receive Goods', sub: 'Record a goods receipt',        tab: 'grn'     as Tab, color: 'text-emerald-400', bg: 'bg-emerald-500/10 hover:bg-emerald-500/15' },
          { label: 'New RFQ',       sub: 'Request for quotation',         tab: 'rfq'     as Tab, color: 'text-amber-400',   bg: 'bg-amber-500/10   hover:bg-amber-500/15' },
        ].map((a) => (
          <button key={a.label} onClick={() => onNavigate(a.tab)}
            className={cn('rounded-xl p-4 text-left border border-white/[0.07] transition-colors', a.bg)}>
            <p className={cn('text-sm font-semibold', a.color)}>{a.label}</p>
            <p className="text-xs text-white/35 mt-0.5">{a.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview'        },
  { id: 'vendors',  label: 'Vendors'         },
  { id: 'orders',   label: 'Purchase Orders' },
  { id: 'grn',      label: 'Goods Receipts'  },
  { id: 'rfq',      label: 'RFQ'             },
];

export default function PurchasePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <AppLayout breadcrumbs={[{ label: 'Operations' }, { label: 'Purchase & Procurement' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Purchase & Procurement</h1>
          <p className="text-sm text-white/40 mt-1">
            Manage vendors, purchase orders, goods receipts, and request for quotations
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-white/[0.06] pb-0 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                activeTab === t.id
                  ? 'border-[#2563EB] text-white'
                  : 'border-transparent text-white/40 hover:text-white/70',
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeTab === 'overview' && <OverviewTab onNavigate={setActiveTab} />}
          {activeTab === 'vendors'  && <VendorsTab />}
          {activeTab === 'orders'   && <OrdersTab />}
          {activeTab === 'grn'      && <GRNTab />}
          {activeTab === 'rfq'      && <RFQTab />}
        </motion.div>
      </div>
    </AppLayout>
  );
}
