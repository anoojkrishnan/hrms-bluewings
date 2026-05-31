import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Toast } from '@/types/common.types';

interface UiState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toasts: Toast[];
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      sidebarOpen: true,
      toasts: [],

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        set({ theme: next });
      },

      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      addToast: (toast) => {
        const id = crypto.randomUUID();
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        const duration = toast.duration ?? 4000;
        setTimeout(() => get().removeToast(id), duration);
      },

      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'hrms-ui',
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
