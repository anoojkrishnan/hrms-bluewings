import { Router, raw } from 'express';
import { OrganizationController } from './organization.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';
import { requirePermission } from '@/middleware/permission.middleware';
import { validate } from '@/shared/validators/common.schemas';
import { ORGANIZATION_PERMISSIONS as P } from './organization.permissions';
import {
  createCompanySchema, updateCompanySchema,
  logoPresignSchema, logoConfirmSchema,
  createDepartmentSchema, updateDepartmentSchema,
  createDesignationSchema, updateDesignationSchema,
  createGradeSchema, updateGradeSchema,
  createLocationSchema, updateLocationSchema,
  createAuthoritySignatureSchema, updateAuthoritySignatureSchema,
  publicIdParamSchema,
} from './organization.validator';

const router = Router();
const ctrl = new OrganizationController();

router.use(requireAuth, requireTenantContext);

// ── Companies ─────────────────────────────────────────────────────────────
router.get('/companies', requirePermission(P.COMPANY_VIEW), ctrl.listCompanies);
router.post('/companies', requirePermission(P.COMPANY_CREATE), validate(createCompanySchema), ctrl.createCompany);
router.get('/companies/:publicId', requirePermission(P.COMPANY_VIEW), validate(publicIdParamSchema), ctrl.getCompany);
router.put('/companies/:publicId', requirePermission(P.COMPANY_EDIT), validate(updateCompanySchema), ctrl.updateCompany);
router.delete('/companies/:publicId', requirePermission(P.COMPANY_DELETE), validate(publicIdParamSchema), ctrl.deleteCompany);
router.post('/companies/:publicId/logo', requirePermission(P.COMPANY_EDIT), raw({ type: '*/*', limit: '10mb' }), ctrl.uploadLogo);
router.post('/companies/:publicId/logo/presign', requirePermission(P.COMPANY_EDIT), validate(logoPresignSchema), ctrl.presignLogo);
router.post('/companies/:publicId/logo/confirm', requirePermission(P.COMPANY_EDIT), validate(logoConfirmSchema), ctrl.confirmLogo);
router.delete('/companies/:publicId/logo', requirePermission(P.COMPANY_EDIT), validate(publicIdParamSchema), ctrl.deleteLogo);

// ── Departments ───────────────────────────────────────────────────────────
router.get('/departments', requirePermission(P.DEPARTMENT_VIEW), ctrl.listDepartments);
router.get('/departments/tree', requirePermission(P.DEPARTMENT_VIEW), ctrl.getDepartmentTree);
router.post('/departments', requirePermission(P.DEPARTMENT_CREATE), validate(createDepartmentSchema), ctrl.createDepartment);
router.get('/departments/:publicId', requirePermission(P.DEPARTMENT_VIEW), validate(publicIdParamSchema), ctrl.getDepartment);
router.put('/departments/:publicId', requirePermission(P.DEPARTMENT_EDIT), validate(updateDepartmentSchema), ctrl.updateDepartment);
router.delete('/departments/:publicId', requirePermission(P.DEPARTMENT_DELETE), validate(publicIdParamSchema), ctrl.deleteDepartment);

// ── Designations ──────────────────────────────────────────────────────────
router.get('/designations', requirePermission(P.DESIGNATION_VIEW), ctrl.listDesignations);
router.post('/designations', requirePermission(P.DESIGNATION_CREATE), validate(createDesignationSchema), ctrl.createDesignation);
router.get('/designations/:publicId', requirePermission(P.DESIGNATION_VIEW), validate(publicIdParamSchema), ctrl.getDesignation);
router.put('/designations/:publicId', requirePermission(P.DESIGNATION_EDIT), validate(updateDesignationSchema), ctrl.updateDesignation);
router.delete('/designations/:publicId', requirePermission(P.DESIGNATION_DELETE), validate(publicIdParamSchema), ctrl.deleteDesignation);

// ── Grades ────────────────────────────────────────────────────────────────
router.get('/grades', requirePermission(P.GRADE_VIEW), ctrl.listGrades);
router.post('/grades', requirePermission(P.GRADE_CREATE), validate(createGradeSchema), ctrl.createGrade);
router.get('/grades/:publicId', requirePermission(P.GRADE_VIEW), validate(publicIdParamSchema), ctrl.getGrade);
router.put('/grades/:publicId', requirePermission(P.GRADE_EDIT), validate(updateGradeSchema), ctrl.updateGrade);
router.delete('/grades/:publicId', requirePermission(P.GRADE_DELETE), validate(publicIdParamSchema), ctrl.deleteGrade);

// ── Locations ─────────────────────────────────────────────────────────────
router.get('/locations', requirePermission(P.LOCATION_VIEW), ctrl.listLocations);
router.post('/locations', requirePermission(P.LOCATION_CREATE), validate(createLocationSchema), ctrl.createLocation);
router.get('/locations/:publicId', requirePermission(P.LOCATION_VIEW), validate(publicIdParamSchema), ctrl.getLocation);
router.put('/locations/:publicId', requirePermission(P.LOCATION_EDIT), validate(updateLocationSchema), ctrl.updateLocation);
router.delete('/locations/:publicId', requirePermission(P.LOCATION_DELETE), validate(publicIdParamSchema), ctrl.deleteLocation);

// ── Org chart ─────────────────────────────────────────────────────────────
router.get('/org-chart', requirePermission(P.DEPARTMENT_VIEW), ctrl.getDepartmentTree);

// ── Authority Signatures ──────────────────────────────────────────────────
router.get('/authority-signatures', requirePermission(P.AUTHORITY_SIGNATURE_VIEW), ctrl.listAuthoritySignatures);
router.post('/authority-signatures', requirePermission(P.AUTHORITY_SIGNATURE_CREATE), validate(createAuthoritySignatureSchema), ctrl.createAuthoritySignature);
router.get('/authority-signatures/:publicId', requirePermission(P.AUTHORITY_SIGNATURE_VIEW), validate(publicIdParamSchema), ctrl.getAuthoritySignature);
router.put('/authority-signatures/:publicId', requirePermission(P.AUTHORITY_SIGNATURE_EDIT), validate(updateAuthoritySignatureSchema), ctrl.updateAuthoritySignature);
router.delete('/authority-signatures/:publicId', requirePermission(P.AUTHORITY_SIGNATURE_DELETE), validate(publicIdParamSchema), ctrl.deleteAuthoritySignature);
router.post('/authority-signatures/:publicId/image', requirePermission(P.AUTHORITY_SIGNATURE_EDIT), raw({ type: '*/*', limit: '5mb' }), ctrl.uploadAuthoritySignature);
router.delete('/authority-signatures/:publicId/image', requirePermission(P.AUTHORITY_SIGNATURE_EDIT), validate(publicIdParamSchema), ctrl.deleteAuthoritySignatureImage);

export { router as organizationRouter };
