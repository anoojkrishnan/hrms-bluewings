# HRMS Comprehensive End-to-End Test Report — 2026-06-02

## Test Environment
- Admin: `hrms-admin-v3@yopmail.com` / `hrms-v3` tenant
- Employee: `hrms-emp-v3@yopmail.com` / EMP-0002 (John Doe)
- Servers: backend :4000, frontend :5173
- Testing via Playwright MCP

---

## ✅ PASS — Features Working Correctly

| Module | Feature | Result |
|--------|---------|--------|
| Auth | Signup with email verification via yopmail | ✅ PASS |
| Auth | Email verification link received and clicked | ✅ PASS |
| Auth | Login redirects to dashboard | ✅ PASS |
| Auth | Dashboard shows first name ("Good evening, Admin") | ✅ PASS (bug from session #1 fixed) |
| Auth | ESS invite email received and password set | ✅ PASS |
| Organisation | Company created and immediately visible in list | ✅ PASS |
| Organisation | Departments created with company link | ✅ PASS |
| Organisation | Designations created and visible | ✅ PASS |
| Organisation | Locations created with full address | ✅ PASS |
| Employees | Employee created, redirected to EMP-0001 | ✅ PASS |
| Employees | Review step shows resolved names (not publicIds) | ✅ PASS (bug fixed session #1) |
| Employees | Assignment card shows company/dept/designation names | ✅ PASS (bug fixed session #1) |
| Employees | Personal details → avatar shows initials "AU" | ✅ PASS (bug fixed session #1) |
| Employees | Header shows "Admin User" not publicId | ✅ PASS (bug fixed session #1) |
| Employees | Bank account saved with masked number | ✅ PASS |
| Employees | ESS invite sent, button changes to "Disable ESS" | ✅ PASS |
| Employees | Both employees visible in list with status | ✅ PASS |
| Leave | 3 leave types created (AL, SL, CL) | ✅ PASS |
| Leave | Leave application shows "Annual Leave" (not lt__xxx) | ✅ PASS (bug fixed) |
| Leave | Application approved, status → approved | ✅ PASS |
| Leave | Rejection flow with reason | ✅ PASS |
| Attendance | Morning Shift created | ✅ PASS |
| Attendance | Shift Assign modal works with employee checkboxes | ✅ PASS |
| Attendance | Manual Override creates log entries | ✅ PASS |
| Attendance | Logs show EMP-0001/EMP-0002 (not raw IDs) | ✅ PASS |
| Attendance | OT submitted → approved → converted to Comp-Off | ✅ PASS |
| Attendance | Exceptions page renders | ✅ PASS |
| Payroll | Salary components created (BASIC, HRA, SA, PF_EE) | ✅ PASS |
| Payroll | Salary structure created with 4 components | ✅ PASS |
| Payroll | Pay cycle created with pay day/cutoff | ✅ PASS |
| Payroll | Payroll run visible in list (company filter fix) | ✅ PASS (bug fixed) |
| Payroll | Run detail page loads (hooks error fixed) | ✅ PASS (bug fixed) |
| Payroll | Preview → Process → Approve → Finalize → Publish | ✅ PASS (all stages work) |
| Payroll | 2 employees processed, Gross ₹80K, Net ₹76K | ✅ PASS |
| Payroll | Statutory settings (PF ₹1800, PT ₹200) applied | ✅ PASS |
| Payroll | Bank File download button visible on finalized run | ✅ PASS |
| Payroll | JV Export button visible on finalized run | ✅ PASS |
| Payroll | Payslips visible after fix (HR can see all) | ✅ PASS (bug fixed) |
| Payroll | Employee loan visible and schedule shows 10 installments | ✅ PASS |
| Expense | Claim created as draft, submitted, approved | ✅ PASS |
| Configuration | Workflow created and visible in list | ✅ PASS |
| Admin | 12 system roles all present | ✅ PASS |
| Admin | Users list shows both users with names, last login | ✅ PASS |
| Reports | 8 report templates visible with category filter | ✅ PASS |
| Reports | Employee Directory report generates 2 rows | ✅ PASS |
| Reports | Analytics headcount shows total=2 | ✅ PASS |
| Employee Persona | Dashboard greeting "Good morning, John" | ✅ PASS |
| Employee Persona | Sidebar shows only employee sections | ✅ PASS |
| Employee Persona | Leave applications scoped to own (2 apps) | ✅ PASS (bug fixed) |
| Employee Persona | Payslip shows only own payslip (1, not 2) | ✅ PASS (bug fixed) |
| Employee Persona | Loan visible with EMI, no Approve button | ✅ PASS |
| Employee Persona | Access Restricted for payroll/runs | ✅ PASS |
| Employee Persona | Access Restricted for payroll/cycles | ✅ PASS |
| Employee Persona | Access Restricted for companies | ✅ PASS |

---

## ❌ BUGS FOUND & FIXED IN THIS SESSION

| # | Bug | Fix Applied |
|---|-----|-------------|
| 1 | `componentLineSchema` plain object with `type: String` treated as String array by Mongoose → payroll preview/process threw CastError on deductions | Changed to `new Schema({...}, {_id:false})` |
| 2 | `firstDayOfMonth = new Date(year, month-1, 1)` uses local timezone (IST = UTC+5:30) → `2026-05-31T18:30Z` which is before salary effectiveFrom `2026-06-01T00:00Z` → 0 employees processed | Changed to `new Date(Date.UTC(year, month-1, 1))` |
| 3 | `findInputByEmployee` returns null, but code did `inputs.lopDays` → TypeError | Added null guard `rawInputs ?? {}` |
| 4 | `GET /roles` had no `requirePermission` middleware → any authenticated user could list all roles | Added `requirePermission('rbac.role.view')` |
| 5 | `GET /users` had no `requirePermission` middleware → any authenticated user could list all users | Added `requirePermission('rbac.role.view')` |
| 6 | `listPayslips` used `payroll.payslip.view` as HR gate (employees also have this) → employee saw ALL payslips | Changed HR gate to `payroll.run.view` (HR-only); added code→publicId resolution |
| 7 | `listApplications` controller didn't scope to employee's own apps → employee saw no apps (default filter = pending) | Controller now auto-scopes non-HR users to `employeePublicId`; service resolves employeeCode→publicId |
| 8 | `getLoansForEmployee` filtered by `employeeCode` but DB stores `employeeId` as publicId | Added code→publicId resolution |
| 9 | Payslips page returned 422 for admin (no employee linked) | Fixed `findAllPayslips` to make companyId optional |

---

## ⚠️ KNOWN BUGS (not fixed, logged for future)

| # | Bug | Severity |
|---|-----|----------|
| 1 | Run items table shows raw publicIds (`emp__xxx`) instead of employee codes | Medium |
| 2 | Leave applications table shows employee publicId not code | Medium |
| 3 | Headcount by department shows raw `dept__xxx` not department name | Medium |
| 4 | Employee page shows "No employees found" (SELF scope uses employeeCode but query uses publicId) | Medium |
| 5 | Leave Balance "Manage Balances" tab missing for HR admin | Medium |
| 6 | Department parent assignment didn't save ("Frontend" shows "—" for parent) | Low |
| 7 | Salary Register report returns 0 rows (selects rolled_back run instead of payslips_published) | Low |

---

## Verification Checklist

- [x] Admin can complete full payroll lifecycle end-to-end
- [x] Employee payslip shows correct breakdown (₹40K gross, ₹38K net)
- [x] Employee cannot access admin/HR pages (403 on roles, users, companies, payroll runs)
- [x] Employee CAN access their own leave, payslips, attendance, loans
- [x] Dashboard welcome shows first name (not publicId)
- [x] Payroll run detail page opens without hooks error
- [x] Payroll pipeline: Preview → Process → Approve → Finalize → Publish all work
