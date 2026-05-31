import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '@/lib/api/notification.api';
import type { Notification } from '@/lib/api/notification.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationRow({ notification, onMarkRead }: { notification: Notification; onMarkRead: (id: string) => void }) {
  const isUnread = !notification.readAt;
  return (
    <tr
      style={{ cursor: isUnread ? 'pointer' : 'default', background: isUnread ? 'var(--color-background)' : 'transparent' }}
      onClick={() => isUnread && onMarkRead(notification.publicId)}
    >
      <td style={{ width: 40, textAlign: 'center' }}>
        <span style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)' }}>🔔</span>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isUnread && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--color-primary)',
                flexShrink: 0,
                display: 'inline-block',
              }}
              aria-label="Unread"
            />
          )}
          <span style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
            {notification.body}
          </span>
        </div>
        {notification.subject && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {notification.subject}
          </div>
        )}
      </td>
      <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
        {notification.channel}
      </td>
      <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
        {relativeTime(notification.createdAt)}
      </td>
    </tr>
  );
}

export default function NotificationList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page, unreadOnly],
    queryFn: () => notificationApi.list({ page, limit: 20, unreadOnly }),
  });

  const markReadMutation = useMutation({
    mutationFn: (publicId: string) => notificationApi.markRead(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const notifications = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Notifications</h1>
        <div className="page-actions">
          <Button
            variant="secondary"
            onClick={() => { setUnreadOnly((v) => !v); setPage(1); }}
          >
            {unreadOnly ? 'Show All' : 'Unread Only'}
          </Button>
          <Button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            {markAllReadMutation.isPending ? 'Marking...' : 'Mark all read'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <Skeleton height={48} />
          </div>
        ))
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description={unreadOnly ? 'You have no unread notifications.' : 'No notifications yet.'}
        />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Message</th>
                  <th>Channel</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <NotificationRow
                    key={n.publicId}
                    notification={n}
                    onMarkRead={(id) => markReadMutation.mutate(id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost" disabled={!meta.hasPrev} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="pagination-info">Page {meta.page} of {meta.totalPages}</span>
              <button className="btn btn-ghost" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
