import { Body, Controller, Get, HttpCode, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { PresenceService } from './presence.service';

@Controller('api/presence')
export class PresenceController {
 constructor(private readonly auth:AuthService,private readonly presence:PresenceService){}
 @Get('me')
 async me(@Req() req:Request){const {user}=await this.auth.requireReady(req);return this.presence.me(user.id)}
 @Post('status') @HttpCode(200)
 async status(@Req() req:Request,@Body() body:any){const {user}=await this.auth.requireReady(req);
  return {current:await this.presence.set(user.id,String(body?.status||'') as any,String(body?.reason||''))}}
 @Get('team')
 async team(@Req() req:Request,@Query('days') days:string){const {user}=await this.auth.requireReady(req);
  return this.presence.team(user,Number(days||1))}
 @Patch('config')
 async config(@Req() req:Request,@Body() body:any){const {user}=await this.auth.requireReady(req);
  return this.presence.setLunchMinutes(user,body?.lunchMinutes)}
}
