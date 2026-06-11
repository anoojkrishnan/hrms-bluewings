import { get, getList, post, put, patch, del } from './client';
import type { AsyncJobResponse } from '@/types/api.types';

// ── Interfaces ─────────────────────────────────────────────────────────────

export type ComponentType = 'earning' | 'deduction' | 'employer_contribution' | 'benefit';
export type FormulaType   = 'fixed_amount' | 'percentage_of_basic' | 'percentage_of_gross' | 'formula' | 'statutory';
export type RunStatus     = 'draft' | 'preview' | 'processing' | 'processed' | 'approved' | 'finalized' | 'payslips_published' | 'rolled_back';

export interface SalaryComponent {
  publicId: string;
  code: string;
  name: string;
  type: ComponentType;
  formulaType: FormulaType;
  defaultAmount?: number;
  defaultPercentage?: number;
  formula?: string;
  isSystemComponent: boolean;
  isTaxable: boolean;
  isVisible: boolean;
  displayOrder: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SalaryStructureComponent {
  componentCode: string;
  overrideFormulaType?: FormulaType;
  overrideAmount?: number;
  overridePercentage?: number;
  overrideFormula?: string;
}

export interface SalaryStructure {
  publicId: string;
  code: string;
  name: string;
  description?: string;
  components: SalaryStructureComponent[];
  isActive: boolean;
  createdAt: string;
}

export interface EmployeeSalaryComponentOverride {
  componentCode: string;
  amount?: number;
  percentage?: number;
}

export interface EmployeeSalaryComponent {
  publicId: string;
  employeeId: string;
  structureId: string;
  effectiveFrom: string;
  ctc?: number;
  componentOverrides: EmployeeSalaryComponentOverride[];
  arrearsFlag: boolean;
  revisionNote?: string;
  createdAt: string;
}

export interface PayrollCycle {
  publicId: string;
  companyId: string;
  name: string;
  frequency: string;
  payDay: number;
  cutoffDay: number;
  isActive: boolean;
  createdAt: string;
}

export interface PayrollRun {
  publicId: string;
  companyId: string;
  cycleId: string;
  month: number;
  year: number;
  status: RunStatus;
  totalEmployees?: number;
  totalGross?: number;
  totalDeductions?: number;
  totalNetPay?: number;
  processedAt?: string;
  approvedAt?: string;
  finalizedAt?: string;
  payslipsPublishedAt?: string;
  jobId?: string;
  errorMessage?: string;
  rolledBackAt?: string;
  rollbackReason?: string;
  createdAt: string;
}

export interface PayrollComponentLine {
  componentCode: string;
  componentName: string;
  type: ComponentType;
  amount: number;
}

export interface PayrollRunItem {
  publicId: string;
  runId: string;
  employeeId: string;
  earnings: PayrollComponentLine[];
  deductions: PayrollComponentLine[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  lopDays: number;
  presentDays: number;
  workingDays: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  tds: number;
  isPreview: boolean;
}

export interface PayrollInput {
  publicId: string;
  runId: string;
  employeeId: string;
  lopDays?: number;
  bonusAmount?: number;
  adhocEarnings: Array<{ label: string; amount: number }>;
  adhocDeductions: Array<{ label: string; amount: number }>;
  notes?: string;
}

export interface PTSlab {
  upTo: number;
  amount: number;
}

export interface StatutorySettings {
  companyId: string;
  pfEnabled: boolean;
  pfEmployeeRate: number;
  pfEmployerRate: number;
  pfWageCeiling: number;
  esiEnabled: boolean;
  esiEmployeeRate: number;
  esiEmployerRate: number;
  esiWageCeiling: number;
  ptEnabled: boolean;
  ptState: string;
  ptSlabs: PTSlab[];
  tdsEnabled: boolean;
  tdsDefaultRate: number;
}

export interface Payslip {
  publicId: string;
  runId: string;
  employeeId: string;
  companyId: string;
  month: number;
  year: number;
  isPublished: boolean;
  publishedAt?: string;
  data: PayrollRunItem;
  createdAt: string;
}

// ── API ────────────────────────────────────────────────────────────────────

export const payrollApi = {
  // Salary Components
  listComponents:   ()                    => get<SalaryComponent[]>('/payroll/salary-components'),
  createComponent:  (dto: Partial<SalaryComponent>) => post<SalaryComponent>('/payroll/salary-components', dto),
  updateComponent:  (publicId: string, dto: Partial<SalaryComponent>) => put<SalaryComponent>(`/payroll/salary-components/${publicId}`, dto),
  deleteComponent:  (publicId: string)    => del<void>(`/payroll/salary-components/${publicId}`),

  // Salary Structures
  listStructures:   ()                    => get<SalaryStructure[]>('/payroll/salary-structures'),
  getStructure:     (publicId: string)    => get<SalaryStructure>(`/payroll/salary-structures/${publicId}`),
  createStructure:  (dto: Partial<SalaryStructure>) => post<SalaryStructure>('/payroll/salary-structures', dto),
  updateStructure:  (publicId: string, dto: Partial<SalaryStructure>) => put<SalaryStructure>(`/payroll/salary-structures/${publicId}`, dto),

  // Employee Salary
  getEmployeeSalary: (employeeCode: string) => get<{ employee: Record<string, unknown>; history: EmployeeSalaryComponent[] }>(`/payroll/salary/${employeeCode}`),
  assignSalary:      (employeeCode: string, dto: { structurePublicId: string; effectiveFrom: string; ctc?: number; componentOverrides?: EmployeeSalaryComponentOverride[] }) =>
    put<EmployeeSalaryComponent>(`/payroll/salary/${employeeCode}/assign`, dto),
  reviseSalary:      (employeeCode: string, dto: { structurePublicId: string; effectiveFrom: string; ctc?: number; componentOverrides?: EmployeeSalaryComponentOverride[]; arrearsFlag?: boolean; revisionNote?: string }) =>
    put<EmployeeSalaryComponent>(`/payroll/salary/${employeeCode}/revise`, dto),

  // Payroll Cycles
  listCycles:   (companyId?: string)  => get<PayrollCycle[]>('/payroll/cycles', { params: companyId ? { companyId } : undefined }),
  createCycle:  (dto: Partial<PayrollCycle>) => post<PayrollCycle>('/payroll/cycles', dto),
  updateCycle:  (publicId: string, dto: Partial<PayrollCycle>) => put<PayrollCycle>(`/payroll/cycles/${publicId}`, dto),

  // Payroll Runs
  listRuns:         (params?: Record<string, unknown>) => getList<PayrollRun>('/payroll/runs', { params }),
  getRun:           (publicId: string)   => get<PayrollRun>(`/payroll/runs/${publicId}`),
  createRun:        (dto: { companyId: string; cyclePublicId: string; month: number; year: number }) => post<PayrollRun>('/payroll/runs', dto),
  getRunItems:      (publicId: string)   => get<PayrollRunItem[]>(`/payroll/runs/${publicId}/items`),
  previewRun:       (publicId: string)   => post<PayrollRun>(`/payroll/runs/${publicId}/preview`),
  processRun:       (publicId: string)   => post<AsyncJobResponse>(`/payroll/runs/${publicId}/process`),
  approveRun:       (publicId: string)   => patch<PayrollRun>(`/payroll/runs/${publicId}/approve`),
  finalizeRun:      (publicId: string)   => patch<PayrollRun>(`/payroll/runs/${publicId}/finalize`),
  publishPayslips:  (publicId: string)   => post<PayrollRun>(`/payroll/runs/${publicId}/publish-payslips`),
  rollbackRun:      (publicId: string, reason: string) => patch<PayrollRun>(`/payroll/runs/${publicId}/rollback`, { reason }),

  // Payroll Inputs
  getInputs:    (runPublicId: string) => get<PayrollInput[]>(`/payroll/inputs/${runPublicId}`),
  upsertInputs: (runPublicId: string, dto: { inputs: Array<{ employeeCode: string; lopDays?: number; bonusAmount?: number; adhocEarnings?: Array<{ label: string; amount: number }>; adhocDeductions?: Array<{ label: string; amount: number }>; notes?: string }> }) =>
    put<void>(`/payroll/inputs/${runPublicId}`, dto),

  // Payslips
  listPayslips: (params?: Record<string, unknown>) => getList<Payslip>('/payroll/payslips', { params }),
  getPayslip:   (publicId: string) => get<Payslip>(`/payroll/payslips/${publicId}`),

  // Statutory Settings
  getStatutorySettings:    (companyId: string) => get<StatutorySettings>('/payroll/statutory-settings', { params: { companyId } }),
  upsertStatutorySettings: (companyId: string, dto: Partial<StatutorySettings>) => put<StatutorySettings>('/payroll/statutory-settings', dto, { params: { companyId } }),

  // Bank File
  generateBankFile: (runPublicId: string) =>
    post<Array<{ employeeCode: string; bankName: string; ifscCode: string; accountNumber: string; netPay: number }>>(`/payroll/runs/${runPublicId}/bank-file`),

  // Reports
  salaryRegister: (params: { companyId: string; month: number; year: number }) =>
    get<Record<string, unknown>[]>('/payroll/reports/salary-register', { params }),
  payoutRegister: (runPublicId: string) =>
    get<Record<string, unknown>[]>(`/payroll/reports/payout-register`, { params: { runPublicId } }),

  // Loans
  listLoans: (params?: Record<string, unknown>) => get<unknown[]>('/payroll/loans', { params }),
  requestLoan: (dto: { amount: number; tenureMonths: number; purpose: string; companyId?: string }) =>
    post<unknown>('/payroll/loans', dto),
  getLoan: (publicId: string) => get<unknown>(`/payroll/loans/${publicId}`),
  getLoanSchedule: (publicId: string) => get<unknown[]>(`/payroll/loans/${publicId}/schedule`),
  approveLoan: (publicId: string) => patch<unknown>(`/payroll/loans/${publicId}/approve`),
  rejectLoan: (publicId: string, rejectionReason: string) =>
    patch<unknown>(`/payroll/loans/${publicId}/reject`, { rejectionReason }),

  // FnF
  listFnF: () => get<unknown[]>('/payroll/fnf'),
  initiateFnF: (employeeCode: string, dto: { bonusAmount?: number; assetRecovery?: number; notes?: string }) =>
    post<unknown>(`/payroll/fnf/${employeeCode}/initiate`, dto),
  getFnF: (publicId: string) => get<unknown>(`/payroll/fnf/${publicId}`),
  approveFnF: (publicId: string) => patch<unknown>(`/payroll/fnf/${publicId}/approve`),

  // Accounting
  getAccountingMappings: (companyId: string) =>
    get<unknown>('/payroll/accounting/mappings', { params: { companyId } }),
  saveAccountingMappings: (dto: { companyId: string; mappings: Array<{ componentCode: string; glAccount: string; glDescription: string; costCentre?: string }> }) =>
    put<unknown>('/payroll/accounting/mappings', dto),
  generateAccountingExport: (runPublicId: string) =>
    post<Array<{ date: string; description: string; glAccount: string; glDescription: string; debit: number; credit: number; costCentre: string; employeeCode: string }>>(`/payroll/runs/${runPublicId}/accounting-export`),
};
