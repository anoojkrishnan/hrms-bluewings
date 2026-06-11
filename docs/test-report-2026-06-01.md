# HRMS Functionality Test Report — 2026-06-01

## Test Setup
- Tenant: `hrms-test-co` (HRMS Test Co Pvt Ltd)
- Admin email: `hrms-tenant-admin@yopmail.com`
- Employee: `hrms-employee@yopmail.com` (EMP-0001, John Doe)
- Tested via Playwright MCP against local dev servers (frontend :5173, backend :4000)

---

## ✅ Working

| Area | Detail |
|------|--------|
| Auth — Signup | Creates tenant, user, sends verification email |
| Auth — Email Verification | Token-based link works, `?activated=true` redirect |
| Auth — Login/Logout | JWT session established, redirect to dashboard |
| Auth — Auth guard | Unauthenticated requests redirect to `/login?from=...` |
| Auth — ESS Invite | Password-set email delivered, token-based reset works |
| Org — Companies | Create, list, counter updates |
| Org — Departments | Create with company link, tree renders |
| Org — Designations | Create, list |
| Org — Locations | Create with full address, list |
| Employees — List | Empty state + status filter |
| Employees — Create | 3-step wizard, auto-assigns `EMP-0001` |
| Employees — Personal Details | Add/edit via modal, saves correctly |
| Employees — ESS Invite | Fires API, button toggles to "Disable ESS", email delivered |
| Employees — Timeline tab | Renders (empty state correct) |
| Leave Types | Create with all config fields, list updates |
| Leave Applications | Apply on behalf, status filter, approve action works |
| Attendance Logs | Page renders with date filter |
| Attendance Exceptions | Page renders with status filter |
| Payroll Dashboard | Renders with company count, quick links |
| Salary Components | Create (fixed amount), list |
| Salary Structures | Create with component picker, list |
| Pay Cycles | Create with company link, list |
| Payroll Run Detail | Renders correctly, Preview → status `preview`, Process button appears |
| Statutory Settings | PF/ESI/PT/TDS toggles, save works (200) |
| Workflows | Create with module selector, list |
| Approval Queue | Renders empty state |
| Rule Sets | Page renders |
| Dynamic Forms | Page renders |
| Roles | All 12 system roles auto-created on tenant creation |
| Users | Lists all users with status, email verified, last login |
| Settings hub | All section links render |
| Notifications | Page renders, mark-all-read button present |
| RBAC enforcement | Employee blocked from `/roles` with "Access Restricted" |
| Employee sidebar scoping | Correct — no admin/config, payroll shows payslips only |

---

## ❌ / ⚠️ Bugs Found

### Bug 1 — HIGH: Raw publicIds displayed instead of resolved names
**Locations:** Employee detail Assignment card, Leave application list (Employee + Leave Type columns), Employee create Review step.
**Cause:** API returns raw publicId strings for related entities (companyId, departmentId, designationId, locationId, employeeId, leaveTypeId) without populating display names. Frontend renders whatever the API sends.
**Fix:** Backend `employee.service.ts` and `leave.service.ts` must populate related entities (or return display name fields). Frontend display components need to resolve publicIds to names.

### Bug 2 — HIGH: GET /leave/balances/all returns 404
**Location:** `backend/src/modules/leave/leave.routes.ts`
**Cause:** Route ordering — `GET /balances/:employeeCode` is registered before `GET /balances/all`, so Express matches "all" as an employeeCode.
**Fix:** Move `GET /leave/balances/all` route registration before `GET /leave/balances/:employeeCode`.

### Bug 3 — HIGH: Payroll runs list never shows runs (missing company filter)
**Location:** `frontend/src/pages/app/payroll/PayrollRunList.tsx`
**Cause:** Frontend calls `GET /payroll/runs?page=1&limit=20` with no company filter. Backend repository requires companyId to return results (returns empty when omitted).
**Fix:** Either (a) fix the backend to return all tenant runs when no companyId is given, or (b) fix the frontend to pass a selected company filter.

### Bug 4 — HIGH: 401 on payroll run creation logs user out instead of showing error
**Location:** `frontend/src/lib/api/` axios interceptor
**Cause:** The 401 interceptor redirects to login (correct for expired sessions) but does not attempt a token refresh first. First payroll run creation attempt always fails on a fresh re-login due to stale cookie.
**Fix:** Implement token refresh retry in the axios interceptor before redirecting to login on 401.

### Bug 5 — MEDIUM: Attendance Manual Override button has no form/modal
**Location:** `frontend/src/pages/app/attendance/AttendanceList.tsx`
**Cause:** Button toggles active CSS state but no dialog/form is rendered.
**Fix:** Implement the manual override modal (employee, date, in-time, out-time fields) wired to `POST /attendance/override`.

### Bug 6 — MEDIUM: Dashboard welcome shows user publicId instead of first name
**Location:** `frontend/src/pages/app/Dashboard.tsx`
**Cause:** Welcome message uses `user.userId` (publicId) instead of resolving the user's display name from the auth/me response.
**Fix:** Use `user.name` or `user.firstName` from the auth context instead of `user.userId`.

### Bug 7 — MEDIUM: Employee avatar initials don't update after personal details saved
**Location:** `frontend/src/pages/app/employees/EmployeeDetail.tsx`
**Cause:** Avatar initials computed from stale data not re-fetched after personal details mutation.
**Fix:** Invalidate/refetch the employee query after a successful personal details save.

### Bug 8 — LOW: Sidebar shows empty section headers for Employee persona
**Location:** `frontend/src/components/layout/Sidebar.tsx`
**Cause:** Section headings (Organisation, Configuration, Admin) render unconditionally; links inside are hidden by RBAC guards but the header itself is not hidden.
**Fix:** Conditionally render each section header only when at least one of its child links is visible.

### Bug 9 — LOW: Leave balance init has no feedback when /all 404s
**Location:** `frontend/src/pages/app/leave/LeaveBalance.tsx` + `backend/src/modules/leave/leave.routes.ts`
**Cause:** Init shows "✓ Done" but Manage tab silently shows "No balances" because `GET /balances/all` 404s (see Bug 2). No error toast shown.
**Fix:** Resolved by Bug 2 fix. Additionally show an error toast when the fetch fails rather than showing empty state.

---

## 🚧 Not Tested
- HR Manager / Payroll Admin / Department Manager persona flows
- Rule Set creation and simulation
- Dynamic Form builder CRUD
- Full payroll processing pipeline (Process → Finalize → Publish)
- Salary assignment to employee
- Attendance punch via employee ESS (needs geolocation)
