import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types/auth.types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  activeOrganizationId: string | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setActiveOrganizationId: (orgId: string) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      activeOrganizationId: null,
      isLoading: true,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: user !== null,
          activeOrganizationId: user?.organizationId ?? null,
        }),

      setActiveOrganizationId: (orgId) => {
        localStorage.setItem('hrms_active_org', orgId);
        set({ activeOrganizationId: orgId });
      },

      setLoading: (isLoading) => set({ isLoading }),

      clearAuth: () => {
        localStorage.removeItem('hrms_active_org');
        set({ user: null, isAuthenticated: false, activeOrganizationId: null });
      },
    }),
    {
      name: 'hrms-auth',
      // Only persist activeOrganizationId — never tokens
      partialize: (state) => ({
        activeOrganizationId: state.activeOrganizationId,
      }),
    },
  ),
);
