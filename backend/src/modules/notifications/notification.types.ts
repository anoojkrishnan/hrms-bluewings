import type { BaseDocument } from '@/shared/types/common';

export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  READ = 'read',
}

export interface NotificationTemplate extends BaseDocument {
  code: string;
  name: string;
  channels: NotificationChannel[];
  subject?: string;
  bodyHtml?: string;
  bodyText: string;
  variables: string[];
}

export interface Notification extends BaseDocument {
  recipientId: string;
  channel: NotificationChannel;
  templateCode: string;
  subject?: string;
  body: string;
  link?: string;
  status: NotificationStatus;
  readAt?: Date;
  sentAt?: Date;
  retryCount: number;
}

export interface UserNotificationPreference extends BaseDocument {
  userId: string;
  disabledCodes: string[];
}

export interface SendNotificationDto {
  templateCode: string;
  recipientId: string;
  variables: Record<string, string>;
  tenantId: string;
  link?: string;
}

export interface NotificationListQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface CreateTemplateDto {
  code: string;
  name: string;
  channels: NotificationChannel[];
  subject?: string;
  bodyHtml?: string;
  bodyText: string;
  variables: string[];
}

export interface UpdateTemplateDto {
  name?: string;
  channels?: NotificationChannel[];
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  variables?: string[];
}
