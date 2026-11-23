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
    await this.validateTaskAndPublishing(user, body.coll, body.id, body.data);
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
    if (data.ownerHistory !== undefined && JSON.stringify(data.ownerHistory) !== JSON.stringify(before.ownerHistory || []))
      throw new ForbiddenException('owner_history_is_server_managed');
    // Sempre restaurar o histórico do banco, inclusive em edições de outros campos
    // que partiram de um navegador desatualizado e não enviaram ownerHistory.
    data.ownerHistory = Array.isArray(before.ownerHistory) ? before.ownerHistory : [];
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

  private async validateTaskAndPublishing(user: any, collection: string, id: string, data: Record<string, any>) {
    if (collection !== 'todos' && collection !== 'creatives') return;
    const beforeRow = await this.prisma.document.findUnique({ where: { collection_id: { collection, id } } });
    const before = beforeRow?.data as Record<string, any> | undefined;
    const nowServer = new Date().toISOString();
    if (collection === 'todos') {
      // O formulário atual é opt-in: tarefas antigas sem execFor continuam editáveis.
      if (data.execFor !== undefined) {
        if (!['designer', 'editor', 'editor2', 'outro'].includes(data.execFor)) throw new BadRequestException('invalid_task_route');
        const mapped: Record<string, string> = {
          designer: String(data.designerId || ''), editor: String(data.videoEditorId || ''),
          editor2: String(data.editor2Id || ''), outro: String(data.assigneeId || ''),
        };
        if (!data.assigneeId || mapped[data.execFor] !== data.assigneeId) throw new BadRequestException('invalid_task_assignee');
        if (!data.title || typeof data.title !== 'string' || data.title.length > 500) throw new BadRequestException('invalid_task_title');
        if (data.editor2Id && data.editor2Id === data.videoEditorId) throw new BadRequestException('duplicate_video_editor');
        if (data.urgent && !/^\d{4}-\d{2}-\d{2}$/.test(data.due || '')) throw new BadRequestException('urgent_requires_due');
        const ids = [data.assigneeId, data.designerId, data.videoEditorId, data.editor2Id, ...(Array.isArray(data.assigneeIds) ? data.assigneeIds : [])].filter(Boolean);
        const members = await this.prisma.document.findMany({ where: { collection: 'members', id: { in: ids } } });
        const active = new Map(members.map((row) => [row.id, row.data as Record<string, any>]));
        if (!active.has(data.assigneeId) || active.get(data.assigneeId)?.disabled) throw new BadRequestException('assignee_not_active');
        if (ids.some((memberId: string) => !active.has(memberId) || active.get(memberId)?.disabled)) throw new BadRequestException('invalid_task_member');
        for (const editorId of [data.videoEditorId, data.editor2Id].filter(Boolean)) {
          const member = active.get(editorId)!;
          if (!String(member.area || '').toLowerCase().includes('audiovisual') &&
              !/otávio|leonardo|bruno/i.test(String(member.name || '')))
            throw new BadRequestException('video_editor_not_eligible');
        }
        if (Array.isArray(data.assigneeIds)) data.assigneeIds = [...new Set(data.assigneeIds.filter((v: unknown) => v !== data.assigneeId))];
      }
      if (!beforeRow) {
        data.createdBy = user.id;
        data.openedAt = nowServer;
        data.history = [{ s: 'Aberto', at: nowServer, by: user.id, note: 'Tarefa criada' }];
      } else if (data.assigneeId !== before?.assigneeId || data.due !== before?.due) {
        data.history = [...(Array.isArray(before?.history) ? before!.history : []), {
          s: before?.status || 'Aberto', at: nowServer, by: user.id,
          note: 'Executor ' + String(before?.assigneeId || '—') + ' → ' + String(data.assigneeId || '—') +
                '; prazo ' + String(before?.due || '—') + ' → ' + String(data.due || '—'),
        }].slice(-60);
      }
      if (beforeRow) data.createdBy = before?.createdBy || user.id;
    } else {
      const from = String(before?.status || '');
      const to = String(data.status || '');
      const changed = to !== from;
      const tracked = ['scheduledFor', 'scheduledBy', 'publishedAt', 'publishedBy'];
      if (beforeRow) {
        for (const key of tracked) {
          if (!changed && data[key] !== undefined && JSON.stringify(data[key] || '') !== JSON.stringify(before?.[key] || ''))
            throw new ForbiddenException('publication_fields_are_server_managed');
          if (before?.[key] !== undefined && (data[key] === undefined || !changed)) data[key] = before[key];
        }
      }
      if (!changed || !['Programado', 'Publicado'].includes(to)) return;
      if (to === 'Publicado' && from === 'Programado') {
        data.scheduledFor = before?.scheduledFor;
        data.scheduledBy = before?.scheduledBy;
      }
      const member = user.memberId
        ? await this.prisma.document.findUnique({ where: { collection_id: { collection: 'members', id: user.memberId } } })
        : null;
      const area = String((member?.data as any)?.area || '');
      if (this.access.level(user) < 3 && area !== 'Relacionamento') throw new ForbiddenException('only_attendance_can_publish');
      if (to === 'Programado') {
        if (from !== 'Aprovado' || !data.scheduledFor || !Number.isFinite(Date.parse(String(data.scheduledFor))))
          throw new BadRequestException('publication_must_be_approved_and_scheduled');
        data.scheduledBy = user.id;
        data.scheduledFor = new Date(data.scheduledFor).toISOString();
      } else {
        if (!['Aprovado', 'Programado'].includes(from)) throw new BadRequestException('publication_must_be_approved');
        data.publishedAt = nowServer;
        data.publishedBy = user.id;
      }
      data.statusAt = nowServer;
    }
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
