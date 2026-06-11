import { RbacRepository } from './rbac.repository';
import type {
  Role,
  Permission,
  DelegationRule,
  ResolvedPermissions,
  CreateRoleDto,
  UpdateRoleDto,
  CreateDelegationDto,
  RoleDto,
} from './rbac.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { DataScope, type AuthUser } from '@/shared/types/common';
import { generateRolePublicId, generatePublicId } from '@/shared/utils/publicId';
import { ALL_SYSTEM_PERMISSIONS } from './rbac.permissions';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import type { PaginatedResult, PaginationQuery } from '@/shared/types/common';
import { buildPaginationOptions } from '@/shared/utils/pagination';

const SYSTEM_ROLES: Array<{ code: string; name: string; dataScope: DataScope; permissions: string[] }> = [
  {
    code: 'platform_super_admin',
    name: 'Platform Super Admin',
    dataScope: DataScope.PLATFORM,
    permissions: ALL_SYSTEM_PERMISSIONS.map((p) => p.code),
  },
  {
    code: 'tenant_admin',
    name: 'Tenant Admin',
    dataScope: DataScope.ORGANIZATION,
    permissions: ALL_SYSTEM_PERMISSIONS.map((p) => p.code),
  },
  {
    code: 'hr_admin',
    name: 'HR Admin',
    dataScope: DataScope.ORGANIZATION,
    permissions: ALL_SYSTEM_PERMISSIONS.filter(
      (p) => !p.code.startsWith('tenant.billing') && !p.code.startsWith('ai.settings'),
    ).map((p) => p.code),
  },
  {
    code: 'hr_manager',
    name: 'HR Manager',
    dataScope: DataScope.DEPARTMENT,
    permissions: [
      'employee.profile.view', 'employee.profile.edit', 'employee.directory.view',
      'leave.application.view', 'leave.application.approve', 'leave.application.reject',
      'leave.balance.view', 'attendance.log.view', 'attendance.regularization.approve',
      'reports.standard.view',
    ],
  },
  {
    code: 'payroll_admin',
    name: 'Payroll Admin',
    dataScope: DataScope.ORGANIZATION,
    permissions: [
      'payroll.component.view', 'payroll.component.manage',
      'payroll.structure.view', 'payroll.structure.manage',
      'payroll.employee_salary.view', 'payroll.employee_salary.assign', 'payroll.employee_salary.revise',
      'payroll.cycle.manage', 'payroll.inputs.manage', 'payroll.statutory.manage',
      'payroll.run.view', 'payroll.run.create', 'payroll.run.finalize', 'payroll.run.rollback',
      'payroll.payslip.view', 'payroll.payslip.publish',
      'employee.salary.view', 'employee.bank_details.view', 'employee.statutory_details.view',
      'employee.profile.view', 'employee.directory.view',
      'reports.standard.view', 'reports.standard.export',
    ],
  },
  {
    code: 'finance_admin',
    name: 'Finance Admin',
    dataScope: DataScope.ORGANIZATION,
    permissions: [
      'payroll.run.view', 'payroll.run.approve',
      'payroll.employee_salary.view',
      'payroll.payslip.view',
      'employee.salary.view', 'tenant.billing.view', 'tenant.billing.manage',
      'reports.standard.view', 'reports.standard.export',
    ],
  },
  {
    code: 'department_manager',
    name: 'Department Manager',
    dataScope: DataScope.DIRECT_AND_INDIRECT_REPORTS,
    permissions: [
      'employee.profile.view', 'employee.directory.view',
      'leave.application.view', 'leave.application.approve', 'leave.application.reject',
      'leave.balance.view', 'attendance.log.view', 'attendance.regularization.approve',
      'reports.standard.view',
    ],
  },
  {
    code: 'reporting_manager',
    name: 'Reporting Manager',
    dataScope: DataScope.DIRECT_REPORTS,
    permissions: [
      'employee.profile.view', 'employee.directory.view',
      'leave.application.view', 'leave.application.approve', 'leave.application.reject',
      'leave.balance.view', 'attendance.log.view',
    ],
  },
  {
    code: 'employee',
    name: 'Employee',
    dataScope: DataScope.SELF,
    permissions: [
      'employee.profile.view', 'employee.directory.view',
      'employee.documents.view', 'employee.documents.upload',
      'employee.bank_details.view', 'employee.bank_details.edit',
      'employee.personal_sensitive.view', 'employee.timeline.view',
      'leave.application.view', 'leave.application.create', 'leave.application.cancel',
      'leave.balance.view',
      'attendance.log.view',
      'payroll.payslip.view',
      'notification.view',
      'expense.claim.view', 'expense.claim.create', 'expense.claim.submit',
      'expense.category.view',
      'payroll.loan.view', 'payroll.loan.create',
      'attendance.overtime.view', 'attendance.overtime.submit',
      'ai.chatbot.use',
    ],
  },
  {
    code: 'alumni',
    name: 'Alumni',
    dataScope: DataScope.SELF,
    permissions: ['employee.profile.view', 'payroll.payslip.view'],
  },
  {
    code: 'auditor',
    name: 'Auditor',
    dataScope: DataScope.ORGANIZATION,
    permissions: ['tenant.audit_log.view', 'tenant.audit_log.export', 'reports.standard.view'],
  },
  {
    code: 'api_client',
    name: 'API Client',
    dataScope: DataScope.ORGANIZATION,
    permissions: [],
  },
];

export class RbacService {
  private readonly repo: RbacRepository;

  constructor(repo?: RbacRepository) {
    this.repo = repo ?? new RbacRepository();
  }

  async resolvePermissions(
    userId: string,
    tenantId: string,
    organizationId: string,
  ): Promise<ResolvedPermissions> {
    const roles = await this.repo.findRolesByUser(userId, tenantId, organizationId);

    const rolePublicIds = roles.map((r) => r.publicId);
    const [rolePermissions, delegatedPermissions] = await Promise.all([
      this.repo.findPermissionsByRoles(rolePublicIds, tenantId),
      this.repo.findDelegatedPermissions(userId, tenantId),
    ]);

    const allPermissions = [...new Set([...rolePermissions, ...delegatedPermissions])];

    const dataScope = this.resolveMostPermissiveScope(roles.map((r) => r.dataScope));

    return {
      permissions: allPermissions,
      roles: roles.map((r) => r.code),
      dataScope,
    };
  }

  private resolveMostPermissiveScope(scopes: DataScope[]): DataScope {
    const scopeOrder: DataScope[] = [
      DataScope.PLATFORM,
      DataScope.ORGANIZATION,
      DataScope.COMPANY,
      DataScope.BUSINESS_UNIT,
      DataScope.COST_CENTER,
      DataScope.LOCATION,
      DataScope.DEPARTMENT,
      DataScope.PROJECT_TEAM,
      DataScope.DIRECT_AND_INDIRECT_REPORTS,
      DataScope.DIRECT_REPORTS,
      DataScope.SELF,
    ];

    if (scopes.length === 0) return DataScope.SELF;

    let maxIndex = scopeOrder.length - 1;
    for (const scope of scopes) {
      const idx = scopeOrder.indexOf(scope);
      if (idx !== -1 && idx < maxIndex) maxIndex = idx;
    }

    return scopeOrder[maxIndex] ?? DataScope.SELF;
  }

  async seedSystemPermissions(): Promise<void> {
    await Promise.all(
      ALL_SYSTEM_PERMISSIONS.map((p) =>
        this.repo.upsertPermission({ ...p, isSystemPermission: true }),
      ),
    );
  }

  async seedSystemRoles(tenantId: string, createdBy: string): Promise<void> {
    for (const roleDef of SYSTEM_ROLES) {
      const existing = await this.repo.findSystemRoleByCode(roleDef.code, tenantId);

      let rolePublicId: string;
      if (existing) {
        rolePublicId = existing.publicId;
      } else {
        rolePublicId = generateRolePublicId();
        await this.repo.createRole({
          publicId: rolePublicId,
          tenantId,
          name: roleDef.name,
          code: roleDef.code,
          isSystemRole: true,
          isCustom: false,
          dataScope: roleDef.dataScope,
          description: `System role: ${roleDef.name}`,
          createdBy,
          updatedBy: createdBy,
          deletedAt: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Always sync permissions so new permissions added to the definition are applied
      if (roleDef.permissions.length > 0) {
        await this.repo.setRolePermissions(tenantId, rolePublicId, roleDef.permissions, createdBy);
      }
    }
  }

  async createRole(
    tenantId: string,
    dto: CreateRoleDto,
    createdBy: string,
    ipAddress = '',
    userAgent = '',
    requestId = '',
  ): Promise<RoleDto> {
    const publicId = generateRolePublicId();
    const role = await this.repo.createRole({
      publicId,
      tenantId,
      name: dto.name,
      code: dto.code,
      isSystemRole: false,
      isCustom: true,
      dataScope: dto.dataScope,
      description: dto.description,
      createdBy,
      updatedBy: createdBy,
      deletedAt: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (dto.permissionCodes && dto.permissionCodes.length > 0) {
      await this.repo.setRolePermissions(tenantId, role.publicId, dto.permissionCodes, createdBy);
    }

    auditService.writeAsync({
      tenantId,
      actorId: createdBy,
      action: AuditAction.CREATE,
      module: 'rbac',
      entityType: 'role',
      entityPublicId: role.publicId,
      newValue: { name: role.name, code: role.code },
      ipAddress,
      userAgent,
      requestId,
    });

    return this.toRoleDto(role);
  }

  async updateRole(
    rolePublicId: string,
    tenantId: string,
    dto: UpdateRoleDto,
    updatedBy: string,
    ipAddress = '',
    userAgent = '',
    requestId = '',
  ): Promise<RoleDto> {
    const role = await this.repo.findRoleByPublicId(rolePublicId, tenantId);
    if (!role) throw new AppError(404, ErrorCodes.ROLE_NOT_FOUND, 'Role not found');
    if (role.isSystemRole) {
      throw new AppError(403, ErrorCodes.CANNOT_DELETE_SYSTEM_ROLE, 'Cannot modify a system role');
    }

    const updated = await this.repo.updateRole(rolePublicId, tenantId, { ...dto, updatedBy });
    if (!updated) throw new AppError(404, ErrorCodes.ROLE_NOT_FOUND, 'Role not found');

    auditService.writeAsync({
      tenantId,
      actorId: updatedBy,
      action: AuditAction.UPDATE,
      module: 'rbac',
      entityType: 'role',
      entityPublicId: rolePublicId,
      newValue: dto as Record<string, unknown>,
      ipAddress,
      userAgent,
      requestId,
    });

    return this.toRoleDto(updated);
  }

  async deleteRole(
    rolePublicId: string,
    tenantId: string,
    deletedBy: string,
    ipAddress = '',
    userAgent = '',
  ): Promise<void> {
    const role = await this.repo.findRoleByPublicId(rolePublicId, tenantId);
    if (!role) throw new AppError(404, ErrorCodes.ROLE_NOT_FOUND, 'Role not found');
    if (role.isSystemRole) {
      throw new AppError(403, ErrorCodes.CANNOT_DELETE_SYSTEM_ROLE, 'Cannot delete a system role');
    }

    await this.repo.softDeleteRole(rolePublicId, tenantId, deletedBy);

    auditService.writeAsync({
      tenantId,
      actorId: deletedBy,
      action: AuditAction.DELETE,
      module: 'rbac',
      entityType: 'role',
      entityPublicId: rolePublicId,
      ipAddress,
      userAgent,
    });
  }

  async listRoles(tenantId: string, query: PaginationQuery): Promise<PaginatedResult<RoleDto>> {
    const opts = buildPaginationOptions(query);
    const result = await this.repo.findRolesByTenant(tenantId, opts.page, opts.limit);
    return { data: result.data.map((r) => this.toRoleDto(r)), meta: result.meta };
  }

  async getRoleByPublicId(rolePublicId: string, tenantId: string): Promise<RoleDto> {
    const role = await this.repo.findRoleByPublicId(rolePublicId, tenantId);
    if (!role) throw new AppError(404, ErrorCodes.ROLE_NOT_FOUND, 'Role not found');
    const permissions = await this.repo.getRolePermissions(tenantId, rolePublicId);
    return { ...this.toRoleDto(role), permissions };
  }

  async listAllPermissions(): Promise<Permission[]> {
    return this.repo.findAllPermissions();
  }

  async setRolePermissions(
    rolePublicId: string,
    tenantId: string,
    permissionCodes: string[],
    updatedBy: string,
  ): Promise<void> {
    const role = await this.repo.findRoleByPublicId(rolePublicId, tenantId);
    if (!role) throw new AppError(404, ErrorCodes.ROLE_NOT_FOUND, 'Role not found');

    await this.repo.setRolePermissions(tenantId, rolePublicId, permissionCodes, updatedBy);

    auditService.writeAsync({
      tenantId,
      actorId: updatedBy,
      action: AuditAction.UPDATE,
      module: 'rbac',
      entityType: 'role_permissions',
      entityPublicId: rolePublicId,
      newValue: { permissionCodes },
    });
  }

  async getRolePermissions(rolePublicId: string, tenantId: string): Promise<string[]> {
    return this.repo.getRolePermissions(tenantId, rolePublicId);
  }

  async findRoleByCode(code: string, tenantId: string): Promise<Role | null> {
    return this.repo.findSystemRoleByCode(code, tenantId);
  }

  async findFirstUserWithRolePublicId(rolePublicId: string, tenantId: string): Promise<string | null> {
    const userRole = await this.repo.findFirstUserWithRolePublicId(rolePublicId, tenantId);
    return userRole?.userId ?? null;
  }

  async assignRoleToUser(
    userId: string,
    rolePublicId: string,
    tenantId: string,
    organizationId: string,
    assignedBy: string,
    ipAddress = '',
    userAgent = '',
  ): Promise<void> {
    const role = await this.repo.findRoleByPublicId(rolePublicId, tenantId);
    if (!role) throw new AppError(404, ErrorCodes.ROLE_NOT_FOUND, 'Role not found');

    await this.repo.assignRole({
      tenantId,
      organizationId,
      userId,
      rolePublicId,
      assignedAt: new Date(),
      assignedBy,
    });

    auditService.writeAsync({
      tenantId,
      actorId: assignedBy,
      action: AuditAction.ROLE_ASSIGN,
      module: 'rbac',
      entityType: 'user_role',
      entityPublicId: userId,
      newValue: { rolePublicId, roleCode: role.code },
      ipAddress,
      userAgent,
    });
  }

  async revokeRoleFromUser(
    userId: string,
    rolePublicId: string,
    tenantId: string,
    revokedBy: string,
  ): Promise<void> {
    await this.repo.revokeRole(userId, rolePublicId, tenantId);

    auditService.writeAsync({
      tenantId,
      actorId: revokedBy,
      action: AuditAction.ROLE_REVOKE,
      module: 'rbac',
      entityType: 'user_role',
      entityPublicId: userId,
      newValue: { rolePublicId },
    });
  }

  async getUserRoles(userId: string, tenantId: string): Promise<RoleDto[]> {
    const userRoles = await this.repo.getUserRoles(userId, tenantId);
    const rolePublicIds = userRoles.map((ur) => ur.rolePublicId);
    const roles = await Promise.all(
      rolePublicIds.map((id) => this.repo.findRoleByPublicId(id, tenantId)),
    );
    return roles.filter((r): r is Role => r !== null).map((r) => this.toRoleDto(r));
  }

  async createDelegation(dto: CreateDelegationDto, createdBy: string): Promise<DelegationRule> {
    const publicId = generatePublicId('del');
    return this.repo.createDelegation({
      publicId,
      tenantId: dto.tenantId,
      delegatorId: dto.delegatorId,
      delegateeId: dto.delegateeId,
      permissionCodes: dto.permissionCodes,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      isActive: true,
      createdBy,
      createdAt: new Date(),
    });
  }

  async revokeDelegation(publicId: string, tenantId: string, revokedBy: string): Promise<void> {
    await this.repo.revokeDelegation(publicId, tenantId);
    auditService.writeAsync({
      tenantId,
      actorId: revokedBy,
      action: AuditAction.UPDATE,
      module: 'rbac',
      entityType: 'delegation',
      entityPublicId: publicId,
      newValue: { isActive: false },
    });
  }

  async listDelegations(tenantId: string, query: PaginationQuery): Promise<PaginatedResult<DelegationRule>> {
    const opts = buildPaginationOptions(query);
    return this.repo.listDelegations(tenantId, opts.page, opts.limit);
  }

  buildDataScopeFilter(user: AuthUser, tenantId: string): Record<string, unknown> {
    switch (user.dataScope) {
      case DataScope.SELF:
        return { employeePublicId: user.employeePublicId };
      case DataScope.DIRECT_REPORTS:
        return { reportingManagerId: user.employeePublicId };
      case DataScope.DIRECT_AND_INDIRECT_REPORTS:
        return { reportingManagerId: user.employeePublicId };
      case DataScope.DEPARTMENT:
        return { departmentId: user.departmentId };
      case DataScope.LOCATION:
        return { locationId: user.locationId };
      case DataScope.COMPANY:
        return { companyId: user.companyId };
      case DataScope.ORGANIZATION:
        return { tenantId };
      case DataScope.PLATFORM:
        return {};
      default:
        return { tenantId };
    }
  }

  private toRoleDto(role: Role): RoleDto {
    return {
      publicId: role.publicId,
      name: role.name,
      code: role.code,
      isSystemRole: role.isSystemRole,
      isCustom: role.isCustom,
      dataScope: role.dataScope,
      description: role.description,
      createdAt: role.createdAt,
    };
  }
}

export const rbacService = new RbacService();
