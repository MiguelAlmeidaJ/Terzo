import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AccessService } from '../src/access.service';
import { MAX_PROFILE_PHOTO_BYTES, ProfilePhotoController, checkProfileImage } from '../src/profile-photo.controller';
import { AdminController } from '../src/admin.controller';
import { verifyPassword } from '../src/security';

const makeJpeg = (length = 1024) => {
  const file = Buffer.alloc(length);
  file[0] = 0xff; file[1] = 0xd8; file[2] = 0xff;
  file[length - 2] = 0xff; file[length - 1] = 0xd9;
  return file;
};
const user = { id: 'u1', role: 'member', memberId: 'm1', status: 'active' } as any;
const admin = { ...user, id: 'admin', role: 'owner', memberId: '' };
const access = new AccessService();

function setup() {
  const records = new Map<string, any>();
  const prisma = {
    userProfilePhoto: {
      upsert: async ({ where, create, update }: any) => {
        const value = records.has(where.userId) ? update : create;
        records.set(where.userId, { ...value, userId: where.userId });
      },
      findUnique: async ({ where }: any) => records.get(where.userId) || null,
      deleteMany: async ({ where }: any) => { const found = records.delete(where.userId); return { count: Number(found) }; },
    },
    document: {
      findUnique: async ({ where }: any) => where.collection_id.id === 'm1'
        ? { data: { accountId: 'u1', name: 'Designer' } } : null,
    },
  };
  let current = user;
  const auth = { requireReady: async () => ({ user: current }) };
  const controller = new ProfilePhotoController(prisma as any, auth as any, access);
  return { controller, records, setUser: (v: any) => { current = v; } };
}

test('profile upload accepts only bounded JPEG bytes', () => {
  assert.equal(checkProfileImage(makeJpeg(), 'image/jpeg').length, 1024);
  assert.throws(() => checkProfileImage(makeJpeg(), 'image/png'), /photo_must_be_jpeg/);
  assert.throws(() => checkProfileImage(Buffer.from('<svg onload=alert(1)>'), 'image/jpeg'), /photo_must_be_jpeg/);
  assert.throws(() => checkProfileImage(makeJpeg(MAX_PROFILE_PHOTO_BYTES + 1), 'image/jpeg'), /photo_size_invalid/);
  assert.throws(() => checkProfileImage(makeJpeg(8), 'image/jpeg'), /photo_size_invalid/);
});

test('each user has exactly one photo, new photo overwrites old content, delete frees it', async () => {
  const scope = setup();
  const upload = (bytes: Buffer) => scope.controller.upload({ body: bytes, headers: { 'content-type': 'image/jpeg' } } as any);
  const first = makeJpeg(1000); const second = makeJpeg(2000);
  await upload(first);
  assert.equal(scope.records.size, 1);
  assert.equal(scope.records.get('u1').size, first.length);
  await upload(second);
  assert.equal(scope.records.size, 1, 'the table must not accumulate older photos');
  assert.equal(scope.records.get('u1').size, second.length);
  assert.deepEqual(Buffer.from(scope.records.get('u1').image), second);
  assert.equal(scope.records.get('u1').mime, 'image/jpeg');
  await scope.controller.remove({} as any);
  assert.equal(scope.records.size, 0);
});

test('photo upload is scoped to authenticated identity, not a member id supplied by the browser', async () => {
  const scope = setup();
  scope.setUser(admin);
  await scope.controller.upload({ body: makeJpeg(), headers: { 'content-type': 'image/jpeg' } } as any);
  assert.equal(scope.records.has('admin'), true);
  assert.equal(scope.records.has('u1'), false);
  scope.setUser(user);
  await scope.controller.upload({ body: makeJpeg(1200), headers: { 'content-type': 'image/jpeg' } } as any);
  await scope.controller.remove({} as any);
  assert.equal(scope.records.has('admin'), true, 'one account must not delete the photo of another');
});

test('members must have an authorized record to read the corresponding photo', async () => {
  const scope = setup();
  await scope.controller.upload({ body: makeJpeg(), headers: { 'content-type': 'image/jpeg' } } as any);
  const output: any = { headers: {}, statusCode: 0, body: null,
    set(headers: any) { this.headers = headers; return this; },
    status(code: number) { this.statusCode = code; return this; },
    send(bytes: Buffer) { this.body = bytes; return this; },
  };
  await scope.controller.member('m1', {} as any, output);
  assert.equal(output.statusCode, 200);
  assert.equal(output.headers['Cache-Control'], 'private, no-store');
  assert.equal(output.body.length, 1024);
  await assert.rejects(() => scope.controller.member('unknown', {} as any, output), /photo_not_found/);
  await assert.rejects(() => scope.controller.member('../admin', {} as any, output), /photo_not_found/);
});

test('administration rejects linked or disabled team records before creating logins', async () => {
  let created = false;
  const db = {
    user: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async () => { created = true; },
    },
    document: {
      findUnique: async ({ where }: any) => ({
        data: { accountId: where.collection_id.id === 'taken' ? 'u_other' : '',
          disabled: where.collection_id.id === 'disabled' },
      }),
    },
  };
  const auth = { requireReady: async () => ({ user: admin }) };
  const controller = new AdminController(db as any, auth as any, access, {} as any);
  const form = (memberId: string) => controller.create({ username: 'designer', name: 'Designer', role: 'member', memberId }, {} as any);
  await assert.rejects(() => form('taken'), /já está vinculado/);
  await assert.rejects(() => form('disabled'), /desativado/);
  assert.equal(created, false);
});

test('administrator creates a linked designer login with a hashed temporary password', async () => {
  let created: any = null;
  let linkedUserId = '';
  let linkedMember: any = { accountId: '', name: 'Bruna Designer', area: 'Design', disabled: false };
  let auditEvents = 0;
  const prisma: any = {
    user: {
      findUnique: async ({ where }: any) => created && (where.id === created.id || where.username === created.username) ? created : null,
      findUniqueOrThrow: async () => created,
      findFirst: async () => null,
      create: async ({ data }: any) => { created = { ...data }; return created; },
      update: async ({ where, data }: any) => {
        linkedUserId = where.id;
        Object.assign(created, data);
        return created;
      },
    },
    document: {
      findMany: async () => [{ id: 'm1', data: { ...linkedMember } }],
      findUnique: async ({ where }: any) => where.collection_id.id === 'm1'
        ? { id: 'm1', data: { ...linkedMember } } : null,
      update: async ({ data }: any) => { linkedMember = data.data; },
    },
    audit: { create: async () => { auditEvents++; } },
  };
  const auth = { requireReady: async () => ({ user: admin }) };
  const events = { broadcast: () => {} };
  const controller = new AdminController(prisma, auth as any, access, events as any);
  const result = await controller.create({
    username: 'bruna.designer', name: 'Bruna Designer',
    email: 'bruna@example.test', memberId: 'm1', role: 'member',
  }, {} as any);
  assert.equal(created.username, 'bruna.designer');
  assert.equal(created.role, 'member');
  assert.equal(created.mustChange, undefined); // Default true is set by the Prisma schema.
  assert.equal(linkedMember.accountId, result.id);
  assert.equal(linkedUserId, result.id);
  assert.ok(result.tempPassword.length >= 10);
  assert.notEqual(created.passHash, result.tempPassword);
  assert.equal(verifyPassword(result.tempPassword, created.passHash), true);
  assert.equal(auditEvents, 1);
});
