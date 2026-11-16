import { BadRequestException, Controller, Delete, ForbiddenException, Get, HttpCode, NotFoundException, Param, Post, Req, Res, UnsupportedMediaTypeException } from '@nestjs/common';
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
    const remotePath = await this.storage.putAsset(id, body);
    let decodedName = '';
    try { decodedName = decodeURIComponent(String(req.headers['x-file-name'] || '')); } catch { decodedName = 'arquivo'; }
    const name = decodedName.replace(/[\\/\r\n"]/g, '_').slice(0, 200);
    try {
      await this.prisma.asset.create({ data: { id, owner: user.id, mime, size: body.length, name, sha256: sha256(body), remotePath, createdAt: now() } });
    } catch (error) {
      await this.storage.deleteAsset(id, remotePath).catch(() => undefined);
      throw error;
    }
    return { id, url: `/_blob/${id}`, contentType: mime, sizeBytes: body.length };
  }

  @Get('api/assets')
  async list(@Req() req: Request) {
    const { user } = await this.auth.requireReady(req);
    const assets = await this.prisma.asset.findMany({ where: this.access.level(user) >= 3 ? {} : { owner: user.id } });
    return { assets: assets.map((asset) => ({ id: asset.id, url: `/_blob/${asset.id}`, contentType: asset.mime, sizeBytes: asset.size, name: asset.name })) };
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
    await this.auth.requireReady(req);
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
