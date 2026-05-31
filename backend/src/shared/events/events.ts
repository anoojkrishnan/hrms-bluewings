export const EVENTS = {
  TENANT_CREATED: 'tenant.created',
  TENANT_SUSPENDED: 'tenant.suspended',
  TENANT_REACTIVATED: 'tenant.reactivated',
  TENANT_ARCHIVED: 'tenant.archived',

  USER_REGISTERED: 'user.registered',
  USER_EMAIL_VERIFIED: 'user.email.verified',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_PASSWORD_CHANGED: 'user.password.changed',
  USER_SUSPENDED: 'user.suspended',

  ROLE_ASSIGNED: 'rbac.role.assigned',
  ROLE_REVOKED: 'rbac.role.revoked',
  DELEGATION_CREATED: 'rbac.delegation.created',

  ORGANIZATION_CREATED: 'organization.created',
  COMPANY_CREATED: 'organization.company.created',
  DEPARTMENT_CREATED: 'organization.department.created',

  EMPLOYEE_CREATED: 'employee.created',
  EMPLOYEE_UPDATED: 'employee.updated',
  EMPLOYEE_STATUS_CHANGED: 'employee.status.changed',
  EMPLOYEE_ESS_INVITED: 'employee.ess.invited',

  LEAVE_APPLIED: 'leave.applied',
  LEAVE_APPROVED: 'leave.approved',
  LEAVE_REJECTED: 'leave.rejected',
  LEAVE_CANCELLED: 'leave.cancelled',
  LEAVE_REVOKED: 'leave.revoked',

  ATTENDANCE_PUNCHED: 'attendance.punched',

  WORKFLOW_STARTED: 'workflow.started',
  WORKFLOW_APPROVED: 'workflow.approved',
  WORKFLOW_REJECTED: 'workflow.rejected',
  WORKFLOW_CANCELLED: 'workflow.cancelled',
  WORKFLOW_ESCALATED: 'workflow.escalated',

  NOTIFICATION_SENT: 'notification.sent',

  RULE_EVALUATED: 'rule.evaluated',

  FORM_SUBMITTED: 'form.submitted',

  AUDIT_WRITE: 'audit.write',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
