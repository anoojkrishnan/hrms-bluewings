import { Worker, Job, WorkerOptions } from 'bullmq';
import { logger } from '@/config/logger';
import type { HrmsJob } from '@/jobs/job.types';
import type { QueueName } from './worker.registry';

export abstract class BaseWorker<T = unknown> {
  protected readonly worker: Worker;

  constructor(queueName: QueueName, opts?: Partial<WorkerOptions>) {
    const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };

    this.worker = new Worker(
      queueName,
      async (job: Job<HrmsJob<T>>) => {
        const { tenantId, correlationId } = job.data;
        const childLogger = logger.child({ jobId: job.id, queueName, tenantId, correlationId });

        try {
          childLogger.info('Job started');
          await this.process(job, childLogger);
          childLogger.info('Job completed');
        } catch (err) {
          childLogger.error({ err }, 'Job failed');
          throw err;
        }
      },
      {
        connection,
        concurrency: 5,
        ...opts,
      },
    );

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, queueName, err }, 'Worker job failed permanently');
    });
  }

  protected abstract process(job: Job<HrmsJob<T>>, log: typeof logger): Promise<void>;

  async close(): Promise<void> {
    await this.worker.close();
  }
}
