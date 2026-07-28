# Neon setup for MaamulPro v2

There are two applications and two environment files:

- `MaamulPro/.env` is for the old Next.js application.
- `MaamulPro/v2_maamulpro/backend/.env` is for the new NestJS application.

Only the second file is used by v2. Do not merge or copy the whole root file over.

For v2, `CENTRAL_DATABASE_URL` is the only central database URL you must set. The
backend derives its pooled runtime URL and direct migration URL automatically.

## 1. Create the central database

Create a Neon project and a central database such as `maamulpro_central`. Copy one
Neon connection URL to `CENTRAL_DATABASE_URL`; v2 derives the pooled and direct forms.
Use `sslmode=require`. See the official
[Neon connection pooling guide](https://neon.com/docs/connect/connection-pooling) and
[Prisma Neon guide](https://www.prisma.io/docs/orm/v6/overview/databases/neon).

## 2. Configure the backend

Copy `backend/.env.example` to `backend/.env`. The required Neon values are
`DATABASE_PROVIDER`, `CENTRAL_DATABASE_URL`, and
`TENANT_DATABASE_ENCRYPTION_KEY`. Generate a stable encryption key:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Store that value in `TENANT_DATABASE_ENCRYPTION_KEY` and retain it in the deployment
secret manager and backup system. Existing encrypted tenant URLs cannot be recovered
if this key is lost.

Automatic tenant database creation is the only optional Neon feature. If you want it,
reuse these same variables from the old root environment:

```dotenv
NEON_API_KEY=...
NEON_PROJECT_ID=...
NEON_BRANCH_ID=...
NEON_DB_ROLE=neondb_owner
```

`NEON_DB_ROLE` normally remains `neondb_owner`. The Neon API key stays only in the
NestJS environment; it is never sent to React.

Neon's database management API is documented in
[Manage databases](https://neon.com/docs/manage/databases).

## 3. Initialize and verify

From `v2_maamulpro/backend`:

```powershell
pnpm run neon:check
pnpm run neon:central:push
pnpm run neon:encrypt-tenants
pnpm run seed
pnpm run build
```

Or run the first three operations with `pnpm run neon:setup`.

`neon:check` tests both central connection modes without printing credentials.
`neon:central:push` uses the direct URL. `neon:encrypt-tenants` idempotently upgrades
plaintext tenant URLs imported from the Next.js system. The running Nest application
and all tenant Prisma clients use pooled URLs with conservative pool limits.

## 4. Onboard tenants

Open **Super Admin → Companies → Onboard company**:

- with all Neon management variables configured, leave the URL override blank;
- otherwise, paste a tenant Neon URL created manually.

MaamulPro creates/applies the tenant schema, verifies the pooled runtime connection,
seeds the RBAC registry, creates the owner in central and tenant databases, and encrypts
the tenant URL before saving it. If automatic onboarding fails, central records and a
newly created prefixed Neon database are compensated automatically.

The Super Admin API returns only database status metadata. It never returns database
URLs, password hashes, reset-token hashes, or the Neon API key.

## Production notes

- Keep `NEON_CENTRAL_POOL_MAX` and `NEON_TENANT_POOL_MAX` small enough that the total
  connections across all application replicas remain within the selected Neon plan.
- Use direct connections only for migration/admin work; do not use them for application
  request traffic.
- Back up `TENANT_DATABASE_ENCRYPTION_KEY` and all other deployment secrets.
- Use separate Neon projects or branches for development, staging, and production.
- Take a backup before schema cutovers and test tenant isolation with at least two
  companies.
