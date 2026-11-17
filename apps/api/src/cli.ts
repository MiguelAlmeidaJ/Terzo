import { PrismaClient, Prisma } from '@terzo/database';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { config, now } from './config';
import { hashPassword, temporaryPassword } from './security';
import { StorageService } from './storage.service';
import { createPostgresAdapter } from '@terzo/database';
import { NextcloudReconciliationService } from './nextcloud-reconciliation.service';

const prisma = new PrismaClient({ adapter: createPostgresAdapter() });
const [, , command, ...args] = process.argv;
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

async function createAdmin() {
  const username = String(option('username') || '').toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new Error('Use: create-admin --username admin --name "Administrador" [--password senha]');
  if (await prisma.user.findUnique({ where: { username } })) throw new Error('Esse usuário já existe.');
  const password = option('password') || temporaryPassword();
  if (password.length < 10) throw new Error('A senha precisa ter ao menos 10 caracteres.');
  const id = `u_${randomBytes(12).toString('base64url')}`;
  await prisma.user.create({ data: { id, username, name: option('name') || username, email: option('email') || '', passHash: hashPassword(password), role: 'owner', mustChange: !option('password'), createdAt: now() } });
  console.log(`Administrador criado: ${username}\nSenha: ${password}`);
}

async function importData() {
  const file = path.resolve(args[0] || '../export/terzo-dados.json');
  const payload = JSON.parse(await fs.readFile(file, 'utf8'));
  let documents = 0; let assets = 0;
  for (const [collection, records] of Object.entries(payload.collections || {}) as [string, Record<string, unknown>][]) {
    for (const [id, data] of Object.entries(records)) {
      await prisma.document.upsert({ where: { collection_id: { collection, id } }, create: { collection, id, data: data as Prisma.InputJsonValue, updatedAt: now(), updatedBy: 'import' }, update: { data: data as Prisma.InputJsonValue, updatedAt: now(), updatedBy: 'import' } }); documents++;
    }
  }
  await fs.mkdir(path.join(config.dataDir, 'blobs'), { recursive: true });
  for (const asset of payload.assets || []) {
    const source = path.resolve(path.dirname(file), asset.file); try { await fs.access(source); } catch { continue; }
    const target = path.join(config.dataDir, 'blobs', asset.id); await fs.copyFile(source, target); const stat = await fs.stat(source);
    await prisma.asset.upsert({ where: { id: asset.id }, create: { id: asset.id, owner: 'import', mime: asset.mime || 'application/octet-stream', size: stat.size, name: asset.name || '', createdAt: now() }, update: { mime: asset.mime || 'application/octet-stream', size: stat.size, name: asset.name || '' } }); assets++;
  }
  console.log(`Importados ${documents} documentos e ${assets} arquivos.`);
}

async function migrateNextcloud() {
  const storage = new StorageService();
  const reconciliation = new NextcloudReconciliationService(prisma as any, storage);
  const result = await reconciliation.reconcile({ dryRun: args.includes('--dry-run'), source: command === 'migrate-nextcloud' ? 'migration' : 'cli' });
  const logo = await fs.readFile(path.resolve(__dirname, '..', 'assets', 'brand.png'));
  if (!args.includes('--dry-run')) await storage.putBrand(logo);
  console.log(JSON.stringify(result, null, 2));
}

async function verifyNextcloud() {
  const result = await new StorageService().probe();
  console.log(JSON.stringify(result, null, 2));
}

async function run() {
  if (command === 'create-admin') await createAdmin();
  else if (command === 'import') await importData();
  else if (command === 'migrate-nextcloud') await migrateNextcloud();
  else if (command === 'reconcile-nextcloud') await migrateNextcloud();
  else if (command === 'verify-nextcloud') await verifyNextcloud();
  else throw new Error('Comandos: create-admin | import | migrate-nextcloud | reconcile-nextcloud | verify-nextcloud');
}
run().catch((error) => { console.error(error.message || error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
