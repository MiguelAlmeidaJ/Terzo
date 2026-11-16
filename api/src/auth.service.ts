import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { User } from './generated/prisma/client';
import { randomBytes } from 'node:crypto';
import { config, now } from './config';
import { PrismaService } from './prisma.service';
import { parseCookies, sessionCookie, sha256 } from './security';

export type Authenticated = { hash: string; user: User };

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async optional(req: Request): Promise<Authenticated | null> {
    const sid = parseCookies(req.headers.cookie).terzo_sid;
    if (!sid) return null;
    const hash = sha256(sid);
    const session = await this.prisma.session.findUnique({ where: { idHash: hash }, include: { user: true } });
    const time = now();
    if (!session || session.user.status !== 'active' || session.ver !== session.user.sessionVersion || time > session.expiresAt || time - session.lastSeen > BigInt(config.idleHours * 3_600_000)) {
      if (session) await this.prisma.session.delete({ where: { idHash: hash } }).catch(() => undefined);
      return null;
    }
    if (time - session.lastSeen > 60_000n) await this.prisma.session.update({ where: { idHash: hash }, data: { lastSeen: time } });
    return { hash, user: session.user };
  }

  async require(req: Request) {
    const auth = await this.optional(req);
    if (!auth) throw new UnauthorizedException('unauthenticated');
    return auth;
  }

  async requireReady(req: Request) {
    const auth = await this.require(req);
    if (auth.user.mustChange) throw new ForbiddenException('must_change_password');
    if (auth.user.role === 'member' && auth.user.memberId) {
      const profile = await this.prisma.document.findUnique({
        where: { collection_id: { collection: 'members', id: auth.user.memberId } },
      });
      const data = profile?.data as any;
      if (!data || data.accountId !== auth.user.id || data.disabled) {
        // O diretório continua legível para a tela de "Acesso desativado".
        if (!(req.method === 'GET' && req.path === '/api/db' && req.query?.coll === 'members'))
          throw new ForbiddenException('member_disabled');
      }
    }
    return auth;
  }

  async createSession(res: Response, user: User, req: Request) {
    const sid = randomBytes(32).toString('base64url');
    const time = now();
    const forwarded = req.headers['x-forwarded-for'];
    const ip = config.trustProxy && forwarded ? String(forwarded).split(',')[0].trim() : req.socket.remoteAddress || '';
    await this.prisma.session.create({ data: {
      idHash: sha256(sid), userId: user.id, ver: user.sessionVersion, createdAt: time, lastSeen: time,
      expiresAt: time + BigInt(config.maxDays * 86_400_000), ip, ua: String(req.headers['user-agent'] || '').slice(0, 200),
    } });
    res.setHeader('Set-Cookie', sessionCookie(sid, config.cookieSecure, config.maxDays * 86_400));
  }
}
