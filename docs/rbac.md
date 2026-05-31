# RBAC

## Model

Three layers, all must pass: **Role** (named permission set) + **Permission** (action on resource) + **Data Scope** (which records apply).

## Data Scopes

```typescript
enum DataScope {
  SELF='self', DIRECT_REPORTS='direct_reports',
  DIRECT_AND_INDIRECT_REPORTS='direct_and_indirect_reports',
  DEPARTMENT='department', LOCATION='location', BUSINESS_UNIT='business_unit',
  COST_CENTER='cost_center', COMPANY='company', ORGANIZATION='organization',
  PROJECT_TEAM='project_team', PLATFORM='platform'
}
```

## System Roles (auto-created per tenant, undeletable)

| Code | Default Scope |
|---|---|
| `platform_super_admin` | platform |
| `tenant_admin` | organization |
| `hr_admin` | organization |
| `hr_manager` | department |
| `payroll_admin` | organization |
| `finance_admin` | organization |
| `department_manager` | direct_and_indirect_reports |
| `reporting_manager` | direct_reports |
| `employee` | self |
| `alumni` | self |
| `auditor` | organization |
| `api_client` | configured |

Custom roles per tenant = permission set + data scope.

## Permission Code Format

`<module>.<resource>.<action>` — e.g. `employee.salary.view`, `payroll.run.finalize`, `leave.application.approve`.

Actions: `view create edit delete approve reject export import configure override finalize publish impersonate reveal`.

## Permission Groups

```
EMPLOYEE: profile.{view,edit,create,delete} salary.view bank_details.{view,edit}
  statutory_details.view documents.{view,upload,delete} directory.view timeline.view
  custom_fields.edit ess.manage separation.initiate data_change.approve personal_sensitive.view

LEAVE: application.{view,create,edit,cancel,approve,reject,revoke}
  balance.{view,edit,adjust} policy.configure year_end.process proxy.apply

ATTENDANCE: log.{view,override} regularization.approve exception.{view,approve}
  finalize lock device.configure shift.configure bulk_import swipe.resync

PAYROLL: run.{view,create,edit,preview,finalize,rollback,approve}
  payslip.{view,publish,download} salary_structure.configure salary.{view,revise}
  statutory.configure tax_declaration.approve inputs.import bank_file.generate
  ffs.process accounting.export simulation.run

REPORTS: standard.{view,export} custom.{create,export} payroll.{view,export}
  sensitive.export schedule.configure

RBAC: role.{view,create,edit,delete} permission.assign user.assign_role delegation.create

WORKFLOW: configure view instance.{view,approve,reject,escalate}

TENANT: settings.{view,edit} modules.configure billing.{view,manage}
  company.{create,edit} audit_log.{view,export} data.export user.create_admin

TIMESHEET: project.{view,create,edit} entry.{view,create,submit} approve reject
EXPENSE: claim.{view,create,submit,approve} category.configure finance.verify
ASSET: master.{view,create,edit} assign return
DOCUMENT: template.{configure} generate
POLICY: create release acknowledge.track
HELPDESK: request.{view,create,assign,close} sla.configure
INTEGRATIONS: api_client.manage webhook.manage accounting.configure scim.configure
AI: chatbot.use settings.configure usage.view actions.execute knowledge_source.manage
```

## Maker-Checker Pairs

| Action | Maker | Checker |
|---|---|---|
| Salary revision | `payroll.salary.revise` | `payroll.salary.revise.approve` |
| Payroll finalization | `payroll.run.finalize` | `payroll.run.finalize.approve` |
| Bank detail change | `employee.bank_details.edit` | `employee.bank_details.edit.approve` |
| Statutory change | `employee.statutory_details.edit` | `...edit.approve` |
| Bulk employee import | `employee.bulk_import` | `...bulk_import.approve` |
| Bulk salary import | `payroll.inputs.import` | `...import.approve` |
| Role/permission change | `rbac.role.edit` | `...edit.approve` |
| Tenant admin creation | `tenant.user.create_admin` | `...create_admin.approve` |
| Company config change | `tenant.company.edit` | `...edit.approve` |
| Integration credentials | `integrations.api_client.manage` | `...manage.approve` |

Maker ≠ checker (tenant-configurable). Multi-level checker supported. API/import-driven changes also routed through maker-checker.

## Sensitive Field Masking

Masked by default in UI, API, exports. `reveal` permission required; every reveal logged.

| Field | Reveal Permission |
|---|---|
| Bank account / IFSC | `employee.bank_details.view` |
| PAN / Aadhaar / national ID | `employee.statutory_details.view` |
| Passport / visa | `employee.personal_sensitive.view` |
| Salary components | `employee.salary.view` |
| Payroll amounts | `payroll.payslip.view` |
| Insurance / family / medical / nominee | `employee.personal_sensitive.view` |

## Enforcement

```typescript
export const requirePermission = (code: string) =>
  (req, res, next) => {
    if (!req.user.permissions.includes(code))
      throw new AppError(403, 'PERMISSION_DENIED', 'You do not have access to perform this action');
    next();
  };

export const buildDataScopeFilter = (user: AuthUser, tenantId: string) => {
  switch (user.dataScope) {
    case DataScope.SELF: return { employeeId: user.employeePublicId };
    case DataScope.DIRECT_REPORTS: return { reportingManagerId: user.employeePublicId };
    case DataScope.DEPARTMENT: return { departmentId: user.departmentId };
    case DataScope.LOCATION: return { locationId: user.locationId };
    case DataScope.COMPANY: return { companyId: user.companyId };
    case DataScope.ORGANIZATION: return { tenantId };
    // ...
  }
};
```

## Impersonation

Permission-controlled, off by default, reason required, full audit (actor, target, tenant, start/end, IP, UA), visible banner. Blocked during impersonation unless higher permission: payroll finalization, salary revision, bank/statutory update, role/permission change, data deletion, billing changes. Never bypasses isolation/RBAC/maker-checker/audit.

## Delegation

```typescript
interface DelegationRule {
  tenantId; delegatorId; delegateeId; permissionCodes: string[];
  startDate; endDate; reason?; isActive; createdBy; auditLogId;
}
```
Sensitive reveals not delegable. Payroll finalization delegation needs tenant admin approval. All delegation audited.

## AI Chatbot RBAC

Same model. Before any retrieval/action: resolve permissions + scope → convert prompt to permission-checked service calls (never direct Mongo) → apply masking → on out-of-scope return `"You do not have access to that information. You can contact HR if you need assistance."` → never reveal whether a restricted record exists.
