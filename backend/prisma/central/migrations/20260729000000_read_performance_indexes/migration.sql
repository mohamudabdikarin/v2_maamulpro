-- Indexes for the super-admin list, subscription lifecycle, notifications, and reset-code lookup.
CREATE INDEX IF NOT EXISTS "tenants_status_created_at_idx"
  ON "tenants"("status", "created_at");
CREATE INDEX IF NOT EXISTS "tenants_subscription_status_subscription_expires_at_idx"
  ON "tenants"("subscription_status", "subscription_expires_at");

CREATE INDEX IF NOT EXISTS "subscription_transactions_company_id_created_at_idx"
  ON "subscription_transactions"("company_id", "created_at");
CREATE INDEX IF NOT EXISTS "subscription_transactions_created_at_idx"
  ON "subscription_transactions"("created_at");

CREATE INDEX IF NOT EXISTS "email_verifications_email_context_status_created_at_idx"
  ON "email_verifications"("email", "context", "status", "created_at");
CREATE INDEX IF NOT EXISTS "tenant_subscriptions_status_expires_at_idx"
  ON "tenant_subscriptions"("status", "expires_at");
CREATE INDEX IF NOT EXISTS "invoices_status_updated_at_idx"
  ON "invoices"("status", "updated_at");
