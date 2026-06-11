import { Router } from 'express';
import { IntegrationsController } from './integrations.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';
import { requirePermission } from '@/middleware/permission.middleware';
import { validate } from '@/shared/validators/common.schemas';
import { INTEGRATIONS_PERMISSIONS as P } from './integrations.permissions';
import { createApiClientSchema, createWebhookSchema, updateWebhookSchema } from './integrations.validator';

const router = Router();
const ctrl   = new IntegrationsController();

router.use(requireAuth, requireTenantContext);

// ── API Clients ────────────────────────────────────────────────────────────
router.get('/integrations/api-clients',                       requirePermission(P.API_CLIENT_MANAGE), (req, res, next) => { void ctrl.listApiClients(req, res, next); });
router.post('/integrations/api-clients',                      requirePermission(P.API_CLIENT_MANAGE), validate(createApiClientSchema), (req, res, next) => { void ctrl.createApiClient(req, res, next); });
router.post('/integrations/api-clients/:publicId/rotate-key', requirePermission(P.API_CLIENT_MANAGE), (req, res, next) => { void ctrl.rotateApiClientKey(req, res, next); });
router.delete('/integrations/api-clients/:publicId',          requirePermission(P.API_CLIENT_MANAGE), (req, res, next) => { void ctrl.deleteApiClient(req, res, next); });

// ── Webhooks ───────────────────────────────────────────────────────────────
router.get('/integrations/webhooks',                          requirePermission(P.WEBHOOK_MANAGE),    (req, res, next) => { void ctrl.listWebhooks(req, res, next); });
router.post('/integrations/webhooks',                         requirePermission(P.WEBHOOK_MANAGE),    validate(createWebhookSchema), (req, res, next) => { void ctrl.createWebhook(req, res, next); });
router.put('/integrations/webhooks/:publicId',                requirePermission(P.WEBHOOK_MANAGE),    validate(updateWebhookSchema), (req, res, next) => { void ctrl.updateWebhook(req, res, next); });
router.delete('/integrations/webhooks/:publicId',             requirePermission(P.WEBHOOK_MANAGE),    (req, res, next) => { void ctrl.deleteWebhook(req, res, next); });
router.get('/integrations/webhooks/:publicId/deliveries',     requirePermission(P.WEBHOOK_MANAGE),    (req, res, next) => { void ctrl.listDeliveries(req, res, next); });
router.post('/integrations/webhooks/:publicId/test',          requirePermission(P.WEBHOOK_MANAGE),    (req, res, next) => { void ctrl.testWebhook(req, res, next); });

export { router as integrationsRouter };
