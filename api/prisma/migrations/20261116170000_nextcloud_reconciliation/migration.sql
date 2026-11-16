ALTER TABLE "assets"
  ADD COLUMN "client_id" TEXT,
  ADD COLUMN "remote_etag" TEXT,
  ADD COLUMN "storage_state" TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN "storage_error" TEXT,
  ADD COLUMN "last_verified_at" BIGINT;

UPDATE "assets"
SET "storage_state" = CASE
  WHEN "remote_path" IS NOT NULL AND "remote_path" <> '' THEN 'synced'
  ELSE 'local'
END;

CREATE INDEX "assets_client_id_idx" ON "assets"("client_id");
CREATE INDEX "assets_storage_state_idx" ON "assets"("storage_state");

CREATE TABLE "client_storage_bindings" (
  "client_id" TEXT NOT NULL,
  "folder_name" TEXT NOT NULL,
  "folder_path" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "last_verified_at" BIGINT,
  "last_error" TEXT,
  "created_at" BIGINT NOT NULL,
  "updated_at" BIGINT NOT NULL,
  CONSTRAINT "client_storage_bindings_pkey" PRIMARY KEY ("client_id")
);

CREATE UNIQUE INDEX "client_storage_bindings_folder_path_key" ON "client_storage_bindings"("folder_path");
CREATE INDEX "client_storage_bindings_status_idx" ON "client_storage_bindings"("status");
