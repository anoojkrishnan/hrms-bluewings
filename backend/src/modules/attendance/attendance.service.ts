import { AttendanceRepository } from './attendance.repository';
import type {
  AttendanceLog, AttendanceException, Shift,
  PunchDto, ManualOverrideDto, RegularizeDto, CreateShiftDto, UpdateShiftDto,
} from './attendance.types';
import { AttendanceSource, AttendanceStatus, ExceptionType } from './attendance.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { generateAttendancePublicId, generateExceptionPublicId, generateShiftPublicId } from '@/shared/utils/publicId';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';
import { EmployeeService } from '@/modules/employee/employee.service';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationOptions } from '@/shared/utils/pagination';

export class AttendanceService {
  private readonly repo: AttendanceRepository;
  private readonly employeeService: EmployeeService;

  constructor() {
    this.repo = new AttendanceRepository();
    this.employeeService = new EmployeeService();
  }

  private todayUtc(): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  private calcTotalHours(firstIn: Date, lastOut: Date): number {
    return (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60);
  }

  async punch(
    dto: PunchDto,
    employeeCode: string,
    tenantId: string,
    organizationId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<AttendanceLog> {
    const employee = await this.employeeService.getEmployee(employeeCode, tenantId);
    const today = this.todayUtc();

    // Record raw swipe first (immutable audit trail)
    await this.repo.createSwipe({
      tenantId,
      organizationId,
      employeeId: employee.publicId,
      swipeTime: new Date(),
      swipeType: dto.swipeType,
      source: AttendanceSource.WEB_PORTAL,
      ipAddress,
      userAgent,
      latitude: dto.latitude,
      longitude: dto.longitude,
      selfieS3Key: dto.selfieS3Key,
      isProcessed: false,
    });

    // Check existing log
    const existing = await this.repo.findLogByEmployeeDate(employee.publicId, today, tenantId);
    if (existing?.isLocked) {
      throw new AppError(409, ErrorCodes.ATTENDANCE_ALREADY_LOCKED, 'Attendance for this date is locked');
    }

    const now = new Date();
    let logData: Partial<AttendanceLog> & { tenantId: string; employeeId: string; date: Date };

    if (!existing || !existing.firstInTime) {
      // First punch — check for duplicate in (shouldn't happen in one session)
      logData = {
        publicId: existing?.publicId ?? generateAttendancePublicId(),
        tenantId,
        organizationId,
        employeeId: employee.publicId,
        companyId: employee.companyId,
        date: today,
        firstInTime: now,
        status: AttendanceStatus.PRESENT,
        isLate: false,
        isEarlyExit: false,
        source: AttendanceSource.WEB_PORTAL,
        isException: false,
        isLocked: false,
        isActive: true,
        createdBy: employee.publicId,
        updatedBy: employee.publicId,
        deletedAt: null,
      };
    } else {
      // Subsequent punch — update lastOutTime
      const totalHours = this.calcTotalHours(existing.firstInTime, now);
      logData = {
        tenantId,
        employeeId: employee.publicId,
        date: today,
        lastOutTime: now,
        totalHours,
        updatedBy: employee.publicId,
      };
    }

    const log = await this.repo.upsertAttendanceLog(logData);

    eventBus.emit(EVENTS.ATTENDANCE_PUNCHED, { employeeCode, tenantId, swipeType: dto.swipeType });

    auditService.writeAsync({
      tenantId,
      actorId: employee.publicId,
      action: AuditAction.CREATE,
      module: 'attendance',
      entityType: 'attendance_log',
      entityPublicId: log.publicId,
      newValue: { swipeType: dto.swipeType } as unknown as Record<string, unknown>,
    });

    return log;
  }

  async manualOverride(dto: ManualOverrideDto, tenantId: string, organizationId: string, actorId: string): Promise<AttendanceLog> {
    const employee = await this.employeeService.getEmployee(dto.employeeCode, tenantId);
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);

    const inTime = dto.inTime ? new Date(dto.inTime) : undefined;
    const outTime = dto.outTime ? new Date(dto.outTime) : undefined;
    const totalHours = inTime && outTime ? this.calcTotalHours(inTime, outTime) : undefined;

    const log = await this.repo.upsertAttendanceLog({
      publicId: generateAttendancePublicId(),
      tenantId,
      organizationId,
      employeeId: employee.publicId,
      companyId: employee.companyId,
      date,
      firstInTime: inTime,
      lastOutTime: outTime,
      totalHours,
      status: dto.status ?? AttendanceStatus.PRESENT,
      isLate: false,
      isEarlyExit: false,
      source: AttendanceSource.MANUAL,
      isException: false,
      isLocked: false,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'attendance',
      entityType: 'attendance_log',
      entityPublicId: log.publicId,
      newValue: { source: 'manual', reason: dto.reason } as unknown as Record<string, unknown>,
    });

    return log;
  }

  async getLog(employeeCode: string, dateStr: string, tenantId: string): Promise<AttendanceLog> {
    const employee = await this.employeeService.getEmployee(employeeCode, tenantId);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const log = await this.repo.findLogByEmployeeDate(employee.publicId, date, tenantId);
    if (!log) throw new AppError(404, ErrorCodes.ATTENDANCE_NOT_FOUND, 'Attendance log not found');
    return log;
  }

  async listLogs(
    tenantId: string,
    organizationId: string,
    query: Record<string, unknown>,
  ): Promise<PaginatedResult<AttendanceLog>> {
    const { page, limit } = buildPaginationOptions(query);
    const from = query.from ? new Date(query.from as string) : new Date(new Date().setDate(1));
    const to = query.to ? new Date(query.to as string) : new Date();
    return this.repo.findLogsByTenant(tenantId, organizationId, from, to, page, limit);
  }

  // ── Exceptions ────────────────────────────────────────────────────────

  async createException(
    employeeCode: string,
    dateStr: string,
    exceptionType: ExceptionType,
    reason: string,
    tenantId: string,
    organizationId: string,
    actorId: string,
  ): Promise<AttendanceException> {
    const employee = await this.employeeService.getEmployee(employeeCode, tenantId);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const publicId = generateExceptionPublicId();
    const exc = await this.repo.createException({
      publicId,
      tenantId,
      organizationId,
      employeeId: employee.publicId,
      companyId: employee.companyId,
      date,
      exceptionType,
      status: 'pending',
      requestedBy: actorId,
      reason,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.CREATE,
      module: 'attendance',
      entityType: 'attendance_exception',
      entityPublicId: publicId,
    });

    return exc;
  }

  async approveException(publicId: string, tenantId: string, actorId: string): Promise<AttendanceException> {
    const exc = await this.repo.findExceptionByPublicId(publicId, tenantId);
    if (!exc) throw new AppError(404, ErrorCodes.ATTENDANCE_NOT_FOUND, 'Exception not found');

    const updated = await this.repo.updateExceptionStatus(publicId, tenantId, {
      status: 'approved',
      reviewedBy: actorId,
      reviewedAt: new Date(),
      updatedBy: actorId,
    });
    if (!updated) throw new AppError(404, ErrorCodes.ATTENDANCE_NOT_FOUND, 'Exception not found');

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'attendance',
      entityType: 'attendance_exception',
      entityPublicId: publicId,
      newValue: { status: 'approved' } as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async rejectException(publicId: string, tenantId: string, actorId: string, note: string): Promise<AttendanceException> {
    const exc = await this.repo.findExceptionByPublicId(publicId, tenantId);
    if (!exc) throw new AppError(404, ErrorCodes.ATTENDANCE_NOT_FOUND, 'Exception not found');

    const updated = await this.repo.updateExceptionStatus(publicId, tenantId, {
      status: 'rejected',
      reviewedBy: actorId,
      reviewedAt: new Date(),
      reviewNote: note,
      updatedBy: actorId,
    });
    if (!updated) throw new AppError(404, ErrorCodes.ATTENDANCE_NOT_FOUND, 'Exception not found');

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'attendance',
      entityType: 'attendance_exception',
      entityPublicId: publicId,
    });

    return updated;
  }

  async listExceptions(tenantId: string, status: string, query: Record<string, unknown>): Promise<PaginatedResult<AttendanceException>> {
    const { page, limit } = buildPaginationOptions(query);
    return this.repo.findExceptionsByStatus(tenantId, status, page, limit);
  }

  async regularize(dto: RegularizeDto, tenantId: string, organizationId: string, actorId: string): Promise<AttendanceException> {
    // Create an exception request of type MISSED_PUNCH + override log
    const exc = await this.createException(
      dto.employeeCode, dto.date, ExceptionType.MISSED_PUNCH, dto.reason, tenantId, organizationId, actorId,
    );

    if (dto.inTime || dto.outTime) {
      await this.manualOverride(
        { employeeCode: dto.employeeCode, date: dto.date, inTime: dto.inTime, outTime: dto.outTime, reason: dto.reason },
        tenantId,
        organizationId,
        actorId,
      );
    }

    return exc;
  }

  async lockDate(tenantId: string, companyId: string, dateStr: string, actorId: string): Promise<void> {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    await this.repo.lockLogs(tenantId, companyId, date);

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'attendance',
      entityType: 'attendance_lock',
      entityPublicId: companyId,
      newValue: { date: dateStr } as unknown as Record<string, unknown>,
    });
  }

  // ── Shifts ────────────────────────────────────────────────────────────

  async createShift(dto: CreateShiftDto, tenantId: string, organizationId: string, actorId: string): Promise<Shift> {
    const existing = await this.repo.findShiftByCode(dto.code, tenantId);
    if (existing) throw new AppError(409, ErrorCodes.DUPLICATE_RECORD, `Shift code '${dto.code}' already exists`);

    const publicId = generateShiftPublicId();
    const shift = await this.repo.createShift({
      ...dto,
      publicId,
      tenantId,
      organizationId,
      graceMinutesIn: dto.graceMinutesIn ?? 0,
      graceMinutesOut: dto.graceMinutesOut ?? 0,
      halfDayHours: dto.halfDayHours ?? 4,
      fullDayHours: dto.fullDayHours ?? 8,
      isNightShift: dto.isNightShift ?? false,
      isFlexible: dto.isFlexible ?? false,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.CREATE,
      module: 'attendance',
      entityType: 'shift',
      entityPublicId: publicId,
    });

    return shift;
  }

  async listShifts(tenantId: string): Promise<Shift[]> {
    return this.repo.findShifts(tenantId);
  }

  async updateShift(publicId: string, dto: UpdateShiftDto, tenantId: string, actorId: string): Promise<Shift> {
    const existing = await this.repo.findShiftByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.SHIFT_NOT_FOUND, 'Shift not found');

    const updated = await this.repo.updateShift(publicId, tenantId, { ...dto, updatedBy: actorId });
    if (!updated) throw new AppError(404, ErrorCodes.SHIFT_NOT_FOUND, 'Shift not found');

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'attendance',
      entityType: 'shift',
      entityPublicId: publicId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }
}
