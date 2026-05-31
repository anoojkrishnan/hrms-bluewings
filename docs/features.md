# Feature Coverage

Complete checklist mapped to the requirements spec. Every item must be implemented. Nothing here is optional unless marked.

## Core Architecture (§2)

- Multi-tenant shared DB, document-level isolation by `tenantId`.
- Multi-org access: one user, multiple tenants/companies, different roles per context. Org switcher, active org context.
- Group company structure, multiple legal entities, branches, departments, locations, cost centers, business units, work locations.
- Tenant config, module enable/disable per tenant, subscription-based feature access.
- Tenant onboarding, suspension, reactivation, deletion/archive.
- `publicId` policy: opaque external IDs, backend resolves to `_id` under tenant+permission checks, no cross-tenant lookup by public ID alone.
- Tenant-aware background jobs, queues, scheduled jobs, import/export.
- Future: separate DB per enterprise tenant, tenant-level backup/export.

## User Portals (§3)

- **Platform Super Admin:** manage tenants, plans, plan-wise feature access, usage, billing, employee-count usage, tenant admins, global health/integrations/templates/announcements, platform audit, support impersonation.
- **Org/HR Admin:** employees, org structure, HR policies, payroll/attendance/leave config, reports, documents, workflows, communication, onboarding/offboarding, roles/permissions.
- **Manager Self-Service:** team view, approve/reject leave/attendance-exceptions/overtime/claims, team attendance, team leave calendar, initiate requests, performance/disciplinary notes, dashboards.
- **Employee Self-Service:** profile view/edit allowed fields, apply leave, balance, mark/view attendance, payslips, IT declaration, POI upload, reimbursement, policies + acknowledge, letters/documents, tasks/checklists, helpdesk.
- **Alumni Portal:** login, relieving/experience letters, FnF details, historical payslips, update contact, alumni announcements.
- **Web-only model:** all portals fully responsive desktop/tablet/mobile. No native app, no app-store, no native push SDK.
- **Browser attendance:** geolocation, IP validation, browser-camera selfie, device/browser fingerprint, geofence; graceful permission handling; tenant fallback rules; clear messages; full audit.
- **Public website + auth entry points (§3.7):** home, features, pricing, security, faq, contact, login, signup, dashboard. Login/Signup vs Go-to-dashboard behavior. Free self-onboarding up to 5 employees.
- **SEO (§3.8):** unique title/description/canonical/OG/Twitter per page, favicon/manifest/theme-color, structured data (Organization, SoftwareApplication, FAQ, Breadcrumb), robots.txt, sitemap.xml, semantic HTML/alt/keyboard nav.

## Auth & Security (§4)

- Email/password, SSO (SAML/OIDC), IdP integration, MFA (OTP/authenticator/email), password reset/forced-change/expiry, session mgmt, session listing, logout-all, lockout, CAPTCHA.
- **SCIM readiness (§4.2):** tenant SCIM config + credentials, provision/deactivate, field + group sync, group→role/company/scope mapping, dry-run, audit, no isolation/RBAC bypass.
- **Authorization (§4.3):** RBAC + permissions + data scope. Action-level: view/create/edit/delete/approve/reject/export/import/configure. Field-level, report-level, document-level, payroll/salary visibility. Data scopes: self, direct reports, direct+indirect, department, location, BU, cost center, company, tenant.
- **Delegation/proxy (§4.4):** temporary approval delegation, proxy approver, HR/finance proxy, start/end dates, audit, sensitive-action restrictions.
- **Audit security (§4.5):** login/failed-login, permission/role-assignment, payroll/salary/profile change, document access, report export, API access, impersonation.
- **Impersonation (§4.5):** permission-controlled, off by default, reason required, full audit, visible banner, sensitive actions blocked, tenant-visible history, no isolation/RBAC/maker-checker/audit bypass.
- **Masking (§4.6):** mask sensitive fields by default everywhere; reveal only with permission + logging.

## Tenant/Company/Org Setup (§5)

- Tenant fields, public signup self-onboarding (slug uniqueness, email verify, auto-create tenant+org+admin+default roles+settings+checklist, free plan default, anti-abuse, terms/privacy consent).
- Company/legal entity mgmt: registration, tax, PF/ESI/PT/LWF, addresses, logo, signatories, bank, payroll mapping, country/state.
- Org structure: departments, sub-departments, designations, grades, bands, locations, work locations, cost centers, BUs, divisions, regions, teams; reporting (reporting/matrix/project/department/HRBP/functional); effective-dated hierarchy + history; org chart views; export; used for RBAC scope/approvals/reviews/planning/dashboards.

## Onboarding & Dashboards (§6)

- First-launch admin walkthrough (skippable, resumable, progress, why-it-matters, module-based paths).
- Setup flow: company → org structure → roles → employees → leave → attendance → shift → payroll → statutory → templates → notifications → ESS.
- Dashboard next-steps when no data; setup progress %; required vs optional; module readiness; warnings.
- Setup progress page: checklist per module, statuses (Not Started/In Progress/Completed/Skipped/Blocked/Needs Review), importance + business impact, configure links, owner, due date, notes, audit, mark N/A, reopen, reports.
- Empty-state standards: title + explanation + RBAC-aware CTA, tutorial links, import options, sample templates.
- Skeleton loading: dashboards/tables/cards/forms/profile/reports/settings; keep shell visible; progress indicators for long actions; retry on failure.

## Dynamic Forms (§8)

- Form builder: text/number/date/dropdown/checkbox/radio/file/textarea, conditional fields, required/optional, validation, visibility rules, role-based field access, module mapping (profile/onboarding/claims/exit/surveys/policies), approval mapping, versioning, submission history.
- Custom fields: employee, company, claim, asset, payroll, attendance.

## Workflow Engine (§9)

- Custom workflows, multi-level/sequential/parallel/conditional approvals, auto-approve/reject, escalation, delegation, SLA/time escalation, versioning, audit, simulation/test mode.
- Conditions: department/location/grade/designation/BU/cost center/leave type/claim amount/payroll component/attendance exception/employee status/employment type/custom fields.
- Modules: leave, attendance regularization, overtime, comp-off, profile change, claims, loans, salary revision, promotion/transfer, onboarding, offboarding, asset requests, document verification, payroll finalization.

## Maker-Checker (§10)

- Salary revision, payroll finalization, payroll input import, FnF, bank detail change, PF/ESI/PT/tax/statutory change, role/permission change, tenant admin creation, bulk employee/salary/attendance import, company/entity config, integration credentials.
- Maker submits, checker compares old/new, approve/reject/request-correction, apply only after approval, maker≠checker (configurable), multi-level checker, full audit, rollback where feasible, API/import-driven coverage.

## Rule Engine (§11)

- Condition + formula builder, effective dates, versioning, simulation, priority, conflict detection, tenant/org/segment-specific rules.
- Use cases: leave accrual/eligibility/carry-forward/encashment, attendance late mark, half/full-day, overtime, comp-off eligibility, payroll earnings/deductions, tax, probation, notice period, shift assignment, holiday eligibility.

## Leave (§12)

- Setup: types, schemes, rules, year/cycle, weekend policy, holiday mapping, reasons, reviewer settings, access rights, future-eligible balance, manager application, reminders, encashment config.
- Ops: summary, apply, apply-on-behalf, grant, approve/reject, cancel, revoke, balance view, calendar, team calendar, history, attachments, comments, workflow, reviewer assignment, recalculation, year-end, carry forward, encash.
- Permissions/short leave: apply, bulk apply, override hours, workflow, monthly limits, policy restrictions.
- Overtime/comp-off linked: consider/ignore OT, auto-grant OT, comp-off balance/approval/expiry, OT→comp-off conversion.

## Attendance (§13)

- Config: schemes, policies, rules, cycles, shift precedence, working days, override weekends, change working days, office locations, geofence, browser/device detection, elapsed timer, selfie/face config, access code, lock config, comp-off policy, OT policy.
- Marking: web in/out, geolocation punch, selfie punch, face-recognition punch, biometric, RFID/card, swipe API, manual, bulk upload, shift-based auto.
- Web rules: punch from ESS, optional location/selfie/IP/device/geofence, GPS accuracy threshold, grace period, duplicate prevention, missed-punch, late/early detection, out-of-location exception workflow, manual correction with approval, regularization.
- Web punch audit: tenant/org/employee IDs, public txn ID, punch type, server + local timestamp, timezone, IP, user agent, fingerprint, lat/long, accuracy, geofence result, selfie ref, rule result, approval status, source=web_portal.
- Fallback handling per tenant policy for denied geo/camera, weak GPS, outside geofence, unsupported browser.
- Ops: summary, sign-in status, email notifications, daily summary, individual/bulk info, manual override, review/resync swipes, add exception, regularization, approve exceptions, process, finalize, lock/freeze, correction audit.
- Device ecosystem: biometric integration, vendor config, device-location mapping, employee biometric ID mapping, swipe import/API, API key gen, retry syncs, sync status, normalization layer, duplicate/missing swipe detection, offline sync, timezone normalization.
- Shift/roster: creation, assignment, rotational/night/split shifts, weekly offs, swaps + manager approval, roster planning, bulk upload, pattern templates, manpower planning, shift allowance mapping, split-shift reports.

## Holidays/Calendar (§14)

- Holiday lists, country/state/location-specific, optional/restricted holidays, employee/team/leave/work/payroll/attendance-cycle calendars.

## Payroll (§15)

- Setup: payroll company, cycle, pay groups, grouping, salary structures, components (earnings/deductions/benefits/reimbursements/employer+employee contributions), pay item groups, preferences, payslip layout, calendar, lock dates, approvers.
- Salary structure/revision: create/assign, view, revise, compare, export, effective-dated, promotion-based, arrears, increment letters, approval workflow.
- Inputs: monthly inputs, LOP, attendance-based LOP, OT, bonus, incentive, variable pay, deductions, fines/damages, reimbursements, loan deductions, arrears, one-time, bulk import, validation.
- Processing: preview, calculation, recalculation, freeze/lock, approval workflow, finalization, payslip gen + publish, bank advice, payout file, rollback before finalization, version snapshots, error reports.
- FnF (§15.5): trigger from separation, notice pay, leave encashment, gratuity, bonus/incentive settlement, recovery deductions, loan closure, asset recovery deductions, final payslip, approval, settlement letter.
- Tax/statutory (§15.6): IT slabs, IT declaration, POI collection + approval, regime selection, TDS, Form 16 config + gen, Form 24Q config + reports, Form 12BA mapping, PF/ESI/PT/LWF config, PT location mapping, PT slabs, filing location, statutory reports, effective-dated compliance updates.
- FBP (§15.7): policy create/assign, declaration, claim submission, proof upload, workflow, tax impact.
- Reimbursement/claims (§15.8): item setup, group custom fields, submission, attachments, workflow, reviewer, limits, monthly/yearly caps, payroll integration, payment status.
- Loans (§15.9): request, workflow, disbursement, EMI schedule, payroll deduction, closure, reports.
- Payroll reports (§15.10): payout/control/accuracy/activity, income tax, MIS, loan, reimbursement, statutory, bank advice, salary register, component-wise, LOP, arrear.
- Simulation/preview (§15.10): preview without lock, employee-wise breakdown, compare vs previous cycle, highlight anomalies, corrections before finalize, variance reports, separate snapshot, no publish/bank/notify during preview.
- Statutory versioning (§15.11): effective-date rules, slab changes by FY, state/region updates, history, correct-version calculation, controlled update+approval, audit, valid tenant overrides only.

## Accounting/Finance (§16)

- Payroll→accounting: component→ledger mapping, dept/cost-center→dimension, JV generation, JV templates, export, push to systems, cost allocation, employer-contribution/reimbursement/loan accounting.
- Integrations: Tally, Zoho Books, QuickBooks, SAP/ERP, custom APIs; credentials, logs, retry, manual export, mapping validation.
- Bank/payment: company/employee bank setup, branch details, payout file gen, payment status, reconciliation import, payment advice.

## Timesheet & Projects (§17)

- Central project master: codes/names, client mapping, PM mapping, dept/BU/cost-center mapping, types (billable/non-billable/internal/support/maintenance/R&D/admin), dates, statuses, allowed task categories, allowed allocations, restrict-to-allocated, archival preserves history.
- Allocation: multi-project, %, dates, billable flag, history, bench tracking, upcoming end dates, used for utilization/bench/planning.
- Entry/approval: daily/weekly, project+task hours, billable/non-billable, notes, draft, submit, approval (RM/PM/dept head/workflow), rejection, correction/resubmit, locking, reminders, compliance reports.
- Integration/reporting: export for payroll/invoicing/accounting/PM, utilization, project/client effort, billable vs non-billable, bench, allocation vs actual, revenue-readiness. Tenant enable/disable.

## Expense & Travel (§18)

- Categories, travel/advance requests, claim submission, bill upload, OCR-ready storage, per-diem, mileage, policy validation (amount/category/location/grade/travel-type), multi-level approval, finance verification, payment status, settlement reports, accounting export, link to employee/dept/cost-center/project/client.

## Compliance Calendar (§19)

- PF/ESI/PT/TDS/LWF due dates, filing reminders, payroll calendar, tenant + entity-specific tasks, reminders, escalation, evidence upload, audit.

## Employee Relations / Cases (§20, optional)

- Disciplinary/grievance cases, warning letters, investigation notes, confidential attachments, owners, status, timeline, restricted visibility, separate permission model, audit, link to letters/documents.

## Compensation Planning (§21, future)

- Increment/promotion cycles, dept/BU salary budget, manager recommendation, HR moderation, finance review, workflow, effective-dated revision, increment letters, history, budget utilization, eligibility rules.

## Workforce Planning (§22, future) & Intelligence (§23)

- Headcount/open-position/succession planning, critical roles, skill-gap mapping, manpower reports, planned vs actual, ATS link.
- Employee insights: productivity, allocation, timesheet health, billable contribution, skill profile/gaps, learning areas, planned vs taken leave, attendance pattern, WFH/WFO, pending actions.
- HR/mgmt metrics (RBAC-scoped): productivity, bench, utilization, allocation, revenue readiness, attendance/leave patterns, WFH/WFO, skill readiness/gaps, learning needs, performance/attrition where configured.
- All analytics respect isolation, RBAC, scope, masking, audit.

## Reports & Analytics (§24)

- Standard: generate/download/recent/schedule/email, export Excel/CSV/PDF, permissions, audit. Categories: employee, leave, attendance, payroll, claims, loan, compliance, audit, org, custom-field.
- Query builder: select fields, filters, grouping, sorting, save, role-based sharing, advanced filters.
- Analytics hub: headcount, attrition, attendance/leave/payroll-cost trends, dept/location analytics, diversity (where legal), probation, hiring, custom + drill-down dashboards.
- Data warehouse readiness: event tracking, audit-event table, reporting-friendly model, incremental export, API extraction, BI readiness.

## Communication & Content (§25–27)

- Engagement (§25): bulletins, announcements, engagement module, policy releases, company forms, FAQs, bulk email/messages, birthday/anniversary reminders, polls/surveys, acknowledgment tracking, audience segmentation.
- Policies/KB (§26): create/release/upload, versioning, acknowledgement + reminders, FAQs, forms, templates, role/location visibility.
- Consent/acknowledgement (§27): track who/when/IP/device/version, re-ack on version change, status reports, reminders, no backdating unless authorized, retain after exit per policy.

## Documents & Letters (§28)

- Dynamic templates, placeholder variables, offer/appointment/confirmation/increment/promotion/transfer/warning/experience/relieving letters, salary certificate, custom, bulk gen, PDF, e-sign, signatory mapping, template versioning, employee download, issue history.

## Asset Mgmt (§29)

- Groups, categories, master, assignment, return, condition, damage/fine, offboarding recovery, documents, audit history, employee summary.

## Tasks & Checklists (§30)

- Task/checklist templates, assign to employee/HR/admin/manager, onboarding/offboarding/dept-specific, due dates, reminders, status, escalation, comments, attachments.

## Helpdesk (§31)

- Raise request, categories/subcategories, SLA, assignment rules, comments, attachments, status, reopen/close, analytics.

## ATS / Performance / Learning Readiness (§32–34)

- ATS (§32): candidate import API, candidate→employee conversion, offer integration, joining docs, preserve hiring source, hooks; future: requisitions, pipeline, scheduling, offer mgmt.
- Performance (§33): goals/KRAs, cycles, manager + self review, rating scales, appraisal workflow, increment/promotion recommendation, salary-revision integration.
- Learning (§34): training records, course assignment, certification tracking, expiry reminders, LMS readiness, SCORM/xAPI if added.

## Settings (§35–37)

- General: company/system settings, sequence + employee number series, password options/complexity, list of values, bank/branch, company state, currency, service provider, event notification, API users, perf debug, timezone, date/time format, language, branding.
- Directory privacy (§36): configurable field visibility, permitted fields only, never expose sensitive, scope-respecting, hide/show controls, export requires permission.
- Employee settings (§37): number series, notice period, segments, filters, categories, probation, profile setup, leaving reasons, alumni access, directory config, mail handlers, disable ESS, info setup, onboarding form config, rehire check, web notifications.

## Feature Flags & Tenant Config (§38)

- Module/feature enable-disable per tenant, plan-based access, beta rollout, tenant/org settings, usage/employee/storage/API-rate limits.

## Subscription & Billing (§39)

- Plans: Free (≤5), Starter (≤25), Growth (≤100), Business (custom). Configurable from Super Admin, not hardcoded.
- Free rules: signup default, ≤5 active, alumni excluded, block over-limit add, upgrade prompts, no blocking existing data, reasonable storage/report/integration limits.
- Paid mgmt: view plan/usage/storage, compare, upgrade/downgrade/cancel/reactivate, monthly↔yearly, billing history, invoices, billing contact, GST details, payment method.
- Razorpay: customer creation, order/subscription, one-time + recurring, signature-verified webhooks, internal billing records, store only references, no frontend secrets, checkout with backend order, handle all payment states, retry, webhook idempotency, billing audit.
- Upgrade/downgrade/cancel rules: upgrade immediate, downgrade at cycle end, over-limit warnings, cancel keeps active until period end, grace period, warnings, restrict non-essential after grace, never silent data delete.
- Enforcement (frontend + backend, backend authoritative): active employees, modules, storage, API rate, report limits, custom roles/workflows/forms, integrations, SCIM/SSO/API.
- Collections: `plans tenantSubscriptions subscriptionEvents billingInvoices billingPayments razorpayWebhookEvents usageCounters planFeatureMatrix`.

## Notifications (§40)

- Channels: email, SMS, WhatsApp (optional), web push (if enabled), in-app, webhooks.
- Features: templates, variables, tenant templates, event triggers, scheduled reminders, escalation, digest, delivery status, retry, preferences.
- Events: joined, ESS invite, leave applied/approved/rejected, attendance exception, payroll processed, payslip published, doc expiring, probation/contract ending, policy pending ack, separation initiated.
- Preference center: email/browser prefs, event opt-in/out, digest frequency; mandatory compliance/security/payroll/approval notifications non-disableable; tenant defines configurable categories.

## Integration Layer & APIs (§41)

- API mgmt: API users, key gen, OAuth client, rate limiting, audit, tenant-scoped, webhook subscriptions + retry, documentation.
- Integrations: biometric, accounting, banks, email/SMS/WhatsApp providers, IdP, ERP, ATS, LMS, Slack/Teams.

## Import/Export/Migration (§42)

- Excel/CSV import, bulk employee/profile-pic/document import, payroll input, attendance, leave balance, asset import, preview, validation, error report, duplicate detection, rollback batch, history, migration tools, export templates.

## Search & Global Actions (§43)

- Global employee search, search actions, search by ID/name/email/dept/location, permission-aware quick actions, recent records, saved filters, employee filters.

## Compliance, Retention, Privacy (§44–45)

- Retention policies, employee/alumni/payroll/document retention, legal hold, data export on request, anonymization, consent tracking, privacy/terms acceptance, country compliance.
- Soft delete + restore (§44.1): soft delete for employees/payroll/attendance/docs/workflows/rules/settings/masters, `deletedBy/deletedAt/deletionReason/restoreHistory`, authorized restore, hidden from normal views, controlled hard delete, full audit.
- Tenant export & residency (§45): full data export, file export, audit export, backup restoration, archival after closure, retention/legal hold, residency readiness, region-aware storage, separation of backup/export/archival.

## Audit & Versioning (§46)

- Audit fields: actor, tenant, org, action, module, entity type+ID, old/new value, timestamp, IP, device, request ID. Immutable.
- Version: payroll runs, salary revisions, policies, doc templates, workflows, rules, profile changes, leave/attendance policies.

## API Design (§48)

- REST recommended. Enforce tenant context, no body-trusted `tenantId`, authenticated user context, pagination, filtering/sorting, consistent errors, idempotency keys for payroll finalization + imports.
- Frontend routing: no raw `_id`, use publicId/slug/code, backend resolves under tenant context, no authorization inferred from visible IDs.

## UI/UX (§49)

- Role-based nav, org switcher, global search, quick actions, dashboard widgets, filterable tables, permission-based export, bulk actions, audit/history view, responsive.
- Modern light theme default + dark switch, calm enterprise palette, high contrast, design tokens, WCAG.
- Role dashboards: super admin, HR admin, manager, employee, finance/revenue, leadership — each with defined widgets + no-data/incomplete-setup guidance. Never show misleading zero analytics when cause is missing config.

## PWA Readiness (§50)

- Responsive mobile browser UI, optional installable shortcut, offline-friendly shell (future), browser push readiness (if enabled), permission-denial fallback, no native app dependency.

## Background Jobs (§51)

- Monitor payroll, simulation, imports, reports, attendance sync, web attendance, notifications, accounting export, doc generation, tenant export/archival.
- Track queued/processing/completed/failed/cancelled/retried, tenant context per job, admin-visible status/errors, permission-based retry/cancel, tenant isolation, no cross-tenant blocking, audit + correlation IDs.

## Localization (§52)

- Externalized labels, configurable date/time/number/currency, tenant default locale, user locale, locale-aware exports, localizable templates, country/region payroll labels.

## AI Copilot (§53)

- RBAC-aware, session-derived context, no body-trusted IDs, no `_id`/internal/secret exposure, same RBAC/scope/masking/audit, answers only permitted data, refuses/redirects unauthorized, labels AI answers, provides friendly source references.
- **Provider config (§53.2):** configurable per tenant/org, DB-controlled, OpenRouter + OpenAI initially. Super admin global enable/disable; tenant selects from plan-allowed. Keys backend-only. OpenRouter models `auto`/`free`; OpenAI `gpt-4o-mini`/`gpt-4.1-mini`. DB-controlled enablement, one active provider+model, optional module override, fallback to default, audit on change. AI Settings page. Adapter layer normalizes providers/errors; fallback never switches to unauthorized provider.
- Role capabilities (§53.3): employee/manager/HR/finance/leadership/super-admin examples.
- RBAC + scope enforcement (§53.4): permission resolver before every retrieval/action, no direct Mongo, same masking, safe refusal, never reveal hidden record existence.
- Actions + confirmation (§53.5): low-risk drafts allowed; critical actions need explicit confirmation + maker-checker; review screen showing changes; audit with prompt/action summary + affected public IDs; save-as-draft first.
- RAG (§53.6): tenant-approved sources, tenant-isolated index with `tenantId/organizationId/documentPublicId/version/scope`, prefer latest active version, no cross-tenant reuse, admin enable/disable + reindex.
- Modules (§53.7): ESS Q&A, HR policy Q&A, payroll explanation, attendance/leave, timesheet, setup, report builder, data import, doc drafting, helpdesk. Future: anomaly, workforce intelligence, skill-gap, 1:1 prep, compliance, leadership insights.
- UI (§53.8): floating entry, dedicated page, role/page-aware suggestions, history per user+tenant, clear history, loading, safe fallback, distinguish answer vs suggested vs executable action, permission-aware empty states.
- Governance (§53.9): metadata logging, sensitive-access logging, AI-triggered report logging, tool-call/failure/blocked tracking, tenant-wide + module enable/disable, retention control, usage dashboard, cost tracking, rate limits per user/tenant/plan, safety filters, no final hiring/promotion/termination/disciplinary/payroll/rating decisions, signals not judgments.
- Plan control (§53.10): Free none/public-help, Starter ESS+policy, Growth HR/report/setup/import, Business payroll/workforce/skill/advanced. Track usage, enforce limits, upgrade prompts, hide disallowed features.
- AI collections (§53.11): see schema.md.

## Non-Functional (§54)

- Performance: thousands of employees, paginate, background heavy jobs, queues, cache reference data, tenant-scoped indexes.
- Scalability: horizontal backend, worker architecture, domain-separated queues, storage abstraction, stateless API.
- Reliability: retry, status tracking, dead-letter queue, import rollback, recoverable payroll, no duplicate notifications.
- Security: encrypt sensitive at rest, TLS, hashed passwords, secure tokens, IDOR protection, rate-limit auth + public APIs, validate + malware-scan uploads.
- Observability: centralized logs, request tracing, job + error monitoring, audit, integration health, perf metrics.
- Backup/DR: DB backups, PITR, document backups, tenant export, DR plan.

## Implementation Guidance (§58)

DB schema with isolation first → auth + RBAC middleware → modules in order (tenant/company, users/roles/permissions, org structure, employee master, workflow, rule engine, leave, attendance, payroll, maker-checker, expense/travel/claims, timesheet, reports/analytics, notifications/integrations, SCIM). No hardcoded rules/flows/formulas. Every API checks tenant+permission. Every write audits. Every import validates + reports errors. Every long op queued. Build shared UI patterns (skeletons, empty states, setup guidance, walkthroughs, progress) early.
