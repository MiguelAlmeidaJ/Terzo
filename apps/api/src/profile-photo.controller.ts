import { BadRequestException, Controller, Delete, ForbiddenException, Get, HttpCode, NotFoundException, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { PrismaService } from './prisma.service';
import { AccessService, segmentPattern } from './access.service';
import { now } from './config';

export const MAX_PROFILE_PHOTO_BYTES = 512 * 1024;

/** The UI crops and compresses files to JPEG. Never calls StorageService/Nextcloud. */
export function checkProfileImage(bytes: Buffer, mime: string) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 16 || bytes.length > MAX_PROFILE_PHOTO_BYTES)
    throw new BadRequestException('photo_size_invalid');
  if (mime !== 'image/jpeg' || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff ||
      bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9)
    throw new BadRequestException('photo_must_be_jpeg');
  return bytes;
}

@Controller('api/profile-photo')
export class ProfilePhotoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly access: AccessService,
  ) {}

  /** Upload: only the logged-in user's account, one row per account. */
  @Post()
  @HttpCode(200)
  async upload(@Req() req: Request) {
    const { user } = await this.auth.requireReady(req);
    const bytes = checkProfileImage(req.body as Buffer, String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase());
    const stamp = now();
    await this.prisma.userProfilePhoto.upsert({
      where: { userId: user.id },
      create: { userId: user.id, image: bytes, size: bytes.length, mime: 'image/jpeg', updatedAt: stamp },
      update: { image: bytes, size: bytes.length, mime: 'image/jpeg', updatedAt: stamp },
    });
    return { ok: true, updatedAt: Number(stamp) };
  }

  @Delete()
  async remove(@Req() req: Request) {
    const { user } = await this.auth.requireReady(req);
    await this.prisma.userProfilePhoto.deleteMany({ where: { userId: user.id } });
    return { ok: true };
  }

  /** Profile photos are authenticated resources, not public Nextcloud assets. */
  @Get('member/:memberId')
  async member(@Param('memberId') memberId: string, @Req() req: Request, @Res() res: Response) {
    const { user } = await this.auth.requireReady(req);
    if (!segmentPattern.test(memberId)) throw new NotFoundException('photo_not_found');
    if (!this.access.can(user, 'members/' + memberId, 'read'))
      throw new ForbiddenException('permission_denied');
    const member = await this.prisma.document.findUnique({
      where: { collection_id: { collection: 'members', id: memberId } },
    });
    const ownerId = (member?.data as Record<string, unknown> | undefined)?.accountId;
    if (typeof ownerId !== 'string' || !ownerId) throw new NotFoundException('photo_not_found');
    const photo = await this.prisma.userProfilePhoto.findUnique({ where: { userId: ownerId } });
    if (!photo) throw new NotFoundException('photo_not_found');
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': String(photo.size),
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.status(200).send(Buffer.from(photo.image));
  }

  @Get('me')
  async me(@Req() req: Request, @Res() res: Response) {
    const { user } = await this.auth.requireReady(req);
    const photo = await this.prisma.userProfilePhoto.findUnique({ where: { userId: user.id } });
    if (!photo) throw new NotFoundException('photo_not_found');
    res.set({ 'Content-Type': 'image/jpeg', 'Content-Length': String(photo.size),
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    res.status(200).send(Buffer.from(photo.image));
  }
}
