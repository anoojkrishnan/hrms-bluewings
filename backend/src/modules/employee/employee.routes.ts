import { Router } from 'express';
import { EmployeeController } from './employee.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';
import { requirePermission } from '@/middleware/permission.middleware';
import { validate } from '@/shared/validators/common.schemas';
import { EMPLOYEE_PERMISSIONS as P } from './employee.permissions';
import {
  createEmployeeSchema, updateEmployeeSchema, changeStatusSchema,
  updatePersonalDetailsSchema, upsertBankDetailsSchema,
  presignDocumentSchema, confirmDocumentSchema,
} from './employee.validator';

const router = Router();
const ctrl = new EmployeeController();

router.use(requireAuth, requireTenantContext);

// ── Employee CRUD ─────────────────────────────────────────────────────────────
router.get('/employees', requirePermission(P.PROFILE_VIEW), ctrl.list);
router.post('/employees', requirePermission(P.PROFILE_CREATE), validate(createEmployeeSchema), ctrl.create);
router.get('/employees/:employeeCode', requirePermission(P.PROFILE_VIEW), ctrl.get);
router.put('/employees/:employeeCode', requirePermission(P.PROFILE_EDIT), validate(updateEmployeeSchema), ctrl.update);
router.patch('/employees/:employeeCode/status', requirePermission(P.PROFILE_EDIT), validate(changeStatusSchema), ctrl.changeStatus);
router.delete('/employees/:employeeCode', requirePermission(P.PROFILE_DELETE), ctrl.delete);

// ── Sub-resources ─────────────────────────────────────────────────────────────
router.get('/employees/:employeeCode/personal', requirePermission(P.PROFILE_VIEW), ctrl.getPersonalDetails);
router.put('/employees/:employeeCode/personal', requirePermission(P.PROFILE_EDIT), validate(updatePersonalDetailsSchema), ctrl.updatePersonalDetails);

router.get('/employees/:employeeCode/bank-details', requirePermission(P.BANK_DETAILS_VIEW), ctrl.getBankDetails);
router.put('/employees/:employeeCode/bank-details', requirePermission(P.BANK_DETAILS_EDIT), validate(upsertBankDetailsSchema), ctrl.upsertBankDetails);

router.get('/employees/:employeeCode/documents', requirePermission(P.DOCUMENTS_VIEW), ctrl.getDocuments);
router.post('/employees/:employeeCode/documents/presign', requirePermission(P.DOCUMENTS_UPLOAD), validate(presignDocumentSchema), ctrl.presignDocument);
router.post('/employees/:employeeCode/documents/confirm', requirePermission(P.DOCUMENTS_UPLOAD), validate(confirmDocumentSchema), ctrl.confirmDocument);
router.delete('/employees/:employeeCode/documents/:docPublicId', requirePermission(P.DOCUMENTS_DELETE), ctrl.deleteDocument);

router.get('/employees/:employeeCode/timeline', requirePermission(P.TIMELINE_VIEW), ctrl.getTimeline);

// ── ESS ───────────────────────────────────────────────────────────────────────
router.post('/employees/:employeeCode/ess/invite', requirePermission(P.ESS_MANAGE), ctrl.inviteEss);
router.post('/employees/:employeeCode/ess/disable', requirePermission(P.ESS_MANAGE), ctrl.disableEss);

export { router as employeeRouter };
