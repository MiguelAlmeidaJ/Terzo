import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode, NotFoundException, Param, Post, Query, Req, Res, UnsupportedMediaTypeException } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { AuthService } from './auth.service';
import { AccessService } from './access.service';
import { PrismaService } from './prisma.service';
import { config, now, toNumber } from './config';
import { sha256 } from './security';
import { StorageService, StoredObject } from './storage.service';
import { AssetAccessService } from './asset-access.service';

@Controller()
export class AssetsController {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService, private readonly access: AccessService, private readonly storage: StorageService, private readonly assetAccess: AssetAccessService) {}

  @Post('api/assets')
  @HttpCode(200)
  async upload(@Req() req: Request, @Res({ passthrough: true }) _res: Response) {
    const { user } = await this.auth.requireReady(req);
    const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (mime === 'image/svg+xml' || !config.allowedMime.includes(mime)) throw new UnsupportedMediaTypeException('unsupported_type');
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    if (!body.length) throw new BadRequestException('empty');
    if (body.length > config.maxUploadMB * 1_048_576) throw new BadRequestException('too_large');
    if (!this.sniff(mime, body)) throw new UnsupportedMediaTypeException('content_mismatch');
    const id = randomBytes(16).toString('hex');
    const clientId = String(req.headers['x-client-id'] || '').trim() || null;
    let destination: string | undefined;
    if (clientId) {
      if (!/^(?!\.\.?$)[A-Za-z0-9_\-.~:@+]{1,200}$/.test(clientId)) throw new BadRequestException('invalid_client');
      const client = await this.prisma.document.findUnique({ where: { collection_id: { collection: 'clients', id: clientId } } });
      if (!client || !this.access.can(user, `clients/${clientId}`, 'read')) throw new ForbiddenException('permission_denied');
      const binding = await this.prisma.clientStorageBinding.findUnique({ where: { clientId } });
      if (binding?.status === 'active') destination = this.storage.assetPath(binding.folderPath, id, mime);
    }
    const stored = await this.storage.putAsset(id, body, destination, mime);
    let decodedName = '';
    try { decodedName = decodeURIComponent(String(req.headers['x-file-name'] || '')); } catch { decodedName = 'arquivo'; }
    const name = decodedName.replace(/[\\/\r\n"]/g, '_').slice(0, 200);
    try {
      await this.prisma.asset.create({ data: {
        id, owner: user.id, mime, size: body.length, name, sha256: sha256(body), clientId,
        remotePath: stored.remotePath, remoteEtag: stored.remoteEtag, storageState: stored.state,
        storageError: stored.error, lastVerifiedAt: stored.state === 'synced' ? now() : null, createdAt: now(),
      } });
    } catch (error) {
      await this.storage.discardLocalAsset(id).catch(() => undefined);
      throw error;
    }
    return { id, url: `/_blob/${id}`, contentType: mime, sizeBytes: body.length, storageState: stored.state };
  }

  @Get('api/assets')
  async list(@Req() req: Request) {
    const { user } = await this.auth.requireReady(req);
    const assets = await this.prisma.asset.findMany({ where: this.access.level(user) >= 3 ? {} : { owner: user.id } });
    return { assets: assets.map((asset) => ({ id: asset.id, url: `/_blob/${asset.id}`, contentType: asset.mime, sizeBytes: asset.size, name: asset.name, clientId: asset.clientId, storageState: asset.storageState })) };
  }

  @Get('api/assets/nextcloud/:clientId')
  async nextcloudFiles(@Param('clientId') clientId: string, @Query('path') requestedPath: string | undefined, @Req() req: Request) {
    const { user } = await this.auth.requireReady(req);
    const binding = await this.clientBinding(user, clientId);
    const currentPath = String(requestedPath || binding.folderPath).trim();
    this.assertInsideBinding(currentPath, binding.folderPath);
    const entries = await this.storage.listEntries(currentPath);
    return {
      clientId, rootPath: binding.folderPath, currentPath,
      entries: entries.map((entry) => ({
        name: entry.name, path: entry.path, directory: entry.directory,
        sizeBytes: entry.size ?? 0, contentType: entry.contentType || this.mimeFromName(entry.name),
      })),
    };
  }

  @Post('api/assets/nextcloud')
  @HttpCode(200)
  async importNextcloud(@Body() body: any, @Req() req: Request) {
    const { user } = await this.auth.requireReady(req);
    const clientId = String(body?.clientId || '').trim();
    const sourcePath = String(body?.path || '').trim();
    const binding = await this.clientBinding(user, clientId);
    this.assertInsideBinding(sourcePath, binding.folderPath);
    const separator = sourcePath.lastIndexOf('/');
    if (separator < binding.folderPath.length) throw new BadRequestException('invalid_path');
    const parent = sourcePath.slice(0, separator);
    const source = (await this.storage.listEntries(parent)).find((entry) => entry.path === sourcePath && !entry.directory);
    if (!source) throw new NotFoundException('not_found');
    const mime = String(source.contentType || this.mimeFromName(source.name)).split(';')[0].toLowerCase();
    if (mime === 'image/svg+xml' || !config.allowedMime.includes(mime)) throw new UnsupportedMediaTypeException('unsupported_type');
    const size = source.size || 0;
    if (size > 2_000_000_000) throw new BadRequestException('too_large');
    const id = randomBytes(16).toString('hex');
    const destination = this.storage.assetPath(binding.folderPath, id, mime);
    await this.storage.copyRemote(source.path, destination);
    try {
      const metadata = await this.storage.inspectRemote(destination);
      await this.prisma.asset.create({ data: {
        id, owner: user.id, mime, size, name: source.name.slice(0, 200), sha256: null, clientId,
        remotePath: destination, remoteEtag: metadata.etag || source.etag || null,
        storageState: 'synced', storageError: null, lastVerifiedAt: now(), createdAt: now(),
      } });
    } catch (error) {
      await this.storage.deleteAsset(id, destination).catch(() => undefined);
      throw error;
    }
    return { id, url: `/_blob/${id}`, contentType: mime, sizeBytes: size, name: source.name, storageState: 'synced' };
  }

  @Delete('api/assets/:id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const { user } = await this.auth.requireReady(req);
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('not_found');
    if (asset.owner !== user.id && this.access.level(user) < 3) throw new ForbiddenException('permission_denied');
    await this.storage.deleteAsset(id, asset.remotePath);
    await this.prisma.asset.delete({ where: { id } });
    return { ok: true };
  }

  @Get('_blob/:id')
  async blob(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const { user } = await this.auth.requireReady(req);
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('not_found');
    if (!(await this.assetAccess.canRead(user, asset))) throw new ForbiddenException('permission_denied');
    const object = await this.storage.openAsset(asset.id, String(req.headers.range || '') || undefined, asset.remotePath);
    if (!object) throw new NotFoundException('not_found');
    const inline = /^(image\/(png|jpeg|gif|webp)|application\/pdf|video\/)/.test(asset.mime);
    res.set({
      'Content-Type': asset.mime, 'Content-Length': String(object.size ?? asset.size), 'Cache-Control': 'private, max-age=86400',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(asset.name || asset.id)}`,
      ...(asset.mime === 'image/svg+xml' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } : {}),
    });
    if (object.kind === 'remote') {
      res.status(object.status);
      if (object.contentRange) res.set('Content-Range', object.contentRange);
      if (object.acceptRanges) res.set('Accept-Ranges', object.acceptRanges);
    }
    object.stream.pipe(res);
  }

  @Get('brand/logo')
  async brand(@Res() res: Response) {
    const object = await this.storage.openBrand();
    if (!object) throw new NotFoundException('not_found');
    this.sendObject(res, object, 'image/png', 'public, max-age=3600');
  }

  private sendObject(res: Response, object: StoredObject, contentType: string, cacheControl: string) {
    res.status(object.kind === 'remote' ? object.status : 200);
    res.set({ 'Content-Type': contentType, 'Cache-Control': cacheControl, ...(object.size != null ? { 'Content-Length': String(object.size) } : {}) });
    object.stream.pipe(res);
  }

  private async clientBinding(user: any, clientId: string) {
    if (!/^(?!\.\.?$)[A-Za-z0-9_\-.~:@+]{1,200}$/.test(clientId)) throw new BadRequestException('invalid_client');
    const client = await this.prisma.document.findUnique({ where: { collection_id: { collection: 'clients', id: clientId } } });
    if (!client || !this.access.can(user, `clients/${clientId}`, 'read')) throw new ForbiddenException('permission_denied');
    const binding = await this.prisma.clientStorageBinding.findUnique({ where: { clientId } });
    if (!binding || binding.status !== 'active') throw new NotFoundException('storage_binding_not_found');
    return binding;
  }

  private assertInsideBinding(candidate: string, root: string) {
    if (!candidate || (candidate !== root && !candidate.startsWith(`${root}/`)) || candidate.split('/').some((part) => part === '.' || part === '..')) {
      throw new BadRequestException('invalid_path');
    }
  }

  private mimeFromName(name: string) {
    const extension = name.toLowerCase().split('.').pop();
    return ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf', mp4: 'video/mp4', webm: 'video/webm', txt: 'text/plain', csv: 'text/csv', md: 'text/markdown', json: 'application/json', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' } as Record<string, string>)[extension || ''] || 'application/octet-stream';
  }

  private sniff(mime: string, buffer: Buffer) {
    const header = buffer.subarray(0, 12); const text = header.toString('latin1');
    if (mime === 'image/png') return header[0] === 0x89 && text.slice(1, 4) === 'PNG';
    if (mime === 'image/jpeg') return header[0] === 0xff && header[1] === 0xd8;
    if (mime === 'image/gif') return text.startsWith('GIF8');
    if (mime === 'image/webp') return text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP';
    if (mime === 'application/pdf') return text.startsWith('%PDF');
    if (mime.includes('openxmlformats')) return header[0] === 0x50 && header[1] === 0x4b;
    if (mime === 'video/mp4') return text.slice(4, 8) === 'ftyp';
    if (mime === 'video/webm') return header[0] === 0x1a && header[1] === 0x45;
    if (mime === 'image/svg+xml') { const svg = buffer.toString('utf8'); return /<svg[\s>]/i.test(svg.slice(0, 2048)) && !/<script|on\w+\s*=/i.test(svg); }
    return true;
  }
}
