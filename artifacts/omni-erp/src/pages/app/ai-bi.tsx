import { useState } from "react";
import { Brain, TrendingUp, DollarSign, Package, AlertTriangle, BarChart3, MessageSquare, Loader2, Send, Sparkles } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  useAiInsights, useSalesForecast, useCashFlowPrediction,
  useInventoryPrediction, useAnomalyReport, useKpiAnalysis,
  useGenerateReport,
} from "@/hooks/useAiBi";

function ReportView({ title, icon: Icon, data, loading }: { title: string; icon: any; data?: any; loading: boolean }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1e] p-6">
    <div className="flex items-center gap-2 mb-4"><div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400"><Icon className="h-4 w-4" /></div><h2 className="text-sm font-semibold text-white">{title}</h2></div>
    {loading ? <div className="flex items-center gap-2 text-white/40 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Generating AI analysis...</div> : <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-white/70">{data?.data?.text ?? "No data available"}</pre>}
  </div>;
}

export default function AiBi() {
  const { toast } = useToast();
  const [tab, setTab] = useState("insights");
  const [message, setMessage] = useState("");
  const [nlReport, setNlReport] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const generateReport = useGenerateReport();

  const insights = useAiInsights();
  const forecast = useSalesForecast();
  const cashFlow = useCashFlowPrediction();
  const inventory = useInventoryPrediction();
  const anomalies = useAnomalyReport();
  const kpi = useKpiAnalysis();

  const tabs = [
    { id: "insights", label: "AI Insights", icon: Brain },
    { id: "forecast", label: "Sales Forecast", icon: TrendingUp },
    { id: "cashflow", label: "Cash-Flow", icon: DollarSign },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "anomalies", label: "Anomalies", icon: AlertTriangle },
    { id: "kpi", label: "KPI Analysis", icon: BarChart3 },
    { id: "nl", label: "Natural Language", icon: MessageSquare },
  ];

  const sendNl = async () => {
    if (!message.trim()) return;
    setNlLoading(true);
    try {
      const res = await generateReport.mutateAsync(message);
      setNlReport(res.data?.text ?? "No response generated");
      setMessage("");
    } catch (e: any) {
      toast({ title: "Failed to generate report", description: e.message, variant: "destructive" });
    } finally {
      setNlLoading(false);
    }
  };

  return <AppLayout breadcrumbs={[{ label: "AI Business Intelligence" }]}>
    <div className="mx-auto max-w-[1800px] space-y-5 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><div className="flex items-center gap-2"><div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400"><Brain className="h-5 w-5" /></div><h1 className="text-2xl font-bold tracking-tight text-white">AI Business Intelligence</h1></div><p className="mt-1 text-sm text-white/40">AI insights, sales forecasting, cash-flow prediction, inventory prediction, anomaly detection, KPI analysis and natural-language reports.</p></div>
      </div>
      <div className="overflow-x-auto"><div className="inline-flex min-w-max gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors ${tab === t.id ? "bg-emerald-600 text-white" : "text-white/45 hover:bg-white/[0.06] hover:text-white"}`}><t.icon className="h-3.5 w-3.5" />{t.label}</button>)}</div></div>
      {tab === "insights" && <ReportView title="AI Business Insights" icon={Brain} data={insights.data} loading={insights.isLoading} />}
      {tab === "forecast" && <ReportView title="AI Sales Forecast" icon={TrendingUp} data={forecast.data} loading={forecast.isLoading} />}
      {tab === "cashflow" && <ReportView title="AI Cash-Flow Prediction" icon={DollarSign} data={cashFlow.data} loading={cashFlow.isLoading} />}
      {tab === "inventory" && <ReportView title="AI Inventory Prediction" icon={Package} data={inventory.data} loading={inventory.isLoading} />}
      {tab === "anomalies" && <ReportView title="AI Anomaly Detection" icon={AlertTriangle} data={anomalies.data} loading={anomalies.isLoading} />}
      {tab === "kpi" && <ReportView title="AI KPI Analysis" icon={BarChart3} data={kpi.data} loading={kpi.isLoading} />}
      {tab === "nl" && <div className="space-y-4">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1e] p-6">
          <div className="flex items-center gap-2 mb-4"><div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400"><MessageSquare className="h-4 w-4" /></div><h2 className="text-sm font-semibold text-white">Natural Language Reports</h2></div>
          <p className="text-xs text-white/40 mb-4">Ask in plain English. Examples: "Generate sales forecast", "Predict cash flow", "Detect anomalies", "Analyze KPIs", "Generate insights"</p>
          <div className="flex gap-2">
            <Input className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/30 h-10" placeholder="Type your request..." value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendNl()} />
            <Button onClick={sendNl} disabled={nlLoading || !message.trim()} className="h-10 bg-emerald-600 hover:bg-emerald-500"><Send className="mr-2 h-4 w-4" />Generate</Button>
          </div>
        </div>
        {nlLoading && <div className="flex items-center gap-2 text-white/40 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Generating AI report...</div>}
        {nlReport && <div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1e] p-6"><pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-white/70">{nlReport}</pre></div>}
      </div>}
    </div>
  </AppLayout>;
}