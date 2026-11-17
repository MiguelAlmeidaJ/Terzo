import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Prisma, User } from '@terzo/database';
import { randomBytes } from 'node:crypto';
import { AuthService } from './auth.service';
import { AccessService } from './access.service';
import { PrismaService } from './prisma.service';
import { EventsService } from './events.service';
import { hashPassword, temporaryPassword } from './security';
import { now, toNumber } from './config';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService, private readonly access: AccessService, private readonly events: EventsService) {}

  @Get('users')
  async users(@Req() req: Request) {
    const actor = await this.admin(req);
    const [users, members, sessions] = await Promise.all([
      this.prisma.user.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.document.findMany({ where: { collection: 'members' } }),
      this.prisma.session.groupBy({ by: ['userId'], _count: true }),
    ]);
    return {
      me: actor.id,
      users: users.map((user) => ({ id: user.id, username: user.username, name: user.name, email: user.email, role: user.role, status: user.status, must_change: user.mustChange, created_at: toNumber(user.createdAt), last_login: toNumber(user.lastLogin), member_id: user.memberId, sessions: sessions.find((item) => item.userId === user.id)?._count || 0 })),
      members: members.map((row) => { const data = row.data as any; return { id: row.id, name: data.name, area: data.area || '', accountId: data.accountId || '', disabled: !!data.disabled }; }),
    };
  }

  @Post('users')
  @HttpCode(200)
  async create(@Body() body: any, @Req() req: Request) {
    const actor = await this.admin(req); const username = String(body?.username || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new BadRequestException('Usuário: 3 a 40 caracteres, só letras minúsculas, números, ponto, hífen e sublinhado.');
    if (await this.prisma.user.findUnique({ where: { username } })) throw new ConflictException('Já existe um usuário com esse login.');
    const role = ['owner', 'editor', 'member'].includes(body?.role) ? body.role : 'member';
    if (role !== 'member' && actor.role !== 'owner') throw new ForbiddenException('Só o dono cria outros administradores do servidor.');
    const name = String(body?.name || '').trim().slice(0, 120); if (!name) throw new BadRequestException('Informe o nome.');
    const memberId = String(body?.memberId || '');
    if (memberId) await this.assertMemberAvailable('', memberId);
    const password = temporaryPassword(); const id = `u_${randomBytes(12).toString('base64url')}`;
    await this.prisma.user.create({ data: { id, username, name, email: String(body?.email || '').trim().slice(0, 200), passHash: hashPassword(password), role, createdAt: now() } });
    if (memberId) await this.linkMember(id, memberId, actor.id);
    await this.audit(actor.id, 'user_create', id, { username, role }); return { id, tempPassword: password };
  }

  @Patch('users/:id')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    const actor = await this.admin(req); const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('not_found');
    if (target.role !== 'member' && actor.role !== 'owner') throw new ForbiddenException('Só o dono altera administradores do servidor.');
    if (target.id === actor.id && (body.status || body.role)) throw new BadRequestException('Você não pode alterar o próprio status ou papel.');
    const data: Prisma.UserUpdateInput = {}; const result: any = { ok: true };
    if (body.name != null) data.name = String(body.name).trim().slice(0, 120) || target.name;
    if (body.email != null) data.email = String(body.email).trim().slice(0, 200);
    if (body.role && ['owner', 'editor', 'member'].includes(body.role)) { if (actor.role !== 'owner') throw new ForbiddenException('Só o dono altera papéis.'); data.role = body.role; }
    if (body.status && ['active', 'disabled'].includes(body.status)) { data.status = body.status; data.sessionVersion = { increment: 1 }; }
    if (body.resetPassword) { const password = temporaryPassword(); data.passHash = hashPassword(password); data.mustChange = true; data.sessionVersion = { increment: 1 }; result.tempPassword = password; }
    if (body.revokeSessions) data.sessionVersion = { increment: 1 };
    if (body.memberId !== undefined && body.memberId)
      await this.assertMemberAvailable(id, String(body.memberId));
    await this.prisma.user.update({ where: { id }, data });
    if (body.status === 'disabled' || body.resetPassword || body.revokeSessions) { await this.prisma.session.deleteMany({ where: { userId: id } }); this.events.kick(id); }
    if (body.memberId !== undefined) await this.linkMember(id, body.memberId, actor.id);
    await this.audit(actor.id, 'user_update', id, { ...body, resetPassword: !!body.resetPassword }); return result;
  }

  @Get('audit')
  async auditRows(@Req() req: Request) {
    await this.admin(req); const rows = await this.prisma.audit.findMany({ orderBy: { at: 'desc' }, take: 200 });
    return { rows: rows.map((row) => ({ at: toNumber(row.at), actor: row.actor, action: row.action, target: row.target, details: row.details == null ? '' : JSON.stringify(row.details) })) };
  }

  private async admin(req: Request) { const { user } = await this.auth.requireReady(req); if (this.access.level(user) < 3) throw new ForbiddenException('permission_denied'); return user; }
  private audit(actor: string, action: string, target: string, details?: Prisma.InputJsonValue) { return this.prisma.audit.create({ data: { at: now(), actor, action, target, details } }); }

  private async assertMemberAvailable(userId: string, memberId: string) {
    const row = await this.prisma.document.findUnique({
      where: { collection_id: { collection: 'members', id: memberId } },
    });
    if (!row) throw new BadRequestException('Integrante não encontrado na Equipe.');
    const data = row.data as Record<string, unknown>;
    if (data.disabled) throw new BadRequestException('Este integrante está desativado.');
    if (data.accountId && data.accountId !== userId)
      throw new ConflictException('Este cadastro já está vinculado a outro login.');
    const linked = await this.prisma.user.findFirst({
      where: { memberId, ...(userId ? { id: { not: userId } } : {}) },
      select: { id: true },
    });
    if (linked) throw new ConflictException('Este cadastro já possui uma conta de acesso.');
  }

  private async linkMember(userId: string, memberId: string, actor: string) {
    if (memberId) await this.assertMemberAvailable(userId, memberId);
    const previous = await this.prisma.document.findMany({ where: { collection: 'members' } });
    for (const row of previous) { const data = row.data as any; if (data.accountId !== userId || row.id === memberId) continue; data.accountId = ''; await this.saveMember(row.id, data, actor); }
    await this.prisma.user.update({ where: { id: userId }, data: { memberId: memberId || '' } });
    if (!memberId) return;
    const row = await this.prisma.document.findUnique({ where: { collection_id: { collection: 'members', id: memberId } } }); if (!row) return;
    const data = row.data as any; const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } }); data.accountId = userId; if (!data.email && user.email) data.email = user.email;
    await this.saveMember(memberId, data, actor);
  }

  private async saveMember(id: string, data: any, actor: string) {
    await this.prisma.document.update({ where: { collection_id: { collection: 'members', id } }, data: { data, updatedAt: now(), updatedBy: actor } }); this.events.broadcast('members', id, data);
  }
}
