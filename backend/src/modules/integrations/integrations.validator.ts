import { z } from 'zod';
import { WEBHOOK_EVENTS } from './integrations.types';

export const createApiClientSchema = z.object({
  body: z.object({
    name:        z.string().min(2).max(100),
    description: z.string().max(500).optional(),
  }),
});

export const createWebhookSchema = z.object({
  body: z.object({
    name:   z.string().min(2).max(100),
    url:    z.string().url('Must be a valid HTTPS URL'),
    secret: z.string().min(8).max(200),
    events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  }),
});

export const updateWebhookSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    name:     z.string().min(2).max(100).optional(),
    url:      z.string().url().optional(),
    secret:   z.string().min(8).max(200).optional(),
    events:   z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});
