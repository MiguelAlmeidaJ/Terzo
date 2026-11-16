import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const values = {};
const envFile = path.resolve('.env');
if (fs.existsSync(envFile)) {
  for (const sourceLine of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
}

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const databaseUrl = process.env.DATABASE_URL || values.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória no arquivo .env.');
const executionEnv = {
  ...process.env,
  ...values,
  DATABASE_URL: databaseUrl,
  DATA_DIR: path.resolve(values.DATA_DIR || './data'),
};
const run = (args) => spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32', env: executionEnv });
for (const args of [
  ['run', 'prisma:deploy', '--workspace', 'api'],
  ['run', 'cli', '--workspace', 'api', '--', 'migrate-nextcloud'],
]) {
  const result = run(args);
  if (result.error) throw result.error;
  if (result.status) process.exit(result.status);
}
