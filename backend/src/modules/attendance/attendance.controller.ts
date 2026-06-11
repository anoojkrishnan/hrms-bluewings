import { type Request, type Response, type NextFunction } from 'express';
import { AttendanceService } from './attendance.service';
import { success, successList } from '@/shared/utils/response';
import { ExceptionType } from './attendance.types';

export class AttendanceController {
  private readonly service: AttendanceService;

  constructor() {
    this.service = new AttendanceService();
  }

  // ── Punch (ESS self-service) ───────────────────────────────────────────

  punch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, employeePublicId } = req.user;
      const ipAddress = req.ip ?? '';
      const userAgent = req.headers['user-agent'] ?? '';
      const employeeCode = (req.body as { employeeCode?: string }).employeeCode ?? employeePublicId ?? '';
      const log = await this.service.punch(req.body, employeeCode, tenantId, organizationId, ipAddress, userAgent);
      res.status(201).json(success(log));
    } catch (err) { next(err); }
  };

  // ── Admin overrides ────────────────────────────────────────────────────

  manualOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const log = await this.service.manualOverride(req.body, tenantId, organizationId, userId);
      res.json(success(log));
    } catch (err) { next(err); }
  };

  getLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const log = await this.service.getLog(req.params.employeeCode, req.params.date, req.user.tenantId);
      res.json(success(log));
    } catch (err) { next(err); }
  };

  listLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId } = req.user;
      const result = await this.service.listLogs(tenantId, organizationId, req.query as Record<string, unknown>);
      res.json(successList(result.data, result.meta));
    } catch (err) { next(err); }
  };

  // ── Exceptions ────────────────────────────────────────────────────────

  createException = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const { employeeCode, date, exceptionType, reason } = req.body as {
        employeeCode: string; date: string; exceptionType: ExceptionType; reason: string;
      };
      const exc = await this.service.createException(employeeCode, date, exceptionType, reason, tenantId, organizationId, userId);
      res.status(201).json(success(exc));
    } catch (err) { next(err); }
  };

  listExceptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = (req.query.status as string) ?? 'pending';
      const result = await this.service.listExceptions(req.user.tenantId, status, req.query as Record<string, unknown>);
      res.json(successList(result.data, result.meta));
    } catch (err) { next(err); }
  };

  approveException = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const exc = await this.service.approveException(req.params.publicId, tenantId, userId);
      res.json(success(exc));
    } catch (err) { next(err); }
  };

  rejectException = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const { note } = req.body as { note?: string };
      const exc = await this.service.rejectException(req.params.publicId, tenantId, userId, note ?? '');
      res.json(success(exc));
    } catch (err) { next(err); }
  };

  regularize = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const exc = await this.service.regularize(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(exc));
    } catch (err) { next(err); }
  };

  lockDate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const { companyId, date } = req.body as { companyId: string; date: string };
      await this.service.lockDate(tenantId, companyId, date, userId);
      res.json(success({ message: 'Attendance locked.' }));
    } catch (err) { next(err); }
  };

  // ── Shifts ────────────────────────────────────────────────────────────

  createShift = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const shift = await this.service.createShift(req.body, tenantId, organizationId, userId);
      res.status(201).json(success(shift));
    } catch (err) { next(err); }
  };

  listShifts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const shifts = await this.service.listShifts(req.user.tenantId);
      res.json(success(shifts));
    } catch (err) { next(err); }
  };

  updateShift = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const shift = await this.service.updateShift(req.params.publicId, req.body, tenantId, userId);
      res.json(success(shift));
    } catch (err) { next(err); }
  };

  // ── Overtime ──────────────────────────────────────────────────────────────

  submitOvertime = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId, employeePublicId } = req.user;
      const empId = employeePublicId ?? userId;
      const ot = await this.service.submitOvertime(req.body, tenantId, organizationId, empId, userId);
      res.status(201).json(success(ot));
    } catch (err) { next(err); }
  };

  listOvertime = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, permissions, employeePublicId, userId } = req.user;
      const isHr = permissions.includes('attendance.overtime.approve');
      const empId = isHr ? undefined : (employeePublicId ?? userId);
      const records = await this.service.listOvertime(tenantId, empId, req.query.status as string | undefined);
      res.json(success(records));
    } catch (err) { next(err); }
  };

  approveOvertime = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const ot = await this.service.approveOvertime(
        req.params.publicId, req.body.convertToCompOff ?? false, tenantId, organizationId, userId,
      );
      res.json(success(ot));
    } catch (err) { next(err); }
  };

  rejectOvertime = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const ot = await this.service.rejectOvertime(req.params.publicId, req.body.note ?? 'Rejected', tenantId, userId);
      res.json(success(ot));
    } catch (err) { next(err); }
  };

  getCompOffBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, employeePublicId, userId } = req.user;
      const result = await this.service.getCompOffBalance(employeePublicId ?? userId, tenantId);
      res.json(success(result));
    } catch (err) { next(err); }
  };

  // ── Shift Assignments ─────────────────────────────────────────────────────

  assignShift = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, organizationId, userId } = req.user;
      const assignments = await this.service.assignShift(req.params.publicId, req.body, tenantId, organizationId, userId);
      res.status(201).json(success(assignments));
    } catch (err) { next(err); }
  };

  listShiftAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assignments = await this.service.listShiftAssignments(req.params.publicId, req.user.tenantId);
      res.json(success(assignments));
    } catch (err) { next(err); }
  };
}
