export interface ApiClient {
  _id?:          unknown;
  publicId:      string;
  tenantId:      string;
  organizationId?: string;
  name:          string;
  description?:  string;
  keyHash:       string;
  keyPrefix:     string;
  isActive:      boolean;
  lastUsedAt?:   Date;
  createdBy:     string;
  updatedBy:     string;
  deletedAt:     Date | null;
  createdAt?:    Date;
  updatedAt?:    Date;
}

export const WEBHOOK_EVENTS = [
  'employee.created',
  'employee.updated',
  'employee.separated',
  'leave.applied',
  'leave.approved',
  'leave.rejected',
  'payroll.finalized',
  'payroll.payslips_published',
  'fnf.approved',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export interface WebhookSubscription {
  _id?:          unknown;
  publicId:      string;
  tenantId:      string;
  organizationId?: string;
  name:          string;
  url:           string;
  secret:        string;
  events:        WebhookEvent[];
  isActive:      boolean;
  createdBy:     string;
  updatedBy:     string;
  deletedAt:     Date | null;
  createdAt?:    Date;
  updatedAt?:    Date;
}

export interface WebhookDelivery {
  publicId:       string;
  tenantId:       string;
  webhookId:      string;
  event:          WebhookEvent;
  payload:        Record<string, unknown>;
  responseStatus?: number;
  responseBody?:  string;
  durationMs?:    number;
  success:        boolean;
  error?:         string;
  deliveredAt:    Date;
}

export interface CreateApiClientDto { name: string; description?: string }
export interface CreateWebhookDto   { name: string; url: string; secret: string; events: WebhookEvent[] }
export interface UpdateWebhookDto   { name?: string; url?: string; secret?: string; events?: WebhookEvent[]; isActive?: boolean }
