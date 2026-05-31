import { Request, Response, NextFunction } from 'express';

export const requireOrgContext = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Org context is derived from req.user.organizationId (set by auth middleware).
    // In Phase 1, validation is done at auth time. Future: validate org is active.
    if (!req.user?.organizationId) {
      const { AppError } = await import('@/shared/errors/AppError');
      const { ErrorCodes } = await import('@/shared/errors/errorCodes');
      throw new AppError(403, ErrorCodes.ORGANIZATION_NOT_FOUND, 'Organization context required');
    }
    next();
  } catch (err) {
    next(err);
  }
};
