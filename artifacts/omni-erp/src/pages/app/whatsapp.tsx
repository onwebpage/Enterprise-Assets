import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, MessageCircle, Plus, Send, Settings2, Trash2, XCircle } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api, type ApiResponse } from "@/lib/api";

type Config = { id?: number; displayName: string; phoneNumber: string | null; enabled: boolean; mode: string };
type Customer = { id: number; name: string; phone: string | null; email: string | null };
type Template = { id: number; name: string; category: string; body: string };
type Message = { id: number; recipientName: string; recipientPhone: string; notificationType: string; body: string; status: string; createdAt: string; sentAt: string | null };

const inputClass = "border-white/[0.09] bg-white/[0.04] text-white placeholder:text-white/25";

export default function WhatsappPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [configForm, setConfigForm] = useState({ displayName: "WhatsApp Demo", phoneNumber: "", enabled: true });
  const [customerId, setCustomerId] = useState("");
  const [templateId, setTemplateId] = useState("none");
  const [notificationType, setNotificationType] = useState("general");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [newTemplate, setNewTemplate] = useState({ name: "", category: "general", body: "" });

  const config = useQuery({ queryKey: ["whatsapp-config"], queryFn: () => api.get<ApiResponse<Config>>("/integrations/whatsapp/config").then(response => response.data) });
  const customers = useQuery({ queryKey: ["whatsapp-customers", search], queryFn: () => api.get<ApiResponse<Customer[]>>(`/integrations/whatsapp/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(response => response.data) });
  const templates = useQuery({ queryKey: ["whatsapp-templates"], queryFn: () => api.get<ApiResponse<Template[]>>("/integrations/whatsapp/templates").then(response => response.data) });
  const messages = useQuery({ queryKey: ["whatsapp-messages"], queryFn: () => api.get<ApiResponse<Message[]>>("/integrations/whatsapp/messages").then(response => response.data) });

  useEffect(() => {
    if (config.data) setConfigForm({ displayName: config.data.displayName, phoneNumber: config.data.phoneNumber ?? "", enabled: config.data.enabled });
  }, [config.data]);

  const saveConfig = useMutation({
    mutationFn: () => api.put<ApiResponse<Config>>("/integrations/whatsapp/config", configForm),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["whatsapp-config"] }); toast({ title: "WhatsApp configuration saved" }); },
    onError: (error: Error) => toast({ title: "Could not save configuration", description: error.message, variant: "destructive" }),
  });
  const sendMessage = useMutation({
    mutationFn: () => api.post<ApiResponse<Message>>("/integrations/whatsapp/messages", { customerId: Number(customerId), templateId: templateId === "none" ? null : Number(templateId), notificationType, body }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["whatsapp-messages"] }); setBody(""); toast({ title: "Message sent", description: "Saved to the local WhatsApp demo history." }); },
    onError: (error: Error) => toast({ title: "Message was not sent", description: error.message, variant: "destructive" }),
  });
  const createTemplate = useMutation({
    mutationFn: () => api.post<ApiResponse<Template>>("/integrations/whatsapp/templates", newTemplate),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["whatsapp-templates"] }); setNewTemplate({ name: "", category: "general", body: "" }); toast({ title: "Template created" }); },
    onError: (error: Error) => toast({ title: "Could not create template", description: error.message, variant: "destructive" }),
  });
  const deleteTemplate = useMutation({
    mutationFn: (id: number) => api.delete<ApiResponse<null>>(`/integrations/whatsapp/templates/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["whatsapp-templates"] }); toast({ title: "Template deleted" }); },
  });
  const selectedCustomer = customers.data?.find(customer => String(customer.id) === customerId);

  const useTemplate = (value: string) => {
    setTemplateId(value);
    const template = templates.data?.find(item => String(item.id) === value);
    if (template) { setBody(template.body.replaceAll("{{customer}}", selectedCustomer?.name ?? "{{customer}}")); setNotificationType(template.category); }
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Integrations" }, { label: "Social Media Integration" }, { label: "WhatsApp" }]}>
      <div className="mx-auto max-w-[1240px] space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-300"><MessageCircle className="h-5 w-5" /></div><div><h1 className="text-2xl font-bold text-white">WhatsApp</h1><p className="mt-1 text-sm text-white/40">Send and track customer messages with a local demo connection.</p></div></div>
          <Badge className="border-0 bg-emerald-500/15 px-3 py-1 text-emerald-300">Local demo mode</Badge>
        </div>

        <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-5">
          <div className="mb-4 flex items-center gap-2"><Settings2 className="h-4 w-4 text-emerald-300" /><h2 className="text-sm font-semibold text-white">Connection and configuration</h2></div>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"><label className="space-y-1.5"><span className="text-xs text-white/45">Connection name</span><Input className={inputClass} value={configForm.displayName} onChange={event => setConfigForm(form => ({ ...form, displayName: event.target.value }))} /></label><label className="space-y-1.5"><span className="text-xs text-white/45">Business phone (optional)</span><Input className={inputClass} value={configForm.phoneNumber} onChange={event => setConfigForm(form => ({ ...form, phoneNumber: event.target.value }))} placeholder="+91 98765 43210" /></label><Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending} className="bg-emerald-600 hover:bg-emerald-500">{saveConfig.isPending ? "Saving..." : "Save configuration"}</Button></div>
          <label className="mt-4 flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={configForm.enabled} onChange={event => setConfigForm(form => ({ ...form, enabled: event.target.checked }))} className="accent-emerald-500" /> Enable local message sending</label>
          <p className="mt-3 text-xs leading-5 text-white/35">Messages are sent through the configured WhatsApp Cloud API. Configure the provider credentials on the server before sending.</p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-5">
            <div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Compose message</h2><p className="mt-1 text-xs text-white/35">Choose an AR customer with a phone number.</p></div><Badge className="border-0 bg-sky-500/15 text-sky-300">Demo transport</Badge></div>
            <div className="space-y-4">
              <label className="block space-y-1.5"><span className="text-xs text-white/45">Customer or contact</span><Input className={inputClass} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search customer name or phone" /><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger className={`mt-2 ${inputClass}`}><SelectValue placeholder="Select a customer" /></SelectTrigger><SelectContent>{customers.data?.map(customer => <SelectItem key={customer.id} value={String(customer.id)}>{customer.name} · {customer.phone}</SelectItem>)}</SelectContent></Select></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-xs text-white/45">Message template</span><Select value={templateId} onValueChange={useTemplate}><SelectTrigger className={inputClass}><SelectValue placeholder="No template" /></SelectTrigger><SelectContent><SelectItem value="none">No template</SelectItem>{templates.data?.map(template => <SelectItem key={template.id} value={String(template.id)}>{template.name}</SelectItem>)}</SelectContent></Select></label><label className="space-y-1.5"><span className="text-xs text-white/45">Notification type</span><Select value={notificationType} onValueChange={setNotificationType}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="general">General message</SelectItem><SelectItem value="invoice">Invoice notification</SelectItem><SelectItem value="payment">Payment notification</SelectItem><SelectItem value="order">Order notification</SelectItem></SelectContent></Select></label></div>
              <label className="block space-y-1.5"><span className="text-xs text-white/45">Message</span><textarea value={body} onChange={event => setBody(event.target.value)} rows={6} placeholder="Write a message or choose a template..." className={`w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500 ${inputClass}`} /></label>
              <div className="flex items-center justify-between gap-3"><span className="text-xs text-white/35">{selectedCustomer ? `To ${selectedCustomer.name} · ${selectedCustomer.phone}` : "Select a recipient to continue"}</span><Button onClick={() => sendMessage.mutate()} disabled={sendMessage.isPending || !customerId || !body.trim() || !configForm.enabled} className="bg-emerald-600 hover:bg-emerald-500"><Send className="mr-2 h-4 w-4" />{sendMessage.isPending ? "Sending..." : "Send message"}</Button></div>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Message templates</h2><p className="mt-1 text-xs text-white/35">Use {"{{customer}}"} for the recipient name.</p></div><Plus className="h-4 w-4 text-white/35" /></div><div className="space-y-2">{templates.data?.map(template => <div key={template.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-white">{template.name}</p><Badge className="mt-1 border-0 bg-white/[0.07] text-[10px] text-white/50">{template.category}</Badge></div><Button size="icon" variant="ghost" onClick={() => deleteTemplate.mutate(template.id)} className="h-7 w-7 text-white/30 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></Button></div><p className="mt-2 text-xs leading-5 text-white/45">{template.body}</p></div>)}</div><div className="mt-4 space-y-2 border-t border-white/[0.07] pt-4"><Input className={inputClass} value={newTemplate.name} onChange={event => setNewTemplate(form => ({ ...form, name: event.target.value }))} placeholder="New template name" /><Select value={newTemplate.category} onValueChange={category => setNewTemplate(form => ({ ...form, category }))}><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="invoice">Invoice</SelectItem><SelectItem value="payment">Payment</SelectItem><SelectItem value="order">Order</SelectItem></SelectContent></Select><textarea rows={3} value={newTemplate.body} onChange={event => setNewTemplate(form => ({ ...form, body: event.target.value }))} placeholder="Template message" className={`w-full resize-y rounded-md border px-3 py-2 text-sm ${inputClass}`} /><Button variant="outline" onClick={() => createTemplate.mutate()} disabled={createTemplate.isPending || !newTemplate.name.trim() || !newTemplate.body.trim()} className="w-full border-white/[0.1] bg-transparent text-white/70">Save template</Button></div></section>
        </div>

        <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1e] p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Message history</h2><p className="mt-1 text-xs text-white/35">Local delivery records retained in the database.</p></div><span className="text-xs text-white/35">{messages.data?.length ?? 0} records</span></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-white/[0.07] text-xs text-white/35"><tr><th className="pb-3 font-medium">Recipient</th><th className="pb-3 font-medium">Type</th><th className="pb-3 font-medium">Message</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Created</th></tr></thead><tbody>{messages.data?.map(message => <tr key={message.id} className="border-b border-white/[0.05] last:border-0"><td className="py-3"><p className="text-white">{message.recipientName}</p><p className="text-xs text-white/35">{message.recipientPhone}</p></td><td className="py-3 capitalize text-white/60">{message.notificationType}</td><td className="max-w-[320px] truncate py-3 text-white/55">{message.body}</td><td className="py-3"><Status status={message.status} /></td><td className="py-3 text-xs text-white/35">{new Date(message.createdAt).toLocaleString()}</td></tr>)}</tbody></table>{!messages.data?.length && <p className="py-8 text-center text-sm text-white/30">No messages yet. Your local sends will appear here.</p>}</div></section>
      </div>
    </AppLayout>
  );
}

function Status({ status }: { status: string }) {
  if (status === "sent") return <Badge className="border-0 bg-emerald-500/15 text-emerald-300"><CheckCircle2 className="mr-1 h-3 w-3" />Sent</Badge>;
  if (status === "failed") return <Badge className="border-0 bg-rose-500/15 text-rose-300"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
  return <Badge className="border-0 bg-amber-500/15 text-amber-300"><Clock3 className="mr-1 h-3 w-3" />Pending</Badge>;
}