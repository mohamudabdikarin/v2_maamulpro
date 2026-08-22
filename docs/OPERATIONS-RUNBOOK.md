# MaamulPro Operations Runbook

## Health and monitoring

- `GET /health` is the process liveness probe.
- `GET /health/ready` verifies central-database connectivity and is the deployment readiness probe.
- Every response includes `x-request-id`. Error payloads include the same identifier.
- Requests slower than `SLOW_REQUEST_MS` are emitted as structured `slow_http_request` warnings.
- Alert on readiness failures, HTTP 5xx rate, process restarts, database saturation, and scheduled-job failure logs.

## Backup policy

Neon point-in-time recovery is the primary recovery mechanism. Enable retention appropriate to the subscription and take a logical `pg_dump --format=custom` backup of the central database before schema or deployment changes. Tenant databases must use the same policy.

Keep backups encrypted, access-controlled, outside the application host, and test a restore at least monthly. Never restore over production during a drill.

## Restore drill

1. Create a temporary isolated database.
2. Restore the selected central or tenant backup with `pg_restore --clean --if-exists --no-owner`.
3. point a staging instance at the restored database.
4. Verify `/health/ready`, authentication, tenant isolation, accounting balances, file references, and the latest audit records.
5. Record recovery time, recovery point, failures, and corrective actions.

For database E2E without Docker, provide two empty disposable PostgreSQL URLs as `TEST_TENANT_A_DATABASE_URL` and `TEST_TENANT_B_DATABASE_URL`, set `E2E_DATABASES_ARE_DISPOSABLE=true`, then run `npm run test:e2e:db:external`. The safety flag is mandatory because provisioning writes schema and marker records.

Run `npm run test:load` against a running API to exercise concurrent authenticated reads. Tune `E2E_LOAD_REQUESTS` and `E2E_LOAD_P95_MS` for the deployment tier.

## Deployment and rollback

1. Run backend tests, TypeScript checks, frontend checks, and the production build.
2. Back up affected databases and record the deployed `APP_VERSION`.
3. Apply central migrations, then idempotent tenant schema upgrades.
4. Deploy the API; wait for `/health/ready` before routing traffic.
5. Deploy the frontend and complete the role-based smoke checklist.
6. Roll back application artifacts if health or error-rate thresholds fail. Restore data only when a migration is not forward-fixable and the incident owner approves it.

## Incident minimums

Capture the request ID, company ID, route, UTC time, application version, and sanitized error. Do not include tokens, passwords, database URLs, or personal record contents in incident logs.
