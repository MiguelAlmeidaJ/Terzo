import { Injectable } from '@nestjs/common';
import { createReadStream, promises as fs } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { Readable } from 'node:stream';
import { config } from './config';

export type StoredObject =
  | { kind: 'local'; stream: Readable; size: number }
  | { kind: 'remote'; stream: Readable; size?: number; status: number; contentRange?: string; acceptRanges?: string };

export type StorageWriteResult = {
  remotePath: string | null;
  remoteEtag: string | null;
  state: 'local' | 'pending' | 'synced';
  error: string | null;
};

export type RemoteMetadata = { path: string; exists: boolean; size?: number; etag?: string };
export type NextcloudDirectory = { name: string; path: string; etag?: string };
export type NextcloudEntry = NextcloudDirectory & { directory: boolean; size?: number; contentType?: string };

export class NextcloudRequestError extends Error {
  constructor(message: string, readonly code: 'timeout' | 'unavailable' | 'http', readonly status?: number) {
    super(message);
    this.name = 'NextcloudRequestError';
  }
}

type Metrics = {
  requests: number;
  successes: number;
  errors: number;
  timeouts: number;
  retries: number;
  bytesUploaded: number;
  bytesDownloaded: number;
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
  lastError: string | null;
  lastLatencyMs: number | null;
};

@Injectable()
export class StorageService {
  private readonly metrics: Metrics = {
    requests: 0, successes: 0, errors: 0, timeouts: 0, retries: 0,
    bytesUploaded: 0, bytesDownloaded: 0, lastSuccessAt: null,
    lastErrorAt: null, lastError: null, lastLatencyMs: null,
  };

  private get blobsDir() { return path.join(config.dataDir, 'blobs'); }
  isNextcloudEnabled() { return config.nextcloud.enabled; }

  status() {
    const healthy = !this.metrics.lastErrorAt || !!this.metrics.lastSuccessAt && this.metrics.lastSuccessAt >= this.metrics.lastErrorAt;
    return {
      enabled: this.isNextcloudEnabled(),
      state: !this.isNextcloudEnabled() ? 'disabled' : this.metrics.requests === 0 ? 'unknown' : healthy ? 'healthy' : 'degraded',
      ...this.metrics,
    };
  }

  directoryPath(folder: string) { return this.remotePath(folder); }
  assetPath(folderPath: string, id: string, contentType?: string) { return this.joinRemote(folderPath, this.assetFileName(id, contentType)); }

  async putAsset(id: string, body: Buffer, _destination?: string, _contentType = 'application/octet-stream'): Promise<StorageWriteResult> {
    // A durable local copy is the first step. Never block user uploads on WebDAV.
    // The pending state is persisted in PostgreSQL and retried by reconciliation.
    await this.writeLocal(id, body);
    return { remotePath: null, remoteEtag: null, state: this.isNextcloudEnabled() ? 'pending' : 'local', error: null };
  }

  async discardLocalAsset(id: string): Promise<void> {
    // Only used to roll back a failed metadata insert. No remote request.
    await fs.unlink(this.localPath(id)).catch((error: any) => {
      if (error?.code !== 'ENOENT') throw error;
    });
  }

  async putBrand(body: Buffer) {
    this.requireNextcloud();
    return this.putRemote(this.remotePath(config.nextcloud.systemFolder, 'Terzo', 'terzo-logo.png'), body, 'image/png');
  }

  async openAsset(id: string, range?: string, storedPath?: string | null): Promise<StoredObject | null> {
    let remoteError: unknown;
    if (this.isNextcloudEnabled()) {
      try {
        const remote = await this.getRemote(storedPath || this.remotePath(config.nextcloud.systemFolder, id), range);
        if (remote) return remote;
      } catch (error) { remoteError = error; }
    }
    const local = await this.openLocal(this.localPath(id));
    if (local) return local;
    if (remoteError) throw remoteError;
    return null;
  }

  async openBrand(): Promise<StoredObject | null> {
    // The bundled logo must never wait for Nextcloud on initial page load.
    const local = await this.openLocal(path.join(__dirname, '..', 'assets', 'brand.png'));
    if (local) return local;

    // Only use remote storage when the bundled asset is absent.
    if (!this.isNextcloudEnabled()) return null;
    return this.getRemote(this.remotePath(config.nextcloud.systemFolder, 'Terzo', 'terzo-logo.png'));
  }

  async deleteAsset(id: string, storedPath?: string | null) {
    let remoteError: unknown;
    if (this.isNextcloudEnabled()) {
      try { await this.request(storedPath || this.remotePath(config.nextcloud.systemFolder, id), { method: 'DELETE' }, [204, 404]); }
      catch (error) { remoteError = error; }
    }
    await fs.unlink(this.localPath(id)).catch((error: any) => { if (error?.code !== 'ENOENT') throw error; });
    if (remoteError) throw remoteError;
  }

  async hasLocalAsset(id: string) {
    try { await fs.access(this.localPath(id)); return true; } catch { return false; }
  }

  async uploadLocalAsset(id: string, destination: string, contentType = 'application/octet-stream') {
    this.requireNextcloud();
    const body = await fs.readFile(this.localPath(id));
    const remoteEtag = await this.putRemote(destination, body, contentType);
    return { remotePath: destination, remoteEtag };
  }

  async migrateLocalAsset(id: string, directory: string) {
    return (await this.uploadLocalAsset(id, this.remotePath(directory, id))).remotePath;
  }

  async inspectRemote(remotePath: string): Promise<RemoteMetadata> {
    const response = await this.request(remotePath, { method: 'HEAD' }, [200, 404]);
    if (response.status === 404) return { path: remotePath, exists: false };
    const size = Number(response.headers.get('content-length'));
    return { path: remotePath, exists: true, size: Number.isFinite(size) ? size : undefined, etag: response.headers.get('etag') || undefined };
  }

  async moveRemote(source: string, destination: string) {
    if (source === destination) return;
    await this.request(source, { method: 'MOVE', headers: { Destination: this.remoteUrl(destination), Overwrite: 'T' } }, [201, 204]);
  }

  async listDirectories(): Promise<string[]> {
    return (await this.listDirectoryEntries()).map((entry) => entry.name);
  }

  async listDirectoryEntries(): Promise<NextcloudDirectory[]> {
    return (await this.listEntries(this.remotePath())).filter((entry) => entry.directory);
  }

  async listEntries(directory: string): Promise<NextcloudEntry[]> {
    this.requireNextcloud();
    const safeDirectory = this.joinRemote(directory);
    const response = await this.request(safeDirectory, {
      method: 'PROPFIND', headers: { Depth: '1', 'Content-Type': 'application/xml' },
      body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getetag/><d:getcontentlength/><d:getcontenttype/></d:prop></d:propfind>',
    }, [207]);
    const xml = await response.text();
    return [...xml.matchAll(/<[^:>]*:?response>([\s\S]*?)<\/[^:>]*:?response>/g)].slice(1).flatMap((entry) => {
      const href = entry[1].match(/<[^:>]*:?href>(.*?)<\/[^:>]*:?href>/)?.[1];
      if (!href) return [];
      const encodedName = href.replace(/\/$/, '').split('/').pop() || '';
      const name = decodeURIComponent(encodedName.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
      if (!name) return [];
      const etag = entry[1].match(/<[^:>]*:?getetag>(.*?)<\/[^:>]*:?getetag>/)?.[1];
      const contentType = entry[1].match(/<[^:>]*:?getcontenttype>(.*?)<\/[^:>]*:?getcontenttype>/)?.[1];
      const parsedSize = Number(entry[1].match(/<[^:>]*:?getcontentlength>(.*?)<\/[^:>]*:?getcontentlength>/)?.[1]);
      return [{
        name, path: this.joinRemote(safeDirectory, name), etag,
        directory: /<[^:>]*:?collection\s*\/>/.test(entry[1]),
        size: Number.isFinite(parsedSize) ? parsedSize : undefined,
        contentType: contentType || undefined,
      }];
    });
  }

  async copyRemote(source: string, destination: string) {
    if (source === destination) return;
    await this.request(source, { method: 'COPY', headers: { Destination: this.remoteUrl(destination), Overwrite: 'F' } }, [201, 204]);
  }

  async probe() {
    this.requireNextcloud();
    const started = Date.now();
    const marker = `terzo-probe-${randomBytes(8).toString('hex')}.txt`;
    const remotePath = this.remotePath(config.nextcloud.systemFolder, marker);
    const body = Buffer.from(`terzo:${Date.now()}:${randomBytes(8).toString('hex')}`);
    let uploaded = false;
    try {
      await this.putRemote(remotePath, body, 'text/plain');
      uploaded = true;
      const downloaded = await this.getRemoteBuffer(remotePath);
      if (!downloaded.equals(body)) throw new NextcloudRequestError('O arquivo de teste voltou diferente do conteúdo enviado.', 'unavailable');
      return { ok: true, latencyMs: Date.now() - started, bytes: body.length };
    } finally {
      if (uploaded) await this.request(remotePath, { method: 'DELETE' }, [204, 404]);
    }
  }

  private async writeLocal(id: string, body: Buffer) {
    await fs.mkdir(this.blobsDir, { recursive: true });
    const target = this.localPath(id);
    const temporary = `${target}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
    try {
      await fs.writeFile(temporary, body, { flag: 'wx' });
      await fs.rename(temporary, target);
    } finally {
      await fs.unlink(temporary).catch(() => undefined);
    }
  }

  private async openLocal(file: string): Promise<StoredObject | null> {
    try {
      const stat = await fs.stat(file);
      return { kind: 'local', stream: createReadStream(file), size: stat.size };
    } catch (error: any) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  }

  private async getRemote(remotePath: string, range?: string): Promise<StoredObject | null> {
    const response = await this.request(remotePath, { method: 'GET', headers: range ? { Range: range } : undefined }, [200, 206, 404]);
    if (response.status === 404) return null;
    if (!response.body) throw new NextcloudRequestError('O Nextcloud retornou um arquivo sem conteúdo.', 'unavailable');
    const contentLength = response.headers.get('content-length');
    const length = contentLength == null ? NaN : Number(contentLength);
    if (Number.isFinite(length)) this.metrics.bytesDownloaded += length;
    return {
      kind: 'remote', stream: Readable.fromWeb(response.body as any), size: Number.isFinite(length) ? length : undefined,
      status: response.status, contentRange: response.headers.get('content-range') || undefined,
      acceptRanges: response.headers.get('accept-ranges') || undefined,
    };
  }

  private async getRemoteBuffer(remotePath: string) {
    const response = await this.request(remotePath, { method: 'GET' }, [200]);
    const body = Buffer.from(await response.arrayBuffer());
    this.metrics.bytesDownloaded += body.length;
    return body;
  }

  private async putRemote(remotePath: string, body: Buffer, contentType: string) {
    const response = await this.request(remotePath, { method: 'PUT', headers: { 'Content-Type': contentType }, body: Uint8Array.from(body).buffer }, [201, 204]);
    this.metrics.bytesUploaded += body.length;
    return response.headers.get('etag');
  }

  private remotePath(...segments: string[]) { return this.joinRemote(config.nextcloud.basePath, ...segments); }
  private localPath(id: string) {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(id)) throw new Error('Identificador de arquivo inválido.');
    return path.join(this.blobsDir, id);
  }
  private joinRemote(...values: string[]) {
    const segments = values.flatMap((value) => value.split('/')).map((item) => item.trim()).filter(Boolean);
    if (segments.some((item) => item === '.' || item === '..')) throw new Error('Caminho do Nextcloud inválido.');
    return segments.join('/');
  }

  private assetFileName(id: string, contentType?: string) {
    const extension = ({
      'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp',
      'application/pdf': 'pdf', 'video/mp4': 'mp4', 'video/webm': 'webm', 'text/plain': 'txt',
      'text/csv': 'csv', 'text/markdown': 'md', 'application/json': 'json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    } as Record<string, string>)[String(contentType || '').toLowerCase()];
    return extension && !id.toLowerCase().endsWith(`.${extension}`) ? `${id}.${extension}` : id;
  }

  private remoteRoot() {
    this.requireNextcloud();
    return `${config.nextcloud.url}/remote.php/dav/files/${encodeURIComponent(config.nextcloud.userId)}`;
  }

  private remoteUrl(remotePath: string) {
    const encoded = this.joinRemote(remotePath).split('/').map(encodeURIComponent).join('/');
    return `${this.remoteRoot()}/${encoded}`;
  }

  private async request(remotePath: string, init: RequestInit, accepted: number[]) {
    this.requireNextcloud();
    const method = String(init.method || 'GET').toUpperCase();
    const timeout = method === 'GET' ? config.nextcloud.readTimeoutMs : ['HEAD', 'PROPFIND'].includes(method) ? config.nextcloud.healthTimeoutMs : config.nextcloud.writeTimeoutMs;
    const retryableMethod = ['GET', 'HEAD', 'PROPFIND', 'PUT', 'DELETE', 'MOVE', 'COPY'].includes(method);
    let lastError: unknown;
    for (let attempt = 0; attempt <= config.nextcloud.retries; attempt++) {
      const started = Date.now();
      const timeoutController = new AbortController();
      const timeoutHandle = setTimeout(() => {
        timeoutController.abort(new DOMException('Nextcloud request timed out.', 'TimeoutError'));
      }, timeout);
      const signal = init.signal
        ? AbortSignal.any([init.signal, timeoutController.signal])
        : timeoutController.signal;
      this.metrics.requests++;
      try {
        const response = await fetch(this.remoteUrl(remotePath), {
          ...init, redirect: 'manual', signal,
          headers: { Authorization: `Basic ${Buffer.from(`${config.nextcloud.username}:${config.nextcloud.appPassword}`).toString('base64')}`, ...(init.headers || {}) },
        });
        this.metrics.lastLatencyMs = Date.now() - started;
        if (accepted.includes(response.status)) {
          this.metrics.successes++;
          this.metrics.lastSuccessAt = Date.now();
          return response;
        }
        const retryableStatus = response.status === 408 || response.status === 429 || response.status >= 500;
        lastError = new NextcloudRequestError(`Falha no Nextcloud (HTTP ${response.status}).`, 'http', response.status);
        if (!retryableMethod || !retryableStatus || attempt >= config.nextcloud.retries) break;
      } catch (error: any) {
        const timeoutError = error?.name === 'TimeoutError' || error?.name === 'AbortError';
        lastError = new NextcloudRequestError(timeoutError ? 'Tempo limite excedido ao acessar o Nextcloud.' : 'Nextcloud indisponível.', timeoutError ? 'timeout' : 'unavailable');
        if (timeoutError) this.metrics.timeouts++;
        if (!retryableMethod || attempt >= config.nextcloud.retries) break;
      } finally {
        clearTimeout(timeoutHandle);
      }
      this.metrics.retries++;
      await new Promise((resolve) => setTimeout(resolve, Math.min(200 * 2 ** attempt, 1_500)));
    }
    this.metrics.errors++;
    this.metrics.lastErrorAt = Date.now();
    this.metrics.lastError = this.errorMessage(lastError);
    throw lastError;
  }

  private errorMessage(error: unknown) { return String((error as any)?.message || error || 'Falha desconhecida no Nextcloud.').slice(0, 500); }
  private requireNextcloud() {
    if (!config.nextcloud.enabled) throw new Error('A integração com o Nextcloud não está habilitada.');
    if (!config.nextcloud.url || !config.nextcloud.username || !config.nextcloud.userId || !config.nextcloud.appPassword) {
      throw new Error('Configuração do Nextcloud incompleta. Verifique URL, usuário, ID do usuário e senha de aplicativo.');
    }
  }
}
