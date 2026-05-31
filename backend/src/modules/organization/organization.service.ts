import { OrganizationRepository } from './organization.repository';
import type {
  Company, Department, DepartmentTree, Designation, Grade, Location,
  CreateCompanyDto, UpdateCompanyDto,
  CreateDepartmentDto, UpdateDepartmentDto,
  CreateDesignationDto, UpdateDesignationDto,
  CreateGradeDto, UpdateGradeDto,
  CreateLocationDto, UpdateLocationDto,
} from './organization.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { generatePublicId } from '@/shared/utils/publicId';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';

export class OrganizationService {
  private readonly repo: OrganizationRepository;

  constructor() {
    this.repo = new OrganizationRepository();
  }

  // ── Companies ─────────────────────────────────────────────────────────

  async createCompany(dto: CreateCompanyDto, tenantId: string, actorId: string): Promise<Company> {
    const publicId = generatePublicId('co_');
    const company = await this.repo.createCompany({
      ...dto,
      publicId,
      tenantId,
      country: dto.country ?? 'IN',
      currency: dto.currency ?? 'INR',
      timezone: dto.timezone ?? 'Asia/Kolkata',
      financialYearStart: dto.financialYearStart ?? 'apr',
      pfEnabled: false,
      esiEnabled: false,
      ptEnabled: false,
      lwfEnabled: false,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    eventBus.emit(EVENTS.COMPANY_CREATED, { companyId: company.publicId, tenantId });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.CREATE,
      module: 'organization',
      entityType: 'company',
      entityPublicId: company.publicId,
    });

    return company;
  }

  async getCompanyByPublicId(publicId: string, tenantId: string): Promise<Company> {
    const company = await this.repo.findCompanyByPublicId(publicId, tenantId);
    if (!company) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Company not found');
    return company;
  }

  async listCompanies(tenantId: string): Promise<Company[]> {
    return this.repo.findCompaniesByTenant(tenantId);
  }

  async updateCompany(publicId: string, dto: UpdateCompanyDto, tenantId: string, actorId: string): Promise<Company> {
    const existing = await this.repo.findCompanyByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Company not found');

    const updated = await this.repo.updateCompany(publicId, tenantId, { ...dto, updatedBy: actorId });
    if (!updated) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Company not found');

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'organization',
      entityType: 'company',
      entityPublicId: publicId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteCompany(publicId: string, tenantId: string, actorId: string): Promise<void> {
    const existing = await this.repo.findCompanyByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Company not found');
    await this.repo.softDeleteCompany(publicId, tenantId, actorId);

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.DELETE,
      module: 'organization',
      entityType: 'company',
      entityPublicId: publicId,
    });
  }

  async validateCompanyBelongsToTenant(publicId: string, tenantId: string): Promise<Company> {
    return this.getCompanyByPublicId(publicId, tenantId);
  }

  // ── Departments ───────────────────────────────────────────────────────

  async createDepartment(dto: CreateDepartmentDto, tenantId: string, organizationId: string, actorId: string): Promise<Department> {
    await this.validateCompanyBelongsToTenant(dto.companyId, tenantId);

    if (dto.parentDepartmentId) {
      const parent = await this.repo.findDepartmentByPublicId(dto.parentDepartmentId, tenantId);
      if (!parent) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Parent department not found');
    }

    const publicId = generatePublicId('dept_');
    const department = await this.repo.createDepartment({
      ...dto,
      publicId,
      tenantId,
      organizationId,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    eventBus.emit(EVENTS.DEPARTMENT_CREATED, { departmentId: department.publicId, tenantId });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.CREATE,
      module: 'organization',
      entityType: 'department',
      entityPublicId: department.publicId,
    });

    return department;
  }

  async getDepartmentByPublicId(publicId: string, tenantId: string): Promise<Department> {
    const dept = await this.repo.findDepartmentByPublicId(publicId, tenantId);
    if (!dept) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Department not found');
    return dept;
  }

  async listDepartments(tenantId: string, organizationId: string): Promise<Department[]> {
    return this.repo.findDepartmentsByOrg(tenantId, organizationId);
  }

  async getDepartmentTree(tenantId: string, organizationId: string): Promise<DepartmentTree[]> {
    const all = await this.repo.findDepartmentsByOrg(tenantId, organizationId);
    return this.buildTree(all);
  }

  private buildTree(departments: Department[], parentId?: string): DepartmentTree[] {
    return departments
      .filter((d) => d.parentDepartmentId === (parentId ?? null) || (!parentId && !d.parentDepartmentId))
      .map((d) => ({ ...d, children: this.buildTree(departments, d.publicId) }));
  }

  async updateDepartment(publicId: string, dto: UpdateDepartmentDto, tenantId: string, actorId: string): Promise<Department> {
    const existing = await this.repo.findDepartmentByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Department not found');

    const updated = await this.repo.updateDepartment(publicId, tenantId, { ...dto, updatedBy: actorId });
    if (!updated) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Department not found');

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'organization',
      entityType: 'department',
      entityPublicId: publicId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteDepartment(publicId: string, tenantId: string, actorId: string): Promise<void> {
    const existing = await this.repo.findDepartmentByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Department not found');
    await this.repo.softDeleteDepartment(publicId, tenantId, actorId);

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.DELETE,
      module: 'organization',
      entityType: 'department',
      entityPublicId: publicId,
    });
  }

  async validateDepartmentBelongsToTenant(publicId: string, tenantId: string): Promise<Department> {
    return this.getDepartmentByPublicId(publicId, tenantId);
  }

  // ── Designations ──────────────────────────────────────────────────────

  async createDesignation(dto: CreateDesignationDto, tenantId: string, organizationId: string, actorId: string): Promise<Designation> {
    const publicId = generatePublicId('desg_');
    const designation = await this.repo.createDesignation({
      ...dto,
      publicId,
      tenantId,
      organizationId,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.CREATE,
      module: 'organization',
      entityType: 'designation',
      entityPublicId: designation.publicId,
    });

    return designation;
  }

  async getDesignationByPublicId(publicId: string, tenantId: string): Promise<Designation> {
    const d = await this.repo.findDesignationByPublicId(publicId, tenantId);
    if (!d) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Designation not found');
    return d;
  }

  async listDesignations(tenantId: string, organizationId: string): Promise<Designation[]> {
    return this.repo.findDesignationsByOrg(tenantId, organizationId);
  }

  async updateDesignation(publicId: string, dto: UpdateDesignationDto, tenantId: string, actorId: string): Promise<Designation> {
    const existing = await this.repo.findDesignationByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Designation not found');

    const updated = await this.repo.updateDesignation(publicId, tenantId, { ...dto, updatedBy: actorId });
    if (!updated) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Designation not found');

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'organization',
      entityType: 'designation',
      entityPublicId: publicId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteDesignation(publicId: string, tenantId: string, actorId: string): Promise<void> {
    const existing = await this.repo.findDesignationByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Designation not found');
    await this.repo.softDeleteDesignation(publicId, tenantId, actorId);

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.DELETE,
      module: 'organization',
      entityType: 'designation',
      entityPublicId: publicId,
    });
  }

  // ── Grades ────────────────────────────────────────────────────────────

  async createGrade(dto: CreateGradeDto, tenantId: string, organizationId: string, actorId: string): Promise<Grade> {
    const publicId = generatePublicId('grade_');
    const grade = await this.repo.createGrade({
      ...dto,
      publicId,
      tenantId,
      organizationId,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.CREATE,
      module: 'organization',
      entityType: 'grade',
      entityPublicId: grade.publicId,
    });

    return grade;
  }

  async getGradeByPublicId(publicId: string, tenantId: string): Promise<Grade> {
    const g = await this.repo.findGradeByPublicId(publicId, tenantId);
    if (!g) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Grade not found');
    return g;
  }

  async listGrades(tenantId: string, organizationId: string): Promise<Grade[]> {
    return this.repo.findGradesByOrg(tenantId, organizationId);
  }

  async updateGrade(publicId: string, dto: UpdateGradeDto, tenantId: string, actorId: string): Promise<Grade> {
    const existing = await this.repo.findGradeByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Grade not found');

    const updated = await this.repo.updateGrade(publicId, tenantId, { ...dto, updatedBy: actorId });
    if (!updated) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Grade not found');

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'organization',
      entityType: 'grade',
      entityPublicId: publicId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteGrade(publicId: string, tenantId: string, actorId: string): Promise<void> {
    const existing = await this.repo.findGradeByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Grade not found');
    await this.repo.softDeleteGrade(publicId, tenantId, actorId);

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.DELETE,
      module: 'organization',
      entityType: 'grade',
      entityPublicId: publicId,
    });
  }

  // ── Locations ─────────────────────────────────────────────────────────

  async createLocation(dto: CreateLocationDto, tenantId: string, organizationId: string, actorId: string): Promise<Location> {
    const publicId = generatePublicId('loc_');
    const { address, city, state, country, pincode, addressObj, ...rest } = dto;
    const nestedAddress = addressObj ?? (
      (address || city || state || country || pincode)
        ? { line1: address, city, state, pincode, country: country ?? 'IN' }
        : undefined
    );
    const location = await this.repo.createLocation({
      ...rest,
      address: nestedAddress,
      publicId,
      tenantId,
      organizationId,
      type: dto.type ?? 'office',
      timezone: dto.timezone ?? 'Asia/Kolkata',
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.CREATE,
      module: 'organization',
      entityType: 'location',
      entityPublicId: location.publicId,
    });

    return location;
  }

  async getLocationByPublicId(publicId: string, tenantId: string): Promise<Location> {
    const l = await this.repo.findLocationByPublicId(publicId, tenantId);
    if (!l) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Location not found');
    return l;
  }

  async listLocations(tenantId: string, organizationId: string): Promise<Location[]> {
    return this.repo.findLocationsByOrg(tenantId, organizationId);
  }

  async updateLocation(publicId: string, dto: UpdateLocationDto, tenantId: string, actorId: string): Promise<Location> {
    const existing = await this.repo.findLocationByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Location not found');

    const { address, city, state, country, pincode, addressObj, ...rest } = dto;
    const nestedAddress = addressObj ?? (
      (address || city || state || country || pincode)
        ? { line1: address, city, state, pincode, country: country ?? 'IN' }
        : undefined
    );
    const updated = await this.repo.updateLocation(publicId, tenantId, {
      ...rest,
      ...(nestedAddress ? { address: nestedAddress } : {}),
      updatedBy: actorId,
    });
    if (!updated) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Location not found');

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.UPDATE,
      module: 'organization',
      entityType: 'location',
      entityPublicId: publicId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteLocation(publicId: string, tenantId: string, actorId: string): Promise<void> {
    const existing = await this.repo.findLocationByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Location not found');
    await this.repo.softDeleteLocation(publicId, tenantId, actorId);

    auditService.writeAsync({
      tenantId, actorId,
      action: AuditAction.DELETE,
      module: 'organization',
      entityType: 'location',
      entityPublicId: publicId,
    });
  }
}
