export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SOFT_DELETE = 'soft_delete',
  RESTORE = 'restore',
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login.failed',
  ACCOUNT_LOCKED = 'account.locked',
  PASSWORD_CHANGED = 'password.changed',
  EMAIL_VERIFIED = 'email.verified',
  ROLE_ASSIGN = 'role.assign',
  ROLE_REVOKE = 'role.revoke',
  PERMISSION_REVEAL = 'permission.reveal',
  IMPERSONATE_START = 'impersonate.start',
  IMPERSONATE_END = 'impersonate.end',
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  REJECT = 'reject',
  FINALIZE = 'finalize',
  ROLLBACK = 'rollback',
  PUBLISH = 'publish',
  SUSPEND = 'suspend',
  REACTIVATE = 'reactivate',
  ARCHIVE = 'archive',
  DELEGATE = 'delegate',
  SETTINGS_UPDATE = 'settings.update',
  MODULE_TOGGLE = 'module.toggle',
}

export interface AuditLogEntry {
  tenantId: string;
  organizationId?: string;
  actorId: string;
  actorType: 'user' | 'system' | 'ai' | 'api_client';
  action: string;
  module: string;
  entityType: string;
  entityPublicId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  requestId: string;
  timestamp: Date;
}

export interface CreateAuditLogDto {
  tenantId: string;
  organizationId?: string;
  actorId: string;
  actorType?: 'user' | 'system' | 'ai' | 'api_client';
  action: string;
  module: string;
  entityType: string;
  entityPublicId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}
