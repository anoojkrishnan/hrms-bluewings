import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    code: z.string().min(1).max(20).toUpperCase(),
    maxAmountPerClaim: z.number().min(0).optional(),
    requiresReceipt: z.boolean().default(false),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    maxAmountPerClaim: z.number().min(0).optional(),
    requiresReceipt: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const createClaimSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    items: z.array(z.object({
      categoryId: z.string().min(1),
      description: z.string().min(1).max(500),
      amount: z.number().min(0),
      date: z.string().datetime(),
    })).min(1),
    notes: z.string().optional(),
  }),
});

export const reviewClaimSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    rejectionReason: z.string().min(5).optional(),
  }),
});
