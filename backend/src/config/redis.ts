import IORedis from 'ioredis';
import { logger } from './logger';

let redisClient: IORedis | null = null;

export function getRedisClient(): IORedis {
  if (!redisClient) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return redisClient;
}

export async function connectRedis(url?: string): Promise<IORedis> {
  const redisUrl = url ?? process.env.REDIS_URL ?? 'redis://localhost:6379';

  redisClient = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('error', (err: Error) => logger.error({ err }, 'Redis error'));
  redisClient.on('close', () => logger.warn('Redis connection closed'));

  await redisClient.connect();
  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
