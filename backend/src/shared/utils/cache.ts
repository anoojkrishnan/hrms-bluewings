import { getRedisClient } from '@/config/redis';

/**
 * Read from Redis cache; on miss, call fallback and store result.
 * Silently falls back to DB if Redis is unavailable.
 */
export async function tryCache<T>(
  key: string,
  ttl: number,
  fallback: () => Promise<T | null>,
): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const cached = await redis.get(key);
    if (cached !== null) return JSON.parse(cached) as T;
    const value = await fallback();
    if (value !== null && value !== undefined) {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
    }
    return value;
  } catch {
    return fallback();
  }
}

/** Invalidate one or more cache keys. Silently ignores Redis errors. */
export async function invalidateCache(...keys: string[]): Promise<void> {
  try {
    const redis = getRedisClient();
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Redis down — no-op
  }
}
