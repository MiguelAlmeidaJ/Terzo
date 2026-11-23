import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AccessService } from './access.service';
import type { User } from '@terzo/database';

const zone='America/Sao_Paulo';
const day=(date: Date)=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const result=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${result.year}-${result.month}-${result.day}`;};
const statuses=['online','meeting','visit','capture','lunch','other','ended'] as const;
type Status=(typeof statuses)[number];
const working=new Set<string>(['online','meeting','visit','capture']);
const mins=(start:number,end:number)=>Math.max(0,(end-start)/60000);

@Injectable()
export class PresenceService {
 constructor(private readonly prisma: PrismaService,private readonly access: AccessService){}
 async config(){const c=await this.prisma.presenceConfig.findUnique({where:{key:'lunch_minutes'}});return Math.min(180,Math.max(20,c?.value||60))}
 async mayManage(user: User){
  if(this.access.level(user)>=3)return true;
  if(!user.memberId)return false;
  const member=await this.prisma.document.findUnique({where:{collection_id:{collection:'members',id:user.memberId}}});
  return !!(member?.data as any)?.leader;
 }
 async set(userId:string,status:Status,reason=''){
  if(!statuses.includes(status))throw new BadRequestException('invalid_presence_status');
  if(status==='other'&&(!reason.trim()||reason.length>200))throw new BadRequestException('Informe o motivo da pausa (até 200 caracteres).');
  const name:Record<string,string>={online:'',meeting:'Reunião',visit:'Visita ao cliente',capture:'Captação',lunch:'Almoço',ended:'',other:reason.trim()};
  const at=new Date(),label=day(at);
  return this.prisma.$transaction(async tx=>{
   const previous=await tx.presenceCurrent.findUnique({where:{userId}});
   if(previous?.status===status&&previous.reason===name[status]&&previous.day===label)return previous;
   await tx.presenceEvent.create({data:{userId,status,reason:name[status],day:label,at}});
   return tx.presenceCurrent.upsert({where:{userId},create:{userId,status,reason:name[status],day:label,since:at},update:{status,reason:name[status],day:label,since:at}});
  });
 }
 async me(userId:string){
  const existing=await this.prisma.presenceCurrent.findUnique({where:{userId}});
  if(existing && existing.day!==day(new Date()) && existing.status!=='ended')await this.set(userId,existing.status as Status,existing.reason);
  const [current,events,lunchMinutes]=await Promise.all([
   this.prisma.presenceCurrent.findUnique({where:{userId}}),
   this.prisma.presenceEvent.findMany({where:{userId,day:day(new Date())},orderBy:{at:'asc'}}),
   this.config()
  ]);
  const stats=this.summarize(events,current,lunchMinutes);
  return {current,lunchMinutes,today:stats,serverNow:new Date().toISOString(),zone};
 }
 private summarize(events:{status:string;at:Date}[],current:{status:string;since:Date}|null,lunchLimit:number,until=Date.now()){
  let worked=0,lunch=0,other=0;
  const line=events.map((ev,i)=>{const from=ev.at.getTime(),to=Math.min(until,events[i+1]?.at.getTime()||until),span=mins(from,to);
   if(working.has(ev.status))worked+=span;else if(ev.status==='lunch')lunch+=span;else if(ev.status==='other')other+=span;
   return {status:ev.status,from:ev.at.toISOString(),to:new Date(Math.max(from,to)).toISOString(),minutes:Math.round(span)};
  });
  return {workedMinutes:Math.round(worked),lunchMinutes:Math.round(lunch),
   lunchOverMinutes:Math.max(0,Math.round(lunch-lunchLimit)),
   otherMinutes:Math.round(other),line};
 }
 async team(user:User,days:number){
  if(!await this.mayManage(user))throw new ForbiddenException('management_only');
  const horizon=[1,7,30].includes(days)?days:1;
  const minDay=day(new Date(Date.now()-(horizon-1)*86400000));
  const [users,events,current,lunchMinutes]=await Promise.all([
   this.prisma.user.findMany({where:{status:'active'},select:{id:true,name:true,memberId:true},orderBy:{name:'asc'}}),
   this.prisma.presenceEvent.findMany({where:{day:{gte:minDay}},orderBy:{at:'asc'}}),
   this.prisma.presenceCurrent.findMany(),
   this.config()
  ]);
  const present=new Map(current.map(c=>[c.userId,c]));
  const people=users.map(person=>{
   const evs=events.filter(e=>e.userId===person.id),c=present.get(person.id)||null;
   const stat=this.summarize(evs,c,lunchMinutes);
   const lunchLate=c?.status==='lunch'?Math.max(0,mins(c.since.getTime(),Date.now())-lunchMinutes):0;
   return {userId:person.id,name:person.name,memberId:person.memberId,status:c?.status||'ended',reason:c?.reason||'',since:c?.since||null,
    ...stat,lunchOverMinutes:Math.max(stat.lunchOverMinutes,Math.round(lunchLate))};
  });
  return {periodDays:horizon,serverNow:new Date().toISOString(),zone,lunchMinutes,people,
   summary:{online:people.filter(p=>p.status==='online').length,paused:people.filter(p=>['meeting','visit','capture','other'].includes(p.status)).length,
    lunchLate:people.filter(p=>p.status==='lunch'&&p.lunchOverMinutes>0).length,negativeMinutes:people.reduce((acc,p)=>acc+p.lunchOverMinutes,0)}};
 }
 async setLunchMinutes(user:User,value:number){
  if(!await this.mayManage(user))throw new ForbiddenException('management_only');
  if(!Number.isInteger(value)||value<20||value>180)throw new BadRequestException('Almoço deve ter entre 20 e 180 minutos');
  await this.prisma.presenceConfig.upsert({where:{key:'lunch_minutes'},create:{key:'lunch_minutes',value},update:{value}});
  return {lunchMinutes:value};
 }
}
