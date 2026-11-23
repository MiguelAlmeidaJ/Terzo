-- Presença complementa o Next Time; não altera docs, usuários nem tarefas existentes.
CREATE TABLE "presence_event" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('online','meeting','visit','capture','lunch','other','ended')),
  "reason" TEXT NOT NULL DEFAULT '',
  "at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "presence_event_user_id_at_idx" ON "presence_event" ("user_id", "at");
CREATE INDEX "presence_event_day_at_idx" ON "presence_event" ("day", "at");
CREATE TABLE "presence_current" (
  "user_id" TEXT PRIMARY KEY,
  "day" TEXT NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('online','meeting','visit','capture','lunch','other','ended')),
  "reason" TEXT NOT NULL DEFAULT '',
  "since" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE "presence_config" (
  "key" TEXT PRIMARY KEY,
  "value" INTEGER NOT NULL
);
INSERT INTO "presence_config" ("key","value") VALUES ('lunch_minutes',60)
  ON CONFLICT ("key") DO NOTHING;
