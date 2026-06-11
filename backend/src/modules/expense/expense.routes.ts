import { Router } from 'express';
import { ExpenseController } from './expense.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';
import { requirePermission } from '@/middleware/permission.middleware';
import { validate } from '@/shared/validators/common.schemas';
import { EXPENSE_PERMISSIONS as P } from './expense.permissions';
import {
  createCategorySchema, updateCategorySchema,
  createClaimSchema, reviewClaimSchema,
} from './expense.validator';

const router = Router();
const ctrl   = new ExpenseController();

router.use(requireAuth, requireTenantContext);

// ── Categories ──────────────────────────────────────────────────────────────
router.get('/expense/categories',             requirePermission(P.CATEGORY_VIEW),      (req, res, next) => { void ctrl.listCategories(req, res, next); });
router.post('/expense/categories',            requirePermission(P.CATEGORY_CONFIGURE), validate(createCategorySchema), (req, res, next) => { void ctrl.createCategory(req, res, next); });
router.put('/expense/categories/:publicId',   requirePermission(P.CATEGORY_CONFIGURE), validate(updateCategorySchema), (req, res, next) => { void ctrl.updateCategory(req, res, next); });

// ── Claims ──────────────────────────────────────────────────────────────────
router.get('/expense/claims',                 requirePermission(P.CLAIM_VIEW),         (req, res, next) => { void ctrl.listClaims(req, res, next); });
router.post('/expense/claims',                requirePermission(P.CLAIM_CREATE),        validate(createClaimSchema),  (req, res, next) => { void ctrl.createClaim(req, res, next); });
router.get('/expense/claims/:publicId',       requirePermission(P.CLAIM_VIEW),         (req, res, next) => { void ctrl.getClaim(req, res, next); });
router.post('/expense/claims/:publicId/submit',  requirePermission(P.CLAIM_SUBMIT),    (req, res, next) => { void ctrl.submitClaim(req, res, next); });
router.patch('/expense/claims/:publicId/approve', requirePermission(P.CLAIM_APPROVE), (req, res, next) => { void ctrl.approveClaim(req, res, next); });
router.patch('/expense/claims/:publicId/reject',  requirePermission(P.CLAIM_REJECT),   validate(reviewClaimSchema), (req, res, next) => { void ctrl.rejectClaim(req, res, next); });

export { router as expenseRouter };
