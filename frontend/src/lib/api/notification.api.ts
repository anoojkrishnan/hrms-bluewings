import { get, getList, patch, put } from './client';

export interface Notification {
  publicId: string;
  channel: string;
  templateCode: string;
  subject?: string;
  body: string;
  link?: string;
  status: string;
  readAt?: string;
  sentAt?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  disabledCodes: string[];
}

export const notificationApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    getList<Notification>('/notifications', { params }),

  getUnreadCount: () =>
    get<{ count: number }>('/notifications/unread-count'),

  markRead: (publicId: string) =>
    patch<void>(`/notifications/${publicId}/read`),

  markAllRead: () =>
    patch<void>('/notifications/read-all'),

  getPreferences: () =>
    get<NotificationPreferences>('/notification-preferences'),

  updatePreferences: (data: { disabledCodes: string[] }) =>
    put<NotificationPreferences>('/notification-preferences', data),
};
