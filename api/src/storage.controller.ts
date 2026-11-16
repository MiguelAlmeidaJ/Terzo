import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, Req, ServiceUnavailableException } from '@nestjs/common';
import { Request } from 'express';
import { AccessService, segmentPattern } from './access.service';
import { AuthService } from './auth.service';
import { NextcloudReconciliationService } from './nextcloud-reconciliation.service';
import { StorageService } from './storage.service';

@Controller('api/admin/storage')
export class StorageController {
  constructor(
    private readonly auth: AuthService,
    private readonly access: AccessService,
    private readonly storage: StorageService,
    private readonly reconciliation: NextcloudReconciliationService,
  ) {}

  @Get('status')
  async status(@Req() req: Request) { await this.admin(req); return this.reconciliation.status(); }

  @Get('bindings')
  async bindings(@Req() req: Request) { await this.admin(req); return { bindings: await this.reconciliation.listBindings() }; }

  @Put('bindings/:clientId')
  async bind(@Param('clientId') clientId: string, @Body() body: any, @Req() req: Request) {
    await this.admin(req);
    const folder = String(body?.folder || '').trim();
    if (!segmentPattern.test(clientId) || !folder || folder.length > 300) throw new BadRequestException('invalid_argument');
    try { return await this.reconciliation.setBinding(clientId, folder); }
    catch (error) { throw this.externalError(error); }
  }

  @Delete('bindings/:clientId')
  async unbind(@Param('clientId') clientId: string, @Req() req: Request) {
    await this.admin(req);
    if (!segmentPattern.test(clientId)) throw new BadRequestException('invalid_argument');
    return this.reconciliation.removeBinding(clientId);
  }

  @Post('reconcile')
  async reconcile(@Body() body: any, @Req() req: Request) {
    await this.admin(req);
    try { return await this.reconciliation.reconcile({ dryRun: body?.dryRun === true, source: 'api' }); }
    catch (error) { throw this.externalError(error); }
  }

  @Post('probe')
  async probe(@Req() req: Request) {
    await this.admin(req);
    try { return await this.storage.probe(); }
    catch (error) { throw this.externalError(error); }
  }

  private async admin(req: Request) {
    const { user } = await this.auth.requireReady(req);
    if (this.access.level(user) < 3) throw new ForbiddenException('permission_denied');
    return user;
  }

  private externalError(error: unknown) {
    const message = String((error as any)?.message || error || 'Nextcloud indisponível.');
    if (/não encontrad|invalid|informa/i.test(message)) return new BadRequestException(message);
    return new ServiceUnavailableException(message);
  }
}
