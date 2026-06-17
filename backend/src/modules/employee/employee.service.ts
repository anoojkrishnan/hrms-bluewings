import { EmployeeRepository } from './employee.repository';
import type {
  Employee, EmployeePersonalDetails, EmployeeBankDetails, EmployeeDocument, EmployeeStatusHistory,
  CreateEmployeeDto, UpdateEmployeeDto, ChangeStatusDto,
  UpdatePersonalDetailsDto, UpsertBankDetailsDto, ConfirmDocumentUploadDto,
} from './employee.types';
import { EmployeeStatus, VALID_STATUS_TRANSITIONS } from './employee.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { generatePublicId, generateDocumentPublicId } from '@/shared/utils/publicId';
import { encryptField, decryptField } from '@/shared/utils/crypto';
import { maskAccountNumber, maskPan, maskAadhaar } from '@/shared/utils/masking';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';
import { s3Storage, S3Category } from '@/shared/storage/s3.storage';
import type { PaginatedResult, AuthUser } from '@/shared/types/common';
import { buildPaginationOptions } from '@/shared/utils/pagination';
import { rbacService } from '@/modules/rbac/rbac.service';

export class EmployeeService {
  private readonly repo: EmployeeRepository;

  constructor() {
    this.repo = new EmployeeRepository();
  }

  async createEmployee(dto: CreateEmployeeDto, tenantId: string, organizationId: string, actorId: string): Promise<Employee> {
    const publicId = generatePublicId('emp_');
    const employeeCode = await this.repo.getNextEmployeeCode(tenantId);

    const employee = await this.repo.createEmployee({
      publicId,
      tenantId,
      organizationId,
      employeeCode,
      companyId: dto.companyId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      workEmail: dto.workEmail?.toLowerCase(),
      status: dto.status ?? EmployeeStatus.ACTIVE,
      joiningDate: new Date(dto.joiningDate),
      departmentId: dto.departmentId,
      designationId: dto.designationId,
      gradeId: dto.gradeId,
      locationId: dto.locationId,
      reportingManagerId: dto.reportingManagerId,
      employmentType: dto.employmentType,
      probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : undefined,
      noticePeriodDays: dto.noticePeriodDays ?? 30,
      essEnabled: false,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    if (dto.firstName && dto.lastName) {
      await this.repo.upsertPersonalDetails(employee.publicId, tenantId, {
        firstName: dto.firstName,
        lastName: dto.lastName,
        updatedBy: actorId,
        updatedAt: new Date(),
      });
    }

    eventBus.emit(EVENTS.EMPLOYEE_CREATED, { employeeCode, tenantId });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.CREATE,
      module: 'employee',
      entityType: 'employee',
      entityPublicId: employee.publicId,
      newValue: { employeeCode, status: employee.status } as unknown as Record<string, unknown>,
    });

    // Initialize zero-balance records for all existing leave types so the employee
    // immediately appears in balance views. HR can then set the opening balance.
    void this.initBalancesForNewEmployee(employee.publicId, tenantId, organizationId);

    return employee;
  }

  private async initBalancesForNewEmployee(employeeId: string, tenantId: string, organizationId: string): Promise<void> {
    try {
      const { LeaveRepository } = await import('@/modules/leave/leave.repository');
      const leaveRepo = new LeaveRepository();
      const leaveTypes = await leaveRepo.findLeaveTypes(tenantId);
      const year = new Date().getFullYear();
      await Promise.all(
        leaveTypes.map((lt) => {
          const opening = lt.defaultAnnualDays ?? 0;
          return leaveRepo.upsertBalance({
            tenantId,
            employeeId,
            leaveTypeId: lt.publicId,
            leaveYear: year,
            openingBalance: opening,
            accrued: 0,
            granted: 0,
            taken: 0,
            encashed: 0,
            lapsed: 0,
            closingBalance: opening,
            lastUpdatedAt: new Date(),
          });
        }),
      );
    } catch {
      // Non-critical
    }
  }

  async getEmployee(employeeCode: string, tenantId: string): Promise<Employee> {
    const employee = await this.repo.findByEmployeeCode(employeeCode, tenantId);
    if (!employee) throw new AppError(404, ErrorCodes.EMPLOYEE_NOT_FOUND, 'Employee not found');
    return employee;
  }

  async listEmployees(
    tenantId: string,
    organizationId: string,
    filter: Record<string, unknown>,
    query: Record<string, unknown>,
    user: AuthUser,
  ): Promise<PaginatedResult<Employee>> {
    const { page, limit } = buildPaginationOptions(query);
    const scopeFilter = rbacService.buildDataScopeFilter(user, tenantId);
    return this.repo.findEmployees(tenantId, organizationId, { ...filter, ...scopeFilter }, page, limit);
  }

  async updateEmployee(employeeCode: string, dto: UpdateEmployeeDto, tenantId: string, actorId: string): Promise<Employee> {
    const existing = await this.getEmployee(employeeCode, tenantId);

    const updated = await this.repo.updateEmployee(existing.publicId, tenantId, {
      ...dto,
      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
      probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : undefined,
      updatedBy: actorId,
    });
    if (!updated) throw new AppError(404, ErrorCodes.EMPLOYEE_NOT_FOUND, 'Employee not found');

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'employee',
      entityType: 'employee',
      entityPublicId: existing.publicId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async changeStatus(employeeCode: string, dto: ChangeStatusDto, tenantId: string, actorId: string): Promise<Employee> {
    const existing = await this.getEmployee(employeeCode, tenantId);
    const allowed = VALID_STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new AppError(400, ErrorCodes.INVALID_STATUS_TRANSITION, `Cannot transition from ${existing.status} to ${dto.status}`);
    }

    await this.repo.appendStatusHistory({
      tenantId,
      employeeId: existing.publicId,
      fromStatus: existing.status,
      toStatus: dto.status,
      changedAt: new Date(),
      changedBy: actorId,
      reason: dto.reason,
    });

    const updated = await this.repo.updateEmployee(existing.publicId, tenantId, {
      status: dto.status,
      updatedBy: actorId,
    });
    if (!updated) throw new AppError(404, ErrorCodes.EMPLOYEE_NOT_FOUND, 'Employee not found');

    eventBus.emit(EVENTS.EMPLOYEE_STATUS_CHANGED, { employeeCode, tenantId, from: existing.status, to: dto.status });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'employee',
      entityType: 'employee',
      entityPublicId: existing.publicId,
      oldValue: { status: existing.status } as unknown as Record<string, unknown>,
      newValue: { status: dto.status } as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteEmployee(employeeCode: string, tenantId: string, actorId: string): Promise<void> {
    const existing = await this.getEmployee(employeeCode, tenantId);
    await this.repo.softDeleteEmployee(existing.publicId, tenantId, actorId);

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.DELETE,
      module: 'employee',
      entityType: 'employee',
      entityPublicId: existing.publicId,
    });
  }

  async getTimeline(employeeCode: string, tenantId: string): Promise<EmployeeStatusHistory[]> {
    const employee = await this.getEmployee(employeeCode, tenantId);
    return this.repo.getStatusHistory(employee.publicId, tenantId);
  }

  // ── Personal Details ───────────────────────────────────────────────────

  async getPersonalDetails(employeeCode: string, tenantId: string): Promise<EmployeePersonalDetails | null> {
    const employee = await this.getEmployee(employeeCode, tenantId);
    const details = await this.repo.getPersonalDetails(employee.publicId, tenantId);
    if (!details) return null;

    return {
      ...details,
      panNumber: details.panNumber ? maskPan(decryptField(details.panNumber)) : undefined,
      aadhaarNumber: details.aadhaarNumber ? maskAadhaar(decryptField(details.aadhaarNumber)) : undefined,
    };
  }

  async updatePersonalDetails(employeeCode: string, dto: UpdatePersonalDetailsDto, tenantId: string, actorId: string): Promise<void> {
    const employee = await this.getEmployee(employeeCode, tenantId);

    await this.repo.upsertPersonalDetails(employee.publicId, tenantId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender,
      maritalStatus: dto.maritalStatus,
      nationality: dto.nationality,
      bloodGroup: dto.bloodGroup,
      panNumber: dto.panNumber ? encryptField(dto.panNumber) : undefined,
      aadhaarNumber: dto.aadhaarNumber ? encryptField(dto.aadhaarNumber) : undefined,
      updatedBy: actorId,
      updatedAt: new Date(),
    });

    // Denormalize name onto employee doc so list queries return names without a join
    await this.repo.updateEmployee(employee.publicId, tenantId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      updatedBy: actorId,
    });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'employee',
      entityType: 'employee_personal_details',
      entityPublicId: employee.publicId,
    });
  }

  // ── Bank Details ───────────────────────────────────────────────────────

  async getBankDetails(employeeCode: string, tenantId: string): Promise<EmployeeBankDetails[]> {
    const employee = await this.getEmployee(employeeCode, tenantId);
    const details = await this.repo.getBankDetails(employee.publicId, tenantId);
    return details.map((d) => ({
      ...d,
      accountNumber: maskAccountNumber(decryptField(d.accountNumber)),
    }));
  }

  async upsertBankDetails(employeeCode: string, dto: UpsertBankDetailsDto, tenantId: string, actorId: string): Promise<void> {
    const employee = await this.getEmployee(employeeCode, tenantId);

    await this.repo.upsertBankDetails(employee.publicId, tenantId, {
      accountNumber: encryptField(dto.accountNumber),
      ifscCode: dto.ifscCode,
      bankName: dto.bankName,
      branchName: dto.branchName,
      accountType: dto.accountType,
      isPrimary: dto.isPrimary ?? true,
    });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'employee',
      entityType: 'employee_bank_details',
      entityPublicId: employee.publicId,
    });
  }

  // ── Documents ─────────────────────────────────────────────────────────

  async getDocuments(employeeCode: string, tenantId: string): Promise<EmployeeDocument[]> {
    const employee = await this.getEmployee(employeeCode, tenantId);
    return this.repo.findDocumentsByEmployee(employee.publicId, tenantId);
  }

  async uploadDocumentPresign(
    employeeCode: string,
    tenantId: string,
    tenantPublicId: string,
    _actorId: string,
    fileName: string,
    mimeType: string,
  ): Promise<{ uploadUrl: string; s3Key: string; expiresAt: Date }> {
    const employee = await this.getEmployee(employeeCode, tenantId);
    const s3Key = s3Storage.buildS3Key(tenantPublicId, S3Category.EMPLOYEE_DOCUMENTS, employee.publicId, `${Date.now()}-${fileName}`);
    return s3Storage.generatePresignedUploadUrl({ s3Key, mimeType });
  }

  async confirmDocumentUpload(employeeCode: string, dto: ConfirmDocumentUploadDto, tenantId: string, organizationId: string, actorId: string): Promise<EmployeeDocument> {
    const employee = await this.getEmployee(employeeCode, tenantId);
    const publicId = generateDocumentPublicId();

    const doc = await this.repo.createDocument({
      publicId,
      tenantId,
      organizationId,
      employeeId: employee.publicId,
      documentType: dto.documentType,
      documentName: dto.documentName,
      s3Key: dto.s3Key,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      checksum: dto.checksum,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      verificationStatus: 'pending',
      version: 1,
      uploadedBy: actorId,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.CREATE,
      module: 'employee',
      entityType: 'employee_document',
      entityPublicId: publicId,
    });

    // Never return s3Key in the response
    const safeDoc = Object.fromEntries(
      Object.entries(doc as unknown as Record<string, unknown>).filter(([k]) => k !== 's3Key'),
    );
    return safeDoc as unknown as EmployeeDocument;
  }

  async deleteDocument(docPublicId: string, employeeCode: string, tenantId: string, actorId: string): Promise<void> {
    await this.getEmployee(employeeCode, tenantId);
    const doc = await this.repo.findDocumentByPublicId(docPublicId, tenantId);
    if (!doc) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Document not found');

    await this.repo.softDeleteDocument(docPublicId, tenantId, actorId);

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.DELETE,
      module: 'employee',
      entityType: 'employee_document',
      entityPublicId: docPublicId,
    });
  }

  // ── ESS ───────────────────────────────────────────────────────────────

  async inviteEss(employeeCode: string, tenantId: string, organizationId: string, actorId: string): Promise<Employee> {
    const existing = await this.getEmployee(employeeCode, tenantId);

    if (!existing.workEmail) {
      throw new AppError(
        422,
        'EMPLOYEE_NO_EMAIL',
        'Employee has no work email. Add a work email before sending the ESS invite.',
      );
    }

    // Get personal details for the employee's name (fallback to employee code)
    const personal = await this.repo.getPersonalDetails(existing.publicId, tenantId);
    const firstName = personal?.firstName ?? employeeCode;
    const lastName  = personal?.lastName  || '-';

    // Create a user account if one doesn't exist yet
    const { UserService } = await import('@/modules/user/user.service');
    const userService = new UserService();

    let userId = existing.userId;
    if (!userId) {
      const { UserRepository } = await import('@/modules/user/user.repository');
      const userRepo2 = new UserRepository();
      const existingUser = await userRepo2.findByEmail(existing.workEmail);

      if (existingUser) {
        // User already exists — link + re-send invite
        userId = existingUser.publicId;
        await userService.forceVerifyEmail(userId);
      } else {
        const tempPassword = Math.random().toString(36).slice(-10) + 'Aa1!';
        const { user } = await userService.register(
          {
            email: existing.workEmail,
            password: tempPassword,
            firstName,
            lastName,
            tenantId,
            organizationId,
          },
          actorId,
        );

        // Auto-verify email — HR has confirmed it
        await userService.forceVerifyEmail(user.publicId);

        // Assign the 'employee' role
        const employeeRole = await rbacService.findRoleByCode('employee', tenantId);
        if (employeeRole) {
          await rbacService.assignRoleToUser(
            user.publicId,
            employeeRole.publicId,
            tenantId,
            organizationId,
            actorId,
          );
        }

        userId = user.publicId;
      }
    }

    // Generate a set-password token so the employee can choose their own password
    const { UserRepository } = await import('@/modules/user/user.repository');
    const userRepo = new UserRepository();
    const userRecord = await userRepo.findByPublicId(userId);
    if (!userRecord) throw new AppError(404, ErrorCodes.USER_NOT_FOUND, 'Linked user account not found');

    const { UserService: US2 } = await import('@/modules/user/user.service');
    const us2 = new US2();
    const resetToken = us2.generatePasswordResetToken(userId);

    // Send invite email
    const { emailService } = await import('@/shared/email/email.service');
    void emailService.sendEssInviteEmail(existing.workEmail, firstName, resetToken, tenantId);

    // Update employee record
    const updated = await this.repo.updateEmployee(existing.publicId, tenantId, {
      essEnabled: true,
      essInvitedAt: new Date(),
      userId,
      updatedBy: actorId,
    });
    if (!updated) throw new AppError(404, ErrorCodes.EMPLOYEE_NOT_FOUND, 'Employee not found');

    eventBus.emit(EVENTS.EMPLOYEE_ESS_INVITED, { employeeCode, tenantId });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'employee',
      entityType: 'employee',
      entityPublicId: existing.publicId,
      newValue: { essEnabled: true, workEmail: existing.workEmail } as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async disableEss(employeeCode: string, tenantId: string, actorId: string): Promise<Employee> {
    const existing = await this.getEmployee(employeeCode, tenantId);
    const updated = await this.repo.updateEmployee(existing.publicId, tenantId, {
      essEnabled: false,
      updatedBy: actorId,
    });
    if (!updated) throw new AppError(404, ErrorCodes.EMPLOYEE_NOT_FOUND, 'Employee not found');

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'employee',
      entityType: 'employee',
      entityPublicId: existing.publicId,
      newValue: { essEnabled: false } as unknown as Record<string, unknown>,
    });

    return updated;
  }
}
