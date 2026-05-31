import { TenantRepository } from './tenant.repository';
import type {
  Tenant,
  TenantSettings,
  TenantModule,
  TenantUsageCounters,
  CreateTenantDto,
  UpdateTenantDto,
  UpdateTenantSettingsDto,
  TenantDto,
  SignupDto,
} from './tenant.types';
import { TenantStatus } from './tenant.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { generateTenantPublicId } from '@/shared/utils/publicId';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';
import { FREE_PLAN_EMPLOYEE_LIMIT } from '@/config/constants';
import { addDays } from '@/shared/utils/dates';
import { emailService } from '@/shared/email/email.service';

export class TenantService {
  private readonly repo: TenantRepository;

  constructor(repo?: TenantRepository) {
    this.repo = repo ?? new TenantRepository();
  }

  async createTenant(
    dto: CreateTenantDto,
    createdBy: string,
    ipAddress = '',
    userAgent = '',
  ): Promise<TenantDto> {
    const available = await this.repo.checkSlugAvailable(dto.slug);
    if (!available) {
      throw new AppError(409, ErrorCodes.SLUG_TAKEN, 'This slug is already taken');
    }

    const publicId = generateTenantPublicId();
    const trialEndsAt = addDays(new Date(), 14);

    const tenant = await this.repo.create({
      publicId,
      tenantId: publicId,
      name: dto.name,
      slug: dto.slug.toLowerCase(),
      primaryContact: dto.primaryContact,
      country: dto.country,
      defaultTimezone: dto.defaultTimezone ?? 'Asia/Kolkata',
      defaultCurrency: dto.defaultCurrency ?? 'INR',
      defaultLanguage: dto.defaultLanguage ?? 'en',
      branding: {},
      status: TenantStatus.TRIAL,
      trialEndsAt,
      employeeLimit: FREE_PLAN_EMPLOYEE_LIMIT,
      storageLimit: 1073741824,
      createdBy,
      updatedBy: createdBy,
      deletedAt: null,
      isActive: true,
      organizationId: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.repo.createSettings({
      tenantId: tenant.tenantId,
      financialYearStart: 'apr',
      dateFormat: 'DD/MM/YYYY',
      workingDaysPerWeek: 5,
      makerCheckerEnabled: false,
      mfaRequired: false,
      ssoEnabled: false,
      ipWhitelistEnabled: false,
      ipWhitelist: [],
      updatedAt: new Date(),
    });

    await this.repo.createDefaultModules(tenant.tenantId, createdBy);
    await this.repo.createUsageCounters(tenant.tenantId);

    eventBus.emit(EVENTS.TENANT_CREATED, { tenantId: tenant.tenantId, slug: tenant.slug });

    auditService.writeAsync({
      tenantId: tenant.tenantId,
      actorId: createdBy,
      actorType: 'system',
      action: AuditAction.CREATE,
      module: 'tenant',
      entityType: 'tenant',
      entityPublicId: tenant.publicId,
      newValue: { name: tenant.name, slug: tenant.slug },
      ipAddress,
      userAgent,
    });

    return this.toDto(tenant);
  }

  async signup(
    dto: SignupDto,
    ipAddress = '',
    userAgent = '',
  ): Promise<{ tenantId: string; slug: string; userId: string }> {
    const { UserService } = await import('@/modules/user/user.service');
    const { rbacService } = await import('@/modules/rbac/rbac.service');

    const tenantDto = await this.createTenant(
      {
        name: dto.tenantName,
        slug: dto.slug,
        country: dto.country ?? 'IN',
        primaryContact: { name: `${dto.firstName} ${dto.lastName}`, email: dto.email },
      },
      'system',
      ipAddress,
      userAgent,
    );

    const userService = new UserService();
    const { user, verificationToken } = await userService.register(
      {
        email: dto.email,
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        tenantId: tenantDto.publicId,
        organizationId: tenantDto.publicId,
      },
      'system',
      ipAddress,
      userAgent,
    );

    // Seed all system roles with their full permission sets for this new tenant.
    // This must complete before role assignment so role_permissions are in place.
    await rbacService.seedSystemRoles(tenantDto.publicId, user.publicId);

    // Assign tenant_admin (all permissions) to the account owner.
    const adminRole = await rbacService.findRoleByCode('tenant_admin', tenantDto.publicId);
    if (!adminRole) {
      // This should never happen — seedSystemRoles always creates tenant_admin.
      throw new AppError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to create tenant_admin role during signup');
    }

    await rbacService.assignRoleToUser(
      user.publicId,
      adminRole.publicId,
      tenantDto.publicId,
      tenantDto.publicId,
      user.publicId,
      ipAddress,
      userAgent,
    );

    void emailService.sendVerificationEmail(dto.email, dto.firstName, verificationToken);

    return { tenantId: tenantDto.publicId, slug: tenantDto.slug, userId: user.publicId };
  }

  async getTenantBySlug(slug: string): Promise<TenantDto> {
    const tenant = await this.repo.findBySlug(slug);
    if (!tenant) throw new AppError(404, ErrorCodes.TENANT_NOT_FOUND, 'Tenant not found');
    return this.toDto(tenant);
  }

  async getTenantByPublicId(publicId: string): Promise<TenantDto> {
    const tenant = await this.repo.findByPublicId(publicId);
    if (!tenant) throw new AppError(404, ErrorCodes.TENANT_NOT_FOUND, 'Tenant not found');
    return this.toDto(tenant);
  }

  async getTenantByTenantId(tenantId: string): Promise<Tenant> {
    const tenant = await this.repo.findByTenantId(tenantId);
    if (!tenant) throw new AppError(404, ErrorCodes.TENANT_NOT_FOUND, 'Tenant not found');
    return tenant;
  }

  async updateTenant(
    tenantId: string,
    data: UpdateTenantDto,
    updatedBy: string,
    ipAddress = '',
    userAgent = '',
    requestId = '',
  ): Promise<TenantDto> {
    const tenant = await this.repo.update(tenantId, { ...data, updatedBy });
    if (!tenant) throw new AppError(404, ErrorCodes.TENANT_NOT_FOUND, 'Tenant not found');

    auditService.writeAsync({
      tenantId,
      actorId: updatedBy,
      action: AuditAction.UPDATE,
      module: 'tenant',
      entityType: 'tenant',
      entityPublicId: tenant.publicId,
      newValue: data as Record<string, unknown>,
      ipAddress,
      userAgent,
      requestId,
    });

    return this.toDto(tenant);
  }

  async suspendTenant(
    tenantId: string,
    _reason: string,
    suspendedBy: string,
    ipAddress = '',
    userAgent = '',
  ): Promise<void> {
    const tenant = await this.repo.findByTenantId(tenantId);
    if (!tenant) throw new AppError(404, ErrorCodes.TENANT_NOT_FOUND, 'Tenant not found');
    if (tenant.status === TenantStatus.SUSPENDED) return;

    await this.repo.updateStatus(tenantId, TenantStatus.SUSPENDED);
    eventBus.emit(EVENTS.TENANT_SUSPENDED, { tenantId });

    auditService.writeAsync({
      tenantId,
      actorId: suspendedBy,
      action: AuditAction.SUSPEND,
      module: 'tenant',
      entityType: 'tenant',
      entityPublicId: tenant.publicId,
      oldValue: { status: tenant.status },
      newValue: { status: TenantStatus.SUSPENDED },
      ipAddress,
      userAgent,
    });
  }

  async reactivateTenant(
    tenantId: string,
    reactivatedBy: string,
    ipAddress = '',
    userAgent = '',
  ): Promise<void> {
    const tenant = await this.repo.findByTenantId(tenantId);
    if (!tenant) throw new AppError(404, ErrorCodes.TENANT_NOT_FOUND, 'Tenant not found');

    await this.repo.updateStatus(tenantId, TenantStatus.ACTIVE);
    eventBus.emit(EVENTS.TENANT_REACTIVATED, { tenantId });

    auditService.writeAsync({
      tenantId,
      actorId: reactivatedBy,
      action: AuditAction.REACTIVATE,
      module: 'tenant',
      entityType: 'tenant',
      entityPublicId: tenant.publicId,
      oldValue: { status: tenant.status },
      newValue: { status: TenantStatus.ACTIVE },
      ipAddress,
      userAgent,
    });
  }

  async archiveTenant(tenantId: string, archivedBy: string): Promise<void> {
    const tenant = await this.repo.findByTenantId(tenantId);
    if (!tenant) throw new AppError(404, ErrorCodes.TENANT_NOT_FOUND, 'Tenant not found');

    await this.repo.updateStatus(tenantId, TenantStatus.ARCHIVED);

    auditService.writeAsync({
      tenantId,
      actorId: archivedBy,
      action: AuditAction.ARCHIVE,
      module: 'tenant',
      entityType: 'tenant',
      entityPublicId: tenant.publicId,
      oldValue: { status: tenant.status },
      newValue: { status: TenantStatus.ARCHIVED },
    });
  }

  async getSettings(tenantId: string): Promise<TenantSettings> {
    const settings = await this.repo.getSettings(tenantId);
    if (!settings) throw new AppError(404, ErrorCodes.TENANT_NOT_FOUND, 'Tenant settings not found');
    return settings;
  }

  async updateSettings(
    tenantId: string,
    data: UpdateTenantSettingsDto,
    updatedBy: string,
    ipAddress = '',
    userAgent = '',
    requestId = '',
  ): Promise<TenantSettings> {
    const settings = await this.repo.updateSettings(tenantId, data);
    if (!settings) throw new AppError(500, ErrorCodes.INTERNAL_ERROR, 'Settings update failed');

    auditService.writeAsync({
      tenantId,
      actorId: updatedBy,
      action: AuditAction.SETTINGS_UPDATE,
      module: 'tenant',
      entityType: 'tenant_settings',
      entityPublicId: tenantId,
      newValue: data as Record<string, unknown>,
      ipAddress,
      userAgent,
      requestId,
    });

    return settings;
  }

  async getModules(tenantId: string): Promise<TenantModule[]> {
    return this.repo.getModules(tenantId);
  }

  async setModuleEnabled(
    tenantId: string,
    moduleCode: string,
    enabled: boolean,
    updatedBy: string,
    ipAddress = '',
    userAgent = '',
    requestId = '',
  ): Promise<void> {
    await this.repo.setModuleEnabled(tenantId, moduleCode, enabled, updatedBy);

    auditService.writeAsync({
      tenantId,
      actorId: updatedBy,
      action: AuditAction.MODULE_TOGGLE,
      module: 'tenant',
      entityType: 'tenant_module',
      entityPublicId: `${tenantId}:${moduleCode}`,
      newValue: { moduleCode, enabled },
      ipAddress,
      userAgent,
      requestId,
    });
  }

  async getUsageCounters(tenantId: string): Promise<TenantUsageCounters> {
    const counters = await this.repo.getUsageCounters(tenantId);
    if (!counters)
      return { tenantId, activeEmployeeCount: 0, storageUsedBytes: 0, updatedAt: new Date() };
    return counters;
  }

  async checkSlugAvailable(slug: string): Promise<boolean> {
    return this.repo.checkSlugAvailable(slug);
  }

  async validateTenantActive(tenantId: string): Promise<Tenant> {
    const tenant = await this.repo.findByTenantId(tenantId);
    if (!tenant) throw new AppError(404, ErrorCodes.TENANT_NOT_FOUND, 'Tenant not found');

    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new AppError(403, ErrorCodes.TENANT_SUSPENDED, 'Tenant is suspended');
    }
    if (tenant.status === TenantStatus.ARCHIVED) {
      throw new AppError(403, ErrorCodes.TENANT_ARCHIVED, 'Tenant is archived');
    }
    if (tenant.status === TenantStatus.TRIAL && tenant.trialEndsAt && tenant.trialEndsAt < new Date()) {
      throw new AppError(403, ErrorCodes.TENANT_SUSPENDED, 'Trial period has expired');
    }

    return tenant;
  }

  async checkEmployeeLimit(tenantId: string): Promise<void> {
    const tenant = await this.repo.findByTenantId(tenantId);
    if (!tenant) throw new AppError(404, ErrorCodes.TENANT_NOT_FOUND, 'Tenant not found');

    const usage = await this.repo.getUsageCounters(tenantId);
    const current = usage?.activeEmployeeCount ?? 0;

    if (current >= tenant.employeeLimit) {
      throw new AppError(
        403,
        ErrorCodes.PLAN_LIMIT_REACHED,
        `Employee limit of ${tenant.employeeLimit} reached. Please upgrade your plan.`,
      );
    }
  }

  async checkStorageLimit(tenantId: string, bytesToAdd: number): Promise<void> {
    const tenant = await this.repo.findByTenantId(tenantId);
    if (!tenant) throw new AppError(404, ErrorCodes.TENANT_NOT_FOUND, 'Tenant not found');

    const usage = await this.repo.getUsageCounters(tenantId);
    const current = usage?.storageUsedBytes ?? 0;

    if (current + bytesToAdd > tenant.storageLimit) {
      throw new AppError(403, ErrorCodes.PLAN_LIMIT_REACHED, 'Storage limit reached. Please upgrade your plan.');
    }
  }

  async listAll(page = 1, limit = 20): Promise<{ data: TenantDto[]; total: number }> {
    const result = await this.repo.listAll(page, limit);
    return { data: result.data.map((t) => this.toDto(t)), total: result.total };
  }

  private toDto(tenant: Tenant): TenantDto {
    return {
      publicId: tenant.publicId,
      name: tenant.name,
      slug: tenant.slug,
      country: tenant.country,
      defaultTimezone: tenant.defaultTimezone,
      defaultCurrency: tenant.defaultCurrency,
      defaultLanguage: tenant.defaultLanguage,
      branding: tenant.branding,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      employeeLimit: tenant.employeeLimit,
      storageLimit: tenant.storageLimit,
      primaryContact: tenant.primaryContact,
      createdAt: tenant.createdAt,
    };
  }
}

export const tenantService = new TenantService();
