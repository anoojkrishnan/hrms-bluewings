import { get, getList, post, put, del } from './client';

export interface Role {
  publicId: string;
  name: string;
  code: string;
  isSystemRole: boolean;
  isCustom: boolean;
  dataScope: string;
  description?: string;
  createdAt: string;
}

export interface Permission {
  code: string;
  module: string;
  action: string;
  description: string;
}

export interface CreateRoleDto {
  name: string;
  code: string;
  dataScope: string;
  description?: string;
  permissionCodes?: string[];
}

export const rbacApi = {
  listRoles: (params?: { limit?: number }) =>
    getList<Role>('/roles', { params }),

  getRole: (publicId: string) =>
    get<Role>(`/roles/${publicId}`),

  createRole: (dto: CreateRoleDto) =>
    post<Role>('/roles', dto),

  updateRole: (publicId: string, dto: Partial<CreateRoleDto>) =>
    put<Role>(`/roles/${publicId}`, dto),

  deleteRole: (publicId: string) =>
    del<void>(`/roles/${publicId}`),

  // Backend returns string[] (permission codes), wrapped in { success, data }
  getRolePermissions: (publicId: string) =>
    get<string[]>(`/roles/${publicId}/permissions`),

  setRolePermissions: (publicId: string, permissionCodes: string[]) =>
    put<void>(`/roles/${publicId}/permissions`, { permissionCodes }),

  listAllPermissions: () =>
    get<Permission[]>('/permissions'),
};
