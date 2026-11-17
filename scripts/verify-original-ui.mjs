import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(root, 'apps', 'web');

async function startMockApi() {
  const server = createServer((req, res) => {
    if (req.url !== '/api/auth/me') {
      res.writeHead(404).end();
      return;
    }
    const cookie = String(req.headers.cookie || '');
    let session = null;
    if (cookie.includes('test_sid=owner')) session = { canEdit: true, mustChange: false };
    if (cookie.includes('test_sid=viewer')) session = { canEdit: false, mustChange: false };
    if (cookie.includes('test_sid=change')) session = { canEdit: false, mustChange: true };
    if (!session) {
      res.writeHead(401).end('{}');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(session));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server;
}

async function getPort() {
  const net = await import('node:net');
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

const api = await startMockApi();
const port = await getPort();
const apiPort = api.address().port;
const nextBinary = path.join(webRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const proc = spawn(process.execPath, [nextBinary, 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: webRoot,
  env: { ...process.env, API_INTERNAL_URL: 'http://127.0.0.1:' + apiPort, NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
proc.stdout.on('data', (chunk) => { output += String(chunk); });
proc.stderr.on('data', (chunk) => { output += String(chunk); });

async function call(url, cookie) {
  return fetch('http://127.0.0.1:' + port + url, {
    redirect: 'manual',
    headers: cookie ? { Cookie: 'test_sid=' + cookie } : {},
    signal: AbortSignal.timeout(5000),
  });
}

async function expectRedirect(url, cookie, destination) {
  const res = await call(url, cookie);
  assert.ok([302, 303, 307, 308].includes(res.status), url + ' should redirect, got ' + res.status);
  assert.equal(new URL(res.headers.get('location')).pathname, destination, url);
}

async function expectHtml(url, cookie, content) {
  const res = await call(url, cookie);
  assert.equal(res.status, 200, url + ' HTTP ' + res.status);
  const html = await res.text();
  assert.ok(html.includes(content), url + ' did not contain original interface marker: ' + content);
  return html;
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (proc.exitCode !== null) break;
    try {
      // A login page is public, so it tests readiness without a real DB.
      const res = await call('/login');
      if (res.status === 200) { ready = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'Next.js did not start: ' + output.slice(-4000));

  await expectHtml('/login', null, 'Bem-vindo à Agência Terceiro Andar');
  await expectHtml('/legacy/login.html', null, 'Bem-vindo à Agência Terceiro Andar');
  await expectRedirect('/', null, '/login');
  await expectRedirect('/index.html', null, '/login');
  await expectRedirect('/legacy/index.html', null, '/login');
  await expectRedirect('/admin', null, '/login');
  await expectRedirect('/legacy/admin.html', null, '/login');

  const home = await expectHtml('/', 'owner', 'Terzo · Agência Terceiro Andar');
  assert.ok(home.includes('/terzo-runtime.js'), 'Old data bridge not loaded');
  assert.ok(home.includes('id="main"'), 'Original CRM mount point missing');
  await expectHtml('/legacy/index.html', 'owner', 'Terzo · Agência Terceiro Andar');
  await expectHtml('/index.html', 'viewer', 'Terzo · Agência Terceiro Andar');
  await expectHtml('/admin', 'owner', 'Logins · Terzo');
  await expectHtml('/legacy/admin.html', 'owner', 'Logins · Terzo');
  await expectRedirect('/admin', 'viewer', '/');
  await expectRedirect('/legacy/admin.html', 'viewer', '/');
  await expectRedirect('/', 'change', '/login');

  console.log('Original Terzo UI: route rewrites, login, role checks and direct static access passed.');
} finally {
  proc.kill();
  await new Promise((resolve) => {
    if (proc.exitCode !== null) return resolve();
    proc.once('exit', resolve);
    setTimeout(resolve, 2000).unref();
  });
  await new Promise((resolve) => api.close(resolve));
}
