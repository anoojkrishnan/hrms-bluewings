import { Request, Response, NextFunction } from 'express';

export const requireTenantContext = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { TenantService } = await import('@/modules/tenant/tenant.service');
    const tenantService = new TenantService();

    await tenantService.validateTenantActive(req.user.tenantId);

    const settings = await tenantService.getSettings(req.user.tenantId).catch(() => null);
    if (settings) {
      req.tenantSettings = settings;
    }

    next();
  } catch (err) {
    next(err);
  }
};
