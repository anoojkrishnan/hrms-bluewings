# API

Base `/api/v1`. Headers: `Authorization: Bearer <jwt>` (or httpOnly cookie), `Content-Type: application/json`, `X-Request-ID`.

## Envelopes
```
{ success:true, data:{...} }                          single
{ success:true, data:[...], meta:{page,limit,total,totalPages,hasNext,hasPrev} }  list
{ success:true, data:{ jobId, status:'queued' } }     async (202)
{ success:false, error:{ code, message, details? } }  error
```

## Auth
```
POST   /auth/login | logout | refresh | forgot-password | reset-password | verify-email
POST   /auth/mfa/setup | /auth/mfa/verify
GET    /auth/sessions          DELETE /auth/sessions/:sessionId    DELETE /auth/sessions
```

## Public (unauth)
```
POST   /public/signup          GET /public/check-slug
```

## Platform (super admin)
```
GET    /platform/tenants       GET /platform/tenants/:slug
POST   /platform/tenants       PATCH /platform/tenants/:slug/suspend | /reactivate
GET    /platform/tenants/:slug/usage
```

## Organization
```
GET|POST /companies            GET|PUT|DELETE /companies/:publicId
GET|POST /departments          PUT|DELETE /departments/:publicId
GET|POST /designations         PUT /designations/:publicId
GET|POST /locations            PUT /locations/:publicId
GET    /org-chart
```

## Employee
```
GET    /employees              GET /employees/:employeeCode
POST   /employees              PUT /employees/:employeeCode      DELETE /employees/:employeeCode
GET|PUT /employees/:employeeCode/personal
GET|PUT /employees/:employeeCode/bank-details        (salary.view)
GET|POST /employees/:employeeCode/documents          DELETE .../documents/:docPublicId
GET    /employees/:employeeCode/timeline | /salary-history (salary.view)
POST   /employees/bulk-import (async)  GET /employees/bulk-import/:jobId/status  GET /employees/bulk-import/template
POST   /employees/:employeeCode/ess/invite | /ess/disable
```

## Leave
```
GET|POST /leave/types          PUT /leave/types/:publicId
GET    /leave/applications      GET /leave/applications/:publicId
POST   /leave/applications      PUT|DELETE /leave/applications/:publicId
PATCH  /leave/applications/:publicId/approve | /reject | /revoke
GET    /leave/balances          GET /leave/balances/:employeeCode   PUT /leave/balances/:employeeCode/adjust
GET    /leave/calendar          GET|POST /leave/holidays
```

## Attendance
```
GET    /attendance              GET /attendance/:employeeCode/:date
POST   /attendance/punch (ESS)  POST /attendance/override
GET    /attendance/exceptions   PATCH /attendance/exceptions/:publicId/approve | /reject
POST   /attendance/regularize   POST /attendance/bulk-import (async)
GET|POST /attendance/shifts      PUT /attendance/shifts/:publicId
GET    /attendance/rosters       POST /attendance/rosters/bulk-upload
POST   /attendance/process (async)  POST /attendance/finalize
GET|POST /attendance/devices     POST /attendance/devices/:publicId/sync
POST   /attendance/swipe        (device/swipe API)
```

## Payroll
```
GET|POST /payroll/salary-structures  PUT /payroll/salary-structures/:publicId
GET    /payroll/runs             GET /payroll/runs/:publicId   POST /payroll/runs
POST   /payroll/runs/:publicId/preview | /process (async) | /approve | /finalize (maker-checker) | /rollback | /publish-payslips
GET    /payroll/payslips         GET /payroll/payslips/:publicId  GET .../download (signed URL)
GET    /payroll/salary/:employeeCode (salary.view)  PUT .../revise (maker-checker)
POST   /payroll/inputs/bulk-import (async)  GET /payroll/inputs/:runPublicId
GET|PUT /payroll/tax-declarations/:employeeCode  PATCH .../approve
POST   /payroll/ffs/:employeeCode  GET /payroll/ffs/:publicId  PATCH .../approve
POST   /payroll/bank-file/:runPublicId (async)  POST /payroll/accounting-export/:runPublicId (async)
```

## Workflow / Maker-Checker
```
GET|POST /workflows              PUT|DELETE /workflows/:publicId
GET    /workflow-instances       GET /workflow-instances/:publicId
PATCH  /workflow-instances/:publicId/approve | /reject | /escalate
GET    /maker-checker            GET /maker-checker/:publicId
PATCH  /maker-checker/:publicId/approve | /reject | /request-correction
```

## Reports
```
GET    /reports/templates        POST /reports/generate (async)
GET    /reports/jobs/:jobId/status | /download (signed URL)
GET|POST /reports/custom         PUT|DELETE /reports/custom/:publicId
```

## RBAC
```
GET|POST /roles                  PUT|DELETE /roles/:publicId
GET|PUT  /roles/:publicId/permissions
POST   /users/:userId/roles      DELETE /users/:userId/roles/:rolePublicId
GET|POST /delegations            DELETE /delegations/:publicId
```

## Billing
```
GET    /billing/plans | /subscription | /invoices
GET    /billing/invoices/:publicId/download
POST   /billing/upgrade | /downgrade | /cancel | /razorpay/order | /razorpay/webhook
```

## AI Copilot
```
GET|PUT /ai/settings             GET /ai/conversations  GET /ai/conversations/:publicId  DELETE .../:publicId
POST   /ai/chat                  POST /ai/actions/confirm/:draftPublicId
GET    /ai/providers | /ai/usage
```

## Notifications / Documents / Audit / Uploads
```
GET    /notifications            PATCH /notifications/:publicId/read | /read-all
GET|PUT /notification-preferences
GET|POST /document-templates     PUT /document-templates/:publicId
POST   /documents/generate (async)  GET /documents/:publicId/download (signed URL)
GET    /audit-logs               GET /audit-logs/:entityPublicId   POST /audit-logs/export (async)
POST   /uploads/presign | /uploads/confirm    GET /uploads/:publicId/url
```

## Timesheet / Expense
```
GET|POST /projects               PUT /projects/:publicId
GET    /timesheets               GET /timesheets/:publicId  POST /timesheets
POST   /timesheets/:publicId/submit  PATCH .../approve | /reject
GET|POST /expense/claims         POST /expense/claims/:publicId/submit  PATCH .../approve | /reject
GET|POST /expense/travel-requests
```

## Public External API
```
Base /api/public/v1   Auth: X-API-Key
GET    /employees | /employees/:employeeCode | /leave-balances/:employeeCode | /payslips/:employeeCode
POST   /attendance/swipe
```

## Error Codes
| Code | HTTP | Meaning |
|---|---|---|
| UNAUTHORIZED | 401 | not authenticated |
| PERMISSION_DENIED | 403 | no permission |
| TENANT_NOT_FOUND | 404 | tenant missing |
| TENANT_SUSPENDED | 403 | tenant suspended |
| EMPLOYEE_NOT_FOUND | 404 | employee missing |
| VALIDATION_ERROR | 400 | invalid body |
| DUPLICATE_RECORD | 409 | exists |
| PLAN_LIMIT_REACHED | 403 | subscription limit |
| MODULE_NOT_ENABLED | 403 | feature not in plan |
| PAYROLL_LOCKED | 409 | run locked/finalized |
| MAKER_CHECKER_REQUIRED | 403 | needs approval |
| JOB_QUEUED | 202 | async queued |
| INTERNAL_ERROR | 500 | unexpected |
```
