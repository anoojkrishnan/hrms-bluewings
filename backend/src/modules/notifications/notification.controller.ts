import { type Request, type Response, type NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { success, successList } from '@/shared/utils/response';
import { buildPaginationOptions } from '@/shared/utils/pagination';

export class NotificationController {
  private readonly service: NotificationService;

  constructor() {
    this.service = new NotificationService();
  }

  // ── Notification inbox ─────────────────────────────────────────────────

  listNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const rawQuery = req.query as Record<string, string>;
      const { page, limit } = buildPaginationOptions(rawQuery);
      const unreadOnly = rawQuery.unreadOnly === 'true';
      const result = await this.service.listNotifications(userId, tenantId, { page, limit, unreadOnly });
      res.json(successList(result.data, result.meta));
    } catch (err) { next(err); }
  };

  getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const count = await this.service.countUnread(userId, tenantId);
      res.json(success({ count }));
    } catch (err) { next(err); }
  };

  markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      await this.service.markRead(req.params.publicId, userId, tenantId);
      res.json(success({ marked: true }));
    } catch (err) { next(err); }
  };

  markAllRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const count = await this.service.markAllRead(userId, tenantId);
      res.json(success({ marked: count }));
    } catch (err) { next(err); }
  };

  // ── Preferences ────────────────────────────────────────────────────────

  getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const prefs = await this.service.getPreferences(userId, tenantId);
      res.json(success(prefs ?? { disabledCodes: [] }));
    } catch (err) { next(err); }
  };

  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const { disabledCodes } = req.body as { disabledCodes: string[] };
      const prefs = await this.service.updatePreferences(userId, tenantId, disabledCodes, userId);
      res.json(success(prefs));
    } catch (err) { next(err); }
  };

  // ── Templates (HR Admin) ───────────────────────────────────────────────

  listTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.user;
      const rawQuery = req.query as Record<string, string>;
      const { page, limit } = buildPaginationOptions(rawQuery);
      const result = await this.service.listTemplates(tenantId, page, limit);
      res.json(successList(result.data, result.meta));
    } catch (err) { next(err); }
  };

  createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const template = await this.service.createTemplate(req.body, tenantId, userId);
      res.status(201).json(success(template));
    } catch (err) { next(err); }
  };

  updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.user;
      const template = await this.service.updateTemplate(req.params.publicId, req.body, tenantId, userId);
      res.json(success(template));
    } catch (err) { next(err); }
  };
}
