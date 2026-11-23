-- Exclusivamente PostgreSQL: 1 registro por usuário; novo upload sobrescreve Bytes.
CREATE TABLE "user_profile_photos" (
  "user_id" TEXT NOT NULL,
  "image" BYTEA NOT NULL,
  "mime" TEXT NOT NULL DEFAULT 'image/jpeg',
  "size" INTEGER NOT NULL,
  "updated_at" BIGINT NOT NULL,
  CONSTRAINT "user_profile_photos_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "user_profile_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_profile_photos_mime_check" CHECK ("mime" = 'image/jpeg'),
  CONSTRAINT "user_profile_photos_size_check" CHECK ("size" > 0 AND "size" <= 524288)
);
