import type { DataScope } from '@/shared/types/common';

export interface Role {
  _id?: unknown;
  publicId: string;
  tenantId: string;
  organizationId?: string;
  name: string;
  code: string;
  isSystemRole: boolean;
  isCustom: boolean;
  dataScope: DataScope;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
  isActive: boolean;
}

export interface Permission {
  code: string;
  module: string;
  action: string;
  description: string;
  isSystemPermission: boolean;
}

export interface RolePermission {
  tenantId: string;
  rolePublicId: string;
  permissionCode: string;
  grantedAt: Date;
  grantedBy: string;
}

export interface UserRole {
  tenantId: string;
  organizationId: string;
  userId: string;
  rolePublicId: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
}

export interface DelegationRule {
  publicId: string;
  tenantId: string;
  delegatorId: string;
  delegateeId: string;
  permissionCodes: string[];
  startDate: Date;
  endDate: Date;
  reason?: string;
  isActive: boolean;
  createdBy: string;
  auditLogId?: string;
  createdAt: Date;
}

export interface ResolvedPermissions {
  permissions: string[];
  roles: string[];
  dataScope: DataScope;
}

export interface CreateRoleDto {
  name: string;
  code: string;
  dataScope: DataScope;
  description?: string;
  permissionCodes?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  dataScope?: DataScope;
  description?: string;
}

export interface CreateDelegationDto {
  tenantId: string;
  delegatorId: string;
  delegateeId: string;
  permissionCodes: string[];
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface RoleDto {
  publicId: string;
  name: string;
  code: string;
  isSystemRole: boolean;
  isCustom: boolean;
  dataScope: DataScope;
  description?: string;
  permissions?: string[];
  createdAt: Date;
}
