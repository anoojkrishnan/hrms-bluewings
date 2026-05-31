import { z } from 'zod';
import { DataScope } from '@/shared/types/common';

export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    code: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[a-z0-9_]+$/, 'Code must be lowercase alphanumeric with underscores'),
    dataScope: z.nativeEnum(DataScope),
    description: z.string().optional(),
    permissionCodes: z.array(z.string()).optional(),
  }),
});

export const updateRoleSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    dataScope: z.nativeEnum(DataScope).optional(),
    description: z.string().optional(),
  }),
});

export const setPermissionsSchema = z.object({
  body: z.object({
    permissionCodes: z.array(z.string()).min(0),
  }),
});

export const assignRoleSchema = z.object({
  body: z.object({
    rolePublicId: z.string().min(1),
  }),
});

export const createDelegationSchema = z.object({
  body: z.object({
    delegateeId: z.string().min(1),
    permissionCodes: z.array(z.string()).min(1),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    reason: z.string().optional(),
  }),
});
