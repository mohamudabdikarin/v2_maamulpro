# MaamulPro v2

MaamulPro v2 is the completed React/Vristo and NestJS migration target. The original
Next.js application in the parent directory is retained only as a rollback reference
until staging acceptance and production cutover are signed off.

## Structure

- `backend` — NestJS API with central/tenant Prisma clients
- `vristo-react-starter` — React 18, Vite and the Vristo design system
- `docs` — audit, gap analysis, plan and verification status

## Configuration

Copy `backend/.env.example` to `backend/.env` and
`vristo-react-starter/.env.example` to `vristo-react-starter/.env`. Never commit database
URLs or signing secrets. The production database implementation targets Neon:

- pooled URLs are used by the NestJS and tenant Prisma runtime;
- direct URLs are used by central schema operations and tenant provisioning;
- tenant connection credentials are encrypted at rest;
- the Super Admin onboarding flow can create isolated Neon databases automatically.

Follow [`docs/NEON-SETUP.md`](docs/NEON-SETUP.md) for the required Neon project,
connection, API provisioning, and encryption settings.

Email delivery uses Resend. Set `RESEND_API_KEY` and `RESEND_FROM` in
`backend/.env`; the sender must be a verified Resend domain/address. Password resets
and scheduled CSV report delivery are disabled safely until both values are present.

## Install and run

```powershell
cd backend
pnpm install
pnpm run neon:setup
pnpm run start:dev
```

```powershell
cd vristo-react-starter
pnpm install
pnpm run dev
```

The API defaults to `http://localhost:4000`; Vite defaults to
`http://localhost:5173`.

## Build verification

```powershell
pnpm run build
pnpm run test:contracts
pnpm run test:e2e:db
pnpm run test:e2e:api
```

`test:e2e:api` expects the API to be running and uses
`E2E_SUPER_ADMIN_EMAIL`, `E2E_SUPER_ADMIN_PASSWORD`, and optional
`E2E_API_URL` from the environment.

## Security model

Company users and platform administrators receive signed bearer tokens. Tenant requests
also send the company identifier from the signed-in session; the backend rejects any
header/token mismatch. Workspace flags and canonical permission keys are enforced by the
backend, not only by navigation visibility.

## Current cutover status

All audited Next.js pages and nested workflows have React/Vristo counterparts. Neon is
implemented for the central registry and isolated tenant databases. The
frontend and backend production builds, static migration contracts, disposable
PostgreSQL provisioning, and tenant-isolation checks pass. Public authentication,
recovery, locked, legacy redirect, 404, desktop, tablet, and mobile browser states have
also been smoke-tested without console errors.

Production routing should move only after the deployment environment has a reachable
central database and the role-based authenticated acceptance checklist in
[`docs/CUTOVER-RUNBOOK.md`](docs/CUTOVER-RUNBOOK.md) is executed with staging identities.
