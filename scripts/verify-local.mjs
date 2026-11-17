import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { PrismaClient, createPostgresAdapter } from '@terzo/database';

const values = {};
for (const raw of fs.readFileSync(path.resolve('.env'), 'utf8').split(/\r?\n/)) {
  const match = raw.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  values[match[1]] = value;
}
process.env.DATABASE_URL = values.DATABASE_URL;

const prisma = new PrismaClient({ adapter: createPostgresAdapter() });
const sid = crypto.randomBytes(32).toString('base64url');
const idHash = crypto.createHash('sha256').update(sid).digest('hex');
const profile = path.join(os.tmpdir(), `terzo-chrome-${crypto.randomUUID()}`);
const chromePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome');
const port = 9223;
let chrome;

const waitForApplication = async () => {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch('http://localhost:3000/healthz', { cache: 'no-store' });
      if (response.ok && (await response.json()).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('A aplicação não ficou pronta na porta 3000.');
};

const waitForChrome = async () => {
  for (let attempt = 0; attempt < 30; attempt++) {
    try { return await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await new Promise((resolve) => setTimeout(resolve, 250)); }
  }
  throw new Error('Chrome não iniciou a porta de diagnóstico.');
};

try {
  await waitForApplication();
  const user = await prisma.user.findFirst({ where: { status: 'active', mustChange: false, role: { in: ['owner', 'editor'] } } });
  if (!user) throw new Error('Nenhum usuário ativo e pronto para a verificação.');
  const now = BigInt(Date.now());
  await prisma.session.create({ data: { idHash, userId: user.id, ver: user.sessionVersion, createdAt: now, lastSeen: now, expiresAt: now + 3_600_000n, ip: 'local-verification', ua: 'Chrome local verification' } });

  fs.mkdirSync(profile, { recursive: true });
  chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--disable-gpu', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  const targets = await waitForChrome();
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('Página de diagnóstico do Chrome não encontrada.');

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const events = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id); pending.delete(message.id);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      events.push({ type: 'exception', detail: message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text });
    } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      events.push({ type: 'console', detail: message.params.args.map((arg) => arg.value || arg.description).join(' ') });
    } else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400 && !message.params.response.url.endsWith('/favicon.ico')) {
      events.push({ type: 'http', status: message.params.response.status, detail: message.params.response.url });
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Network.setCookie', { name: 'terzo_sid', value: sid, url: 'http://localhost:3000' });
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise((resolve) => setTimeout(resolve, 8000));
  const expression = `({heading:document.querySelector('.workspace-body h1')?.textContent||'',account:document.querySelector('.sidebar .account strong')?.textContent||'',modules:document.querySelectorAll('.module-card').length,login:location.pathname==='/login'})`;
  let evaluation = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (!evaluation.result.value.heading || evaluation.result.value.modules < 5) {
    await send('Page.reload', { ignoreCache: true });
    await new Promise((resolve) => setTimeout(resolve, 6000));
    evaluation = await send('Runtime.evaluate', { expression, returnByValue: true });
  }
  socket.close();
  const state = evaluation.result.value;
  console.log(JSON.stringify({ events, state }, null, 2));
  if (events.length || state.login || !state.heading || !state.account || state.modules < 5) process.exitCode = 1;
} finally {
  if (chrome && chrome.exitCode == null) {
    const stopped = new Promise((resolve) => { chrome.once('exit', resolve); setTimeout(resolve, 2000); });
    chrome.kill(); await stopped;
  }
  await prisma.session.deleteMany({ where: { idHash } }).catch(() => undefined);
  await prisma.$disconnect();
  const resolvedProfile = path.resolve(profile);
  if (resolvedProfile.startsWith(path.resolve(os.tmpdir()) + path.sep)) {
    try { fs.rmSync(resolvedProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { console.warn('Não foi possível remover imediatamente o perfil temporário do Chrome.'); }
  }
}
