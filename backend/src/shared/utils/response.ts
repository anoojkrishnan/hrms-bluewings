import type { PaginationMeta } from '@/shared/types/common';

export const success = <T>(data: T) => ({ success: true as const, data });

export const successList = <T>(data: T[], meta: PaginationMeta) => ({
  success: true as const,
  data,
  meta,
});

export const successAsync = (jobId: string) => ({
  success: true as const,
  data: { jobId, status: 'queued' as const },
});

export const errorResponse = (code: string, message: string, details?: unknown) => ({
  success: false as const,
  error: {
    code,
    message,
    ...(details !== undefined && { details }),
  },
});
