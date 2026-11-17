import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { NewMemberInput, TeamProvisioningService } from './team-provisioning.service';

@Controller('api/team')
export class TeamController {
  constructor(private readonly auth: AuthService, private readonly provisioning: TeamProvisioningService) {}

  /** Creates the team member and their user account in one DB transaction. */
  @Post('members-with-account')
  @HttpCode(200)
  async create(@Req() req: Request, @Body() data: NewMemberInput) {
    const { user } = await this.auth.requireReady(req);
    return this.provisioning.createMemberAndAccount(user, data);
  }

  /** Provision only explicitly selected member IDs, skipping linked/disabled accounts. */
  @Post('provision-accounts')
  @HttpCode(200)
  async provision(@Req() req: Request, @Body() body: { memberIds?: string[] }) {
    const { user } = await this.auth.requireReady(req);
    return this.provisioning.provisionExisting(user, body?.memberIds);
  }
}
