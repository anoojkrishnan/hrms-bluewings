import { post, del, get } from './client';
import type { AuthUser, LoginDto, LoginResponse } from '@/types/auth.types';

export const authApi = {
  me: () => get<AuthUser>('/auth/me'),
  login: (dto: LoginDto) => post<LoginResponse>('/auth/login', dto),
  logout: () => post<{ message: string }>('/auth/logout'),
  refresh: () => post<{ expiresIn: number }>('/auth/refresh'),
  forgotPassword: (email: string) => post<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    post<{ message: string }>('/auth/reset-password', { token, newPassword }),
  verifyEmail: (token: string) => post<{ message: string }>('/auth/verify-email', { token }),
  setupMfa: () => post<{ qrCodeUrl: string; secret: string }>('/auth/mfa/setup'),
  verifyMfa: (totpToken: string) => post<{ message: string }>('/auth/mfa/verify', { totpToken }),
  getSessions: () => get<unknown[]>('/auth/sessions'),
  deleteSession: (sessionId: string) => del<{ message: string }>(`/auth/sessions/${sessionId}`),
  deleteAllSessions: () => del<{ message: string }>('/auth/sessions'),
};
