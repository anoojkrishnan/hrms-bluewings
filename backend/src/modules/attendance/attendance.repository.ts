import mongoose, { Schema } from 'mongoose';
import type { AttendanceLog, RawSwipe, AttendanceException, Shift } from './attendance.types';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationMeta } from '@/shared/utils/pagination';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const attendanceLogSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    employeeId: { type: String, required: true },
    companyId: { type: String, required: true },
    date: { type: Date, required: true },
    shiftId: String,
    firstInTime: Date,
    lastOutTime: Date,
    totalHours: Number,
    status: { type: String, required: true },
    isLate: { type: Boolean, default: false },
    lateByMinutes: Number,
    isEarlyExit: { type: Boolean, default: false },
    earlyExitByMinutes: Number,
    overtimeHours: Number,
    source: { type: String, required: true },
    isException: { type: Boolean, default: false },
    exceptionType: String,
    isLocked: { type: Boolean, default: false },
    regularizationId: String,
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'attendance_logs', timestamps: true },
);
attendanceLogSchema.index({ tenantId: 1, employeeId: 1, date: 1 }, { unique: true });
attendanceLogSchema.index({ tenantId: 1, organizationId: 1, date: -1 });
attendanceLogSchema.index({ tenantId: 1, publicId: 1 });

const rawSwipeSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    organizationId: String,
    employeeId: String,
    swipeTime: { type: Date, required: true },
    swipeType: { type: String, enum: ['in', 'out', 'unknown'], required: true },
    source: { type: String, required: true },
    ipAddress: String,
    userAgent: String,
    latitude: Number,
    longitude: Number,
    locationAccuracy: Number,
    geofenceResult: String,
    selfieS3Key: String,
    isProcessed: { type: Boolean, default: false },
    processedAt: Date,
  },
  { collection: 'raw_swipes', timestamps: true },
);
rawSwipeSchema.index({ tenantId: 1, employeeId: 1, swipeTime: -1 });

const attendanceExceptionSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    employeeId: { type: String, required: true },
    companyId: { type: String, required: true },
    date: { type: Date, required: true },
    exceptionType: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestedBy: { type: String, required: true },
    reviewedBy: String,
    reviewedAt: Date,
    reason: String,
    reviewNote: String,
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'attendance_exceptions', timestamps: true },
);
attendanceExceptionSchema.index({ tenantId: 1, publicId: 1 });
attendanceExceptionSchema.index({ tenantId: 1, status: 1 });

const shiftSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    name: { type: String, required: true },
    code: { type: String, required: true },
    companyId: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    graceMinutesIn: { type: Number, default: 0 },
    graceMinutesOut: { type: Number, default: 0 },
    halfDayHours: { type: Number, default: 4 },
    fullDayHours: { type: Number, default: 8 },
    isNightShift: { type: Boolean, default: false },
    isFlexible: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'shifts', timestamps: true },
);
shiftSchema.index({ tenantId: 1, code: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
shiftSchema.index({ tenantId: 1, publicId: 1 });

// ─── Models ───────────────────────────────────────────────────────────────────

function getOrCreateModel(name: string, schema: Schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

const AttendanceLogModel = getOrCreateModel('AttendanceLog', attendanceLogSchema);
const RawSwipeModel = getOrCreateModel('RawSwipe', rawSwipeSchema);
const AttendanceExceptionModel = getOrCreateModel('AttendanceException', attendanceExceptionSchema);
const ShiftModel = getOrCreateModel('Shift', shiftSchema);

// ─── Repository ───────────────────────────────────────────────────────────────

export class AttendanceRepository {
  private baseFilter(tenantId: string) {
    return { tenantId, deletedAt: null };
  }

  // ── Attendance Logs ────────────────────────────────────────────────────

  async upsertAttendanceLog(data: Partial<AttendanceLog> & { tenantId: string; employeeId: string; date: Date }): Promise<AttendanceLog> {
    const doc = await AttendanceLogModel.findOneAndUpdate(
      { tenantId: data.tenantId, employeeId: data.employeeId, date: data.date },
      { $set: data },
      { upsert: true, new: true },
    ).lean();
    return doc as unknown as AttendanceLog;
  }

  async findLogByEmployeeDate(employeeId: string, date: Date, tenantId: string): Promise<AttendanceLog | null> {
    const doc = await AttendanceLogModel.findOne({ tenantId, employeeId, date }).lean();
    return doc as unknown as AttendanceLog | null;
  }

  async findLogsByEmployee(employeeId: string, tenantId: string, from: Date, to: Date): Promise<AttendanceLog[]> {
    const docs = await AttendanceLogModel.find({
      tenantId, employeeId,
      date: { $gte: from, $lte: to },
    }).sort({ date: -1 }).lean();
    return docs as unknown as AttendanceLog[];
  }

  async findLogsByTenant(
    tenantId: string,
    organizationId: string | undefined,
    from: Date,
    to: Date,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AttendanceLog>> {
    const query: Record<string, unknown> = {
      tenantId,
      ...(organizationId && { organizationId }),
      date: { $gte: from, $lte: to },
    };
    const [docs, total] = await Promise.all([
      AttendanceLogModel.find(query).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AttendanceLogModel.countDocuments(query),
    ]);
    return { data: docs as unknown as AttendanceLog[], meta: buildPaginationMeta(page, limit, total) };
  }

  async lockLogs(tenantId: string, companyId: string, date: Date): Promise<void> {
    await AttendanceLogModel.updateMany(
      { tenantId, companyId, date },
      { $set: { isLocked: true } },
    );
  }

  // ── Raw Swipes ────────────────────────────────────────────────────────

  async createSwipe(data: RawSwipe): Promise<RawSwipe> {
    const doc = await RawSwipeModel.create(data);
    return doc.toObject() as unknown as RawSwipe;
  }

  async findSwipesByEmployeeDate(employeeId: string, tenantId: string, date: Date): Promise<RawSwipe[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    const docs = await RawSwipeModel.find({
      tenantId, employeeId,
      swipeTime: { $gte: start, $lte: end },
    }).sort({ swipeTime: 1 }).lean();
    return docs as unknown as RawSwipe[];
  }

  // ── Exceptions ────────────────────────────────────────────────────────

  async createException(data: Omit<AttendanceException, '_id' | 'createdAt' | 'updatedAt'>): Promise<AttendanceException> {
    const doc = await AttendanceExceptionModel.create(data);
    return doc.toObject() as unknown as AttendanceException;
  }

  async findExceptionByPublicId(publicId: string, tenantId: string): Promise<AttendanceException | null> {
    const doc = await AttendanceExceptionModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean();
    return doc as unknown as AttendanceException | null;
  }

  async findExceptionsByStatus(
    tenantId: string,
    status: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AttendanceException>> {
    const query = { tenantId, status };
    const [docs, total] = await Promise.all([
      AttendanceExceptionModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AttendanceExceptionModel.countDocuments(query),
    ]);
    return { data: docs as unknown as AttendanceException[], meta: buildPaginationMeta(page, limit, total) };
  }

  async updateExceptionStatus(publicId: string, tenantId: string, patch: Partial<AttendanceException>): Promise<AttendanceException | null> {
    const doc = await AttendanceExceptionModel.findOneAndUpdate(
      { tenantId, publicId },
      { $set: patch },
      { new: true },
    ).lean();
    return doc as unknown as AttendanceException | null;
  }

  // ── Shifts ────────────────────────────────────────────────────────────

  async createShift(data: Omit<Shift, '_id' | 'createdAt' | 'updatedAt'>): Promise<Shift> {
    const doc = await ShiftModel.create(data);
    return doc.toObject() as unknown as Shift;
  }

  async findShifts(tenantId: string): Promise<Shift[]> {
    const docs = await ShiftModel.find(this.baseFilter(tenantId)).sort({ name: 1 }).lean();
    return docs as unknown as Shift[];
  }

  async findShiftByPublicId(publicId: string, tenantId: string): Promise<Shift | null> {
    const doc = await ShiftModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean();
    return doc as unknown as Shift | null;
  }

  async findShiftByCode(code: string, tenantId: string): Promise<Shift | null> {
    const doc = await ShiftModel.findOne({ ...this.baseFilter(tenantId), code }).lean();
    return doc as unknown as Shift | null;
  }

  async updateShift(publicId: string, tenantId: string, data: Partial<Shift>): Promise<Shift | null> {
    const doc = await ShiftModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as Shift | null;
  }
}
