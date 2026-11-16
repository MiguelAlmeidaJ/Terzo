import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Readable } from 'node:stream';
import { StorageService } from '../src/storage.service';
import { config } from '../src/config';

const id = 'b'.repeat(32);
async function read(stream: Readable) {
  const parts: Buffer[] = [];
  for await (const part of stream) parts.push(Buffer.from(part));
  return Buffer.concat(parts).toString('utf8');
}

test('Nextcloud missing object falls back to a previously stored local file', async () => {
  const old = { enabled: config.nextcloud.enabled, dataDir: config.dataDir, url: config.nextcloud.url, userId: config.nextcloud.userId, username: config.nextcloud.username, appPassword: config.nextcloud.appPassword };
  const realFetch = globalThis.fetch;
  const dir = await mkdtemp(path.join(os.tmpdir(), 'terzo-security-test-'));
  try {
    config.dataDir = dir;
    config.nextcloud.enabled = true;
    config.nextcloud.url = 'https://cloud.example.test';
    config.nextcloud.userId = 'operator';
    config.nextcloud.username = 'operator';
    config.nextcloud.appPassword = 'test-password';
    await mkdir(path.join(dir, 'blobs'));
    await writeFile(path.join(dir, 'blobs', id), 'fallback-ok');
    globalThis.fetch = async (_input, init) => {
      assert.equal(init?.method, 'GET');
      assert.ok(init?.signal);
      return new Response(null, { status: 404 });
    };
    const item = await new StorageService().openAsset(id);
    assert.equal(item?.kind, 'local');
    assert.equal(item && await read(item.stream), 'fallback-ok');
  } finally {
    globalThis.fetch = realFetch;
    Object.assign(config.nextcloud, { enabled: old.enabled, url: old.url, userId: old.userId, username: old.username, appPassword: old.appPassword });
    config.dataDir = old.dataDir;
    await rm(dir, { recursive: true, force: true });
  }
});

test('remote file without Content-Length does not pretend to be empty', async () => {
  const prev = { ...config.nextcloud };
  const realFetch = globalThis.fetch;
  try {
    Object.assign(config.nextcloud, { enabled: true, url: 'https://cloud.example.test', userId: 'u', username: 'u', appPassword: 'test' });
    globalThis.fetch = async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('data')); controller.close(); },
    }), { status: 200 });
    const item = await new StorageService().openAsset(id);
    assert.equal(item?.kind, 'remote');
    assert.equal(item?.size, undefined);
    if (item) assert.equal(await read(item.stream), 'data');
  } finally {
    globalThis.fetch = realFetch;
    Object.assign(config.nextcloud, prev);
  }
});

test('upload keeps a local copy and reports a synchronized remote object', async () => {
  const previous = { dataDir: config.dataDir, nextcloud: { ...config.nextcloud } };
  const realFetch = globalThis.fetch;
  const dir = await mkdtemp(path.join(os.tmpdir(), 'terzo-upload-test-'));
  try {
    config.dataDir = dir;
    Object.assign(config.nextcloud, { enabled: true, url: 'https://cloud.example.test', userId: 'u', username: 'u', appPassword: 'test', retries: 0 });
    globalThis.fetch = async (_url, init) => {
      assert.equal(init?.method, 'PUT');
      return new Response(null, { status: 201, headers: { etag: '"etag-1"' } });
    };
    const result = await new StorageService().putAsset(id, Buffer.from('upload-ok'), 'BASE/CLIENT/' + id);
    assert.equal(result.state, 'synced');
    assert.equal(result.remotePath, 'BASE/CLIENT/' + id);
    assert.equal(result.remoteEtag, '"etag-1"');
    assert.equal((await readFile(path.join(dir, 'blobs', id))).toString(), 'upload-ok');
  } finally {
    globalThis.fetch = realFetch;
    config.dataDir = previous.dataDir;
    Object.assign(config.nextcloud, previous.nextcloud);
    await rm(dir, { recursive: true, force: true });
  }
});

test('Nextcloud outage leaves upload pending without losing the local file', async () => {
  const previous = { dataDir: config.dataDir, nextcloud: { ...config.nextcloud } };
  const realFetch = globalThis.fetch;
  const dir = await mkdtemp(path.join(os.tmpdir(), 'terzo-outage-test-'));
  try {
    config.dataDir = dir;
    Object.assign(config.nextcloud, { enabled: true, url: 'https://cloud.example.test', userId: 'u', username: 'u', appPassword: 'test', retries: 0 });
    globalThis.fetch = async () => { throw new TypeError('network down'); };
    const storage = new StorageService();
    const result = await storage.putAsset(id, Buffer.from('survives'));
    assert.equal(result.state, 'pending');
    assert.match(result.error || '', /indisponível/i);
    assert.equal((await readFile(path.join(dir, 'blobs', id))).toString(), 'survives');
    assert.equal(storage.status().state, 'degraded');
  } finally {
    globalThis.fetch = realFetch;
    config.dataDir = previous.dataDir;
    Object.assign(config.nextcloud, previous.nextcloud);
    await rm(dir, { recursive: true, force: true });
  }
});

test('Nextcloud requests abort at the configured timeout and expose metrics', async () => {
  const previous = { ...config.nextcloud };
  const realFetch = globalThis.fetch;
  try {
    Object.assign(config.nextcloud, { enabled: true, url: 'https://cloud.example.test', userId: 'u', username: 'u', appPassword: 'test', retries: 0, healthTimeoutMs: 10 });
    globalThis.fetch = async (_url, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    });
    const storage = new StorageService();
    await assert.rejects(() => storage.inspectRemote('BASE/file'), /Tempo limite/i);
    assert.equal(storage.status().timeouts, 1);
    assert.equal(storage.status().state, 'degraded');
  } finally {
    globalThis.fetch = realFetch;
    Object.assign(config.nextcloud, previous);
  }
});

test('probe uploads, downloads and removes an isolated test object', async () => {
  const previous = { ...config.nextcloud };
  const realFetch = globalThis.fetch;
  const methods: string[] = [];
  let stored = Buffer.alloc(0);
  try {
    Object.assign(config.nextcloud, { enabled: true, url: 'https://cloud.example.test', userId: 'u', username: 'u', appPassword: 'test', retries: 0 });
    globalThis.fetch = async (_url, init) => {
      const method = String(init?.method || 'GET'); methods.push(method);
      if (method === 'PUT') { stored = Buffer.from(await new Response(init?.body).arrayBuffer()); return new Response(null, { status: 201 }); }
      if (method === 'GET') return new Response(stored, { status: 200 });
      if (method === 'DELETE') return new Response(null, { status: 204 });
      return new Response(null, { status: 500 });
    };
    const result = await new StorageService().probe();
    assert.equal(result.ok, true);
    assert.deepEqual(methods, ['PUT', 'GET', 'DELETE']);
  } finally {
    globalThis.fetch = realFetch;
    Object.assign(config.nextcloud, previous);
  }
});

test('transient server failure is retried and then succeeds', async () => {
  const previous = { ...config.nextcloud };
  const realFetch = globalThis.fetch;
  let attempts = 0;
  try {
    Object.assign(config.nextcloud, { enabled: true, url: 'https://cloud.example.test', userId: 'u', username: 'u', appPassword: 'test', retries: 1 });
    globalThis.fetch = async () => ++attempts === 1
      ? new Response(null, { status: 503 })
      : new Response(null, { status: 200, headers: { 'content-length': '4' } });
    const storage = new StorageService();
    const result = await storage.inspectRemote('BASE/file');
    assert.equal(result.exists, true);
    assert.equal(attempts, 2);
    assert.equal(storage.status().retries, 1);
  } finally {
    globalThis.fetch = realFetch;
    Object.assign(config.nextcloud, previous);
  }
});

test('Nextcloud browser lists folders and files and can copy a selected file server-side', async () => {
  const previous = { ...config.nextcloud };
  const realFetch = globalThis.fetch;
  const methods: string[] = [];
  try {
    Object.assign(config.nextcloud, { enabled: true, url: 'https://cloud.example.test', userId: 'u', username: 'u', appPassword: 'test', retries: 0 });
    globalThis.fetch = async (_url, init) => {
      const method = String(init?.method || 'GET'); methods.push(method);
      if (method === 'COPY') {
        assert.match(String((init?.headers as any)?.Destination), /CLIENT\/asset-id$/);
        return new Response(null, { status: 201 });
      }
      const xml = `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">
        <d:response><d:href>/remote.php/dav/files/u/BASE/CLIENT/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>
        <d:response><d:href>/remote.php/dav/files/u/BASE/CLIENT/BRUTOS/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype><d:getetag>folder-etag</d:getetag></d:prop></d:propstat></d:response>
        <d:response><d:href>/remote.php/dav/files/u/BASE/CLIENT/logo.png</d:href><d:propstat><d:prop><d:resourcetype/><d:getetag>file-etag</d:getetag><d:getcontentlength>123</d:getcontentlength><d:getcontenttype>image/png</d:getcontenttype></d:prop></d:propstat></d:response>
      </d:multistatus>`;
      return new Response(xml, { status: 207 });
    };
    const storage = new StorageService();
    const entries = await storage.listEntries('BASE/CLIENT');
    assert.deepEqual(entries.map((entry) => [entry.name, entry.directory, entry.size, entry.contentType]), [
      ['BRUTOS', true, undefined, undefined], ['logo.png', false, 123, 'image/png'],
    ]);
    await storage.copyRemote('BASE/CLIENT/logo.png', 'BASE/CLIENT/asset-id');
    assert.deepEqual(methods, ['PROPFIND', 'COPY']);
  } finally {
    globalThis.fetch = realFetch;
    Object.assign(config.nextcloud, previous);
  }
});
