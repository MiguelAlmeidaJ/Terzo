import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Post, Query, Req, Res, ForbiddenException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@terzo/database';
import { AccessService, segmentPattern } from './access.service';
import { AuthService } from './auth.service';
import { EventsService } from './events.service';
import { PrismaService } from './prisma.service';
import { now } from './config';

@Controller('api')
export class DocumentsController {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService, private readonly access: AccessService, private readonly events: EventsService) {}

  @Get('db')
  async list(@Query('coll') collection: string, @Req() req: Request): Promise<{ docs: Array<{ id: string; data: unknown }> }> {
    const { user } = await this.auth.requireReady(req);
    if (!this.access.validCollection(collection)) throw new BadRequestException('invalid_path');
    const rows = await this.prisma.document.findMany({ where: { collection } });
    return { docs: rows.filter((row) => this.access.can(user, `${collection}/${row.id}`, 'read')).map((row) => ({ id: row.id, data: row.data })) };
  }

  @Post('db/set')
  @HttpCode(200)
  async set(@Body() body: any, @Req() req: Request) {
    const { user } = await this.auth.requireReady(req);
    if (!this.access.validCollection(body?.coll) || !segmentPattern.test(String(body?.id || '')) || !body?.data || typeof body.data !== 'object' || Array.isArray(body.data)) throw new BadRequestException('invalid_argument');
    if (!this.access.can(user, `${body.coll}/${body.id}`, 'write')) throw new ForbiddenException('permission_denied');
    if (JSON.stringify(body.data).length > 1024 * 1024) throw new BadRequestException('too_large');
    await this.validateSensitiveWrite(user, body.coll, body.id, body.data);
    await this.validatePortfolioWrite(user, body.coll, body.id, body.data);
    await this.validateNewAssetReferences(user, body.coll, body.id, body.data);
    await this.prisma.document.upsert({
      where: { collection_id: { collection: body.coll, id: body.id } },
      create: { collection: body.coll, id: body.id, data: body.data as Prisma.InputJsonValue, updatedAt: now(), updatedBy: user.id },
      update: { data: body.data as Prisma.InputJsonValue, updatedAt: now(), updatedBy: user.id },
    });
    this.events.broadcast(body.coll, body.id, body.data);
    if (body.coll === 'members' && body.data.disabled && typeof body.data.accountId === 'string')
      this.events.kick(body.data.accountId);
    return { ok: true };
  }

  @Post('db/delete')
  @HttpCode(200)
  async remove(@Body() body: any, @Req() req: Request) {
    const { user } = await this.auth.requireReady(req);
    if (!this.access.validCollection(body?.coll) || !segmentPattern.test(String(body?.id || ''))) throw new BadRequestException('invalid_argument');
    if (!this.access.can(user, `${body.coll}/${body.id}`, 'write')) throw new ForbiddenException('permission_denied');
    if (body.coll === 'members' && this.access.level(user) < 3) throw new ForbiddenException('permission_denied');
    const deletedMember = body.coll === 'members'
      ? await this.prisma.document.findUnique({ where: { collection_id: { collection: body.coll, id: body.id } } })
      : null;
    await this.prisma.document.deleteMany({ where: { collection: body.coll, id: body.id } });
    if (typeof (deletedMember?.data as any)?.accountId === 'string')
      this.events.kick((deletedMember!.data as any).accountId);
    this.events.broadcast(body.coll, body.id, null); return { ok: true };
  }

  // 'clients' são documentos JSONB no Terzo. Não existem tabelas SQL client/member;
  // registra as trocas no mesmo documento para preservar IDs e histórico existente.
  private async validatePortfolioWrite(user: any, collection: string, id: string, data: Record<string, unknown>) {
    if (collection !== 'clients') return;
    const current = await this.prisma.document.findUnique({ where: { collection_id: { collection, id } } });
    const before = (current?.data || {}) as Record<string, any>;
    const keys = ['designerId', 'videoEditorId'] as const;
    const changed = keys.filter((key) => String(data[key] || '') !== String(before[key] || ''));
    if (changed.length && this.access.level(user) < 3) throw new ForbiddenException('only_admin_can_change_client_owners');
    // Nunca aceitar histórico escolhido pelo navegador: a API determina quem e quando.
    if (current && data.ownerHistory !== undefined && JSON.stringify(data.ownerHistory) !== JSON.stringify(before.ownerHistory || []))
      throw new ForbiddenException('owner_history_is_server_managed');
    if (!changed.length) return;
    const actors = await this.prisma.document.findMany({ where: { collection: 'members' } });
    const active = new Map(actors.map((row) => [row.id, row.data as Record<string, any>]));
    for (const key of changed) {
      const target = String(data[key] || '');
      if (target && (!active.has(target) || active.get(target)?.disabled)) throw new BadRequestException('invalid_or_inactive_client_owner');
      if (target && key === 'videoEditorId') {
        const person = active.get(target)!;
        if (!String(person.area || '').toLowerCase().includes('audiovisual') &&
            !/otávio|leonardo|bruno/i.test(String(person.name || '')))
          throw new BadRequestException('video_editor_not_eligible');
      }
    }
    const stamp = new Date().toISOString();
    data.ownerHistory = [...(Array.isArray(before.ownerHistory) ? before.ownerHistory : []),
      ...changed.map((key) => ({ role: key === 'designerId' ? 'designer' : 'video_editor',
        fromId: String(before[key] || ''), toId: String(data[key] || ''),
        changedBy: user.id, changedAt: stamp }))].slice(-200);
  }

  private assetReferences(value: unknown, depth = 0): Set<string> {
    const found = new Set<string>();
    const visit = (node: unknown, level: number) => {
      if (level > 32 || node == null) return;
      if (typeof node === 'string') {
        const match = node.match(/(?:^|\/_blob\/)([a-f0-9]{32})(?:$|[?#])/);
        if (match) found.add(match[1]);
      } else if (Array.isArray(node)) {
        for (const item of node) visit(item, level + 1);
      } else if (typeof node === 'object') {
        for (const item of Object.values(node as Record<string, unknown>)) visit(item, level + 1);
      }
    };
    visit(value, depth);
    return found;
  }

  private async validateNewAssetReferences(user: any, collection: string, id: string, data: unknown) {
    if (this.access.level(user) >= 3) return;
    const proposed = this.assetReferences(data);
    if (!proposed.size) return;
    const previous = await this.prisma.document.findUnique({ where: { collection_id: { collection, id } } });
    const known = this.assetReferences(previous?.data);
    const added = [...proposed].filter((assetId) => !known.has(assetId));
    if (!added.length) return;
    const assets = await this.prisma.asset.findMany({
      where: { id: { in: added } }, select: { id: true, owner: true },
    });
    if (assets.some((asset) => asset.owner !== user.id)) throw new ForbiddenException('permission_denied');
  }

  private async validateSensitiveWrite(user: any, collection: string, id: string, data: Record<string, unknown>) {
    if (this.access.level(user) >= 3) return;
    if (collection === 'access_req') {
      if (id !== user.id || Object.keys(data).some((key) => !['name', 'email', 'at', 'lastAt', 'updatedAt', 'updatedBy', 'createdBy'].includes(key))
        || data.name !== user.name || data.email !== user.email
        || (data.at !== undefined && typeof data.at !== 'string')
        || (data.lastAt !== undefined && typeof data.lastAt !== 'string')
        || (data.updatedBy !== undefined && data.updatedBy !== user.id)
        || (data.createdBy !== undefined && data.createdBy !== user.id)
        || (data.updatedAt !== undefined && (typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt)) || Math.abs(Date.now() - Date.parse(data.updatedAt)) > 5 * 60_000)))
        throw new ForbiddenException('permission_denied');
    }
    if (collection === 'members') {
      if (id !== user.memberId) throw new ForbiddenException('permission_denied');
      const current = await this.prisma.document.findUnique({ where: { collection_id: { collection, id } } });
      if (!current || (current.data as any)?.accountId !== user.id) throw new ForbiddenException('permission_denied');
      const { lastSeen: _oldSeen, updatedAt: _oldUpdated, updatedBy: _oldBy, ...before } = current.data as Record<string, unknown>;
      const { lastSeen, updatedAt, updatedBy, ...after } = data;
      const timestamp = typeof lastSeen === 'string' ? Date.parse(lastSeen) : NaN;
      if (JSON.stringify(before) !== JSON.stringify(after) ||
        (updatedBy !== undefined && updatedBy !== user.id) ||
        (updatedAt !== undefined && (typeof updatedAt !== 'string' || !Number.isFinite(Date.parse(updatedAt)) || Math.abs(Date.now() - Date.parse(updatedAt)) > 5 * 60_000)) ||
        !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60_000)
        throw new ForbiddenException('permission_denied');
    }
  }

  @Get('events')
  async stream(@Req() req: Request, @Res() res: Response) {
    const current = await this.auth.requireReady(req);
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 3000\n\nevent: ready\ndata: {}\n\n');
    const client = { response: res, user: current.user, hash: current.hash };
    this.events.add(client); req.on('close', () => this.events.remove(client));
  }

  @Get('users/profiles')
  async profiles(@Query('ids') value: string, @Req() req: Request) {
    await this.auth.requireReady(req);
    const ids = String(value || '').split(',').filter(Boolean).slice(0, 200);
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    return Object.fromEntries(users.map((user) => [user.id, { name: user.name }]));
  }
}
