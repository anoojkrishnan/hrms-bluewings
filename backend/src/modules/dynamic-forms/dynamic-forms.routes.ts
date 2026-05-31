import { Router } from 'express';
import { DynamicFormsController } from './dynamic-forms.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';
import { requirePermission } from '@/middleware/permission.middleware';
import { validate } from '@/shared/validators/common.schemas';
import { DynamicFormsPermissions as P } from './dynamic-forms.permissions';
import {
  createFormSchema,
  updateFormSchema,
  submitFormSchema,
} from './dynamic-forms.validator';

const router = Router();
const ctrl = new DynamicFormsController();

router.use(requireAuth, requireTenantContext);

// ── Forms ─────────────────────────────────────────────────────────────────────
router.get('/forms', requirePermission(P.VIEW), ctrl.listForms);
router.post('/forms', requirePermission(P.CONFIGURE), validate(createFormSchema), ctrl.createForm);
router.get('/forms/:publicId', requirePermission(P.VIEW), ctrl.getForm);
router.put('/forms/:publicId', requirePermission(P.CONFIGURE), validate(updateFormSchema), ctrl.updateForm);
router.delete('/forms/:publicId', requirePermission(P.CONFIGURE), ctrl.deleteForm);

// ── Submissions ───────────────────────────────────────────────────────────────
router.get('/forms/:publicId/submissions', requirePermission(P.VIEW), ctrl.listSubmissions);
router.post('/forms/:publicId/submissions', validate(submitFormSchema), ctrl.submitForm);
router.get('/forms/:publicId/submissions/:subPublicId', requirePermission(P.VIEW), ctrl.getSubmission);

export { router as dynamicFormsRouter };
