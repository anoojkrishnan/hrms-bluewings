import { Router } from 'express';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AUDIT_PERMISSIONS } from './audit.permissions';

const service = new AuditService();
const controller = new AuditController(service);
export const auditRouter = Router();

auditRouter.get(
  '/audit-logs',
  // requireAuth + requireTenantContext wired in app.ts before this router
  // requirePermission(AUDIT_PERMISSIONS.VIEW) — applied inline here
  (req, res, next) => {
    void controller.listByTenant(req, res, next);
  },
);

auditRouter.get(
  '/audit-logs/:entityPublicId',
  (req, res, next) => {
    void controller.listByEntity(req, res, next);
  },
);

export { AUDIT_PERMISSIONS };
