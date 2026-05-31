import mongoose, { Schema } from 'mongoose';
import type {
  LeaveType, LeaveApplication, LeaveBalance,
  HolidayList, Holiday, WeekendPolicy,
} from './leave.types';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationMeta } from '@/shared/utils/pagination';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const leaveTypeSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    name: { type: String, required: true },
    code: { type: String, required: true },
    isCarryForward: { type: Boolean, default: false },
    maxCarryForwardDays: Number,
    isEncashable: { type: Boolean, default: false },
    isPaidLeave: { type: Boolean, default: true },
    requiresDocument: { type: Boolean, default: false },
    minDaysNotice: Number,
    maxConsecutiveDays: Number,
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'leave_types', timestamps: true },
);
leaveTypeSchema.index({ tenantId: 1, code: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
leaveTypeSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });

const leaveApplicationSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    employeeId: { type: String, required: true },
    companyId: { type: String, required: true },
    leaveTypeId: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    isHalfDay: { type: Boolean, default: false },
    halfDayType: String,
    reason: String,
    status: { type: String, required: true },
    appliedBy: { type: String, required: true },
    approvedBy: String,
    approvedAt: Date,
    rejectedBy: String,
    rejectedAt: Date,
    rejectionReason: String,
    revokedBy: String,
    revokedAt: Date,
    revocationReason: String,
    attachmentPublicIds: [String],
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'leave_applications', timestamps: true },
);
leaveApplicationSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
leaveApplicationSchema.index({ tenantId: 1, employeeId: 1, startDate: -1 });
leaveApplicationSchema.index({ tenantId: 1, status: 1 });

const leaveBalanceSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    organizationId: String,
    employeeId: { type: String, required: true },
    leaveTypeId: { type: String, required: true },
    leaveYear: { type: Number, required: true },
    openingBalance: { type: Number, default: 0 },
    accrued: { type: Number, default: 0 },
    granted: { type: Number, default: 0 },
    taken: { type: Number, default: 0 },
    encashed: { type: Number, default: 0 },
    lapsed: { type: Number, default: 0 },
    closingBalance: { type: Number, default: 0 },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { collection: 'leave_balances' },
);
leaveBalanceSchema.index({ tenantId: 1, employeeId: 1, leaveTypeId: 1, leaveYear: 1 }, { unique: true });

const holidayListSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    name: { type: String, required: true },
    year: { type: Number, required: true },
    companyId: { type: String, required: true },
    locationIds: [String],
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'holiday_lists', timestamps: true },
);
holidayListSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });

const holidaySchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    holidayListId: { type: String, required: true },
    name: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['national', 'regional', 'optional', 'restricted'], required: true },
    description: String,
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'holidays', timestamps: true },
);
holidaySchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
holidaySchema.index({ tenantId: 1, holidayListId: 1, date: 1 });

const weekendPolicySchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    name: { type: String, required: true },
    companyId: { type: String, required: true },
    workingDays: [Number],
    firstSaturdayOff: { type: Boolean, default: false },
    secondSaturdayOff: { type: Boolean, default: false },
    thirdSaturdayOff: { type: Boolean, default: false },
    fourthSaturdayOff: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'weekend_policies', timestamps: true },
);
weekendPolicySchema.index({ tenantId: 1, companyId: 1 });

// ─── Models ───────────────────────────────────────────────────────────────────

function getOrCreateModel(name: string, schema: Schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

const LeaveTypeModel = getOrCreateModel('LeaveType', leaveTypeSchema);
const LeaveApplicationModel = getOrCreateModel('LeaveApplication', leaveApplicationSchema);
const LeaveBalanceModel = getOrCreateModel('LeaveBalance', leaveBalanceSchema);
const HolidayListModel = getOrCreateModel('HolidayList', holidayListSchema);
const HolidayModel = getOrCreateModel('Holiday', holidaySchema);
const WeekendPolicyModel = getOrCreateModel('WeekendPolicy', weekendPolicySchema);

// ─── Repository ───────────────────────────────────────────────────────────────

export class LeaveRepository {
  private baseFilter(tenantId: string) {
    return { tenantId, deletedAt: null };
  }

  // ── Leave Types ────────────────────────────────────────────────────────

  async createLeaveType(data: Omit<LeaveType, '_id' | 'createdAt' | 'updatedAt'>): Promise<LeaveType> {
    const doc = await LeaveTypeModel.create(data);
    return doc.toObject() as unknown as LeaveType;
  }

  async findLeaveTypes(tenantId: string): Promise<LeaveType[]> {
    const docs = await LeaveTypeModel.find(this.baseFilter(tenantId)).sort({ name: 1 }).lean();
    return docs as unknown as LeaveType[];
  }

  async findLeaveTypeByCode(code: string, tenantId: string): Promise<LeaveType | null> {
    const doc = await LeaveTypeModel.findOne({ ...this.baseFilter(tenantId), code }).lean();
    return doc as unknown as LeaveType | null;
  }

  async findLeaveTypeByPublicId(publicId: string, tenantId: string): Promise<LeaveType | null> {
    const doc = await LeaveTypeModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean();
    return doc as unknown as LeaveType | null;
  }

  async updateLeaveType(publicId: string, tenantId: string, data: Partial<LeaveType>): Promise<LeaveType | null> {
    const doc = await LeaveTypeModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as LeaveType | null;
  }

  async softDeleteLeaveType(publicId: string, tenantId: string, deletedBy: string): Promise<void> {
    await LeaveTypeModel.updateOne(
      { publicId, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy, isActive: false } },
    );
  }

  // ── Leave Applications ────────────────────────────────────────────────

  async createLeaveApplication(data: Omit<LeaveApplication, '_id' | 'createdAt' | 'updatedAt'>): Promise<LeaveApplication> {
    const doc = await LeaveApplicationModel.create(data);
    return doc.toObject() as unknown as LeaveApplication;
  }

  async findApplicationByPublicId(publicId: string, tenantId: string): Promise<LeaveApplication | null> {
    const doc = await LeaveApplicationModel.findOne({ tenantId, publicId }).lean();
    return doc as unknown as LeaveApplication | null;
  }

  async findApplicationsByEmployee(
    employeeId: string,
    tenantId: string,
    filter: Record<string, unknown>,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<LeaveApplication>> {
    const query = { tenantId, employeeId, ...filter };
    const [docs, total] = await Promise.all([
      LeaveApplicationModel.find(query).sort({ startDate: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      LeaveApplicationModel.countDocuments(query),
    ]);
    return { data: docs as unknown as LeaveApplication[], meta: buildPaginationMeta(page, limit, total) };
  }

  async findApplicationsByStatus(
    tenantId: string,
    status: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<LeaveApplication>> {
    const query = { tenantId, status };
    const [docs, total] = await Promise.all([
      LeaveApplicationModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      LeaveApplicationModel.countDocuments(query),
    ]);
    return { data: docs as unknown as LeaveApplication[], meta: buildPaginationMeta(page, limit, total) };
  }

  async updateApplicationStatus(publicId: string, tenantId: string, patch: Partial<LeaveApplication>): Promise<LeaveApplication | null> {
    const doc = await LeaveApplicationModel.findOneAndUpdate(
      { tenantId, publicId },
      { $set: patch },
      { new: true },
    ).lean();
    return doc as unknown as LeaveApplication | null;
  }

  async checkOverlap(employeeId: string, tenantId: string, start: Date, end: Date, excludePublicId?: string): Promise<boolean> {
    const query: Record<string, unknown> = {
      tenantId,
      employeeId,
      status: { $in: ['pending', 'approved'] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    };
    if (excludePublicId) query.publicId = { $ne: excludePublicId };
    const count = await LeaveApplicationModel.countDocuments(query);
    return count > 0;
  }

  // ── Leave Balances ────────────────────────────────────────────────────

  async getBalance(employeeId: string, leaveTypeId: string, tenantId: string, year: number): Promise<LeaveBalance | null> {
    const doc = await LeaveBalanceModel.findOne({ tenantId, employeeId, leaveTypeId, leaveYear: year }).lean();
    return doc as unknown as LeaveBalance | null;
  }

  async getBalancesByEmployee(employeeId: string, tenantId: string, year: number): Promise<LeaveBalance[]> {
    const docs = await LeaveBalanceModel.find({ tenantId, employeeId, leaveYear: year }).lean();
    return docs as unknown as LeaveBalance[];
  }

  async upsertBalance(data: LeaveBalance): Promise<void> {
    await LeaveBalanceModel.findOneAndUpdate(
      { tenantId: data.tenantId, employeeId: data.employeeId, leaveTypeId: data.leaveTypeId, leaveYear: data.leaveYear },
      { $set: data },
      { upsert: true },
    );
  }

  async deductBalance(employeeId: string, leaveTypeId: string, tenantId: string, year: number, days: number): Promise<void> {
    await LeaveBalanceModel.findOneAndUpdate(
      { tenantId, employeeId, leaveTypeId, leaveYear: year },
      { $inc: { taken: days, closingBalance: -days }, $set: { lastUpdatedAt: new Date() } },
      { upsert: true },
    );
  }

  async creditBalance(employeeId: string, leaveTypeId: string, tenantId: string, year: number, days: number, field: 'granted' | 'accrued' | 'opening'): Promise<void> {
    const inc: Record<string, number> = { closingBalance: days };
    inc[field] = days;
    // When restoring from taken (reject/cancel), also decrease taken
    if (field === 'granted') inc.taken = -days;
    await LeaveBalanceModel.findOneAndUpdate(
      { tenantId, employeeId, leaveTypeId, leaveYear: year },
      { $inc: inc, $set: { lastUpdatedAt: new Date() } },
      { upsert: true },
    );
  }

  // ── Holidays ──────────────────────────────────────────────────────────

  async createHolidayList(data: Omit<HolidayList, '_id' | 'createdAt' | 'updatedAt'>): Promise<HolidayList> {
    const doc = await HolidayListModel.create(data);
    return doc.toObject() as unknown as HolidayList;
  }

  async findHolidayLists(tenantId: string, companyId: string, year: number): Promise<HolidayList[]> {
    const docs = await HolidayListModel.find({ ...this.baseFilter(tenantId), companyId, year }).lean();
    return docs as unknown as HolidayList[];
  }

  async createHoliday(data: Omit<Holiday, '_id' | 'createdAt' | 'updatedAt'>): Promise<Holiday> {
    const doc = await HolidayModel.create(data);
    return doc.toObject() as unknown as Holiday;
  }

  async findHolidays(tenantId: string, holidayListId: string): Promise<Holiday[]> {
    const docs = await HolidayModel.find({ ...this.baseFilter(tenantId), holidayListId }).sort({ date: 1 }).lean();
    return docs as unknown as Holiday[];
  }

  async findHolidaysByDateRange(tenantId: string, companyId: string, start: Date, end: Date): Promise<Holiday[]> {
    // Find all holiday lists for this company, then get holidays in range
    const lists = await HolidayListModel.find({ ...this.baseFilter(tenantId), companyId }).lean() as unknown as HolidayList[];
    if (!lists.length) return [];
    const listIds = lists.map((l) => l.publicId);
    const docs = await HolidayModel.find({
      ...this.baseFilter(tenantId),
      holidayListId: { $in: listIds },
      date: { $gte: start, $lte: end },
      type: { $in: ['national', 'regional'] },
    }).lean();
    return docs as unknown as Holiday[];
  }

  async upsertWeekendPolicy(tenantId: string, companyId: string, data: Omit<WeekendPolicy, '_id' | 'createdAt' | 'updatedAt'>): Promise<WeekendPolicy> {
    const doc = await WeekendPolicyModel.findOneAndUpdate(
      { tenantId, companyId },
      { $set: data },
      { upsert: true, new: true },
    ).lean();
    return doc as unknown as WeekendPolicy;
  }

  async getWeekendPolicy(tenantId: string, companyId: string): Promise<WeekendPolicy | null> {
    const doc = await WeekendPolicyModel.findOne({ tenantId, companyId, deletedAt: null }).lean();
    return doc as unknown as WeekendPolicy | null;
  }

  async findApprovedLeavesByMonth(tenantId: string, companyId: string, start: Date, end: Date): Promise<LeaveApplication[]> {
    const docs = await LeaveApplicationModel.find({
      tenantId,
      companyId,
      status: 'approved',
      startDate: { $lte: end },
      endDate: { $gte: start },
    }).lean();
    return docs as unknown as LeaveApplication[];
  }
}
