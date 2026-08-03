# Staging Acceptance & Cutover Runbook

This document describes the workflow for deploying and signing off the v2 cutover from Next.js to React/Vite/NestJS.

## Prerequisites

- [ ] Next.js original application remains up as a fallback.
- [ ] Neon central database is reachable from the deployment environment.
- [ ] Vristo frontend static files build and deploy correctly to standard CDN.
- [ ] All tenant schema isolations check out with staging roles.

## Runbook Checklist

1. **Database Migration**
   - Push central schema `pnpm run neon:central:push`
   - Run staging seed scripts
2. **Backend Validation**
   - Ensure `test:e2e:db` passes
   - Check that `E2E_SUPER_ADMIN_EMAIL` and `E2E_SUPER_ADMIN_PASSWORD` are valid in the testing environment.
3. **Frontend Validation**
   - Execute test suites on Redux slices
   - Ensure the Vristo design system has no console errors in production build.
4. **Traffic Cutover**
   - Alter DNS/Routing from Next.js server to the new NestJS + CDN endpoints.

*(This file is part of the MaamulPro architecture guidelines and provides the AI with targeted context instead of forcing it to scan code for runbooks.)*
