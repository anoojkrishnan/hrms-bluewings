import { useAuthStore } from '../store/auth.store';
import { authApi } from '../api/auth.api';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { LoginDto } from '@/types/auth.types';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setTokens, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: async (dto: LoginDto) => {
      const loginResult = await authApi.login(dto);
      setTokens(loginResult.accessToken, loginResult.refreshToken);
      const me = await authApi.me();
      setUser(me);
      return me;
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authApi.logout();
      clearAuth();
    },
    onSuccess: () => navigate('/login'),
  });

  return {
    user,
    isAuthenticated,
    isLoading,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
  };
}
