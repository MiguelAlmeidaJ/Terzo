CREATE TABLE "users" (
  "id" TEXT NOT NULL, "username" TEXT NOT NULL, "name" TEXT NOT NULL,
  "email" TEXT NOT NULL DEFAULT '', "pass_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member', "status" TEXT NOT NULL DEFAULT 'active',
  "must_change" BOOLEAN NOT NULL DEFAULT true, "session_version" INTEGER NOT NULL DEFAULT 1,
  "created_at" BIGINT NOT NULL, "last_login" BIGINT, "member_id" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE TABLE "sessions" (
  "id_hash" TEXT NOT NULL, "user_id" TEXT NOT NULL, "ver" INTEGER NOT NULL,
  "created_at" BIGINT NOT NULL, "last_seen" BIGINT NOT NULL, "expires_at" BIGINT NOT NULL,
  "ip" TEXT NOT NULL DEFAULT '', "ua" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id_hash")
);
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "login_attempts" (
  "id" BIGSERIAL NOT NULL, "key" TEXT NOT NULL, "at" BIGINT NOT NULL,
  CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "login_attempts_key_at_idx" ON "login_attempts"("key", "at");
CREATE TABLE "docs" (
  "coll" TEXT NOT NULL, "id" TEXT NOT NULL, "data" JSONB NOT NULL,
  "updated_at" BIGINT NOT NULL, "updated_by" TEXT,
  CONSTRAINT "docs_pkey" PRIMARY KEY ("coll", "id")
);
CREATE TABLE "assets" (
  "id" TEXT NOT NULL, "owner" TEXT, "mime" TEXT NOT NULL, "size" INTEGER NOT NULL,
  "name" TEXT, "sha256" TEXT, "created_at" BIGINT NOT NULL,
  CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "audit" (
  "id" BIGSERIAL NOT NULL, "at" BIGINT NOT NULL, "actor" TEXT,
  "action" TEXT NOT NULL, "target" TEXT, "details" JSONB,
  CONSTRAINT "audit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_at_idx" ON "audit"("at");
