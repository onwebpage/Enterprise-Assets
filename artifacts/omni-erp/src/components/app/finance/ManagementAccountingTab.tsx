import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDollarSign,
  FileBarChart2,
  GitBranch,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  useAllocationRules,
  useAllocationRuns,
  useCostCentres,
  useCreateAllocationRule,
  useDeleteAllocationRule,
  useDeleteAllocationRun,
  useGenerateAllocationRun,
  usePostAllocationRun,
  useProfitability,
  useProfitCentres,
  useUpdateAllocationRule,
  type AllocationRule,
  type AllocationRun,
  type CostCentre,
  type ProfitCentre,
} from "@/hooks/useBudgetCost";

type RuleDraft = {
  name: string;
  sourceCostCentreId: string;
  targetProfitCentreId: string;
  basis: AllocationRule["basis"];
  rate: string;
  fixedAmount: string;
  notes: string;
};

const field =
  "h-9 border-white/[0.1] bg-white/[0.045] text-sm text-white placeholder:text-white/25 focus-visible:ring-cyan-400/50";
const select =
  "h-9 w-full rounded-md border border-white/[0.1] bg-[#111a2b] px-3 text-sm text-white outline-none transition-colors focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/50";

const currentPeriod = new Date().toISOString().slice(0, 7);

function number(value: unknown, fractionDigits = 2) {
  return Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function money(value: unknown) {
  return `$${number(value)}`;
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message) return error.message.slice(0, 180);
  return "The request could not be completed. Please try again.";
}

function formatBasis(basis: AllocationRule["basis"]) {
  return basis === "fixed" ? "Fixed amount" : basis === "budget" ? "Budget share" : "Percentage";
}

function statusClass(status: AllocationRun["status"]) {
  if (status === "posted") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (status === "cancelled") return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
      {children}
    </p>
  );
}

function InlineLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-xs text-white/35">
      <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
      Loading management accounting data
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof GitBranch;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 rounded-full border border-white/[0.08] bg-white/[0.035] p-3 text-white/30">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-white/70">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-white/35">{description}</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-rose-300">Unable to load this panel</p>
      <p className="mt-1 text-xs text-white/35">Check your connection, then retry.</p>
      <Button
        data-testid="button-retry-management-accounting"
        onClick={onRetry}
        variant="outline"
        size="sm"
        className="mt-3 border-white/10 bg-transparent text-white/65"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}

function RuleEditor({
  draft,
  editingRule,
  costCentres,
  profitCentres,
  isPending,
  onChange,
  onSubmit,
  onClose,
}: {
  draft: RuleDraft;
  editingRule: AllocationRule | null;
  costCentres: CostCentre[];
  profitCentres: ProfitCentre[];
  isPending: boolean;
  onChange: (key: keyof RuleDraft, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-cyan-400/20 bg-[#0b1526] p-4 shadow-[0_16px_60px_rgba(6,182,212,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionLabel>{editingRule ? "Edit allocation rule" : "New allocation rule"}</SectionLabel>
          <h3 className="mt-1 text-sm font-semibold text-white">
            {editingRule ? editingRule.rule_number : "Define an auditable cost flow"}
          </h3>
        </div>
        <Button
          data-testid="button-close-rule-editor"
          aria-label="Close rule editor"
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white/40 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="allocation-rule-name" className="mb-1 block text-[11px] text-white/45">
            Rule name <span className="text-cyan-300">*</span>
          </label>
          <Input
            id="allocation-rule-name"
            data-testid="input-allocation-rule-name"
            className={field}
            value={draft.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="Corporate facilities → retail"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="allocation-rule-source" className="mb-1 block text-[11px] text-white/45">
              Source cost centre <span className="text-cyan-300">*</span>
            </label>
            <select
              id="allocation-rule-source"
              data-testid="select-allocation-rule-source"
              className={select}
              value={draft.sourceCostCentreId}
              onChange={(event) => onChange("sourceCostCentreId", event.target.value)}
            >
              <option value="">Select source</option>
              {(costCentres ?? []).map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.code} · {centre.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="allocation-rule-target" className="mb-1 block text-[11px] text-white/45">
              Target profit centre <span className="text-cyan-300">*</span>
            </label>
            <select
              id="allocation-rule-target"
              data-testid="select-allocation-rule-target"
              className={select}
              value={draft.targetProfitCentreId}
              onChange={(event) => onChange("targetProfitCentreId", event.target.value)}
            >
              <option value="">Select target</option>
              {(profitCentres ?? []).map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.code} · {centre.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
          <div>
            <label htmlFor="allocation-rule-basis" className="mb-1 block text-[11px] text-white/45">
              Allocation basis
            </label>
            <select
              id="allocation-rule-basis"
              data-testid="select-allocation-rule-basis"
              className={select}
              value={draft.basis}
              onChange={(event) => onChange("basis", event.target.value)}
            >
              <option value="percentage">Percentage of source</option>
              <option value="budget">Budget share</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </div>
          <div>
            <label htmlFor="allocation-rule-value" className="mb-1 block text-[11px] text-white/45">
              {draft.basis === "fixed" ? "Fixed amount" : "Rate"}{" "}
              <span className="text-cyan-300">*</span>
            </label>
            <Input
              id="allocation-rule-value"
              data-testid="input-allocation-rule-value"
              className={field}
              type="number"
              min="0"
              step="0.01"
              value={draft.basis === "fixed" ? draft.fixedAmount : draft.rate}
              onChange={(event) =>
                onChange(draft.basis === "fixed" ? "fixedAmount" : "rate", event.target.value)
              }
              placeholder={draft.basis === "fixed" ? "0.00" : "0.00"}
            />
          </div>
        </div>

        <div>
          <label htmlFor="allocation-rule-notes" className="mb-1 block text-[11px] text-white/45">
            Audit note <span className="text-white/25">(optional)</span>
          </label>
          <Input
            id="allocation-rule-notes"
            data-testid="input-allocation-rule-notes"
            className={field}
            value={draft.notes}
            onChange={(event) => onChange("notes", event.target.value)}
            placeholder="Document the management rationale"
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2 border-t border-white/[0.07] pt-3">
        <Button
          data-testid="button-save-allocation-rule"
          onClick={onSubmit}
          disabled={
            isPending ||
            !draft.name.trim() ||
            !draft.sourceCostCentreId ||
            !draft.targetProfitCentreId ||
            (draft.basis === "fixed" ? !draft.fixedAmount : !draft.rate)
          }
          className="h-8 bg-cyan-600 px-3 text-xs text-white hover:bg-cyan-500"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {editingRule ? "Save changes" : "Create rule"}
        </Button>
        <Button
          data-testid="button-cancel-allocation-rule"
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="text-white/45"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function ManagementAccountingTab() {
  const { toast } = useToast();
  const [period, setPeriod] = useState(currentPeriod);
  const [editingRule, setEditingRule] = useState<AllocationRule | null>(null);
  const [isRuleEditorOpen, setIsRuleEditorOpen] = useState(false);
  const [draft, setDraft] = useState<RuleDraft>({
    name: "",
    sourceCostCentreId: "",
    targetProfitCentreId: "",
    basis: "percentage",
    rate: "",
    fixedAmount: "",
    notes: "",
  });

  const costCentresQuery = useCostCentres();
  const profitCentresQuery = useProfitCentres();
  const rulesQuery = useAllocationRules();
  const runsQuery = useAllocationRuns();
  const profitabilityQuery = useProfitability(period);

  const createRule = useCreateAllocationRule();
  const updateRule = useUpdateAllocationRule();
  const deleteRule = useDeleteAllocationRule();
  const generateRun = useGenerateAllocationRun();
  const postRun = usePostAllocationRun();
  const deleteRun = useDeleteAllocationRun();

  const costCentres = costCentresQuery.data?.data ?? [];
  const profitCentres = profitCentresQuery.data?.data ?? [];
  const rules = rulesQuery.data?.data ?? [];
  const runs = runsQuery.data?.data ?? [];
  const report = profitabilityQuery.data?.data;
  const activeRules = useMemo(() => rules.filter((rule) => rule.is_active), [rules]);
  const periodRuns = useMemo(() => runs.filter((run) => run.period === period), [runs, period]);

  const openCreateRule = () => {
    setEditingRule(null);
    setDraft({
      name: "",
      sourceCostCentreId: "",
      targetProfitCentreId: "",
      basis: "percentage",
      rate: "",
      fixedAmount: "",
      notes: "",
    });
    setIsRuleEditorOpen(true);
  };

  const openEditRule = (rule: AllocationRule) => {
    setEditingRule(rule);
    setDraft({
      name: rule.name,
      sourceCostCentreId: String(rule.source_cost_centre_id),
      targetProfitCentreId: String(rule.target_profit_centre_id),
      basis: rule.basis,
      rate: rule.rate ?? "",
      fixedAmount: rule.fixed_amount ?? "",
      notes: rule.notes ?? "",
    });
    setIsRuleEditorOpen(true);
  };

  const closeRuleEditor = () => {
    setIsRuleEditorOpen(false);
    setEditingRule(null);
  };

  const updateDraft = (key: keyof RuleDraft, value: string) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
  };

  const saveRule = async () => {
    const payload = {
      name: draft.name.trim(),
      sourceCostCentreId: Number(draft.sourceCostCentreId),
      targetProfitCentreId: Number(draft.targetProfitCentreId),
      basis: draft.basis,
      rate: Number(draft.rate) || 0,
      fixedAmount: Number(draft.fixedAmount) || 0,
      isActive: editingRule?.is_active ?? true,
      notes: draft.notes.trim() || null,
    };
    try {
      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, data: payload });
        toast({ title: "Allocation rule updated", description: "The rule is ready for the next run." });
      } else {
        await createRule.mutateAsync(payload);
        toast({ title: "Allocation rule created", description: "The rule has been added as active." });
      }
      closeRuleEditor();
    } catch (error) {
      toast({
        title: editingRule ? "Could not update allocation rule" : "Could not create allocation rule",
        description: readableError(error),
        variant: "destructive",
      });
    }
  };

  const toggleRule = async (rule: AllocationRule) => {
    try {
      await updateRule.mutateAsync({
        id: rule.id,
        data: { isActive: !rule.is_active },
      });
      toast({
        title: rule.is_active ? "Rule paused" : "Rule activated",
        description: `${rule.rule_number} will ${rule.is_active ? "not " : ""}be included in new runs.`,
      });
    } catch (error) {
      toast({ title: "Could not change rule status", description: readableError(error), variant: "destructive" });
    }
  };

  const removeRule = async (rule: AllocationRule) => {
    if (!window.confirm(`Delete ${rule.rule_number}? This cannot be undone.`)) return;
    try {
      await deleteRule.mutateAsync(rule.id);
      toast({ title: "Allocation rule deleted" });
      if (editingRule?.id === rule.id) closeRuleEditor();
    } catch (error) {
      toast({ title: "Could not delete allocation rule", description: readableError(error), variant: "destructive" });
    }
  };

  const createRun = async () => {
    try {
      await generateRun.mutateAsync({ period });
      toast({ title: "Allocation run generated", description: `${period} was generated from active rules.` });
    } catch (error) {
      toast({ title: "Could not generate allocation run", description: readableError(error), variant: "destructive" });
    }
  };

  const postAllocationRun = async (run: AllocationRun) => {
    try {
      await postRun.mutateAsync(run.id);
      toast({ title: "Allocation run posted", description: `${run.run_number} is now reflected in management reporting.` });
    } catch (error) {
      toast({ title: "Could not post allocation run", description: readableError(error), variant: "destructive" });
    }
  };

  const removeAllocationRun = async (run: AllocationRun) => {
    if (!window.confirm(`Delete ${run.run_number}?`)) return;
    try {
      await deleteRun.mutateAsync(run.id);
      toast({ title: "Allocation run deleted" });
    } catch (error) {
      toast({ title: "Could not delete allocation run", description: readableError(error), variant: "destructive" });
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const rows = [
      ["Period", "Profit centre code", "Profit centre", "Revenue", "Budget cost", "Allocated cost", "Total cost", "Contribution", "Margin %"],
      ...report.rows.map((row) => [
        report.period,
        row.code,
        row.name,
        row.revenue,
        row.budget_cost,
        row.allocated_cost,
        row.total_cost,
        row.contribution,
        row.margin_pct,
      ]),
      ["", "", "Total", report.totals.revenue, "", "", report.totals.totalCost, report.totals.contribution, report.totals.marginPct],
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `profitability-${report.period}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast({ title: "Profitability report downloaded", description: `CSV export for ${report.period}.` });
  };

  const reportError = profitabilityQuery.isError;
  const rulesError = rulesQuery.isError || costCentresQuery.isError || profitCentresQuery.isError;
  const isRuleMutationPending = createRule.isPending || updateRule.isPending;

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(115deg,#0b1425_0%,#0a1321_55%,#0c1e2c_100%)] p-5">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-cyan-300/[0.08]" />
        <div className="pointer-events-none absolute right-16 top-8 h-32 w-32 rounded-full border border-cyan-300/[0.06]" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-cyan-300">
              <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-2">
                <GitBranch className="h-4 w-4" />
              </div>
              <SectionLabel>Management accounting cockpit</SectionLabel>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Put shared spend where contribution happens.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
              Turn budgeted overhead into traceable allocations, then see which profit centres are carrying margin pressure.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div>
              <label htmlFor="management-accounting-period" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Reporting period
              </label>
              <Input
                id="management-accounting-period"
                data-testid="input-management-accounting-period"
                type="month"
                className={`${field} w-full sm:w-[150px]`}
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              />
            </div>
            <Button
              data-testid="button-download-profitability-csv"
              onClick={downloadReport}
              disabled={!report || profitabilityQuery.isLoading}
              variant="outline"
              className="h-9 border-white/10 bg-white/[0.04] text-white/70 hover:text-white"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white/[0.07] bg-[#0a101d] p-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Active rules</SectionLabel>
            <SlidersHorizontal className="h-4 w-4 text-cyan-400/70" />
          </div>
          <p data-testid="text-active-allocation-rules" className="mt-3 text-2xl font-semibold tabular-nums text-white">
            {rulesQuery.isLoading ? "—" : activeRules.length}
          </p>
          <p className="mt-1 text-xs text-white/35">{rules.length} configured in control set</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#0a101d] p-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Period runs</SectionLabel>
            <RefreshCw className="h-4 w-4 text-amber-300/70" />
          </div>
          <p data-testid="text-period-allocation-runs" className="mt-3 text-2xl font-semibold tabular-nums text-white">
            {runsQuery.isLoading ? "—" : periodRuns.length}
          </p>
          <p className="mt-1 text-xs text-white/35">{periodRuns.filter((run) => run.status === "posted").length} posted for {period}</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#0a101d] p-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Contribution</SectionLabel>
            <CircleDollarSign className="h-4 w-4 text-emerald-300/70" />
          </div>
          <p data-testid="text-period-contribution" className="mt-3 text-2xl font-semibold tabular-nums text-emerald-300">
            {profitabilityQuery.isLoading ? "—" : money(report?.totals.contribution)}
          </p>
          <p className="mt-1 text-xs text-white/35">After budget and allocated cost</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#0a101d] p-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Blended margin</SectionLabel>
            <FileBarChart2 className="h-4 w-4 text-violet-300/70" />
          </div>
          <p data-testid="text-period-margin" className="mt-3 text-2xl font-semibold tabular-nums text-white">
            {profitabilityQuery.isLoading ? "—" : `${number(report?.totals.marginPct)}%`}
          </p>
          <p className="mt-1 text-xs text-white/35">Profit-centre weighted view</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
        <section className="min-w-0 rounded-xl border border-white/[0.07] bg-[#0a101d]">
          <div className="flex flex-col justify-between gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center">
            <div>
              <SectionLabel>Allocation framework</SectionLabel>
              <div className="mt-1 flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Cost flow rules</h3>
                <Badge className="border-0 bg-cyan-400/10 text-[10px] text-cyan-300">{rules.length} rules</Badge>
              </div>
            </div>
            <Button
              data-testid="button-new-allocation-rule"
              onClick={openCreateRule}
              className="h-8 bg-cyan-600 px-3 text-xs hover:bg-cyan-500"
            >
              <Plus className="h-3.5 w-3.5" />
              New rule
            </Button>
          </div>

          {isRuleEditorOpen && (
            <div className="border-b border-white/[0.07] p-4">
              <RuleEditor
                draft={draft}
                editingRule={editingRule}
                costCentres={costCentres}
                profitCentres={profitCentres}
                isPending={isRuleMutationPending}
                onChange={updateDraft}
                onSubmit={saveRule}
                onClose={closeRuleEditor}
              />
            </div>
          )}

          {rulesQuery.isLoading || costCentresQuery.isLoading || profitCentresQuery.isLoading ? (
            <InlineLoading />
          ) : rulesError ? (
            <ErrorState
              onRetry={() => {
                void Promise.all([
                  rulesQuery.refetch(),
                  costCentresQuery.refetch(),
                  profitCentresQuery.refetch(),
                ]);
              }}
            />
          ) : rules.length === 0 ? (
            <EmptyState
              icon={GitBranch}
              title="No allocation rules yet"
              description="Create the first cost flow to make shared spend visible in profit-centre reporting."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[730px] text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-white/30">
                    <th className="px-4 py-3 font-medium">Rule / flow</th>
                    <th className="px-3 py-3 font-medium">Basis</th>
                    <th className="px-3 py-3 font-medium">Value</th>
                    <th className="px-3 py-3 font-medium">State</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr
                      data-testid={`row-allocation-rule-${rule.id}`}
                      key={rule.id}
                      className="border-b border-white/[0.045] last:border-0 hover:bg-white/[0.025]"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 rounded-md p-1.5 ${rule.is_active ? "bg-cyan-400/10 text-cyan-300" : "bg-white/[0.05] text-white/25"}`}>
                            <GitBranch className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white/85">{rule.name}</p>
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/35">
                              <span className="font-mono text-cyan-300/80">{rule.rule_number}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>{rule.source_cost_centre_code ?? "Source"}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>{rule.target_profit_centre_code ?? "Target"}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-white/55">{formatBasis(rule.basis)}</td>
                      <td className="px-3 py-3.5 font-mono tabular-nums text-white/75">
                        {rule.basis === "fixed" ? money(rule.fixed_amount) : `${number(rule.rate)}%`}
                      </td>
                      <td className="px-3 py-3.5">
                        <button
                          data-testid={`button-toggle-allocation-rule-${rule.id}`}
                          type="button"
                          aria-label={`${rule.is_active ? "Deactivate" : "Activate"} ${rule.rule_number}`}
                          aria-pressed={rule.is_active}
                          onClick={() => void toggleRule(rule)}
                          disabled={updateRule.isPending}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium transition-colors ${
                            rule.is_active
                              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                              : "border-white/10 bg-white/[0.04] text-white/40 hover:bg-white/[0.08]"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${rule.is_active ? "bg-emerald-300" : "bg-white/30"}`} />
                          {rule.is_active ? "Active" : "Paused"}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-0.5">
                          <Button
                            data-testid={`button-edit-allocation-rule-${rule.id}`}
                            onClick={() => openEditRule(rule)}
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${rule.rule_number}`}
                            className="h-7 w-7 text-white/35 hover:text-cyan-300"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            data-testid={`button-delete-allocation-rule-${rule.id}`}
                            onClick={() => void removeRule(rule)}
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${rule.rule_number}`}
                            className="h-7 w-7 text-white/35 hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-white/[0.07] bg-[#0a101d]">
          <div className="border-b border-white/[0.07] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SectionLabel>Run control</SectionLabel>
                <h3 className="mt-1 text-base font-semibold text-white">Allocation runs</h3>
                <p className="mt-1 text-xs text-white/35">Generate from active rules, then post when reviewed.</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-cyan-300/70" />
            </div>
            <Button
              data-testid="button-generate-allocation-run"
              onClick={() => void createRun()}
              disabled={generateRun.isPending || activeRules.length === 0 || !period}
              className="mt-4 h-9 w-full bg-cyan-600 text-xs hover:bg-cyan-500"
            >
              {generateRun.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Generate {period} run
            </Button>
            {activeRules.length === 0 && !rulesQuery.isLoading && (
              <p className="mt-2 text-center text-[11px] text-amber-300/70">Add an active rule before generating a run.</p>
            )}
          </div>

          {runsQuery.isLoading ? (
            <InlineLoading />
          ) : runsQuery.isError ? (
            <ErrorState onRetry={() => void runsQuery.refetch()} />
          ) : periodRuns.length === 0 ? (
            <EmptyState
              icon={RefreshCw}
              title={`No runs for ${period}`}
              description="Generated runs will appear here for review before posting."
            />
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {periodRuns.map((run) => (
                <div data-testid={`card-allocation-run-${run.id}`} key={run.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-cyan-300">{run.run_number}</p>
                      <p className="mt-1 text-[11px] text-white/35">{run.line_count ?? 0} allocation lines</p>
                    </div>
                    <Badge className={`border ${statusClass(run.status)} text-[10px]`}>
                      {run.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/30">Run total</p>
                      <p className="mt-0.5 text-lg font-semibold tabular-nums text-white">{money(run.total_amount)}</p>
                    </div>
                    <div className="flex gap-1">
                      {run.status === "draft" && (
                        <Button
                          data-testid={`button-post-allocation-run-${run.id}`}
                          onClick={() => void postAllocationRun(run)}
                          disabled={postRun.isPending}
                          size="sm"
                          className="h-8 bg-emerald-600/90 px-2.5 text-[11px] hover:bg-emerald-500"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Post
                        </Button>
                      )}
                      {(run.status === "draft" || run.status === "cancelled") && (
                        <Button
                          data-testid={`button-delete-allocation-run-${run.id}`}
                          onClick={() => void removeAllocationRun(run)}
                          disabled={deleteRun.isPending}
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${run.run_number}`}
                          className="h-8 w-8 text-white/35 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-white/[0.07] bg-[#0a101d]">
        <div className="flex flex-col justify-between gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center">
          <div>
            <SectionLabel>Contribution report</SectionLabel>
            <div className="mt-1 flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Profitability by profit centre</h3>
              <Badge className="border-0 bg-violet-400/10 text-[10px] text-violet-200">{period}</Badge>
            </div>
          </div>
          {report && (
            <p data-testid="text-profitability-row-count" className="text-xs text-white/35">
              {report.rows.length} profit centre{report.rows.length === 1 ? "" : "s"} · sourced from live report data
            </p>
          )}
        </div>

        {profitabilityQuery.isLoading ? (
          <InlineLoading />
        ) : reportError ? (
          <ErrorState onRetry={() => void profitabilityQuery.refetch()} />
        ) : !report || report.rows.length === 0 ? (
          <EmptyState
            icon={FileBarChart2}
            title={`No profitability data for ${period}`}
            description="Once revenue and cost activity is available, contribution by profit centre will populate here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[930px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.018] text-[10px] uppercase tracking-wider text-white/30">
                  <th className="px-4 py-3 font-medium">Profit centre</th>
                  <th className="px-3 py-3 text-right font-medium">Revenue</th>
                  <th className="px-3 py-3 text-right font-medium">Budget cost</th>
                  <th className="px-3 py-3 text-right font-medium">Allocated cost</th>
                  <th className="px-3 py-3 text-right font-medium">Total cost</th>
                  <th className="px-3 py-3 text-right font-medium">Contribution</th>
                  <th className="px-4 py-3 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr
                    data-testid={`row-profitability-${row.id}`}
                    key={row.id}
                    className="border-b border-white/[0.045] last:border-0 hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-white/85">{row.name}</p>
                      <p className="mt-1 font-mono text-[10px] text-cyan-300/75">{row.code}</p>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-white/75">{money(row.revenue)}</td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-white/45">{money(row.budget_cost)}</td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-amber-200/75">{money(row.allocated_cost)}</td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-white/75">{money(row.total_cost)}</td>
                    <td className={`px-3 py-3.5 text-right font-mono font-semibold tabular-nums ${Number(row.contribution) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {money(row.contribution)}
                    </td>
                    <td className={`px-4 py-3.5 text-right font-mono font-semibold tabular-nums ${Number(row.margin_pct) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {number(row.margin_pct)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-cyan-400/20 bg-cyan-400/[0.035]">
                  <td className="px-4 py-3.5 font-semibold text-white">Total contribution</td>
                  <td className="px-3 py-3.5 text-right font-mono font-semibold tabular-nums text-white">{money(report.totals.revenue)}</td>
                  <td colSpan={2} className="px-3 py-3.5 text-right text-[10px] uppercase tracking-wider text-white/30">After allocation</td>
                  <td className="px-3 py-3.5 text-right font-mono font-semibold tabular-nums text-white">{money(report.totals.totalCost)}</td>
                  <td className="px-3 py-3.5 text-right font-mono text-base font-semibold tabular-nums text-emerald-300">{money(report.totals.contribution)}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums text-emerald-300">{number(report.totals.marginPct)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}