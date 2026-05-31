import { get, getList, put } from './client';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface User {
  publicId: string;
  email: string;
  name: {
    first: string;
    last: string;
  };
  status: 'active' | 'suspended' | 'pending_verification';
  emailVerifiedAt?: string;
  lastLoginAt?: string;
  mfaEnabled: boolean;
  createdAt: string;
}

// ── API client ────────────────────────────────────────────────────────────────

export const userApi = {
  list: (params?: Record<string, string>) =>
    getList<User>('/users', { params }),

  get: (userId: string) =>
    get<User>(`/users/${userId}`),

  updateStatus: (userId: string, status: 'active' | 'suspended') =>
    put<User>(`/users/${userId}/status`, { status }),
};
