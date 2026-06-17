import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const publicIdParamSchema = z.object({
  publicId: z.string().min(1),
});

export const dateRangeSchema = z
  .object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  })
  .refine((d) => new Date(d.startDate) <= new Date(d.endDate), {
    message: 'startDate must be before or equal to endDate',
  });

export const slugSchema = z
  .string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only');

const requestSchema = z.object({
  body: z.unknown().optional(),
  query: z.unknown().optional(),
  params: z.unknown().optional(),
});

export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      const formErrors: string[] = [];
      for (const issue of result.error.issues) {
        const parts = issue.path.slice(1); // strip leading 'body'/'query'/'params' wrapper
        if (parts.length === 0) {
          formErrors.push(issue.message);
        } else {
          const key = parts.join('.');
          if (!fieldErrors[key]) fieldErrors[key] = [];
          fieldErrors[key].push(issue.message);
        }
      }
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        { fieldErrors, formErrors },
      );
    }

    const parsed = result.data as z.infer<typeof requestSchema>;
    if (parsed.body !== undefined) req.body = parsed.body;

    next();
  };
