import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { PaginatedResponse, PaginationMeta } from '@/types/api.types';

let apiClient: AxiosInstance | null = null;

function getOrganizationId(): string | null {
  try {
    const raw = localStorage.getItem('hrms_active_org');
    return raw ?? null;
  } catch {
    return null;
  }
}

const PUBLIC_PATHS = new Set(['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password']);

function redirectToLogin(): void {
  const currentPath = window.location.pathname;
  if (!PUBLIC_PATHS.has(currentPath)) {
    window.location.href = `/login?from=${encodeURIComponent(currentPath)}`;
  }
}

export function createApiClient(): AxiosInstance {
  if (apiClient) return apiClient;

  apiClient = axios.create({
    baseURL: '/api/v1',
    withCredentials: true,
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
    return config;
  });

  apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error) => {
      if (error.response?.status === 401) {
        redirectToLogin();
      }
      return Promise.reject(error);
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
