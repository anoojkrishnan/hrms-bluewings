import { z } from 'zod';
import { NotificationChannel } from './notification.types';

export const listNotificationsSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
    unreadOnly: z.enum(['true', 'false']).optional(),
  }),
});

export const updatePreferencesSchema = z.object({
  body: z.object({
    disabledCodes: z.array(z.string()),
  }),
});

export const createTemplateSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Code must be lowercase alphanumeric with underscores'),
    name: z.string().min(1).max(200),
    channels: z.array(z.nativeEnum(NotificationChannel)).min(1),
    subject: z.string().min(1).max(500).optional(),
    bodyHtml: z.string().optional(),
    bodyText: z.string().min(1),
    variables: z.array(z.string()),
  }),
});

export const updateTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    channels: z.array(z.nativeEnum(NotificationChannel)).min(1).optional(),
    subject: z.string().min(1).max(500).optional(),
    bodyHtml: z.string().optional(),
    bodyText: z.string().min(1).optional(),
    variables: z.array(z.string()).optional(),
  }),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>['query'];
export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>['body'];
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>['body'];
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>['body'];
