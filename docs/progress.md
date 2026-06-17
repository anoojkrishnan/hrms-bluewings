# Progress

> Update at the end of every Claude Code session. This is cross-session memory.
> Start of session: read this. End of session: ask Claude Code to update it, then commit.

## Current Phase

**Phase 7: SaaS commercial (public website, billing, subscriptions, limits, flags)** — 🔴 Not Started

## Phases

| # | Phase | Status |
|---|---|---|
| 1 | Foundation (multi-tenancy, auth, RBAC, tenant/company, employee, audit) | 🟢 |
| 2 | ESS, Leave, Attendance foundation | 🟢 |
| 3 | Workflow + Rule engine, dynamic forms, notifications | 🟢 |
| 4 | Payroll core | 🟢 |
| 5 | Advanced attendance + payroll (biometric, shifts, OT/comp-off, claims, loans, FnF) | 🟢 |
| 6 | Reports, analytics, integrations, accounting, bank payout | 🟢 |
| 7 | SaaS commercial (public website, billing, subscriptions, limits, flags) | 🔴 |

🔴 Not Started · 🟡 In Progress · 🟢 Complete · ⚠️ Needs Review

## Modules

| Module | R | C | S | Repo | Types | Val | Test | Status |
|---|---|---|---|---|---|---|---|---|
| tenant | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| organization | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| user | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| rbac | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| auth | ✅ | ✅ | ✅ | — | ✅ | ✅ | ❌ | 🟢 |
| audit | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| employee | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| leave | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| attendance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| holiday | ✅ | — | ✅ | ✅ | ✅ | — | ❌ | 🟢 |
| workflow | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| rule-engine | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| dynamic-forms | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| payroll | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| statutory | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🟢 |
| documents | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| policies | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| assets | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| tasks | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| helpdesk | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| employee-cases | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| compliance-calendar | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| timesheet | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| expense | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| reports | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| analytics | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| integrations | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| imports | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| billing | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| ai-copilot | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |

R=routes C=controller S=service

## Infrastructure

| Item | Status |
|---|---|
| Express scaffold | ✅ |
| MongoDB connection | ✅ |
| BullMQ setup | ✅ |
| AWS S3 config | ✅ |
| JWT auth middleware | ✅ |
| Tenant context middleware | ✅ |
| Org context middleware | ✅ |
| Error handler | ✅ |
| Async audit writer | ✅ |
| Request ID middleware | ✅ |
| Rate limiter | ✅ |
| Logger (Pino) | ✅ |
| Env config (Zod-validated) | ✅ |
| Jest setup | ✅ |
| Frontend Vite scaffold | ✅ |
| Firebase Hosting config | ❌ |
| Shared utils (publicId, masking, pagination, crypto) | ✅ |
| Internal event bus | ✅ |
| BullMQ worker base class | ✅ |
| Frontend React Query + Zustand + Axios | ✅ |
| Frontend Auth/UI/Permission guards | ✅ |
| Frontend CSS theme tokens | ✅ |

## Decisions

| What | Choice | Why | Date |
|---|---|---|---|
| No `interface X extends Document` in Mongoose repos | Plain schemas + `as unknown as T` | TypeScript OOM on infinite type recursion through Mongoose Document | 2026-05-30 |
| BullMQ connection | URL string `{ url: REDIS_URL }` | BullMQ bundles its own ioredis, can't share project Redis instance type | 2026-05-30 |
| `no-misused-promises`: `checksVoidReturn: false` | ESLint config | Express route handlers typed as `() => void`, async handlers are valid | 2026-05-30 |

## Blockers

| Item | Description | Priority |
|---|---|---|
| Unit/integration tests | No test files written yet — Phase 1 + Phase 2 modules need coverage | High |
| Firebase Hosting config | Not configured yet | Low |

## Session Log

| Date | Summary |
|---|---|
| 2026-05-30 | Project docs initialized |
| 2026-05-30 | Phase 1 complete: backend (config, shared, middleware, audit, tenant, user, rbac, auth, organization, app.ts, server.ts, BullMQ workers) + frontend scaffold (styles, types, store, api, hooks, components, guards, pages, router). Backend: 0 tsc errors, 0 lint errors, tests pass. Frontend: 0 tsc errors, 0 lint errors. |
| 2026-05-30 | Phase 2 complete: backend (employee, leave + holiday sub-module, attendance modules — routes, controllers, services, repositories, types, validators, permissions). Frontend: employee.api.ts, leave.api.ts, attendance.api.ts + all Phase 2 pages (EmployeeList, EmployeeDetail, EmployeeCreate, LeaveApplicationList, LeaveBalance, LeaveTypeList, AttendanceDashboard, AttendanceList, AttendanceExceptionList). Sidebar updated with People/Leave/Attendance sections. Backend: 0 tsc errors, 0 lint errors. Frontend: 0 tsc errors, 0 lint errors. |
| 2026-05-31 | Phase 3 complete: 4 backend modules (workflow, rule-engine, dynamic-forms, notifications — 7 files each). Leave service updated: PENDING_APPROVAL status, systemApprove/systemReject, workflow integration in applyLeave, workflow listener registration. Email service: sendRaw added. RBAC: 16 new Phase 3 permissions. Worker registry: WORKFLOW_ESCALATION queue. App.ts: all 4 new routers mounted + event listeners. Frontend: 4 API clients, 5 pages (NotificationList, ApprovalQueue, WorkflowList, RuleSetList, FormList), TopBar bell with unread badge, Sidebar Approvals+Settings sections, 6 new route constants. Backend: 0 tsc errors, 0 lint errors. Frontend: 0 tsc errors, 0 lint errors. Also fixed email verification bug: axios interceptor now skips redirect on public paths (/verify-email etc). |
| 2026-06-01 | Phase 6 complete: Reports module (8 standard templates — employee-directory, leave-summary, attendance-summary, payroll-salary-register, payroll-payout-register, loan-report, expense-claims, overtime-report; CSV export; job tracking). Analytics endpoints (headcount, attrition, payroll-cost) + AnalyticsDashboard.tsx with KPI cards + dept bar chart. Integrations module (API clients with SHA-256 key hashing, webhooks with HMAC-SHA256 delivery, delivery logs, test endpoint). Accounting export (GL ledger mappings, JV CSV generation per payroll run). Frontend: ReportsPage.tsx, AnalyticsDashboard.tsx, ApiClientList.tsx, WebhookList.tsx, AccountingMappings.tsx; "↓ JV Export" button on PayrollRunDetail. New sidebar sections: Reports, Integrations. Backend: reports + integrations modules (6 files each) + payroll accounting extensions. 11 new RBAC permissions. Phase 6 → 🟢. 0 tsc errors, 0 lint errors. |
| 2026-06-01 | Phase 5 complete: Loans (request/approve/reject/EMI schedule/payroll deduction), OT+Comp-Off (submit/approve/convert, balance tracking), FnF (initiate/calculate/approve — notice pay/leave encashment/gratuity/loan recovery), Shift Assignments (assign shift to employees), Expense/Claims module (full backend+frontend). Backend: attendance.repository.ts+service.ts+controller.ts+routes.ts extended; payroll.types.ts+repository.ts+service.ts+controller.ts+routes.ts extended; expense module (6 new files); rbac updated with 14 new permissions. Frontend: LoanList.tsx, OvertimeList.tsx, FnFPage.tsx, ShiftList.tsx (extended with assign modal), ExpenseClaimList.tsx, expense.api.ts. Phase 5 → 🟢. 0 tsc errors, 0 lint errors on changed files. |
| 2026-06-01 | Comprehensive Playwright testing + bug fixes (9 bugs fixed): route ordering for /leave/balances/all, payroll runs list company filter, 401 token refresh in axios interceptor, manual override modal, dashboard name from publicId→firstName, employee avatar + header name, sidebar empty section headers, raw publicIds in employee/leave displays, employee create review step. Phase 4 payroll complete: added salary assignment UI (SalaryAssignmentPage.tsx), payroll inputs UI (PayrollInputsPage.tsx), LOP auto-fetch from attendance, bank file generation endpoint, salary register + payout register reports, PayrollReportsPage.tsx. Backend: 0 tsc errors. Frontend: 0 tsc errors, 0 lint errors. Phase 4 → 🟢. Phase 5 → 🟡 started. |
| 2026-06-16 | Full 43-test Playwright E2E suite written and all passing (43/43, ~46s). New: backend dev-only router (backend/src/modules/dev/dev.routes.ts) with 3 endpoints — force-verify-email, force-verify-employee-ess, generate-password-reset-token — bypasses email delivery for E2E. Dev router mounted first in app.ts (before auth-intercepting routers). Rate limiters bumped in dev mode (globalLimiter 10k, authLimiter 500, strictLimiter 500). E2E spec covers full admin flow (signup→org setup→company/dept/designation/location→leave types→employee create→ESS invite→leave apply/approve→salary component/structure/pay cycle→payroll run→all module pages) and full employee ESS flow (set password→login→punch in→apply leave→view balance→notifications→attendance→payslips→expense claim→update profile). |
