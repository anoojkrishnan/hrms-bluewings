import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { UserService } from '@/modules/user/user.service';
import { success } from '@/shared/utils/response';

const COOKIE_OPTS_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

export class AuthController {
  private readonly authService: AuthService;

  constructor() {
    this.authService = new AuthService(new UserService());
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ipAddress = (req.ip ?? req.socket.remoteAddress) as string;
      const userAgent = req.headers['user-agent'] ?? '';
      const result = await this.authService.login(req.body, ipAddress, userAgent);

      res.cookie('accessToken', result.accessToken, {
        ...COOKIE_OPTS_BASE,
        maxAge: result.expiresIn * 1000,
      });
      res.cookie('refreshToken', result.refreshToken, {
        ...COOKIE_OPTS_BASE,
        path: '/api/v1/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json(success({
        userId: result.userId,
        tenantId: result.tenantId,
        organizationId: result.organizationId,
        expiresIn: result.expiresIn,
      }));
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ipAddress = (req.ip ?? req.socket.remoteAddress) as string;
      const userAgent = req.headers['user-agent'] ?? '';
      await this.authService.logout(req.user.sessionId, req.user.userId, req.user.tenantId, ipAddress, userAgent);
      res.clearCookie('accessToken', COOKIE_OPTS_BASE);
      res.clearCookie('refreshToken', { ...COOKIE_OPTS_BASE, path: '/api/v1/auth/refresh' });
      res.json(success({ message: 'Logged out successfully' }));
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.refreshToken as string | undefined;
      if (!refreshToken) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Refresh token required' } });
        return;
      }
      const ipAddress = (req.ip ?? req.socket.remoteAddress) as string;
      const userAgent = req.headers['user-agent'] ?? '';
      const tokens = await this.authService.refresh(refreshToken, ipAddress, userAgent);

      res.cookie('accessToken', tokens.accessToken, {
        ...COOKIE_OPTS_BASE,
        maxAge: tokens.expiresIn * 1000,
      });
      res.cookie('refreshToken', tokens.refreshToken, {
        ...COOKIE_OPTS_BASE,
        path: '/api/v1/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json(success({ expiresIn: tokens.expiresIn }));
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.forgotPassword(req.body.email);
      // Always success to prevent email enumeration
      res.json(success({ message: 'If that email exists, a reset link has been sent.' }));
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.resetPassword(req.body.token, req.body.newPassword);
      res.clearCookie('accessToken', COOKIE_OPTS_BASE);
      res.clearCookie('refreshToken', { ...COOKIE_OPTS_BASE, path: '/api/v1/auth/refresh' });
      res.json(success({ message: 'Password reset successfully. Please log in again.' }));
    } catch (err) {
      next(err);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserService } = await import('@/modules/user/user.service');
      const userService = new UserService();
      await userService.verifyEmail(req.body.token);
      res.json(success({ message: 'Email verified successfully. You can now log in.' }));
    } catch (err) {
      next(err);
    }
  };

  setupMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserService } = await import('@/modules/user/user.service');
      const userService = new UserService();
      const result = await userService.setupMfa(req.user.userId, req.user.tenantId);
      res.json(success(result));
    } catch (err) {
      next(err);
    }
  };

  verifyMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserService } = await import('@/modules/user/user.service');
      const userService = new UserService();
      const valid = await userService.verifyMfa(req.user.userId, req.body.totpToken);
      if (!valid) {
        res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid MFA token' } });
        return;
      }
      res.json(success({ message: 'MFA verified successfully.' }));
    } catch (err) {
      next(err);
    }
  };

  me = (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.json(success({
        userId: req.user.userId,
        employeePublicId: req.user.employeePublicId,
        tenantId: req.user.tenantId,
        organizationId: req.user.organizationId,
        sessionId: req.user.sessionId,
        roles: req.user.roles,
        permissions: req.user.permissions,
        dataScope: req.user.dataScope,
      }));
    } catch (err) {
      next(err);
    }
  };

  getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserService } = await import('@/modules/user/user.service');
      const userService = new UserService();
      const sessions = await userService.listSessions(req.user.userId, req.user.tenantId);
      res.json(success(sessions));
    } catch (err) {
      next(err);
    }
  };

  deleteSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserService } = await import('@/modules/user/user.service');
      const userService = new UserService();
      await userService.revokeSession(req.params.sessionId, req.user.userId);
      res.json(success({ message: 'Session revoked.' }));
    } catch (err) {
      next(err);
    }
  };

  deleteAllSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { UserService } = await import('@/modules/user/user.service');
      const userService = new UserService();
      await userService.revokeAllSessions(req.user.userId, req.user.tenantId);
      res.clearCookie('accessToken', COOKIE_OPTS_BASE);
      res.clearCookie('refreshToken', { ...COOKIE_OPTS_BASE, path: '/api/v1/auth/refresh' });
      res.json(success({ message: 'All sessions revoked.' }));
    } catch (err) {
      next(err);
    }
  };
}
