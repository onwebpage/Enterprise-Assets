import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinanceDashboard, fmtMoney, timeAgo } from '@/hooks/useFinanceDashboard';
import ChartOfAccountsTab from '@/components/app/finance/ChartOfAccountsTab';
import GeneralLedgerTab from '@/components/app/finance/GeneralLedgerTab';
import JournalEntriesTab from '@/components/app/finance/JournalEntriesTab';
import TrialBalanceTab from '@/components/app/finance/TrialBalanceTab';
import ProfitLossTab from '@/components/app/finance/ProfitLossTab';
import BalanceSheetTab from '@/components/app/finance/BalanceSheetTab';
import CashFlowTab from '@/components/app/finance/CashFlowTab';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Download, Upload,
  Filter, Search, MoreHorizontal, Eye, Edit, Trash2, X,
  CreditCard, Banknote, ArrowUpRight, ArrowDownRight, ArrowRight,
  FileText, BookOpen, RefreshCw, CheckCircle2, AlertCircle,
  ChevronRight, ChevronDown, Calendar, Building2, Layers,
  Scale, ReceiptText, Landmark, GitMerge, Clock, Check, Wallet,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import KPICard from '@/components/app/KPICard';
import StatusBadge from '@/components/app/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Shared tooltip ──────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1225] border border-white/[0.1] rounded-xl p-3 shadow-2xl">
      <p className="text-xs text-white/50 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-xs text-white/60">{p.name}:</span>
          <span className="text-xs font-semibold text-white">${p.value}M</span>
        </div>
      ))}
    </div>
  );
};

// ─── Data ────────────────────────────────────────────────────────────────────
const plData = [
  { month: 'Jan', revenue: 4.2, cogs: 2.1, gross: 2.1, opex: 1.4, net: 0.7 },
  { month: 'Feb', revenue: 5.1, cogs: 2.6, gross: 2.5, opex: 1.5, net: 1.0 },
  { month: 'Mar', revenue: 4.8, cogs: 2.4, gross: 2.4, opex: 1.4, net: 1.0 },
  { month: 'Apr', revenue: 6.3, cogs: 3.1, gross: 3.2, opex: 1.7, net: 1.5 },
  { month: 'May', revenue: 5.9, cogs: 2.9, gross: 3.0, opex: 1.6, net: 1.4 },
  { month: 'Jun', revenue: 7.2, cogs: 3.5, gross: 3.7, opex: 1.9, net: 1.8 },
  { month: 'Jul', revenue: 8.1, cogs: 3.9, gross: 4.2, opex: 2.1, net: 2.1 },
];

const cashFlowData = [
  { month: 'Jan', operating: 1.8, investing: -0.4, financing: -0.2 },
  { month: 'Feb', operating: 2.1, investing: -0.6, financing: -0.2 },
  { month: 'Mar', operating: 1.9, investing: -0.3, financing: -0.3 },
  { month: 'Apr', operating: 2.8, investing: -1.2, financing: -0.1 },
  { month: 'May', operating: 2.6, investing: -0.5, financing: -0.2 },
  { month: 'Jun', operating: 3.2, investing: -0.8, financing: -0.4 },
  { month: 'Jul', operating: 3.8, investing: -1.1, financing: -0.3 },
];

const arAgingBands = [
  { label: 'Current',  amount: 1284000, count: 42, pct: 40 },
  { label: '1–30 days', amount: 892000, count: 28, pct: 28 },
  { label: '31–60 days', amount: 641000, count: 19, pct: 20 },
  { label: '61–90 days', amount: 284000, count: 8,  pct: 9  },
  { label: '90+ days',  amount: 140000, count: 4,  pct: 4  },
];

const apAgingBands = [
  { label: 'Current',   amount: 412000, count: 18, pct: 46 },
  { label: '1–30 days', amount: 248000, count: 11, pct: 28 },
  { label: '31–60 days', amount: 142000, count: 7,  pct: 16 },
  { label: '61–90 days', amount: 64000,  count: 3,  pct: 7  },
  { label: '90+ days',  amount: 26000,  count: 2,  pct: 3  },
];

const invoices = [
  { id: 'INV-4821', customer: 'Stratford Industries',   amount: 48200,  paid: 48200,  due: 'Jul 25, 2026', issued: 'Jul 10, 2026', status: 'paid',    type: 'Sales Invoice' },
  { id: 'INV-4820', customer: 'Apex Global Ltd.',        amount: 31500,  paid: 0,      due: 'Jul 28, 2026', issued: 'Jul 13, 2026', status: 'pending',  type: 'Sales Invoice' },
  { id: 'INV-4819', customer: 'Meridian Corp',           amount: 92750,  paid: 0,      due: 'Aug 1, 2026',  issued: 'Jul 15, 2026', status: 'overdue',  type: 'Sales Invoice' },
  { id: 'INV-4818', customer: 'BlueSky Technologies',    amount: 7800,   paid: 0,      due: 'Aug 5, 2026',  issued: 'Jul 20, 2026', status: 'draft',    type: 'Sales Invoice' },
  { id: 'INV-4817', customer: 'Global Ventures Inc.',    amount: 156000, paid: 0,      due: 'Aug 10, 2026', issued: 'Jul 18, 2026', status: 'sent',     type: 'Sales Invoice' },
  { id: 'INV-4816', customer: 'Nexus Logistics',         amount: 24500,  paid: 24500,  due: 'Jul 20, 2026', issued: 'Jul 8, 2026',  status: 'paid',    type: 'Sales Invoice' },
  { id: 'INV-4815', customer: 'Northstar LLC',           amount: 18200,  paid: 10000,  due: 'Jul 22, 2026', issued: 'Jul 9, 2026',  status: 'partial',  type: 'Sales Invoice' },
];

const bills = [
  { id: 'BILL-0912', vendor: 'TechParts Ltd.',     amount: 12400,  due: 'Jul 30, 2026', issued: 'Jul 15, 2026', status: 'pending',  category: 'Materials' },
  { id: 'BILL-0911', vendor: 'Omega Suppliers',    amount: 8900,   due: 'Aug 3, 2026',  issued: 'Jul 16, 2026', status: 'paid',     category: 'Materials' },
  { id: 'BILL-0910', vendor: 'CloudInfra Inc.',    amount: 3200,   due: 'Aug 1, 2026',  issued: 'Jul 18, 2026', status: 'pending',  category: 'Software' },
  { id: 'BILL-0909', vendor: 'Vertex Supply Co.',  amount: 41800,  due: 'Jul 25, 2026', issued: 'Jul 10, 2026', status: 'overdue',  category: 'Equipment' },
  { id: 'BILL-0908', vendor: 'ProLogistics LLC',   amount: 6100,   due: 'Aug 8, 2026',  issued: 'Jul 20, 2026', status: 'draft',    category: 'Freight' },
  { id: 'BILL-0907', vendor: 'SteelMart Corp',     amount: 22400,  due: 'Jul 28, 2026', issued: 'Jul 12, 2026', status: 'pending',  category: 'Materials' },
];

const accounts = [
  { code: '1000', name: 'Cash & Cash Equivalents',      type: 'Asset',    normal: 'Debit',  balance: 1842000,  change: +12.4 },
  { code: '1100', name: 'Accounts Receivable',           type: 'Asset',    normal: 'Debit',  balance: 3241000,  change: +8.1  },
  { code: '1200', name: 'Inventory',                     type: 'Asset',    normal: 'Debit',  balance: 2408000,  change: -1.2  },
  { code: '1500', name: 'Property, Plant & Equipment',   type: 'Asset',    normal: 'Debit',  balance: 4820000,  change: +2.1  },
  { code: '1600', name: 'Accumulated Depreciation',      type: 'Asset',    normal: 'Credit', balance: -1240000, change: -5.8  },
  { code: '2000', name: 'Accounts Payable',              type: 'Liability', normal: 'Credit', balance: 892000,  change: +3.5  },
  { code: '2100', name: 'Accrued Liabilities',           type: 'Liability', normal: 'Credit', balance: 341000,  change: +1.8  },
  { code: '2200', name: 'Long-term Debt',                type: 'Liability', normal: 'Credit', balance: 2400000, change: -4.2  },
  { code: '3000', name: 'Share Capital',                 type: 'Equity',   normal: 'Credit', balance: 5000000, change: 0     },
  { code: '3100', name: 'Retained Earnings',             type: 'Equity',   normal: 'Credit', balance: 2841000, change: +21.5 },
  { code: '4000', name: 'Revenue',                       type: 'Income',   normal: 'Credit', balance: 7200000, change: +14.3 },
  { code: '5000', name: 'Cost of Goods Sold',            type: 'Expense',  normal: 'Debit',  balance: 3180000, change: +11.2 },
  { code: '6000', name: 'Salaries & Wages',              type: 'Expense',  normal: 'Debit',  balance: 1240000, change: +8.4  },
  { code: '6100', name: 'Rent & Utilities',              type: 'Expense',  normal: 'Debit',  balance: 284000,  change: +2.1  },
  { code: '6200', name: 'Depreciation Expense',          type: 'Expense',  normal: 'Debit',  balance: 182000,  change: 0     },
];

const journalEntries = [
  { id: 'JE-2841', date: 'Jul 28, 2026', ref: 'INV-4821', memo: 'Revenue recognition — Stratford Industries',    debit: 48200,  credit: 48200,  status: 'posted' },
  { id: 'JE-2840', date: 'Jul 27, 2026', ref: 'BILL-0912', memo: 'Vendor bill — TechParts Ltd.',                 debit: 12400,  credit: 12400,  status: 'posted' },
  { id: 'JE-2839', date: 'Jul 26, 2026', ref: 'PAY-0291', memo: 'Payment received — Meridian Corp',              debit: 31500,  credit: 31500,  status: 'posted' },
  { id: 'JE-2838', date: 'Jul 25, 2026', ref: 'DEP-0041', memo: 'Monthly depreciation — Plant & Equipment',      debit: 26000,  credit: 26000,  status: 'posted' },
  { id: 'JE-2837', date: 'Jul 24, 2026', ref: 'SAL-0712', memo: 'Payroll — July 2026 (342 employees)',           debit: 184000, credit: 184000, status: 'posted' },
  { id: 'JE-2836', date: 'Jul 23, 2026', ref: 'MISC-012', memo: 'Accrual — Q3 professional fees',               debit: 8400,   credit: 8400,   status: 'draft'  },
];

const ledgerEntries = [
  { date: 'Jul 28', ref: 'JE-2841', desc: 'Invoice payment — Stratford Industries', debit: 48200,  credit: 0,     balance: 1842000 },
  { date: 'Jul 27', ref: 'JE-2840', desc: 'Vendor payment — TechParts Ltd.',        debit: 0,      credit: 12400, balance: 1793800 },
  { date: 'Jul 26', ref: 'JE-2839', desc: 'Customer payment — Meridian Corp',       debit: 31500,  credit: 0,     balance: 1806200 },
  { date: 'Jul 25', ref: 'JE-2837', desc: 'Payroll disbursement — Jul 2026',        debit: 0,      credit: 184000,balance: 1774700 },
  { date: 'Jul 24', ref: 'JE-2836', desc: 'Office rent — August advance',            debit: 0,      credit: 22000, balance: 1958700 },
  { date: 'Jul 22', ref: 'JE-2835', desc: 'Sales order payment — Nexus Logistics',  debit: 24500,  credit: 0,     balance: 1980700 },
];

const bankRecon = {
  bankBalance: 1842000,
  bookBalance: 1798400,
  outstanding: [
    { ref: 'CHK-1041', date: 'Jul 26', desc: 'Vendor payment — Omega Suppliers',  amount: -8900  },
    { ref: 'CHK-1040', date: 'Jul 25', desc: 'Utility bill payment',              amount: -3200  },
    { ref: 'DEP-2204', date: 'Jul 28', desc: 'Customer receipt — Apex Global',    amount: 56100  },
  ],
};

const typeColor: Record<string, string> = {
  Asset:    'bg-blue-500/12 text-blue-400 border-blue-500/25',
  Liability:'bg-red-500/12 text-red-400 border-red-500/25',
  Equity:   'bg-purple-500/12 text-purple-400 border-purple-500/25',
  Income:   'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  Expense:  'bg-amber-500/12 text-amber-400 border-amber-500/25',
};

const fmt = (n: number) =>
  n < 0
    ? `(${Math.abs(n).toLocaleString()})`
    : `$${n.toLocaleString()}`;

// ─── Reusable table shell ─────────────────────────────────────────────────────
function TableShell({ headers, children, footer }: {
  headers: string[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {headers.map(h => (
              <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {footer && (
        <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
}

function TableRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={cn('border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors cursor-pointer group last:border-0', className)}>
      {children}
    </tr>
  );
}

function RowActions() {
  return (
    <td className="px-4 py-3">
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
        <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </td>
  );
}

function Pagination({ total, shown }: { total: string; shown: number }) {
  return (
    <>
      <p className="text-xs text-white/30">Showing {shown} of {total} records</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, '…', '24'].map((p, i) => (
          <button key={i} className={cn('w-7 h-7 rounded text-xs transition-colors', p === 1 ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.07]')}>{p}</button>
        ))}
      </div>
    </>
  );
}

function SectionCard({ title, subtitle, action, children }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-white/35 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function FilterBar({ placeholder, children }: { placeholder: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 p-4 border-b border-white/[0.06]">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
        <Input placeholder={placeholder} className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm" />
      </div>
      <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
        <Calendar className="w-3.5 h-3.5 mr-1.5" />Date Range
      </Button>
      <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
        <Filter className="w-3.5 h-3.5 mr-1.5" />Filter
      </Button>
      {children}
      <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8 ml-auto">
        <Download className="w-3.5 h-3.5 mr-1.5" />Export
      </Button>
    </div>
  );
}

// ─── Statement row helper (P&L / Balance Sheet) ───────────────────────────────
function StatRow({ label, value, indent = 0, bold = false, separator = false, highlight = false }: {
  label?: string; value?: string; indent?: number; bold?: boolean; separator?: boolean; highlight?: boolean;
}) {
  if (separator) return <tr><td colSpan={2} className="px-4 py-1.5"><div className="h-px bg-white/[0.06]" /></td></tr>;
  return (
    <tr className={cn('group', highlight ? 'bg-[#2563EB]/8' : 'hover:bg-white/[0.02]')}>
      <td className={cn('px-4 py-2 text-sm', bold ? 'font-semibold text-white' : 'text-white/60')}
          style={{ paddingLeft: `${16 + indent * 20}px` }}>
        {label}
      </td>
      <td className={cn('px-4 py-2 text-sm text-right tabular-nums', bold ? 'font-semibold text-white' : 'text-white/70')}>
        {value}
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Finance() {
  const [tab, setTab] = useState('overview');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const { data: dashData, isLoading: dashLoading } = useFinanceDashboard();

  // Live KPI values — fall back to em-dash while loading
  const liveRevenue  = dashData ? fmtMoney(dashData.kpis.totalRevenue)  : '—';
  const liveCashBal  = dashData ? fmtMoney(dashData.kpis.cashBalance)   : '—';
  const liveNetProfit= dashData ? fmtMoney(dashData.kpis.netProfit)     : '—';
  const liveExpenses = dashData ? fmtMoney(dashData.kpis.totalExpenses) : '—';

  // Revenue chart: use API monthly data; fall back to static while loading
  const chartData = dashData?.monthlyPL ?? plData;

  const kpis = [
    { label: 'Total Revenue',  value: dashLoading ? '…' : liveRevenue,   change: '+14.3%', up: true,  icon: TrendingUp,   iconColor: 'text-[#2563EB]', gradient: 'bg-[#2563EB]/15',  sparkline: [4.2,5.1,4.8,6.3,5.9,7.2,8.1], changeLabel: 'YTD 2026' },
    { label: 'Cash Balance',   value: dashLoading ? '…' : liveCashBal,   change: '+12.4%', up: true,  icon: DollarSign,   iconColor: 'text-emerald-400',gradient: 'bg-emerald-500/15', sparkline: [1.4,1.6,1.7,1.7,1.8,1.8,1.8], changeLabel: 'Liquid funds' },
    { label: 'Net Profit',     value: dashLoading ? '…' : liveNetProfit, change: '+21.5%', up: true,  icon: ArrowUpRight, iconColor: 'text-purple-400', gradient: 'bg-purple-500/15',  sparkline: [0.7,1.0,1.0,1.5,1.4,1.8,2.1], changeLabel: 'NP margin 25%' },
    { label: 'Accounts Receivable', value: '$3.2M', change: '+8.1%',     up: false, icon: CreditCard, iconColor: 'text-amber-400', gradient: 'bg-amber-500/15', sparkline: [2.8,2.9,3.0,3.1,3.0,3.1,3.2], changeLabel: 'DSO: 38 days' },
    { label: 'Accounts Payable',    value: '$892K', change: '+3.5%',     up: false, icon: Banknote,   iconColor: 'text-red-400',   gradient: 'bg-red-500/15',   sparkline: [820,850,860,870,880,888,892], changeLabel: 'DPO: 28 days' },
    { label: 'Total Expenses', value: dashLoading ? '…' : liveExpenses,  change: '+9.2%',  up: false, icon: TrendingDown, iconColor: 'text-[#06B6D4]',  gradient: 'bg-[#06B6D4]/15',  sparkline: [1.8,1.9,1.9,2.1,2.0,2.2,2.4], changeLabel: 'vs $2.2M target' },
  ];

  return (
    <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'Financial Accounting' }]}>
      <div className="p-6 max-w-[1800px] mx-auto space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Financial Accounting</h1>
            <p className="text-sm text-white/40 mt-0.5">General Ledger · FY 2026 · Q3 &nbsp;·&nbsp; Apex Global Inc.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              <Upload className="w-3.5 h-3.5 mr-1.5" />Import
            </Button>
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
              <Download className="w-3.5 h-3.5 mr-1.5" />Export
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
              <Plus className="w-3.5 h-3.5 mr-1.5" />New Entry
            </Button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map((k, i) => <KPICard key={k.label} {...k} index={i} />)}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto">
            <TabsList className="bg-white/[0.04] border border-white/[0.07] h-9 p-0.5 inline-flex min-w-max">
              {[
                { value: 'overview',  label: 'Overview',        icon: ReceiptText },
                { value: 'invoices',  label: 'Receivables',     icon: ArrowUpRight },
                { value: 'bills',     label: 'Payables',        icon: ArrowDownRight },
                { value: 'accounts',  label: 'Chart of Accounts', icon: BookOpen },
                { value: 'ledger',    label: 'General Ledger',  icon: Layers },
                { value: 'journal',   label: 'Journal Entries', icon: FileText },
                { value: 'pl',        label: 'P&L Statement',   icon: TrendingUp },
                { value: 'bs',        label: 'Balance Sheet',   icon: Scale },
                { value: 'cf',        label: 'Cash Flow',       icon: Wallet },
                { value: 'tb',        label: 'Trial Balance',   icon: CheckCircle2 },
                { value: 'recon',     label: 'Bank Reconciliation', icon: GitMerge },
              ].map(t => (
                <TabsTrigger key={t.value} value={t.value}
                  className="text-xs h-8 px-3 data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/40 gap-1.5 whitespace-nowrap">
                  <t.icon className="w-3.5 h-3.5" />{t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* P&L Chart */}
              <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Profit & Loss — Monthly</h3>
                    <p className="text-xs text-white/35 mt-0.5">Revenue, COGS, and Net Profit · FY 2026</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
                    <TrendingUp className="w-4 h-4" />+21.5% net profit
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chartData} margin={{ left: -20, right: 5, top: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="revenue" name="Revenue" fill="#2563EB" fillOpacity={0.5} radius={[3,3,0,0]} />
                    <Bar dataKey="cogs"    name="COGS"    fill="#EF4444" fillOpacity={0.4} radius={[3,3,0,0]} />
                    <Line type="monotone" dataKey="net" name="Net Profit" stroke="#22C55E" strokeWidth={2} dot={{ fill:'#22C55E', r:3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-5 mt-2">
                  {[{l:'Revenue',c:'#2563EB'},{l:'COGS',c:'#EF4444'},{l:'Net Profit',c:'#22C55E'}].map(x=>(
                    <span key={x.l} className="flex items-center gap-1.5 text-xs text-white/40">
                      <span className="w-3 h-0.5 rounded-full inline-block" style={{background:x.c}} />{x.l}
                    </span>
                  ))}
                </div>
              </div>

              {/* AR/AP Aging */}
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">AR / AP Aging Summary</h3>
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-400">Accounts Receivable</span>
                    <span className="text-xs font-bold text-white">$3.24M</span>
                  </div>
                  {arAgingBands.map(b => (
                    <div key={b.label} className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] text-white/40 w-20 flex-shrink-0">{b.label}</span>
                      <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{width:`${b.pct}%`}} />
                      </div>
                      <span className="text-[11px] font-medium text-white w-16 text-right">${(b.amount/1000).toFixed(0)}K</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/[0.06] pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-red-400">Accounts Payable</span>
                    <span className="text-xs font-bold text-white">$892K</span>
                  </div>
                  {apAgingBands.map(b => (
                    <div key={b.label} className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] text-white/40 w-20 flex-shrink-0">{b.label}</span>
                      <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{width:`${b.pct}%`}} />
                      </div>
                      <span className="text-[11px] font-medium text-white w-16 text-right">${(b.amount/1000).toFixed(0)}K</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cash Flow + Recent Transactions */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Cash Flow</h3>
                    <p className="text-xs text-white/35 mt-0.5">Operating · Investing · Financing</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={cashFlowData} margin={{ left: -20, right: 5, top: 5 }} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.035)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}M`} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="operating"  name="Operating"  fill="#22C55E" radius={[3,3,0,0]} />
                    <Bar dataKey="investing"  name="Investing"  fill="#EF4444" radius={[3,3,0,0]} />
                    <Bar dataKey="financing"  name="Financing"  fill="#A78BFA" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Recent Transactions</h3>
                  <button className="text-xs text-[#2563EB] hover:text-[#60A5FA] flex items-center gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {dashLoading && (
                    <p className="text-xs text-white/30 py-4 text-center">Loading…</p>
                  )}
                  {(dashData?.recentTransactions ?? []).slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                        t.direction === 'credit' ? 'bg-emerald-500/15' : 'bg-red-500/15')}>
                        {t.direction === 'credit'
                          ? <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                          : <ArrowDownRight className="w-3 h-3 text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/75 truncate">{t.description}</p>
                        <p className="text-[10px] text-white/30">{timeAgo(t.transactedAt)}</p>
                      </div>
                      <span className={cn('text-xs font-semibold flex-shrink-0',
                        t.direction === 'credit' ? 'text-emerald-400' : 'text-red-400')}>
                        {t.direction === 'credit' ? '+' : '-'}{fmtMoney(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── RECEIVABLES ───────────────────────────────────────────────── */}
          <TabsContent value="invoices" className="mt-4 space-y-4">
            {/* AR Aging Bands */}
            <div className="grid grid-cols-5 gap-3">
              {arAgingBands.map((b, i) => (
                <motion.div key={b.label} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.06 }}
                  className={cn('bg-[#0a0f1e] border rounded-xl p-4 cursor-pointer transition-all hover:border-white/[0.14]',
                    i === 0 ? 'border-emerald-500/25' : i < 3 ? 'border-amber-500/20' : 'border-red-500/25')}>
                  <p className="text-[11px] font-medium text-white/40 mb-2">{b.label}</p>
                  <p className="text-lg font-bold text-white">${(b.amount/1000).toFixed(0)}K</p>
                  <p className="text-xs text-white/30 mt-0.5">{b.count} invoices</p>
                  <div className="mt-3 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{width:`${b.pct}%`, background: i===0?'#22C55E': i<3?'#F59E0B':'#EF4444'}} />
                  </div>
                </motion.div>
              ))}
            </div>

            <TableShell
              headers={['Invoice #', 'Customer', 'Type', 'Issued', 'Due Date', 'Amount', 'Balance Due', 'Status', '']}
              footer={<Pagination total="248" shown={invoices.length} />}
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={9} className="p-0">
                  <FilterBar placeholder="Search invoices, customers...">
                    <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />New Invoice
                    </Button>
                  </FilterBar>
                </td>
              </tr>
              {invoices.map(inv => (
                <TableRow key={inv.id}>
                  <td className="px-4 py-3 text-sm font-mono text-[#2563EB] font-medium">{inv.id}</td>
                  <td className="px-4 py-3 text-sm text-white/80 font-medium">{inv.customer}</td>
                  <td className="px-4 py-3 text-xs text-white/40">{inv.type}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{inv.issued}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{inv.due}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">${inv.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-semibold">
                    <span className={inv.amount - inv.paid > 0 ? 'text-amber-400' : 'text-white/30'}>
                      {inv.amount - inv.paid === 0 ? '—' : `$${(inv.amount - inv.paid).toLocaleString()}`}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <RowActions />
                </TableRow>
              ))}
            </TableShell>
          </TabsContent>

          {/* ── PAYABLES ──────────────────────────────────────────────────── */}
          <TabsContent value="bills" className="mt-4 space-y-4">
            <div className="grid grid-cols-5 gap-3">
              {apAgingBands.map((b, i) => (
                <motion.div key={b.label} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.06 }}
                  className={cn('bg-[#0a0f1e] border rounded-xl p-4 cursor-pointer transition-all hover:border-white/[0.14]',
                    i === 0 ? 'border-emerald-500/25' : i < 3 ? 'border-amber-500/20' : 'border-red-500/25')}>
                  <p className="text-[11px] font-medium text-white/40 mb-2">{b.label}</p>
                  <p className="text-lg font-bold text-white">${(b.amount/1000).toFixed(0)}K</p>
                  <p className="text-xs text-white/30 mt-0.5">{b.count} bills</p>
                  <div className="mt-3 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{width:`${b.pct}%`, background: i===0?'#22C55E': i<3?'#F59E0B':'#EF4444'}} />
                  </div>
                </motion.div>
              ))}
            </div>
            <TableShell
              headers={['Bill #', 'Vendor', 'Category', 'Issued', 'Due Date', 'Amount', 'Status', '']}
              footer={<Pagination total="124" shown={bills.length} />}
            >
              <tr className="border-b border-white/[0.06]">
                <td colSpan={8} className="p-0">
                  <FilterBar placeholder="Search bills, vendors...">
                    <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] h-8">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />New Bill
                    </Button>
                  </FilterBar>
                </td>
              </tr>
              {bills.map(b => (
                <TableRow key={b.id}>
                  <td className="px-4 py-3 text-sm font-mono text-[#06B6D4] font-medium">{b.id}</td>
                  <td className="px-4 py-3 text-sm text-white/80 font-medium">{b.vendor}</td>
                  <td className="px-4 py-3">
                    <Badge className="bg-white/[0.05] text-white/50 border-white/10 text-xs">{b.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/50">{b.issued}</td>
                  <td className="px-4 py-3 text-sm text-white/50">{b.due}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">${b.amount.toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <RowActions />
                </TableRow>
              ))}
            </TableShell>
          </TabsContent>

          {/* ── CHART OF ACCOUNTS ─────────────────────────────────────────── */}
          <TabsContent value="accounts" className="mt-4">
            <ChartOfAccountsTab />
          </TabsContent>

          {/* ── GENERAL LEDGER ────────────────────────────────────────────── */}
          <TabsContent value="ledger" className="mt-4">
            <GeneralLedgerTab />
          </TabsContent>

          {/* ── JOURNAL ENTRIES ───────────────────────────────────────────── */}
          <TabsContent value="journal" className="mt-4">
            <JournalEntriesTab />
          </TabsContent>

          {/* ── P&L STATEMENT ─────────────────────────────────────────────── */}
          <TabsContent value="pl" className="mt-4">
            <ProfitLossTab />
            <div className="hidden bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-sm font-semibold text-white">Profit & Loss Statement</h3>
                  <p className="text-xs text-white/35 mt-0.5">Apex Global Inc. · Jan 1 – Jul 28, 2026</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />Period
                  </Button>
                  <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-white hover:bg-white/[0.05] h-8">
                    <Download className="w-3.5 h-3.5 mr-1.5" />Export PDF
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">Description</th>
                      <th className="text-right text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3 w-36">Current Period</th>
                      <th className="text-right text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3 w-36">Prior Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    <StatRow label="REVENUE" bold separator={false} />
                    <StatRow label="Product Sales"               value="$6,841,200" indent={1} />
                    <StatRow label="Service Revenue"             value="$358,800"   indent={1} />
                    <StatRow label="Total Revenue"               value="$7,200,000" bold highlight />
                    <StatRow separator />
                    <StatRow label="COST OF GOODS SOLD" bold />
                    <StatRow label="Direct Materials"            value="$2,184,000" indent={1} />
                    <StatRow label="Direct Labor"                value="$648,000"   indent={1} />
                    <StatRow label="Manufacturing Overhead"      value="$348,000"   indent={1} />
                    <StatRow label="Total COGS"                  value="$3,180,000" bold />
                    <StatRow separator />
                    <StatRow label="GROSS PROFIT"                value="$4,020,000" bold highlight />
                    <StatRow label="Gross Profit Margin"         value="55.8%"      indent={1} />
                    <StatRow separator />
                    <StatRow label="OPERATING EXPENSES" bold />
                    <StatRow label="Salaries & Wages"            value="$1,240,000" indent={1} />
                    <StatRow label="Rent & Utilities"            value="$284,000"   indent={1} />
                    <StatRow label="Marketing & Advertising"     value="$192,000"   indent={1} />
                    <StatRow label="Depreciation"                value="$182,000"   indent={1} />
                    <StatRow label="Professional Fees"           value="$84,000"    indent={1} />
                    <StatRow label="Other Operating Expenses"    value="$418,000"   indent={1} />
                    <StatRow label="Total Operating Expenses"    value="$2,400,000" bold />
                    <StatRow separator />
                    <StatRow label="EBIT (Operating Profit)"     value="$1,620,000" bold highlight />
                    <StatRow label="Interest Income"             value="$48,000"    indent={1} />
                    <StatRow label="Interest Expense"            value="($82,000)"  indent={1} />
                    <StatRow separator />
                    <StatRow label="Profit Before Tax"           value="$1,586,000" bold />
                    <StatRow label="Income Tax (18%)"            value="($285,480)" indent={1} />
                    <StatRow separator />
                    <StatRow label="NET PROFIT"                  value="$1,300,520" bold highlight />
                    <StatRow label="Net Profit Margin"           value="18.1%"      indent={1} />
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── BALANCE SHEET ─────────────────────────────────────────────── */}
          <TabsContent value="bs" className="mt-4">
            <BalanceSheetTab />
          </TabsContent>

          {/* ── CASH FLOW ─────────────────────────────────────────────────── */}
          <TabsContent value="cf" className="mt-4">
            <CashFlowTab />
          </TabsContent>

          {/* ── TRIAL BALANCE ─────────────────────────────────────────────── */}
          <TabsContent value="tb" className="mt-4">
            <TrialBalanceTab />
          </TabsContent>

          {/* ── BANK RECONCILIATION ───────────────────────────────────────── */}
          <TabsContent value="recon" className="mt-4 space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Bank Statement Balance', value: `$${bankRecon.bankBalance.toLocaleString()}`, color: 'text-white', border: 'border-white/[0.07]' },
                { label: 'Outstanding Items',       value: `$${(bankRecon.bankBalance - bankRecon.bookBalance).toLocaleString()}`, color: 'text-amber-400', border: 'border-amber-500/20' },
                { label: 'Book Balance (Adjusted)', value: `$${bankRecon.bookBalance.toLocaleString()}`, color: 'text-emerald-400', border: 'border-emerald-500/20' },
              ].map(s => (
                <div key={s.label} className={cn('bg-[#0a0f1e] border rounded-xl p-4', s.border)}>
                  <p className="text-xs text-white/40 mb-2">{s.label}</p>
                  <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                </div>
              ))}
            </div>
            {/* Outstanding items */}
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white">Outstanding / Unmatched Items</h3>
                <p className="text-xs text-white/35 mt-0.5">Items in bank statement not yet matched to book entries</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {['Reference','Date','Description','Amount','Action'].map(h=>(
                      <th key={h} className="text-left text-[11px] font-semibold text-white/30 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bankRecon.outstanding.map((item, i) => (
                    <TableRow key={i}>
                      <td className="px-4 py-3 text-sm font-mono text-[#2563EB]">{item.ref}</td>
                      <td className="px-4 py-3 text-sm text-white/50">{item.date}</td>
                      <td className="px-4 py-3 text-sm text-white/75">{item.desc}</td>
                      <td className={cn('px-4 py-3 text-sm font-semibold tabular-nums',
                        item.amount > 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {item.amount > 0 ? '+' : ''}${Math.abs(item.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline"
                          className="border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/10 h-7 text-xs px-2">
                          <GitMerge className="w-3 h-3 mr-1" />Match
                        </Button>
                      </td>
                    </TableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
}
