import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Globe, Bell, Shield, Palette, Database,
  Lock, Save, Check, User, Eye, EyeOff, Sun, Moon,
  Monitor, Languages, Clock, Calendar, DollarSign,
  Building2, Plug, AlertTriangle, Download, Trash2,
  RefreshCw, ChevronRight, Loader2
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useProfile, useUpdateProfile, useChangePassword, useToggleMfa,
  useOrgSettings, useUpdateOrg,
  usePreferences, useUpdatePreferences,
  type UserPreferences,
} from '@/hooks/useSettings';

// ── Toggle ────────────────────────────────────────────────────────────────────
const Toggle = ({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${enabled ? 'bg-[#2563EB]' : 'bg-white/[0.1]'}`}
  >
    <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-6 space-y-4">
    <h3 className="font-semibold text-white text-sm">{title}</h3>
    {children}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs text-white/40 mb-1.5 block">{label}</label>
    {children}
  </div>
);

const inputCls = "bg-white/[0.04] border-white/[0.07] text-white h-9 text-sm placeholder:text-white/20 focus:border-[#2563EB]/50 focus:ring-0";

// ── Nav groups ────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'general',       icon: Building2, label: 'General',         desc: 'Company info & locale'       },
  { id: 'account',       icon: User,      label: 'My Account',      desc: 'Profile & personal info'     },
  { id: 'notifications', icon: Bell,      label: 'Notifications',   desc: 'Alert channels & events'     },
  { id: 'security',      icon: Shield,    label: 'Security',        desc: 'Password, MFA & sessions'    },
  { id: 'appearance',    icon: Palette,   label: 'Appearance',      desc: 'Theme, language & formats'   },
  { id: 'integrations',  icon: Plug,      label: 'Integrations',    desc: 'Third-party connections'     },
  { id: 'data',          icon: Database,  label: 'Data & Privacy',  desc: 'Export, backup & GDPR'       },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState('general');
  const { toast } = useToast();

  return (
    <AppLayout breadcrumbs={[{ label: 'Administration' }, { label: 'Settings' }]}>
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-white/40 text-sm mt-0.5">Configure your OmniERP workspace</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Nav */}
          <div className="xl:col-span-1 space-y-1">
            {NAV.map((g) => (
              <button key={g.id} onClick={() => setTab(g.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                  tab === g.id
                    ? 'bg-[#2563EB]/15 border border-[#2563EB]/20 text-white'
                    : 'hover:bg-white/[0.04] text-white/50 hover:text-white border border-transparent'
                }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tab === g.id ? 'bg-[#2563EB]/20' : 'bg-white/[0.04]'}`}>
                  <g.icon className={`w-4 h-4 ${tab === g.id ? 'text-[#2563EB]' : 'text-white/40'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight">{g.label}</p>
                  <p className="text-[10px] text-white/30">{g.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="xl:col-span-3 space-y-4">
            {tab === 'general'       && <GeneralTab toast={toast} />}
            {tab === 'account'       && <AccountTab toast={toast} />}
            {tab === 'notifications' && <NotificationsTab toast={toast} />}
            {tab === 'security'      && <SecurityTab toast={toast} />}
            {tab === 'appearance'    && <AppearanceTab toast={toast} />}
            {tab === 'integrations'  && <IntegrationsTab />}
            {tab === 'data'          && <DataPrivacyTab toast={toast} />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ── General Tab ───────────────────────────────────────────────────────────────
function GeneralTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const { data: org, isLoading } = useOrgSettings();
  const updateOrg = useUpdateOrg();

  const [form, setForm] = useState({
    name: '', legalName: '', taxId: '', industry: '',
    foundedYear: '', employeeCount: '', currency: 'USD',
    fiscalYearStart: 'Jan', country: '', gstin: '',
  });

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name ?? '',
        legalName: org.legalName ?? '',
        taxId: org.taxId ?? '',
        industry: org.industry ?? '',
        foundedYear: org.foundedYear ? String(org.foundedYear) : '',
        employeeCount: org.employeeCount ? String(org.employeeCount) : '',
        currency: org.currency ?? 'USD',
        fiscalYearStart: org.fiscalYearStart ?? 'Jan',
        country: org.country ?? '',
        gstin: org.gstin ?? '',
      });
    }
  }, [org]);

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  async function handleSave() {
    try {
      await updateOrg.mutateAsync({
        ...form,
        foundedYear: form.foundedYear ? parseInt(form.foundedYear) : null,
        employeeCount: form.employeeCount ? parseInt(form.employeeCount) : null,
      });
      toast({ title: 'Saved', description: 'Company information updated.' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save', variant: 'destructive' });
    }
  }

  if (isLoading) return <LoadingCard />;

  return (
    <div className="space-y-4">
      <Section title="Company Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name">
            <Input value={form.name} onChange={f('name')} className={inputCls} placeholder="Acme Inc." />
          </Field>
          <Field label="Legal Name">
            <Input value={form.legalName} onChange={f('legalName')} className={inputCls} placeholder="Acme Incorporated" />
          </Field>
          <Field label="Tax ID / EIN">
            <Input value={form.taxId} onChange={f('taxId')} className={inputCls} placeholder="12-3456789" />
          </Field>
          <Field label="Industry">
            <Input value={form.industry} onChange={f('industry')} className={inputCls} placeholder="Technology & Manufacturing" />
          </Field>
          <Field label="Founded Year">
            <Input value={form.foundedYear} onChange={f('foundedYear')} className={inputCls} placeholder="2010" type="number" />
          </Field>
          <Field label="Employee Count">
            <Input value={form.employeeCount} onChange={f('employeeCount')} className={inputCls} placeholder="250" type="number" />
          </Field>
          <Field label="Country">
            <Input value={form.country} onChange={f('country')} className={inputCls} placeholder="United States" />
          </Field>
          <Field label="GSTIN">
            <Input value={form.gstin} onChange={f('gstin')} className={inputCls} placeholder="22AAAAA0000A1Z5" />
          </Field>
        </div>
      </Section>

      <Section title="Financial Settings">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Default Currency">
            <select
              value={form.currency}
              onChange={f('currency')}
              className="w-full h-9 rounded-md px-3 text-sm bg-white/[0.04] border border-white/[0.07] text-white focus:outline-none focus:border-[#2563EB]/50"
            >
              {['USD','EUR','GBP','INR','AUD','CAD','SGD','AED','JPY'].map(c => (
                <option key={c} value={c} className="bg-[#0a0f1e]">{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Fiscal Year Start">
            <select
              value={form.fiscalYearStart}
              onChange={f('fiscalYearStart')}
              className="w-full h-9 rounded-md px-3 text-sm bg-white/[0.04] border border-white/[0.07] text-white focus:outline-none focus:border-[#2563EB]/50"
            >
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                <option key={m} value={m} className="bg-[#0a0f1e]">{m}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <div className="flex justify-end">
        <SaveButton loading={updateOrg.isPending} onClick={handleSave} />
      </div>
    </div>
  );
}

// ── Account Tab ───────────────────────────────────────────────────────────────
function AccountTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
      });
    }
  }, [profile]);

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  async function handleSave() {
    try {
      await updateProfile.mutateAsync(form);
      toast({ title: 'Saved', description: 'Profile updated successfully.' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save', variant: 'destructive' });
    }
  }

  if (isLoading) return <LoadingCard />;

  return (
    <div className="space-y-4">
      <Section title="Personal Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name">
            <Input value={form.firstName} onChange={f('firstName')} className={inputCls} />
          </Field>
          <Field label="Last Name">
            <Input value={form.lastName} onChange={f('lastName')} className={inputCls} />
          </Field>
          <Field label="Email Address">
            <Input value={profile?.email ?? ''} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={f('phone')} className={inputCls} placeholder="+1 555 000 0000" />
          </Field>
        </div>
      </Section>

      <Section title="Account Details">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Role',          value: profile?.roleName ?? '—' },
            { label: 'Status',        value: profile?.status ?? '—' },
            { label: 'Member Since',  value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—' },
            { label: 'Last Sign In',  value: profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Never' },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <span className="text-xs text-white/40 mb-0.5">{label}</span>
              <span className="text-white font-medium capitalize">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      <div className="flex justify-end">
        <SaveButton loading={updateProfile.isPending} onClick={handleSave} />
      </div>
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
function NotificationsTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const { data: prefs, isLoading } = usePreferences();
  const updatePrefs = useUpdatePreferences();

  async function toggle(key: keyof UserPreferences) {
    if (!prefs) return;
    const newVal = !prefs[key];
    try {
      await updatePrefs.mutateAsync({ [key]: newVal });
    } catch {
      toast({ title: 'Error', description: 'Failed to update preference', variant: 'destructive' });
    }
  }

  if (isLoading) return <LoadingCard />;

  const channels = [
    { key: 'notifEmail' as const, label: 'Email Notifications', desc: 'Receive alerts and summaries via email' },
    { key: 'notifPush'  as const, label: 'Push Notifications',  desc: 'Browser and mobile push alerts' },
  ];
  const events = [
    { key: 'notifInvoices' as const, label: 'Invoice & Payment alerts', desc: 'New invoices, payments, overdue reminders' },
    { key: 'notifPayroll'  as const, label: 'Payroll notifications',     desc: 'Processing, approvals, and errors' },
    { key: 'notifAlerts'   as const, label: 'System alerts',             desc: 'Low stock, workflow failures, critical events' },
    { key: 'notifReports'  as const, label: 'Scheduled reports',         desc: 'Report generation completions' },
  ];

  return (
    <div className="space-y-4">
      <Section title="Notification Channels">
        <div className="space-y-1">
          {channels.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
              <div>
                <p className="text-sm font-medium text-white">{s.label}</p>
                <p className="text-xs text-white/40">{s.desc}</p>
              </div>
              <Toggle
                enabled={prefs?.[s.key] ?? false}
                onChange={() => toggle(s.key)}
                disabled={updatePrefs.isPending}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Event Notifications">
        <div className="space-y-1">
          {events.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
              <div>
                <p className="text-sm font-medium text-white">{s.label}</p>
                <p className="text-xs text-white/40">{s.desc}</p>
              </div>
              <Toggle
                enabled={prefs?.[s.key] ?? false}
                onChange={() => toggle(s.key)}
                disabled={updatePrefs.isPending}
              />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────
function SecurityTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: prefs, isLoading: prefsLoading } = usePreferences();
  const toggleMfa = useToggleMfa();
  const changePassword = useChangePassword();
  const updatePrefs = useUpdatePreferences();

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function handleMfaToggle() {
    if (!profile) return;
    try {
      await toggleMfa.mutateAsync(!profile.mfaEnabled);
      toast({ title: profile.mfaEnabled ? 'MFA Disabled' : 'MFA Enabled', description: profile.mfaEnabled ? 'Two-factor authentication has been disabled.' : 'Two-factor authentication is now enabled.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update MFA', variant: 'destructive' });
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' });
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast({ title: 'Error', description: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast({ title: 'Password Changed', description: 'Your password has been updated successfully.' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to change password', variant: 'destructive' });
    }
  }

  async function togglePref(key: 'sessionTimeout' | 'ipWhitelist' | 'auditLog') {
    if (!prefs) return;
    try {
      await updatePrefs.mutateAsync({ [key]: !prefs[key] });
    } catch {
      toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
    }
  }

  if (profileLoading || prefsLoading) return <LoadingCard />;

  const securityToggles = [
    { key: 'sessionTimeout' as const, label: 'Session timeout',      desc: 'Auto-logout after 30 minutes of inactivity' },
    { key: 'ipWhitelist'    as const, label: 'IP Whitelist',          desc: 'Restrict access to approved IP addresses only' },
    { key: 'auditLog'       as const, label: 'Audit logging',         desc: 'Log all user actions and data changes' },
  ];

  return (
    <div className="space-y-4">
      <Section title="Two-Factor Authentication">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Require MFA</p>
            <p className="text-xs text-white/40 mt-0.5">Add an extra layer of security to your account</p>
          </div>
          <div className="flex items-center gap-3">
            {profile?.mfaEnabled && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">Enabled</Badge>
            )}
            <Toggle
              enabled={profile?.mfaEnabled ?? false}
              onChange={handleMfaToggle}
              disabled={toggleMfa.isPending}
            />
          </div>
        </div>
      </Section>

      <Section title="Change Password">
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <Field label="Current Password">
            <div className="relative">
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={pwForm.currentPassword}
                onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                className={`${inputCls} pr-9`}
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-2.5 top-2 text-white/30 hover:text-white/60">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="New Password">
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                  className={`${inputCls} pr-9`}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2.5 top-2 text-white/30 hover:text-white/60">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm New Password">
              <Input
                type="password"
                value={pwForm.confirmPassword}
                onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                className={inputCls}
                placeholder="••••••••"
              />
            </Field>
          </div>
          {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
            <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Passwords do not match</p>
          )}
          <div className="pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={changePassword.isPending || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            >
              {changePassword.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Updating…</> : <><Lock className="w-3.5 h-3.5 mr-1.5" />Update Password</>}
            </Button>
          </div>
        </form>
      </Section>

      <Section title="Security Settings">
        <div className="space-y-1">
          {securityToggles.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
              <div>
                <p className="text-sm font-medium text-white">{s.label}</p>
                <p className="text-xs text-white/40">{s.desc}</p>
              </div>
              <Toggle
                enabled={prefs?.[s.key] ?? false}
                onChange={() => togglePref(s.key)}
                disabled={updatePrefs.isPending}
              />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── Appearance Tab ────────────────────────────────────────────────────────────
function AppearanceTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const { data: prefs, isLoading } = usePreferences();
  const updatePrefs = useUpdatePreferences();

  async function set(key: keyof UserPreferences, value: string) {
    try {
      await updatePrefs.mutateAsync({ [key]: value });
      toast({ title: 'Saved', description: 'Preference updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update preference', variant: 'destructive' });
    }
  }

  if (isLoading) return <LoadingCard />;

  const themes = [
    { id: 'dark',   icon: Moon,    label: 'Dark' },
    { id: 'light',  icon: Sun,     label: 'Light' },
    { id: 'system', icon: Monitor, label: 'System' },
  ];

  const languages = [
    { value: 'en',    label: 'English (US)' },
    { value: 'en-gb', label: 'English (UK)' },
    { value: 'es',    label: 'Español' },
    { value: 'fr',    label: 'Français' },
    { value: 'de',    label: 'Deutsch' },
    { value: 'hi',    label: 'हिन्दी' },
    { value: 'zh',    label: '中文' },
    { value: 'ja',    label: '日本語' },
  ];

  const timezones = [
    'UTC', 'UTC-08:00 (Pacific)', 'UTC-07:00 (Mountain)', 'UTC-06:00 (Central)',
    'UTC-05:00 (Eastern)', 'UTC+00:00 (London)', 'UTC+01:00 (Paris)',
    'UTC+02:00 (Cairo)', 'UTC+03:00 (Moscow)', 'UTC+05:30 (Mumbai)',
    'UTC+08:00 (Singapore)', 'UTC+09:00 (Tokyo)', 'UTC+10:00 (Sydney)',
  ];

  const dateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MMM-YYYY', 'MMM DD, YYYY'];

  return (
    <div className="space-y-4">
      <Section title="Theme">
        <div className="grid grid-cols-3 gap-3">
          {themes.map(({ id, icon: Icon, label }) => {
            const active = (prefs?.theme ?? 'dark') === id;
            return (
              <button
                key={id}
                onClick={() => set('theme', id)}
                disabled={updatePrefs.isPending}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  active
                    ? 'border-[#2563EB]/50 bg-[#2563EB]/10 text-white'
                    : 'border-white/[0.07] bg-white/[0.02] text-white/50 hover:text-white hover:border-white/20'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-[#2563EB]' : ''}`} />
                <span className="text-xs font-medium">{label}</span>
                {active && <Check className="w-3 h-3 text-[#2563EB]" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Localization">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Language">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-white/30 flex-shrink-0" />
              <select
                value={prefs?.language ?? 'en'}
                onChange={e => set('language', e.target.value)}
                disabled={updatePrefs.isPending}
                className="flex-1 h-9 rounded-md px-2 text-sm bg-white/[0.04] border border-white/[0.07] text-white focus:outline-none focus:border-[#2563EB]/50 disabled:opacity-50"
              >
                {languages.map(l => (
                  <option key={l.value} value={l.value} className="bg-[#0a0f1e]">{l.label}</option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Date Format">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white/30 flex-shrink-0" />
              <select
                value={prefs?.dateFormat ?? 'MM/DD/YYYY'}
                onChange={e => set('dateFormat', e.target.value)}
                disabled={updatePrefs.isPending}
                className="flex-1 h-9 rounded-md px-2 text-sm bg-white/[0.04] border border-white/[0.07] text-white focus:outline-none focus:border-[#2563EB]/50 disabled:opacity-50"
              >
                {dateFormats.map(f => (
                  <option key={f} value={f} className="bg-[#0a0f1e]">{f}</option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Timezone">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/30 flex-shrink-0" />
              <select
                value={prefs?.timezone ?? 'UTC'}
                onChange={e => set('timezone', e.target.value)}
                disabled={updatePrefs.isPending}
                className="flex-1 h-9 rounded-md px-2 text-sm bg-white/[0.04] border border-white/[0.07] text-white focus:outline-none focus:border-[#2563EB]/50 disabled:opacity-50"
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz} className="bg-[#0a0f1e]">{tz}</option>
                ))}
              </select>
            </div>
          </Field>
        </div>
      </Section>
    </div>
  );
}

// ── Integrations Tab ──────────────────────────────────────────────────────────
const INTEGRATIONS = [
  { name: 'Stripe', desc: 'Payments & billing', category: 'Finance', color: '#635BFF', initials: 'ST', status: 'connected' },
  { name: 'Slack',  desc: 'Team notifications', category: 'Messaging', color: '#4A154B', initials: 'SL', status: 'connected' },
  { name: 'Google Workspace', desc: 'Docs, Drive & Calendar', category: 'Productivity', color: '#4285F4', initials: 'GW', status: 'not_connected' },
  { name: 'QuickBooks', desc: 'Accounting sync', category: 'Finance', color: '#2CA01C', initials: 'QB', status: 'not_connected' },
  { name: 'Shopify', desc: 'E-commerce orders', category: 'Sales', color: '#96BF48', initials: 'SH', status: 'not_connected' },
  { name: 'Twilio',  desc: 'SMS & voice alerts', category: 'Messaging', color: '#F22F46', initials: 'TW', status: 'not_connected' },
  { name: 'AWS S3',  desc: 'Document storage', category: 'Storage', color: '#FF9900', initials: 'S3', status: 'connected' },
  { name: 'Zapier',  desc: 'Workflow automation', category: 'Automation', color: '#FF4A00', initials: 'ZP', status: 'not_connected' },
];

function IntegrationsTab() {
  const [connecting, setConnecting] = useState<string | null>(null);

  function handleConnect(name: string) {
    setConnecting(name);
    setTimeout(() => setConnecting(null), 1200);
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
        <p className="text-xs text-white/40">Connect third-party services to automate workflows, sync data, and enhance your OmniERP experience.</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {INTEGRATIONS.map((intg) => (
          <div key={intg.name} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 flex items-center gap-4 hover:border-white/[0.12] transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: intg.color + '33', border: `1px solid ${intg.color}44` }}>
              <span style={{ color: intg.color }}>{intg.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">{intg.name}</p>
                <Badge className="text-[10px] px-1.5 py-0 bg-white/[0.05] text-white/40 border-0">{intg.category}</Badge>
              </div>
              <p className="text-xs text-white/40 mt-0.5">{intg.desc}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {intg.status === 'connected' ? (
                <>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">Connected</Badge>
                  <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/50 hover:text-red-400 hover:border-red-400/30 text-xs h-7 px-2">
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleConnect(intg.name)}
                  disabled={connecting === intg.name}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs h-7 px-3"
                >
                  {connecting === intg.name ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Connecting…</> : 'Connect'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Data & Privacy Tab ────────────────────────────────────────────────────────
function DataPrivacyTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [exporting, setExporting] = useState<string | null>(null);

  function handleExport(type: string) {
    setExporting(type);
    // Simulate export download
    setTimeout(() => {
      setExporting(null);
      toast({ title: 'Export Started', description: `Your ${type} export will be ready shortly.` });
    }, 1500);
  }

  const exports = [
    { id: 'all',         label: 'Full Data Export',          desc: 'All your organization data as JSON',    icon: Download },
    { id: 'accounting',  label: 'Accounting Data',           desc: 'GL, AR, AP and financial records',      icon: DollarSign },
    { id: 'hr',          label: 'HR & Payroll Data',         desc: 'Employees, attendance and payroll runs', icon: User },
    { id: 'inventory',   label: 'Inventory Data',            desc: 'Products, stock levels and movements',  icon: ChevronRight },
  ];

  return (
    <div className="space-y-4">
      <Section title="Export Your Data">
        <p className="text-xs text-white/40 -mt-1">Download a copy of your organization's data at any time.</p>
        <div className="space-y-2 mt-3">
          {exports.map((ex) => (
            <div key={ex.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                  <ex.icon className="w-3.5 h-3.5 text-white/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{ex.label}</p>
                  <p className="text-xs text-white/40">{ex.desc}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport(ex.label)}
                disabled={!!exporting}
                className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05] h-7 text-xs"
              >
                {exporting === ex.label ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Exporting…</> : <><Download className="w-3 h-3 mr-1" />Export</>}
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Data Retention">
        <div className="space-y-3">
          {[
            { label: 'Audit Logs', value: '12 months', desc: 'How long activity logs are retained' },
            { label: 'Deleted Records', value: '30 days', desc: 'Grace period before permanent deletion' },
            { label: 'Notification History', value: '90 days', desc: 'How long read notifications are kept' },
          ].map(({ label, value, desc }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
              <Badge className="bg-white/[0.06] text-white/60 border-white/[0.1] text-xs">{value}</Badge>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Danger Zone">
        <div className="flex items-start gap-4 p-4 rounded-lg border border-red-500/20 bg-red-500/[0.04]">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-400">Delete Organization Data</p>
            <p className="text-xs text-white/40 mt-0.5">Permanently delete all data associated with this organization. This action cannot be undone.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/30 bg-transparent text-red-400 hover:bg-red-500/10 hover:border-red-500/50 flex-shrink-0 text-xs h-7"
          >
            <Trash2 className="w-3 h-3 mr-1.5" />Delete
          </Button>
        </div>
      </Section>
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function SaveButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      disabled={loading}
      size="sm"
      className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
    >
      {loading
        ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</>
        : <><Save className="w-3.5 h-3.5 mr-1.5" />Save Changes</>
      }
    </Button>
  );
}

function LoadingCard() {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-12 flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
    </div>
  );
}
