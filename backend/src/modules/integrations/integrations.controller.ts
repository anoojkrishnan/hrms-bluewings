import type { Request, Response, NextFunction } from 'express';
import { IntegrationsService } from './integrations.service';
import { success } from '@/shared/utils/response';

const service = new IntegrationsService();

export class IntegrationsController {

  // ── API Clients ────────────────────────────────────────────────────────────

  listApiClients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clients = await service.listApiClients(req.user.tenantId);
      // Never expose keyHash; expose only keyPrefix
      const safe = clients.map(c => ({ ...c, keyHash: undefined }));
      res.json(success(safe));
    } catch (err) { next(err); }
  };

  createApiClient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const { client, rawKey } = await service.createApiClient(req.body, tenantId, organizationId, userId);
      const safe = { ...client, keyHash: undefined, rawKey };
      res.status(201).json(success(safe));
    } catch (err) { next(err); }
  };

  rotateApiClientKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const { client, rawKey } = await service.rotateApiClientKey(req.params.publicId, tenantId, userId);
      const safe = { ...client, keyHash: undefined, rawKey };
      res.json(success(safe));
    } catch (err) { next(err); }
  };

  deleteApiClient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await service.deleteApiClient(req.params.publicId, req.user.tenantId, req.user.userId);
      res.json(success({ deleted: true }));
    } catch (err) { next(err); }
  };

  // ── Webhooks ───────────────────────────────────────────────────────────────

  listWebhooks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const webhooks = await service.listWebhooks(req.user.tenantId);
      // Never expose the secret
      const safe = webhooks.map(w => ({ ...w, secret: '••••••••' }));
      res.json(success(safe));
    } catch (err) { next(err); }
  };

  createWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const webhook = await service.createWebhook(req.body, tenantId, organizationId, userId);
      res.status(201).json(success({ ...webhook, secret: '••••••••' }));
    } catch (err) { next(err); }
  };

  updateWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const webhook = await service.updateWebhook(req.params.publicId, req.body, req.user.tenantId, req.user.userId);
      res.json(success({ ...webhook, secret: '••••••••' }));
    } catch (err) { next(err); }
  };

  deleteWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await service.deleteWebhook(req.params.publicId, req.user.tenantId, req.user.userId);
      res.json(success({ deleted: true }));
    } catch (err) { next(err); }
  };

  listDeliveries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deliveries = await service.listDeliveries(req.params.publicId, req.user.tenantId);
      res.json(success(deliveries));
    } catch (err) { next(err); }
  };

  testWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await service.testWebhook(req.params.publicId, req.user.tenantId);
      res.json(success(result));
    } catch (err) { next(err); }
  };
}
