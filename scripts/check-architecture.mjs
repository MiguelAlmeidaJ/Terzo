import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const locate = (relative) => path.join(root, relative);
const required = [
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'apps/api/src/main.ts',
  'apps/api/rules.json',
  'apps/api/assets/brand.png',
  'apps/web/app/page.tsx',
  'apps/web/app/login/page.tsx',
  'apps/web/app/admin/page.tsx',
  'apps/web/legacy-src/base.html',
  'apps/web/legacy-src/build.py',
  'apps/web/public/legacy/login.html',
  'apps/web/public/legacy/admin.html',
  'apps/web/public/terzo-runtime.js',
  'scripts/generate-legacy.mjs',
  'packages/database/src/index.ts',
  'packages/database/prisma.config.ts',
  'packages/database/prisma/schema.prisma',
  'packages/database/prisma/migrations/migration_lock.toml',
];
const forbidden = [
  'package-lock.json',
  'prisma.config.ts',
  'api',
  'web',
  'src',
  'deploy/nginx.conf',
  'apps/api/src/database.ts',
];
for (const file of required) assert.ok(existsSync(locate(file)), 'Arquivo obrigatório ausente: ' + file);
for (const file of forbidden) assert.ok(!existsSync(locate(file)), 'Artefato antigo presente: ' + file);

const rootManifest = JSON.parse(readFileSync(locate('package.json'), 'utf8'));
assert.match(rootManifest.packageManager, /^pnpm@10\./);
const workspaces = readFileSync(locate('pnpm-workspace.yaml'), 'utf8');
assert.match(workspaces, /apps\/\*/);
assert.match(workspaces, /packages\/\*/);
const api = JSON.parse(readFileSync(locate('apps/api/package.json'), 'utf8'));
assert.equal(api.dependencies['@terzo/database'], 'workspace:*');
const schema = readFileSync(locate('packages/database/prisma/schema.prisma'), 'utf8');
assert.match(schema, /output\s*=\s*"\.\.\/generated\/prisma"/);
assert.ok(readdirSync(locate('packages/database/prisma/migrations')).filter((entry) => !entry.endsWith('.toml')).length >= 3,
  'O histórico SQL de migrations precisa ser preservado');

const files = readdirSync(locate('apps/api/src')).filter((name) => name.endsWith('.ts'));
for (const file of files) {
  const contents = readFileSync(locate('apps/api/src/' + file), 'utf8');
  assert.ok(!contents.includes("'./generated/prisma/client'"), 'Import Prisma antigo: ' + file);
  assert.ok(!contents.includes("'./database'"), 'Import do adaptador antigo: ' + file);
}
assert.ok(readdirSync(locate('apps/web/legacy-src/modulos')).filter((name) => /^crm_.*\.js$/.test(name)).length >= 10,
  'Módulos da interface original precisam estar disponíveis para a geração');
console.log('Monorepo pnpm: estrutura, histórico de migrations e imports verificados.');
