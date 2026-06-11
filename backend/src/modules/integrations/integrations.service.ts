import crypto from 'crypto';
import { IntegrationsRepository } from './integrations.repository';
import type { ApiClient, WebhookSubscription, WebhookEvent, CreateApiClientDto, CreateWebhookDto, UpdateWebhookDto } from './integrations.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { generatePublicId } from '@/shared/utils/publicId';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import { logger } from '@/config/logger';

export class IntegrationsService {
  private repo = new IntegrationsRepository();

  // ── API Clients ────────────────────────────────────────────────────────────

  async listApiClients(tenantId: string): Promise<ApiClient[]> {
    return this.repo.findApiClients(tenantId);
  }

  async createApiClient(dto: CreateApiClientDto, tenantId: string, orgId: string, actorId: string): Promise<{ client: ApiClient; rawKey: string }> {
    // Generate a secure random key: prefix_<32 bytes hex>
    const rawKey    = `hrms_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash   = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 10);

    const client = await this.repo.createApiClient({
      publicId: generatePublicId('apiclient_'),
      tenantId, organizationId: orgId,
      name: dto.name, description: dto.description,
      keyHash, keyPrefix,
      isActive: true, createdBy: actorId, updatedBy: actorId, deletedAt: null,
    });

    auditService.writeAsync({ tenantId, actorId, action: AuditAction.CREATE, module: 'integrations', entityType: 'api_client', entityPublicId: client.publicId, newValue: { name: client.name } as unknown as Record<string, unknown> });
    return { client, rawKey };
  }

  async rotateApiClientKey(publicId: string, tenantId: string, actorId: string): Promise<{ client: ApiClient; rawKey: string }> {
    const existing = await this.repo.findApiClientByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.NOT_FOUND, 'API client not found');

    const rawKey    = `hrms_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash   = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 10);

    const updated = await this.repo.updateApiClient(publicId, tenantId, { keyHash, keyPrefix, updatedBy: actorId });
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.UPDATE, module: 'integrations', entityType: 'api_client', entityPublicId: publicId, newValue: { rotated: true } as unknown as Record<string, unknown> });
    return { client: updated!, rawKey };
  }

  async deleteApiClient(publicId: string, tenantId: string, actorId: string): Promise<void> {
    await this.repo.softDeleteApiClient(publicId, tenantId);
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.DELETE, module: 'integrations', entityType: 'api_client', entityPublicId: publicId });
  }

  async validateApiKey(rawKey: string): Promise<ApiClient | null> {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const client = await this.repo.findApiClientByKeyHash(keyHash);
    if (client) {
      // Update last used timestamp (fire and forget)
      void this.repo.updateApiClient(client.publicId, client.tenantId, { lastUsedAt: new Date() });
    }
    return client;
  }

  // ── Webhooks ───────────────────────────────────────────────────────────────

  async listWebhooks(tenantId: string): Promise<WebhookSubscription[]> {
    return this.repo.findWebhooks(tenantId);
  }

  async createWebhook(dto: CreateWebhookDto, tenantId: string, orgId: string, actorId: string): Promise<WebhookSubscription> {
    const webhook = await this.repo.createWebhook({
      publicId: generatePublicId('wh_'),
      tenantId, organizationId: orgId,
      name: dto.name, url: dto.url, secret: dto.secret,
      events: dto.events,
      isActive: true, createdBy: actorId, updatedBy: actorId, deletedAt: null,
    });
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.CREATE, module: 'integrations', entityType: 'webhook', entityPublicId: webhook.publicId, newValue: { url: webhook.url, events: webhook.events } as unknown as Record<string, unknown> });
    return webhook;
  }

  async updateWebhook(publicId: string, dto: UpdateWebhookDto, tenantId: string, actorId: string): Promise<WebhookSubscription> {
    const updated = await this.repo.updateWebhook(publicId, tenantId, { ...dto, updatedBy: actorId });
    if (!updated) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Webhook not found');
    return updated;
  }

  async deleteWebhook(publicId: string, tenantId: string, actorId: string): Promise<void> {
    await this.repo.softDeleteWebhook(publicId, tenantId);
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.DELETE, module: 'integrations', entityType: 'webhook', entityPublicId: publicId });
  }

  async listDeliveries(webhookId: string, tenantId: string) {
    return this.repo.findDeliveries(webhookId, tenantId);
  }

  async testWebhook(publicId: string, tenantId: string): Promise<{ success: boolean; status?: number; error?: string }> {
    const webhook = await this.repo.findWebhookByPublicId(publicId, tenantId);
    if (!webhook) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Webhook not found');

    const payload = { event: 'webhook.test', timestamp: new Date().toISOString(), data: { message: 'Test delivery from HRMS' } };
    return this.deliverToWebhook(webhook, 'webhook.test' as WebhookEvent, payload);
  }

  // ── Internal delivery ──────────────────────────────────────────────────────

  async deliver(event: WebhookEvent, payload: Record<string, unknown>, tenantId: string): Promise<void> {
    const webhooks = await this.repo.findWebhooksByEvent(event, tenantId);
    for (const webhook of webhooks) {
      void this.deliverToWebhook(webhook, event, payload).then(result => {
        void this.repo.createDelivery({
          publicId: generatePublicId('whd_'),
          tenantId,
          webhookId: webhook.publicId,
          event, payload,
          responseStatus: result.status,
          success: result.success,
          error: result.error,
          deliveredAt: new Date(),
        });
      }).catch(err => {
        logger.error({ err, webhookId: webhook.publicId }, 'Webhook delivery error');
      });
    }
  }

  private async deliverToWebhook(
    webhook: WebhookSubscription,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<{ success: boolean; status?: number; error?: string }> {
    const body   = JSON.stringify({ event, timestamp: new Date().toISOString(), ...payload });
    const sig    = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');
    const start  = Date.now();

    try {
      const { default: fetch } = await import('node-fetch');
      const res = await (fetch as unknown as typeof globalThis.fetch)(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-HRMS-Signature': `sha256=${sig}`, 'X-HRMS-Event': event },
        body,
        signal: AbortSignal.timeout(10000),
      });
      return { success: res.ok, status: res.status };
    } catch (err) {
      logger.warn({ err, url: webhook.url, durationMs: Date.now() - start }, 'Webhook delivery failed');
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }
}

export const integrationsService = new IntegrationsService();
