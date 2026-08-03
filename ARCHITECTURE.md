# Architecture Map

## Overview
MaamulPro v2 is an Enterprise Multi-Tenant SaaS platform. 

### Core Tech Stack
- **Backend (`/backend`)**: NestJS, Prisma, PostgreSQL (Neon Serverless).
- **Frontend (`/frontend`)**: React 18, Vite, Tailwind CSS, Redux Toolkit. UI relies on Vristo Design System.

## Directory Structure & Component Map

### `/backend`
- `src/`: Main NestJS application code.
- `prisma/`: Prisma schema files.
  - `prisma.config.ts` handles central configuration.
  - `prisma/tenant/schema.prisma` handles tenant configuration.
- `scripts/`: Initialization scripts (database setup, superadmin seeding).
- `test/`: E2E tests and contracts.

### `/frontend`
- `src/`: React source code (components, redux slices, pages).
- `public/`: Static assets.
- `package.json`: Contains Vite, Tailwind, Redux dependencies.

### `/docs`
- `NEON-SETUP.md`: Guide to setting up Neon Serverless and encryption.
- `CUTOVER-RUNBOOK.md`: Checklist for staging acceptance and cutover.

## Security Model
- Uses signed bearer tokens for authentication.
- Tenant requests include a company identifier which is validated against the signed-in session.
- Both navigation visibility and backend guard rails enforce workspace flags and canonical permission keys.
