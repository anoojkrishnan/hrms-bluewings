import mongoose, { Schema } from 'mongoose';
import type {
  SalaryComponent, SalaryStructure, EmployeeSalaryComponent,
  PayrollCycle, PayrollInput, PayrollRun, PayrollRunItem,
  StatutorySettings, Payslip,
  LoanRequest, LoanInstallment, FnFSettlement,
  AccountingMappingDoc,
} from './payroll.types';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationMeta } from '@/shared/utils/pagination';

// ── Helpers ────────────────────────────────────────────────────────────────

function getOrCreateModel(name: string, schema: Schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

const BASE_FIELDS = {
  publicId:      { type: String, required: true },
  tenantId:      { type: String, required: true },
  organizationId: String,
  isActive:      { type: Boolean, default: true },
  createdBy:     String,
  updatedBy:     String,
  deletedAt:     { type: Date, default: null },
  deletedBy:     String,
};

// ── Schemas ────────────────────────────────────────────────────────────────

const salaryComponentSchema = new Schema(
  {
    ...BASE_FIELDS,
    code:              { type: String, required: true },
    name:              { type: String, required: true },
    type:              { type: String, required: true },
    formulaType:       { type: String, required: true },
    defaultAmount:     Number,
    defaultPercentage: Number,
    formula:           String,
    isSystemComponent: { type: Boolean, default: false },
    isTaxable:         { type: Boolean, default: true },
    isVisible:         { type: Boolean, default: true },
    displayOrder:      { type: Number, default: 0 },
    description:       String,
  },
  { collection: 'salary_components', timestamps: true },
);
salaryComponentSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
salaryComponentSchema.index({ tenantId: 1, code: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

const salaryStructureSchema = new Schema(
  {
    ...BASE_FIELDS,
    code:        { type: String, required: true },
    name:        { type: String, required: true },
    description: String,
    components: [{
      componentCode:       { type: String, required: true },
      overrideFormulaType: String,
      overrideAmount:      Number,
      overridePercentage:  Number,
      overrideFormula:     String,
    }],
  },
  { collection: 'salary_structures', timestamps: true },
);
salaryStructureSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
salaryStructureSchema.index({ tenantId: 1, code: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

const employeeSalaryComponentSchema = new Schema(
  {
    ...BASE_FIELDS,
    employeeId:   { type: String, required: true },
    companyId:    { type: String, required: true },
    structureId:  { type: String, required: true },
    effectiveFrom: { type: Date, required: true },
    ctc:          Number,
    componentOverrides: [{
      componentCode: { type: String, required: true },
      amount:        Number,
      percentage:    Number,
    }],
    arrearsFlag:   { type: Boolean, default: false },
    revisedBy:     String,
    revisionNote:  String,
  },
  { collection: 'employee_salary_components', timestamps: true },
);
employeeSalaryComponentSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
// Descending effectiveFrom for latest-first lookup
employeeSalaryComponentSchema.index({ tenantId: 1, employeeId: 1, effectiveFrom: -1 });

const payrollCycleSchema = new Schema(
  {
    ...BASE_FIELDS,
    companyId:  { type: String, required: true },
    name:       { type: String, required: true },
    frequency:  { type: String, default: 'monthly' },
    payDay:     { type: Number, required: true },
    cutoffDay:  { type: Number, required: true },
  },
  { collection: 'payroll_cycles', timestamps: true },
);
payrollCycleSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
payrollCycleSchema.index({ tenantId: 1, companyId: 1 });

const payrollRunSchema = new Schema(
  {
    ...BASE_FIELDS,
    companyId:          { type: String, required: true },
    cycleId:            { type: String, required: true },
    month:              { type: Number, required: true },
    year:               { type: Number, required: true },
    status:             { type: String, required: true, default: 'draft' },
    totalEmployees:     Number,
    totalGross:         Number,
    totalDeductions:    Number,
    totalNetPay:        Number,
    processedAt:        Date,
    processedBy:        String,
    approvedAt:         Date,
    approvedBy:         String,
    finalizedAt:        Date,
    finalizedBy:        String,
    payslipsPublishedAt: Date,
    rolledBackAt:       Date,
    rolledBackBy:       String,
    rollbackReason:     String,
    jobId:              String,
    errorMessage:       String,
  },
  { collection: 'payroll_runs', timestamps: true },
);
payrollRunSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
payrollRunSchema.index({ tenantId: 1, companyId: 1, month: 1, year: 1 });
payrollRunSchema.index({ tenantId: 1, companyId: 1, status: 1 });
payrollRunSchema.index({ tenantId: 1, deletedAt: 1, year: -1, month: -1 }); // findRuns list query

// Must use new Schema() — a plain object with a "type" key is interpreted by Mongoose
// as a field-type shorthand, not a sub-document schema.
const componentLineSchema = new Schema(
  { componentCode: String, componentName: String, componentType: String, amount: Number },
  { _id: false },
);

const payrollRunItemSchema = new Schema(
  {
    ...BASE_FIELDS,
    runId:           { type: String, required: true },
    employeeId:      { type: String, required: true },
    companyId:       { type: String, required: true },
    structureId:     String,
    earnings:        [componentLineSchema],
    deductions:      [componentLineSchema],
    grossPay:        { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPay:          { type: Number, default: 0 },
    lopDays:         { type: Number, default: 0 },
    presentDays:     { type: Number, default: 0 },
    workingDays:     { type: Number, default: 0 },
    pfEmployee:      { type: Number, default: 0 },
    pfEmployer:      { type: Number, default: 0 },
    esiEmployee:     { type: Number, default: 0 },
    esiEmployer:     { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    tds:             { type: Number, default: 0 },
    isPreview:       { type: Boolean, default: true },
  },
  { collection: 'payroll_run_items', timestamps: true },
);
payrollRunItemSchema.index({ tenantId: 1, runId: 1, employeeId: 1 }, { unique: true });
payrollRunItemSchema.index({ tenantId: 1, runId: 1 });

const payrollInputSchema = new Schema(
  {
    ...BASE_FIELDS,
    runId:       { type: String, required: true },
    employeeId:  { type: String, required: true },
    companyId:   { type: String, required: true },
    lopDays:     Number,
    bonusAmount: Number,
    adhocEarnings:   [{ label: String, amount: Number }],
    adhocDeductions: [{ label: String, amount: Number }],
    notes:       String,
  },
  { collection: 'payroll_inputs', timestamps: true },
);
payrollInputSchema.index({ tenantId: 1, runId: 1, employeeId: 1 }, { unique: true });
payrollInputSchema.index({ tenantId: 1, runId: 1 });

const statutorySettingsSchema = new Schema(
  {
    ...BASE_FIELDS,
    companyId:         { type: String, required: true },
    pfEnabled:         { type: Boolean, default: true },
    pfEmployeeRate:    { type: Number, default: 12 },
    pfEmployerRate:    { type: Number, default: 12 },
    pfWageCeiling:     { type: Number, default: 15000 },
    esiEnabled:        { type: Boolean, default: true },
    esiEmployeeRate:   { type: Number, default: 0.75 },
    esiEmployerRate:   { type: Number, default: 3.25 },
    esiWageCeiling:    { type: Number, default: 21000 },
    ptEnabled:         { type: Boolean, default: false },
    ptState:           { type: String, default: '' },
    ptSlabs:           [{ upTo: Number, amount: Number }],
    tdsEnabled:        { type: Boolean, default: false },
    tdsDefaultRate:    { type: Number, default: 0 },
  },
  { collection: 'statutory_settings', timestamps: true },
);
statutorySettingsSchema.index({ tenantId: 1, companyId: 1 }, { unique: true });

const payslipSchema = new Schema(
  {
    ...BASE_FIELDS,
    runId:       { type: String, required: true },
    runItemId:   { type: String, required: true },
    employeeId:  { type: String, required: true },
    companyId:   { type: String, required: true },
    month:       { type: Number, required: true },
    year:        { type: Number, required: true },
    isPublished: { type: Boolean, default: false },
    publishedAt: Date,
    data:        Schema.Types.Mixed,
  },
  { collection: 'payslips', timestamps: true },
);
payslipSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
payslipSchema.index({ tenantId: 1, employeeId: 1, month: 1, year: 1 });
payslipSchema.index({ tenantId: 1, runId: 1, isPublished: 1 });

// ── Loan Schemas ───────────────────────────────────────────────────────────

const loanRequestSchema = new Schema({
  ...BASE_FIELDS,
  employeeId:      { type: String, required: true },
  companyId:       String,
  amount:          { type: Number, required: true },
  tenureMonths:    { type: Number, required: true },
  purpose:         { type: String, required: true },
  status:          { type: String, required: true, default: 'pending' },
  emi:             Number,
  disbursedAt:     Date,
  closedAt:        Date,
  rejectionReason: String,
  approvedBy:      String,
}, { collection: 'loan_requests', timestamps: true });
loanRequestSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
loanRequestSchema.index({ tenantId: 1, employeeId: 1, status: 1 });

const loanInstallmentSchema = new Schema({
  publicId:      { type: String, required: true },
  tenantId:      { type: String, required: true },
  loanId:        { type: String, required: true },
  installmentNo: { type: Number, required: true },
  dueDate:       { type: Date,   required: true },
  emiAmount:     { type: Number, required: true },
  paid:          { type: Boolean, default: false },
  paidAt:        Date,
  payrollRunId:  String,
}, { collection: 'loan_installments', timestamps: true });
loanInstallmentSchema.index({ tenantId: 1, loanId: 1 });

// ── FnF Schema ─────────────────────────────────────────────────────────────

const fnfSchema = new Schema({
  ...BASE_FIELDS,
  employeeId:            { type: String, required: true },
  companyId:             { type: String, required: true },
  separationDate:        Date,
  lastWorkingDate:       Date,
  noticePeriodDays:      { type: Number, default: 0 },
  noticeServedDays:      { type: Number, default: 0 },
  noticePay:             { type: Number, default: 0 },
  leaveEncashmentDays:   { type: Number, default: 0 },
  leaveEncashmentAmount: { type: Number, default: 0 },
  gratuityYears:         { type: Number, default: 0 },
  gratuityAmount:        { type: Number, default: 0 },
  bonusAmount:           { type: Number, default: 0 },
  loanRecovery:          { type: Number, default: 0 },
  assetRecovery:         { type: Number, default: 0 },
  totalPayable:          { type: Number, default: 0 },
  totalRecovery:         { type: Number, default: 0 },
  netSettlement:         { type: Number, default: 0 },
  status:                { type: String, default: 'draft' },
  approvedBy:            String,
  approvedAt:            Date,
  settledAt:             Date,
  notes:                 String,
}, { collection: 'fnf_settlements', timestamps: true });
fnfSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
fnfSchema.index({ tenantId: 1, employeeId: 1 });

// ── Models ─────────────────────────────────────────────────────────────────

const LoanRequestModel     = getOrCreateModel('LoanRequest', loanRequestSchema);
const LoanInstallmentModel = getOrCreateModel('LoanInstallment', loanInstallmentSchema);
const FnFModel             = getOrCreateModel('FnFSettlement', fnfSchema);

// ── Accounting Mapping Schema ──────────────────────────────────────────────

const accountingMappingSchema = new Schema({
  publicId:   { type: String, required: true, unique: true },
  tenantId:   { type: String, required: true },
  companyId:  { type: String, required: true },
  mappings:   [{ componentCode: String, glAccount: String, glDescription: String, costCentre: String }],
  updatedBy:  String,
}, { collection: 'accounting_mappings', timestamps: true });
accountingMappingSchema.index({ tenantId: 1, companyId: 1 }, { unique: true });

const AccountingMappingModel = getOrCreateModel('AccountingMapping', accountingMappingSchema);

const SalaryComponentModel        = getOrCreateModel('SalaryComponent', salaryComponentSchema);
const SalaryStructureModel        = getOrCreateModel('SalaryStructure', salaryStructureSchema);
const EmployeeSalaryComponentModel = getOrCreateModel('EmployeeSalaryComponent', employeeSalaryComponentSchema);
const PayrollCycleModel           = getOrCreateModel('PayrollCycle', payrollCycleSchema);
const PayrollRunModel             = getOrCreateModel('PayrollRun', payrollRunSchema);
const PayrollRunItemModel         = getOrCreateModel('PayrollRunItem', payrollRunItemSchema);
const PayrollInputModel           = getOrCreateModel('PayrollInput', payrollInputSchema);
const StatutorySettingsModel      = getOrCreateModel('StatutorySettings', statutorySettingsSchema);
const PayslipModel                = getOrCreateModel('Payslip', payslipSchema);

// ── Repository ─────────────────────────────────────────────────────────────

export class PayrollRepository {
  private baseFilter(tenantId: string, extra?: Record<string, unknown>) {
    return { tenantId, deletedAt: null, ...extra };
  }

  // ── Salary Components ────────────────────────────────────────────────────

  async findComponents(tenantId: string): Promise<SalaryComponent[]> {
    const docs = await SalaryComponentModel
      .find(this.baseFilter(tenantId))
      .sort({ displayOrder: 1, name: 1 })
      .lean();
    return docs as unknown as SalaryComponent[];
  }

  async findComponentByCode(code: string, tenantId: string): Promise<SalaryComponent | null> {
    const doc = await SalaryComponentModel.findOne(this.baseFilter(tenantId, { code })).lean();
    return doc as unknown as SalaryComponent | null;
  }

  async findComponentByPublicId(publicId: string, tenantId: string): Promise<SalaryComponent | null> {
    const doc = await SalaryComponentModel.findOne(this.baseFilter(tenantId, { publicId })).lean();
    return doc as unknown as SalaryComponent | null;
  }

  async createComponent(data: Omit<SalaryComponent, '_id' | 'createdAt' | 'updatedAt'>): Promise<SalaryComponent> {
    const doc = await SalaryComponentModel.create(data);
    return doc.toObject() as unknown as SalaryComponent;
  }

  async updateComponent(publicId: string, tenantId: string, patch: Partial<SalaryComponent>): Promise<SalaryComponent | null> {
    const doc = await SalaryComponentModel.findOneAndUpdate(
      this.baseFilter(tenantId, { publicId }),
      { $set: { ...patch, updatedAt: new Date() } },
      { new: true },
    ).lean();
    return doc as unknown as SalaryComponent | null;
  }

  async softDeleteComponent(publicId: string, tenantId: string, deletedBy: string): Promise<void> {
    await SalaryComponentModel.updateOne(
      this.baseFilter(tenantId, { publicId }),
      { $set: { deletedAt: new Date(), deletedBy, isActive: false } },
    );
  }

  async findStructuresUsingComponent(componentCode: string, tenantId: string): Promise<SalaryStructure[]> {
    const docs = await SalaryStructureModel.find({
      ...this.baseFilter(tenantId),
      'components.componentCode': componentCode,
    }).lean();
    return docs as unknown as SalaryStructure[];
  }

  // ── Salary Structures ────────────────────────────────────────────────────

  async findStructures(tenantId: string): Promise<SalaryStructure[]> {
    const docs = await SalaryStructureModel.find(this.baseFilter(tenantId)).sort({ name: 1 }).lean();
    return docs as unknown as SalaryStructure[];
  }

  async findStructureByPublicId(publicId: string, tenantId: string): Promise<SalaryStructure | null> {
    const doc = await SalaryStructureModel.findOne(this.baseFilter(tenantId, { publicId })).lean();
    return doc as unknown as SalaryStructure | null;
  }

  async findStructureByCode(code: string, tenantId: string): Promise<SalaryStructure | null> {
    const doc = await SalaryStructureModel.findOne(this.baseFilter(tenantId, { code })).lean();
    return doc as unknown as SalaryStructure | null;
  }

  async createStructure(data: Omit<SalaryStructure, '_id' | 'createdAt' | 'updatedAt'>): Promise<SalaryStructure> {
    const doc = await SalaryStructureModel.create(data);
    return doc.toObject() as unknown as SalaryStructure;
  }

  async updateStructure(publicId: string, tenantId: string, patch: Partial<SalaryStructure>): Promise<SalaryStructure | null> {
    const doc = await SalaryStructureModel.findOneAndUpdate(
      this.baseFilter(tenantId, { publicId }),
      { $set: { ...patch, updatedAt: new Date() } },
      { new: true },
    ).lean();
    return doc as unknown as SalaryStructure | null;
  }

  // ── Employee Salary ──────────────────────────────────────────────────────

  async findEffectiveSalary(employeeId: string, tenantId: string, asOfDate: Date): Promise<EmployeeSalaryComponent | null> {
    const doc = await EmployeeSalaryComponentModel
      .findOne({ ...this.baseFilter(tenantId), employeeId, effectiveFrom: { $lte: asOfDate } })
      .sort({ effectiveFrom: -1 })
      .lean();
    return doc as unknown as EmployeeSalaryComponent | null;
  }

  async findSalaryHistory(employeeId: string, tenantId: string): Promise<EmployeeSalaryComponent[]> {
    const docs = await EmployeeSalaryComponentModel
      .find(this.baseFilter(tenantId, { employeeId }))
      .sort({ effectiveFrom: -1 })
      .lean();
    return docs as unknown as EmployeeSalaryComponent[];
  }

  async upsertEmployeeSalary(data: Omit<EmployeeSalaryComponent, '_id' | 'createdAt' | 'updatedAt'>): Promise<EmployeeSalaryComponent> {
    const doc = await EmployeeSalaryComponentModel.findOneAndUpdate(
      { tenantId: data.tenantId, employeeId: data.employeeId, effectiveFrom: data.effectiveFrom, deletedAt: null },
      { $set: { ...data, updatedAt: new Date() } },
      { upsert: true, new: true },
    ).lean();
    return doc as unknown as EmployeeSalaryComponent;
  }

  // ── Payroll Cycles ───────────────────────────────────────────────────────

  async findCycles(tenantId: string, companyId?: string): Promise<PayrollCycle[]> {
    const filter = companyId
      ? this.baseFilter(tenantId, { companyId })
      : this.baseFilter(tenantId);
    const docs = await PayrollCycleModel.find(filter).sort({ name: 1 }).lean();
    return docs as unknown as PayrollCycle[];
  }

  async findCycleByPublicId(publicId: string, tenantId: string): Promise<PayrollCycle | null> {
    const doc = await PayrollCycleModel.findOne(this.baseFilter(tenantId, { publicId })).lean();
    return doc as unknown as PayrollCycle | null;
  }

  async createCycle(data: Omit<PayrollCycle, '_id' | 'createdAt' | 'updatedAt'>): Promise<PayrollCycle> {
    const doc = await PayrollCycleModel.create(data);
    return doc.toObject() as unknown as PayrollCycle;
  }

  async updateCycle(publicId: string, tenantId: string, patch: Partial<PayrollCycle>): Promise<PayrollCycle | null> {
    const doc = await PayrollCycleModel.findOneAndUpdate(
      this.baseFilter(tenantId, { publicId }),
      { $set: { ...patch, updatedAt: new Date() } },
      { new: true },
    ).lean();
    return doc as unknown as PayrollCycle | null;
  }

  // ── Payroll Runs ─────────────────────────────────────────────────────────

  async findRunByMonthYear(companyId: string, month: number, year: number, tenantId: string): Promise<PayrollRun | null> {
    const doc = await PayrollRunModel.findOne({
      tenantId, companyId, month, year,
      status: { $ne: 'rolled_back' },
      deletedAt: null,
    }).lean();
    return doc as unknown as PayrollRun | null;
  }

  async findRuns(tenantId: string, companyId: string | undefined, page: number, limit: number): Promise<PaginatedResult<PayrollRun>> {
    const query = companyId
      ? this.baseFilter(tenantId, { companyId })
      : this.baseFilter(tenantId);
    const [docs, total] = await Promise.all([
      PayrollRunModel.find(query).sort({ year: -1, month: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PayrollRunModel.countDocuments(query),
    ]);
    return { data: docs as unknown as PayrollRun[], meta: buildPaginationMeta(page, limit, total) };
  }

  async findRunByPublicId(publicId: string, tenantId: string): Promise<PayrollRun | null> {
    const doc = await PayrollRunModel.findOne(this.baseFilter(tenantId, { publicId })).lean();
    return doc as unknown as PayrollRun | null;
  }

  async createRun(data: Omit<PayrollRun, '_id' | 'createdAt' | 'updatedAt'>): Promise<PayrollRun> {
    const doc = await PayrollRunModel.create(data);
    return doc.toObject() as unknown as PayrollRun;
  }

  async updateRunStatus(publicId: string, tenantId: string, patch: Partial<PayrollRun>): Promise<PayrollRun | null> {
    const doc = await PayrollRunModel.findOneAndUpdate(
      this.baseFilter(tenantId, { publicId }),
      { $set: { ...patch, updatedAt: new Date() } },
      { new: true },
    ).lean();
    return doc as unknown as PayrollRun | null;
  }

  // ── Run Items ────────────────────────────────────────────────────────────

  async upsertRunItem(data: Omit<PayrollRunItem, '_id' | 'createdAt' | 'updatedAt'>): Promise<PayrollRunItem> {
    const doc = await PayrollRunItemModel.findOneAndUpdate(
      { tenantId: data.tenantId, runId: data.runId, employeeId: data.employeeId },
      { $set: { ...data, updatedAt: new Date() } },
      { upsert: true, new: true },
    ).lean();
    return doc as unknown as PayrollRunItem;
  }

  async findRunItems(runId: string, tenantId: string): Promise<PayrollRunItem[]> {
    const docs = await PayrollRunItemModel.find({ tenantId, runId, deletedAt: null }).lean();
    return docs as unknown as PayrollRunItem[];
  }

  async deleteRunItems(runId: string, tenantId: string): Promise<void> {
    await PayrollRunItemModel.deleteMany({ tenantId, runId });
  }

  // ── Payroll Inputs ───────────────────────────────────────────────────────

  async upsertInput(data: Omit<PayrollInput, '_id' | 'createdAt' | 'updatedAt'>): Promise<PayrollInput> {
    const doc = await PayrollInputModel.findOneAndUpdate(
      { tenantId: data.tenantId, runId: data.runId, employeeId: data.employeeId },
      { $set: { ...data, updatedAt: new Date() } },
      { upsert: true, new: true },
    ).lean();
    return doc as unknown as PayrollInput;
  }

  async findInputsByRun(runId: string, tenantId: string): Promise<PayrollInput[]> {
    const docs = await PayrollInputModel.find({ tenantId, runId, deletedAt: null }).lean();
    return docs as unknown as PayrollInput[];
  }

  async findInputByEmployee(runId: string, employeeId: string, tenantId: string): Promise<PayrollInput | null> {
    const doc = await PayrollInputModel.findOne({ tenantId, runId, employeeId, deletedAt: null }).lean();
    return doc as unknown as PayrollInput | null;
  }

  // ── Statutory Settings ───────────────────────────────────────────────────

  async findStatutoryByCompany(companyId: string, tenantId: string): Promise<StatutorySettings | null> {
    const doc = await StatutorySettingsModel.findOne({ tenantId, companyId }).lean();
    return doc as unknown as StatutorySettings | null;
  }

  async upsertStatutory(data: Partial<StatutorySettings> & { companyId: string; tenantId: string }): Promise<StatutorySettings> {
    const doc = await StatutorySettingsModel.findOneAndUpdate(
      { tenantId: data.tenantId, companyId: data.companyId },
      { $set: { ...data, updatedAt: new Date() } },
      { upsert: true, new: true },
    ).lean();
    return doc as unknown as StatutorySettings;
  }

  // ── Payslips ─────────────────────────────────────────────────────────────

  async createPayslips(items: Array<Omit<Payslip, '_id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    if (items.length > 0) {
      await PayslipModel.insertMany(items);
    }
  }

  async findPayslipsByRun(runId: string, tenantId: string): Promise<Payslip[]> {
    const docs = await PayslipModel.find({ tenantId, runId, deletedAt: null }).lean();
    return docs as unknown as Payslip[];
  }

  async findPayslipsByEmployee(
    employeeId: string,
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Payslip>> {
    const query = { tenantId, employeeId, isPublished: true, deletedAt: null };
    const [docs, total] = await Promise.all([
      PayslipModel.find(query).sort({ year: -1, month: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PayslipModel.countDocuments(query),
    ]);
    return { data: docs as unknown as Payslip[], meta: buildPaginationMeta(page, limit, total) };
  }

  async findAllPayslips(
    tenantId: string,
    companyId: string | undefined,
    page: number,
    limit: number,
    onlyPublished: boolean,
  ): Promise<PaginatedResult<Payslip>> {
    const query: Record<string, unknown> = { tenantId, deletedAt: null };
    if (companyId) query.companyId = companyId;
    if (onlyPublished) query.isPublished = true;
    const [docs, total] = await Promise.all([
      PayslipModel.find(query).sort({ year: -1, month: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PayslipModel.countDocuments(query),
    ]);
    return { data: docs as unknown as Payslip[], meta: buildPaginationMeta(page, limit, total) };
  }

  async findPayslipByPublicId(publicId: string, tenantId: string): Promise<Payslip | null> {
    const doc = await PayslipModel.findOne({ tenantId, publicId, deletedAt: null }).lean();
    return doc as unknown as Payslip | null;
  }

  async publishPayslips(runId: string, tenantId: string): Promise<void> {
    await PayslipModel.updateMany(
      { tenantId, runId },
      { $set: { isPublished: true, publishedAt: new Date() } },
    );
  }

  async deletePayslipsByRun(runId: string, tenantId: string): Promise<void> {
    await PayslipModel.deleteMany({ tenantId, runId });
  }

  // ── Loans ──────────────────────────────────────────────────────────────────

  async createLoan(data: Omit<LoanRequest, '_id' | 'createdAt' | 'updatedAt'>): Promise<LoanRequest> {
    const doc = await LoanRequestModel.create(data);
    return doc.toObject() as unknown as LoanRequest;
  }

  async findLoanByPublicId(publicId: string, tenantId: string): Promise<LoanRequest | null> {
    const doc = await LoanRequestModel.findOne(this.baseFilter(tenantId, { publicId })).lean();
    return doc as unknown as LoanRequest | null;
  }

  async findLoansByEmployee(employeeId: string, tenantId: string): Promise<LoanRequest[]> {
    const docs = await LoanRequestModel.find(this.baseFilter(tenantId, { employeeId })).sort({ createdAt: -1 }).lean();
    return docs as unknown as LoanRequest[];
  }

  async findActiveLoansForEmployee(employeeId: string, tenantId: string): Promise<LoanRequest[]> {
    const docs = await LoanRequestModel.find(this.baseFilter(tenantId, { employeeId, status: 'active' })).lean();
    return docs as unknown as LoanRequest[];
  }

  async findAllLoans(tenantId: string, status?: string): Promise<LoanRequest[]> {
    const filter = status ? this.baseFilter(tenantId, { status }) : this.baseFilter(tenantId);
    const docs = await LoanRequestModel.find(filter).sort({ createdAt: -1 }).lean();
    return docs as unknown as LoanRequest[];
  }

  async updateLoan(publicId: string, tenantId: string, patch: Partial<LoanRequest>): Promise<LoanRequest | null> {
    const doc = await LoanRequestModel.findOneAndUpdate(
      this.baseFilter(tenantId, { publicId }),
      { $set: { ...patch, updatedAt: new Date() } },
      { new: true },
    ).lean();
    return doc as unknown as LoanRequest | null;
  }

  async createInstallments(installments: LoanInstallment[]): Promise<void> {
    await LoanInstallmentModel.insertMany(installments);
  }

  async findInstallmentsByLoan(loanId: string, tenantId: string): Promise<LoanInstallment[]> {
    const docs = await LoanInstallmentModel.find({ tenantId, loanId }).sort({ installmentNo: 1 }).lean();
    return docs as unknown as LoanInstallment[];
  }

  async markInstallmentPaid(tenantId: string, loanId: string, installmentNo: number, payrollRunId: string): Promise<void> {
    await LoanInstallmentModel.updateOne(
      { tenantId, loanId, installmentNo, paid: false },
      { $set: { paid: true, paidAt: new Date(), payrollRunId } },
    );
  }

  // ── FnF ────────────────────────────────────────────────────────────────────

  async createFnF(data: Omit<FnFSettlement, '_id' | 'createdAt' | 'updatedAt'>): Promise<FnFSettlement> {
    const doc = await FnFModel.create(data);
    return doc.toObject() as unknown as FnFSettlement;
  }

  async findFnFByPublicId(publicId: string, tenantId: string): Promise<FnFSettlement | null> {
    const doc = await FnFModel.findOne(this.baseFilter(tenantId, { publicId })).lean();
    return doc as unknown as FnFSettlement | null;
  }

  async findFnFByEmployee(employeeId: string, tenantId: string): Promise<FnFSettlement | null> {
    const doc = await FnFModel.findOne(this.baseFilter(tenantId, { employeeId })).sort({ createdAt: -1 }).lean();
    return doc as unknown as FnFSettlement | null;
  }

  async listFnF(tenantId: string): Promise<FnFSettlement[]> {
    const docs = await FnFModel.find(this.baseFilter(tenantId)).sort({ createdAt: -1 }).lean();
    return docs as unknown as FnFSettlement[];
  }

  async updateFnF(publicId: string, tenantId: string, patch: Partial<FnFSettlement>): Promise<FnFSettlement | null> {
    const doc = await FnFModel.findOneAndUpdate(
      this.baseFilter(tenantId, { publicId }),
      { $set: { ...patch, updatedAt: new Date() } },
      { new: true },
    ).lean();
    return doc as unknown as FnFSettlement | null;
  }

  // ── Accounting Mappings ────────────────────────────────────────────────────

  async findAccountingMappings(companyId: string, tenantId: string): Promise<AccountingMappingDoc | null> {
    const doc = await AccountingMappingModel.findOne({ tenantId, companyId }).lean();
    return doc as unknown as AccountingMappingDoc | null;
  }

  async upsertAccountingMappings(companyId: string, tenantId: string, mappings: AccountingMappingDoc['mappings'], actorId: string): Promise<AccountingMappingDoc> {
    const doc = await AccountingMappingModel.findOneAndUpdate(
      { tenantId, companyId },
      { $set: { mappings, updatedBy: actorId, updatedAt: new Date() }, $setOnInsert: { publicId: `acctmap_${tenantId}_${companyId}` } },
      { upsert: true, new: true },
    ).lean();
    return doc as unknown as AccountingMappingDoc;
  }
}
