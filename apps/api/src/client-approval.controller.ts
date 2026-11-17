import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ClientApprovalService } from './client-approval.service';

@Controller()
export class ClientApprovalController {
  constructor(
    private readonly auth: AuthService,
    private readonly approvals: ClientApprovalService,
  ) {}

  @Post('api/client-approvals')
  @HttpCode(200)
  async create(@Body() body: { kind?: string; targetId?: string }, @Req() req: Request) {
    const { user } = await this.auth.requireReady(req);
    return this.approvals.create(user, body);
  }

  @Get('api/client-approvals')
  async list(@Query('kind') kind: string, @Query('targetId') targetId: string, @Req() req: Request) {
    const { user } = await this.auth.requireReady(req);
    return this.approvals.list(user, kind, targetId);
  }

  @Post('api/client-approvals/:id/revoke')
  @HttpCode(200)
  async revoke(@Param('id') id: string, @Req() req: Request) {
    const { user } = await this.auth.requireReady(req);
    return this.approvals.revoke(user, id);
  }

  /** URL pública: o único poder do link é revisar o snapshot compartilhado. */
  @Get('api/public-approvals/:token')
  publicView(@Param('token') token: string) {
    return this.approvals.publicView(token);
  }

  @Post('api/public-approvals/:token/decision')
  @HttpCode(200)
  decide(
    @Param('token') token: string,
    @Body() body: { decision?: string; name?: string; comment?: string },
  ) {
    return this.approvals.decide(token, body);
  }

  @Get('api/public-approvals/:token/file/:assetId')
  async file(
    @Param('token') token: string,
    @Param('assetId') assetId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const asset = await this.approvals.publicAsset(token, assetId);
    const object = await this.approvals.storage.openAsset(
      asset.id, String(req.headers.range || '') || undefined, asset.remotePath,
    );
    if (!object) return res.status(404).end();
    const inline = /^(image\/(png|jpeg|gif|webp)|application\/pdf|video\/(mp4|webm))$/.test(asset.mime);
    res.status(object.kind === 'remote' ? object.status : 200);
    res.set({
      'Content-Type': asset.mime,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(asset.name || asset.id)}`,
      'Cache-Control': 'no-store, private',
      'Referrer-Policy': 'no-referrer',
      ...(object.size != null ? { 'Content-Length': String(object.size) } : {}),
      ...(object.kind === 'remote' && object.contentRange ? { 'Content-Range': object.contentRange } : {}),
      ...(object.kind === 'remote' && object.acceptRanges ? { 'Accept-Ranges': object.acceptRanges } : {}),
      ...(asset.mime === 'image/svg+xml' ? { 'Content-Security-Policy': "default-src 'none'" } : {}),
    });
    object.stream.pipe(res);
  }
}
