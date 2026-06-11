import { type Request, type Response, type NextFunction } from 'express';
import { LeaveService } from './leave.service';
import { success, successList } from '@/shared/utils/response';
import { AppError } from '@/shared/errors/AppError';

export class LeaveController {
  private readonly service: LeaveService;

  constructor() {
    this.service = new LeaveService();
  }

  // ── Leave Types ────────────────────────────────────────────────────────

  listLeaveTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const types = await this.service.listLeaveTypes(req.user.tenantId);
      res.json(successList(types, { page: 1, limit: types.length, total: types.length, totalPages: 1, hasNext: false, hasPrev: false }));
    } catch (err) { next(err); }
  };

  createLeaveType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const lt = await this.service.createLeaveType(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(lt));
    } catch (err) { next(err); }
  };

  updateLeaveType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const lt = await this.service.updateLeaveType(req.params.publicId, req.body, tenantId, userId);
      res.json(success(lt));
    } catch (err) { next(err); }
  };

  // ── Leave Applications ────────────────────────────────────────────────

  applyLeave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId, employeePublicId } = req.user;
      const body = req.body as { employeeCode?: string; [key: string]: unknown };
      // Fall back to the authenticated user's own employee code when not explicitly provided
      if (!body.employeeCode) {
        if (!employeePublicId) {
          throw new AppError(422, 'EMPLOYEE_NOT_LINKED', 'Your account is not linked to an employee record. Contact HR.');
        }
        body.employeeCode = employeePublicId;
      }
      const app = await this.service.applyLeave(body, tenantId, organizationId, userId);
      res.status(201).json(success(app));
    } catch (err) { next(err); }
  };

  listApplications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, permissions, employeePublicId } = req.user;
      const { employeeId: queryEmployeeId, status, ...query } = req.query as Record<string, string>;
      const isHR = permissions.includes('leave.application.approve');
      // Non-HR users (employees) are scoped to their own applications only
      const scopedEmployeeCode = isHR ? (queryEmployeeId ?? undefined) : (employeePublicId ?? undefined);
      const result = await this.service.listApplications(tenantId, scopedEmployeeCode, status, query);
      res.json(successList(result.data, result.meta));
    } catch (err) { next(err); }
  };

  getApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const app = await this.service.getApplication(req.params.publicId, req.user.tenantId);
      res.json(success(app));
    } catch (err) { next(err); }
  };

  approveLeave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const app = await this.service.approveLeave(req.params.publicId, tenantId, userId);
      res.json(success(app));
    } catch (err) { next(err); }
  };

  rejectLeave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const { reason } = req.body as { reason: string };
      const app = await this.service.rejectLeave(req.params.publicId, tenantId, userId, reason);
      res.json(success(app));
    } catch (err) { next(err); }
  };

  cancelLeave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const app = await this.service.cancelLeave(req.params.publicId, tenantId, userId);
      res.json(success(app));
    } catch (err) { next(err); }
  };

  revokeLeave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const { reason } = req.body as { reason: string };
      const app = await this.service.revokeLeave(req.params.publicId, tenantId, userId, reason);
      res.json(success(app));
    } catch (err) { next(err); }
  };

  // ── Balances ──────────────────────────────────────────────────────────

  getMyBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, employeePublicId } = req.user;
      if (!employeePublicId) {
        res.json(success([]));
        return;
      }
      const balances = await this.service.getBalance(employeePublicId, tenantId);
      res.json(success(balances));
    } catch (err) { next(err); }
  };

  getBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      const balances = await this.service.getBalance(req.params.employeeCode, req.user.tenantId, year);
      res.json(success(balances));
    } catch (err) { next(err); }
  };

  adjustBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      await this.service.adjustBalance(req.params.employeeCode, req.body, tenantId, organizationId, userId);
      res.json(success({ message: 'Balance adjusted.' }));
    } catch (err) { next(err); }
  };

  // ── Calendar ──────────────────────────────────────────────────────────

  getCalendar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const { companyId, month, year } = req.query as Record<string, string>;
      const result = await this.service.getLeaveCalendar(tenantId, companyId, Number(month), Number(year));
      res.json(success(result));
    } catch (err) { next(err); }
  };

  // ── Holidays ──────────────────────────────────────────────────────────

  createHolidayList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const hl = await this.service.createHolidayList(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(hl));
    } catch (err) { next(err); }
  };

  listHolidayLists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { companyId, year } = req.query as Record<string, string>;
      const lists = await this.service.listHolidayLists(req.user.tenantId, companyId, Number(year));
      res.json(success(lists));
    } catch (err) { next(err); }
  };

  createHoliday = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const holiday = await this.service.createHoliday(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(holiday));
    } catch (err) { next(err); }
  };

  listHolidays = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { holidayListId } = req.query as Record<string, string>;
      const holidays = await this.service.listHolidays(req.user.tenantId, holidayListId);
      res.json(success(holidays));
    } catch (err) { next(err); }
  };

  upsertWeekendPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const policy = await this.service.upsertWeekendPolicy(req.body, tenantId, organizationId, userId);
      res.json(success(policy));
    } catch (err) { next(err); }
  };

  initAllBalances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId } = req.user;
      const result = await this.service.initAllBalances(tenantId, organizationId);
      res.json(success(result));
    } catch (err) { next(err); }
  };

  listAllBalances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      const balances = await this.service.listAllBalances(req.user.tenantId, year);
      res.json(success(balances));
    } catch (err) { next(err); }
  };

  bulkAdjustBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const result = await this.service.bulkAdjustBalance(req.body, tenantId, organizationId, userId);
      res.json(success(result));
    } catch (err) { next(err); }
  };
}
