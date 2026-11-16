import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Post, Query, Req, Res, ForbiddenException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from './generated/prisma/client';
import { AccessService, segmentPattern } from './access.service';
import { AuthService } from './auth.service';
import { EventsService } from './events.service';
import { PrismaService } from './prisma.service';
import { now } from './config';

@Controller('api')
export class DocumentsController {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService, private readonly access: AccessService, private readonly events: EventsService) {}

  @Get('db')
  async list(@Query('coll') collection: string, @Req() req: Request) {
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
    await this.prisma.document.upsert({
      where: { collection_id: { collection: body.coll, id: body.id } },
      create: { collection: body.coll, id: body.id, data: body.data as Prisma.InputJsonValue, updatedAt: now(), updatedBy: user.id },
      update: { data: body.data as Prisma.InputJsonValue, updatedAt: now(), updatedBy: user.id },
    });
    this.events.broadcast(body.coll, body.id, body.data); return { ok: true };
  }

  @Post('db/delete')
  @HttpCode(200)
  async remove(@Body() body: any, @Req() req: Request) {
    const { user } = await this.auth.requireReady(req);
    if (!this.access.validCollection(body?.coll) || !segmentPattern.test(String(body?.id || ''))) throw new BadRequestException('invalid_argument');
    if (!this.access.can(user, `${body.coll}/${body.id}`, 'write')) throw new ForbiddenException('permission_denied');
    if (body.coll === 'members' && this.access.level(user) < 3) throw new ForbiddenException('permission_denied');
    await this.prisma.document.deleteMany({ where: { collection: body.coll, id: body.id } });
    this.events.broadcast(body.coll, body.id, null); return { ok: true };
  }

  private async validateSensitiveWrite(user: any, collection: string, id: string, data: Record<string, unknown>) {
    if (this.access.level(user) >= 3) return;
    if (collection === 'access_req') {
      if (id !== user.id || Object.keys(data).some((key) => !['name', 'email', 'at', 'lastAt'].includes(key))
        || data.name !== user.name || data.email !== user.email
        || (data.at !== undefined && typeof data.at !== 'string')
        || (data.lastAt !== undefined && typeof data.lastAt !== 'string'))
        throw new ForbiddenException('permission_denied');
    }
    if (collection === 'members') {
      if (id !== user.memberId) throw new ForbiddenException('permission_denied');
      const current = await this.prisma.document.findUnique({ where: { collection_id: { collection, id } } });
      if (!current || (current.data as any)?.accountId !== user.id) throw new ForbiddenException('permission_denied');
      const { lastSeen: _oldSeen, ...before } = current.data as Record<string, unknown>;
      const { lastSeen, ...after } = data;
      const timestamp = typeof lastSeen === 'string' ? Date.parse(lastSeen) : NaN;
      if (JSON.stringify(before) !== JSON.stringify(after) ||
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
