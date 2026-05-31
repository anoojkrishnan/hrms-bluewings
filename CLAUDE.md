# HRMS / HCM Multi-Tenant SaaS Platform

Multi-tenant HRMS/HCM SaaS (greytHR-class). Web-only. India-focused payroll, localization-ready.

## Tech Stack

- **Frontend:** React + Vite SPA, TypeScript, Firebase Hosting. No Next.js unless SSR is explicitly required.
- **Backend:** Node.js + Express.js only. No NestJS, no Fastify. TypeScript.
- **Database:** MongoDB, shared cluster, shared collections, tenant-isolated by `tenantId`.
- **Storage:** AWS S3, private buckets, tenant-scoped prefixes, signed URLs only.
- **Queue:** Redis + BullMQ.
- **Payments:** Razorpay.
- **AI:** OpenRouter + OpenAI, database-controlled provider/model selection.

## Architecture

Modular monolith: one deployable Express app, internally split into domain modules with enforced boundaries. No microservices initially; design boundaries so modules can be extracted later.

Module folder shape: `src/modules/<module>/<module>.{routes,controller,service,repository,types,validator,permissions,events,test}.ts`

## Non-Negotiable Rules

- Every tenant-owned document includes `tenantId`. Every query filters by `tenantId` from the authenticated session — never from request body.
- Never expose MongoDB `_id` externally. Use `publicId` / `employeeCode` / slugs in all routes and API responses.
- Never hardcode tenant rules, approval flows, or payroll formulas. All configurable via database.
- Every write creates an audit log.
- Every long-running operation runs through a queue (payroll, imports, exports, reports, notifications, doc generation, attendance sync).
- Soft delete only for business records. Hard delete only via controlled retention/archival workflow.
- Backend is the source of truth for permissions, tenant context, plan limits, and AI provider/model. Frontend enforcement is UI convenience only.
- Module services may call other module services, never other modules' repositories.
- Never trust `tenantId`, `organizationId`, `employeeId`, or role IDs from request body for authorization.
- Never expose S3 keys, signed URLs to unauthorized users, or AI provider API keys to the frontend.

## Standard Document Fields

Every tenant-owned document: `_id` (internal), `publicId`, `tenantId`, `organizationId?`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt|null`, `isActive`, `metadata?`.

## Build Order (Phases)

1. Foundation: multi-tenancy, auth, RBAC, tenant/company setup, employee master, audit.
2. ESS, Leave, Attendance foundation.
3. Workflow + Rule engine, dynamic forms, notifications.
4. Payroll core.
5. Advanced attendance + payroll: biometric, shifts/roster, overtime/comp-off, claims, loans, FnF.
6. Reports, analytics, integrations, accounting, bank payout.
7. SaaS commercial layer: public website, billing, subscriptions, usage limits, feature flags.

## Commands

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`

> Always run typecheck and lint before considering a task complete.

## Detailed References

@docs/architecture.md
@docs/conventions.md
@docs/schema.md
@docs/rbac.md
@docs/modules.md
@docs/api.md
@docs/features.md
@docs/progress.md
