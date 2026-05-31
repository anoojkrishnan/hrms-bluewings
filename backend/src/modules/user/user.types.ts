import type { BaseDocument } from '@/shared/types/common';

export enum UserStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export interface UserName {
  first: string;
  last: string;
}

export interface User extends BaseDocument {
  email: string;
  passwordHash: string;
  name: UserName;
  phone?: string;
  status: UserStatus;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  mfaEnabled: boolean;
  mfaSecret?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
}

export interface UserTenantMembership {
  tenantId: string;
  userId: string;
  organizationId: string;
  isDefault: boolean;
  joinedAt: Date;
  invitedBy?: string;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  tenantId: string;
  organizationId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  revokedAt?: Date;
  lastUsedAt: Date;
  createdAt: Date;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  organizationId: string;
  phone?: string;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface UserDto {
  publicId: string;
  email: string;
  name: UserName;
  phone?: string;
  status: UserStatus;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  mfaEnabled: boolean;
  createdAt: Date;
}

export interface MfaSetupDto {
  secret: string;
  qrCodeUri: string;
  otpAuthUrl: string;
}

export interface SessionDto {
  sessionId: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  isCurrent?: boolean;
}
