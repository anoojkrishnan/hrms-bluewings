---
name: api-response
description: Use this skill whenever writing controller responses, error handling, async job responses, or any code that returns JSON from an Express route in the HRMS platform. Triggers include:
  writing a controller method, formatting an API response, returning paginated data, throwing
  an error, returning a 202 for a background job, or any time the shape of a response or
  error is in question. Also use when reviewing code to check if response envelopes are correct.
  This skill is the single source of truth for every response shape — always follow it exactly.
---

# API Response Patterns

## The four envelope shapes — use exactly one per response

### 1. Single resource

```typescript
return res.status(200).json({
  success: true,
  data: dto,         // one object, never an array
});
```

Use for: GET one, POST (201), PUT, PATCH, DELETE (data: null).

For DELETE specifically:
```typescript
return res.status(200).json({ success: true, data: null });
```

---

### 2. Paginated list

```typescript
return res.status(200).json({
  success: true,
  data: result.data,   // always an array
  meta: {
    page: Number(page),
    limit: Number(limit),
    total: result.total,
    totalPages: Math.ceil(result.total / Number(limit)),
    hasNext: Number(page) * Number(limit) < result.total,
    hasPrev: Number(page) > 1,
  },
});
```

Default limit: `20`. Max limit: `100` (clamp in controller: `Math.min(Number(limit), 100)`).

Query params: `?page=1&limit=20&sortBy=createdAt&sortOrder=desc`

---

### 3. Async job (background operation)

```typescript
return res.status(202).json({
  success: true,
  data: {
    jobId: job.id,          // BullMQ job ID as string
    status: 'queued',
  },
});
```

Use for: payroll processing, bulk imports, bulk exports, report generation, document generation, bank file generation, attendance sync — any operation that runs through a BullMQ queue.

The controller must never `await` the heavy work. It queues and immediately returns 202.

---

### 4. Error

```typescript
return res.status(statusCode).json({
  success: false,
  error: {
    code: 'ERROR_CODE',     // UPPER_SNAKE_CASE string
    message: 'Human-readable message',
    details?: any,          // validation field errors, etc.
  },
});
```

**Never construct error responses manually.** Throw an `AppError` and let the global error handler format this envelope:

```typescript
import { AppError } from '@/shared/errors';

// In service:
throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
throw new AppError(409, 'DUPLICATE_RECORD', 'Employee code already exists');
throw new AppError(403, 'PERMISSION_DENIED', 'You do not have access to perform this action');
throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request', { field: 'email', issue: 'required' });
```

---

## Standard error codes

| Code | HTTP | When to use |
|---|---|---|
| `UNAUTHORIZED` | 401 | Not authenticated |
| `PERMISSION_DENIED` | 403 | Authenticated but no permission |
| `TENANT_NOT_FOUND` | 404 | Tenant missing or not active |
| `TENANT_SUSPENDED` | 403 | Tenant suspended |
| `<ENTITY>_NOT_FOUND` | 404 | Resource missing (e.g. `EMPLOYEE_NOT_FOUND`) |
| `VALIDATION_ERROR` | 400 | Zod / input validation failed |
| `DUPLICATE_RECORD` | 409 | Unique constraint violation |
| `PLAN_LIMIT_REACHED` | 403 | Subscription limit hit |
| `MODULE_NOT_ENABLED` | 403 | Feature not in tenant plan |
| `PAYROLL_LOCKED` | 409 | Payroll run locked or finalized |
| `MAKER_CHECKER_REQUIRED` | 403 | Action needs approval before execution |
| `INTERNAL_ERROR` | 500 | Unexpected — never expose internals |

For new entity types, follow the pattern `<ENTITY>_NOT_FOUND` (e.g. `DOCUMENT_NOT_FOUND`, `WORKFLOW_NOT_FOUND`).

---

## Controller anatomy — complete example

```typescript
import { Request, Response, NextFunction } from 'express';

export class EmployeeController {
  constructor(private readonly service: EmployeeService) {}

  // GET /employees — paginated list
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, organizationId } = req.user!;
      const { page = 1, limit = 20 } = req.query;
      const result = await this.service.findAll(tenantId, organizationId, {
        page: Number(page),
        limit: Math.min(Number(limit), 100),
      });
      return res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total: result.total,
          totalPages: Math.ceil(result.total / Number(limit)),
          hasNext: Number(page) * Number(limit) < result.total,
          hasPrev: Number(page) > 1,
        },
      });
    } catch (err) { next(err); }
  };

  // GET /employees/:employeeCode — single resource
  getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.user!;
      const employee = await this.service.findByCode(req.params.employeeCode, tenantId);
      return res.status(200).json({ success: true, data: employee });
    } catch (err) { next(err); }
  };

  // POST /employees — create
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, organizationId, userId } = req.user!;
      const employee = await this.service.create(req.body, tenantId, organizationId, userId);
      return res.status(201).json({ success: true, data: employee });
    } catch (err) { next(err); }
  };

  // POST /payroll/runs/:publicId/process — async job
  processRun = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, organizationId, userId } = req.user!;
      const job = await this.service.enqueueProcessing(req.params.publicId, tenantId, organizationId, userId);
      return res.status(202).json({ success: true, data: { jobId: String(job.id), status: 'queued' } });
    } catch (err) { next(err); }
  };

  // DELETE /employees/:employeeCode — soft delete
  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, organizationId, userId } = req.user!;
      await this.service.softDelete(req.params.employeeCode, tenantId, organizationId, userId);
      return res.status(200).json({ success: true, data: null });
    } catch (err) { next(err); }
  };
}
```

---

## What never appears in a response

| Forbidden field | Why |
|---|---|
| `_id` | Internal MongoDB ID — use `publicId` only |
| `s3Key` | Internal storage path — return a signed URL instead |
| `passwordHash` | Never |
| `mfaSecret` | Never |
| `accountNumber` (raw) | Masked unless `reveal` permission granted |
| `panNumber` (raw) | Masked unless `reveal` permission granted |
| `aadhaarNumber` (raw) | Masked unless `reveal` permission granted |
| `tenantId` in error details | Never expose internal identifiers in errors |

---

## Common mistakes — do not do these

```typescript
// ❌ Wrong: bare data without envelope
res.json(employee);

// ❌ Wrong: array at root
res.json({ success: true, employees: [...] });

// ❌ Wrong: meta on a single-resource response
res.json({ success: true, data: employee, meta: { total: 1 } });

// ❌ Wrong: 200 for async job
res.status(200).json({ success: true, data: { jobId: '123' } });

// ❌ Wrong: manual error object
res.status(404).json({ error: 'Not found' });

// ❌ Wrong: tenantId from body
const { tenantId } = req.body; // never

// ✅ Correct: tenantId always from req.user
const { tenantId, organizationId, userId } = req.user!;
```

---

## Headers

Every request expects:
```
Content-Type: application/json
X-Request-ID: <uuid>          // attached by request-id middleware
Authorization: Bearer <jwt>   // or httpOnly cookie
```

Never read `tenantId`, `organizationId`, or role information from headers — use `req.user` only.