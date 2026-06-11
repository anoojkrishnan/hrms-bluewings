import { Job } from 'bullmq';
import { BaseWorker } from './base.worker';
import { QUEUE_NAMES } from './worker.registry';
import type { HrmsJob } from '@/jobs/job.types';
import { PayrollService } from '@/modules/payroll/payroll.service';
import { logger as rootLogger } from '@/config/logger';

export interface PayrollProcessingPayload {
  runPublicId: string;
  companyId: string;
}

export class PayrollProcessingWorker extends BaseWorker<PayrollProcessingPayload> {
  private readonly service: PayrollService;

  constructor() {
    super(QUEUE_NAMES.PAYROLL_PROCESSING, { concurrency: 1 });
    this.service = new PayrollService();
  }

  protected async process(
    job: Job<HrmsJob<PayrollProcessingPayload>>,
    log: typeof rootLogger,
  ): Promise<void> {
    const { tenantId, triggeredBy, payload } = job.data;
    const { runPublicId } = payload;

    log.info({ runPublicId }, 'Payroll processing started');

    try {
      await this.service.executeRunAsync(runPublicId, tenantId, triggeredBy, job);
      log.info({ runPublicId }, 'Payroll processing completed');
    } catch (err) {
      log.error({ err, runPublicId }, 'Payroll processing failed — reverting to preview');
      await this.service.markRunFailed(runPublicId, tenantId, String(err));
      throw err;
    }
  }
}
