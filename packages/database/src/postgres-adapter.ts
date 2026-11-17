import { PrismaPg } from '@prisma/adapter-pg';

export function createPostgresAdapter() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL não foi definida. Configure o .env antes de iniciar a API.');
  return new PrismaPg({ connectionString });
}
