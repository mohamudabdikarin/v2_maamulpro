CREATE TABLE "impersonation_grants" (
  "id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "admin_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "impersonation_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "impersonation_grants_token_hash_key" ON "impersonation_grants"("token_hash");
CREATE INDEX "impersonation_grants_expires_at_idx" ON "impersonation_grants"("expires_at");
CREATE INDEX "impersonation_grants_admin_id_created_at_idx" ON "impersonation_grants"("admin_id", "created_at");
