import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextcloudReconciliationService } from '../src/nextcloud-reconciliation.service';

test('migration persists client-folder binding, uploads once and becomes idempotent', async () => {
  const assetId = 'c'.repeat(32);
  const bindings: any[] = [];
  const asset: any = {
    id: assetId, owner: 'u1', mime: 'image/png', size: 4, name: 'logo.png', sha256: 'hash',
    clientId: null, remotePath: null, remoteEtag: null, storageState: 'local', storageError: null,
    lastVerifiedAt: null, createdAt: 1n,
  };
  let remoteExists = false;
  let uploads = 0;
  const prisma = {
    clientStorageBinding: {
      findMany: async () => bindings,
      create: async ({ data }: any) => { bindings.push({ ...data }); return data; },
      update: async ({ where, data }: any) => { Object.assign(bindings.find((item) => item.clientId === where.clientId), data); },
    },
    document: {
      findMany: async ({ where }: any = {}) => where?.collection === 'clients'
        ? [{ id: 'client-1', data: { name: 'Cliente Exemplo', logoId: assetId } }]
        : [{ collection: 'clients', id: 'client-1', data: { name: 'Cliente Exemplo', logoId: assetId } }],
    },
    asset: {
      findMany: async () => [asset],
      update: async ({ data }: any) => { Object.assign(asset, data); return asset; },
    },
    audit: { create: async () => ({}) },
  };
  const storage = {
    isNextcloudEnabled: () => true,
    listDirectoryEntries: async () => [{ name: 'Cliente Exemplo', path: 'ARQUIVOS CLIENTES/Cliente Exemplo' }],
    directoryPath: (folder: string) => `ARQUIVOS CLIENTES/${folder}`,
    assetPath: (folder: string, id: string) => `${folder}/${id}`,
    inspectRemote: async (remotePath: string) => ({ path: remotePath, exists: remoteExists, size: remoteExists ? 4 : undefined, etag: remoteExists ? 'etag' : undefined }),
    hasLocalAsset: async () => true,
    uploadLocalAsset: async (_id: string, remotePath: string) => { uploads++; remoteExists = true; return { remotePath, remoteEtag: 'etag' }; },
    moveRemote: async () => { throw new Error('must not move'); },
    status: () => ({ enabled: true, state: 'healthy' }),
  };
  const service = new NextcloudReconciliationService(prisma as any, storage as any);
  const first = await service.reconcile({ source: 'migration' });
  assert.equal(first.bindings.created, 1);
  assert.equal(first.assets.upload, 1);
  assert.equal(bindings[0].clientId, 'client-1');
  assert.equal(asset.clientId, 'client-1');
  assert.equal(asset.storageState, 'synced');
  assert.equal(uploads, 1);

  const second = await service.reconcile({ source: 'migration' });
  assert.equal(second.bindings.verified, 1);
  assert.equal(second.assets.verified, 1);
  assert.equal(uploads, 1);
});

test('dry-run reports migration without changing bindings or assets', async () => {
  let writes = 0;
  const prisma = {
    clientStorageBinding: { findMany: async () => [], create: async () => { writes++; } },
    document: { findMany: async ({ where }: any = {}) => where?.collection === 'clients' ? [{ id: 'c1', data: { name: 'Acme' } }] : [] },
    asset: { findMany: async () => [], update: async () => { writes++; } },
    audit: { create: async () => { writes++; } },
  };
  const storage = {
    isNextcloudEnabled: () => true,
    listDirectoryEntries: async () => [{ name: 'ACME', path: 'BASE/ACME' }],
    directoryPath: (folder: string) => `BASE/${folder}`,
    assetPath: (folder: string, id: string) => `${folder}/${id}`,
  };
  const result = await new NextcloudReconciliationService(prisma as any, storage as any).reconcile({ dryRun: true, source: 'cli' });
  assert.equal(result.bindings.created, 1);
  assert.equal(writes, 0);
});

test('reconciliation moves a remote asset when its persistent client binding changes', async () => {
  const assetId = 'd'.repeat(32);
  const asset: any = { id: assetId, clientId: 'c1', remotePath: 'BASE/OLD/' + assetId, remoteEtag: null, size: 10, createdAt: 1n };
  const moves: Array<[string, string]> = [];
  const prisma = {
    clientStorageBinding: {
      findMany: async () => [{ clientId: 'c1', folderName: 'NEW', folderPath: 'BASE/NEW', status: 'active', createdAt: 1n, updatedAt: 1n }],
      update: async () => ({}),
    },
    document: { findMany: async ({ where }: any = {}) => where?.collection === 'clients' ? [{ id: 'c1', data: { name: 'Cliente' } }] : [] },
    asset: { findMany: async () => [asset], update: async ({ data }: any) => Object.assign(asset, data) },
    audit: { create: async () => ({}) },
  };
  const storage = {
    isNextcloudEnabled: () => true,
    listDirectoryEntries: async () => [{ name: 'NEW', path: 'BASE/NEW' }],
    directoryPath: (folder: string) => `BASE/${folder}`,
    assetPath: (folder: string, id: string) => `${folder}/${id}`,
    inspectRemote: async (remotePath: string) => ({ path: remotePath, exists: true, size: 10, etag: 'etag' }),
    moveRemote: async (from: string, to: string) => { moves.push([from, to]); },
  };
  const result = await new NextcloudReconciliationService(prisma as any, storage as any).reconcile({ source: 'cli' });
  assert.equal(result.assets.move, 1);
  assert.deepEqual(moves, [['BASE/OLD/' + assetId, 'BASE/NEW/' + assetId]]);
  assert.equal(asset.remotePath, 'BASE/NEW/' + assetId);
  assert.equal(asset.storageState, 'synced');
});
