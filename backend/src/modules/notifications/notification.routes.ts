import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';
import { requirePermission } from '@/middleware/permission.middleware';
import { validate } from '@/shared/validators/common.schemas';
import { NotificationPermissions as P } from './notification.permissions';
import {
  updatePreferencesSchema,
  createTemplateSchema,
  updateTemplateSchema,
} from './notification.validator';

const router = Router();
const ctrl = new NotificationController();

router.use(requireAuth, requireTenantContext);

// ── Notification inbox ─────────────────────────────────────────────────────────
router.get('/notifications', requirePermission(P.VIEW), ctrl.listNotifications);
router.get('/notifications/unread-count', ctrl.getUnreadCount);
router.patch('/notifications/:publicId/read', ctrl.markRead);
router.patch('/notifications/read-all', ctrl.markAllRead);

// ── Preferences ────────────────────────────────────────────────────────────────
router.get('/notification-preferences', ctrl.getPreferences);
router.put('/notification-preferences', validate(updatePreferencesSchema), ctrl.updatePreferences);

// ── Templates (HR Admin) ───────────────────────────────────────────────────────
router.get('/notification-templates', requirePermission(P.TEMPLATE_VIEW), ctrl.listTemplates);
router.post('/notification-templates', requirePermission(P.TEMPLATE_CREATE), validate(createTemplateSchema), ctrl.createTemplate);
router.put('/notification-templates/:publicId', requirePermission(P.TEMPLATE_EDIT), validate(updateTemplateSchema), ctrl.updateTemplate);

export { router as notificationRouter };
