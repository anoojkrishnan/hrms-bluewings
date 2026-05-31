import { DynamicFormsRepository, buildPaginationMeta } from './dynamic-forms.repository';
import type {
  DynamicForm,
  FormSubmission,
  CreateFormDto,
  UpdateFormDto,
  SubmitFormDto,
} from './dynamic-forms.types';
import { FieldType } from './dynamic-forms.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { generateFormPublicId, generateSubmissionPublicId } from '@/shared/utils/publicId';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';
import { buildPaginationOptions } from '@/shared/utils/pagination';
import type { PaginatedResult, PaginationQuery } from '@/shared/types/common';

export class DynamicFormsService {
  private readonly repo: DynamicFormsRepository;

  constructor() {
    this.repo = new DynamicFormsRepository();
  }

  // ── Forms ────────────────────────────────────────────────────────────────

  async createForm(
    dto: CreateFormDto,
    tenantId: string,
    organizationId: string,
    actorId: string,
  ): Promise<DynamicForm> {
    const publicId = generateFormPublicId();
    const form = await this.repo.createForm({
      publicId,
      tenantId,
      organizationId,
      name: dto.name,
      module: dto.module,
      version: 1,
      isActive: true,
      fields: dto.fields,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.CREATE,
      module: 'dynamic-forms',
      entityType: 'dynamic_form',
      entityPublicId: form.publicId,
    });

    return form;
  }

  async getForm(publicId: string, tenantId: string): Promise<DynamicForm> {
    const form = await this.repo.findFormByPublicId(publicId, tenantId);
    if (!form) throw new AppError(404, ErrorCodes.FORM_NOT_FOUND, 'Form not found');
    return form;
  }

  async getFormByModule(module: string, tenantId: string): Promise<DynamicForm> {
    const form = await this.repo.findActiveFormByModule(module, tenantId);
    if (!form) throw new AppError(404, ErrorCodes.FORM_NOT_FOUND, `No active form found for module '${module}'`);
    return form;
  }

  async listForms(tenantId: string, query: PaginationQuery): Promise<PaginatedResult<DynamicForm>> {
    const { page, limit } = buildPaginationOptions(query);
    const { data, total } = await this.repo.listForms(tenantId, page, limit);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async updateForm(
    publicId: string,
    dto: UpdateFormDto,
    tenantId: string,
    actorId: string,
  ): Promise<DynamicForm> {
    const existing = await this.getForm(publicId, tenantId);

    const patch: Partial<DynamicForm> & { updatedBy: string } = { updatedBy: actorId };

    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    // Bump version when fields change
    if (dto.fields !== undefined) {
      patch.fields = dto.fields;
      patch.version = existing.version + 1;
    }

    const updated = await this.repo.updateForm(publicId, tenantId, patch);
    if (!updated) throw new AppError(404, ErrorCodes.FORM_NOT_FOUND, 'Form not found');

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'dynamic-forms',
      entityType: 'dynamic_form',
      entityPublicId: publicId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteForm(publicId: string, tenantId: string, actorId: string): Promise<void> {
    const existing = await this.getForm(publicId, tenantId);

    const deleted = await this.repo.deleteForm(publicId, tenantId, actorId);
    if (!deleted) throw new AppError(404, ErrorCodes.FORM_NOT_FOUND, 'Form not found');

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.DELETE,
      module: 'dynamic-forms',
      entityType: 'dynamic_form',
      entityPublicId: existing.publicId,
    });
  }

  // ── Submissions ──────────────────────────────────────────────────────────

  async submitForm(
    formPublicId: string,
    dto: SubmitFormDto,
    submittedBy: string,
    tenantId: string,
    organizationId: string,
  ): Promise<FormSubmission> {
    const form = await this.getForm(formPublicId, tenantId);

    // Validate required fields and field-level rules
    const errors: string[] = [];

    for (const field of form.fields) {
      const value = dto.responses[field.fieldKey];
      const isEmpty = value === undefined || value === null || value === '';

      if (field.required && isEmpty) {
        errors.push(`Field '${field.fieldKey}' (${field.label}) is required`);
        continue;
      }

      if (isEmpty) continue;

      if (field.type === FieldType.NUMBER && field.validation) {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`Field '${field.fieldKey}' must be a number`);
          continue;
        }
        if (field.validation.min !== undefined && num < field.validation.min) {
          errors.push(`Field '${field.fieldKey}' must be at least ${field.validation.min}`);
        }
        if (field.validation.max !== undefined && num > field.validation.max) {
          errors.push(`Field '${field.fieldKey}' must be at most ${field.validation.max}`);
        }
      }

      if (
        (field.type === FieldType.TEXT || field.type === FieldType.TEXTAREA) &&
        field.validation?.pattern
      ) {
        const strValue = String(value);
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(strValue)) {
          errors.push(
            `Field '${field.fieldKey}' does not match the required pattern: ${field.validation.pattern}`,
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new AppError(
        400,
        ErrorCodes.FORM_SUBMISSION_INVALID,
        `Form submission validation failed: ${errors.join('; ')}`,
      );
    }

    const publicId = generateSubmissionPublicId();
    const submission = await this.repo.createSubmission({
      publicId,
      tenantId,
      organizationId,
      formId: (form as unknown as { _id: { toString(): string } })._id.toString(),
      formVersion: form.version,
      entityType: dto.entityType,
      entityPublicId: dto.entityPublicId,
      submittedBy,
      responses: dto.responses,
      isActive: true,
      createdBy: submittedBy,
      updatedBy: submittedBy,
      deletedAt: null,
    });

    eventBus.emit(EVENTS.FORM_SUBMITTED, {
      submissionPublicId: submission.publicId,
      formPublicId,
      tenantId,
      entityType: dto.entityType,
      entityPublicId: dto.entityPublicId,
    });

    auditService.writeAsync({
      tenantId,
      actorId: submittedBy,
      action: AuditAction.CREATE,
      module: 'dynamic-forms',
      entityType: 'form_submission',
      entityPublicId: submission.publicId,
    });

    return submission;
  }

  async getSubmission(
    formPublicId: string,
    submissionPublicId: string,
    tenantId: string,
  ): Promise<FormSubmission> {
    // Ensure the form exists and belongs to this tenant
    await this.getForm(formPublicId, tenantId);

    const submission = await this.repo.findSubmissionByPublicId(submissionPublicId, tenantId);
    if (!submission) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Submission not found');
    }
    return submission;
  }

  async getSubmissions(
    formPublicId: string,
    tenantId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResult<FormSubmission>> {
    const form = await this.getForm(formPublicId, tenantId);
    const { page, limit } = buildPaginationOptions(query);
    const formId = (form as unknown as { _id: { toString(): string } })._id.toString();
    const { data, total } = await this.repo.listSubmissions(formId, tenantId, page, limit);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }
}
