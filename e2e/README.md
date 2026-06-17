# HRMS E2E Test Suite

Playwright tests covering the full HRMS workflow as HR Admin and Employee.
Uses **yopmail.com** for real email delivery — no mocking.

## What it tests

**Admin flow (HR Admin):**
- Sign up + email verification via yopmail
- Org setup: company, department, designation, location
- Leave type creation
- Employee creation + ESS invite
- Salary components, structures, payroll cycle
- Payroll run: create → preview
- Attendance, shifts, overtime, loans, FnF
- Expense claims, approval queue
- Workflows, rule sets, dynamic forms
- Reports, analytics, payroll reports
- Integrations: API clients, webhooks
- Roles, users, settings, notifications

**Employee flow (ESS):**
- Receive ESS invite email → set password → login
- View dashboard
- Apply for leave
- View leave balance
- Submit expense claim
- Update personal details
- View notifications
- View own attendance, payslips

## Prerequisites

1. Backend running on port 4000: `cd backend && npm run dev`
2. Frontend running on port 5173: `cd frontend && npm run dev`
3. MongoDB and Redis running
4. SMTP configured (emails sent to yopmail.com)

## Setup

```bash
cd e2e
npm install
npx playwright install chromium
```

## Running

```bash
# Headless (default)
npm test

# Headed — watch the browser
npm run test:headed
# or
HEADLESS=false npm test

# Debug mode (step through)
npm run test:debug

# UI mode (interactive)
npm run test:ui
```

## Custom base URL

```bash
BASE_URL=https://your-staging-url.com npm test
```

## Screenshots

Failure screenshots + all module screenshots are saved to `e2e/screenshots/`.

## Notes

- Each run generates unique yopmail addresses (`hrms-admin-<timestamp>@yopmail.com`) to avoid conflicts.
- Tests run **serially** — order matters (employee code is passed between tests).
- yopmail check waits up to 90 seconds for email delivery.
- If an email isn't delivered, check your SMTP config and `APP_URL` in `backend/.env`.
