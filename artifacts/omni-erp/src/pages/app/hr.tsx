import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, DollarSign, UserPlus, TrendingUp, Plus, Download, Search,
  MoreHorizontal, Calendar, Pencil, Trash2, X, Loader2, CheckCircle,
  XCircle, Clock, Briefcase, ChevronDown,
} from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import HRCommandCenter from '@/components/app/hr/HRCommandCenter';
import {
  useHrPermissions, useHrSummary, useHrAnalytics,
  useHrEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee,
  useHrLeaveTypes, useCreateLeaveType, useDeleteLeaveType,
  useHrLeaveRequests, useCreateLeaveRequest, useUpdateLeaveRequest, useDeleteLeaveRequest,
  useHrPayrollRuns, useHrPayrollRunLines, useCreatePayrollRun, useUpdatePayrollRun,
  useHrJobPostings, useCreateJobPosting, useUpdateJobPosting, useDeleteJobPosting,
  HR_EMPLOYMENT_TYPES, HR_EMPLOYEE_STATUSES, HR_GENDERS, HR_SALARY_TYPES,
  HR_LEAVE_REQUEST_STATUSES, HR_PAYROLL_STATUSES, HR_JOB_STATUSES,
  type HrEmployee, type HrLeaveType, type HrLeaveRequest,
  type HrPayrollRun, type HrJobPosting,
  type InsertHrEmployee, type InsertHrLeaveRequest,
  type InsertHrPayrollRun, type InsertHrJobPosting,
} from '@/hooks/useHR';

// ── Style maps ────────────────────────────────────────────────────────────────

const empStatusStyle: Record<string, string> = {
  active:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  on_leave:   'bg-amber-500/15 text-amber-400 border-amber-500/20',
  inactive:   'bg-white/5 text-white/40 border-white/10',
  terminated: 'bg-red-500/15 text-red-400 border-red-500/20',
};
const leaveStatusStyle: Record<string, string> = {
  pending:   'bg-amber-500/15 text-amber-400 border-amber-500/20',
  approved:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  rejected:  'bg-red-500/15 text-red-400 border-red-500/20',
  cancelled: 'bg-white/5 text-white/40 border-white/10',
};
const payrollStatusStyle: Record<string, string> = {
  draft:      'bg-white/5 text-white/50 border-white/10',
  processing: 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/20',
  approved:   'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
  paid:       'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};
const jobStatusStyle: Record<string, string> = {
  open:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  on_hold: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  closed:  'bg-white/5 text-white/40 border-white/10',
  filled:  'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(v: string | undefined | null) {
  if (!v) return '₹0';
  const n = parseFloat(v);
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 10_00_000)   return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function initials(emp: HrEmployee) {
  return `${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`.toUpperCase();
}

function EmptyState({ icon: Icon, title, sub, action }: { icon: React.ElementType; title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-12 text-center">
      <Icon className="w-12 h-12 text-white/20 mx-auto mb-3" />
      <p className="text-white/50 font-medium">{title}</p>
      <p className="text-white/30 text-sm mt-1">{sub}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Employee Form ─────────────────────────────────────────────────────────────

function EmployeeForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: HrEmployee | null }) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const busy = create.isPending || update.isPending;

  const blankF: InsertHrEmployee = {
    firstName: '', lastName: '', email: '', phone: '', deptId: undefined,
    jobTitle: '', employmentType: 'full_time', status: 'active',
    salary: '0', salaryType: 'monthly', dateOfJoining: new Date().toISOString().slice(0, 10),
    gender: undefined, address: '', city: '', state: '',
    bankAccount: '', bankName: '', ifscCode: '', notes: '',
  };
  const [f, setF] = useState<InsertHrEmployee>(() => initial
    ? { firstName: initial.firstName, lastName: initial.lastName, email: initial.email, phone: initial.phone ?? '',
        deptId: initial.deptId ?? undefined, jobTitle: initial.jobTitle, employmentType: initial.employmentType,
        status: initial.status, salary: initial.salary, salaryType: initial.salaryType,
        dateOfJoining: initial.dateOfJoining, dateOfBirth: initial.dateOfBirth ?? '',
        gender: initial.gender ?? undefined, address: initial.address ?? '', city: initial.city ?? '',
        state: initial.state ?? '', bankAccount: initial.bankAccount ?? '',
        bankName: initial.bankName ?? '', ifscCode: initial.ifscCode ?? '', notes: initial.notes ?? '' }
    : blankF);

  const s = <T extends keyof InsertHrEmployee>(k: T) => (v: any) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = { ...f, deptId: f.deptId || undefined, gender: f.gender || undefined };
      if (isEdit) { await update.mutateAsync({ id: initial!.id, data: payload }); toast({ title: 'Employee updated' }); }
      else { await create.mutateAsync(payload); toast({ title: 'Employee added' }); }
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Something went wrong', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Employee' : 'Add Employee'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">First Name *</Label><Input value={f.firstName} onChange={e => s('firstName')(e.target.value)} required className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">Last Name *</Label><Input value={f.lastName} onChange={e => s('lastName')(e.target.value)} required className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">Email *</Label><Input type="email" value={f.email} onChange={e => s('email')(e.target.value)} required className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">Phone</Label><Input value={f.phone ?? ''} onChange={e => s('phone')(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">Job Title *</Label><Input value={f.jobTitle} onChange={e => s('jobTitle')(e.target.value)} required placeholder="Software Engineer" className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Employment Type</Label>
              <Select value={f.employmentType} onValueChange={s('employmentType')}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  {HR_EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t} className="text-white capitalize">{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Status</Label>
              <Select value={f.status} onValueChange={s('status')}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  {HR_EMPLOYEE_STATUSES.map(st => <SelectItem key={st} value={st} className="text-white capitalize">{st.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">Salary (₹)</Label><Input type="number" min="0" step="0.01" value={f.salary} onChange={e => s('salary')(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Salary Type</Label>
              <Select value={f.salaryType} onValueChange={s('salaryType')}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  {HR_SALARY_TYPES.map(t => <SelectItem key={t} value={t} className="text-white capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">Date of Joining *</Label><Input type="date" value={f.dateOfJoining} onChange={e => s('dateOfJoining')(e.target.value)} required className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Gender</Label>
              <Select value={f.gender ?? ''} onValueChange={v => s('gender')(v || undefined)}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  <SelectItem value="" className="text-white/40">Not specified</SelectItem>
                  {HR_GENDERS.map(g => <SelectItem key={g} value={g} className="text-white capitalize">{g.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">Address</Label><Input value={f.address ?? ''} onChange={e => s('address')(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">City</Label><Input value={f.city ?? ''} onChange={e => s('city')(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">State</Label><Input value={f.state ?? ''} onChange={e => s('state')(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
          </div>
          <p className="text-white/30 text-xs font-medium uppercase tracking-wider pt-1">Bank Details</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">Account No.</Label><Input value={f.bankAccount ?? ''} onChange={e => s('bankAccount')(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">Bank Name</Label><Input value={f.bankName ?? ''} onChange={e => s('bankName')(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">IFSC Code</Label><Input value={f.ifscCode ?? ''} onChange={e => s('ifscCode')(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-white/60 text-xs">Notes</Label><Textarea value={f.notes ?? ''} onChange={e => s('notes')(e.target.value)} rows={2} className="bg-white/[0.04] border-white/[0.08] text-white resize-none" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {busy && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Leave Request Form ────────────────────────────────────────────────────────

function LeaveRequestForm({ open, onClose, employees, leaveTypes }: {
  open: boolean; onClose: () => void;
  employees: HrEmployee[]; leaveTypes: HrLeaveType[];
}) {
  const { toast } = useToast();
  const create = useCreateLeaveRequest();
  const [f, setF] = useState<InsertHrLeaveRequest>({
    employeeId: 0, leaveTypeId: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    totalDays: '1', reason: '',
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.employeeId || !f.leaveTypeId) { toast({ title: 'Select employee and leave type', variant: 'destructive' }); return; }
    try {
      await create.mutateAsync(f);
      toast({ title: 'Leave request submitted' });
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Something went wrong', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-md">
        <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Employee *</Label>
            <Select value={String(f.employeeId || '')} onValueChange={v => setF(p => ({ ...p, employeeId: parseInt(v) }))}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent className="bg-[#0d1117] border-white/[0.08] max-h-48 overflow-y-auto">
                {employees.map(e => <SelectItem key={e.id} value={String(e.id)} className="text-white">{e.empNumber} — {e.firstName} {e.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Leave Type *</Label>
            <Select value={String(f.leaveTypeId || '')} onValueChange={v => setF(p => ({ ...p, leaveTypeId: parseInt(v) }))}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                {leaveTypes.map(lt => <SelectItem key={lt.id} value={String(lt.id)} className="text-white">{lt.name} ({lt.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">Start Date</Label><Input type="date" value={f.startDate} onChange={e => setF(p => ({ ...p, startDate: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">End Date</Label><Input type="date" value={f.endDate} onChange={e => setF(p => ({ ...p, endDate: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-white/60 text-xs">Total Days</Label><Input type="number" min="0.5" step="0.5" value={f.totalDays} onChange={e => setF(p => ({ ...p, totalDays: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
          <div className="space-y-1.5"><Label className="text-white/60 text-xs">Reason</Label><Textarea value={f.reason ?? ''} onChange={e => setF(p => ({ ...p, reason: e.target.value }))} rows={2} className="bg-white/[0.04] border-white/[0.08] text-white resize-none" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={create.isPending} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {create.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Payroll Run Detail Dialog ─────────────────────────────────────────────────

function PayrollRunDetail({ run, open, onClose }: { run: HrPayrollRun | null; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useHrPayrollRunLines(run?.id ?? null);
  const update = useUpdatePayrollRun();
  const { toast } = useToast();
  const lines = data?.data ?? [];

  async function transition(status: string) {
    if (!run) return;
    try {
      await update.mutateAsync({ id: run.id, data: { status: status as any } });
      toast({ title: `Payroll run ${status}` });
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {run?.runNumber}
            {run && <Badge className={`text-[10px] border ${payrollStatusStyle[run.status]} px-2 py-0 capitalize`}>{run.status}</Badge>}
          </DialogTitle>
        </DialogHeader>
        {run && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { l: 'Period', v: run.period },
                { l: 'Employees', v: String(run.employeeCount) },
                { l: 'Gross Pay', v: fmtMoney(run.totalGross) },
                { l: 'Net Pay', v: fmtMoney(run.totalNet) },
              ].map(item => (
                <div key={item.l} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                  <p className="text-base font-bold text-white">{item.v}</p>
                  <p className="text-xs text-white/40 mt-0.5">{item.l}</p>
                </div>
              ))}
            </div>

            {isLoading
              ? <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
              : lines.length === 0
                ? <p className="text-white/30 text-sm text-center py-6">No payroll lines.</p>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-white/[0.05]">
                        {['Employee', 'Dept', 'Gross', 'PF', 'ESI', 'TDS', 'Deductions', 'Net Pay'].map(h => (
                          <th key={h} className="text-left text-xs text-white/30 px-3 py-2">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {lines.map(l => (
                          <tr key={l.id} className="border-b border-white/[0.04]">
                            <td className="px-3 py-2">
                              <p className="text-white/80 font-medium">{l.employeeName}</p>
                              <p className="text-white/30 text-xs">{l.empNumber}</p>
                            </td>
                            <td className="px-3 py-2 text-white/50 text-xs">{l.deptName ?? '—'}</td>
                            <td className="px-3 py-2 text-white/70">{fmtMoney(l.grossPay)}</td>
                            <td className="px-3 py-2 text-white/50">{fmtMoney(l.pf)}</td>
                            <td className="px-3 py-2 text-white/50">{fmtMoney(l.esi)}</td>
                            <td className="px-3 py-2 text-white/50">{fmtMoney(l.tds)}</td>
                            <td className="px-3 py-2 text-red-400/70">{fmtMoney(l.totalDeductions)}</td>
                            <td className="px-3 py-2 text-emerald-400 font-semibold">{fmtMoney(l.netPay)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Close</Button>
              {run.status === 'draft' && (
                <Button onClick={() => transition('processing')} disabled={update.isPending} className="bg-[#06B6D4] hover:bg-[#0891b2]">
                  {update.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Submit for Approval
                </Button>
              )}
              {run.status === 'processing' && (
                <Button onClick={() => transition('approved')} disabled={update.isPending} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                  {update.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Approve
                </Button>
              )}
              {run.status === 'approved' && (
                <Button onClick={() => transition('paid')} disabled={update.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                  {update.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Mark as Paid
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Job Posting Form ──────────────────────────────────────────────────────────

function JobPostingForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: HrJobPosting | null }) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const create = useCreateJobPosting();
  const update = useUpdateJobPosting();
  const busy = create.isPending || update.isPending;

  const [f, setF] = useState<InsertHrJobPosting>(() => initial
    ? { title: initial.title, deptId: initial.deptId ?? undefined, location: initial.location ?? '', employmentType: initial.employmentType, description: initial.description ?? '', requirements: initial.requirements ?? '', status: initial.status, openings: initial.openings, closingDate: initial.closingDate ?? '' }
    : { title: '', location: '', employmentType: 'full_time', description: '', requirements: '', status: 'open', openings: 1 });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = { ...f, closingDate: f.closingDate || null };
      if (isEdit) { await update.mutateAsync({ id: initial!.id, data: payload }); toast({ title: 'Job posting updated' }); }
      else { await create.mutateAsync(payload); toast({ title: 'Job posting created' }); }
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Something went wrong', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Job Posting' : 'New Job Posting'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="space-y-1.5"><Label className="text-white/60 text-xs">Job Title *</Label><Input value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} required placeholder="Senior Software Engineer" className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">Location</Label><Input value={f.location ?? ''} onChange={e => setF(p => ({ ...p, location: e.target.value }))} placeholder="Mumbai / Remote" className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Employment Type</Label>
              <Select value={f.employmentType} onValueChange={v => setF(p => ({ ...p, employmentType: v as any }))}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  {HR_EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t} className="text-white capitalize">{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Status</Label>
              <Select value={f.status ?? 'open'} onValueChange={v => setF(p => ({ ...p, status: v as any }))}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                  {HR_JOB_STATUSES.map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">Openings</Label><Input type="number" min="1" value={f.openings ?? 1} onChange={e => setF(p => ({ ...p, openings: parseInt(e.target.value) }))} className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
            <div className="space-y-1.5"><Label className="text-white/60 text-xs">Closing Date</Label><Input type="date" value={f.closingDate ?? ''} onChange={e => setF(p => ({ ...p, closingDate: e.target.value }))} className="bg-white/[0.04] border-white/[0.08] text-white" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-white/60 text-xs">Description</Label><Textarea value={f.description ?? ''} onChange={e => setF(p => ({ ...p, description: e.target.value }))} rows={3} className="bg-white/[0.04] border-white/[0.08] text-white resize-none" /></div>
          <div className="space-y-1.5"><Label className="text-white/60 text-xs">Requirements</Label><Textarea value={f.requirements ?? ''} onChange={e => setF(p => ({ ...p, requirements: e.target.value }))} rows={3} className="bg-white/[0.04] border-white/[0.08] text-white resize-none" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {busy && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Post Job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HR() {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [empStatus, setEmpStatus] = useState('');
  const [leaveStatus, setLeaveStatus] = useState('');
  const [jobStatus, setJobStatus] = useState('');

  const [empForm,      setEmpForm]      = useState<{ open: boolean; item?: HrEmployee | null }>({ open: false });
  const [leaveForm,    setLeaveForm]    = useState(false);
  const [payDetail,    setPayDetail]    = useState<{ open: boolean; run?: HrPayrollRun }>({ open: false });
  const [jobForm,      setJobForm]      = useState<{ open: boolean; item?: HrJobPosting | null }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'emp' | 'leave' | 'job'; id: number; label: string } | null>(null);
  const [newPayroll,   setNewPayroll]   = useState(false);
  const [payPeriod,    setPayPeriod]    = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { toast } = useToast();
  const { data: permsRes } = useHrPermissions();
  const p = permsRes?.data ?? { canCreate: true, canEdit: true, canDelete: true };
  const { data: summaryRes, isLoading: summaryLoading, refetch: refetchSummary } = useHrSummary();
  const s = summaryRes?.data;
  const { data: analyticsRes, isLoading: analyticsLoading, refetch: refetchAnalytics } = useHrAnalytics();

  const { data: empRes,   isLoading: empLoading }   = useHrEmployees({ search: tab === 'employees' ? search : '', status: empStatus || undefined });
  const { data: leavesRes, isLoading: leavesLoading } = useHrLeaveRequests({ search: tab === 'leaves' ? search : '', status: leaveStatus || undefined });
  const { data: leaveTypesRes } = useHrLeaveTypes();
  const { data: payrollRes, isLoading: payrollLoading } = useHrPayrollRuns();
  const { data: jobsRes,  isLoading: jobsLoading }  = useHrJobPostings({ search: tab === 'recruitment' ? search : '', status: jobStatus || undefined });

  const employees  = empRes?.data   ?? [];
  const leaveReqs  = leavesRes?.data ?? [];
  const leaveTypes = leaveTypesRes?.data ?? [];
  const payrollRuns = payrollRes?.data ?? [];
  const jobs       = jobsRes?.data  ?? [];
  const totalEmp   = empRes?.total  ?? 0;

  const delEmp   = useDeleteEmployee();
  const delLeave = useDeleteLeaveRequest();
  const delJob   = useDeleteJobPosting();
  const appLeave = useUpdateLeaveRequest();
  const createPay = useCreatePayrollRun();

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'emp')   await delEmp.mutateAsync(deleteTarget.id);
      if (deleteTarget.type === 'leave') await delLeave.mutateAsync(deleteTarget.id);
      if (deleteTarget.type === 'job')   await delJob.mutateAsync(deleteTarget.id);
      toast({ title: 'Deleted' });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: 'Cannot delete', description: err?.message, variant: 'destructive' });
      setDeleteTarget(null);
    }
  }

  async function handleLeaveAction(id: number, status: 'approved' | 'rejected') {
    try {
      await appLeave.mutateAsync({ id, data: { status } });
      toast({ title: status === 'approved' ? 'Leave approved' : 'Leave rejected' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    }
  }

  async function createPayrollRun() {
    try {
      await createPay.mutateAsync({ period: payPeriod });
      toast({ title: 'Payroll run created', description: `Period ${payPeriod}` });
      setNewPayroll(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    }
  }

  // Dept breakdown for chart
  const deptBreakdown = s?.deptBreakdown ?? [];
  const maxDept = Math.max(...deptBreakdown.map(d => d.count), 1);

  const kpis = [
    { label: 'Total Employees', value: summaryLoading ? '—' : String(s?.totalEmployees ?? 0), sub: s ? `${s.onLeaveCount} on leave today` : '', icon: Users, color: 'text-[#2563EB]', bg: 'from-[#2563EB]/20 to-[#2563EB]/5' },
    { label: 'Monthly Payroll', value: summaryLoading ? '—' : fmtMoney(s?.monthlyPayroll), sub: 'Last approved run', icon: DollarSign, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
    { label: 'Open Positions', value: summaryLoading ? '—' : String(s?.openPositions ?? 0), sub: 'Active job postings', icon: Briefcase, color: 'text-[#06B6D4]', bg: 'from-[#06B6D4]/20 to-[#06B6D4]/5' },
    { label: 'Pending Leaves', value: summaryLoading ? '—' : String(s?.pendingLeaves ?? 0), sub: 'Awaiting approval', icon: Calendar, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5' },
  ];

  return (
    <AppLayout breadcrumbs={[{ label: 'Business' }, { label: 'HR & Payroll' }]}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">HR & Payroll</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {s ? `${s.activeEmployees} active employees · ${deptBreakdown.length} departments` : 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'employees' && p.canCreate && (
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setEmpForm({ open: true })}>
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />Hire Employee
              </Button>
            )}
            {tab === 'leaves' && p.canCreate && (
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setLeaveForm(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />New Request
              </Button>
            )}
            {tab === 'payroll' && p.canCreate && (
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setNewPayroll(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />Run Payroll
              </Button>
            )}
            {tab === 'recruitment' && p.canCreate && (
              <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setJobForm({ open: true })}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />Post Job
              </Button>
            )}
          </div>
        </div>

        {tab === 'overview' ? (
          <HRCommandCenter
            data={analyticsRes?.data}
            summary={s}
            isLoading={summaryLoading || analyticsLoading}
            onRefresh={() => { void Promise.all([refetchSummary(), refetchAnalytics()]); }}
            onTab={setTab}
          />
        ) : (<>
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-all">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center mb-3`}>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className="text-xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-white/40 mt-0.5">{k.label}</p>
              <p className="text-xs text-white/25 mt-0.5">{k.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        {deptBreakdown.length > 0 && (
          <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Department Headcount</h3>
            <div className="space-y-2.5">
              {deptBreakdown.map(dept => (
                <div key={dept.deptName} className="flex items-center gap-3">
                  <span className="text-sm text-white/60 w-32 truncate flex-shrink-0">{dept.deptName}</span>
                  <div className="flex-1"><Progress value={(dept.count / maxDept) * 100} className="h-1.5 bg-white/[0.07]" /></div>
                  <span className="text-sm font-semibold text-white w-8 text-right">{dept.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </>)}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={t => { setTab(t); setSearch(''); }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList className="bg-white/[0.04] border border-white/[0.07]">
              {[['overview','Overview'],['employees','Employees'],['payroll','Payroll'],['leaves','Leaves'],['recruitment','Recruitment']].map(([v, l]) => (
                <TabsTrigger key={v} value={v} className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white text-white/50">{l}</TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/30 h-8 text-sm w-44" />
              </div>
              {tab === 'employees' && (
                <Select value={empStatus} onValueChange={setEmpStatus}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white/60 h-8 text-xs w-32"><SelectValue placeholder="All status" /></SelectTrigger>
                  <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                    <SelectItem value="" className="text-white/60">All status</SelectItem>
                    {HR_EMPLOYEE_STATUSES.map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {tab === 'leaves' && (
                <Select value={leaveStatus} onValueChange={setLeaveStatus}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white/60 h-8 text-xs w-32"><SelectValue placeholder="All status" /></SelectTrigger>
                  <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                    <SelectItem value="" className="text-white/60">All status</SelectItem>
                    {HR_LEAVE_REQUEST_STATUSES.map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {tab === 'recruitment' && (
                <Select value={jobStatus} onValueChange={setJobStatus}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.07] text-white/60 h-8 text-xs w-32"><SelectValue placeholder="All status" /></SelectTrigger>
                  <SelectContent className="bg-[#0d1117] border-white/[0.08]">
                    <SelectItem value="" className="text-white/60">All status</SelectItem>
                    {HR_JOB_STATUSES.map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* ── Employees ── */}
          <TabsContent value="employees" className="mt-4">
            {empLoading
              ? <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
              : employees.length === 0
                ? <EmptyState icon={Users} title="No employees found" sub="Add your first employee to get started" action={p.canCreate ? <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setEmpForm({ open: true })}><UserPlus className="w-3.5 h-3.5 mr-1.5" />Hire Employee</Button> : undefined} />
                : (
                  <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b border-white/[0.05]">
                        {['Employee','Department','Role','Salary','Type','Status','Joined',''].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {employees.map(emp => (
                          <tr key={emp.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-7 h-7 flex-shrink-0">
                                  <AvatarFallback className="bg-gradient-to-br from-[#2563EB]/40 to-[#06B6D4]/40 text-white text-[9px] font-bold">{initials(emp)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium text-white">{emp.firstName} {emp.lastName}</p>
                                  <p className="text-xs text-white/30">{emp.empNumber}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-white/50">{emp.deptName ?? '—'}</td>
                            <td className="px-4 py-3 text-sm text-white/60 max-w-[160px] truncate">{emp.jobTitle}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-white">{fmtMoney(emp.salary)}<span className="text-white/30 font-normal text-xs">/{emp.salaryType === 'annual' ? 'yr' : 'mo'}</span></td>
                            <td className="px-4 py-3 text-xs text-white/40 capitalize">{emp.employmentType.replace('_', ' ')}</td>
                            <td className="px-4 py-3"><Badge className={`text-[10px] border ${empStatusStyle[emp.status]} px-2 py-0`}>{emp.status.replace('_', ' ')}</Badge></td>
                            <td className="px-4 py-3 text-xs text-white/40">{emp.dateOfJoining}</td>
                            <td className="px-4 py-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#0d1117] border-white/[0.08] text-white">
                                  {p.canEdit && <DropdownMenuItem onClick={() => setEmpForm({ open: true, item: emp })} className="hover:bg-white/[0.05] cursor-pointer"><Pencil className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>}
                                  {p.canDelete && emp.status !== 'active' && (
                                    <>
                                      <DropdownMenuSeparator className="bg-white/[0.05]" />
                                      <DropdownMenuItem onClick={() => setDeleteTarget({ type: 'emp', id: emp.id, label: `${emp.firstName} ${emp.lastName}` })} className="text-red-400 hover:bg-red-500/10 cursor-pointer"><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-4 py-3 border-t border-white/[0.05]">
                      <p className="text-xs text-white/30">Showing {employees.length} of {totalEmp} employees</p>
                    </div>
                  </div>
                )}
          </TabsContent>

          {/* ── Payroll ── */}
          <TabsContent value="payroll" className="mt-4">
            {payrollLoading
              ? <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
              : payrollRuns.length === 0
                ? <EmptyState icon={DollarSign} title="No payroll runs yet" sub="Create a payroll run to process employee salaries" action={p.canCreate ? <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setNewPayroll(true)}><Plus className="w-3.5 h-3.5 mr-1.5" />Run Payroll</Button> : undefined} />
                : (
                  <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b border-white/[0.05]">
                        {['Run #', 'Period', 'Employees', 'Gross Pay', 'Deductions', 'Net Pay', 'Status', ''].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {payrollRuns.map(run => (
                          <tr key={run.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setPayDetail({ open: true, run })}>
                            <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{run.runNumber}</td>
                            <td className="px-4 py-3 text-sm text-white/80">{run.period}</td>
                            <td className="px-4 py-3 text-sm text-white/60">{run.employeeCount}</td>
                            <td className="px-4 py-3 text-sm text-white/70">{fmtMoney(run.totalGross)}</td>
                            <td className="px-4 py-3 text-sm text-red-400/70">{fmtMoney(run.totalDeductions)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-emerald-400">{fmtMoney(run.totalNet)}</td>
                            <td className="px-4 py-3"><Badge className={`text-[10px] border ${payrollStatusStyle[run.status]} px-2 py-0 capitalize`}>{run.status}</Badge></td>
                            <td className="px-4 py-3 text-xs text-white/30" onClick={e => e.stopPropagation()}>View →</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
          </TabsContent>

          {/* ── Leaves ── */}
          <TabsContent value="leaves" className="mt-4">
            <div className="space-y-4">
              {/* Leave Types Summary */}
              {leaveTypes.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {leaveTypes.map(lt => (
                    <div key={lt.id} className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">
                      <span className="text-xs font-bold text-[#2563EB]">{lt.code}</span>
                      <span className="text-xs text-white/50">{lt.name}</span>
                      <span className="text-xs text-white/30">{lt.allowedDays}d</span>
                    </div>
                  ))}
                </div>
              )}
              {leavesLoading
                ? <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
                : leaveReqs.length === 0
                  ? <EmptyState icon={Calendar} title="No leave requests" sub="No leave requests match your current filter" action={p.canCreate ? <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setLeaveForm(true)}><Plus className="w-3.5 h-3.5 mr-1.5" />New Request</Button> : undefined} />
                  : (
                    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead><tr className="border-b border-white/[0.05]">
                          {['Request #', 'Employee', 'Leave Type', 'From', 'To', 'Days', 'Status', ''].map(h => (
                            <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {leaveReqs.map(lr => (
                            <tr key={lr.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{lr.requestNumber}</td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-white/80">{lr.employeeName}</p>
                                <p className="text-xs text-white/30">{lr.empNumber}</p>
                              </td>
                              <td className="px-4 py-3"><Badge className="bg-white/5 text-white/50 border-white/10 text-xs">{lr.leaveTypeCode}</Badge></td>
                              <td className="px-4 py-3 text-xs text-white/50">{lr.startDate}</td>
                              <td className="px-4 py-3 text-xs text-white/50">{lr.endDate}</td>
                              <td className="px-4 py-3 text-sm text-white/60">{lr.totalDays}</td>
                              <td className="px-4 py-3"><Badge className={`text-[10px] border ${leaveStatusStyle[lr.status]} px-2 py-0 capitalize`}>{lr.status}</Badge></td>
                              <td className="px-4 py-3">
                                {lr.status === 'pending' && p.canEdit ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => handleLeaveAction(lr.id, 'approved')} className="p-1.5 rounded hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 transition-colors" title="Approve"><CheckCircle className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleLeaveAction(lr.id, 'rejected')} className="p-1.5 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors" title="Reject"><XCircle className="w-3.5 h-3.5" /></button>
                                    {p.canDelete && <button onClick={() => setDeleteTarget({ type: 'leave', id: lr.id, label: lr.requestNumber })} className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                                  </div>
                                ) : (
                                  <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
            </div>
          </TabsContent>

          {/* ── Recruitment ── */}
          <TabsContent value="recruitment" className="mt-4">
            {jobsLoading
              ? <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
              : jobs.length === 0
                ? <EmptyState icon={Briefcase} title="No job postings" sub="Post an open position to start the recruitment pipeline" action={p.canCreate ? <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => setJobForm({ open: true })}><Plus className="w-3.5 h-3.5 mr-1.5" />Post Job</Button> : undefined} />
                : (
                  <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b border-white/[0.05]">
                        {['Job #', 'Title', 'Department', 'Location', 'Type', 'Openings', 'Closing', 'Status', ''].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-white/30 px-4 py-3">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {jobs.map(job => (
                          <tr key={job.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-[#2563EB]">{job.jobNumber}</td>
                            <td className="px-4 py-3 text-sm font-medium text-white/80">{job.title}</td>
                            <td className="px-4 py-3 text-sm text-white/50">{job.deptName ?? '—'}</td>
                            <td className="px-4 py-3 text-sm text-white/50">{job.location ?? '—'}</td>
                            <td className="px-4 py-3 text-xs text-white/40 capitalize">{job.employmentType.replace('_', ' ')}</td>
                            <td className="px-4 py-3 text-sm text-white/60">{job.openings}</td>
                            <td className="px-4 py-3 text-xs text-white/40">{job.closingDate ?? '—'}</td>
                            <td className="px-4 py-3"><Badge className={`text-[10px] border ${jobStatusStyle[job.status]} px-2 py-0 capitalize`}>{job.status.replace('_', ' ')}</Badge></td>
                            <td className="px-4 py-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 rounded hover:bg-white/[0.07] text-white/30 hover:text-white/70"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#0d1117] border-white/[0.08] text-white">
                                  {p.canEdit && <DropdownMenuItem onClick={() => setJobForm({ open: true, item: job })} className="hover:bg-white/[0.05] cursor-pointer"><Pencil className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>}
                                  {p.canDelete && job.status !== 'open' && (
                                    <>
                                      <DropdownMenuSeparator className="bg-white/[0.05]" />
                                      <DropdownMenuItem onClick={() => setDeleteTarget({ type: 'job', id: job.id, label: job.title })} className="text-red-400 hover:bg-red-500/10 cursor-pointer"><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Forms & Dialogs */}
      <EmployeeForm open={empForm.open} initial={empForm.item} onClose={() => setEmpForm({ open: false })} />
      <LeaveRequestForm open={leaveForm} onClose={() => setLeaveForm(false)} employees={employees} leaveTypes={leaveTypes} />
      <PayrollRunDetail run={payDetail.run ?? null} open={payDetail.open} onClose={() => setPayDetail({ open: false })} />
      <JobPostingForm open={jobForm.open} initial={jobForm.item} onClose={() => setJobForm({ open: false })} />

      {/* New Payroll Run dialog */}
      <Dialog open={newPayroll} onOpenChange={v => !v && setNewPayroll(false)}>
        <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-sm">
          <DialogHeader><DialogTitle>Run Payroll</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Period (YYYY-MM)</Label>
              <Input type="month" value={payPeriod} onChange={e => setPayPeriod(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white" />
            </div>
            <p className="text-white/40 text-xs">This will auto-generate payroll lines for all active employees based on their salary.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPayroll(false)} className="border-white/[0.1] bg-transparent text-white/60 hover:text-white">Cancel</Button>
            <Button onClick={createPayrollRun} disabled={createPay.isPending} className="bg-[#2563EB] hover:bg-[#1d4ed8]">
              {createPay.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Create Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#0d1117] border-white/[0.08] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'emp' ? 'Employee' : deleteTarget?.type === 'leave' ? 'Leave Request' : 'Job Posting'}?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Are you sure you want to delete <strong className="text-white">{deleteTarget?.label}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
