-- PostgreSQL partial unique index: empty member_id is allowed for unlinked
-- administrative accounts, but a real team member may only have one login.
-- Existing duplicates must be resolved before applying this migration.
CREATE UNIQUE INDEX "users_one_account_per_member"
  ON "users" ("member_id")
  WHERE "member_id" <> '';
