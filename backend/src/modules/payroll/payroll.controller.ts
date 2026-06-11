import { type Request, type Response, type NextFunction } from 'express';
import { PayrollService } from './payroll.service';
import { success, successList } from '@/shared/utils/response';

export class PayrollController {
  private readonly service = new PayrollService();

  // ── Salary Components ────────────────────────────────────────────────────

  listComponents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.listComponents(req.user.tenantId);
      res.json(success(data));
    } catch (err) { next(err); }
  };

  createComponent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const component = await this.service.createComponent(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(component));
    } catch (err) { next(err); }
  };

  updateComponent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const updated = await this.service.updateComponent(req.params.publicId, req.body, tenantId, userId);
      res.json(success(updated));
    } catch (err) { next(err); }
  };

  deleteComponent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      await this.service.deleteComponent(req.params.publicId, tenantId, userId);
      res.json(success({ message: 'Component deleted' }));
    } catch (err) { next(err); }
  };

  // ── Salary Structures ────────────────────────────────────────────────────

  listStructures = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.listStructures(req.user.tenantId);
      res.json(success(data));
    } catch (err) { next(err); }
  };

  getStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const s = await this.service.getStructure(req.params.publicId, req.user.tenantId);
      res.json(success(s));
    } catch (err) { next(err); }
  };

  createStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const structure = await this.service.createStructure(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(structure));
    } catch (err) { next(err); }
  };

  updateStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const updated = await this.service.updateStructure(req.params.publicId, req.body, tenantId, userId);
      res.json(success(updated));
    } catch (err) { next(err); }
  };

  // ── Employee Salary ──────────────────────────────────────────────────────

  getEmployeeSalary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getEmployeeSalary(req.params.employeeCode, req.user.tenantId);
      res.json(success(data));
    } catch (err) { next(err); }
  };

  assignSalary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const assignment = await this.service.assignSalary(req.params.employeeCode, req.body, tenantId, organizationId, userId);
      res.json(success(assignment));
    } catch (err) { next(err); }
  };

  reviseSalary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const assignment = await this.service.reviseSalary(req.params.employeeCode, req.body, tenantId, organizationId, userId);
      res.json(success(assignment));
    } catch (err) { next(err); }
  };

  // ── Payroll Cycles ───────────────────────────────────────────────────────

  listCycles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { companyId } = req.query as Record<string, string>;
      const data = await this.service.listCycles(req.user.tenantId, companyId);
      res.json(success(data));
    } catch (err) { next(err); }
  };

  createCycle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const cycle = await this.service.createCycle(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(cycle));
    } catch (err) { next(err); }
  };

  updateCycle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const updated = await this.service.updateCycle(req.params.publicId, req.body, tenantId, userId);
      res.json(success(updated));
    } catch (err) { next(err); }
  };

  // ── Payroll Runs ─────────────────────────────────────────────────────────

  listRuns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const { companyId, ...query } = req.query as Record<string, unknown>;
      const result = await this.service.listRuns(tenantId, String(companyId ?? ''), query);
      res.json(successList(result.data, result.meta));
    } catch (err) { next(err); }
  };

  createRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const run = await this.service.createRun(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(run));
    } catch (err) { next(err); }
  };

  getRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const run = await this.service.getRun(req.params.publicId, req.user.tenantId);
      res.json(success(run));
    } catch (err) { next(err); }
  };

  previewRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const run = await this.service.previewRun(req.params.publicId, tenantId, userId);
      res.json(success(run));
    } catch (err) { next(err); }
  };

  processRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const result = await this.service.processRun(req.params.publicId, tenantId, organizationId, userId);
      res.status(202).json(success(result));
    } catch (err) { next(err); }
  };

  approveRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const run = await this.service.approveRun(req.params.publicId, tenantId, userId);
      res.json(success(run));
    } catch (err) { next(err); }
  };

  finalizeRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const run = await this.service.finalizeRun(req.params.publicId, tenantId, userId);
      res.json(success(run));
    } catch (err) { next(err); }
  };

  publishPayslips = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const run = await this.service.publishPayslips(req.params.publicId, tenantId, userId);
      res.json(success(run));
    } catch (err) { next(err); }
  };

  rollbackRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const run = await this.service.rollbackRun(req.params.publicId, req.body, tenantId, userId);
      res.json(success(run));
    } catch (err) { next(err); }
  };

  getRunItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await this.service.getRunItems(req.params.publicId, req.user.tenantId);
      res.json(success(items));
    } catch (err) { next(err); }
  };

  // ── Payroll Inputs ───────────────────────────────────────────────────────

  getInputs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const inputs = await this.service.getInputs(req.params.runPublicId, req.user.tenantId);
      res.json(success(inputs));
    } catch (err) { next(err); }
  };

  upsertInputs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      await this.service.upsertInputs(req.params.runPublicId, req.body, tenantId, organizationId, userId);
      res.json(success({ message: 'Inputs saved' }));
    } catch (err) { next(err); }
  };

  // ── Payslips ─────────────────────────────────────────────────────────────

  listPayslips = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId, permissions, employeePublicId } = req.user;
      const result = await this.service.listPayslips(tenantId, userId, permissions, req.query as Record<string, unknown>, employeePublicId);
      res.json(successList(result.data, result.meta));
    } catch (err) { next(err); }
  };

  getPayslip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId, permissions, employeePublicId } = req.user;
      const payslip = await this.service.getPayslip(req.params.publicId, tenantId, userId, permissions, employeePublicId);
      res.json(success(payslip));
    } catch (err) { next(err); }
  };

  // ── Statutory Settings ───────────────────────────────────────────────────

  getStatutorySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { companyId } = req.query as Record<string, string>;
      const settings = await this.service.getStatutorySettings(companyId ?? '', req.user.tenantId);
      res.json(success(settings));
    } catch (err) { next(err); }
  };

  upsertStatutorySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const { companyId } = req.query as Record<string, string>;
      const settings = await this.service.upsertStatutorySettings(companyId ?? '', req.body, tenantId, organizationId, userId);
      res.json(success(settings));
    } catch (err) { next(err); }
  };

  // ── Bank File ─────────────────────────────────────────────────────────────

  generateBankFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rows = await this.service.generateBankFile(req.params.publicId, req.user.tenantId);
      res.json(success(rows));
    } catch (err) { next(err); }
  };

  // ── Reports ───────────────────────────────────────────────────────────────

  salaryRegister = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { companyId, month, year } = req.query as Record<string, string>;
      const rows = await this.service.salaryRegister(
        req.user.tenantId, companyId ?? '', Number(month), Number(year),
      );
      res.json(success(rows));
    } catch (err) { next(err); }
  };

  payoutRegister = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { runPublicId } = req.query as Record<string, string>;
      const rows = await this.service.payoutRegister(req.user.tenantId, runPublicId ?? '');
      res.json(success(rows));
    } catch (err) { next(err); }
  };

  // ── Loans ─────────────────────────────────────────────────────────────────

  requestLoan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId, employeePublicId } = req.user;
      const empId = employeePublicId ?? userId;
      const loan = await this.service.requestLoan(req.body, tenantId, organizationId, empId, userId);
      res.status(201).json(success(loan));
    } catch (err) { next(err); }
  };

  getMyLoans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId, employeePublicId, permissions } = req.user;
      const isHr = permissions.includes('payroll.loan.approve');
      const loans = isHr
        ? await this.service.getAllLoans(tenantId, req.query.status as string | undefined)
        : await this.service.getLoansForEmployee(employeePublicId ?? userId, tenantId);
      res.json(success(loans));
    } catch (err) { next(err); }
  };

  getLoan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const loan = await this.service.getLoanByPublicId(req.params.publicId, req.user.tenantId);
      res.json(success(loan));
    } catch (err) { next(err); }
  };

  approveLoan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const loan = await this.service.approveLoan(req.params.publicId, req.user.tenantId, req.user.userId);
      res.json(success(loan));
    } catch (err) { next(err); }
  };

  rejectLoan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const loan = await this.service.rejectLoan(req.params.publicId, req.body.rejectionReason, req.user.tenantId, req.user.userId);
      res.json(success(loan));
    } catch (err) { next(err); }
  };

  getLoanSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schedule = await this.service.getLoanSchedule(req.params.publicId, req.user.tenantId);
      res.json(success(schedule));
    } catch (err) { next(err); }
  };

  // ── FnF ───────────────────────────────────────────────────────────────────

  listFnF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const settlements = await this.service.listFnF(req.user.tenantId);
      res.json(success(settlements));
    } catch (err) { next(err); }
  };

  initiateFnF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const fnf = await this.service.initiateFnF(req.params.employeeCode, req.body, tenantId, organizationId, userId);
      res.status(201).json(success(fnf));
    } catch (err) { next(err); }
  };

  getFnF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fnf = await this.service.getFnF(req.params.publicId, req.user.tenantId);
      res.json(success(fnf));
    } catch (err) { next(err); }
  };

  approveFnF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const fnf = await this.service.approveFnF(req.params.publicId, req.user.tenantId, req.user.userId);
      res.json(success(fnf));
    } catch (err) { next(err); }
  };

  // ── Accounting ────────────────────────────────────────────────────────────

  getAccountingMappings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { companyId } = req.query as Record<string, string>;
      const data = await this.service.getAccountingMappings(companyId ?? '', req.user.tenantId);
      res.json(success(data));
    } catch (err) { next(err); }
  };

  saveAccountingMappings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.saveAccountingMappings(req.body, req.user.tenantId, req.user.userId);
      res.json(success(data));
    } catch (err) { next(err); }
  };

  generateAccountingExport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rows = await this.service.generateAccountingExport(req.params.publicId, req.user.tenantId, req.user.userId);
      if (req.query.format === 'csv') {
        const headers = ['date', 'description', 'glAccount', 'glDescription', 'debit', 'credit', 'costCentre', 'employeeCode'];
        const csv = [
          headers.join(','),
          ...rows.map(r => headers.map(h => JSON.stringify(r[h as keyof typeof r] ?? '')).join(',')),
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="jv-${req.params.publicId}.csv"`);
        res.send(csv);
      } else {
        res.json(success(rows));
      }
    } catch (err) { next(err); }
  };
}
