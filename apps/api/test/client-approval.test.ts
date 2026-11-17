import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { AccessService } from '../src/access.service';
import { ClientApprovalService } from '../src/client-approval.service';

const owner = { id: 'admin', role: 'owner', memberId: '' } as any;
const worker = { id: 'user1', role: 'member', memberId: 'designer-1' } as any;
const stranger = { id: 'user2', role: 'member', memberId: 'designer-2' } as any;
const fileId = 'a'.repeat(32);
const foreignId = 'b'.repeat(32);

function setup(kind: 'calendar' | 'creative' = 'calendar') {
  let sourceUpdatedAt = 1234n;
  let items: any[] = [];
  let audits = 0;
  const data = kind === 'calendar'
    ? { clientId: 'client1', month: '2026-11', copyId: 'designer-1', artId: 'designer-1',
      posts: [
        { id: 'p1', date: '2026-11-02', title: 'Post semanal', caption: 'Legenda 1', kind: 'regular' },
        { id: 'p2', date: '2026-11-20', title: 'Data comemorativa', caption: 'Especial', kind: 'special', movedFrom: '2026-11-19' },
      ],
      subs: [{ stage: 'validacao', status: 'approved', files: [
        { assetId: fileId, name: 'aprovado.png' },
        { assetId: foreignId, name: 'arquivo de outro cliente.png' },
      ] }],
    }
    : { clientId: 'client1', memberId: 'designer-1', title: 'Arte avulsa', assetId: fileId, fileName: 'peça.png' };
  const prisma: any = {
    document: {
      findUnique: async ({ where }: any) => {
        const { collection, id } = where.collection_id;
        if (collection === 'clients' && id === 'client1') return { data: { name: 'Cliente Exemplo' } };
        if (collection === (kind === 'calendar' ? 'calendars' : 'creatives') && id === 'target1') return {
          id, collection, data, updatedAt: sourceUpdatedAt,
        };
        return null;
      },
    },
    asset: {
      findMany: async () => [{ id: fileId, name: 'aprovado.png', mime: 'image/png', clientId: 'client1' }],
      findUnique: async ({ where }: any) => [fileId,foreignId].includes(where.id)
        ? { id: where.id, clientId: where.id === fileId ? 'client1' : 'client2', mime: 'image/png' }
        : null,
    },
    clientApproval: {
      create: async ({ data }: any) => { items.push(data); return data; },
      findUnique: async ({ where }: any) => items.find((item) => item.id === where.id || item.tokenHash === where.tokenHash) || null,
      findMany: async () => items,
      updateMany: async ({ where, data }: any) => {
        let changed = 0;
        for (const item of items) {
          if (where.id !== undefined && item.id !== where.id) continue;
          if (where.kind !== undefined && item.kind !== where.kind) continue;
          if (where.targetId !== undefined && item.targetId !== where.targetId) continue;
          if (where.status !== undefined && item.status !== where.status) continue;
          if (where.revokedAt === null && item.revokedAt != null) continue;
          if (where.expiresAt?.gt !== undefined && item.expiresAt <= where.expiresAt.gt) continue;
          Object.assign(item, data); changed++;
        }
        return { count: changed };
      },
    },
    audit: { create: async () => { audits++; } },
    $transaction: async (callback: any) => callback(prisma),
  };
  const service = new ClientApprovalService(prisma as any, new AccessService(), {} as any);
  return { service, items, data, get audits() { return audits; }, touch: () => { sourceUpdatedAt++; } };
}

test('calendar approval is an immutable snapshot with only permitted client assets', async () => {
  const { service, items } = setup();
  const issued = await service.create(owner, { kind: 'calendar', targetId: 'target1' });
  assert.match(issued.token, /^[a-f0-9]{64}$/);
  assert.notEqual(items[0].tokenHash, issued.token);
  assert.equal(items[0].tokenHash, createHash('sha256').update(issued.token).digest('hex'));
  assert.equal(items[0].snapshot.posts.length, 2);
  assert.equal(items[0].snapshot.posts[1].date, '2026-11-20');
  assert.deepEqual(items[0].snapshot.files.map((file: any) => file.assetId), [fileId]);
  const response = await service.publicView(issued.token);
  assert.equal(response.snapshot.clientName, 'Cliente Exemplo');
  assert.equal(response.status, 'pending');
  await assert.rejects(() => service.publicAsset(issued.token, foreignId), /permission_denied/);
  assert.equal((await service.publicAsset(issued.token, fileId)).clientId, 'client1');
});

test('approval can be submitted only once, with a name and a reason for changes', async () => {
  const { service, audits } = setup();
  const { token } = await service.create(owner, { kind: 'calendar', targetId: 'target1' });
  await assert.rejects(() => service.decide(token, { decision: 'changes', name: 'Cliente' }), /comment_required/);
  await assert.rejects(() => service.decide(token, { decision: 'approved', name: 'X' }), /name_required/);
  const result = await service.decide(token, { decision: 'changes', name: 'Maria', comment: 'Trocar a arte do dia 20' });
  assert.equal(result.status, 'changes');
  const viewed = await service.publicView(token);
  assert.equal(viewed.comment, 'Trocar a arte do dia 20');
  assert.equal(viewed.decidedBy, 'Maria');
  await assert.rejects(() => service.decide(token, { decision: 'approved', name: 'Maria' }), /already_decided/);
});

test('changing the original calendar invalidates the old approval link', async () => {
  const scope = setup();
  const { token } = await scope.service.create(owner, { kind: 'calendar', targetId: 'target1' });
  scope.touch();
  await assert.rejects(() => scope.service.publicView(token), /material_updated_request_new_link/);
  await assert.rejects(() => scope.service.decide(token, { decision: 'approved', name: 'Maria' }), /material_updated_request_new_link/);
  await assert.rejects(() => scope.service.publicAsset(token, fileId), /material_updated_request_new_link/);
});

test('creating another link revokes pending links and prevents repeated use', async () => {
  const scope = setup('creative');
  const first = await scope.service.create(worker, { kind: 'creative', targetId: 'target1' });
  const second = await scope.service.create(worker, { kind: 'creative', targetId: 'target1' });
  await assert.rejects(() => scope.service.publicView(first.token), /link_expired_or_revoked/);
  const latest = await scope.service.publicView(second.token);
  assert.equal(latest.snapshot.title, 'Arte avulsa');
  const list = await scope.service.list(worker, 'creative', 'target1');
  assert.equal(list.items.length, 2);
  assert.equal(list.items[0].status, 'revoked');
  await scope.service.revoke(worker, second.id);
  await assert.rejects(() => scope.service.publicView(second.token), /link_expired_or_revoked/);
});

test('another designer cannot share a client calendar or creative', async () => {
  for (const kind of ['calendar', 'creative'] as const) {
    const scope = setup(kind);
    await assert.rejects(
      () => scope.service.create(stranger, { kind, targetId: 'target1' }),
      /permission_denied/,
    );
  }
});

test('invalid tokens, unsupported types and missing files are rejected', async () => {
  const scope = setup('creative');
  await assert.rejects(() => scope.service.publicView('invalid'), /link_not_found/);
  await assert.rejects(() => scope.service.create(owner, { kind: 'other', targetId: 'target1' }), /invalid_kind/);
  const issued = await scope.service.create(owner, { kind: 'creative', targetId: 'target1' });
  await assert.rejects(() => scope.service.publicAsset(issued.token, foreignId), /permission_denied/);
});

test('calendar without any content or approved file cannot be sent for client validation', async () => {
  const scope = setup('calendar');
  scope.data.posts = [{ id: 'p1', date: '2026-11-02', title: '', caption: '', kind: 'regular' }];
  scope.data.subs = [];
  await assert.rejects(
    () => scope.service.create(owner, { kind: 'calendar', targetId: 'target1' }),
    /calendar_needs_content/,
  );
  scope.data.posts[0].title = 'Postagem da semana';
  const result = await scope.service.create(owner, { kind: 'calendar', targetId: 'target1' });
  assert.match(result.token, /^[a-f0-9]{64}$/);
});
