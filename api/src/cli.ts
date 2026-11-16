import { PrismaClient, Prisma } from './generated/prisma/client';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { config, now } from './config';
import { hashPassword, temporaryPassword } from './security';
import { StorageService } from './storage.service';
import { createPostgresAdapter } from './database';

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
  if (!storage.isNextcloudEnabled()) throw new Error('Defina NEXTCLOUD_ENABLED=true e configure as credenciais antes da migração.');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  const aliases: Record<string, string> = {
    'ATIVA VET': 'ATIVA', 'X OISHI': 'OISHI', 'PIZZARIA JEITINHO BRASILEIRO': 'JEITINHO BRASILEIRO',
    'THALITA BALBI': 'DRA. THALITA BALBI', 'CLINICA E CIRURGIA DE OLHOS MAYRINK': 'DR MAYRINK',
    'DR DANILO VARGAS': 'DR. DANILO', 'DROGARIA TOMAZ': 'DROGRARIA TOMAZ',
    'RESTAURANTE PESQUEIRO': 'PESQUEIRO MARINÓPOLIS',
  };
  const directories = await storage.listDirectories();
  const byNormalizedName = new Map(directories.map((name) => [normalize(name), name]));
  const clientDocuments = await prisma.document.findMany({ where: { collection: 'clients' } });
  const assetFolders = new Map<string, string>();
  const unmatched: string[] = [];
  for (const document of clientDocuments) {
    const client = document.data as any;
    if (!client?.logoId || !client?.name) continue;
    const alias = aliases[normalize(client.name)];
    const folder = alias || byNormalizedName.get(normalize(client.name));
    if (!folder || !byNormalizedName.has(normalize(folder))) unmatched.push(client.name);
    else assetFolders.set(client.logoId, byNormalizedName.get(normalize(folder))!);
  }
  if (unmatched.length) throw new Error(`Pastas de clientes não localizadas no Nextcloud: ${unmatched.join(', ')}`);
  if (!byNormalizedName.has(normalize(config.nextcloud.systemFolder))) {
    throw new Error(`A pasta interna "${config.nextcloud.systemFolder}" não existe no Nextcloud.`);
  }
  const systemFolder = byNormalizedName.get(normalize(config.nextcloud.systemFolder))!;
  const assets = await prisma.asset.findMany({ select: { id: true } });
  let migrated = 0; let missing = 0; const failures: string[] = [];
  for (const asset of assets) {
    try {
      const remotePath = await storage.migrateLocalAsset(asset.id, assetFolders.get(asset.id) || systemFolder);
      await prisma.asset.update({ where: { id: asset.id }, data: { remotePath } });
      migrated++;
    } catch (error: any) {
      if (error?.code === 'ENOENT') missing++;
      else failures.push(`${asset.id}: ${error?.message || error}`);
    }
  }
  const logo = await fs.readFile(path.resolve(__dirname, '..', '..', 'src', 'terzo_wm_dark.png'));
  await storage.putBrand(logo);
  console.log(`Nextcloud: ${migrated} arquivos enviados às pastas existentes, ${missing} arquivos locais ausentes e logo enviada em ${systemFolder}.`);
  if (failures.length) throw new Error(`Falharam ${failures.length} arquivos:\n${failures.join('\n')}`);
}

async function run() {
  if (command === 'create-admin') await createAdmin();
  else if (command === 'import') await importData();
  else if (command === 'migrate-nextcloud') await migrateNextcloud();
  else throw new Error('Comandos: create-admin | import | migrate-nextcloud');
}
run().catch((error) => { console.error(error.message || error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
