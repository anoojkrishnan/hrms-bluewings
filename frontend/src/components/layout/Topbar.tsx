import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '@/lib/store/ui.store';
import { useAuth } from '@/lib/hooks/useAuth';
import { notificationApi } from '@/lib/api/notification.api';
import { ROUTES } from '@/router/routes';
import styles from './Topbar.module.css';

export function Topbar() {
  const { toggleTheme, theme, setSidebarOpen, sidebarOpen } = useUiStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: notificationApi.getUnreadCount,
    refetchInterval: 60_000,
    enabled: !!user,
  });

  const unreadCount = unreadData?.count ?? 0;
  const initials = user
    ? (user.firstName ? user.firstName.charAt(0) : '') + (user.lastName ? user.lastName.charAt(0) : '') || user.userId.slice(0, 2)
    : 'U';
  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.userId.slice(0, 12)
    : '';

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          className={styles.menuBtn}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
      </div>

      <div className={styles.right}>
        <button
          className={styles.iconBtn}
          onClick={() => navigate(ROUTES.NOTIFICATIONS)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
        >
          🔔
          {unreadCount > 0 && (
            <span className={styles.badge}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <button
          className={styles.iconBtn}
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <div className={styles.sep} />

        {user && (
          <div className={styles.userChip}>
            <div className={styles.avatar}>{initials}</div>
            <span className={styles.userName}>{displayName}</span>
            <button
              className={styles.logoutBtn}
              onClick={() => logout()}
              aria-label="Sign out"
              title="Sign out"
            >
              ⏏
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
