import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AccessService } from '../src/access.service';
import { TeamProvisioningService, emailFromUsername, usernameFromName } from '../src/team-provisioning.service';
import { verifyPassword } from '../src/security';

const owner={ id:'owner', role:'owner' } as any;
const editor={ id:'editor', role:'editor' } as any;
const member={ id:'member', role:'member' } as any;

function fixture(){
  const users=new Map<string,any>();
  const members=new Map<string,any>();
  const audits:any[]=[];
  const broadcasts:any[]=[];
  const db:any={
    user:{
      findUnique:async ({where}:any)=>[...users.values()].find(x=>x.username===where.username)||null,
      findFirst:async ({where}:any)=>[...users.values()].find(x=>x.memberId===where.memberId&&(where.id?.not===undefined?x.id!==where.id.not:true))||null,
      create:async ({data}:any)=>{
        if([...users.values()].some(x=>x.username===data.username))throw Error('unique constraint');
        users.set(data.id,{...data});return data;
      },
    },
    document:{
      findUnique:async ({where}:any)=>members.get(where.collection_id.id)||null,
      create:async ({data}:any)=>{if(members.has(data.id))throw Error('duplicate document');members.set(data.id,{...data});return data},
      update:async ({where,data}:any)=>{
        const previous=members.get(where.collection_id.id);
        if(!previous)throw Error('not_found');
        const updated={...previous,...data};members.set(where.collection_id.id,updated);
        return updated;
      },
    },
    audit:{create:async ({data}:any)=>{audits.push(data);return data}},
    $transaction:async (fn:any)=>fn(db),
  };
  const events={broadcast:(coll:string,id:string,data:any)=>broadcasts.push({coll,id,data})};
  const service=new TeamProvisioningService(db,new AccessService(),events as any);
  return {service,users,members,audits,broadcasts};
}

test('name normalization yields corporate usernames and email addresses',()=>{
  assert.equal(usernameFromName('Gabriella Firmino'),'gabriella.firmino');
  assert.equal(emailFromUsername('gabriella.firmino'),'gabriella.firmino@terceiroandar.com.br');
  assert.equal(usernameFromName('  João  da   Conceição  '),'joao.da.conceicao');
  assert.equal(usernameFromName('Ana-Maria Silva'),'ana.maria.silva');
  assert.throws(()=>usernameFromName('  É  '),/Nome insuficiente/);
});

test('new member receives atomic linked account and a one-time temporary password',async()=>{
  const env=fixture();
  const created=await env.service.createMemberAndAccount(owner,{name:'Gabriella Firmino',area:'Design',role:'Design gráfico',capacity:15});
  assert.equal(created.username,'gabriella.firmino');
  assert.equal(created.email,'gabriella.firmino@terceiroandar.com.br');
  assert.equal(created.name,'Gabriella Firmino');
  const row=env.members.get(created.memberId);
  const user=env.users.get(created.userId);
  assert.equal(row.data.accountId,created.userId);
  assert.equal(row.data.email,created.email);
  assert.equal(row.data.role,'Design gráfico');
  assert.equal(user.memberId,created.memberId);
  assert.equal(user.mustChange,true);
  assert.equal(user.role,'member');
  assert.equal(verifyPassword(created.tempPassword,user.passHash),true);
  assert.equal(env.audits.length,1);
  assert.ok(!JSON.stringify(env.audits, (_key, value) => typeof value === 'bigint' ? String(value) : value).includes(created.tempPassword),'audit log must not expose password');
  assert.equal(env.broadcasts.length,1);
});

test('collision handling never modifies existing accounts and generates deterministic suffix',async()=>{
  const env=fixture();
  env.users.set('existing',{id:'existing',username:'gabriella.firmino',memberId:'m_old',passHash:'old hash'});
  const created=await env.service.createMemberAndAccount(owner,{name:'Gabriella Firmino'});
  assert.equal(created.username,'gabriella.firmino.2');
  assert.equal(created.email,'gabriella.firmino.2@terceiroandar.com.br');
  assert.equal(env.users.get('existing').passHash,'old hash');
  assert.equal(env.users.size,2);
});

test('administrative profiles require owner and match editor credentials',async()=>{
  const env=fixture();
  await assert.rejects(()=>env.service.createMemberAndAccount(editor,{name:'Ana Carolina',admin:true}),/Somente o proprietário/);
  const created=await env.service.createMemberAndAccount(owner,{name:'Ana Carolina',admin:true});
  assert.equal(env.users.get(created.userId).role,'editor');
  assert.equal(env.members.get(created.memberId).data.admin,true);
  await assert.rejects(()=>env.service.createMemberAndAccount(member,{name:'Unauthorized Person'}),/permission_denied/);
});

test('batch provisions existing unlinked team members only and is idempotent',async()=>{
  const env=fixture();
  for(const [id,data] of [
    ['m1',{name:'Gabriella Firmino',disabled:false,capacity:15}],
    ['m2',{name:'Pedro Souza',disabled:false}],
    ['m3',{name:'Ana Silva',accountId:'existing',disabled:false}],
    ['m4',{name:'Pessoa Desativada',disabled:true}],
  ] as any[])env.members.set(id,{collection:'members',id,data});
  env.users.set('existing',{id:'existing',username:'ana.silva',memberId:'m3',passHash:'preserved'});
  const result=await env.service.provisionExisting(owner,['m1','m2','m3','m4']);
  assert.equal(result.created.length,2);
  assert.equal(result.skipped.length,2);
  assert.deepEqual(result.created.map(x=>x.username),['gabriella.firmino','pedro.souza']);
  assert.equal(env.members.get('m1').data.accountId,result.created[0].userId);
  assert.equal(env.members.get('m2').data.email,'pedro.souza@terceiroandar.com.br');
  assert.equal(env.users.get('existing').passHash,'preserved');
  const again=await env.service.provisionExisting(owner,['m1','m2']);
  assert.equal(again.created.length,0);
  assert.equal(again.skipped.length,2);
  assert.equal(env.users.size,3);
});

test('batch rejects invalid input and ordinary members cannot provision others',async()=>{
  const env=fixture();
  await assert.rejects(()=>env.service.provisionExisting(owner,[]),/Selecione/);
  await assert.rejects(()=>env.service.provisionExisting(owner,['m1','m1']),/Selecione/);
  await assert.rejects(()=>env.service.provisionExisting(owner,['../docs']),/Selecione/);
  await assert.rejects(()=>env.service.provisionExisting(member,['m1']),/permission_denied/);
  await assert.rejects(()=>env.service.createMemberAndAccount(owner,{name:' '}),/Nome do integrante/);
});
