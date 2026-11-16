import { BadRequestException, Body, Controller, Get, HttpCode, HttpException, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { hashPassword, sessionCookie, verifyPassword } from './security';
import { AuthService } from './auth.service';
import { PrismaService } from './prisma.service';
import { config, now } from './config';
import { EventsService } from './events.service';

const dummyHash = hashPassword('terzo-dummy-password');
const windowMs = 15n * 60n * 1000n;

@Controller('api/auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService, private readonly events: EventsService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const username = String(body?.username || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const forwarded = req.headers['x-forwarded-for'];
    const ip = config.trustProxy && forwarded ? String(forwarded).split(',')[0].trim() : req.socket.remoteAddress || '';
    await this.prisma.loginAttempt.deleteMany({ where: { at: { lt: now() - windowMs } } });
    const [byUser, byIp] = await Promise.all([
      this.prisma.loginAttempt.count({ where: { key: `u:${username}` } }),
      this.prisma.loginAttempt.count({ where: { key: `ip:${ip}` } }),
    ]);
    if (byUser >= 5 || byIp >= 20) throw new HttpException('Muitas tentativas. Aguarde 15 minutos e tente de novo.', 429);
    const user = await this.prisma.user.findUnique({ where: { username } });
    const valid = verifyPassword(password, user?.passHash || dummyHash);
    if (!user || !valid || user.status !== 'active') {
      await this.prisma.loginAttempt.createMany({ data: [{ key: `u:${username}`, at: now() }, { key: `ip:${ip}`, at: now() }] });
      await this.audit(user?.id, 'login_fail', username);
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    }
    await this.prisma.loginAttempt.deleteMany({ where: { key: `u:${username}` } });
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { lastLogin: now() } });
    await this.auth.createSession(res, updated, req);
    await this.audit(user.id, 'login');
    return { ok: true, mustChange: updated.mustChange };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const current = await this.auth.optional(req);
    if (current) {
      await this.prisma.session.delete({ where: { idHash: current.hash } }).catch(() => undefined);
      await this.audit(current.user.id, 'logout');
    }
    res.setHeader('Set-Cookie', sessionCookie('', config.cookieSecure, 0));
    return { ok: true };
  }

  @Get('me')
  async me(@Req() req: Request) {
    const { user } = await this.auth.require(req);
    return { id: user.id, username: user.username, name: user.name, email: user.email, isOwner: user.role === 'owner', canEdit: ['owner', 'editor'].includes(user.role), role: user.role, mustChange: user.mustChange };
  }

  @Post('password')
  @HttpCode(200)
  async password(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user } = await this.auth.require(req);
    if (!verifyPassword(String(body?.current || ''), user.passHash)) throw new BadRequestException('A senha atual não confere.');
    const next = body?.next;
    if (typeof next !== 'string' || next.length < 10 || next.length > 200) throw new BadRequestException('A nova senha precisa ter de 10 a 200 caracteres.');
    if (next === body.current) throw new BadRequestException('A nova senha precisa ser diferente da atual.');
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { passHash: hashPassword(next), mustChange: false, sessionVersion: { increment: 1 } } });
    await this.prisma.session.deleteMany({ where: { userId: user.id } }); this.events.kick(user.id);
    await this.auth.createSession(res, updated, req); await this.audit(user.id, 'password_change');
    return { ok: true };
  }

  private audit(actor: string | undefined, action: string, target = '') {
    return this.prisma.audit.create({ data: { at: now(), actor: actor || '', action, target } });
  }
}
