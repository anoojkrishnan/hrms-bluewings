import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { PaginatedResponse, PaginationMeta } from '@/types/api.types';
import { useAuthStore } from '@/lib/store/auth.store';

interface BackendErrorBody {
  success: false;
  error: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

function fieldLabel(key: string): string {
  // Convert camelCase / dot.paths to human readable: "workEmail" → "Work Email", "address.city" → "City"
  const last = key.split('.').pop() ?? key;
  return last
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function buildErrorMessage(data: BackendErrorBody['error']): string {
  const base = data.message || 'Something went wrong. Please try again.';
  if (data.code !== 'VALIDATION_ERROR' || !data.details) return base;

  const msgs: string[] = [];
  const details = data.details as Record<string, unknown>;

  // Zod field errors: { fieldErrors: { fieldName: string[] }, formErrors: string[] }
  if (details.fieldErrors && typeof details.fieldErrors === 'object') {
    for (const [field, errs] of Object.entries(details.fieldErrors as Record<string, string[]>)) {
      if (Array.isArray(errs) && errs.length > 0) {
        msgs.push(`${fieldLabel(field)}: ${errs[0]}`);
      }
    }
  }
  if (Array.isArray(details.formErrors) && (details.formErrors as string[]).length > 0) {
    msgs.push(...(details.formErrors as string[]));
  }

  // Mongoose validation: array of strings
  if (Array.isArray(data.details)) {
    msgs.push(...(data.details as string[]));
  }

  return msgs.length > 0 ? msgs.join('. ') : base;
}

function toApiError(axiosErr: AxiosError): Error {
  const body = axiosErr.response?.data as BackendErrorBody | undefined;
  if (body?.error) {
    const msg = buildErrorMessage(body.error);
    const err = new Error(msg) as Error & { code?: string; status?: number; details?: unknown };
    err.code = body.error.code;
    err.status = axiosErr.response?.status;
    err.details = body.error.details;
    return err;
  }
  if (!axiosErr.response) {
    return new Error('Network error. Please check your connection and try again.');
  }
  return new Error(axiosErr.message || 'Something went wrong. Please try again.');
}

let apiClient: AxiosInstance | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<(ok: boolean) => void> = [];

function getOrganizationId(): string | null {
  try {
    const raw = localStorage.getItem('hrms_active_org');
    return raw ?? null;
  } catch {
    return null;
  }
}

const PUBLIC_PATHS = new Set(['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password']);
const SKIP_REFRESH_URLS = new Set(['/auth/login', '/auth/refresh', '/auth/logout']);

function redirectToLogin(): void {
  const currentPath = window.location.pathname;
  if (!PUBLIC_PATHS.has(currentPath)) {
    window.location.href = `/login?from=${encodeURIComponent(currentPath)}`;
  }
}

export function createApiClient(): AxiosInstance {
  if (apiClient) return apiClient;

  const apiBase = import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
    : '/api/v1';

  apiClient = axios.create({
    baseURL: apiBase,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    config.headers['X-Request-ID'] = crypto.randomUUID();
    const orgId = getOrganizationId();
    if (orgId) {
      config.headers['X-Organization-ID'] = orgId;
    }
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      const requestUrl: string = originalRequest.url ?? '';

      if (error.response?.status === 401 && !originalRequest._retry && !SKIP_REFRESH_URLS.has(requestUrl)) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            refreshSubscribers.push((ok) => {
              if (ok) {
                resolve(apiClient!.request(originalRequest));
              } else {
                reject(toApiError(error));
              }
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const { refreshToken } = useAuthStore.getState();
          const refreshRes = await apiClient!.post<{ success: true; data: { expiresIn: number; accessToken: string; refreshToken: string } }>('/auth/refresh', { refreshToken });
          const { accessToken: newAccess, refreshToken: newRefresh } = refreshRes.data.data;
          useAuthStore.getState().setTokens(newAccess, newRefresh);
          refreshSubscribers.forEach((cb) => cb(true));
          refreshSubscribers = [];
          isRefreshing = false;
          return apiClient!.request(originalRequest);
        } catch {
          refreshSubscribers.forEach((cb) => cb(false));
          refreshSubscribers = [];
          isRefreshing = false;
          redirectToLogin();
        }
      } else if (error.response?.status === 401) {
        redirectToLogin();
      }

      return Promise.reject(toApiError(error));
    },
  );

  return apiClient;
}

export function getApiClient(): AxiosInstance {
  return createApiClient();
}

/** For single-object endpoints: unwraps { success, data: T } → T */
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const client = getApiClient();
  const res = await client.get<{ success: true; data: T }>(url, config);
  return res.data.data;
}

/** For list endpoints: unwraps { success, data: T[], meta } → { data: T[], meta } */
export async function getList<T>(url: string, config?: AxiosRequestConfig): Promise<PaginatedResponse<T>> {
  const client = getApiClient();
  const res = await client.get<{ success: true; data: T[]; meta: PaginationMeta }>(url, config);
  return { data: res.data.data, meta: res.data.meta };
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const client = getApiClient();
  const res = await client.post<{ success: true; data: T }>(url, data, config);
  return res.data.data;
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const client = getApiClient();
  const res = await client.put<{ success: true; data: T }>(url, data, config);
  return res.data.data;
}

export async function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const client = getApiClient();
  const res = await client.patch<{ success: true; data: T }>(url, data, config);
  return res.data.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const client = getApiClient();
  const res = await client.delete<{ success: true; data: T }>(url, config);
  return res.data.data;
}
