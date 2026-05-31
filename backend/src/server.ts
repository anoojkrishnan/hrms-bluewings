import 'dotenv/config';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { logger } from './config/logger';

const PORT = parseInt(process.env.PORT ?? '4000', 10);
const SHUTDOWN_TIMEOUT_MS = 10_000;

async function bootstrap(): Promise<void> {
  // Connect infrastructure
  await connectDatabase();
  await connectRedis();

  // Seed system permissions (idempotent) — must run after DB is connected
  const { rbacService } = await import('./modules/rbac/rbac.service');
  await rbacService.seedSystemPermissions();

  // Re-sync system role permissions for all existing tenants so new permission
  // codes added in later phases are applied without requiring re-signup
  const { TenantRepository } = await import('./modules/tenant/tenant.repository');
  const tenantRepo = new TenantRepository();
  const activeTenants = await tenantRepo.findAllActive();
  await Promise.all(
    activeTenants.map((t) => rbacService.seedSystemRoles(t.publicId, 'system').catch(() => {})),
  );

  const app = createApp();

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'HRMS server listening');
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(async () => {
      try {
        await disconnectDatabase();
        await disconnectRedis();
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });
}

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
