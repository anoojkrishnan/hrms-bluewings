# Conventions

## Naming

| Item | Style | Example |
|---|---|---|
| Module folders | kebab-case | `leave/`, `rule-engine/` |
| Files | kebab-case | `employee.service.ts` |
| Test files | `<name>.test.ts` | `employee.service.test.ts` |
| Interfaces/Types/Enums | PascalCase, no `I` prefix | `Employee`, `DataScope` |
| Enum values | UPPER_SNAKE_CASE | `EmployeeStatus.ACTIVE` |
| Classes | PascalCase | `EmployeeService` |
| Functions/vars | camelCase | `findByPublicId`, `tenantId` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| MongoDB collections | snake_case plural | `leave_applications` |

## Public Identifier Format

| Entity | Format | Example |
|---|---|---|
| Employee | `EMP-{n}` / `emp_{nanoid}` | `EMP-1024` |
| Tenant/Company | slug | `acme-india` |
| Payroll run | `payrun_{year}_{month}_{type}` | `payrun_2026_05_main` |
| Leave | `leave_{nanoid}` | `leave_a9f2kp` |
| Document | `doc_{nanoid}` | `doc_8x2kq9` |
| Report | `rpt_{nanoid}` | |
| Import batch | `imp_{nanoid}` | |
| Workflow | `wf_{nanoid}` | |
| API client | `apiclient_{nanoid}` | |

Generate via `nanoid`/`uuid`. Never auto-increment across tenants. Never use `_id` in routes.

## API Routes

Base `/api/v1`.

```
GET    /employees              list (paginated, data-scoped)
GET    /employees/:publicId    get one
POST   /employees              create
PUT    /employees/:publicId    full update
PATCH  /employees/:publicId    partial update
DELETE /employees/:publicId    soft delete
PATCH  /leave/applications/:publicId/approve
```

Max 2 levels of nesting. Always `publicId` in params.

## Validation

Zod for all requests.

```typescript
export const createLeaveSchema = z.object({
  body: z.object({
    leaveTypePublicId: z.string().min(1),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    reason: z.string().optional(),
  })
});
export type CreateLeaveDto = z.infer<typeof createLeaveSchema>['body'];
```

## Controller

```typescript
getEmployee = async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const { tenantId, organizationId } = req.user;
    const employee = await this.service.findByPublicId(publicId, tenantId, organizationId);
    return res.status(200).json({ success: true, data: employee });
  } catch (err) { next(err); }
};
```

No repo access, no business logic, no cross-module service calls (delegate to own service).

## Service

```typescript
async findByPublicId(publicId, tenantId, organizationId): Promise<EmployeeDto> {
  const e = await this.repo.findByPublicId(publicId, tenantId);
  if (!e) throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
  return this.toDto(e);
}
```

## Repository

```typescript
private baseFilter(tenantId, organizationId?) {
  return { tenantId, ...(organizationId && { organizationId }), deletedAt: null };
}
async findByPublicId(publicId, tenantId) {
  return this.model.findOne({ ...this.baseFilter(tenantId), publicId });
}
```

No logic, no cross-repo calls, never called outside own module's service.

## Soft Delete

```typescript
await this.model.updateOne(
  { publicId, tenantId, deletedAt: null },
  { $set: { deletedAt: new Date(), deletedBy, deletionReason: reason, isActive: false } }
);
```

## Pagination

Query: `?page=1&limit=20&sortBy=createdAt&sortOrder=desc`. Default limit 20, max 100.

```typescript
interface PaginatedResult<T> {
  data: T[];
  meta: { page; limit; total; totalPages; hasNext; hasPrev };
}
```

## Response Envelopes

```typescript
{ success: true, data: {...} }                              // single
{ success: true, data: [...], meta: {...} }                 // list
{ success: true, data: { jobId, status: 'queued' } }        // async (HTTP 202)
{ success: false, error: { code, message, details? } }      // error
```

## Dates

Store UTC. ISO 8601 in API. Store timezone with attendance/scheduling. Use `dayjs`/`date-fns` (no moment.js). Financial year configurable per tenant (default Apr–Mar).

## Logging

Structured (Pino/Winston). Include `tenantId`, `requestId`. Never log passwords, tokens, secrets, bank/PAN/Aadhaar, raw `_id`, or full sensitive request bodies.

## Sensitive Field Masking

Mask by default in UI, API responses, and exports: bank account, IFSC, PAN, Aadhaar, national ID, passport/visa, salary/payroll amounts, insurance, family, medical, nominee. Unmask only with explicit `reveal` permission; log every reveal. Block sensitive export without export-sensitive-data permission. Never leak sensitive values in URLs, console logs, error traces, or API errors.

## Encryption at Rest

`panNumber`, `aadhaarNumber`, `passportNumber`, `bank accountNumber`, MFA secrets, AI provider API keys.

## Imports

```typescript
import path from 'path';                       // node builtins
import express from 'express';                 // external
import { AppError } from '@/shared/errors';    // shared
import { EmployeeRepository } from './employee.repository'; // module
```

## Testing

Jest. Unit tests for services, integration for repos (in-memory MongoDB), E2E for auth/leave/payroll. Mock S3/email/AI. Each test cleans its own tenant data. Run typecheck + lint before completion.

## Frontend

React functional components + hooks. Centralized API client auto-attaches JWT + active org context. Route guards for auth + permissions. Skeleton loaders on all data-fetching pages (no blank screens). Meaningful empty states on every list/dashboard with RBAC-aware CTAs. CSS variables for theming (light default + dark mode; store per-user preference). TypeScript strict mode. WCAG-friendly contrast.

## Theme Tokens

Light default, optional dark. Use CSS variables, never hardcode colors.

```css
:root {
  --color-primary:#2563EB; --color-primary-dark:#1D4ED8; --color-secondary:#14B8A6;
  --color-background:#F8FAFC; --color-surface:#FFFFFF; --color-sidebar:#0F172A;
  --color-text-primary:#0F172A; --color-text-secondary:#64748B; --color-border:#E2E8F0;
  --color-success:#16A34A; --color-warning:#F59E0B; --color-danger:#DC2626; --color-info:#0284C7;
}
[data-theme="dark"] {
  --color-primary:#60A5FA; --color-secondary:#2DD4BF; --color-background:#020617;
  --color-surface:#0F172A; --color-text-primary:#F8FAFC; --color-text-secondary:#CBD5E1;
  --color-border:#334155; --color-success:#22C55E; --color-warning:#FBBF24;
  --color-danger:#F87171; --color-info:#38BDF8;
}
```

## Env Variables

`PORT NODE_ENV MONGODB_URI JWT_SECRET JWT_EXPIRY REFRESH_TOKEN_SECRET AWS_REGION AWS_S3_BUCKET AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY REDIS_URL RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET EMAIL_PROVIDER_KEY`. Per-tenant AI keys live encrypted in DB, not env.
