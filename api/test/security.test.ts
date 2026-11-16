import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AccessService } from '../src/access.service';
import { AssetAccessService } from '../src/asset-access.service';
import { AssetsController } from '../src/assets.controller';
import { DocumentsController } from '../src/documents.controller';

const access = new AccessService();
const member = { id: 'u1', role: 'member', memberId: 'm1', name: 'Pessoa', email: 'p@example.com' } as any;
const outsider = { ...member, id: 'u2', memberId: '' };
const owner = { ...member, id: 'admin', role: 'owner', memberId: '' };
const asset = { id: 'a'.repeat(32), owner: 'u1', mime: 'image/png', name: 'img.png' } as any;

test('unlinked member cannot access business documents', () => {
  assert.equal(access.can(outsider, 'clients/c1', 'read'), false);
  assert.equal(access.can(outsider, 'clients/c1', 'write'), false);
  assert.equal(access.can(outsider, 'access_req/u2', 'write'), true);
  assert.equal(access.can(outsider, 'access_req/u1', 'read'), false);
  assert.equal(access.can(outsider, 'members/m1', 'read'), true);
});

test('sensitive document write permissions are server-side', () => {
  assert.equal(access.can(member, 'members/m2', 'write'), false);
  assert.equal(access.can(member, 'members/m1', 'write'), true);
  assert.equal(access.can(member, 'access_log/log1', 'write'), false);
  assert.equal(access.can(owner, 'members/m2', 'write'), true);
});

test('assets: owner, administrators and referenced readable documents', async () => {
  const rows = [{ coll: 'clients', id: 'c1', data: { logoId: asset.id } }];
  const prisma = { $queryRaw: async () => rows };
  const service = new AssetAccessService(prisma as any, access);
  assert.equal(await service.canRead(member, asset), true);
  assert.equal(await service.canRead(owner, asset), true);
  assert.equal(await service.canRead(outsider, asset), false);
  assert.equal(await service.canRead({ ...member, id: 'u3' } as any, asset), true);
});

test('assets: no permission from an unrelated text match or private document', async () => {
  const prisma = { $queryRaw: async () => [
    { coll: 'clients', id: 'c1', data: { comment: 'prefix-' + asset.id + '-suffix' } },
    { coll: 'cm', id: 'u1', data: { attachment: asset.id } },
  ] };
  const service = new AssetAccessService(prisma as any, access);
  assert.equal(await service.canRead({ ...member, id: 'u3' } as any, asset), false);
});

test('GET /_blob checks authorization before requesting storage', async () => {
  let called = false;
  const auth = { requireReady: async () => ({ user: { ...member, id: 'u3' } }) };
  const prisma = { asset: { findUnique: async () => asset } };
  const storage = { openAsset: async () => { called = true; return null; } };
  const guard = { canRead: async () => false };
  const controller = new AssetsController(prisma as any, auth as any, access, storage as any, guard as any);
  await assert.rejects(() => controller.blob(asset.id, { headers: {} } as any, {} as any), /permission_denied/);
  assert.equal(called, false);
});

test('member self-update only allows their lastSeen to change', async () => {
  const row = { accountId: 'u1', name: 'Pessoa', admin: false, lastSeen: '2026-01-01T00:00:00.000Z' };
  let writes = 0;
  const prisma = { document: {
    findUnique: async () => ({ data: row }),
    upsert: async () => { writes++; },
  } };
  const auth = { requireReady: async () => ({ user: member }) };
  const events = { broadcast: () => {} };
  const controller = new DocumentsController(prisma as any, auth as any, access, events as any);
  const set = (data: unknown) => controller.set({ coll: 'members', id: 'm1', data }, {} as any);
  await assert.rejects(() => set({ ...row, admin: true, lastSeen: new Date().toISOString() }), /permission_denied/);
  await assert.rejects(() => set({ ...row, lastSeen: '2020-01-01T00:00:00.000Z' }), /permission_denied/);
  await set({ ...row, lastSeen: new Date().toISOString() });
  assert.equal(writes, 1);
});

test('unlinked users cannot forge other users access requests', async () => {
  const prisma = { document: { upsert: async () => { throw new Error('should not persist'); } } };
  const auth = { requireReady: async () => ({ user: outsider }) };
  const controller = new DocumentsController(prisma as any, auth as any, access, { broadcast: () => {} } as any);
  await assert.rejects(() => controller.set({ coll: 'access_req', id: 'u2', data: {
    name: outsider.name, email: outsider.email, ignored: false,
  } }, {} as any), /permission_denied/);
});
