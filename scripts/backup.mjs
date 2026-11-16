import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const values = {};
if (fs.existsSync('.env')) {
  for (const raw of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = raw.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

const database = process.env.POSTGRES_DB || values.POSTGRES_DB || 'terzo';
const user = process.env.POSTGRES_USER || values.POSTGRES_USER || 'terzo';
const container = process.env.POSTGRES_CONTAINER || 'terzo-postgres';
if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(database) || !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(user) || !/^[A-Za-z0-9_.-]+$/.test(container)) {
  throw new Error('Nome de banco, usuário ou container inválido.');
}

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const directory = path.resolve(process.env.BACKUP_DIR || path.join('data', 'backups'));
const filename = `terzo-${stamp}.dump`;
const destination = path.join(directory, filename);
const temporary = `/tmp/${filename}`;
fs.mkdirSync(directory, { recursive: true });

const run = (args, options = {}) => {
  const result = spawnSync('docker', args, { stdio: options.capture ? 'pipe' : 'inherit', encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(options.capture ? result.stderr || `docker ${args[0]} falhou` : `docker ${args[0]} falhou`);
  return result;
};

try {
  run(['exec', container, 'pg_dump', '-U', user, '-d', database, '-Fc', '-f', temporary]);
  const listing = run(['exec', container, 'pg_restore', '--list', temporary], { capture: true });
  if (!listing.stdout.includes('TABLE DATA')) throw new Error('O dump foi criado, mas não contém dados de tabelas.');
  run(['cp', `${container}:${temporary}`, destination]);
  if (!fs.statSync(destination).size) throw new Error('O arquivo de backup ficou vazio.');
} finally {
  spawnSync('docker', ['exec', container, 'rm', '-f', temporary], { stdio: 'ignore' });
}

const backups = fs.readdirSync(directory).filter((name) => /^terzo-.*\.dump$/.test(name)).sort().reverse();
for (const expired of backups.slice(30)) fs.unlinkSync(path.join(directory, expired));
console.log(`Backup validado: ${destination}`);
