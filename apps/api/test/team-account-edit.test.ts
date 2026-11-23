import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AdminController } from '../src/admin.controller';
import { AccessService } from '../src/access.service';

const actor={id:'admin',role:'owner'} as any;

function fixture(){
 const profile={name:'Gabriella Firmino',email:'gabriella.firmino@terceiroandar.com.br',accountId:'u1',area:'Design'};
 const account:any={id:'u1',name:'Gabriella Firmino',username:'gabriella.firmino',email:profile.email,role:'member',memberId:'m1',status:'active'};
 const updates:any[]=[];const audit:any[]=[];const broadcasts:any[]=[];
 let member={...profile};
 const db:any={
  user:{
   findUnique:async({where}:any)=>{
    if(where.id==='u1'||where.username===account.username)return {...account};
    if(where.username==='taken.username')return {id:'other'};
    return null;
   },
   update:async({where,data}:any)=>{assert.equal(where.id,'u1');updates.push(data);Object.assign(account,data);return account;},
   findFirst:async()=>null,
   findUniqueOrThrow:async()=>account,
  },
  document:{
   findUnique:async({where}:any)=>where.collection_id.id==='m1'?{id:'m1',data:{...member}}:null,
   findMany:async()=>[{id:'m1',data:{...member}}],
   update:async({data}:any)=>{member=data.data;return {id:'m1',data:member}},
  },
  audit:{create:async({data}:any)=>{audit.push(data);return data}},
  session:{deleteMany:async()=>({count:0})},
 };
 const auth={requireReady:async()=>({user:actor})};
 const events={broadcast:(coll:string,id:string,data:any)=>broadcasts.push({coll,id,data}),kick:()=>{}};
 const controller=new AdminController(db,auth as any,new AccessService(),events as any);
 return {controller,account,get member(){return member},updates,audit,broadcasts};
}

test('editing an existing login preserves identity and syncs linked team profile',async()=>{
 const x=fixture();
 const result=await x.controller.update('u1',{
  username:'gabriella.firmino.novo',
  email:'gabriella.firmino.novo@terceiroandar.com.br',
  name:'Gabriella Firmino Santos',
  memberId:'m1',
 },{} as any);
 assert.equal(result.ok,true);
 assert.equal(x.account.id,'u1');
 assert.equal(x.account.memberId,'m1');
 assert.equal(x.account.username,'gabriella.firmino.novo');
 assert.equal(x.account.email,'gabriella.firmino.novo@terceiroandar.com.br');
 assert.equal(x.member.name,'Gabriella Firmino Santos');
 assert.equal(x.member.email,'gabriella.firmino.novo@terceiroandar.com.br');
 assert.equal(x.member.accountId,'u1');
 assert.equal(x.updates.length,2,'update identity then preserve linked memberId');
 assert.equal(x.audit.length,1);
 assert.ok(!JSON.stringify(x.audit,(_k,v)=>typeof v==='bigint'?String(v):v).includes('passHash'));
});

test('editing an existing user rejects conflicting usernames without changing records',async()=>{
 const x=fixture();
 await assert.rejects(()=>x.controller.update('u1',{username:'taken.username'},{} as any),/já está em uso/);
 assert.equal(x.account.username,'gabriella.firmino');
 assert.equal(x.updates.length,0);
});

test('invalid corporate account data is rejected before mutation',async()=>{
 const x=fixture();
 await assert.rejects(()=>x.controller.update('u1',{username:'Nome Com Espaços'},{} as any),/Usuário/);
 await assert.rejects(()=>x.controller.update('u1',{email:'not-an-email'},{} as any),/e-mail válido/);
 assert.equal(x.updates.length,0);
});
