import type { BaseDocument } from '@/shared/types/common';

// ── Enums ──────────────────────────────────────────────────────────────────

export enum ComponentType {
  EARNING               = 'earning',
  DEDUCTION             = 'deduction',
  EMPLOYER_CONTRIBUTION = 'employer_contribution',
  BENEFIT               = 'benefit',
}

export enum FormulaType {
  FIXED_AMOUNT        = 'fixed_amount',
  PERCENTAGE_OF_BASIC = 'percentage_of_basic',
  PERCENTAGE_OF_GROSS = 'percentage_of_gross',
  FORMULA             = 'formula',
  STATUTORY           = 'statutory',
}

export enum PayrollFrequency {
  MONTHLY = 'monthly',
}

export enum PayrollRunStatus {
  DRAFT              = 'draft',
  PREVIEW            = 'preview',
  PROCESSING         = 'processing',
  PROCESSED          = 'processed',
  APPROVED           = 'approved',
  FINALIZED          = 'finalized',
  PAYSLIPS_PUBLISHED = 'payslips_published',
  ROLLED_BACK        = 'rolled_back',
}

// ── Core entities ──────────────────────────────────────────────────────────

export interface SalaryComponent extends BaseDocument {
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
}

export interface SalaryStructureComponent {
  componentCode: string;
  overrideFormulaType?: FormulaType;
  overrideAmount?: number;
  overridePercentage?: number;
  overrideFormula?: string;
}

export interface SalaryStructure extends BaseDocument {
  code: string;
  name: string;
  description?: string;
  components: SalaryStructureComponent[];
}

export interface EmployeeSalaryComponentOverride {
  componentCode: string;
  amount?: number;
  percentage?: number;
}

export interface EmployeeSalaryComponent extends BaseDocument {
  employeeId: string;
  companyId: string;
  structureId: string;
  effectiveFrom: Date;
  ctc?: number;
  componentOverrides: EmployeeSalaryComponentOverride[];
  arrearsFlag: boolean;
  revisedBy?: string;
  revisionNote?: string;
}

export interface PayrollCycle extends BaseDocument {
  companyId: string;
  name: string;
  frequency: PayrollFrequency;
  payDay: number;
  cutoffDay: number;
}

export interface PayrollInput extends BaseDocument {
  runId: string;
  employeeId: string;
  companyId: string;
  lopDays?: number;
  bonusAmount?: number;
  adhocEarnings: Array<{ label: string; amount: number }>;
  adhocDeductions: Array<{ label: string; amount: number }>;
  notes?: string;
}

export interface PayrollRun extends BaseDocument {
  companyId: string;
  cycleId: string;
  month: number;
  year: number;
  status: PayrollRunStatus;
  totalEmployees?: number;
  totalGross?: number;
  totalDeductions?: number;
  totalNetPay?: number;
  processedAt?: Date;
  processedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  finalizedAt?: Date;
  finalizedBy?: string;
  payslipsPublishedAt?: Date;
  rolledBackAt?: Date;
  rolledBackBy?: string;
  rollbackReason?: string;
  jobId?: string;
  errorMessage?: string;
}

export interface PayrollComponentLine {
  componentCode: string;
  componentName: string;
  type: ComponentType;
  amount: number;
}

export interface PayrollRunItem extends BaseDocument {
  runId: string;
  employeeId: string;
  companyId: string;
  structureId: string;
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

export interface PTSlab {
  upTo: number;
  amount: number;
}

export interface StatutorySettings extends BaseDocument {
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

export interface Payslip extends BaseDocument {
  runId: string;
  runItemId: string;
  employeeId: string;
  companyId: string;
  month: number;
  year: number;
  isPublished: boolean;
  publishedAt?: Date;
  data: PayrollRunItem;
}

// ── DTOs ───────────────────────────────────────────────────────────────────

export interface CreateSalaryComponentDto {
  code: string;
  name: string;
  type: ComponentType;
  formulaType: FormulaType;
  defaultAmount?: number;
  defaultPercentage?: number;
  formula?: string;
  isTaxable?: boolean;
  isVisible?: boolean;
  displayOrder?: number;
  description?: string;
}

export interface UpdateSalaryComponentDto extends Partial<CreateSalaryComponentDto> {}

export interface CreateSalaryStructureDto {
  code: string;
  name: string;
  description?: string;
  components: SalaryStructureComponent[];
}

export interface UpdateSalaryStructureDto extends Partial<CreateSalaryStructureDto> {}

export interface AssignSalaryDto {
  structurePublicId: string;
  effectiveFrom: string;
  ctc?: number;
  componentOverrides?: EmployeeSalaryComponentOverride[];
}

export interface ReviseSalaryDto extends AssignSalaryDto {
  arrearsFlag?: boolean;
  revisionNote?: string;
}

export interface CreatePayrollCycleDto {
  companyId: string;
  name: string;
  frequency?: PayrollFrequency;
  payDay: number;
  cutoffDay: number;
}

export interface UpdatePayrollCycleDto extends Partial<CreatePayrollCycleDto> {}

export interface CreatePayrollRunDto {
  companyId: string;
  cyclePublicId: string;
  month: number;
  year: number;
}

export interface PayrollInputEntry {
  employeeCode: string;
  lopDays?: number;
  bonusAmount?: number;
  adhocEarnings?: Array<{ label: string; amount: number }>;
  adhocDeductions?: Array<{ label: string; amount: number }>;
  notes?: string;
}

export interface UpsertPayrollInputsDto {
  inputs: PayrollInputEntry[];
}

export interface RollbackRunDto {
  reason: string;
}

export interface UpsertStatutorySettingsDto {
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

// ── Loans ───────────────────────────────────────────────────────────────────

export enum LoanStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  ACTIVE   = 'active',
  CLOSED   = 'closed',
  REJECTED = 'rejected',
}

export interface LoanRequest extends BaseDocument {
  employeeId:   string;
  companyId?:   string;
  amount:       number;
  tenureMonths: number;
  purpose:      string;
  status:       LoanStatus;
  emi?:         number;
  disbursedAt?: Date;
  closedAt?:    Date;
  rejectionReason?: string;
  approvedBy?:  string;
}

export interface LoanInstallment {
  publicId:        string;
  tenantId:        string;
  loanId:          string;
  installmentNo:   number;
  dueDate:         Date;
  emiAmount:       number;
  paid:            boolean;
  paidAt?:         Date;
  payrollRunId?:   string;
}

export interface CreateLoanDto {
  amount:       number;
  tenureMonths: number;
  purpose:      string;
  companyId?:   string;
}

export interface ReviewLoanDto {
  rejectionReason?: string;
}

// ── Full & Final Settlement ──────────────────────────────────────────────────

export enum FnFStatus {
  DRAFT             = 'draft',
  PENDING_APPROVAL  = 'pending_approval',
  APPROVED          = 'approved',
  SETTLED           = 'settled',
}

export interface FnFSettlement extends BaseDocument {
  employeeId:            string;
  companyId:             string;
  separationDate:        Date;
  lastWorkingDate:       Date;
  noticePeriodDays:      number;
  noticeServedDays:      number;
  noticePay:             number;
  leaveEncashmentDays:   number;
  leaveEncashmentAmount: number;
  gratuityYears:         number;
  gratuityAmount:        number;
  bonusAmount:           number;
  loanRecovery:          number;
  assetRecovery:         number;
  totalPayable:          number;
  totalRecovery:         number;
  netSettlement:         number;
  status:                FnFStatus;
  approvedBy?:           string;
  approvedAt?:           Date;
  settledAt?:            Date;
  notes?:                string;
}

// Valid run status transitions
export const VALID_RUN_TRANSITIONS: Record<PayrollRunStatus, PayrollRunStatus[]> = {
  [PayrollRunStatus.DRAFT]:              [PayrollRunStatus.PREVIEW],
  [PayrollRunStatus.PREVIEW]:            [PayrollRunStatus.PROCESSING, PayrollRunStatus.ROLLED_BACK],
  [PayrollRunStatus.PROCESSING]:         [PayrollRunStatus.PROCESSED],
  [PayrollRunStatus.PROCESSED]:          [PayrollRunStatus.APPROVED, PayrollRunStatus.ROLLED_BACK],
  [PayrollRunStatus.APPROVED]:           [PayrollRunStatus.FINALIZED, PayrollRunStatus.ROLLED_BACK],
  [PayrollRunStatus.FINALIZED]:          [PayrollRunStatus.PAYSLIPS_PUBLISHED],
  [PayrollRunStatus.PAYSLIPS_PUBLISHED]: [],
  [PayrollRunStatus.ROLLED_BACK]:        [],
};

// ── Accounting Export ────────────────────────────────────────────────────────

export interface LedgerMapping {
  componentCode:  string;
  glAccount:      string;
  glDescription:  string;
  costCentre?:    string;
}

export interface AccountingMappingDoc {
  _id?:        unknown;
  publicId:    string;
  tenantId:    string;
  companyId:   string;
  mappings:    LedgerMapping[];
  updatedBy:   string;
  updatedAt?:  Date;
}

export interface JVRow {
  date:         string;
  description:  string;
  glAccount:    string;
  glDescription: string;
  debit:        number;
  credit:       number;
  costCentre:   string;
  employeeCode: string;
}

export interface SaveMappingsDto {
  companyId: string;
  mappings:  LedgerMapping[];
}
