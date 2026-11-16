import { Injectable } from '@nestjs/common';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { config } from './config';

export type StoredObject =
  | { kind: 'local'; stream: Readable; size: number }
  | { kind: 'remote'; stream: Readable; size?: number; status: number; contentRange?: string; acceptRanges?: string };

@Injectable()
export class StorageService {
  private readonly blobsDir = path.join(config.dataDir, 'blobs');

  isNextcloudEnabled() { return config.nextcloud.enabled; }

  async putAsset(id: string, body: Buffer, destination?: string) {
    if (!this.isNextcloudEnabled()) {
      await fs.mkdir(this.blobsDir, { recursive: true });
      await fs.writeFile(path.join(this.blobsDir, id), body);
      return null;
    }
    const remotePath = destination || this.remotePath(config.nextcloud.systemFolder, id);
    await this.putRemote(remotePath, body, 'application/octet-stream');
    return remotePath;
  }

  async putBrand(body: Buffer) {
    this.requireNextcloud();
    await this.putRemote(this.remotePath(config.nextcloud.systemFolder, 'terzo-logo.png'), body, 'image/png');
  }

  async openAsset(id: string, range?: string, storedPath?: string | null): Promise<StoredObject | null> {
    let remoteError: unknown;
    if (this.isNextcloudEnabled()) {
      try {
        const remote = await this.getRemote(storedPath || this.remotePath(config.nextcloud.systemFolder, id), range);
        if (remote) return remote;
      } catch (error) { remoteError = error; }
    }
    const local = await this.openLocal(path.join(this.blobsDir, id));
    if (local) return local;
    if (remoteError) throw remoteError;
    return null;
  }

  async openBrand(): Promise<StoredObject | null> {
    let remoteError: unknown;
    if (this.isNextcloudEnabled()) {
      try {
        const remote = await this.getRemote(this.remotePath(config.nextcloud.systemFolder, 'terzo-logo.png'));
        if (remote) return remote;
      } catch (error) { remoteError = error; }
    }
    const local = await this.openLocal(path.join(process.cwd(), 'src', 'terzo_wm_dark.png'));
    if (local) return local;
    if (remoteError) throw remoteError;
    return null;
  }

  async deleteAsset(id: string, storedPath?: string | null) {
    if (this.isNextcloudEnabled()) {
      await this.request(storedPath || this.remotePath(config.nextcloud.systemFolder, id), { method: 'DELETE' }, [204, 404]);
    }
    await fs.unlink(path.join(this.blobsDir, id)).catch(() => undefined);
  }

  async migrateLocalAsset(id: string, directory: string) {
    this.requireNextcloud();
    const body = await fs.readFile(path.join(this.blobsDir, id));
    const destination = this.remotePath(directory, id);
    await this.putRemote(destination, body, 'application/octet-stream');
    return destination;
  }

  async listDirectories(): Promise<string[]> {
    this.requireNextcloud();
    const response = await this.request(this.remotePath(), {
      method: 'PROPFIND',
      headers: { Depth: '1', 'Content-Type': 'application/xml' },
      body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>',
    }, [207]);
    const xml = await response.text();
    return [...xml.matchAll(/<[^:>]*:?response>([\s\S]*?)<\/[^:>]*:?response>/g)].slice(1).flatMap((entry) => {
      if (!/<[^:>]*:?collection\s*\/>/.test(entry[1])) return [];
      const href = entry[1].match(/<[^:>]*:?href>(.*?)<\/[^:>]*:?href>/)?.[1];
      if (!href) return [];
      return [decodeURIComponent(href.replace(/\/$/, '').split('/').pop() || '')];
    }).filter(Boolean);
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
    const response = await this.request(remotePath, {
      method: 'GET',
      headers: range ? { Range: range } : undefined,
    }, [200, 206, 404]);
    if (response.status === 404) return null;
    if (!response.body) throw new Error('O Nextcloud retornou um arquivo sem conteúdo.');
    const length = Number(response.headers.get('content-length'));
    return {
      kind: 'remote',
      stream: Readable.fromWeb(response.body as any),
      size: Number.isFinite(length) ? length : undefined,
      status: response.status,
      contentRange: response.headers.get('content-range') || undefined,
      acceptRanges: response.headers.get('accept-ranges') || undefined,
    };
  }

  private async putRemote(remotePath: string, body: Buffer, contentType: string) {
    await this.request(remotePath, { method: 'PUT', headers: { 'Content-Type': contentType }, body: Uint8Array.from(body).buffer }, [201, 204]);
  }

  private remotePath(...segments: string[]) {
    return [...this.cleanSegments(config.nextcloud.basePath), ...segments].join('/');
  }

  private cleanSegments(value: string) {
    const segments = value.split('/').map((item) => item.trim()).filter(Boolean);
    if (segments.some((item) => item === '.' || item === '..')) throw new Error('NEXTCLOUD_BASE_PATH inválido.');
    return segments;
  }

  private async request(remotePath: string, init: RequestInit, accepted: number[]) {
    this.requireNextcloud();
    const root = `${config.nextcloud.url}/remote.php/dav/files/${encodeURIComponent(config.nextcloud.userId)}`;
    const encoded = remotePath.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${root}/${encoded}`, {
      ...init,
      redirect: 'manual',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.nextcloud.username}:${config.nextcloud.appPassword}`).toString('base64')}`,
        ...(init.headers || {}),
      },
    });
    if (!accepted.includes(response.status)) throw new Error(`Falha no Nextcloud (HTTP ${response.status}).`);
    return response;
  }

  private requireNextcloud() {
    if (!config.nextcloud.enabled) throw new Error('A integração com o Nextcloud não está habilitada.');
    if (!config.nextcloud.url || !config.nextcloud.username || !config.nextcloud.userId || !config.nextcloud.appPassword) {
      throw new Error('Configuração do Nextcloud incompleta. Verifique URL, usuário, ID do usuário e senha de aplicativo.');
    }
  }
}
