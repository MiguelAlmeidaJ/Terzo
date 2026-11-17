CREATE TABLE "client_approvals" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_by" TEXT NOT NULL,
    "source_updated_at" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,
    "expires_at" BIGINT NOT NULL,
    "decided_at" BIGINT,
    "decided_by" TEXT,
    "comment" TEXT,
    "revoked_at" BIGINT,
    CONSTRAINT "client_approvals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "client_approvals_kind_check" CHECK ("kind" IN ('calendar', 'creative')),
    CONSTRAINT "client_approvals_status_check" CHECK ("status" IN ('pending', 'approved', 'changes'))
);

CREATE UNIQUE INDEX "client_approvals_token_hash_key" ON "client_approvals"("token_hash");
CREATE INDEX "client_approvals_kind_target_id_created_at_idx" ON "client_approvals"("kind", "target_id", "created_at");
CREATE INDEX "client_approvals_client_id_created_at_idx" ON "client_approvals"("client_id", "created_at");
