# Modules

One-liner per module: what it owns, what it does NOT own. Use to decide ownership and prevent scattered logic.

## Platform

- **tenant** — tenant lifecycle (create/onboard/suspend/reactivate/archive), settings, module/feature flags, usage counters, slugs. Not: company setup (organization), billing (billing).
- **organization** — companies/legal entities, departments, designations, grades, bands, locations, cost centers, BUs, divisions, reporting hierarchy, org chart. Not: employee assignment (employee), payroll company mapping (payroll).
- **user** — accounts, email verify, passwords, MFA, sessions. Not: employee profile (employee), role assignment (rbac), login audit (audit).
- **rbac** — roles, permissions, assignments, data-scope resolution, delegation, permission middleware. Not: impersonation tracking (audit).
- **auth** — JWT gen/validation, tenant + org context middleware, login/logout/refresh, SSO/SAML/OIDC. Not: account creation (user), SCIM (integrations).
- **audit** — audit log writes/reads, impersonation sessions, sensitive-field access logs, audit export. Not: generating entries (modules emit, audit persists).

## HR

- **employee** — employee master + all detail sub-collections, lifecycle state machine, onboarding/offboarding, separation, rehire, alumni access, ESS enablement, timeline, custom fields, directory, data-change requests. Not: leave balances (leave), attendance (attendance), salary history compute (payroll), org definitions (organization).
- **leave** — types, schemes, rules, applications, approvals, balances, carry-forward, encashment, comp-off, holidays, weekend policies, year-end, permissions/short leave. Not: attendance correction (attendance), payroll LOP (payroll). Uses workflow.
- **attendance** — schemes, policies, rules, marking (web punch), raw swipes, processing, summaries, exceptions, regularization, OT/comp-off records, shifts, rosters, biometric integration, swipe API. Not: leave deductions (leave), payroll LOP (payroll).
- **holiday** — holiday lists, assignment by company/location, restricted/optional, calendar views. (May be sub-module of leave.)

## Payroll

- **payroll** — salary structures/components, pay groups, cycles, inputs, runs, processing engine, payslips, approval, finalization, rollback, bank advice, snapshots, simulation/preview, reports, FnF, loans, advances, reimbursement payroll-integration, salary revision, arrears, FBP, Form 16/24Q/12BA, accounting export. Not: bank master (organization), accounting protocol (integrations).
- **statutory** — IT slabs, regimes, PF/ESI/PT/LWF config, statutory rule versioning by effective date, compliance calendar link. (Sub-module of payroll.)

## Process

- **workflow** — definitions, versions, steps, conditions, instances, approval processing, escalation, SLA, delegation routing, audit, maker-checker lifecycle. Not: triggering (each module triggers, workflow processes).
- **rule-engine** — rule sets, conditions, formula definitions, effective-date versioning, evaluation engine, conflict detection, simulation. Not: business context of rules.
- **dynamic-forms** — form definitions, field types, conditional fields, versioning, submissions, module mapping. Not: doc generation (documents).

## Communication & Content

- **notifications** — templates, events, email/SMS/in-app/push delivery, delivery logs, retry, preferences, bulk messaging. Not: event triggering (modules emit, notifications deliver).
- **documents** — letter templates, placeholder resolution, PDF generation, generated-doc S3 storage, e-sign readiness, issue history. Not: employee uploads (employee), policy docs (policies).
- **policies** — policy docs, versioning, release, acknowledgement tracking, FAQs, knowledge base.
- **assets** — categories, master, assignment, return, condition, damage/fine, offboarding recovery.
- **tasks** — task/checklist templates, assignment, onboarding/offboarding checklists, due dates, reminders, escalation.
- **helpdesk** — HR service requests, categories, SLA, assignment, status, analytics.
- **employee-cases** — disciplinary/grievance cases, investigation notes, confidential attachments, restricted visibility, separate permission model, audit.
- **compliance-calendar** — statutory due dates, filing reminders, evidence upload, escalation, audit.

## Project & Time

- **timesheet** — central project master, allocation, daily/weekly entry, approval, locking, reminders, utilization/bench/effort/revenue reports. Tenant enable/disable.
- **expense** — categories, travel/advance requests, claims, bill upload, per-diem/mileage, policy validation, multi-level approval, finance verification, settlement, accounting export.

## Analytics & Reporting

- **reports** — standard templates, generation jobs, custom query builder, scheduled reports, export, data warehouse readiness. Not: underlying data (cross-module reads, owned here).
- **analytics** — people analytics, workforce intelligence, utilization/bench/skill-gap, role-based dashboard metrics. (May be sub-module of reports.)

## Integration & Commercial

- **integrations** — API clients/keys, webhooks, accounting systems (Tally/Zoho/QuickBooks/SAP), biometric adapters, ATS/LMS hooks, SCIM config + provisioning, bank payout. Not: internal endpoints, AI provider (ai-copilot).
- **imports** — import batches, validation, error reports, duplicate detection, rollback, history, export jobs. (Shared by multiple modules.)
- **billing** — plans, subscriptions, Razorpay, orders, webhooks, invoices, plan enforcement, upgrade/downgrade/cancel, usage counters. Updates tenant status via events.

## AI

- **ai-copilot** — DB-controlled provider config, provider adapter layer, conversations, messages, RBAC-aware retrieval, action drafts, action confirmation/execution, RAG indexing, usage logging, rate limiting, AI audit, AI settings. Never queries MongoDB directly — all data via module services with permission checks.

## Shared (utilities, not modules)

- **shared/errors** — `AppError`, codes, HTTP mapping.
- **shared/utils** — `generatePublicId`, dates, pagination, encryption, masking.
- **shared/events** — internal event bus for cross-module decoupling.
- **shared/storage** — S3 presign/upload-confirm/metadata.
- **shared/validators** — common Zod schemas (pagination, date range, publicId).
