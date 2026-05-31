import { z } from 'zod';
import { paginationSchema, publicIdParamSchema } from '@/shared/validators/common.schemas';

export const auditListQuerySchema = z.object({
  query: paginationSchema,
});

export const auditByEntitySchema = z.object({
  params: publicIdParamSchema,
});
