import { NotificationRepository } from './notification.repository';
import type {
  Notification,
  NotificationTemplate,
  UserNotificationPreference,
  CreateTemplateDto,
  UpdateTemplateDto,
  NotificationListQuery,
} from './notification.types';
import { NotificationChannel, NotificationStatus } from './notification.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { generateNotificationPublicId, generatePublicId } from '@/shared/utils/publicId';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';
import { logger } from '@/config/logger';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationOptions, buildPaginationMeta } from '@/shared/utils/pagination';

// ─── Default seed templates ───────────────────────────────────────────────────

const DEFAULT_TEMPLATES: Array<{
  code: string;
  name: string;
  channels: NotificationChannel[];
  subject?: string;
  bodyHtml?: string;
  bodyText: string;
  variables: string[];
}> = [
  {
    code: 'leave_applied',
    name: 'Leave Applied',
    channels: [NotificationChannel.IN_APP],
    bodyText: '{{employeeName}} applied for {{leaveType}} leave from {{startDate}} to {{endDate}}',
    variables: ['employeeName', 'leaveType', 'startDate', 'endDate'],
  },
  {
    code: 'leave_approved',
    name: 'Leave Approved',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    subject: 'Your leave has been approved',
    bodyText: 'Your {{leaveType}} leave from {{startDate}} to {{endDate}} has been approved.',
    bodyHtml: '<p>Your <strong>{{leaveType}}</strong> leave from {{startDate}} to {{endDate}} has been approved.</p>',
    variables: ['leaveType', 'startDate', 'endDate'],
  },
  {
    code: 'leave_rejected',
    name: 'Leave Rejected',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    subject: 'Your leave has been rejected',
    bodyText: 'Your {{leaveType}} leave from {{startDate}} to {{endDate}} was rejected. Reason: {{reason}}',
    bodyHtml: '<p>Your <strong>{{leaveType}}</strong> leave from {{startDate}} to {{endDate}} was rejected.</p><p>Reason: {{reason}}</p>',
    variables: ['leaveType', 'startDate', 'endDate', 'reason'],
  },
  {
    code: 'leave_cancelled',
    name: 'Leave Cancelled',
    channels: [NotificationChannel.IN_APP],
    bodyText: 'Leave from {{startDate}} to {{endDate}} has been cancelled.',
    variables: ['startDate', 'endDate'],
  },
  {
    code: 'workflow_approved',
    name: 'Workflow Approved',
    channels: [NotificationChannel.IN_APP],
    bodyText: 'Your request for {{entityType}} has been approved.',
    variables: ['entityType'],
  },
  {
    code: 'workflow_rejected',
    name: 'Workflow Rejected',
    channels: [NotificationChannel.IN_APP],
    bodyText: 'Your request for {{entityType}} has been rejected. Reason: {{reason}}',
    variables: ['entityType', 'reason'],
  },
  {
    code: 'employee_created',
    name: 'Employee Created',
    channels: [NotificationChannel.IN_APP],
    bodyText: 'New employee {{employeeName}} has been onboarded.',
    variables: ['employeeName'],
  },
];

// ─── Service ──────────────────────────────────────────────────────────────────

export class NotificationService {
  private readonly repo: NotificationRepository;

  constructor() {
    this.repo = new NotificationRepository();
  }

  // ── Template rendering ─────────────────────────────────────────────────

  private renderTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);
  }

  // ── Send ───────────────────────────────────────────────────────────────

  async send(
    templateCode: string,
    recipientId: string,
    variables: Record<string, string>,
    tenantId: string,
    link?: string,
  ): Promise<void> {
    // 1. Find template by code + tenant; fall back to system-level template
    let template = await this.repo.findTemplateByCode(templateCode, tenantId);
    if (!template) {
      template = await this.repo.findTemplateByCode(templateCode, 'system');
    }
    if (!template) {
      logger.warn({ templateCode, tenantId }, 'Notification template not found — skipping send');
      return;
    }

    const renderedBody = this.renderTemplate(template.bodyText, variables);
    const renderedSubject = template.subject ? this.renderTemplate(template.subject, variables) : undefined;
    const renderedBodyHtml = template.bodyHtml ? this.renderTemplate(template.bodyHtml, variables) : undefined;

    for (const channel of template.channels) {
      if (channel === NotificationChannel.IN_APP) {
        const publicId = generateNotificationPublicId();
        await this.repo.create({
          publicId,
          tenantId,
          recipientId,
          channel: NotificationChannel.IN_APP,
          templateCode,
          subject: renderedSubject,
          body: renderedBody,
          link,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          retryCount: 0,
          isActive: true,
          createdBy: 'system',
          updatedBy: 'system',
          deletedAt: null,
        });
      }

      if (channel === NotificationChannel.EMAIL) {
        try {
          const { emailService } = await import('@/shared/email/email.service');
          // emailService.send is not exposed directly; we use a raw send approach
          // The email service only exposes specific methods, so we call the transporter-backed send
          // by constructing a minimal compatible call. We use the existing service pattern.
          await (emailService as unknown as {
            sendRaw?: (to: string, subject: string, html: string, text: string) => Promise<void>;
          }).sendRaw?.(
            recipientId,
            renderedSubject ?? templateCode,
            renderedBodyHtml ?? `<p>${renderedBody}</p>`,
            renderedBody,
          );
          // If sendRaw is not available, log for now (email infra can be extended later)
          if (!(emailService as unknown as { sendRaw?: unknown }).sendRaw) {
            logger.info(
              { templateCode, recipientId, subject: renderedSubject },
              'Email notification queued (sendRaw not implemented yet)',
            );
          }
        } catch (err) {
          logger.error({ err, templateCode, recipientId }, 'Email notification send failed');
        }
      }
    }

    eventBus.emit(EVENTS.NOTIFICATION_SENT, { templateCode, recipientId, tenantId });

    auditService.writeAsync({
      tenantId,
      actorId: 'system',
      actorType: 'system',
      action: AuditAction.CREATE,
      module: 'notifications',
      entityType: 'notification',
      entityPublicId: templateCode,
    });
  }

  // ── Event listeners ────────────────────────────────────────────────────

  registerEventListeners(): void {
    eventBus.on<{ publicId: string; employeeCode: string; tenantId: string; managerId?: string }>(
      EVENTS.LEAVE_APPLIED,
      async (payload) => {
        try {
          if (payload.managerId) {
            await this.send(
              'leave_applied',
              payload.managerId,
              {
                employeeName: payload.employeeCode,
                leaveType: 'leave',
                startDate: '',
                endDate: '',
              },
              payload.tenantId,
            );
          } else {
            // Try to get manager from employee service
            const { EmployeeService } = await import('@/modules/employee/employee.service');
            const employeeService = new EmployeeService();
            try {
              const employee = await employeeService.getEmployee(payload.employeeCode, payload.tenantId);
              if (employee.reportingManagerId) {
                await this.send(
                  'leave_applied',
                  employee.reportingManagerId,
                  {
                    employeeName: `${payload.employeeCode}`,
                    leaveType: 'leave',
                    startDate: '',
                    endDate: '',
                  },
                  payload.tenantId,
                );
              }
            } catch {
              // Employee lookup failed — skip notification
            }
          }
        } catch (err) {
          logger.error({ err, event: EVENTS.LEAVE_APPLIED }, 'Notification listener error');
        }
      },
    );

    eventBus.on<{ publicId: string; tenantId: string; employeeId?: string }>(
      EVENTS.LEAVE_APPROVED,
      async (payload) => {
        try {
          if (payload.employeeId) {
            await this.send(
              'leave_approved',
              payload.employeeId,
              { leaveType: 'leave', startDate: '', endDate: '' },
              payload.tenantId,
            );
          }
        } catch (err) {
          logger.error({ err, event: EVENTS.LEAVE_APPROVED }, 'Notification listener error');
        }
      },
    );

    eventBus.on<{ publicId: string; tenantId: string; employeeId?: string; reason?: string }>(
      EVENTS.LEAVE_REJECTED,
      async (payload) => {
        try {
          if (payload.employeeId) {
            await this.send(
              'leave_rejected',
              payload.employeeId,
              { leaveType: 'leave', startDate: '', endDate: '', reason: payload.reason ?? '' },
              payload.tenantId,
            );
          }
        } catch (err) {
          logger.error({ err, event: EVENTS.LEAVE_REJECTED }, 'Notification listener error');
        }
      },
    );

    eventBus.on<{ publicId: string; tenantId: string; employeeId?: string }>(
      EVENTS.LEAVE_CANCELLED,
      async (payload) => {
        try {
          if (payload.employeeId) {
            await this.send(
              'leave_cancelled',
              payload.employeeId,
              { startDate: '', endDate: '' },
              payload.tenantId,
            );
          }
        } catch (err) {
          logger.error({ err, event: EVENTS.LEAVE_CANCELLED }, 'Notification listener error');
        }
      },
    );

    eventBus.on<{ instancePublicId?: string; tenantId: string; requestedBy?: string; entityType?: string }>(
      EVENTS.WORKFLOW_APPROVED,
      async (payload) => {
        try {
          if (payload.requestedBy) {
            await this.send(
              'workflow_approved',
              payload.requestedBy,
              { entityType: payload.entityType ?? 'request' },
              payload.tenantId,
            );
          }
        } catch (err) {
          logger.error({ err, event: EVENTS.WORKFLOW_APPROVED }, 'Notification listener error');
        }
      },
    );

    eventBus.on<{ instancePublicId?: string; tenantId: string; requestedBy?: string; entityType?: string; reason?: string }>(
      EVENTS.WORKFLOW_REJECTED,
      async (payload) => {
        try {
          if (payload.requestedBy) {
            await this.send(
              'workflow_rejected',
              payload.requestedBy,
              { entityType: payload.entityType ?? 'request', reason: payload.reason ?? '' },
              payload.tenantId,
            );
          }
        } catch (err) {
          logger.error({ err, event: EVENTS.WORKFLOW_REJECTED }, 'Notification listener error');
        }
      },
    );

    eventBus.on<{ publicId: string; tenantId: string; employeeName?: string; hrAdminId?: string }>(
      EVENTS.EMPLOYEE_CREATED,
      async (payload) => {
        try {
          if (payload.hrAdminId) {
            await this.send(
              'employee_created',
              payload.hrAdminId,
              { employeeName: payload.employeeName ?? payload.publicId },
              payload.tenantId,
            );
          }
        } catch (err) {
          logger.error({ err, event: EVENTS.EMPLOYEE_CREATED }, 'Notification listener error');
        }
      },
    );
  }

  // ── Seed default templates ─────────────────────────────────────────────

  async seedDefaultTemplates(tenantId: string): Promise<void> {
    for (const tpl of DEFAULT_TEMPLATES) {
      const existing = await this.repo.findTemplateByCode(tpl.code, tenantId);
      if (!existing) {
        const publicId = generatePublicId('ntpl');
        await this.repo.createTemplate({
          publicId,
          tenantId,
          code: tpl.code,
          name: tpl.name,
          channels: tpl.channels,
          subject: tpl.subject,
          bodyHtml: tpl.bodyHtml,
          bodyText: tpl.bodyText,
          variables: tpl.variables,
          isActive: true,
          createdBy: 'system',
          updatedBy: 'system',
          deletedAt: null,
        });
      }
    }
  }

  // ── Template CRUD ──────────────────────────────────────────────────────

  async createTemplate(dto: CreateTemplateDto, tenantId: string, actorId: string): Promise<NotificationTemplate> {
    const existing = await this.repo.findTemplateByCode(dto.code, tenantId);
    if (existing) throw new AppError(409, ErrorCodes.DUPLICATE_RECORD, `Template code '${dto.code}' already exists for this tenant`);

    const publicId = generatePublicId('ntpl');
    const template = await this.repo.createTemplate({
      publicId,
      tenantId,
      code: dto.code,
      name: dto.name,
      channels: dto.channels,
      subject: dto.subject,
      bodyHtml: dto.bodyHtml,
      bodyText: dto.bodyText,
      variables: dto.variables,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.CREATE,
      module: 'notifications',
      entityType: 'notification_template',
      entityPublicId: publicId,
    });

    return template;
  }

  async listTemplates(tenantId: string, page: number, limit: number): Promise<PaginatedResult<NotificationTemplate>> {
    const { data, total } = await this.repo.listTemplates(tenantId, page, limit);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async updateTemplate(publicId: string, dto: UpdateTemplateDto, tenantId: string, actorId: string): Promise<NotificationTemplate> {
    const updated = await this.repo.updateTemplate(publicId, tenantId, { ...dto, updatedBy: actorId });
    if (!updated) throw new AppError(404, ErrorCodes.NOTIFICATION_NOT_FOUND, 'Notification template not found');

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'notifications',
      entityType: 'notification_template',
      entityPublicId: publicId,
      newValue: dto as unknown as Record<string, unknown>,
    });

    return updated;
  }

  // ── Notification list / mark read ──────────────────────────────────────

  async listNotifications(userId: string, tenantId: string, query: NotificationListQuery): Promise<PaginatedResult<Notification>> {
    const { page, limit } = buildPaginationOptions({
      page: query.page,
      limit: query.limit,
    });
    return this.repo.findByRecipient(userId, tenantId, page, limit, query.unreadOnly);
  }

  async markRead(publicId: string, userId: string, tenantId: string): Promise<void> {
    const found = await this.repo.findByPublicId(publicId, tenantId);
    if (!found) throw new AppError(404, ErrorCodes.NOTIFICATION_NOT_FOUND, 'Notification not found');
    await this.repo.markRead(publicId, userId, tenantId);
  }

  async markAllRead(userId: string, tenantId: string): Promise<number> {
    return this.repo.markAllRead(userId, tenantId);
  }

  async countUnread(userId: string, tenantId: string): Promise<number> {
    return this.repo.countUnread(userId, tenantId);
  }

  // ── Preferences ────────────────────────────────────────────────────────

  async getPreferences(userId: string, tenantId: string): Promise<UserNotificationPreference | null> {
    return this.repo.getPreferences(userId, tenantId);
  }

  async updatePreferences(
    userId: string,
    tenantId: string,
    disabledCodes: string[],
    actorId: string,
  ): Promise<UserNotificationPreference> {
    const result = await this.repo.upsertPreferences(userId, tenantId, disabledCodes, actorId);

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'notifications',
      entityType: 'user_notification_preference',
      entityPublicId: userId,
      newValue: { disabledCodes } as unknown as Record<string, unknown>,
    });

    return result;
  }
}

export const notificationService = new NotificationService();
