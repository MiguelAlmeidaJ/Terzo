import test from 'node:test';
import assert from 'node:assert/strict';
import { DocumentsController } from '../src/documents.controller';
import { PresenceService } from '../src/presence.service';

const actor = { id: 'u_manager', role: 'owner', memberId: 'm_manager' };
const member = (id: string, name: string, area = 'Audiovisual') => ({
  id, data: { id, name, area, disabled: false },
});
const team = [member('m_designer', 'Rhany Baganha', 'Design'),
  member('m_editor', 'Otávio Barbosa'), member('m_editor2', 'Leonardo Pitassi')];
const access = { validCollection: () => true, can: () => true, level: (u: any) => u.role === 'owner' ? 4 : 2 };
function documentFixture(before: Record<string, any> | null = null) {
  let saved: any = null;
  const prisma: any = {
    document: {
      findUnique: async ({ where }: any) => {
        if (where.collection_id.collection === 'members') return team.find(m => m.id === where.collection_id.id) || null;
        return before ? { data: before } : null;
      },
      findMany: async () => team,
      upsert: async (args: any) => { saved = args.create.data; return {}; },
    },
  };
  const auth = { requireReady: async () => ({ user: actor }) };
  const controller = new DocumentsController(prisma, auth as any, access as any, { broadcast() {} } as any);
  return { controller, saved: () => saved };
}
test('Carteira: troca salva ID e histórico com ator do servidor', async () => {
  const fx = documentFixture({ name: 'Cliente', designerId: 'm_designer' });
  const data: any = { name: 'Cliente', designerId: 'm_editor' };
  await fx.controller.set({ coll: 'clients', id: 'c1', data }, {} as any);
  assert.equal(data.ownerHistory[0].role, 'designer');
  assert.equal(data.ownerHistory[0].changedBy, actor.id);
  assert.equal(data.ownerHistory[0].fromId, 'm_designer');
  assert.equal(data.ownerHistory[0].toId, 'm_editor');
  assert.ok(!Number.isNaN(Date.parse(data.ownerHistory[0].changedAt)));
});
test('Tarefa: rejeita editor duplicado e urgente sem data', async () => {
  const fx = documentFixture();
  const task = { title: 'Vídeo', execFor: 'editor', assigneeId: 'm_editor',
    designerId: 'm_designer', videoEditorId: 'm_editor', editor2Id: 'm_editor', due: '', urgent: true };
  await assert.rejects(fx.controller.set({ coll: 'todos', id: 't1', data: task }, {} as any), /duplicate_video_editor/);
  task.editor2Id = 'm_editor2';
  await assert.rejects(fx.controller.set({ coll: 'todos', id: 't1', data: task }, {} as any), /urgent_requires_due/);
});
test('Publicação: rejeita publicação sem aprovação', async () => {
  const fx = documentFixture({ status: 'Em criação' });
  const data = { status: 'Publicado', title: 'Arte de exemplo' };
  await assert.rejects(fx.controller.set({ coll: 'creatives', id: 'cr1', data }, {} as any), /publication_must_be_approved/);
});
test('Presença: pausa outro exige motivo e transições criam eventos', async () => {
  const events: any[] = []; let current: any = null;
  const prisma: any = {
    $transaction: async (run: any) => run(prisma),
    presenceCurrent: {
      findUnique: async () => current,
      upsert: async ({ create, update }: any) => { current = current ? { ...current, ...update } : create; return current; },
    },
    presenceEvent: { create: async ({ data }: any) => { events.push(data); } },
  };
  const presence = new PresenceService(prisma, access as any);
  await assert.rejects(presence.set('u_manager', 'other', ''), /Informe o motivo/);
  await presence.set('u_manager', 'online');
  await presence.set('u_manager', 'lunch');
  await presence.set('u_manager', 'online');
  assert.deepEqual(events.map(e => e.status), ['online', 'lunch', 'online']);
  assert.ok(events.every(e => typeof e.day === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(e.day)));
  assert.ok(events.every(e => e.at instanceof Date));
});
