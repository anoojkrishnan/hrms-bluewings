import { LeaveRepository } from './leave.repository';
import type {
  LeaveType, LeaveApplication, LeaveBalance, HolidayList, Holiday, WeekendPolicy,
  CreateLeaveTypeDto, UpdateLeaveTypeDto, ApplyLeaveDto, AdjustBalanceDto,
  CreateHolidayListDto, CreateHolidayDto, UpsertWeekendPolicyDto,
} from './leave.types';
import { LeaveApplicationStatus } from './leave.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { generatePublicId, generateLeavePublicId, generateHolidayPublicId, generateHolidayListPublicId } from '@/shared/utils/publicId';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';
import { EmployeeService } from '@/modules/employee/employee.service';
import { calcWorkingDays } from './workingDays';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationOptions } from '@/shared/utils/pagination';
import { logger } from '@/config/logger';

export class LeaveService {
  private readonly repo: LeaveRepository;
  private readonly employeeService: EmployeeService;

  constructor() {
    this.repo = new LeaveRepository();
    this.employeeService = new EmployeeService();
  }

  registerWorkflowListeners(): void {
    eventBus.on(EVENTS.WORKFLOW_APPROVED, (payload: { module: string; entityPublicId: string; tenantId: string }) => {
      if (payload.module !== 'leave') return;
      this.systemApprove(payload.entityPublicId, payload.tenantId).catch((err) => {
        logger.error({ err, entityPublicId: payload.entityPublicId }, 'Leave systemApprove failed after workflow approval');
      });
    });

    eventBus.on(EVENTS.WORKFLOW_REJECTED, (payload: { module: string; entityPublicId: string; tenantId: string; reason?: string }) => {
      if (payload.module !== 'leave') return;
      this.systemReject(payload.entityPublicId, payload.tenantId, payload.reason ?? 'Rejected by approver').catch((err) => {
        logger.error({ err, entityPublicId: payload.entityPublicId }, 'Leave systemReject failed after workflow rejection');
      });
    });
  }

  private currentLeaveYear(): number {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed
    // Financial year Apr-Mar: if Jan/Feb/Mar, year = current year - 1
    return month < 3 ? now.getFullYear() - 1 : now.getFullYear();
  }

  // ── Leave Types ────────────────────────────────────────────────────────

  async createLeaveType(dto: CreateLeaveTypeDto, tenantId: string, organizationId: string, actorId: string): Promise<LeaveType> {
    const existing = await this.repo.findLeaveTypeByCode(dto.code, tenantId);
    if (existing) throw new AppError(409, ErrorCodes.DUPLICATE_RECORD, `Leave type code '${dto.code}' already exists`);

    const publicId = generatePublicId('lt_');
    const lt = await this.repo.createLeaveType({
      ...dto,
      publicId,
      tenantId,
      organizationId,
      isCarryForward: dto.isCarryForward ?? false,
      isEncashable: dto.isEncashable ?? false,
      isPaidLeave: dto.isPaidLeave ?? true,
      requiresDocument: dto.requiresDocument ?? false,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.CREATE,
      module: 'leave',
      entityType: 'leave_type',
      entityPublicId: lt.publicId,
    });

    // Initialize zero-balance records for all existing active employees so they
    // immediately see this leave type in their balance view. HR can then adjust.
    void this.initBalancesForNewLeaveType(lt.publicId, tenantId, organizationId);

    return lt;
  }

  private async initBalancesForNewLeaveType(leaveTypeId: string, tenantId: string, organizationId: string): Promise<void> {
    try {
      const { EmployeeRepository } = await import('@/modules/employee/employee.repository');
      const empRepo = new EmployeeRepository();
      const result = await empRepo.findEmployees(tenantId, organizationId, { status: 'active' }, 1, 1000);
      const year = new Date().getFullYear();
      await Promise.all(
        result.data.map((emp) =>
          this.repo.upsertBalance({
            tenantId,
            employeeId: emp.publicId,
            leaveTypeId,
            leaveYear: year,
            openingBalance: 0,
            accrued: 0,
            granted: 0,
            taken: 0,
            encashed: 0,
            lapsed: 0,
            closingBalance: 0,
            lastUpdatedAt: new Date(),
          }),
        ),
      );
    } catch {
      // Non-critical — log silently, don't block leave type creation
    }
  }

  async listLeaveTypes(tenantId: string): Promise<LeaveType[]> {
    return this.repo.findLeaveTypes(tenantId);
  }

  async updateLeaveType(publicId: string, dto: UpdateLeaveTypeDto, tenantId: string, actorId: string): Promise<LeaveType> {
    const existing = await this.repo.findLeaveTypeByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.LEAVE_TYPE_NOT_FOUND, 'Leave type not found');

    const updated = await this.repo.updateLeaveType(publicId, tenantId, { ...dto, updatedBy: actorId });
    if (!updated) throw new AppError(404, ErrorCodes.LEAVE_TYPE_NOT_FOUND, 'Leave type not found');

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'leave',
      entityType: 'leave_type',
      entityPublicId: publicId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  // ── Leave Applications ────────────────────────────────────────────────

  async applyLeave(dto: ApplyLeaveDto, tenantId: string, organizationId: string, actorId: string): Promise<LeaveApplication> {
    const employee = await this.employeeService.getEmployee(dto.employeeCode, tenantId);
    const leaveType = await this.repo.findLeaveTypeByCode(dto.leaveTypeCode, tenantId);
    if (!leaveType) throw new AppError(404, ErrorCodes.LEAVE_TYPE_NOT_FOUND, 'Leave type not found');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start > end) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'startDate must be before endDate');

    // Fetch holidays and weekend policy for working-day calc
    const holidays = await this.repo.findHolidaysByDateRange(tenantId, employee.companyId, start, end);
    const holidayDates = holidays.map((h) => h.date);
    const weekendPolicy = await this.repo.getWeekendPolicy(tenantId, employee.companyId);
    let totalDays = calcWorkingDays(start, end, holidayDates, weekendPolicy);
    if (dto.isHalfDay) totalDays = 0.5;

    // Check overlap
    const hasOverlap = await this.repo.checkOverlap(employee.publicId, tenantId, start, end);
    if (hasOverlap) throw new AppError(409, ErrorCodes.LEAVE_OVERLAPPING, 'Leave dates overlap with an existing application');

    // Check balance
    const year = this.currentLeaveYear();
    const balance = await this.repo.getBalance(employee.publicId, leaveType.publicId, tenantId, year);
    const available = balance ? balance.closingBalance : 0;
    if (available < totalDays) {
      throw new AppError(400, ErrorCodes.LEAVE_INSUFFICIENT_BALANCE, `Insufficient leave balance. Available: ${available}, Requested: ${totalDays}`);
    }

    // Check if a workflow exists for leave approvals
    const { workflowService } = await import('@/modules/workflow/workflow.service');
    const activeWorkflow = await workflowService.findActiveWorkflowForModule('leave', tenantId);

    // Create application
    const publicId = generateLeavePublicId();
    const initialStatus = activeWorkflow ? LeaveApplicationStatus.PENDING_APPROVAL : LeaveApplicationStatus.PENDING;
    const application = await this.repo.createLeaveApplication({
      publicId,
      tenantId,
      organizationId,
      employeeId: employee.publicId,
      companyId: employee.companyId,
      leaveTypeId: leaveType.publicId,
      startDate: start,
      endDate: end,
      totalDays,
      isHalfDay: dto.isHalfDay ?? false,
      halfDayType: dto.halfDayType,
      reason: dto.reason,
      status: initialStatus,
      appliedBy: actorId,
      attachmentPublicIds: [],
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    // Deduct balance on PENDING to prevent double-booking
    await this.repo.deductBalance(employee.publicId, leaveType.publicId, tenantId, year, totalDays);

    // Start workflow instance if active workflow exists
    if (activeWorkflow) {
      try {
        await workflowService.startInstance('leave', 'leave_application', publicId, actorId, tenantId, organizationId);
      } catch (err) {
        // Workflow start failure should not block leave application creation
        // The application remains in PENDING_APPROVAL; HR can manually process
      }
    }

    eventBus.emit(EVENTS.LEAVE_APPLIED, { publicId, employeeCode: dto.employeeCode, tenantId });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.CREATE,
      module: 'leave',
      entityType: 'leave_application',
      entityPublicId: publicId,
    });

    return application;
  }

  async getApplication(publicId: string, tenantId: string): Promise<LeaveApplication> {
    const app = await this.repo.findApplicationByPublicId(publicId, tenantId);
    if (!app) throw new AppError(404, ErrorCodes.LEAVE_NOT_FOUND, 'Leave application not found');
    return app;
  }

  async listApplications(
    tenantId: string,
    employeeId: string | undefined,
    status: string | undefined,
    query: Record<string, unknown>,
  ): Promise<PaginatedResult<LeaveApplication>> {
    const { page, limit } = buildPaginationOptions(query);
    if (employeeId) {
      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;
      return this.repo.findApplicationsByEmployee(employeeId, tenantId, filter, page, limit);
    }
    return this.repo.findApplicationsByStatus(tenantId, status ?? 'pending', page, limit);
  }

  async approveLeave(publicId: string, tenantId: string, actorId: string): Promise<LeaveApplication> {
    const app = await this.getApplication(publicId, tenantId);
    if (app.status === LeaveApplicationStatus.PENDING_APPROVAL) {
      throw new AppError(409, ErrorCodes.WORKFLOW_INSTANCE_EXISTS, 'This leave requires workflow approval');
    }
    if (app.status !== LeaveApplicationStatus.PENDING) {
      throw new AppError(400, ErrorCodes.LEAVE_INVALID_TRANSITION, 'Only pending applications can be approved');
    }

    const updated = await this.repo.updateApplicationStatus(publicId, tenantId, {
      status: LeaveApplicationStatus.APPROVED,
      approvedBy: actorId,
      approvedAt: new Date(),
      updatedBy: actorId,
    });
    if (!updated) throw new AppError(404, ErrorCodes.LEAVE_NOT_FOUND, 'Leave application not found');

    eventBus.emit(EVENTS.LEAVE_APPROVED, { publicId, tenantId });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'leave',
      entityType: 'leave_application',
      entityPublicId: publicId,
      oldValue: { status: app.status } as unknown as Record<string, unknown>,
      newValue: { status: LeaveApplicationStatus.APPROVED } as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async rejectLeave(publicId: string, tenantId: string, actorId: string, reason: string): Promise<LeaveApplication> {
    const app = await this.getApplication(publicId, tenantId);
    if (app.status === LeaveApplicationStatus.PENDING_APPROVAL) {
      throw new AppError(409, ErrorCodes.WORKFLOW_INSTANCE_EXISTS, 'This leave requires workflow approval');
    }
    if (app.status !== LeaveApplicationStatus.PENDING) {
      throw new AppError(400, ErrorCodes.LEAVE_INVALID_TRANSITION, 'Only pending applications can be rejected');
    }

    const updated = await this.repo.updateApplicationStatus(publicId, tenantId, {
      status: LeaveApplicationStatus.REJECTED,
      rejectedBy: actorId,
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedBy: actorId,
    });
    if (!updated) throw new AppError(404, ErrorCodes.LEAVE_NOT_FOUND, 'Leave application not found');

    // Restore balance
    const year = this.currentLeaveYear();
    await this.repo.creditBalance(app.employeeId, app.leaveTypeId, tenantId, year, app.totalDays, 'granted');

    eventBus.emit(EVENTS.LEAVE_REJECTED, { publicId, tenantId });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'leave',
      entityType: 'leave_application',
      entityPublicId: publicId,
      oldValue: { status: app.status } as unknown as Record<string, unknown>,
      newValue: { status: LeaveApplicationStatus.REJECTED } as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async cancelLeave(publicId: string, tenantId: string, actorId: string): Promise<LeaveApplication> {
    const app = await this.getApplication(publicId, tenantId);
    if (![LeaveApplicationStatus.PENDING, LeaveApplicationStatus.APPROVED].includes(app.status)) {
      throw new AppError(400, ErrorCodes.LEAVE_INVALID_TRANSITION, 'Only pending or approved applications can be cancelled');
    }

    const updated = await this.repo.updateApplicationStatus(publicId, tenantId, {
      status: LeaveApplicationStatus.CANCELLED,
      updatedBy: actorId,
    });
    if (!updated) throw new AppError(404, ErrorCodes.LEAVE_NOT_FOUND, 'Leave application not found');

    const year = this.currentLeaveYear();
    await this.repo.creditBalance(app.employeeId, app.leaveTypeId, tenantId, year, app.totalDays, 'granted');

    eventBus.emit(EVENTS.LEAVE_CANCELLED, { publicId, tenantId });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'leave',
      entityType: 'leave_application',
      entityPublicId: publicId,
    });

    return updated;
  }

  async revokeLeave(publicId: string, tenantId: string, actorId: string, reason: string): Promise<LeaveApplication> {
    const app = await this.getApplication(publicId, tenantId);
    if (app.status !== LeaveApplicationStatus.APPROVED) {
      throw new AppError(400, ErrorCodes.LEAVE_INVALID_TRANSITION, 'Only approved applications can be revoked');
    }

    const updated = await this.repo.updateApplicationStatus(publicId, tenantId, {
      status: LeaveApplicationStatus.REVOKED,
      revokedBy: actorId,
      revokedAt: new Date(),
      revocationReason: reason,
      updatedBy: actorId,
    });
    if (!updated) throw new AppError(404, ErrorCodes.LEAVE_NOT_FOUND, 'Leave application not found');

    const year = this.currentLeaveYear();
    await this.repo.creditBalance(app.employeeId, app.leaveTypeId, tenantId, year, app.totalDays, 'granted');

    eventBus.emit(EVENTS.LEAVE_REVOKED, { publicId, tenantId });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'leave',
      entityType: 'leave_application',
      entityPublicId: publicId,
    });

    return updated;
  }

  // ── Leave Balances ────────────────────────────────────────────────────

  async getBalance(employeeCode: string, tenantId: string, year?: number): Promise<LeaveBalance[]> {
    const employee = await this.employeeService.getEmployee(employeeCode, tenantId);
    const leaveYear = year ?? this.currentLeaveYear();
    return this.repo.getBalancesByEmployee(employee.publicId, tenantId, leaveYear);
  }

  async adjustBalance(employeeCode: string, dto: AdjustBalanceDto, tenantId: string, _organizationId: string, actorId: string): Promise<void> {
    const employee = await this.employeeService.getEmployee(employeeCode, tenantId);
    const leaveType = await this.repo.findLeaveTypeByCode(dto.leaveTypeCode, tenantId);
    if (!leaveType) throw new AppError(404, ErrorCodes.LEAVE_TYPE_NOT_FOUND, 'Leave type not found');

    const year = this.currentLeaveYear();
    await this.repo.creditBalance(employee.publicId, leaveType.publicId, tenantId, year, dto.days, dto.field);

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'leave',
      entityType: 'leave_balance',
      entityPublicId: employee.publicId,
      newValue: { leaveTypeCode: dto.leaveTypeCode, days: dto.days, field: dto.field, reason: dto.reason } as unknown as Record<string, unknown>,
    });
  }

  // Idempotent: creates missing leave_balance records (zero) for every
  // active employee × active leave type combination for the current year.
  async initAllBalances(tenantId: string, organizationId: string): Promise<{ created: number }> {
    const { EmployeeRepository } = await import('@/modules/employee/employee.repository');
    const empRepo = new EmployeeRepository();
    const [empResult, leaveTypes] = await Promise.all([
      empRepo.findEmployees(tenantId, organizationId, { status: 'active' }, 1, 1000),
      this.repo.findLeaveTypes(tenantId),
    ]);

    const year = this.currentLeaveYear();
    let created = 0;

    for (const emp of empResult.data) {
      for (const lt of leaveTypes) {
        const existing = await this.repo.getBalance(emp.publicId, lt.publicId, tenantId, year);
        if (!existing) {
          await this.repo.upsertBalance({
            tenantId,
            employeeId: emp.publicId,
            leaveTypeId: lt.publicId,
            leaveYear: year,
            openingBalance: 0,
            accrued: 0,
            granted: 0,
            taken: 0,
            encashed: 0,
            lapsed: 0,
            closingBalance: 0,
            lastUpdatedAt: new Date(),
          });
          created++;
        }
      }
    }

    return { created };
  }

  // ── Calendar ──────────────────────────────────────────────────────────

  async getLeaveCalendar(tenantId: string, companyId: string, month: number, year: number): Promise<{
    approvedLeaves: LeaveApplication[];
    holidays: Holiday[];
  }> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const [approvedLeaves, holidays] = await Promise.all([
      this.repo.findApprovedLeavesByMonth(tenantId, companyId, start, end),
      this.repo.findHolidaysByDateRange(tenantId, companyId, start, end),
    ]);

    return { approvedLeaves, holidays };
  }

  // ── Holidays ──────────────────────────────────────────────────────────

  async createHolidayList(dto: CreateHolidayListDto, tenantId: string, organizationId: string, actorId: string): Promise<HolidayList> {
    const publicId = generateHolidayListPublicId();
    const hl = await this.repo.createHolidayList({
      ...dto,
      publicId,
      tenantId,
      organizationId,
      locationIds: dto.locationIds ?? [],
      isDefault: dto.isDefault ?? false,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.CREATE,
      module: 'leave',
      entityType: 'holiday_list',
      entityPublicId: publicId,
    });

    return hl;
  }

  async listHolidayLists(tenantId: string, companyId: string, year: number): Promise<HolidayList[]> {
    return this.repo.findHolidayLists(tenantId, companyId, year);
  }

  async createHoliday(dto: CreateHolidayDto, tenantId: string, organizationId: string, actorId: string): Promise<Holiday> {
    const publicId = generateHolidayPublicId();
    const holiday = await this.repo.createHoliday({
      ...dto,
      publicId,
      tenantId,
      organizationId,
      date: new Date(dto.date),
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.CREATE,
      module: 'leave',
      entityType: 'holiday',
      entityPublicId: publicId,
    });

    return holiday;
  }

  async listHolidays(tenantId: string, holidayListId: string): Promise<Holiday[]> {
    return this.repo.findHolidays(tenantId, holidayListId);
  }

  // Called by workflow event listeners — not exposed via HTTP routes
  async systemApprove(publicId: string, tenantId: string): Promise<void> {
    const app = await this.getApplication(publicId, tenantId);
    if (![LeaveApplicationStatus.PENDING, LeaveApplicationStatus.PENDING_APPROVAL].includes(app.status)) return;

    await this.repo.updateApplicationStatus(publicId, tenantId, {
      status: LeaveApplicationStatus.APPROVED,
      approvedBy: 'system',
      approvedAt: new Date(),
      updatedBy: 'system',
    });

    eventBus.emit(EVENTS.LEAVE_APPROVED, { publicId, tenantId });
    auditService.writeAsync({ tenantId, actorId: 'system', action: AuditAction.UPDATE, module: 'leave', entityType: 'leave_application', entityPublicId: publicId });
  }

  async systemReject(publicId: string, tenantId: string, reason: string): Promise<void> {
    const app = await this.getApplication(publicId, tenantId);
    if (![LeaveApplicationStatus.PENDING, LeaveApplicationStatus.PENDING_APPROVAL].includes(app.status)) return;

    await this.repo.updateApplicationStatus(publicId, tenantId, {
      status: LeaveApplicationStatus.REJECTED,
      rejectedBy: 'system',
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedBy: 'system',
    });

    // Restore balance
    const year = this.currentLeaveYear();
    await this.repo.creditBalance(app.employeeId, app.leaveTypeId, tenantId, year, app.totalDays, 'granted');

    eventBus.emit(EVENTS.LEAVE_REJECTED, { publicId, tenantId });
    auditService.writeAsync({ tenantId, actorId: 'system', action: AuditAction.UPDATE, module: 'leave', entityType: 'leave_application', entityPublicId: publicId });
  }

  async upsertWeekendPolicy(dto: UpsertWeekendPolicyDto, tenantId: string, organizationId: string, actorId: string): Promise<WeekendPolicy> {
    const publicId = generatePublicId('wp_');
    const policy = await this.repo.upsertWeekendPolicy(tenantId, dto.companyId, {
      ...dto,
      publicId,
      tenantId,
      organizationId,
      firstSaturdayOff: dto.firstSaturdayOff ?? false,
      secondSaturdayOff: dto.secondSaturdayOff ?? false,
      thirdSaturdayOff: dto.thirdSaturdayOff ?? false,
      fourthSaturdayOff: dto.fourthSaturdayOff ?? false,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'leave',
      entityType: 'weekend_policy',
      entityPublicId: dto.companyId,
    });

    return policy;
  }
}
