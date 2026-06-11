import { get, post, put, del } from './client';

export interface ApiClient {
  publicId:    string;
  name:        string;
  description?: string;
  keyPrefix:   string;
  isActive:    boolean;
  lastUsedAt?: string;
  createdAt:   string;
  rawKey?:     string;
}

export const WEBHOOK_EVENTS = [
  'employee.created', 'employee.updated', 'employee.separated',
  'leave.applied', 'leave.approved', 'leave.rejected',
  'payroll.finalized', 'payroll.payslips_published', 'fnf.approved',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export interface WebhookSubscription {
  publicId:  string;
  name:      string;
  url:       string;
  secret:    string;
  events:    WebhookEvent[];
  isActive:  boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  publicId:       string;
  event:          string;
  success:        boolean;
  responseStatus?: number;
  error?:         string;
  deliveredAt:    string;
}

export const integrationsApi = {
  // API Clients
  listApiClients:   () => get<ApiClient[]>('/integrations/api-clients'),
  createApiClient:  (dto: { name: string; description?: string }) =>
    post<ApiClient>('/integrations/api-clients', dto),
  rotateKey:        (publicId: string) =>
    post<ApiClient>(`/integrations/api-clients/${publicId}/rotate-key`),
  deleteApiClient:  (publicId: string) =>
    del<{ deleted: boolean }>(`/integrations/api-clients/${publicId}`),

  // Webhooks
  listWebhooks:     () => get<WebhookSubscription[]>('/integrations/webhooks'),
  createWebhook:    (dto: { name: string; url: string; secret: string; events: WebhookEvent[] }) =>
    post<WebhookSubscription>('/integrations/webhooks', dto),
  updateWebhook:    (publicId: string, dto: Partial<WebhookSubscription>) =>
    put<WebhookSubscription>(`/integrations/webhooks/${publicId}`, dto),
  deleteWebhook:    (publicId: string) =>
    del<{ deleted: boolean }>(`/integrations/webhooks/${publicId}`),
  listDeliveries:   (publicId: string) =>
    get<WebhookDelivery[]>(`/integrations/webhooks/${publicId}/deliveries`),
  testWebhook:      (publicId: string) =>
    post<{ success: boolean; status?: number; error?: string }>(`/integrations/webhooks/${publicId}/test`),
};
