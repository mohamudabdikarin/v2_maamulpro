# MaamulPro v2 cutover runbook

The Next.js application remains the rollback source until every gate below is signed off.

## Environment gates

1. Configure `CENTRAL_DATABASE_URL`, a stable `TENANT_DATABASE_ENCRYPTION_KEY`, a
   32+ character `JWT_SECRET`, exact `CORS_ALLOWED_ORIGINS`, `RESEND_API_KEY`,
   verified `RESEND_FROM`, and
   `BLOB_READ_WRITE_TOKEN`.
2. Configure `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_BRANCH_ID`, and
   `NEON_DB_ROLE` when automatic tenant database creation is required.
3. Run `pnpm run neon:check` and verify the pooled and direct central connections.
4. Provision a staging central database and at least two isolated tenant databases.
5. Run the central and tenant migrations from the schema version used by the generated
   clients.
6. Run `pnpm run neon:encrypt-tenants`, then verify each central company resolves only
   to its own encrypted tenant database URL.

## Verification gates

```powershell
cd backend
pnpm run neon:check
node --test test\*.test.mjs
node scripts\run-database-e2e.mjs
node -r dotenv/config scripts\probe-live-api.mjs
pnpm run build

cd ..\vristo-react-starter
pnpm run build
```

The React deployment must use an SPA fallback to `index.html`. Vercel
(`vercel.json`) and Netlify-style (`public/_redirects`) configurations are included.
Equivalent Nginx or Apache hosting must apply the same fallback so nested detail and
edit URLs can be refreshed directly.

Then run database-backed scenarios for owner, manager and limited staff identities:

- reject missing, expired and cross-company tokens/headers;
- verify direct RBAC deny overrides role grants;
- exercise project, payroll, contract, rent, purchase and sale state transitions;
- compare every generated ledger row and stock/balance effect with the source system;
- verify optimistic-concurrency conflicts and deletion/reference safeguards;
- confirm report totals and CSV output against known fixtures;
- reset a password through Resend and verify both central and tenant hashes change;
- upload, replace and delete each supported image type using the selected blob provider.

## Cutover

1. Stop writes to the Next.js application.
2. Take central and all tenant database backups.
3. Run final migrations and reconciliation queries.
4. Deploy NestJS, then Vristo, and execute the smoke suite.
5. Route users to Vristo while retaining the Next.js deployment for rollback.
6. Monitor authentication, tenant resolution, ledger totals, job execution and error
   rates through the first billing/reporting cycle.

Rollback means restoring routing to Next.js. Restore databases only when a v2 migration
or write caused verified data corruption; do not discard valid post-cutover transactions.
