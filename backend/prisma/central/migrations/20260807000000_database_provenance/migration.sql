-- Persist tenant database provider/ownership so platform-created Neon
-- databases can be distinguished from customer-supplied ones. deleteCompany
-- must only invoke the Neon API for databases the platform created.
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "db_provider" TEXT,
  ADD COLUMN IF NOT EXISTS "db_created_by_maamulpro" BOOLEAN NOT NULL DEFAULT false;

-- NOTE: stored db_url values are encrypted, so existing rows cannot be
-- classified from SQL. The default is intentionally conservative (false) —
-- existing tenant databases are only ever cleaned up once an operator
-- confirms they were platform-created.
