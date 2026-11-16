import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

const root = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(root, ".env"), quiet: true });

export default defineConfig({
  schema: "api/prisma/schema.prisma",
  migrations: {
    path: "api/prisma/migrations",
  },
  datasource: {
    // Generate and type-check do not need database credentials.
    // Commands that connect to PostgreSQL will validate this value.
    url: process.env.DATABASE_URL ?? "",
  },
});
