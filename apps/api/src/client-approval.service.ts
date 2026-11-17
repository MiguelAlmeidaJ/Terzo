import { BadRequestException, ConflictException, ForbiddenException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { ClientApproval, Prisma, User } from '@terzo/database';
import { PrismaService } from './prisma.service';
import { AccessService } from './access.service';
import { StorageService } from './storage.service';

type ApprovalKind = 'calendar' | 'creative';
type FileItem = { assetId?: string; url?: string; name: string; mime?: string };
type PostItem = { id: string; date: string; title: string; caption: string; format: string; notes: string; kind: string; movedFrom?: string };
type ApprovalSnapshot = {
  clientName: string;
  kind: ApprovalKind;
  title: string;
  month?: string;
  posts?: PostItem[];
  files: FileItem[];
};

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const ID_PATTERN = /^(?!\.\.?$)[a-zA-Z0-9_.~:@+-]{1,200}$/;
const safeText = (value: unknown, limit = 400) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const safeHttpsUrl = (input: unknown) => {
  const url = safeText(input, 2000);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? url : '';
  } catch {
    return '';
  }
};
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Uma aprovação é um snapshot imutável de UMA versão de UM conteúdo.
 * Não usa sessão do Terzo para o cliente; um token aleatório, com prazo,
 * revogação e uso único identifica somente o material explicitamente enviado.
 */
@Injectable()
export class ClientApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    readonly storage: StorageService,
  ) {}

  private assertKind(kind: string): asserts kind is ApprovalKind {
    if (kind !== 'calendar' && kind !== 'creative') throw new BadRequestException('invalid_kind');
  }

  private allowed(user: User, data: Record<string, unknown>): boolean {
    if (this.access.level(user) >= 3) return true;
    if (!user.memberId) return false;
    return data.copyId === user.memberId || data.artId === user.memberId ||
      data.memberId === user.memberId;
  }

  private async target(user: User, kind: string, targetId: string) {
    this.assertKind(kind);
    if (!ID_PATTERN.test(targetId)) throw new BadRequestException('invalid_target');
    const collection = kind === 'calendar' ? 'calendars' : 'creatives';
    const target = await this.prisma.document.findUnique({
      where: { collection_id: { collection, id: targetId } },
    });
    if (!target) throw new NotFoundException('target_not_found');
    const data = target.data as Record<string, unknown>;
    const clientId = safeText(data.clientId, 200);
    if (!ID_PATTERN.test(clientId) || !this.access.can(user, collection + '/' + targetId, 'read') || !this.allowed(user, data)) {
      throw new ForbiddenException('permission_denied');
    }
    const client = await this.prisma.document.findUnique({
      where: { collection_id: { collection: 'clients', id: clientId } },
    });
    if (!client) throw new NotFoundException('client_not_found');
    const clientName = safeText((client.data as Record<string, unknown>).name, 120) || 'Cliente';
    return { target, data, clientId, clientName };
  }

  private fileItems(kind: ApprovalKind, data: Record<string, unknown>): FileItem[] {
    if (kind === 'creative') {
      const assetId = safeText(data.assetId, 64);
      const url = safeHttpsUrl(data.link);
      return [
        ...( /^[a-f0-9]{32}$/.test(assetId) ? [{ assetId, name: safeText(data.fileName || data.title, 160) || 'Arte' }] : []),
        ...(url ? [{ url, name: safeText(data.title, 160) || 'Abrir arte' }] : []),
      ];
    }

    const subs = Array.isArray(data.subs) ? data.subs as Array<Record<string, unknown>> : [];
    // Prioriza o material aprovado na validação final; não expõe rascunhos internos.
    const approved = subs.filter((s) => s.stage === 'validacao' && s.status === 'approved').at(-1);
    const selected = approved && Array.isArray(approved.files) ? approved.files : [];
    return selected.slice(0, 30).flatMap((raw) => {
      if (!raw || typeof raw !== 'object') return [];
      const file = raw as Record<string, unknown>;
      const assetId = safeText(file.assetId, 64);
      if (/^[a-f0-9]{32}$/.test(assetId))
        return [{ assetId, name: safeText(file.name, 160) || 'Arquivo' }];
      const url = safeHttpsUrl(file.link);
      return url ? [{ url, name: safeText(file.name, 160) || 'Arquivo externo' }] : [];
    });
  }

  private posts(data: Record<string, unknown>, month: string): PostItem[] {
    if (!Array.isArray(data.posts)) return [];
    return data.posts.slice(0, 100).flatMap((raw) => {
      if (!raw || typeof raw !== 'object') return [];
      const item = raw as Record<string, unknown>;
      const date = safeText(item.date, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.slice(0, 7) !== month) return [];
      return [{
        id: safeText(item.id, 80),
        date,
        title: safeText(item.title, 200),
        caption: safeText(item.caption, 3000),
        format: safeText(item.format, 100),
        notes: safeText(item.notes, 1000),
        kind: item.kind === 'special' ? 'special' : 'regular',
        ...(item.movedFrom ? { movedFrom: safeText(item.movedFrom, 10) } : {}),
      }];
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  private async snapshot(kind: ApprovalKind, data: Record<string, unknown>, clientId: string, clientName: string): Promise<ApprovalSnapshot> {
    const month = safeText(data.month, 7);
    const title = kind === 'calendar'
      ? 'Calendário de ' + month
      : safeText(data.title, 180) || 'Arte avulsa';
    const rawFiles = this.fileItems(kind, data);
    const ids = [...new Set(rawFiles.map((file) => file.assetId).filter((id): id is string => !!id))];
    const assets = ids.length ? await this.prisma.asset.findMany({
      where: { id: { in: ids }, clientId },
      select: { id: true, mime: true, name: true },
    }) : [];
    const files = rawFiles.flatMap((file) => {
      if (file.url) return [file];
      const asset = assets.find((a) => a.id === file.assetId);
      return asset ? [{ assetId: asset.id, name: file.name || asset.name || 'Arquivo', mime: asset.mime }] : [];
    });
    const posts = kind === 'calendar' ? this.posts(data, month) : undefined;
    if (kind === 'calendar' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new BadRequestException('invalid_calendar_month');
    if (!files.length && !posts?.length) throw new BadRequestException('empty_approval');
    if (kind === 'creative' && !files.length) throw new BadRequestException('creative_needs_file');
    return { clientName, kind, title, ...(kind === 'calendar' ? { month, posts } : {}), files };
  }

  async create(user: User, input: { kind?: string; targetId?: string }) {
    const kind = safeText(input?.kind);
    const targetId = safeText(input?.targetId, 200);
    const { target, data, clientId, clientName } = await this.target(user, kind, targetId);
    const snap = await this.snapshot(kind as ApprovalKind, data, clientId, clientName);
    const token = randomBytes(32).toString('hex');
    const now = BigInt(Date.now());
    const recordId = randomBytes(16).toString('hex');
    await this.prisma.$transaction(async (db) => {
      // Nova versão cancela somente convites pendentes do mesmo conteúdo.
      await db.clientApproval.updateMany({
        where: { kind, targetId, status: 'pending', revokedAt: null },
        data: { revokedAt: now },
      });
      await db.clientApproval.create({
        data: {
          id: recordId, tokenHash: hash(token), kind, targetId, clientId,
          title: snap.title, snapshot: snap as unknown as Prisma.InputJsonValue,
          status: 'pending', requestedBy: user.id,
          sourceUpdatedAt: target.updatedAt, createdAt: now,
          expiresAt: now + 14n * 86_400_000n,
        },
      });
    });
    return { id: recordId, token, expiresAt: Number(now + 14n * 86_400_000n) };
  }

  async list(user: User, kind: string, targetId: string) {
    await this.target(user, kind, targetId);
    const items = await this.prisma.clientApproval.findMany({
      where: { kind, targetId }, orderBy: { createdAt: 'desc' }, take: 30,
    });
    return {
      items: items.map((row) => ({
        id: row.id, kind: row.kind, status: row.revokedAt ? 'revoked' : row.status,
        requestedBy: row.requestedBy, createdAt: Number(row.createdAt),
        expiresAt: Number(row.expiresAt), decidedAt: row.decidedAt ? Number(row.decidedAt) : null,
        decidedBy: row.decidedBy, comment: row.comment,
      })),
    };
  }

  async revoke(user: User, id: string) {
    const row = await this.prisma.clientApproval.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('approval_not_found');
    await this.target(user, row.kind, row.targetId);
    await this.prisma.clientApproval.updateMany({
      where: { id, revokedAt: null, status: 'pending' },
      data: { revokedAt: BigInt(Date.now()) },
    });
    return { ok: true };
  }

  private async getRecord(token: string): Promise<ClientApproval> {
    if (!TOKEN_PATTERN.test(token)) throw new NotFoundException('link_not_found');
    const row = await this.prisma.clientApproval.findUnique({ where: { tokenHash: hash(token) } });
    if (!row) throw new NotFoundException('link_not_found');
    if (row.revokedAt || row.expiresAt <= BigInt(Date.now())) throw new GoneException('link_expired_or_revoked');
    return row;
  }

  private async assertCurrent(row: ClientApproval) {
    const collection = row.kind === 'calendar' ? 'calendars' : 'creatives';
    const source = await this.prisma.document.findUnique({
      where: { collection_id: { collection, id: row.targetId } },
      select: { updatedAt: true },
    });
    if (!source || source.updatedAt !== row.sourceUpdatedAt)
      throw new ConflictException('material_updated_request_new_link');
  }

  async publicView(token: string) {
    const row = await this.getRecord(token);
    await this.assertCurrent(row);
    return {
      id: row.id, status: row.status, title: row.title, snapshot: row.snapshot as unknown as ApprovalSnapshot,
      createdAt: Number(row.createdAt), expiresAt: Number(row.expiresAt),
      decidedAt: row.decidedAt ? Number(row.decidedAt) : null,
      decidedBy: row.decidedBy || '', comment: row.comment || '',
    };
  }

  async decide(token: string, input: { decision?: string; name?: string; comment?: string }) {
    const row = await this.getRecord(token);
    await this.assertCurrent(row);
    if (row.status !== 'pending') throw new ConflictException('already_decided');
    const decision = safeText(input?.decision, 20);
    if (!['approved', 'changes'].includes(decision)) throw new BadRequestException('invalid_decision');
    const name = safeText(input?.name, 120);
    const comment = safeText(input?.comment, 2000);
    if (name.length < 2) throw new BadRequestException('name_required');
    if (decision === 'changes' && comment.length < 3) throw new BadRequestException('comment_required');
    const time = BigInt(Date.now());
    const changed = await this.prisma.clientApproval.updateMany({
      where: { id: row.id, status: 'pending', revokedAt: null, expiresAt: { gt: time } },
      data: { status: decision, decidedBy: name, decidedAt: time, comment: comment || null },
    });
    if (!changed.count) throw new ConflictException('already_decided');
    await this.prisma.audit.create({
      data: { at: time, actor: 'client:' + name.slice(0, 80), action: 'client_approval_' + decision,
        target: row.kind + ':' + row.targetId, details: { approvalId: row.id, clientId: row.clientId } },
    }).catch(() => undefined); // Decisão já confirmada: falha no log não deve causar reenvio.
    return { ok: true, status: decision };
  }

  async publicAsset(token: string, assetId: string) {
    if (!/^[a-f0-9]{32}$/.test(assetId)) throw new NotFoundException('asset_not_found');
    const row = await this.getRecord(token);
    await this.assertCurrent(row);
    const snapshot = row.snapshot as unknown as ApprovalSnapshot;
    if (!snapshot.files?.some((f) => f.assetId === assetId)) throw new ForbiddenException('permission_denied');
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset || asset.clientId !== row.clientId) throw new NotFoundException('asset_not_found');
    return asset;
  }
}
