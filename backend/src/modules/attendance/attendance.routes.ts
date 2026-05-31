import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';
import { requirePermission } from '@/middleware/permission.middleware';
import { validate } from '@/shared/validators/common.schemas';
import { ATTENDANCE_PERMISSIONS as P } from './attendance.permissions';
import {
  punchSchema, manualOverrideSchema, regularizeSchema,
  createExceptionSchema, reviewExceptionSchema, lockDateSchema,
  createShiftSchema, updateShiftSchema,
} from './attendance.validator';

const router = Router();
const ctrl = new AttendanceController();

router.use(requireAuth, requireTenantContext);

// ── Attendance logs ───────────────────────────────────────────────────────────
router.get('/attendance', requirePermission(P.LOG_VIEW), ctrl.listLogs);
router.get('/attendance/:employeeCode/:date', requirePermission(P.LOG_VIEW), ctrl.getLog);

// ── Punch (ESS — requireAuth only, no extra permission) ───────────────────────
router.post('/attendance/punch', validate(punchSchema), ctrl.punch);

// ── Manual override (HR/admin) ────────────────────────────────────────────────
router.post('/attendance/override', requirePermission(P.LOG_OVERRIDE), validate(manualOverrideSchema), ctrl.manualOverride);

// ── Exceptions ────────────────────────────────────────────────────────────────
router.get('/attendance/exceptions', requirePermission(P.EXCEPTION_VIEW), ctrl.listExceptions);
router.post('/attendance/exceptions', validate(createExceptionSchema), ctrl.createException);
router.patch('/attendance/exceptions/:publicId/approve', requirePermission(P.EXCEPTION_APPROVE), ctrl.approveException);
router.patch('/attendance/exceptions/:publicId/reject', requirePermission(P.EXCEPTION_APPROVE), validate(reviewExceptionSchema), ctrl.rejectException);

// ── Regularize (self-service — creates exception request) ────────────────────
router.post('/attendance/regularize', validate(regularizeSchema), ctrl.regularize);

// ── Admin actions ─────────────────────────────────────────────────────────────
router.post('/attendance/lock', requirePermission(P.LOCK), validate(lockDateSchema), ctrl.lockDate);

// ── Shifts ────────────────────────────────────────────────────────────────────
router.get('/attendance/shifts', requirePermission(P.SHIFT_VIEW), ctrl.listShifts);
router.post('/attendance/shifts', requirePermission(P.SHIFT_CONFIGURE), validate(createShiftSchema), ctrl.createShift);
router.put('/attendance/shifts/:publicId', requirePermission(P.SHIFT_CONFIGURE), validate(updateShiftSchema), ctrl.updateShift);

export { router as attendanceRouter };
