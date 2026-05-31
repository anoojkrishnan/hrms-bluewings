import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { success, successList } from '@/shared/utils/response';

export class UserController {
  constructor(private readonly service: UserService) {}

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.findByPublicId(req.user.userId, req.user.tenantId);
      res.status(200).json(success(user));
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.updateProfile(
        req.user.userId,
        req.user.tenantId,
        req.body,
        req.user.userId,
        req.ip ?? '',
        req.get('user-agent') ?? '',
        req.requestId,
      );
      res.status(200).json(success(user));
    } catch (err) {
      next(err);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };
      await this.service.changePassword(
        req.user.userId,
        req.user.tenantId,
        currentPassword,
        newPassword,
        req.ip ?? '',
        req.get('user-agent') ?? '',
      );
      res.status(200).json(success({ message: 'Password changed successfully' }));
    } catch (err) {
      next(err);
    }
  };

  listSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessions = await this.service.listSessions(req.user.userId, req.user.tenantId);
      res.status(200).json(success(sessions));
    } catch (err) {
      next(err);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.query as { token: string };
      await this.service.verifyEmail(token);
      res.status(200).json(success({ message: 'Email verified successfully' }));
    } catch (err) {
      next(err);
    }
  };

  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Math.min(Number(req.query.limit ?? 20), 100);
      const result = await this.service.listUsers(req.user.tenantId, page, limit);
      res.json(successList(result.data, result.meta));
    } catch (err) { next(err); }
  };

  updateUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.body as { status: string };
      const updated = await this.service.updateUserStatus(req.params.userId, req.user.tenantId, status as import('./user.types').UserStatus, req.user.userId);
      res.json(success(updated));
    } catch (err) { next(err); }
  };
}
