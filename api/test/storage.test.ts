import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
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
