import { useEffect } from 'react';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/lib/store/auth.store';

export function useSessionCheck() {
  const { accessToken, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    if (!accessToken) {
      setLoading(false);
      return;
    }

    authApi.me()
      .then((user) => {
        if (!cancelled) setUser(user);
      })
      .catch((err: unknown) => {
        // Only clear the session on explicit auth rejection (401).
        // Network errors or server errors (5xx) should not log the user out —
        // the axios interceptor already calls redirectToLogin() for 401s that
        // can't be refreshed, so we avoid double-clearing here.
        const status = (err as { status?: number })?.status;
        if (!cancelled && status === 401) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [accessToken, setUser, setLoading]);
}
