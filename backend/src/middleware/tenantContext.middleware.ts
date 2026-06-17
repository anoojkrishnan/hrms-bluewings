import { Request, Response, NextFunction } from 'express';
import { TenantService } from '@/modules/tenant/tenant.service';
import { tryCache } from '@/shared/utils/cache';
import { getRedisClient } from '@/config/redis';

// Singleton — created once at module load
const tenantService = new TenantService();

async function validateTenantActiveCached(tenantId: string): Promise<void> {
  const key = `tenant:active:${tenantId}`;
  try {
    const redis = getRedisClient();
    const cached = await redis.get(key);
    if (cached === '1') return;
  } catch {
    // Redis down — fall through to DB
  }
  // Not cached: validate from DB (throws AppError if suspended/archived)
  await tenantService.validateTenantActive(tenantId);
  try {
    const redis = getRedisClient();
    await redis.set(key, '1', 'EX', 30);
  } catch {
    // Cache write failure — acceptable, next request will re-validate
  }
}

export const requireTenantContext = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { tenantId } = req.user;

    // Run tenant validation and settings fetch in parallel
    const [, settings] = await Promise.all([
      validateTenantActiveCached(tenantId),
      tryCache(`tenant:settings:${tenantId}`, 300, () =>
        tenantService.getSettings(tenantId).catch(() => null),
      ),
    ]);

    if (settings) req.tenantSettings = settings;
    next();
  } catch (err) {
    next(err);
  }
};
