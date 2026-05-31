import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';

export const requirePermission =
  (permissionCode: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user?.permissions?.includes(permissionCode)) {
      throw new AppError(
        403,
        ErrorCodes.PERMISSION_DENIED,
        'You do not have access to perform this action',
      );
    }
    next();
  };

export const requireAnyPermission =
  (...codes: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const hasAny = codes.some((code) => req.user?.permissions?.includes(code));
    if (!hasAny) {
      throw new AppError(
        403,
        ErrorCodes.PERMISSION_DENIED,
        'You do not have access to perform this action',
      );
    }
    next();
  };

export const requireAllPermissions =
  (...codes: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const hasAll = codes.every((code) => req.user?.permissions?.includes(code));
    if (!hasAll) {
      throw new AppError(
        403,
        ErrorCodes.PERMISSION_DENIED,
        'You do not have access to perform this action',
      );
    }
    next();
  };
