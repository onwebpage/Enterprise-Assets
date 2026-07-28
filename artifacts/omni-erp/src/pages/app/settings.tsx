import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Globe, Bell, Shield, Palette, Database, Mail, Smartphone, Lock, ChevronRight, Save, Check } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const settingsGroups = [
  { id: 'general', icon: Settings, label: 'General', desc: 'Company info, locale, timezone' },
  { id: 'notifications', icon: Bell, label: 'Notifications', desc: 'Email, push, in-app alerts' },
  { id: 'security', icon: Shield, label: 'Security', desc: 'Password, MFA, sessions' },
  { id: 'appearance', icon: Palette, label: 'Appearance', desc: 'Theme, layout, branding' },
  { id: 'integrations', icon: Globe, label: 'Integrations', desc: 'Third-party connections' },
  { id: 'data', icon: Database, label: 'Data & Privacy', desc: 'Backup, export, GDPR' },
];

const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
  <button onClick={onChange} className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${enabled ? 'bg-[#2563EB]' : 'bg-white/[0.1]'}`}>
    <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

export default function SettingsPage() {
  const [tab, setTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState({ email: true, push: false, invoices: true, payroll: true, alerts: true, reports: false });
  const [security, setSecurity] = useState({ mfa: true, sessionTimeout: true, ipWhitelist: false, auditLog: true });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Settings' }]}>
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-white">Settings</h1><p className="text-white/40 text-sm mt-0.5">Configure your OmniERP workspace</p></div>
          <Button onClick={handleSave} size="sm" className={`transition-all ${saved ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#2563EB] hover:bg-[#1d4ed8]'}`}>
            {saved ? <><Check className="w-3.5 h-3.5 mr-1.5" />Saved!</> : <><Save className="w-3.5 h-3.5 mr-1.5" />Save Changes</>}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Nav */}
          <div className="xl:col-span-1 space-y-1">
            {settingsGroups.map((g) => (
              <button key={g.id} onClick={() => setTab(g.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${tab === g.id ? 'bg-[#2563EB]/15 border border-[#2563EB]/20 text-white' : 'hover:bg-white/[0.04] text-white/50 hover:text-white border border-transparent'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tab === g.id ? 'bg-[#2563EB]/20' : 'bg-white/[0.04]'}`}>
                  <g.icon className={`w-4 h-4 ${tab === g.id ? 'text-[#2563EB]' : 'text-white/40'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{g.label}</p>
                  <p className="text-[10px] text-white/30">{g.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="xl:col-span-3 space-y-4">
            {tab === 'general' && (
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-6 space-y-5">
                <h3 className="font-semibold text-white">Company Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Company Name', value: 'Apex Global Inc.' },
                    { label: 'Legal Name', value: 'Apex Global Incorporated' },
                    { label: 'Tax ID / EIN', value: '12-3456789' },
                    { label: 'Industry', value: 'Technology & Manufacturing' },
                    { label: 'Founded', value: '2014' },
                    { label: 'Employees', value: '342' },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="text-xs text-white/40 mb-1.5 block">{f.label}</label>
                      <Input defaultValue={f.value} className="bg-white/[0.04] border-white/[0.07] text-white h-9 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-white/[0.05]">
                  <h4 className="font-medium text-white text-sm mb-3">Regional Settings</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[{ label: 'Timezone', value: 'UTC-06:00 (Chicago)' }, { label: 'Date Format', value: 'MM/DD/YYYY' }, { label: 'Currency', value: 'USD ($)' }].map(f => (
                      <div key={f.label}>
                        <label className="text-xs text-white/40 mb-1.5 block">{f.label}</label>
                        <Input defaultValue={f.value} className="bg-white/[0.04] border-white/[0.07] text-white h-9 text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'notifications' && (
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-white">Notification Preferences</h3>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Channels</p>
                  {[
                    { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via email' },
                    { key: 'push', label: 'Push Notifications', desc: 'Browser and mobile push alerts' },
                  ].map((s) => (
                    <div key={s.key} className="flex items-center justify-between py-3 border-b border-white/[0.04]">
                      <div><p className="text-sm font-medium text-white">{s.label}</p><p className="text-xs text-white/40">{s.desc}</p></div>
                      <Toggle enabled={notifs[s.key as keyof typeof notifs] as boolean} onChange={() => setNotifs(prev => ({ ...prev, [s.key]: !prev[s.key as keyof typeof notifs] }))} />
                    </div>
                  ))}
                  <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2 mt-4">Event Types</p>
                  {[
                    { key: 'invoices', label: 'Invoice & Payment alerts', desc: 'New invoices, payments, overdue' },
                    { key: 'payroll', label: 'Payroll notifications', desc: 'Processing, approvals, errors' },
                    { key: 'alerts', label: 'System alerts', desc: 'Low stock, workflow failures' },
                    { key: 'reports', label: 'Scheduled reports', desc: 'Report generation completions' },
                  ].map((s) => (
                    <div key={s.key} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                      <div><p className="text-sm font-medium text-white">{s.label}</p><p className="text-xs text-white/40">{s.desc}</p></div>
                      <Toggle enabled={notifs[s.key as keyof typeof notifs] as boolean} onChange={() => setNotifs(prev => ({ ...prev, [s.key]: !prev[s.key as keyof typeof notifs] }))} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'security' && (
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-white">Security Settings</h3>
                <div className="space-y-1">
                  {[
                    { key: 'mfa', label: 'Require MFA for all users', desc: 'Enforce two-factor authentication organization-wide' },
                    { key: 'sessionTimeout', label: 'Session timeout', desc: 'Auto-logout after 30 minutes of inactivity' },
                    { key: 'ipWhitelist', label: 'IP Whitelist', desc: 'Restrict access to approved IP addresses only' },
                    { key: 'auditLog', label: 'Audit logging', desc: 'Log all user actions and data changes' },
                  ].map((s) => (
                    <div key={s.key} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                      <div><p className="text-sm font-medium text-white">{s.label}</p><p className="text-xs text-white/40">{s.desc}</p></div>
                      <Toggle enabled={security[s.key as keyof typeof security]} onChange={() => setSecurity(prev => ({ ...prev, [s.key]: !prev[s.key as keyof typeof security] }))} />
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-white/[0.05]">
                  <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Lock className="w-3.5 h-3.5 mr-1.5" />Change Password</Button>
                </div>
              </div>
            )}

            {['appearance', 'integrations', 'data'].includes(tab) && (
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
                {tab === 'appearance' && <Palette className="w-12 h-12 text-white/20 mx-auto mb-3" />}
                {tab === 'integrations' && <Globe className="w-12 h-12 text-white/20 mx-auto mb-3" />}
                {tab === 'data' && <Database className="w-12 h-12 text-white/20 mx-auto mb-3" />}
                <p className="text-white/50 font-medium capitalize">{tab} Settings</p>
                <p className="text-white/30 text-sm mt-1">Configure {tab} preferences for your workspace</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
