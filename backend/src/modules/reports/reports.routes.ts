import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';
import { requirePermission } from '@/middleware/permission.middleware';
import { validate } from '@/shared/validators/common.schemas';
import { REPORTS_PERMISSIONS as P } from './reports.permissions';
import { z } from 'zod';

const router = Router();
const ctrl   = new ReportsController();

const generateSchema = z.object({
  body: z.object({
    templateKey: z.string().min(1),
    params:      z.record(z.unknown()).default({}),
  }),
});

router.use(requireAuth, requireTenantContext);

// ── Report templates & generation ──────────────────────────────────────────
router.get('/reports/templates',          requirePermission(P.STANDARD_VIEW),   ctrl.listTemplates);
router.post('/reports/generate',          requirePermission(P.STANDARD_EXPORT), validate(generateSchema), (req, res, next) => { void ctrl.generate(req, res, next); });
router.get('/reports/jobs',               requirePermission(P.STANDARD_VIEW),   (req, res, next) => { void ctrl.listJobs(req, res, next); });

// ── Analytics ──────────────────────────────────────────────────────────────
router.get('/analytics/headcount',        requirePermission(P.ANALYTICS_VIEW),  (req, res, next) => { void ctrl.headcount(req, res, next); });
router.get('/analytics/attrition',        requirePermission(P.ANALYTICS_VIEW),  (req, res, next) => { void ctrl.attrition(req, res, next); });
router.get('/analytics/payroll-cost',     requirePermission(P.ANALYTICS_VIEW),  (req, res, next) => { void ctrl.payrollCost(req, res, next); });

export { router as reportsRouter };
