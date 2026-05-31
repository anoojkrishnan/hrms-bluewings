import mongoose, { Schema } from 'mongoose';
import type {
  Employee, EmployeePersonalDetails, EmployeeBankDetails,
  EmployeeDocument, EmployeeStatusHistory,
} from './employee.types';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationMeta } from '@/shared/utils/pagination';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const employeeSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    employeeCode: { type: String, required: true },
    companyId: { type: String, required: true },
    workEmail: String,
    userId: String,
    status: { type: String, required: true },
    joiningDate: { type: Date, required: true },
    lastWorkingDate: Date,
    departmentId: String,
    designationId: String,
    gradeId: String,
    locationId: String,
    costCenterId: String,
    businessUnitId: String,
    reportingManagerId: String,
    employmentType: { type: String, required: true },
    probationEndDate: Date,
    confirmationDate: Date,
    noticePeriodDays: { type: Number, default: 30 },
    essEnabled: { type: Boolean, default: false },
    essInvitedAt: Date,
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
    metadata: Schema.Types.Mixed,
  },
  { collection: 'employees', timestamps: true },
);
employeeSchema.index({ tenantId: 1, employeeCode: 1 }, { unique: true });
employeeSchema.index({ tenantId: 1, organizationId: 1, status: 1 });
employeeSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });

const personalDetailsSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    employeeId: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: String,
    dateOfBirth: Date,
    gender: String,
    maritalStatus: String,
    nationality: String,
    bloodGroup: String,
    panNumber: String,
    aadhaarNumber: String,
    updatedBy: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'employee_personal_details' },
);
personalDetailsSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });

const bankDetailsSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    employeeId: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    bankName: { type: String, required: true },
    branchName: String,
    accountType: { type: String, enum: ['savings', 'current'], required: true },
    isPrimary: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: String,
  },
  { collection: 'employee_bank_details' },
);
bankDetailsSchema.index({ tenantId: 1, employeeId: 1 });

const documentSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    employeeId: { type: String, required: true },
    documentType: { type: String, required: true },
    documentName: { type: String, required: true },
    s3Key: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    checksum: { type: String, required: true },
    expiryDate: Date,
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    verifiedBy: String,
    verifiedAt: Date,
    version: { type: Number, default: 1 },
    uploadedBy: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'employee_documents', timestamps: true },
);
documentSchema.index({ tenantId: 1, employeeId: 1 });
documentSchema.index({ tenantId: 1, publicId: 1 });

const statusHistorySchema = new Schema(
  {
    tenantId: { type: String, required: true },
    employeeId: { type: String, required: true },
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    changedAt: { type: Date, required: true },
    changedBy: { type: String, required: true },
    reason: String,
  },
  { collection: 'employee_status_history' },
);
statusHistorySchema.index({ tenantId: 1, employeeId: 1, changedAt: -1 });

const codeCounterSchema = new Schema(
  {
    tenantId: { type: String, required: true, unique: true },
    prefix: { type: String, default: 'EMP' },
    seq: { type: Number, default: 0 },
  },
  { collection: 'employee_code_counters' },
);

// ─── Models ───────────────────────────────────────────────────────────────────

function getOrCreateModel(name: string, schema: Schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

const EmployeeModel = getOrCreateModel('Employee', employeeSchema);
const PersonalDetailsModel = getOrCreateModel('EmployeePersonalDetails', personalDetailsSchema);
const BankDetailsModel = getOrCreateModel('EmployeeBankDetails', bankDetailsSchema);
const DocumentModel = getOrCreateModel('EmployeeDocument', documentSchema);
const StatusHistoryModel = getOrCreateModel('EmployeeStatusHistory', statusHistorySchema);
const CodeCounterModel = getOrCreateModel('EmployeeCodeCounter', codeCounterSchema);

// ─── Repository ───────────────────────────────────────────────────────────────

export class EmployeeRepository {
  private baseFilter(tenantId: string, organizationId?: string) {
    return { tenantId, ...(organizationId && { organizationId }), deletedAt: null };
  }

  async getNextEmployeeCode(tenantId: string, prefix = 'EMP'): Promise<string> {
    const counter = await CodeCounterModel.findOneAndUpdate(
      { tenantId },
      { $inc: { seq: 1 }, $setOnInsert: { prefix } },
      { upsert: true, new: true },
    ).lean();
    const seq = (counter as unknown as { seq: number }).seq;
    return `${prefix}-${String(seq).padStart(4, '0')}`;
  }

  async createEmployee(data: Omit<Employee, '_id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    const doc = await EmployeeModel.create(data);
    return doc.toObject() as unknown as Employee;
  }

  async findByPublicId(publicId: string, tenantId: string): Promise<Employee | null> {
    const doc = await EmployeeModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean();
    return doc as unknown as Employee | null;
  }

  async findByEmployeeCode(employeeCode: string, tenantId: string): Promise<Employee | null> {
    const doc = await EmployeeModel.findOne({ ...this.baseFilter(tenantId), employeeCode }).lean();
    return doc as unknown as Employee | null;
  }

  async findByUserId(userId: string, tenantId: string): Promise<Employee | null> {
    const doc = await EmployeeModel.findOne({ userId, tenantId, deletedAt: null }).lean();
    return doc as unknown as Employee | null;
  }

  async findEmployees(
    tenantId: string,
    organizationId: string | undefined,
    filter: Record<string, unknown>,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Employee>> {
    const query = { ...this.baseFilter(tenantId, organizationId), ...filter };
    const [docs, total] = await Promise.all([
      EmployeeModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EmployeeModel.countDocuments(query),
    ]);
    return {
      data: docs as unknown as Employee[],
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async updateEmployee(publicId: string, tenantId: string, data: Partial<Employee>): Promise<Employee | null> {
    const doc = await EmployeeModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as Employee | null;
  }

  async softDeleteEmployee(publicId: string, tenantId: string, deletedBy: string): Promise<void> {
    await EmployeeModel.updateOne(
      { publicId, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy, isActive: false } },
    );
  }

  // ── Personal Details ───────────────────────────────────────────────────

  async upsertPersonalDetails(employeeId: string, tenantId: string, data: Omit<EmployeePersonalDetails, 'tenantId' | 'employeeId'>): Promise<void> {
    await PersonalDetailsModel.findOneAndUpdate(
      { tenantId, employeeId },
      { $set: { ...data, tenantId, employeeId, updatedAt: new Date() } },
      { upsert: true },
    );
  }

  async getPersonalDetails(employeeId: string, tenantId: string): Promise<EmployeePersonalDetails | null> {
    const doc = await PersonalDetailsModel.findOne({ tenantId, employeeId }).lean();
    return doc as unknown as EmployeePersonalDetails | null;
  }

  // ── Bank Details ───────────────────────────────────────────────────────

  async getBankDetails(employeeId: string, tenantId: string): Promise<EmployeeBankDetails[]> {
    const docs = await BankDetailsModel.find({ tenantId, employeeId }).lean();
    return docs as unknown as EmployeeBankDetails[];
  }

  async upsertBankDetails(employeeId: string, tenantId: string, data: Omit<EmployeeBankDetails, 'tenantId' | 'employeeId'>): Promise<void> {
    await BankDetailsModel.findOneAndUpdate(
      { tenantId, employeeId },
      { $set: { ...data, tenantId, employeeId } },
      { upsert: true },
    );
  }

  // ── Documents ─────────────────────────────────────────────────────────

  async createDocument(data: Omit<EmployeeDocument, '_id' | 'createdAt' | 'updatedAt'>): Promise<EmployeeDocument> {
    const doc = await DocumentModel.create(data);
    return doc.toObject() as unknown as EmployeeDocument;
  }

  async findDocumentsByEmployee(employeeId: string, tenantId: string): Promise<EmployeeDocument[]> {
    const docs = await DocumentModel.find(
      { tenantId, employeeId, deletedAt: null },
      { s3Key: 0 },   // never return s3Key
    ).lean();
    return docs as unknown as EmployeeDocument[];
  }

  async findDocumentByPublicId(publicId: string, tenantId: string): Promise<EmployeeDocument | null> {
    const doc = await DocumentModel.findOne({ tenantId, publicId, deletedAt: null }).lean();
    return doc as unknown as EmployeeDocument | null;
  }

  async softDeleteDocument(publicId: string, tenantId: string, deletedBy: string): Promise<void> {
    await DocumentModel.updateOne(
      { publicId, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy, isActive: false } },
    );
  }

  // ── Status History ────────────────────────────────────────────────────

  async appendStatusHistory(data: EmployeeStatusHistory): Promise<void> {
    await StatusHistoryModel.create(data);
  }

  async getStatusHistory(employeeId: string, tenantId: string): Promise<EmployeeStatusHistory[]> {
    const docs = await StatusHistoryModel.find({ tenantId, employeeId }).sort({ changedAt: -1 }).lean();
    return docs as unknown as EmployeeStatusHistory[];
  }
}
