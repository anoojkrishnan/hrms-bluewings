import { Router } from 'express';
import { LeaveController } from './leave.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';
import { requirePermission } from '@/middleware/permission.middleware';
import { validate } from '@/shared/validators/common.schemas';
import { LEAVE_PERMISSIONS as P } from './leave.permissions';
import {
  createLeaveTypeSchema, updateLeaveTypeSchema,
  applyLeaveSchema, approveRejectSchema, revokeSchema,
  adjustBalanceSchema, bulkAdjustBalanceSchema,
  createHolidayListSchema, createHolidaySchema, weekendPolicySchema,
} from './leave.validator';

const router = Router();
const ctrl = new LeaveController();

router.use(requireAuth, requireTenantContext);

// ── Leave Types ───────────────────────────────────────────────────────────────
router.get('/leave/types', requirePermission(P.APPLICATION_VIEW), ctrl.listLeaveTypes);
router.post('/leave/types', requirePermission(P.POLICY_CONFIGURE), validate(createLeaveTypeSchema), ctrl.createLeaveType);
router.put('/leave/types/:publicId', requirePermission(P.POLICY_CONFIGURE), validate(updateLeaveTypeSchema), ctrl.updateLeaveType);

// ── Leave Applications ────────────────────────────────────────────────────────
router.get('/leave/applications', requirePermission(P.APPLICATION_VIEW), ctrl.listApplications);
router.post('/leave/applications', requirePermission(P.APPLICATION_CREATE), validate(applyLeaveSchema), ctrl.applyLeave);
router.get('/leave/applications/:publicId', requirePermission(P.APPLICATION_VIEW), ctrl.getApplication);
router.delete('/leave/applications/:publicId', requirePermission(P.APPLICATION_CANCEL), ctrl.cancelLeave);
router.patch('/leave/applications/:publicId/approve', requirePermission(P.APPLICATION_APPROVE), ctrl.approveLeave);
router.patch('/leave/applications/:publicId/reject', requirePermission(P.APPLICATION_REJECT), validate(approveRejectSchema), ctrl.rejectLeave);
router.patch('/leave/applications/:publicId/revoke', requirePermission(P.APPLICATION_REVOKE), validate(revokeSchema), ctrl.revokeLeave);

// ── Leave Balances ────────────────────────────────────────────────────────────
router.get('/leave/balances', requirePermission(P.BALANCE_VIEW), ctrl.getMyBalance);
// Static sub-paths must come before the /:employeeCode param route
router.get('/leave/balances/all', requirePermission(P.BALANCE_ADJUST), (req, res, next) => { void ctrl.listAllBalances(req, res, next); });
router.post('/leave/balances/init', requirePermission(P.POLICY_CONFIGURE), (req, res, next) => { void ctrl.initAllBalances(req, res, next); });
router.post('/leave/balances/bulk-adjust', requirePermission(P.BALANCE_ADJUST), validate(bulkAdjustBalanceSchema), (req, res, next) => { void ctrl.bulkAdjustBalance(req, res, next); });
router.get('/leave/balances/:employeeCode', requirePermission(P.BALANCE_VIEW), ctrl.getBalance);
router.put('/leave/balances/:employeeCode/adjust', requirePermission(P.BALANCE_ADJUST), validate(adjustBalanceSchema), ctrl.adjustBalance);

// ── Calendar ──────────────────────────────────────────────────────────────────
router.get('/leave/calendar', requirePermission(P.APPLICATION_VIEW), ctrl.getCalendar);

// ── Holidays ──────────────────────────────────────────────────────────────────
router.get('/leave/holiday-lists', requirePermission(P.APPLICATION_VIEW), ctrl.listHolidayLists);
router.post('/leave/holiday-lists', requirePermission(P.POLICY_CONFIGURE), validate(createHolidayListSchema), ctrl.createHolidayList);
router.get('/leave/holidays', requirePermission(P.APPLICATION_VIEW), ctrl.listHolidays);
router.post('/leave/holidays', requirePermission(P.POLICY_CONFIGURE), validate(createHolidaySchema), ctrl.createHoliday);
router.put('/leave/weekend-policy', requirePermission(P.POLICY_CONFIGURE), validate(weekendPolicySchema), ctrl.upsertWeekendPolicy);

export { router as leaveRouter };
