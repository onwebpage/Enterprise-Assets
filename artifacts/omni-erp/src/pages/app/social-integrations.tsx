import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Facebook, Instagram, Linkedin, Youtube, Send, Plug, RefreshCw, Trash2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { api, type ApiResponse } from "@/lib/api";

type Provider = "facebook" | "instagram" | "linkedin" | "x" | "youtube";
type Integration = {
  id: number; provider: Provider; accountName: string | null; accountId: string | null;
  expiresAt: string | null; status: string; lastTestedAt: string | null; lastError: string | null; hasRefreshToken: boolean;
};

const providers: { id: Provider; name: string; description: string; color: string; icon: typeof Facebook }[] = [
  { id: "facebook", name: "Facebook Pages", description: "Publish and monitor your Facebook Page", color: "#1877F2", icon: Facebook },
  { id: "instagram", name: "Instagram", description: "Connect an Instagram Business account", color: "#E4405F", icon: Instagram },
  { id: "linkedin", name: "LinkedIn", description: "Publish updates from your LinkedIn organization", color: "#0A66C2", icon: Linkedin },
  { id: "x", name: "X", description: "Connect an X account for publishing workflows", color: "#E7E7E7", icon: Send },
  { id: "youtube", name: "YouTube", description: "Connect a channel for content reporting", color: "#FF0000", icon: Youtube },
];

export default function SocialIntegrationsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Provider | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [form, setForm] = useState({ accessToken: "", refreshToken: "", accountName: "", expiresAt: "" });
  const { data: integrations = [], isLoading, isError } = useQuery({
    queryKey: ["social-integrations"],
    queryFn: () => api.get<ApiResponse<Integration[]>>("/integrations/social").then(response => response.data),
  });
  const save = useMutation({
    mutationFn: ({ provider, values }: { provider: Provider; values: typeof form }) => api.put<ApiResponse<Integration>>(`/integrations/social/${provider}`, values),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["social-integrations"] }); setEditing(null); setForm({ accessToken: "", refreshToken: "", accountName: "", expiresAt: "" }); toast({ title: "Integration saved" }); },
    onError: (error: Error) => toast({ title: "Could not save integration", description: error.message, variant: "destructive" }),
  });
  const test = useMutation({
    mutationFn: (provider: Provider) => api.post<ApiResponse<{ connected: boolean; accountName: string | null }>>(`/integrations/social/${provider}/test`, {}),
    onSuccess: (response) => { void qc.invalidateQueries({ queryKey: ["social-integrations"] }); toast({ title: "Connection verified", description: response.data.accountName ? `Connected as ${response.data.accountName}.` : "Provider authentication succeeded." }); },
    onError: (error: Error) => toast({ title: "Connection failed", description: error.message, variant: "destructive" }),
  });
  const disconnect = useMutation({
    mutationFn: (provider: Provider) => api.delete<ApiResponse<null>>(`/integrations/social/${provider}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["social-integrations"] }); toast({ title: "Integration disconnected" }); },
    onError: (error: Error) => toast({ title: "Could not disconnect", description: error.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (!editing) return;
    const current = integrations.find(item => item.provider === editing);
    setForm({ accessToken: "", refreshToken: "", accountName: current?.accountName ?? "", expiresAt: current?.expiresAt ? current.expiresAt.slice(0, 10) : "" });
    setShowToken(false);
  }, [editing, integrations]);

  const beginEdit = (provider: Provider) => setEditing(provider);
  const current = (provider: Provider) => integrations.find(item => item.provider === provider);

  return (
    <AppLayout breadcrumbs={[{ label: "Integrations" }, { label: "Social Media Integration" }]}>
      <div className="mx-auto max-w-[1200px] space-y-6 p-6">
        <div>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-sky-500/15 p-2.5 text-sky-300"><Plug className="h-5 w-5" /></div><div><h1 className="text-2xl font-bold text-white">Social Media Integration</h1><p className="mt-1 text-sm text-white/40">Connect organization social accounts for publishing, monitoring, and reporting workflows.</p></div></div>
        </div>
        {isError && <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300"><AlertCircle className="h-4 w-4" />You do not have permission to view integration settings, or the integration schema is not installed.</div>}
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map(provider => {
            const Icon = provider.icon;
            const integration = current(provider.id);
            const isEditing = editing === provider.id;
            return (
              <section key={provider.id} className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08]" style={{ backgroundColor: `${provider.color}18` }}><Icon className="h-5 w-5" style={{ color: provider.color }} /></div>
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-white">{provider.name}</h2>{integration && <Badge className={integration.status === "connected" ? "border-0 bg-emerald-500/15 text-emerald-300" : "border-0 bg-rose-500/15 text-rose-300"}>{integration.status === "connected" ? "Connected" : "Error"}</Badge>}</div><p className="mt-1 text-xs text-white/40">{provider.description}</p>{integration?.accountName && <p className="mt-2 text-xs text-white/65">Account: {integration.accountName}</p>}</div>
                </div>
                {integration?.lastError && <p className="mt-3 rounded-lg bg-rose-500/10 p-2.5 text-xs text-rose-300">{integration.lastError}</p>}
                {isEditing ? (
                  <div className="mt-4 space-y-3">
                    <label className="block space-y-1.5"><span className="text-xs text-white/45">Access token</span><div className="flex gap-2"><Input required type={showToken ? "text" : "password"} value={form.accessToken} onChange={event => setForm(currentForm => ({ ...currentForm, accessToken: event.target.value }))} placeholder={integration ? "Enter a new token to rotate" : "Paste provider access token"} className="border-white/[0.08] bg-white/[0.04] text-white" /><Button type="button" variant="outline" onClick={() => setShowToken(value => !value)} className="border-white/[0.1] bg-transparent text-white/60">{showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button></div></label>
                    <label className="block space-y-1.5"><span className="text-xs text-white/45">Refresh token (optional)</span><Input type="password" value={form.refreshToken} onChange={event => setForm(currentForm => ({ ...currentForm, refreshToken: event.target.value }))} className="border-white/[0.08] bg-white/[0.04] text-white" /></label>
                    <div className="grid grid-cols-2 gap-3"><label className="space-y-1.5"><span className="text-xs text-white/45">Account label</span><Input value={form.accountName} onChange={event => setForm(currentForm => ({ ...currentForm, accountName: event.target.value }))} className="border-white/[0.08] bg-white/[0.04] text-white" /></label><label className="space-y-1.5"><span className="text-xs text-white/45">Token expiry</span><Input type="date" value={form.expiresAt} onChange={event => setForm(currentForm => ({ ...currentForm, expiresAt: event.target.value }))} className="border-white/[0.08] bg-white/[0.04] text-white" /></label></div>
                    <p className="text-[11px] leading-5 text-white/30">Tokens are encrypted before storage and never returned by the API. Use a provider OAuth token with only the scopes required for this organization.</p>
                    <div className="flex gap-2"><Button onClick={() => save.mutate({ provider: provider.id, values: form })} disabled={save.isPending || !form.accessToken.trim()} className="bg-[#2563EB]">{save.isPending ? "Saving..." : "Save token"}</Button><Button variant="ghost" onClick={() => setEditing(null)} className="text-white/50">Cancel</Button></div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2"><Button size="sm" onClick={() => beginEdit(provider.id)} className="bg-[#2563EB] hover:bg-[#1d4ed8]">{integration ? "Update credentials" : "Connect"}</Button>{integration && <><Button size="sm" variant="outline" onClick={() => test.mutate(provider.id)} disabled={test.isPending} className="border-white/[0.1] bg-transparent text-white/60"><RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${test.isPending ? "animate-spin" : ""}`} />Test</Button><Button size="sm" variant="ghost" onClick={() => disconnect.mutate(provider.id)} disabled={disconnect.isPending} className="text-white/40 hover:text-rose-300"><Trash2 className="mr-1.5 h-3.5 w-3.5" />Disconnect</Button></>}</div>
                )}
                {integration?.status === "connected" && !isEditing && <p className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400/70"><CheckCircle2 className="h-3 w-3" />Last verified {integration.lastTestedAt ? new Date(integration.lastTestedAt).toLocaleString() : "not tested yet"}</p>}
              </section>
            );
          })}
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-xs leading-5 text-white/35">Provider API access is organization-scoped. Publishing and reporting workflows should still enforce provider-specific scopes and token expiry before sending requests.</div>
      </div>
    </AppLayout>
  );
}