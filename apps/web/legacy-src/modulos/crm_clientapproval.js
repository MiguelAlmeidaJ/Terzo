/* Validação externa do cliente (independente da esteira interna de aprovações). */
const CA_STATUS={pending:'Aguardando cliente',approved:'Aprovado pelo cliente',changes:'Cliente pediu ajustes',revoked:'Link revogado'};
let caCurrentLink='';
let caCurrentTarget=null;

function caCanManage(kind,item){
 if(!item||!item.clientId)return false;
 if(isAdmin())return true;
 const m=myMember();if(!m)return false;
 return kind==='calendar'?item.copyId===m.id||item.artId===m.id:item.memberId===m.id;
}
function caLinkButton(kind,item){
 if(!caCanManage(kind,item))return'';
 return '<button class="btn" data-act="ca-open" data-kind="'+esc(kind)+'" data-id="'+esc(item.id)+'">Validação do cliente ↗</button>';
}
async function caFetch(path,options){
 const result=await fetch(path,{credentials:'same-origin',cache:'no-store',
  ...options,headers:{'X-Terzo':'1',...(options?.body?{'Content-Type':'application/json'}:{}),...(options?.headers||{})}});
 const data=await result.json().catch(()=>({}));
 if(!result.ok)throw Error(data.error||'Não foi possível consultar as aprovações.');
 return data;
}
const caStatus=x=>x.status==='pending'&&Date.now()>x.expiresAt?'Link expirado':CA_STATUS[x.status]||x.status;
const caDate=x=>x?new Date(x).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';

async function caDialog(kind,id){
 const item=byId(kind==='calendar'?'calendars':'creatives',id);
 if(!caCanManage(kind,item)){toast('Você não pode compartilhar este material.');return}
 caCurrentTarget={kind,id};let rows=[];
 try{
  const result=await caFetch('/api/client-approvals?kind='+encodeURIComponent(kind)+'&targetId='+encodeURIComponent(id));
  rows=result.items||[];
 }catch(err){toast(err.message);return}
 const title=kind==='calendar'?'Calendário · '+cName(item.clientId):item.title||'Arte avulsa';
 openModal('<div class="mh"><div><h2>Validação do cliente</h2><p style="font-size:13px;color:var(--muted);margin:4px 0 0">'+esc(title)+'</p></div><button class="x" data-act="close" aria-label="Fechar">×</button></div>'+
  '<div class="mb"><p style="font-size:13px;line-height:1.6">Gere um link para o cliente conferir somente este material, aprovar ou pedir ajustes. O link expira em <b>14 dias</b>. Ao gerar uma nova versão, os links pendentes anteriores são revogados.</p>'+
  (caCurrentLink?'<div class="sec"><h3>Link gerado (copie agora)</h3><input id="ca-link" readonly value="'+esc(caCurrentLink)+'" aria-label="Link de aprovação"><button class="btn sm primary" data-act="ca-copy" style="margin-top:8px">Copiar link</button><p style="font-size:12px;color:var(--muted);margin:8px 0">Por segurança, o endereço completo só aparece neste momento; depois gere outro link se necessário.</p></div>':'')+
  '<div class="sec"><h3>Histórico de validação</h3>'+
  (rows.length?rows.map(r=>'<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--line);padding:10px 0"><div><b>'+esc(caStatus(r))+'</b><small style="display:block;color:var(--muted)">'+caDate(r.createdAt)+(r.decidedBy?' · '+esc(r.decidedBy):'')+'</small>'+(r.comment?'<p style="font-size:13px;margin:5px 0">'+esc(r.comment)+'</p>':'')+'</div>'+
    (r.status==='pending'&&!r.revokedAt&&r.expiresAt>Date.now()?'<button class="btn sm danger" data-act="ca-revoke" data-record="'+esc(r.id)+'">Revogar</button>':'')+'</div>').join(''):'<p style="font-size:13px;color:var(--muted)">Nenhum link enviado ainda.</p>')+
  '</div></div><div class="mf"><button class="btn" data-act="ca-refresh">Atualizar status</button><span class="spacer"></span><button class="btn primary" data-act="ca-create">Gerar link de aprovação</button></div>');
}

/* Caixa de entrada separada da aprovação interna dos designers. */
{const at=VIEWS.findIndex(v=>v[0]==='aprovacoes');VIEWS.splice(at>=0?at+1:VIEWS.length,0,['validacaocliente','Validação do Cliente','Cliente'])}
IC.validacaocliente='<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6M8 2v2M16 2v2"/>';
ui.caRows=[];ui.caLoaded=false;ui.caLoading=false;ui.caError='';

async function caInboxLoad(){
 if(ui.caLoading)return;
 ui.caLoading=true;ui.caError='';
 try{
  const response=await caFetch('/api/client-approvals/overview');
  ui.caRows=response.items||[];ui.caLoaded=true;
 }catch(err){ui.caError=err.message||'Falha ao consultar validações';ui.caLoaded=true}
 finally{ui.caLoading=false;if(ui.view==='validacaocliente')refresh()}
}
function vValidacaoCliente(){
 if(!ui.caLoaded&&!ui.caLoading)caInboxLoad();
 const rows=ui.caRows||[],count=status=>rows.filter(x=>x.status===status).length;
 const title='<div class="head"><div><h1>Validação do Cliente</h1><p>Acompanhe links enviados para aprovação de calendários e artes avulsas. Este é um fluxo separado da validação interna da liderança.</p></div>'+
  '<button class="btn" data-act="ca-inbox-refresh">Atualizar</button></div>';
 const cards='<div class="cal-kpis" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:16px">'+
  [['pending','Aguardando cliente'],['approved','Aprovados'],['changes','Ajustes pedidos'],['revoked','Revogados']].map(([key,label])=>
  '<div class="kpi"><div class="l">'+label+'</div><div class="v">'+count(key)+'</div></div>').join('')+'</div>';
 const list=rows.map(x=>{
  const item=byId(x.kind==='calendar'?'calendars':'creatives',x.targetId);
  const st=caStatus(x);
  return '<div class="item" style="display:flex;align-items:center;gap:14px;padding:13px;border-bottom:1px solid var(--line)">'+
   '<span style="font-size:22px">'+(x.kind==='calendar'?'📅':'🎨')+'</span>'+
   '<span style="flex:1;min-width:0"><b>'+esc(cName(x.clientId))+'</b><small style="display:block;color:var(--muted)">'+
   esc(x.kind==='calendar'?'Calendário':'Arte avulsa')+' · '+esc(x.title)+' · '+esc(caDate(x.createdAt))+'</small>'+
   (x.comment?'<small style="display:block;white-space:pre-wrap;color:var(--ink);margin-top:4px">'+esc(x.comment)+'</small>':'')+'</span>'+
   '<span class="pill '+(x.status==='approved'?'p-ok':x.status==='changes'?'p-critico':'')+'">'+esc(st)+'</span>'+
   (item?'<button class="btn sm" data-act="'+(x.kind==='calendar'?'cal-open':'open-creative')+'" data-id="'+esc(x.targetId)+'">Abrir material</button>':'')+
   (item&&caCanManage(x.kind,item)?'<button class="btn sm" data-act="ca-open" data-kind="'+esc(x.kind)+'" data-id="'+esc(x.targetId)+'">Gerenciar link</button>':'')+
   '</div>';
 }).join('');
 return title+cards+(ui.caError?'<div class="alertbox">'+esc(ui.caError)+'</div>':'')+
  (ui.caLoading&&!ui.caLoaded?'<div class="loading">Carregando validações…</div>':
    list?'<section class="panel"><h2>Histórico de solicitações</h2><div class="list">'+list+'</div></section>':
    emptyBox('Nenhum material enviado ao cliente','Abra um calendário ou uma arte avulsa e escolha “Validação do cliente” para gerar o primeiro link.'));
}

document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-act^="ca-"]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();const a=b.dataset.act;
 try{
  if(a==='ca-open'){caCurrentLink='';await caDialog(b.dataset.kind,b.dataset.id);return}
  if(a==='ca-copy'){
   const input=document.getElementById('ca-link');if(!input)return;
   if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(input.value);
   else{input.select();document.execCommand('copy')}
   toast('Link copiado!');return;
  }
  if(a==='ca-inbox-refresh'){ui.caLoaded=false;await caInboxLoad();return}
  if(!caCurrentTarget)return;
  if(a==='ca-refresh'){await caDialog(caCurrentTarget.kind,caCurrentTarget.id);return}
  if(a==='ca-create'){
   b.disabled=true;
   const data=await caFetch('/api/client-approvals',{method:'POST',body:JSON.stringify({kind:caCurrentTarget.kind,targetId:caCurrentTarget.id})});
   caCurrentLink=location.origin+'/aprovacao/'+data.token;
   await caDialog(caCurrentTarget.kind,caCurrentTarget.id);
   toast('Link criado; envie ao cliente por WhatsApp ou e-mail.');return;
  }
  if(a==='ca-revoke'){
   if(!confirm('Revogar este link? Ele deixará de permitir acesso e decisão.'))return;
   b.disabled=true;
   await caFetch('/api/client-approvals/'+encodeURIComponent(b.dataset.record)+'/revoke',{method:'POST',body:'{}'});
   caCurrentLink='';await caDialog(caCurrentTarget.kind,caCurrentTarget.id);
   toast('Link revogado.');
  }
 }catch(err){console.error(err);toast(err.message||'Não foi possível gerar o link.');b.disabled=false}
},true);
