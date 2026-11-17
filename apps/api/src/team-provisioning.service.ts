import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma, User } from '@terzo/database';
import { PrismaService } from './prisma.service';
import { AccessService, segmentPattern } from './access.service';
import { EventsService } from './events.service';
import { hashPassword, temporaryPassword } from './security';
import { now } from './config';

export const TEAM_EMAIL_DOMAIN = 'terceiroandar.com.br';

/**
 * Usernames are computed from the person's name once, at account creation.
 * Accents are transliterated; names are not silently changed on later edits.
 */
export function usernameFromName(name: string): string {
  const words = String(name || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ')
    .trim().split(/\s+/).filter(Boolean);
  const base = words.join('.').slice(0, 36).replace(/\.+$/g, '');
  if (!/^[a-z0-9][a-z0-9.]{2,39}$/.test(base)) throw new BadRequestException('Nome insuficiente para gerar um usuário.');
  return base;
}
export function emailFromUsername(username: string) {
  return username + '@' + TEAM_EMAIL_DOMAIN;
}
const safeString = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export type NewMemberInput = {
  name?: string; area?: string; role?: string; capacity?: number;
  hideRank?: boolean; admin?: boolean; leader?: boolean;
};
export type Provisioned = { memberId: string; name: string; username: string; email: string; tempPassword: string; userId: string };

@Injectable()
export class TeamProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly events: EventsService,
  ) {}

  private assertAdmin(actor: User) {
    if (this.access.level(actor) < 3) throw new ForbiddenException('permission_denied');
  }

  private async createAccount(db: Prisma.TransactionClient, memberId: string, name: string, role: 'member' | 'editor' = 'member'): Promise<Provisioned> {
    const base = usernameFromName(name);
    let username = '';
    // A unique username must never overwrite or link an existing account by name.
    for (let i = 1; i <= 999; i++) {
      const suffix = i === 1 ? '' : '.' + i;
      const candidate = base.slice(0, 40 - suffix.length).replace(/\.+$/g, '') + suffix;
      if (!await db.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
        username = candidate;
        break;
      }
    }
    if (!username) throw new ConflictException('Não foi possível gerar um usuário exclusivo.');
    const password = temporaryPassword();
    const userId = 'u_' + randomBytes(12).toString('base64url');
    const email = emailFromUsername(username);
    await db.user.create({ data: {
      id: userId, username, name, email, memberId,
      passHash: hashPassword(password), role, mustChange: true,
      status: 'active', createdAt: now(),
    } });
    return { memberId, name, username, email, tempPassword: password, userId };
  }

  async createMemberAndAccount(actor: User, input: NewMemberInput): Promise<Provisioned> {
    this.assertAdmin(actor);
    const name = safeString(input?.name, 120);
    if (!name) throw new BadRequestException('Nome do integrante é obrigatório.');
    const area = safeString(input?.area, 100) || 'Design';
    const role = safeString(input?.role, 120);
    const capacity = Math.min(1000, Math.max(1, Number(input?.capacity) || 15));
    if (input?.admin && actor.role !== 'owner') throw new ForbiddenException('Somente o proprietário pode criar um perfil administrativo.');
    const memberId = 'm_' + randomBytes(12).toString('base64url');
    const createdAt = now();
    const result = await this.prisma.$transaction(async db => {
      const account = await this.createAccount(db, memberId, name, input.admin ? 'editor' : 'member');
      const member = {
        name, area, role, capacity,
        hideRank: Boolean(input?.hideRank),
        admin: Boolean(input?.admin),
        leader: Boolean(input?.leader),
        email: account.email,
        accountId: account.userId,
        disabled: false,
        createdAt: new Date(Number(createdAt)).toISOString().slice(0, 10),
      };
      await db.document.create({ data: {
        collection: 'members', id: memberId, data: member as Prisma.InputJsonValue,
        updatedAt: createdAt, updatedBy: actor.id,
      } });
      await db.audit.create({ data: {
        at: createdAt, actor: actor.id, action: 'team_member_account_create', target: account.userId,
        details: { memberId, username: account.username },
      } });
      return { account, member };
    }, { isolationLevel: 'Serializable' });
    this.events.broadcast('members', memberId, result.member);
    return result.account;
  }

  /** Existing members are provisioned individually; a failure never affects other members. */
  async provisionExisting(actor: User, requestedIds: unknown) {
    this.assertAdmin(actor);
    if (!Array.isArray(requestedIds) || requestedIds.length < 1 || requestedIds.length > 100 ||
        requestedIds.some(id => typeof id !== 'string' || !segmentPattern.test(id)) ||
        new Set(requestedIds).size !== requestedIds.length) throw new BadRequestException('Selecione de 1 a 100 integrantes diferentes.');
    const created: Provisioned[] = [];
    const skipped: Array<{ memberId: string; name: string; reason: string }> = [];
    for (const memberId of requestedIds as string[]) {
      try {
        const result = await this.prisma.$transaction(async db => {
          const row = await db.document.findUnique({ where: { collection_id: { collection: 'members', id: memberId } } });
          if (!row) throw new NotFoundException('Integrante não encontrado.');
          const member = row.data as Record<string, unknown>;
          if (member.disabled) throw new ConflictException('Cadastro desativado.');
          if (member.accountId) throw new ConflictException('Já existe uma conta vinculada.');
          const existing = await db.user.findFirst({ where: { memberId }, select: { id: true } });
          if (existing) throw new ConflictException('Este integrante já possui login.');
          const name = safeString(member.name, 120);
          if (member.admin && actor.role !== 'owner') throw new ForbiddenException('Somente o proprietário provisiona administradores.');
          const account = await this.createAccount(db, memberId, name, member.admin ? 'editor' : 'member');
          const nextMember = { ...member, accountId: account.userId, email: account.email };
          await db.document.update({ where: { collection_id: { collection: 'members', id: memberId } },
            data: { data: nextMember as Prisma.InputJsonValue, updatedAt: now(), updatedBy: actor.id } });
          await db.audit.create({ data: {
            at: now(), actor: actor.id, action: 'team_member_account_create', target: account.userId,
            details: { memberId, username: account.username, batch: true },
          } });
          return { account, nextMember };
        }, { isolationLevel: 'Serializable' });
        created.push(result.account);
        this.events.broadcast('members', memberId, result.nextMember);
      } catch (error) {
        const member = await this.prisma.document.findUnique({ where: { collection_id: { collection: 'members', id: memberId } } });
        const name = safeString((member?.data as Record<string, unknown> | undefined)?.name, 120) || memberId;
        const reason = error instanceof Error ? error.message : 'Falha ao criar conta.';
        skipped.push({ memberId, name, reason });
      }
    }
    return { created, skipped };
  }
}
