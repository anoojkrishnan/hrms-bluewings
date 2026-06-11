import { ExpenseRepository } from './expense.repository';
import type {
  ExpenseCategory, ExpenseClaim,
  CreateCategoryDto, UpdateCategoryDto, CreateClaimDto,
} from './expense.types';
import { ClaimStatus } from './expense.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { generatePublicId } from '@/shared/utils/publicId';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationOptions } from '@/shared/utils/pagination';

function generateCategoryPublicId() { return generatePublicId('expcat_'); }
function generateClaimPublicId()    { return generatePublicId('expclaim_'); }

export class ExpenseService {
  private repo = new ExpenseRepository();

  // ── Categories ─────────────────────────────────────────────────────────

  async listCategories(tenantId: string): Promise<ExpenseCategory[]> {
    return this.repo.findCategories(tenantId);
  }

  async createCategory(dto: CreateCategoryDto, tenantId: string, orgId: string, actorId: string): Promise<ExpenseCategory> {
    const code = dto.code.toUpperCase();
    const existing = await this.repo.findCategoryByCode(code, tenantId);
    if (existing) throw new AppError(409, ErrorCodes.DUPLICATE_RECORD, `Category code '${code}' already exists`);

    const cat = await this.repo.createCategory({
      publicId: generateCategoryPublicId(),
      tenantId, organizationId: orgId,
      name: dto.name, code,
      maxAmountPerClaim: dto.maxAmountPerClaim,
      requiresReceipt: dto.requiresReceipt ?? false,
      isActive: true,
      createdBy: actorId, updatedBy: actorId, deletedAt: null,
    });

    auditService.writeAsync({ tenantId, actorId, action: AuditAction.CREATE, module: 'expense', entityType: 'expense_category', entityPublicId: cat.publicId, newValue: { name: cat.name } as unknown as Record<string, unknown> });
    return cat;
  }

  async updateCategory(publicId: string, dto: UpdateCategoryDto, tenantId: string, actorId: string): Promise<ExpenseCategory> {
    const updated = await this.repo.updateCategory(publicId, tenantId, { ...dto, updatedBy: actorId });
    if (!updated) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Category not found');
    return updated;
  }

  // ── Claims ─────────────────────────────────────────────────────────────

  async listClaims(tenantId: string, query: Record<string, unknown>, employeeId?: string): Promise<PaginatedResult<ExpenseClaim>> {
    const { page, limit } = buildPaginationOptions(query);
    const filter: Record<string, unknown> = {};
    if (employeeId) filter.employeeId = employeeId;
    if (query.status) filter.status = query.status;
    return this.repo.findClaims(tenantId, filter, page, limit);
  }

  async getClaim(publicId: string, tenantId: string): Promise<ExpenseClaim> {
    const claim = await this.repo.findClaimByPublicId(publicId, tenantId);
    if (!claim) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Expense claim not found');
    return claim;
  }

  async createClaim(dto: CreateClaimDto, tenantId: string, orgId: string, employeeId: string, actorId: string): Promise<ExpenseClaim> {
    const totalAmount = dto.items.reduce((sum, i) => sum + i.amount, 0);
    const claim = await this.repo.createClaim({
      publicId: generateClaimPublicId(),
      tenantId, organizationId: orgId,
      employeeId, title: dto.title,
      items: dto.items.map(i => ({
        categoryId: i.categoryId,
        description: i.description,
        amount: i.amount,
        date: new Date(i.date),
      })),
      totalAmount,
      status: ClaimStatus.DRAFT,
      notes: dto.notes,
      isActive: true,
      createdBy: actorId, updatedBy: actorId, deletedAt: null,
    });

    auditService.writeAsync({ tenantId, actorId, action: AuditAction.CREATE, module: 'expense', entityType: 'expense_claim', entityPublicId: claim.publicId, newValue: { totalAmount } as unknown as Record<string, unknown> });
    return claim;
  }

  async submitClaim(publicId: string, tenantId: string, actorId: string): Promise<ExpenseClaim> {
    const claim = await this.getClaim(publicId, tenantId);
    if (claim.status !== ClaimStatus.DRAFT) {
      throw new AppError(409, ErrorCodes.INVALID_STATUS_TRANSITION, 'Only draft claims can be submitted');
    }
    const updated = await this.repo.updateClaimStatus(publicId, tenantId, ClaimStatus.SUBMITTED, {
      submittedAt: new Date(), updatedBy: actorId,
    });
    return updated!;
  }

  async approveClaim(publicId: string, tenantId: string, actorId: string): Promise<ExpenseClaim> {
    const claim = await this.getClaim(publicId, tenantId);
    if (claim.status !== ClaimStatus.SUBMITTED) {
      throw new AppError(409, ErrorCodes.INVALID_STATUS_TRANSITION, 'Only submitted claims can be approved');
    }
    const updated = await this.repo.updateClaimStatus(publicId, tenantId, ClaimStatus.APPROVED, {
      reviewedBy: actorId, reviewedAt: new Date(), updatedBy: actorId,
    });
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.APPROVE, module: 'expense', entityType: 'expense_claim', entityPublicId: publicId });
    return updated!;
  }

  async rejectClaim(publicId: string, reason: string, tenantId: string, actorId: string): Promise<ExpenseClaim> {
    const claim = await this.getClaim(publicId, tenantId);
    if (claim.status !== ClaimStatus.SUBMITTED) {
      throw new AppError(409, ErrorCodes.INVALID_STATUS_TRANSITION, 'Only submitted claims can be rejected');
    }
    const updated = await this.repo.updateClaimStatus(publicId, tenantId, ClaimStatus.REJECTED, {
      reviewedBy: actorId, reviewedAt: new Date(), rejectionReason: reason, updatedBy: actorId,
    });
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.REJECT, module: 'expense', entityType: 'expense_claim', entityPublicId: publicId });
    return updated!;
  }
}
