-- Complete subscription entitlement and invoice lifecycle support.
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

DO $$ BEGIN
  CREATE TYPE "InvoiceKind" AS ENUM ('INITIAL', 'PLAN_CHANGE', 'RENEWAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "plan_key" TEXT,
  ADD COLUMN IF NOT EXISTS "entitlements" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "tenant_subscriptions"
  ADD COLUMN IF NOT EXISTS "entitlement_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "activated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "kind" "InvoiceKind" NOT NULL DEFAULT 'INITIAL',
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "period_start" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "period_end" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);

UPDATE "invoices"
SET
  "expires_at" = COALESCE("expires_at", "due_date" + INTERVAL '23 days'),
  "period_start" = COALESCE("period_start", "created_at"),
  "period_end" = COALESCE(
    "period_end",
    (SELECT "expires_at" FROM "tenant_subscriptions" WHERE "tenant_subscriptions"."id" = "invoices"."subscription_id"),
    "created_at" + INTERVAL '1 month'
  );

ALTER TABLE "invoices"
  ALTER COLUMN "expires_at" SET NOT NULL,
  ALTER COLUMN "period_start" SET NOT NULL,
  ALTER COLUMN "period_end" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "invoices_expires_at_idx" ON "invoices"("expires_at");
