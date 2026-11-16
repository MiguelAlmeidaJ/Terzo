import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const values = {};
const envFile = path.resolve('.env');
if (!fs.existsSync(envFile)) throw new Error('Arquivo .env não encontrado.');

for (const sourceLine of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const line = sourceLine.trim();
  if (!line || line.startsWith('#')) continue;
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  values[match[1]] = value;
}

const user = values.POSTGRES_USER;
const database = values.POSTGRES_DB;
const password = values.POSTGRES_PASSWORD;
const container = values.POSTGRES_CONTAINER || 'terzo-postgres';
if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(user || '')) throw new Error('POSTGRES_USER inválido.');
if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(database || '')) throw new Error('POSTGRES_DB inválido.');
if (!password) throw new Error('POSTGRES_PASSWORD é obrigatória.');

const databaseUrl = new URL(values.DATABASE_URL || '');
if (databaseUrl.username !== user || databaseUrl.password !== password || databaseUrl.pathname.slice(1) !== database) {
  throw new Error('DATABASE_URL deve usar o mesmo usuário, senha e banco das variáveis POSTGRES_*; aplique URL encoding quando necessário.');
}

const escapedPassword = password.replaceAll("'", "''");
const sql = `ALTER ROLE "${user}" WITH PASSWORD '${escapedPassword}';\n`;
const result = spawnSync('docker', ['exec', '-i', container, 'psql', '-U', user, '-d', database, '-v', 'ON_ERROR_STOP=1'], {
  input: sql,
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'inherit'],
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('Senha do PostgreSQL sincronizada com o .env. Recrie o container e recarregue o PM2.');
