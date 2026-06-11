import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';

interface JwtPayload {
  userId: string;
  tenantId: string;
  organizationId: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

function extractToken(req: Request): string | null {
  if (req.cookies?.accessToken) return req.cookies.accessToken as string;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Authentication required');
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET ?? '') as JwtPayload;
    } catch {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid or expired token');
    }

    if (payload.type !== 'access') {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid token type');
    }

    // Lazy import to avoid circular dependency
    const { RbacService } = await import('@/modules/rbac/rbac.service');
    const { UserService } = await import('@/modules/user/user.service');

    const rbacService = new RbacService();
    const userService = new UserService();

    // Validate session is still active
    const session = await userService.findSession(payload.sessionId);
    if (!session) {
      throw new AppError(401, ErrorCodes.SESSION_NOT_FOUND, 'Session not found or expired');
    }

    // Load user
    const userRaw = await (async () => {
      const { UserRepository } = await import('@/modules/user/user.repository');
      const repo = new UserRepository();
      return repo.findByPublicId(payload.userId);
    })();

    if (!userRaw) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'User not found');
    }

    // Resolve permissions
    const resolved = await rbacService.resolvePermissions(
      payload.userId,
      payload.tenantId,
      payload.organizationId,
    );

    // Look up linked employee record (present for ESS users invited via HR)
    const { EmployeeRepository } = await import('@/modules/employee/employee.repository');
    const empRepo = new EmployeeRepository();
    const linkedEmployee = await empRepo.findByUserId(payload.userId, payload.tenantId);

    req.user = {
      userId: payload.userId,
      firstName: userRaw.name?.first,
      lastName: userRaw.name?.last,
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
      sessionId: payload.sessionId,
      roles: resolved.roles,
      permissions: resolved.permissions,
      dataScope: resolved.dataScope,
      // employeePublicId is the employeeCode — used as the external ID in leave/attendance routes
      employeePublicId: linkedEmployee?.employeeCode,
      isImpersonating: false,
    };

    next();
  } catch (err) {
    next(err);
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }
  await requireAuth(req, res, next);
};
