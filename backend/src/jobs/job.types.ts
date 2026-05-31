export interface HrmsJob<T = unknown> {
  tenantId: string;
  organizationId: string;
  triggeredBy: string;
  correlationId: string;
  payload: T;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'retried';

export interface JobResult {
  jobId: string;
  status: JobStatus;
  progress?: number;
  result?: unknown;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
