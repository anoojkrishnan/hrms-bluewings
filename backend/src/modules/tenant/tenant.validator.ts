import { z } from 'zod';
import { slugSchema } from '@/shared/validators/common.schemas';

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
});

export const createTenantSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    slug: slugSchema,
    country: z.string().length(2).default('IN'),
    defaultTimezone: z.string().optional(),
    defaultCurrency: z.string().length(3).optional(),
    defaultLanguage: z.string().length(2).optional(),
    primaryContact: contactSchema,
  }),
});

export const updateTenantSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    primaryContact: contactSchema.partial().optional(),
    billingContact: contactSchema.optional(),
    defaultTimezone: z.string().optional(),
    defaultCurrency: z.string().length(3).optional(),
    defaultLanguage: z.string().length(2).optional(),
    branding: z
      .object({
        logoUrl: z.string().url().optional(),
        primaryColor: z.string().optional(),
        appName: z.string().optional(),
      })
      .optional(),
  }),
});

export const updateTenantSettingsSchema = z.object({
  body: z.object({
    financialYearStart: z.enum(['apr', 'jan']).optional(),
    dateFormat: z.string().optional(),
    workingDaysPerWeek: z.number().int().min(1).max(7).optional(),
    makerCheckerEnabled: z.boolean().optional(),
    mfaRequired: z.boolean().optional(),
    ssoEnabled: z.boolean().optional(),
    ipWhitelistEnabled: z.boolean().optional(),
    ipWhitelist: z.array(z.string().ip()).optional(),
  }),
});

export const slugCheckSchema = z.object({
  query: z.object({
    slug: slugSchema,
  }),
});

export const signupSchema = z.object({
  body: z.object({
    tenantName: z.string().min(2).max(100),
    slug: slugSchema,
    country: z.string().length(2).default('IN'),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number'),
  }),
});
