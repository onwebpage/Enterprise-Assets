import { useState } from "react";
import {
  ArrowLeftRight,
  ArrowRightLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  FileText,
  GitMerge,
  Layers,
  ReceiptText,
  Scale,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinanceDashboard } from "@/hooks/useFinanceDashboard";
import ChartOfAccountsTab from "@/components/app/finance/ChartOfAccountsTab";
import GeneralLedgerTab from "@/components/app/finance/GeneralLedgerTab";
import JournalEntriesTab from "@/components/app/finance/JournalEntriesTab";
import TrialBalanceTab from "@/components/app/finance/TrialBalanceTab";
import ProfitLossTab from "@/components/app/finance/ProfitLossTab";
import BalanceSheetTab from "@/components/app/finance/BalanceSheetTab";
import CashFlowTab from "@/components/app/finance/CashFlowTab";
import PeriodClosingTab from "@/components/app/finance/PeriodClosingTab";
import IntercompanyTab from "@/components/app/finance/IntercompanyTab";
import MultiCurrencyTab from "@/components/app/finance/MultiCurrencyTab";
import FinancialControlsTab from "@/components/app/finance/FinancialControlsTab";
import FinanceCommandCenter from "@/components/app/finance/FinanceCommandCenter";

const tabs = [
  { value: "overview", label: "Overview", icon: ReceiptText },
  { value: "accounts", label: "Chart of Accounts", icon: BookOpen },
  { value: "ledger", label: "General Ledger", icon: Layers },
  { value: "journal", label: "Journal Entries", icon: FileText },
  { value: "pl", label: "P&L Statement", icon: TrendingUp },
  { value: "bs", label: "Balance Sheet", icon: Scale },
  { value: "cf", label: "Cash Flow", icon: Wallet },
  { value: "tb", label: "Trial Balance", icon: CheckCircle2 },
  { value: "closing", label: "Period Closing", icon: CalendarClock },
  { value: "intercompany", label: "Intercompany", icon: ArrowLeftRight },
  { value: "multi-currency", label: "Multi-Currency", icon: ArrowRightLeft },
  { value: "controls", label: "Financial Controls", icon: ShieldCheck },
];

function LinkedModuleCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-5 transition-colors hover:border-white/[0.14] hover:bg-[#0d1225]"
    >
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-1 text-xs text-white/35">{description}</p>
      </div>
      <Button variant="ghost" size="sm" className="text-blue-300 hover:bg-blue-500/10 hover:text-blue-200">
        Open <span className="ml-1">→</span>
      </Button>
    </a>
  );
}

export default function Finance() {
  const [tab, setTab] = useState("overview");
  const { data, isLoading, refetch } = useFinanceDashboard();

  const openModule = (module: string) => {
    const routes: Record<string, string> = {
      invoices: "/app/ar",
      bills: "/app/ap",
      recon: "/app/banking",
      treasury: "/app/cash-treasury",
    };
    if (routes[module]) window.location.href = routes[module];
    else setTab(module);
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Finance" }, { label: "Financial Accounting" }]}>
      <div className="mx-auto max-w-[1800px] space-y-5 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Financial accounting</h1>
            <p className="mt-1 text-sm text-white/40">
              Live balances, accounting records, statements, and financial controls.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkedModuleCard title="Accounts receivable" description="Customers, invoices, and collections" href="/app/ar" />
            <LinkedModuleCard title="Accounts payable" description="Vendors, bills, and payments" href="/app/ap" />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-9 min-w-max border border-white/[0.07] bg-white/[0.04] p-0.5">
              {tabs.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-8 gap-1.5 whitespace-nowrap px-3 text-xs text-white/40 data-[state=active]:bg-[#2563EB] data-[state=active]:text-white"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <FinanceCommandCenter
              data={data}
              isLoading={isLoading}
              onRefresh={() => void refetch()}
              onTab={openModule}
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <LinkedModuleCard title="Banking and reconciliation" description="Manage bank accounts, transactions, and matching" href="/app/banking" />
              <LinkedModuleCard title="Cash and treasury" description="Manage treasury balances and cash operations" href="/app/cash-treasury" />
            </div>
          </TabsContent>
          <TabsContent value="accounts" className="mt-4"><ChartOfAccountsTab /></TabsContent>
          <TabsContent value="ledger" className="mt-4"><GeneralLedgerTab /></TabsContent>
          <TabsContent value="journal" className="mt-4"><JournalEntriesTab /></TabsContent>
          <TabsContent value="pl" className="mt-4"><ProfitLossTab /></TabsContent>
          <TabsContent value="bs" className="mt-4"><BalanceSheetTab /></TabsContent>
          <TabsContent value="cf" className="mt-4"><CashFlowTab /></TabsContent>
          <TabsContent value="tb" className="mt-4"><TrialBalanceTab /></TabsContent>
          <TabsContent value="closing" className="mt-4"><PeriodClosingTab /></TabsContent>
          <TabsContent value="intercompany" className="mt-4"><IntercompanyTab /></TabsContent>
          <TabsContent value="multi-currency" className="mt-4"><MultiCurrencyTab /></TabsContent>
          <TabsContent value="controls" className="mt-4"><FinancialControlsTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}