/** Carga manual e idempotente da carteira de 23/11. Padrão: APENAS relatório. */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
for(const line of fs.readFileSync(path.join(root,'.env'),'utf8').split(/\r?\n/)){
 const m=line.trim().match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);if(!m)continue;
 if(!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'');
}
const {PrismaClient,createPostgresAdapter}=await import('@terzo/database');
const prisma=new PrismaClient({adapter:createPostgresAdapter()});
const apply=process.argv.includes('--apply');
const createMissing=process.argv.includes('--create-missing-clients');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const csv=fs.readFileSync(path.join(root,'docs','carteira-2026-11-23.csv'),'utf8').trim().split(/\r?\n/).slice(1).map(s=>s.split(','));
const one=(rows,name)=>{const hits=rows.filter(r=>norm(r.data.name)===norm(name));return hits.length===1?hits[0]:null};
try{
 const [rawClients,rawMembers]=await Promise.all([
  prisma.document.findMany({where:{collection:'clients'}}),
  prisma.document.findMany({where:{collection:'members'}})
 ]);
 const clients=rawClients.map(r=>({...r,data:r.data}));
 const members=rawMembers.map(r=>({...r,data:r.data}));
 let affected=0,skipped=0;
 const stamp=new Date().toISOString();
 for(const [clientName,designerName,editorName] of csv){
  let c=one(clients,clientName);
  if(!c&&!(apply&&createMissing)){console.log('CLIENTE NÃO LOCALIZADO:',clientName);skipped++;continue}
  const d=one(members,designerName);const e=editorName?one(members,editorName):null;
  if(!d||d.data.disabled){console.log('DESIGNER NÃO LOCALIZADO/INATIVO:',clientName,designerName);skipped++;continue}
  if(editorName&&(!e||e.data.disabled))console.log('EDITOR NÃO LOCALIZADO/INATIVO (mantido indefinido):',clientName,editorName);
  if(!c){const id='cl_'+randomUUID().replace(/-/g,'').slice(0,18);c={id,data:{name:clientName,stage:'Fechado',createdAt:stamp.slice(0,10)}};clients.push(c);console.log('NOVO CLIENTE SEM DETALHES CONTRATUAIS:',clientName)}
  const next={...c.data};
  const assignments=[['designerId',d.id],['videoEditorId',editorName?(e?.id||''):'']];
  let changed=false;
  for(const [field,newId] of assignments){
   // Bruno ainda ausente: não substituir nem apagar vínculo existente.
   if(field==='videoEditorId'&&editorName&&!e)continue;
   const before=String(next[field]||'');
   if(before===newId)continue;
   if(before&&before!==newId){console.log('CONFLITO, NÃO SOBRESCRITO:',clientName,field,before,'→',newId);continue}
   next[field]=newId;
   next.ownerHistory=[...(Array.isArray(next.ownerHistory)?next.ownerHistory:[]),{
    role:field==='designerId'?'designer':'video_editor',fromId:before,toId:newId,
    changedBy:'import:2026-11-23',changedAt:stamp
   }].slice(-200);
   changed=true;
  }
  if(!changed&&rawClients.some(x=>x.id===c.id))continue;
  console.log(apply?'APLICAR:':'PREVISÃO:',clientName,'designer:',d.data.name,'editor:',e?.data.name||'(indefinido)');
  if(apply){
   await prisma.document.upsert({
    where:{collection_id:{collection:'clients',id:c.id}},
    create:{collection:'clients',id:c.id,data:next,updatedAt:BigInt(Date.now()),updatedBy:'import:2026-11-23'},
    update:{data:next,updatedAt:BigInt(Date.now()),updatedBy:'import:2026-11-23'}
   });
  }
  affected++;
 }
 const puma=one(clients,'Puma Proteção Veicular');
 if(puma&&!puma.data.inactive){
  console.log(apply?'INATIVANDO: Puma Proteção Veicular':'PREVISÃO: marcar Puma Proteção Veicular como inativa');
  if(apply)await prisma.document.update({where:{collection_id:{collection:'clients',id:puma.id}},data:{data:{...puma.data,inactive:true},updatedAt:BigInt(Date.now()),updatedBy:'import:2026-11-23'}});
 }
 console.log(JSON.stringify({mode:apply?'APPLY':'DRY RUN',candidates:affected,missing:skipped,createMissingClients:createMissing,at:stamp},null,2));
 if(!apply)console.log('NENHUM REGISTRO ALTERADO. Faça um backup; confira nomes e use --apply para gravar.');
}finally{await prisma.$disconnect()}
