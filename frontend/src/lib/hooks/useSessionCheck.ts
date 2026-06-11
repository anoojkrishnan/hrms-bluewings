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
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [accessToken, setUser, setLoading]);
}
