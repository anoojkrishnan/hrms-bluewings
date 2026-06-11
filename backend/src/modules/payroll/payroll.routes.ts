import { Router } from 'express';
import { PayrollController } from './payroll.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';
import { requirePermission } from '@/middleware/permission.middleware';
import { validate } from '@/shared/validators/common.schemas';
import { PAYROLL_PERMISSIONS as P } from './payroll.permissions';
import {
  createSalaryComponentSchema, updateSalaryComponentSchema,
  createSalaryStructureSchema, updateSalaryStructureSchema,
  assignSalarySchema, reviseSalarySchema,
  createPayrollCycleSchema, updatePayrollCycleSchema,
  createPayrollRunSchema, rollbackRunSchema,
  upsertPayrollInputsSchema, upsertStatutorySchema,
  requestLoanSchema, rejectLoanSchema, initiateFnFSchema,
} from './payroll.validator';

const router = Router();
const ctrl   = new PayrollController();

router.use(requireAuth, requireTenantContext);

// ── Salary Components ──────────────────────────────────────────────────────
router.get('/payroll/salary-components',                requirePermission(P.COMPONENT_VIEW),   (req, res, next) => { void ctrl.listComponents(req, res, next); });
router.post('/payroll/salary-components',               requirePermission(P.COMPONENT_MANAGE), validate(createSalaryComponentSchema), (req, res, next) => { void ctrl.createComponent(req, res, next); });
router.put('/payroll/salary-components/:publicId',      requirePermission(P.COMPONENT_MANAGE), validate(updateSalaryComponentSchema), (req, res, next) => { void ctrl.updateComponent(req, res, next); });
router.delete('/payroll/salary-components/:publicId',   requirePermission(P.COMPONENT_MANAGE), (req, res, next) => { void ctrl.deleteComponent(req, res, next); });

// ── Salary Structures ──────────────────────────────────────────────────────
router.get('/payroll/salary-structures',                requirePermission(P.STRUCTURE_VIEW),   (req, res, next) => { void ctrl.listStructures(req, res, next); });
router.post('/payroll/salary-structures',               requirePermission(P.STRUCTURE_MANAGE), validate(createSalaryStructureSchema), (req, res, next) => { void ctrl.createStructure(req, res, next); });
router.get('/payroll/salary-structures/:publicId',      requirePermission(P.STRUCTURE_VIEW),   (req, res, next) => { void ctrl.getStructure(req, res, next); });
router.put('/payroll/salary-structures/:publicId',      requirePermission(P.STRUCTURE_MANAGE), validate(updateSalaryStructureSchema), (req, res, next) => { void ctrl.updateStructure(req, res, next); });

// ── Employee Salary ────────────────────────────────────────────────────────
router.get('/payroll/salary/:employeeCode',             requirePermission(P.EMPLOYEE_SALARY_VIEW),   (req, res, next) => { void ctrl.getEmployeeSalary(req, res, next); });
router.put('/payroll/salary/:employeeCode/assign',      requirePermission(P.EMPLOYEE_SALARY_ASSIGN), validate(assignSalarySchema),  (req, res, next) => { void ctrl.assignSalary(req, res, next); });
router.put('/payroll/salary/:employeeCode/revise',      requirePermission(P.EMPLOYEE_SALARY_REVISE), validate(reviseSalarySchema),  (req, res, next) => { void ctrl.reviseSalary(req, res, next); });

// ── Payroll Cycles ─────────────────────────────────────────────────────────
router.get('/payroll/cycles',                           requirePermission(P.RUN_VIEW),         (req, res, next) => { void ctrl.listCycles(req, res, next); });
router.post('/payroll/cycles',                          requirePermission(P.CYCLE_MANAGE),     validate(createPayrollCycleSchema), (req, res, next) => { void ctrl.createCycle(req, res, next); });
router.put('/payroll/cycles/:publicId',                 requirePermission(P.CYCLE_MANAGE),     validate(updatePayrollCycleSchema), (req, res, next) => { void ctrl.updateCycle(req, res, next); });

// ── Payroll Runs ───────────────────────────────────────────────────────────
router.get('/payroll/runs',                             requirePermission(P.RUN_VIEW),         (req, res, next) => { void ctrl.listRuns(req, res, next); });
router.post('/payroll/runs',                            requirePermission(P.RUN_CREATE),       validate(createPayrollRunSchema), (req, res, next) => { void ctrl.createRun(req, res, next); });
router.get('/payroll/runs/:publicId',                   requirePermission(P.RUN_VIEW),         (req, res, next) => { void ctrl.getRun(req, res, next); });
router.get('/payroll/runs/:publicId/items',             requirePermission(P.RUN_VIEW),         (req, res, next) => { void ctrl.getRunItems(req, res, next); });
router.post('/payroll/runs/:publicId/preview',          requirePermission(P.RUN_CREATE),       (req, res, next) => { void ctrl.previewRun(req, res, next); });
router.post('/payroll/runs/:publicId/process',          requirePermission(P.RUN_CREATE),       (req, res, next) => { void ctrl.processRun(req, res, next); });
router.patch('/payroll/runs/:publicId/approve',         requirePermission(P.RUN_APPROVE),      (req, res, next) => { void ctrl.approveRun(req, res, next); });
router.patch('/payroll/runs/:publicId/finalize',        requirePermission(P.RUN_FINALIZE),     (req, res, next) => { void ctrl.finalizeRun(req, res, next); });
router.post('/payroll/runs/:publicId/publish-payslips', requirePermission(P.PAYSLIP_PUBLISH),  (req, res, next) => { void ctrl.publishPayslips(req, res, next); });
router.patch('/payroll/runs/:publicId/rollback',        requirePermission(P.RUN_ROLLBACK),     validate(rollbackRunSchema), (req, res, next) => { void ctrl.rollbackRun(req, res, next); });

// ── Payroll Inputs ─────────────────────────────────────────────────────────
router.get('/payroll/inputs/:runPublicId',              requirePermission(P.INPUTS_MANAGE),    (req, res, next) => { void ctrl.getInputs(req, res, next); });
router.put('/payroll/inputs/:runPublicId',              requirePermission(P.INPUTS_MANAGE),    validate(upsertPayrollInputsSchema), (req, res, next) => { void ctrl.upsertInputs(req, res, next); });

// ── Payslips — permission scoped internally by service ─────────────────────
router.get('/payroll/payslips',                         requireAuth,                            (req, res, next) => { void ctrl.listPayslips(req, res, next); });
router.get('/payroll/payslips/:publicId',               requireAuth,                            (req, res, next) => { void ctrl.getPayslip(req, res, next); });

// ── Statutory Settings ─────────────────────────────────────────────────────
router.get('/payroll/statutory-settings',               requirePermission(P.RUN_VIEW),          (req, res, next) => { void ctrl.getStatutorySettings(req, res, next); });
router.put('/payroll/statutory-settings',               requirePermission(P.STATUTORY_MANAGE),  validate(upsertStatutorySchema), (req, res, next) => { void ctrl.upsertStatutorySettings(req, res, next); });

// ── Bank File ──────────────────────────────────────────────────────────────
router.post('/payroll/runs/:publicId/bank-file',        requirePermission(P.RUN_FINALIZE),     (req, res, next) => { void ctrl.generateBankFile(req, res, next); });

// ── Reports ────────────────────────────────────────────────────────────────
router.get('/payroll/reports/salary-register',          requirePermission(P.RUN_VIEW),         (req, res, next) => { void ctrl.salaryRegister(req, res, next); });
router.get('/payroll/reports/payout-register',          requirePermission(P.RUN_VIEW),         (req, res, next) => { void ctrl.payoutRegister(req, res, next); });

// ── Loans ──────────────────────────────────────────────────────────────────
router.get('/payroll/loans',                            requirePermission(P.LOAN_VIEW),        (req, res, next) => { void ctrl.getMyLoans(req, res, next); });
router.post('/payroll/loans',                           requirePermission(P.LOAN_CREATE),      validate(requestLoanSchema), (req, res, next) => { void ctrl.requestLoan(req, res, next); });
router.get('/payroll/loans/:publicId',                  requirePermission(P.LOAN_VIEW),        (req, res, next) => { void ctrl.getLoan(req, res, next); });
router.get('/payroll/loans/:publicId/schedule',         requirePermission(P.LOAN_VIEW),        (req, res, next) => { void ctrl.getLoanSchedule(req, res, next); });
router.patch('/payroll/loans/:publicId/approve',        requirePermission(P.LOAN_APPROVE),     (req, res, next) => { void ctrl.approveLoan(req, res, next); });
router.patch('/payroll/loans/:publicId/reject',         requirePermission(P.LOAN_APPROVE),     validate(rejectLoanSchema), (req, res, next) => { void ctrl.rejectLoan(req, res, next); });

// ── FnF ────────────────────────────────────────────────────────────────────
router.get('/payroll/fnf',                              requirePermission(P.FNF_VIEW),         (req, res, next) => { void ctrl.listFnF(req, res, next); });
router.post('/payroll/fnf/:employeeCode/initiate',      requirePermission(P.FNF_INITIATE),     validate(initiateFnFSchema), (req, res, next) => { void ctrl.initiateFnF(req, res, next); });
router.get('/payroll/fnf/:publicId',                    requirePermission(P.FNF_VIEW),         (req, res, next) => { void ctrl.getFnF(req, res, next); });
router.patch('/payroll/fnf/:publicId/approve',          requirePermission(P.FNF_APPROVE),      (req, res, next) => { void ctrl.approveFnF(req, res, next); });

// ── Accounting Export ──────────────────────────────────────────────────────
router.get('/payroll/accounting/mappings',              requirePermission(P.RUN_VIEW),         (req, res, next) => { void ctrl.getAccountingMappings(req, res, next); });
router.put('/payroll/accounting/mappings',              requirePermission(P.RUN_FINALIZE),     (req, res, next) => { void ctrl.saveAccountingMappings(req, res, next); });
router.post('/payroll/runs/:publicId/accounting-export', requirePermission(P.RUN_FINALIZE),   (req, res, next) => { void ctrl.generateAccountingExport(req, res, next); });

export { router as payrollRouter };
