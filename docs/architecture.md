# Architecture

## Pattern

Modular monolith. One deployable Node.js/Express app, internally structured into domain modules with enforced boundaries. Selected modules extractable into services later.

## Folder Structure
Backend code should be in backend folder and Frontend code should be in frontend folder.

```
src/
  app.ts                  Express app setup
  server.ts               HTTP entry point
  config/                 env config, constants, db, redis, s3
  middleware/             auth, tenant-context, org-context, error-handler, rate-limiter, request-id
  shared/
    types/                common interfaces
    utils/                publicId, dates, pagination, crypto, masking
    errors/               AppError, error codes
    validators/           shared Zod schemas
    events/               internal event bus
    storage/              S3 abstraction
  modules/
    tenant/ organization/ user/ rbac/ auth/ audit/
    employee/ leave/ attendance/ holiday/
    workflow/ rule-engine/ dynamic-forms/ notifications/
    payroll/ statutory/
    documents/ policies/ assets/ tasks/ helpdesk/
    timesheet/ expense/ compliance-calendar/ employee-cases/
    reports/ analytics/
    integrations/ imports/ billing/ ai-copilot/
  workers/                BullMQ workers per domain
  jobs/                   queue producers + definitions
tests/
```

## Module Internal Structure

```
src/modules/<module>/
  <module>.routes.ts        HTTP routes + middleware wiring
  <module>.controller.ts    parse req, call service, send response
  <module>.service.ts       business logic, orchestration, events
  <module>.repository.ts     MongoDB queries, tenant-scoped
  <module>.types.ts         interfaces, DTOs, enums
  <module>.validator.ts     Zod schemas
  <module>.permissions.ts   permission codes + checks
  <module>.events.ts        domain events emitted/consumed
  <module>.test.ts          unit + integration tests
```

## Layer Responsibilities

- **Routes:** method, path, attach auth/permission/validation middleware, call controller. No logic.
- **Controller:** extract validated data, call service, format response. No DB access, no logic.
- **Service:** all business logic, orchestration, transactions, events. Calls own repo + other module services (never other repos).
- **Repository:** all MongoDB queries. Always requires `tenantId`. Applies soft-delete filter by default. No logic.

## Communication Rules

```
ALLOWED:    service → other service, service → shared, service → event bus
FORBIDDEN:  service/controller/repository → other module's repository
```

## Request Pipeline

```
Request
 → rate limiter → CORS → body parser → request-id
 → auth (verify JWT, populate req.user)
 → tenant-context (validate tenant active, load settings)
 → org-context (validate org)
 → route: validation → permission check → controller → service → repository
 → response → error handler → async audit writer
```

## Auth Context

JWT in httpOnly cookie. Payload: `userId`, `tenantId`, `organizationId`, `sessionId`. Auth middleware resolves full `req.user`:

```typescript
interface AuthUser {
  userId: string;              // publicId
  employeePublicId?: string;
  tenantId: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  dataScope: DataScope;
  isImpersonating: boolean;
  impersonatedBy?: string;
}
```

## Tenant Isolation (3 levels)

1. **Middleware:** validate tenant active, not suspended/archived.
2. **Service:** receives `tenantId` from `req.user`, never request body.
3. **Repository:** base filter `{ tenantId, deletedAt: null }` on every query.

```typescript
private baseFilter(tenantId: string, organizationId?: string) {
  return { tenantId, ...(organizationId && { organizationId }), deletedAt: null };
}
```

## Background Jobs

Heavy operations queue and return `202` with a `jobId`.

```
Controller → Service → queue producer → 202 { jobId, status: 'queued' }
                            ↓
                       BullMQ queue → worker → job status update
```

Queues: `payroll-processing`, `payroll-simulation`, `report-generation`, `bulk-import`, `bulk-export`, `notifications`, `attendance-sync`, `document-generation`, `accounting-export`, `tenant-export`.

Every job stores: `tenantId`, `organizationId`, `triggeredBy`, `status`, `progress`, `result`, `error`, `correlationId`, timestamps. One tenant's failed jobs must not block another's.

## Error Handling

```typescript
class AppError extends Error {
  constructor(public statusCode: number, public errorCode: string,
              public message: string, public details?: any) { super(message); }
}
// throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
```

## File Storage (S3)

```
Bucket: hrms-platform-<env>
tenants/{tenantPublicId}/
  documents/employees/{employeePublicId}/{documentType}/{filename}
  payslips/{year}/{month}/{employeePublicId}/{filename}
  reports|imports|exports|templates|profile-images/...
```

- Private objects. Access via short-lived signed URLs (default 15 min).
- Signed URL generation checks tenant + org + role + data scope first.
- File metadata in MongoDB with `s3Key`, `mimeType`, `size`, `checksum`, audit fields.
- Malware-scan readiness before serving uploads. Lifecycle rules for temp import/export/report files. Versioning where required.

## Public Website vs App

```
Public (unauth):  / /features /pricing /security /faq /contact /login /signup
App (auth):       /dashboard /employees/* /leave/* /attendance/* /payroll/* /settings/* /ai-assistant
```

Auth-aware nav: unauth → `/dashboard` redirects to `/login` with safe return URL; auth visiting `/login` or `/signup` sees "Go to dashboard"; multi-tenant/org users hit a selector if no active context. SEO: per-page title/description/canonical/OG, sitemap.xml, robots.txt, structured data; private/app pages not indexed.

## Maker-Checker

```
Maker submits → makerCheckerRequests (pending_review)
  → Checker sees old vs new side by side
    → approve → apply change → audit
    → reject  → notify maker → audit
```

Maker ≠ checker (configurable). Applies to: salary revision, payroll finalization, payroll/salary/attendance bulk import, bank/statutory detail changes, role/permission changes, tenant admin creation, company config changes, integration credential changes. Supports API/import-driven changes too, multi-level checker, rollback where feasible.

## Audit Logging

Every write → async audit entry: `actor`, `actorType`, `tenant`, `organization`, `action`, `module`, `entityType`, `entityPublicId`, `oldValue`, `newValue`, `ipAddress`, `userAgent`, `requestId`, `timestamp`. Append-only / tamper-resistant.

## AI Copilot Flow

```
Prompt → AI router (session, plan entitlement, rate limit)
       → permission resolver (same RBAC as normal APIs)
       → data fetcher (calls tenant+permission-aware module services only)
       → provider adapter (OpenRouter|OpenAI resolved from DB)
       → response formatter → audit logger → frontend
```

Provider/model resolved from `tenant_ai_settings`; never trusted from frontend. AI never queries MongoDB directly.
