# MaamulPro v2 migration audit

Audit date: 2026-07-26  
Source of truth: the Next.js application in the repository root  
Migration target: `v2_maamulpro/backend` and `v2_maamulpro/vristo-react-starter`

## Source-system inventory

The source uses a central PostgreSQL database for the platform registry and one isolated
PostgreSQL database per company. The central schema contains companies, company users,
internal administrators, email verification, plans, subscriptions, invoices, and the
subscription transaction ledger. The tenant schema contains 45 business/RBAC models.

| Domain | Source workflows and supporting behavior |
| --- | --- |
| Authentication | Company and internal-admin login, session persistence, password reset, email verification, account lock/suspension handling |
| Platform administration | Company onboarding, company type/module configuration, activation/suspension, admin account maintenance |
| Billing | Plans, subscription approval/suspension/renewal, invoices, payments, expiry notifications and subscription checks |
| Executive hub | Consolidated income/expense/profit, operational counts, recent ledger activity and analytics |
| Staff and RBAC | Staff CRUD, photos, user-account creation, password reset, activation, email change, activity history, roles and direct grants/denies |
| Financials | Categories, unified transactions, account tree, journal entries, summaries, profit/loss and transaction-detail reports |
| Construction | Project CRUD, project tasks, progress, construction inventory, daily expenses, manpower, worker ledgers and workforce contracts |
| Workforce contracts | Worker assignment/removal, payments, budget adjustments, contract detail and project selection |
| Real estate | Properties, clients, deals, tenants, rental contracts, rent payments, sales/rentals and payment-state transitions |
| Materials | Products/inventory, stock movements, suppliers, supplier transactions, purchases/receiving, customers, sales/payment state and transportation/delivery state |
| Payroll | Period validation, eligible staff, draft/update/delete, approval/rejection/payment transitions, payroll items and payslips |
| Reporting | Core, construction, real-estate, materials, payroll and worker reports; filters, print/export views and scheduled report delivery |
| Configuration | Branding, company/system settings, module configuration, user language and account profile |
| Audit and notifications | Activity log, module events, notification feed, Resend email delivery and scheduled report processing |
| Files | Image upload/delete through the configured blob provider; staff, project, property and material images |

The source authorization catalog uses database-backed roles and permissions, including
workspace access and action-level keys such as `projects.read`, `projects.create`,
`payroll.approve`, and `reports.read`. Legacy role and workspace booleans remain for
backward compatibility and must not become the v2 authorization source of truth.

## Initial v2 gap analysis

At the start of this migration pass, the React target contained only the untouched Vristo
starter page. The backend contained 11 broad modules but only a small subset of source
operations. It had no DTO classes or tests, no bearer-token guard, no property scoping,
and only a few list/create endpoints.

Critical defects found:

- Tenant APIs were callable without authentication.
- Tenant selection trusted `X-Company-Id` without first enforcing a signed identity.
- Super-admin endpoints did not enforce the declared super-admin role.
- CORS reflected every origin while credentials were enabled.
- The validation pipe silently accepted unknown fields.
- The JWT module shipped with a hard-coded fallback secret.
- Backend startup rewrote its own source files from the legacy application.
- Services referenced obsolete Prisma names such as `materialProduct`,
  `financialAccount`, `referenceNumber`, `rentals`, `expenses`, `creator`, and
  `periodName`.
- Staff account creation stored an unusable placeholder password hash.
- The prior React implementation directory had been removed and the Vristo replacement
  had no application routing or API integration.

## Implementation status

| Area | Status | Evidence / remaining gap |
| --- | --- | --- |
| Backend compile baseline | Verified | Nest production compilation passes |
| Frontend compile/build | Verified | TypeScript and Vite production build pass |
| Bearer authentication | Implemented | Global JWT guard; only login routes are public |
| Tenant isolation | Implemented at company level | Signed `companyId` is compared with resolved tenant; property-level assignments still need a data model |
| Workspace isolation | Implemented | Disabled construction, real-estate and material workspaces return 403 |
| Permission enforcement | Implemented | Action keys are applied to all migrated tenant controllers and company-owner/super-admin bypasses are explicit |
| Super-admin authorization | Implemented | All `/api/superadmin` operations require `SUPER_ADMIN` |
| Input hardening | Implemented for migrated writes | Global whitelist/unknown-field rejection and dedicated domain DTO validation are active |
| Neon database architecture | Implemented | Central and tenant runtime clients use pooled Neon URLs; schema, seed and provisioning work uses direct URLs with required SSL |
| Company onboarding | Implemented | Super Admin can automatically create an isolated Neon database through the management API or supply a manual URL; schema/RBAC/owner creation is compensated on failure |
| Tenant credential security | Implemented | Tenant URLs are AES-256-GCM encrypted before storage and removed from company, update and metrics API responses |
| Dashboard | Integrated | Vristo page uses `/api/dashboard/summary` |
| Staff | Implemented | CRUD, account creation, activation, email/password maintenance, activity and Vristo management |
| Financials | Implemented | Transaction/category/account CRUD, filters, summaries, optimistic concurrency and ledger views |
| Payroll | Implemented | Create/update/delete, validation, approval state machine, payslips and ledger posting |
| Construction | Implemented | Projects, tasks, expenses, inventory, manpower, worker types/ledger and workforce-contract lifecycle |
| Real estate | Implemented | Properties, clients, deals, tenants, rental contracts/payments and synchronized ledger/property state |
| Materials | Implemented | Products, suppliers, purchases/receiving, customers, sales/stock reversal and transportation |
| Reports | Implemented | 21-report registry, filters, print/CSV, schedules and Vristo report center |
| Platform admin UI | Implemented for current schema | Company provisioning/status/modules, plans, subscriptions, invoices and metrics |
| Password/email workflows | Implemented | Resend-backed, expiring/attempt-limited password reset and synchronized central/tenant credentials |
| Notifications | Implemented | Activity-backed notification feed and per-user read marker |
| Uploads | Implemented | Authenticated, tenant-prefixed Vercel Blob upload/delete APIs and Vristo controls cover branding, avatars, staff, projects, properties and materials |
| Scheduled jobs | Implemented | Subscription renewal/expiry plus due-report execution, CSV rendering, Resend attachment delivery, retry-safe advancement and activity audit |
| Automated tests | Verified in disposable databases | Four route/permission/security/integration contracts and two PostgreSQL provisioning/isolation scenarios pass |

## Dependency-ordered migration plan

1. Freeze and test the central/tenant Prisma schemas; add a tenant migration runner and
   onboarding transaction/compensation tests.
2. Add DTOs, pagination primitives, request identity/audit logging, refresh-token or
   short-lived session renewal, and authentication integration tests.
3. Finish RBAC administration and introduce an explicit property-assignment model before
   exposing property-scoped staff access.
4. Finish foundational staff, settings, categories, accounts, transactions and audit APIs.
5. Complete construction and workforce workflows, including ledger effects.
6. Complete real-estate tenants/rentals/payments and deal ledger effects.
7. Complete materials purchasing, receiving, sales, payments, stock and transportation.
8. Complete payroll creation, validation, state machine, payslips and ledger integration.
9. Complete reports, export/print, schedules, Resend notifications and uploads.
10. Build dedicated Vristo forms/modals for every operation and run role/tenant/property
    end-to-end scenarios against migrated production-like data.

## Verification performed in this pass

- NestJS TypeScript production compilation: pass.
- React TypeScript check: pass.
- Vristo Vite production build: pass.
- Static route-to-permission/security/integration contract suite: 4 tests pass.
- Static Prisma contract correction: completed for current dashboard, list/create,
  payroll transition and report services.
- Disposable PostgreSQL provisioning/isolation suite: pass (2 scenarios) through
  `backend/scripts/run-database-e2e.mjs`; the suite tears down its containers and
  volumes after execution.
- Browser smoke suite: pass for company/platform sign-in, password recovery, locked
  state, route guards, legacy Next.js redirects, branded 404 handling, and responsive
  390 px/768 px layouts with no console errors.
- Authenticated live API probe: supplied as `backend/scripts/probe-live-api.mjs`. The
  current local API process reached NestJS, but its configured central PostgreSQL
  service was unavailable; rerun this probe after the deployment database is online.

The code and UI migration is complete for the audited source modules. Production
cutover remains an operational approval: configure reachable staging services and run
the authenticated owner, manager, limited-staff, and platform-admin acceptance suite
against production-like data before changing user traffic.
