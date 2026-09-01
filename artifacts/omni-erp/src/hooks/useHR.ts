import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const HR_EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"] as const;
export type HrEmploymentType = (typeof HR_EMPLOYMENT_TYPES)[number];

export const HR_EMPLOYEE_STATUSES = ["active", "inactive", "on_leave", "terminated"] as const;
export type HrEmployeeStatus = (typeof HR_EMPLOYEE_STATUSES)[number];

export const HR_SALARY_TYPES = ["monthly", "annual"] as const;
export type HrSalaryType = (typeof HR_SALARY_TYPES)[number];

export const HR_GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;
export type HrGender = (typeof HR_GENDERS)[number];

export const HR_PAYROLL_STATUSES = ["draft", "processing", "approved", "paid"] as const;
export type HrPayrollStatus = (typeof HR_PAYROLL_STATUSES)[number];

export const HR_LEAVE_REQUEST_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
export type HrLeaveRequestStatus = (typeof HR_LEAVE_REQUEST_STATUSES)[number];

export const HR_JOB_STATUSES = ["open", "on_hold", "closed", "filled"] as const;
export type HrJobStatus = (typeof HR_JOB_STATUSES)[number];

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface HrPermissions {
  canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean;
}

export interface HrSummary {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveCount: number;
  openPositions: number;
  monthlyPayroll: string;
  pendingLeaves: number;
  deptBreakdown: { deptName: string; count: number }[];
}

export interface HrAnalytics {
  headcountTrend: { month: string; count: number }[];
  payrollTrend: { period: string; status: HrPayrollStatus; gross: number; deductions: number; net: number; employees: number }[];
  leaveMix: { code: string; name: string; requests: number; days: number }[];
  hiringPipeline: { status: HrJobStatus; openings: number; postings: number }[];
  salaryByDepartment: { department: string; employees: number; monthlyCost: number }[];
  recentActivity: { happenedAt: string; type: string; label: string; reference: string }[];
}

export interface HrEmployee {
  id: number;
  orgId: number | null;
  empNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  deptId: number | null;
  deptName: string | null;
  jobTitle: string;
  employmentType: HrEmploymentType;
  status: HrEmployeeStatus;
  salary: string;
  salaryType: HrSalaryType;
  dateOfJoining: string;
  dateOfBirth: string | null;
  gender: HrGender | null;
  address: string | null;
  city: string | null;
  state: string | null;
  bankAccount: string | null;
  bankName: string | null;
  ifscCode: string | null;
  managerId: number | null;
  managerName: string | null;
  notes: string | null;
  userId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface HrLeaveType {
  id: number;
  orgId: number | null;
  name: string;
  code: string;
  allowedDays: number;
  isCarryForward: boolean;
  isPaid: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HrLeaveRequest {
  id: number;
  orgId: number | null;
  requestNumber: string;
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  totalDays: string;
  reason: string | null;
  status: HrLeaveRequestStatus;
  approvedById: number | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  employeeName: string;
  empNumber: string;
  leaveTypeName: string;
  leaveTypeCode: string;
}

export interface HrPayrollRun {
  id: number;
  orgId: number | null;
  runNumber: string;
  period: string;
  status: HrPayrollStatus;
  totalGross: string;
  totalDeductions: string;
  totalNet: string;
  employeeCount: number;
  approvedById: number | null;
  approvedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HrPayrollLine {
  id: number;
  runId: number;
  employeeId: number;
  basicPay: string;
  hra: string;
  otherAllowances: string;
  grossPay: string;
  pf: string;
  esi: string;
  tds: string;
  otherDeductions: string;
  totalDeductions: string;
  netPay: string;
  notes: string | null;
  createdAt: string;
  empNumber: string;
  employeeName: string;
  jobTitle: string;
  deptName: string | null;
}

export interface HrJobPosting {
  id: number;
  orgId: number | null;
  jobNumber: string;
  title: string;
  deptId: number | null;
  deptName: string | null;
  location: string | null;
  employmentType: HrEmploymentType;
  description: string | null;
  requirements: string | null;
  status: HrJobStatus;
  openings: number;
  closingDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Insert types ──────────────────────────────────────────────────────────────

export interface InsertHrEmployee {
  firstName: string; lastName: string; email: string; phone?: string | null;
  deptId?: number | null; jobTitle: string;
  employmentType?: HrEmploymentType; status?: HrEmployeeStatus;
  salary?: string; salaryType?: HrSalaryType;
  dateOfJoining: string; dateOfBirth?: string | null;
  gender?: HrGender | null; address?: string | null;
  city?: string | null; state?: string | null;
  bankAccount?: string | null; bankName?: string | null; ifscCode?: string | null;
  managerId?: number | null; notes?: string | null;
}

export interface InsertHrLeaveRequest {
  employeeId: number; leaveTypeId: number;
  startDate: string; endDate: string;
  totalDays?: string; reason?: string | null;
}

export interface InsertHrPayrollRun {
  period: string; notes?: string | null;
}

export interface InsertHrPayrollLine {
  employeeId: number; basicPay?: string; hra?: string;
  otherAllowances?: string; pf?: string; esi?: string;
  tds?: string; otherDeductions?: string; notes?: string | null;
}

export interface InsertHrJobPosting {
  title: string; deptId?: number | null; location?: string | null;
  employmentType?: HrEmploymentType; description?: string | null;
  requirements?: string | null; status?: HrJobStatus;
  openings?: number; closingDate?: string | null;
}

// ── Permissions ───────────────────────────────────────────────────────────────

export function useHrPermissions() {
  return useQuery<ApiResponse<HrPermissions>>({
    queryKey: ["hr", "permissions"],
    queryFn: () => api.get("/hr/my-permissions"),
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────

export function useHrSummary() {
  return useQuery<ApiResponse<HrSummary>>({
    queryKey: ["hr", "summary"],
    queryFn: () => api.get("/hr/summary"),
  });
}

export function useHrAnalytics() {
  return useQuery<ApiResponse<HrAnalytics>>({
    queryKey: ["hr", "analytics"],
    queryFn: () => api.get("/hr/analytics"),
    staleTime: 30_000,
  });
}

// ── Employees ─────────────────────────────────────────────────────────────────

export function useHrEmployees(params?: { search?: string; status?: string; deptId?: number; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status", params.status);
  if (params?.deptId) qs.set("deptId", String(params.deptId));
  if (params?.page)   qs.set("page",   String(params.page));
  if (params?.limit)  qs.set("limit",  String(params.limit));
  return useQuery<ApiResponse<HrEmployee[]> & { total?: number; totalPages?: number }>({
    queryKey: ["hr", "employees", params],
    queryFn: () => api.get(`/hr/employees?${qs}`),
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertHrEmployee) => api.post("/hr/employees", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertHrEmployee> }) =>
      api.put(`/hr/employees/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/hr/employees/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

// ── Leave Types ───────────────────────────────────────────────────────────────

export function useHrLeaveTypes() {
  return useQuery<ApiResponse<HrLeaveType[]>>({
    queryKey: ["hr", "leave-types"],
    queryFn: () => api.get("/hr/leaves/types"),
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; code: string; allowedDays?: number; isCarryForward?: boolean; isPaid?: boolean; description?: string | null }) =>
      api.post("/hr/leaves/types", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ name: string; code: string; allowedDays: number; isCarryForward: boolean; isPaid: boolean; description: string | null }> }) =>
      api.put(`/hr/leaves/types/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

export function useDeleteLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/hr/leaves/types/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

// ── Leave Requests ────────────────────────────────────────────────────────────

export function useHrLeaveRequests(params?: { search?: string; status?: string; employeeId?: number; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.search)     qs.set("search",     params.search);
  if (params?.status)     qs.set("status",     params.status);
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  if (params?.page)       qs.set("page",       String(params.page));
  return useQuery<ApiResponse<HrLeaveRequest[]> & { total?: number; totalPages?: number }>({
    queryKey: ["hr", "leave-requests", params],
    queryFn: () => api.get(`/hr/leaves/requests?${qs}`),
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertHrLeaveRequest) => api.post("/hr/leaves/requests", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

export function useUpdateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: HrLeaveRequestStatus; rejectionReason?: string | null } }) =>
      api.put(`/hr/leaves/requests/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

export function useDeleteLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/hr/leaves/requests/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

// ── Payroll Runs ──────────────────────────────────────────────────────────────

export function useHrPayrollRuns(params?: { page?: number }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  return useQuery<ApiResponse<HrPayrollRun[]> & { total?: number; totalPages?: number }>({
    queryKey: ["hr", "payroll-runs", params],
    queryFn: () => api.get(`/hr/payroll/runs?${qs}`),
  });
}

export function useHrPayrollRunLines(runId: number | null) {
  return useQuery<ApiResponse<HrPayrollLine[]>>({
    queryKey: ["hr", "payroll-run-lines", runId],
    queryFn: () => api.get(`/hr/payroll/runs/${runId}/lines`),
    enabled: runId !== null,
  });
}

export function useCreatePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertHrPayrollRun) => api.post("/hr/payroll/runs", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

export function useUpdatePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: HrPayrollStatus; notes?: string | null } }) =>
      api.put(`/hr/payroll/runs/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

export function useUpsertPayrollLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, data }: { runId: number; data: InsertHrPayrollLine }) =>
      api.post(`/hr/payroll/runs/${runId}/lines`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

// ── Job Postings ──────────────────────────────────────────────────────────────

export function useHrJobPostings(params?: { search?: string; status?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status", params.status);
  if (params?.page)   qs.set("page",   String(params.page));
  return useQuery<ApiResponse<HrJobPosting[]> & { total?: number; totalPages?: number }>({
    queryKey: ["hr", "job-postings", params],
    queryFn: () => api.get(`/hr/jobs?${qs}`),
  });
}

export function useCreateJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertHrJobPosting) => api.post("/hr/jobs", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

export function useUpdateJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertHrJobPosting> }) =>
      api.put(`/hr/jobs/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}

export function useDeleteJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/hr/jobs/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr"] }); },
  });
}
