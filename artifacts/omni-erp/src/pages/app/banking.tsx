import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Plus, Download, Search, Filter, MoreHorizontal, RefreshCw, DollarSign, Building, Clock } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const balanceHistory = [
  { date: 'Jul 21', balance: 1.62 }, { date: 'Jul 22', balance: 1.74 }, { date: 'Jul 23', balance: 1.58 },
  { date: 'Jul 24', balance: 1.89 }, { date: 'Jul 25', balance: 1.93 }, { date: 'Jul 26', balance: 1.81 }, { date: 'Jul 27', balance: 1.84 },
];

const accounts = [
  { id: 'ACC-001', bank: 'JPMorgan Chase', name: 'Operating Account', number: '****4821', balance: 1284000, currency: 'USD', status: 'active', type: 'Current' },
  { id: 'ACC-002', bank: 'Bank of America', name: 'Savings Account', number: '****2210', balance: 842000, currency: 'USD', status: 'active', type: 'Savings' },
  { id: 'ACC-003', bank: 'Citibank', name: 'Payroll Account', number: '****9801', balance: 520000, currency: 'USD', status: 'active', type: 'Current' },
  { id: 'ACC-004', bank: 'HSBC', name: 'International', number: '****3312', balance: 94200, currency: 'USD', status: 'active', type: 'Current' },
];

const transactions = [
  { id: 'TXN-9210', desc: 'Payment from Stratford Industries', amount: 48200, type: 'credit', date: 'Jul 27, 2026', account: 'Operating', ref: 'INV-4821' },
  { id: 'TXN-9209', desc: 'Vendor payment — TechParts Ltd.', amount: -12400, type: 'debit', date: 'Jul 26, 2026', account: 'Operating', ref: 'PO-1092' },
  { id: 'TXN-9208', desc: 'Payroll — July 2026', amount: -2010000, type: 'debit', date: 'Jul 25, 2026', account: 'Payroll', ref: 'PAY-0291' },
  { id: 'TXN-9207', desc: 'Payment from Meridian Corp', amount: 31500, type: 'credit', date: 'Jul 24, 2026', account: 'Operating', ref: 'INV-4820' },
  { id: 'TXN-9206', desc: 'Office rent — August 2026', amount: -18500, type: 'debit', date: 'Jul 23, 2026', account: 'Operating', ref: 'BILL-0912' },
  { id: 'TXN-9205', desc: 'Interest income', amount: 4200, type: 'credit', date: 'Jul 22, 2026', account: 'Savings', ref: 'INT-0042' },
];

export default function Banking() {
  const [tab, setTab] = useState('accounts');
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  return (
    <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'Banking & Payments' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Banking & Payments</h1><p className="text-white/40 text-sm mt-0.5">4 accounts · ${totalBalance.toLocaleString()} total balance</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Sync</Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Plus className="w-3.5 h-3.5 mr-1.5" />New Transfer</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {accounts.map((acc, i) => (
            <motion.div key={acc.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-[#2563EB]/30 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center">
                  <Building className="w-4 h-4 text-[#2563EB]" />
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">{acc.type}</Badge>
              </div>
              <p className="text-2xl font-bold text-white">${acc.balance.toLocaleString()}</p>
              <p className="text-xs text-white/50 mt-1">{acc.name}</p>
              <p className="text-xs text-white/30 mt-0.5">{acc.bank} · {acc.number}</p>
            </motion.div>
          ))}
        </div>

        <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Cash Balance (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={balanceHistory}>
              <defs><linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563EB" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} domain={[1.4, 2.1]} />
              <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', color: 'white' }} formatter={(v: any) => [`$${v}M`, 'Balance']} />
              <Area type="monotone" dataKey="balance" name="Balance" stroke="#2563EB" strokeWidth={2} fill="url(#balGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              {['accounts', 'transactions', 'payments', 'reconciliation'].map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50 capitalize">{t}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" /><Input placeholder="Search..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-48" /></div>
              <Button variant="outline" size="sm" className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
            </div>
          </div>

          <TabsContent value="transactions" className="mt-4">
            <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.05]">{['TXN ID', 'Description', 'Account', 'Reference', 'Date', 'Amount', ''].map(h => (<th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>))}</tr></thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-[#06B6D4]">{t.id}</td>
                      <td className="px-4 py-3 text-sm text-white/80">{t.desc}</td>
                      <td className="px-4 py-3"><Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{t.account}</Badge></td>
                      <td className="px-4 py-3 text-sm text-white/40">{t.ref}</td>
                      <td className="px-4 py-3 text-sm text-white/50">{t.date}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold flex items-center gap-1 ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.type === 'credit' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          {t.type === 'credit' ? '+' : ''}{Math.abs(t.amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
                <p className="text-xs text-white/30">Showing 6 of 1,284 transactions</p>
                <div className="flex items-center gap-1">{[1, 2, 3, '...', 214].map((p, i) => (<button key={i} className={`w-7 h-7 rounded text-xs ${p === 1 ? 'bg-[#2563EB] text-white' : 'text-white/40 hover:bg-white/[0.05]'}`}>{p}</button>))}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="mt-4">
            <div className="grid grid-cols-1 gap-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center">
                        <Building className="w-5 h-5 text-[#2563EB]" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{acc.name}</p>
                        <p className="text-xs text-white/40">{acc.bank} · {acc.number} · {acc.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-white">${acc.balance.toLocaleString()}</p>
                        <p className="text-xs text-white/40">{acc.currency}</p>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs">Active</Badge>
                      <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {['payments', 'reconciliation'].map(t => (
            <TabsContent key={t} value={t} className="mt-4">
              <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-8 text-center">
                <CreditCard className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 font-medium capitalize">{t}</p>
                <p className="text-white/30 text-sm mt-1">{t === 'payments' ? '8 pending payment approvals' : '3 accounts require reconciliation'}</p>
                <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8] mt-4"><Plus className="w-3.5 h-3.5 mr-1.5" />New {t === 'payments' ? 'Payment' : 'Reconciliation'}</Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
