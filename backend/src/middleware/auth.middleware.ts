import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { DataScope } from '@/shared/types/common';
import { tryCache } from '@/shared/utils/cache';
import { RbacService } from '@/modules/rbac/rbac.service';
import { UserService } from '@/modules/user/user.service';
import { UserRepository } from '@/modules/user/user.repository';
import { EmployeeRepository } from '@/modules/employee/employee.repository';

interface JwtPayload {
  userId: string;
  tenantId: string;
  organizationId: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

// Singletons — created once at module load, shared across all requests
const rbacService = new RbacService();
const userService = new UserService();
const userRepo = new UserRepository();
const empRepo = new EmployeeRepository();

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

    // All 4 lookups depend only on JWT payload — fire in parallel
    const [session, userRaw, resolved, linkedEmployee] = await Promise.all([
      tryCache(`session:${payload.sessionId}`, 60, () =>
        userService.findSession(payload.sessionId),
      ),
      tryCache(`user:${payload.userId}`, 120, () =>
        userRepo.findByPublicId(payload.userId),
      ),
      tryCache(`perms:${payload.userId}:${payload.tenantId}:${payload.organizationId}`, 60, () =>
        rbacService.resolvePermissions(payload.userId, payload.tenantId, payload.organizationId),
      ),
      tryCache(`emp:${payload.userId}:${payload.tenantId}`, 120, () =>
        empRepo.findByUserId(payload.userId, payload.tenantId),
      ),
    ]);

    if (!session) {
      throw new AppError(401, ErrorCodes.SESSION_NOT_FOUND, 'Session not found or expired');
    }
    if (!userRaw) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'User not found');
    }

    // After Redis deserialization userRaw is a plain object — access fields directly
    const user = userRaw as { name?: { first?: string; last?: string } };
    const perms = resolved as { roles: string[]; permissions: string[]; dataScope: DataScope } | null;
    const emp = linkedEmployee as { employeeCode?: string } | null;

    req.user = {
      userId: payload.userId,
      firstName: user.name?.first,
      lastName: user.name?.last,
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
      sessionId: payload.sessionId,
      roles: perms?.roles ?? [],
      permissions: perms?.permissions ?? [],
      dataScope: perms?.dataScope ?? DataScope.SELF,
      employeePublicId: emp?.employeeCode,
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
