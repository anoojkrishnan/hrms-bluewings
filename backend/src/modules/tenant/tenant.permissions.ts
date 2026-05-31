export const TENANT_PERMISSIONS = {
  SETTINGS_VIEW: 'tenant.settings.view',
  SETTINGS_EDIT: 'tenant.settings.edit',
  MODULES_CONFIGURE: 'tenant.modules.configure',
  BILLING_VIEW: 'tenant.billing.view',
  BILLING_MANAGE: 'tenant.billing.manage',
  COMPANY_CREATE: 'tenant.company.create',
  COMPANY_EDIT: 'tenant.company.edit',
  AUDIT_LOG_VIEW: 'tenant.audit_log.view',
  AUDIT_LOG_EXPORT: 'tenant.audit_log.export',
  USER_CREATE_ADMIN: 'tenant.user.create_admin',
  DATA_EXPORT: 'tenant.data.export',
} as const;
