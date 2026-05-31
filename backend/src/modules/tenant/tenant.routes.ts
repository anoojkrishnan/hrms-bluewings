import { Router } from 'express';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { validate } from '@/shared/validators/common.schemas';
import {
  createTenantSchema,
  updateTenantSettingsSchema,
  slugCheckSchema,
  signupSchema,
} from './tenant.validator';
import { TENANT_PERMISSIONS } from './tenant.permissions';

const service = new TenantService();
const controller = new TenantController(service);

export const tenantRouter = Router();

// Public (no auth)
tenantRouter.post('/public/signup', validate(signupSchema), (req, res, next) => {
  void controller.signup(req, res, next);
});
tenantRouter.get('/public/check-slug', validate(slugCheckSchema), (req, res, next) => {
  void controller.checkSlug(req, res, next);
});

// Platform super admin routes
tenantRouter.get('/platform/tenants', (req, res, next) => {
  void controller.listAll(req, res, next);
});
tenantRouter.get('/platform/tenants/:slug', (req, res, next) => {
  void controller.getBySlug(req, res, next);
});
tenantRouter.post('/platform/tenants', validate(createTenantSchema), (req, res, next) => {
  void controller.create(req, res, next);
});
tenantRouter.patch('/platform/tenants/:slug/suspend', (req, res, next) => {
  void controller.suspend(req, res, next);
});
tenantRouter.patch('/platform/tenants/:slug/reactivate', (req, res, next) => {
  void controller.reactivate(req, res, next);
});
tenantRouter.get('/platform/tenants/:slug/usage', (req, res, next) => {
  void controller.getUsage(req, res, next);
});

// Tenant-scoped settings (requires auth + tenant context — wired in app.ts)
tenantRouter.get('/tenant/settings', (req, res, next) => {
  void controller.getSettings(req, res, next);
});
tenantRouter.put(
  '/tenant/settings',
  validate(updateTenantSettingsSchema),
  (req, res, next) => {
    void controller.updateSettings(req, res, next);
  },
);
tenantRouter.get('/tenant/modules', (req, res, next) => {
  void controller.getModules(req, res, next);
});
tenantRouter.patch('/tenant/modules/:moduleCode', (req, res, next) => {
  void controller.setModuleEnabled(req, res, next);
});

export { TENANT_PERMISSIONS };
