import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';

const values = {};
for (const raw of fs.readFileSync(path.resolve('.env'), 'utf8').split(/\r?\n/)) {
  const match = raw.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) continue;
  values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
process.env.DATABASE_URL = process.env.DATABASE_URL || values.DATABASE_URL;

const { PrismaClient } = await import('../api/dist/generated/prisma/client.js');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const baseUrl = process.env.API_TEST_URL || `http://127.0.0.1:${values.API_PORT || 3001}`;
const sid = crypto.randomBytes(32).toString('base64url');
const idHash = crypto.createHash('sha256').update(sid).digest('hex');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
let assetId;
let importedAssetId;

const request = async (url, init = {}) => {
  const response = await fetch(`${baseUrl}${url}`, {
    ...init,
    headers: { Cookie: `terzo_sid=${sid}`, 'X-Terzo': '1', ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${url}: HTTP ${response.status} ${await response.text()}`);
  return response;
};

const expectStatus = async (url, expected, init = {}) => {
  const response = await fetch(`${baseUrl}${url}`, init);
  if (response.status !== expected) throw new Error(`${init.method || 'GET'} ${url}: esperado HTTP ${expected}, recebido ${response.status}`);
};

try {
  const [user, binding] = await Promise.all([
    prisma.user.findFirst({ where: { status: 'active', mustChange: false, role: { in: ['owner', 'editor'] } }, orderBy: { createdAt: 'asc' } }),
    prisma.clientStorageBinding.findFirst({ where: { status: 'active' }, orderBy: { clientId: 'asc' } }),
  ]);
  if (!user) throw new Error('Nenhum usuário ativo disponível para o teste de armazenamento.');
  if (!binding) throw new Error('Nenhum vínculo cliente-pasta ativo disponível para o teste.');
  const timestamp = BigInt(Date.now());
  await prisma.session.create({ data: {
    idHash, userId: user.id, ver: user.sessionVersion, createdAt: timestamp, lastSeen: timestamp,
    expiresAt: timestamp + 3_600_000n, ip: 'storage-verification', ua: 'Terzo storage verification',
  } });

  await expectStatus('/_blob/not-authorized', 401);
  await expectStatus('/api/db/delete', 403, {
    method: 'POST', body: JSON.stringify({ coll: 'clients', id: 'forbidden' }),
    headers: { Cookie: `terzo_sid=${sid}`, 'X-Terzo': '1', 'Sec-Fetch-Site': 'cross-site', 'Content-Type': 'application/json' },
  });
  await expectStatus('/api/assets', 415, {
    method: 'POST', body: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    headers: { Cookie: `terzo_sid=${sid}`, 'X-Terzo': '1', 'Content-Type': 'image/svg+xml', 'X-File-Name': 'blocked.svg' },
  });

  const uploaded = await request('/api/assets', {
    method: 'POST', body: png,
    headers: { 'Content-Type': 'image/png', 'X-File-Name': encodeURIComponent('fase-2-probe.png'), 'X-Client-Id': binding.clientId },
  });
  const payload = await uploaded.json();
  assetId = payload.id;
  if (payload.storageState !== 'synced') throw new Error(`Upload não sincronizado: ${payload.storageState}`);

  const downloaded = Buffer.from(await (await request(`/_blob/${assetId}`)).arrayBuffer());
  if (!downloaded.equals(png)) throw new Error('O download não corresponde ao arquivo enviado.');
  const row = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  if (row.clientId !== binding.clientId || row.storageState !== 'synced' || !row.remotePath) throw new Error('Metadados de armazenamento não foram persistidos corretamente.');
  const monitoring = await (await request('/api/admin/storage/status')).json();
  const browser = await (await request(`/api/assets/nextcloud/${encodeURIComponent(binding.clientId)}`)).json();
  if (browser.rootPath !== binding.folderPath || !Array.isArray(browser.entries)) throw new Error('O navegador do Nextcloud não abriu a pasta vinculada do cliente.');
  const uploadedEntry = browser.entries.find((entry) => entry.path === row.remotePath);
  if (!uploadedEntry || uploadedEntry.contentType !== 'image/png') throw new Error('O arquivo enviado não apareceu corretamente no navegador do Nextcloud.');
  const imported = await (await request('/api/assets/nextcloud', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: binding.clientId, path: uploadedEntry.path }),
  })).json();
  importedAssetId = imported.id;
  const importedDownload = Buffer.from(await (await request(`/_blob/${importedAssetId}`)).arrayBuffer());
  if (!importedDownload.equals(png)) throw new Error('O arquivo escolhido no Nextcloud não corresponde ao original.');
  await request(`/api/assets/${importedAssetId}`, { method: 'DELETE' });
  importedAssetId = undefined;
  const folders = await (await request('/api/admin/storage/folders')).json();
  if (!folders.folders?.some((folder) => folder.path === binding.folderPath)) throw new Error('A pasta vinculada não apareceu no seletor administrativo.');
  if (monitoring.storage?.state !== 'healthy') throw new Error(`Monitoramento do Nextcloud não ficou saudável: ${monitoring.storage?.state}`);

  await request(`/api/assets/${assetId}`, { method: 'DELETE' });
  assetId = undefined;
  console.log(JSON.stringify({
    ok: true, clientId: binding.clientId, bytes: png.length, upload: 'synced', download: 'verified', cleanup: 'verified',
    monitoring: 'healthy', nextcloudBrowser: 'verified', nextcloudImport: 'verified', folderSelector: 'verified',
    security: { unauthenticatedDownload: 'blocked', crossSiteWrite: 'blocked', svgUpload: 'blocked' },
  }, null, 2));
} finally {
  if (assetId) await request(`/api/assets/${assetId}`, { method: 'DELETE' }).catch(() => undefined);
  if (importedAssetId) await request(`/api/assets/${importedAssetId}`, { method: 'DELETE' }).catch(() => undefined);
  await prisma.session.deleteMany({ where: { idHash } }).catch(() => undefined);
  await prisma.$disconnect();
}
