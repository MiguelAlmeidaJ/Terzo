/* Gestão de logins dentro de Equipe → Gerenciamento de usuários.
   Fonte da verdade: /api/admin/users e API transacional de provisionamento.
   Senhas provisórias nunca são persistidas no navegador. */
const teamAccountState={users:[],loaded:false,loading:false,busy:false,error:''};

function teamNormalizeName(name){
 return String(name||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,'.').slice(0,36).replace(/\.+$/,'');
}
function teamUsernameHint(name){const base=teamNormalizeName(name);return base.length>=3?base:'usuario'}
function teamApi(url,method='GET',body){
 return fetch(url,{method,credentials:'same-origin',cache:'no-store',
  headers:{'X-Terzo':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})},
  ...(body!==undefined?{body:JSON.stringify(body)}:{})}).then(async response=>{
   const value=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(value.error||value.message||'Não foi possível concluir a operação.');
   return value;
 });
}
async function teamLoadUsers(force=false){
 if(teamAccountState.loading||(teamAccountState.loaded&&!force))return;
 if(!me.canEdit)return;
 teamAccountState.loading=true;teamAccountState.error='';
 try{
  const data=await teamApi('/api/admin/users');
  teamAccountState.users=Array.isArray(data.users)?data.users:[];
  teamAccountState.loaded=true;
 }catch(error){teamAccountState.error=error.message||'Não foi possível carregar os logins.';teamAccountState.loaded=true}
 finally{teamAccountState.loading=false;if(ui.view==='equipe'&&ui.eqTab==='usuarios')refresh()}
}
const teamAccountOf=m=>teamAccountState.users.find(u=>u.id===m.accountId||u.member_id===m.id);
const teamNoAccess=()=>S.members.filter(m=>!m.disabled&&!m.accountId&&!teamAccountState.users.some(u=>u.member_id===m.id));
const teamStatus=(u,m)=>m.disabled||u?.status==='disabled'?'Desativado':u?'Ativo':'Sem login';
const teamIsSelf=m=>m.accountId===me.id||m.id===realMember()?.id;

function teamShowCredentials(created,skipped=[]){
 const rows=Array.isArray(created)?created:[created];
 if(!rows.length&&!skipped.length){toast('Nenhuma conta nova foi criada.');return}
 const contents=rows.map(a=>a.name+' | '+a.username+' | '+a.email+' | '+a.tempPassword).join('\n');
 openModal('<div class="mh"><div><h2>Acessos criados</h2><p class="mut" style="font-size:13px;margin:4px 0 0">'+rows.length+' login(s) criado(s) · senhas provisórias únicas</p></div><button class="x" data-act="close" aria-label="Fechar">×</button></div>'+
  '<div class="mb"><div class="acc-secret-note"><b>Guarde as senhas agora.</b> Por segurança, elas não poderão ser consultadas novamente. Cada pessoa deve trocar a senha no primeiro login. Envie os dados individualmente por um canal privado.</div>'+
  (rows.length?'<div class="acc-tw"><table class="acc-t acc-credentials"><thead><tr><th>Integrante</th><th>Usuário</th><th>E-mail</th><th>Senha provisória</th></tr></thead><tbody>'+
  rows.map(x=>'<tr><td>'+esc(x.name)+'</td><td><b>'+esc(x.username)+'</b></td><td>'+esc(x.email)+'</td><td><code>'+esc(x.tempPassword)+'</code></td></tr>').join('')+
  '</tbody></table></div><pre id="team-once-credentials" hidden>'+esc(contents)+'</pre>':'')+
  (skipped.length?'<div class="acc-skipped"><b>'+skipped.length+' cadastro(s) não alterado(s):</b><ul>'+skipped.map(x=>'<li>'+esc(x.name)+': '+esc(x.reason)+'</li>').join('')+'</ul></div>':'')+
  '</div><div class="mf">'+(rows.length?'<button class="btn primary" data-act="team-copy-passwords">Copiar dados de acesso</button>':'')+
  '<span class="spacer"></span><button class="btn" data-act="close">Concluir</button></div>');
}
async function teamProvision(memberIds){
 if(teamAccountState.busy||!memberIds.length)return;
 const eligible=memberIds.map(id=>S.members.find(m=>m.id===id)).filter(Boolean);
 if(!eligible.length)return;
 const prompt=eligible.length===1?'Criar login para '+eligible[0].name+'?':
  'Criar '+eligible.length+' contas com senha provisória individual?\n\n'+eligible.map(m=>'• '+m.name+' → '+teamUsernameHint(m.name)+'@terceiroandar.com.br').join('\n')+
  '\n\nContas existentes serão preservadas. As senhas serão exibidas uma única vez.';
 if(!confirm(prompt))return;
 teamAccountState.busy=true;
 try{
  const result=await teamApi('/api/team/provision-accounts','POST',{memberIds});
  await teamLoadUsers(true);
  teamShowCredentials(result.created||[],result.skipped||[]);
 }catch(error){toast(error.message)}
 finally{teamAccountState.busy=false}
}
function teamEditAccount(m,account){
 if(!account||!me.canEdit)return;
 const values={name:account.name||m?.name||'',username:account.username||'',email:account.email||'',memberId:account.member_id||m?.id||''};
 formModal({title:'Editar login · '+(m?.name||account.name),values,fields:[
   {k:'name',l:'Nome completo',req:1,full:1},
   {k:'username',l:'Usuário',req:1,hint:'Login com letras minúsculas, pontos, números e hífens.'},
   {k:'email',l:'E-mail',t:'email',req:1,hint:'Padrão da agência: usuario@terceiroandar.com.br'},
   {k:'memberId',l:'Vincular à Equipe',t:'select',full:1,o:S.members.filter(x=>x.id===account.member_id||!x.accountId).map(x=>({v:x.id,l:x.name})),empty:'Sem vínculo'}
 ],onSave:async value=>{
   await teamApi('/api/admin/users/'+encodeURIComponent(account.id),'PATCH',{
     name:value.name,username:value.username,email:value.email,memberId:value.memberId,
   });
   toast('Login atualizado sem substituir a conta nem apagar o histórico.');
   await teamLoadUsers(true);
 }});
}
async function teamAccountAction(kind,memberId,accountId){
 if(teamAccountState.busy)return;
 const member=S.members.find(m=>m.id===memberId);
 const account=teamAccountState.users.find(u=>u.id===accountId);
 if(!account){toast('Conta não encontrada. Atualize a listagem.');return}
 if(kind==='edit'){teamEditAccount(member,account);return}
 if(account.id===me.id){toast('Para proteger a sua sessão, altere a própria senha pelo menu da conta.');return}
 const texts={
  reset:'Gerar nova senha provisória para '+account.name+'? Todas as sessões da pessoa serão encerradas.',
  off:'Desativar o login de '+account.name+' e encerrar as sessões?',
  on:'Reativar a conta de '+account.name+'?',
  revoke:'Encerrar todas as sessões de '+account.name+'?',
  unlink:'Desvincular '+account.name+' do cadastro da Equipe? O login não será excluído.',
 };
 if(!confirm(texts[kind]||'Confirmar operação?'))return;
 teamAccountState.busy=true;
 try{
  const body=kind==='reset'?{resetPassword:true}:kind==='revoke'?{revokeSessions:true}:
   kind==='off'?{status:'disabled'}:kind==='on'?{status:'active'}:{memberId:''};
  const result=await teamApi('/api/admin/users/'+encodeURIComponent(accountId),'PATCH',body);
  if((kind==='off'||kind==='on')&&member)
   await put('members',member.id,{...member,disabled:kind==='off',disabledAt:kind==='off'?new Date().toISOString():''});
  await teamLoadUsers(true);
  if(result.tempPassword)teamShowCredentials([{name:account.name,username:account.username,email:account.email,tempPassword:result.tempPassword}],[]);
  else toast('Alteração realizada.');
 }catch(error){toast(error.message)}
 finally{teamAccountState.busy=false}
}


/* Icon buttons retain descriptive labels for assistive tech and hover tooltips. */
function teamIcon(name){
 const paths={
 edit:'<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/>',
 reset:'<circle cx="7" cy="16" r="4"/><path d="M10 13 21 2m-4 4 3 3"/>',
 revoke:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',
 off:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m9 10 6 4m0-4-6 4"/>',
 on:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 unlink:'<path d="m10 13 4-4m-6 8H7a5 5 0 0 1 0-10h3m4 0h3a5 5 0 0 1 0 10h-3M4 20 20 4"/>',
 view:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 add:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8m-4-4h8"/>',
 refresh:'<path d="M3 12a9 9 0 0 1 15.4-6.4L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.4 6.4L3 16M3 21v-5h5"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'
 };
 return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.edit)+'</svg>';
}
function teamAction(act,label,icon,mid,uid,style=''){
 return '<button type="button" class="team-icon '+style+'" data-act="'+esc(act)+'" data-mid="'+esc(mid||'')+'" data-uid="'+esc(uid||'')+'" aria-label="'+esc(label)+'" title="'+esc(label)+'">'+teamIcon(icon)+'</button>';
}
function teamActionIcons(m,u,self){
 const name=m?.name||u?.name||'usuário',mid=m?.id||'',uid=u?.id||'';
 if(!u)return m&&!m.disabled&&!m.accountId?teamAction('team-provision-one','Criar acesso para '+name,'add',mid,'','team-icon-primary'):'';
 let html=teamAction('team-edit','Editar login de '+name,'edit',mid,uid);
 if(!self){
  html+=teamAction('team-reset','Nova senha para '+name,'reset',mid,uid);
  html+=teamAction('team-revoke','Revogar sessões de '+name,'revoke',mid,uid);
  html+=teamAction(u.status==='active'?'team-off':'team-on',(u.status==='active'?'Desativar':'Reativar')+' '+name,u.status==='active'?'off':'on',mid,uid,u.status==='active'?'team-icon-danger':'team-icon-success');
  html+=teamAction('team-unlink','Desvincular conta de '+name,'unlink',mid,uid,'team-icon-danger');
 }
 return html;
}
function teamApplyFilter(){
 const q=String(document.getElementById('team-search')?.value||'').trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const status=document.getElementById('team-filter')?.value||'all';
 let count=0;
 document.querySelectorAll('.team-users tbody tr[data-query]').forEach(row=>{
  const show=(!q||row.dataset.query.includes(q))&&(status==='all'||row.dataset.status===status);
  row.hidden=!show;if(show)count++;
 });
 const el=document.getElementById('team-visible');if(el)el.textContent=count+' integrante'+(count===1?'':'s');
 const empty=document.getElementById('team-no-results');if(empty)empty.hidden=count>0;
}
document.addEventListener('input',e=>{if(e.target.id==='team-search')teamApplyFilter()});
document.addEventListener('change',e=>{if(e.target.id==='team-filter')teamApplyFilter()});

function accUsersBody(){
 if(me.canEdit&&!teamAccountState.loaded&&!teamAccountState.loading)teamLoadUsers();
 const people=S.members.slice().sort((a,b)=>(!!a.disabled-!!b.disabled)||a.name.localeCompare(b.name,'pt'));
 const users=teamAccountState.users;
 const pending=accPendingReqs();
 const countActive=people.filter(m=>teamAccountOf(m)?.status==='active'&&!m.disabled).length;
 const free=teamNoAccess();
 const disabled=people.filter(m=>m.disabled).length;
 const lastAccess=m=>m.lastSeen?fD(m.lastSeen.slice(0,10))+' · '+esc(ago(m.lastSeen)):'Nunca entrou';
 const rows=people.map(m=>{
  const u=teamAccountOf(m),self=teamIsSelf(m),p=accProfile(m);
  return '<tr class="team-row'+(m.disabled?' off':'')+'" data-query="'+esc([m.name,m.area,m.role,u?.username,u?.email].join(' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase())+'" data-status="'+(m.disabled||u?.status==='disabled'?'disabled':u?'active':'missing')+'">'+
   '<td><div class="team-person">'+av(m.id)+'<span><b>'+esc(m.name)+'</b><small>'+esc(m.area||'')+(m.role?' · '+esc(m.role):'')+'</small></span></div></td>'+ 
   '<td class="team-identity">'+(u?'<b>'+esc(u.username)+'</b><small>'+esc(u.email)+'</small>':m.accountId?'<span class="team-placeholder">Vínculo sem conta</span>':'<span class="team-placeholder">Acesso não criado</span>')+'</td>'+ 
   '<td><select class="sel team-role" data-acc-prof="'+esc(m.id)+'" aria-label="Perfil de '+esc(m.name)+'" '+(self?'disabled title="Não altere seu próprio perfil"':'')+'>'+
    Object.entries(ACC_PL).map(([k,label])=>'<option value="'+k+'" '+(k===p?'selected':'')+'>'+label+'</option>').join('')+'</select></td>'+
   '<td><span class="team-state '+(m.disabled||u?.status==='disabled'?'is-off':u?'is-on':'is-missing')+'"><i></i>'+esc(teamStatus(u,m))+'</span>'+(u?.must_change?'<small class="team-pending">Troca de senha pendente</small>':'')+'</td>'+ 
   '<td class="team-last">'+(u?.last_login?'<b>'+esc(new Date(u.last_login).toLocaleDateString('pt-BR'))+'</b>':'<span>Nunca entrou</span>')+'</td>'+ 
   '<td class="team-actions-cell"><div class="team-actions" role="group" aria-label="Ações de '+esc(m.name)+'">'+teamActionIcons(m,u,self)+
    (!m.disabled&&!self?'<button type="button" class="team-icon" data-act="acc-va" data-id="'+esc(m.id)+'" aria-label="Visualizar como '+esc(m.name)+'" title="Visualizar como '+esc(m.name)+'">'+teamIcon('view')+'</button>':'')+
   '</div></td></tr>';
 }).join('');
 const loose=users.filter(u=>!people.some(m=>m.accountId===u.id||m.id===u.member_id));
 const requests=pending.length?'<section class="panel"><h2>Pedidos de acesso <span class="sub">'+pending.length+'</span></h2><div class="acc-reqs">'+pending.map(r=>
  '<div class="acc-req"><div><b>'+esc(r.name||'Sem nome')+'</b><small>'+esc(r.email||'')+'</small></div>'+
  '<div class="row"><select class="sel" id="acc-to-'+esc(r.id)+'"><option value="">Vincular a…</option>'+people.filter(m=>!m.accountId).map(m=>'<option value="'+esc(m.id)+'">'+esc(m.name)+'</option>').join('')+'</select>'+
  '<button class="btn sm" data-act="acc-link" data-id="'+esc(r.id)+'">Vincular</button><button class="btn sm ghost" data-act="acc-ignore" data-id="'+esc(r.id)+'">Recusar</button></div></div>').join('')+'</div></section>':'';
 const log=(S.access_log||[]).slice().sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,25);
 return '<div class="acc-header-tools"><div><b>Contas e permissões da equipe</b><p class="mut">Crie, edite e redefina logins aqui, sem sair do Terzo. Novas pessoas recebem acesso automaticamente ao serem cadastradas.</p></div>'+
   '<div class="row">'+(free.length?'<button class="btn primary" data-act="team-provision-all">Criar acessos pendentes ('+free.length+')</button>':'')+
   '<button class="btn team-reload" data-act="team-reload">'+teamIcon('refresh')+' Atualizar</button></div></div>'+
  (teamAccountState.error?'<div class="acc-warning">'+esc(teamAccountState.error)+'</div>':'')+
  '<div class="kpis acc-k"><div class="kpi"><div class="l">Com acesso ativo</div><div class="v">'+countActive+'</div></div>'+
  '<div class="kpi"><div class="l">Sem conta vinculada</div><div class="v">'+free.length+'</div><div class="s">Criação automática disponível</div></div>'+
  '<div class="kpi"><div class="l">Desativados</div><div class="v">'+disabled+'</div></div>'+
  '<div class="kpi"><div class="l">Pedidos de acesso</div><div class="v">'+pending.length+'</div></div></div>'+
  requests+'<section class="panel team-users-panel"><div class="team-table-head"><div><h2>Integrantes e acessos</h2><small id="team-visible">'+people.length+' integrantes</small></div><div class="team-table-filters"><label class="team-search">'+teamIcon('search')+'<input id="team-search" type="search" placeholder="Buscar nome ou e-mail" aria-label="Buscar integrante" autocomplete="off"></label><select id="team-filter" aria-label="Filtrar por status"><option value="all">Todos</option><option value="active">Ativos</option><option value="missing">Sem login</option><option value="disabled">Desativados</option></select></div></div><div class="acc-tw"><table class="acc-t team-users"><thead><tr>'+ 
  '<th>Integrante</th><th>Usuário / e-mail</th><th>Perfil</th><th>Status</th><th>Último login</th><th>Ações</th>'+
  '</tr></thead><tbody>'+rows+'</tbody></table></div><div id="team-no-results" class="team-no-results" hidden>Nenhum integrante encontrado.</div></section>'+ 
  (loose.length?'<section class="panel"><h2>Contas sem cadastro de Equipe <span class="sub">'+loose.length+'</span></h2><div class="acc-loose">'+loose.map(u=>'<div class="acc-loose-row"><span><b>'+esc(u.name)+'</b><small>'+esc(u.username)+' · '+esc(u.email)+'</small></span><button class="btn sm" data-act="team-edit" data-mid="" data-uid="'+esc(u.id)+'">Editar e vincular</button></div>').join('')+'</div></section>':'')+
  '<section class="panel acc-how"><h2>Como funciona</h2><ol>'+
  '<li><b>Novo integrante:</b> ao cadastrar em Equipe, o sistema cria o usuário e a senha provisória automaticamente, sem passar por outra tela.</li>'+
  '<li><b>Integrantes existentes:</b> use “Criar acessos pendentes” para gerar logins só para quem ainda não tem conta. Contas existentes não serão substituídas.</li>'+
  '<li><b>Padrão:</b> Gabriella Firmino → <b>gabriella.firmino</b> e <b>gabriella.firmino@terceiroandar.com.br</b>. Nomes iguais recebem um sufixo para evitar conflito.</li>'+
  '<li><b>Credenciais:</b> senhas individuais são mostradas somente uma vez, exigindo troca no primeiro login. Nenhuma senha é enviada por e-mail automaticamente.</li>'+
  '<li><b>Editar:</b> altere nome, usuário e e-mail sem perder o histórico. Somente a pessoa pode alterar sua própria foto do PostgreSQL.</li>'+
  '</ol></section>'+
  '<section class="panel"><h2>Registro de acessos e alterações <span class="sub">últimas '+log.length+'</span></h2>'+
  (log.length?'<ul class="acc-log">'+log.map(l=>'<li><span>'+esc(cfDT(l.at))+'</span><span><b>'+esc(l.by)+'</b> '+esc(ACC_ACT[l.action]||l.action)+' '+esc(l.note||'')+'</span></li>').join('')+'</ul>':'<p class="mut">Nenhum registro de atividades nesta área.</p>')+'</section>';
}

/* Capture our own actions without touching other modules' modal/permissions handlers. */
document.addEventListener('click',async e=>{
 const target=e.target.closest('[data-act^="team-"]');if(!target)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 if(document.body.classList.contains('acc-locked')||!me.canEdit||ui.viewAs){toast('Somente administradores gerenciam contas.');return}
 const action=target.dataset.act,memberId=target.dataset.mid,accountId=target.dataset.uid;
 try{
  if(action==='team-reload'){await teamLoadUsers(true);return}
  if(action==='team-provision-all'){await teamProvision(teamNoAccess().map(m=>m.id));return}
  if(action==='team-provision-one'){await teamProvision([memberId]);return}
  if(action==='team-copy-passwords'){
    const text=document.getElementById('team-once-credentials')?.textContent||'';
    if(!text)return;
    if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);
    else{const box=document.createElement('textarea');box.value=text;document.body.appendChild(box);box.select();document.execCommand('copy');box.remove()}
    toast('Credenciais copiadas. Envie individualmente por um canal seguro.');return;
  }
  await teamAccountAction(action.replace('team-',''),memberId,accountId);
 }catch(error){console.error(error);toast(error.message||'Falha ao gerenciar usuários.')}
},true);

(()=>{const style=document.createElement('style');style.textContent=
'.acc-header-tools{display:flex;gap:15px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:16px}'+
'.acc-header-tools p{font-size:12.5px;margin:4px 0 0}'+
'.acc-secret-note{background:#fff0f2;border:1px solid #f1bac4;border-radius:10px;padding:14px;margin-bottom:16px;font-size:13px}'+
'.acc-secret-note b{display:block;margin-bottom:5px}'+
'.acc-credentials{min-width:600px}.acc-credentials code{font-size:13px;font-weight:800;background:#f3f3f3;padding:4px 6px;white-space:nowrap}'+
'.acc-skipped{margin-top:15px;font-size:12.5px;color:var(--muted)}'+
'.acc-warning{padding:12px;border-radius:10px;background:#fff0f1;color:#9d2640;margin-bottom:12px}'+
'.acc-loose-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px;border-bottom:1px solid var(--line)}'+
'.acc-loose-row small{display:block;color:var(--muted)}'+
'@media(max-width:760px){.acc-header-tools .row{width:100%}.acc-header-tools .btn{flex:1}.acc-credentials{min-width:620px}}';
style.textContent+="\n.team-users-panel{padding:0!important;overflow:hidden}\n.team-table-head{padding:20px 20px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\n.team-table-head h2{font-size:17px;margin:0 0 4px;letter-spacing:-.025em}\n.team-table-head small{font-size:12px;color:var(--muted)}\n.team-table-filters{display:flex;align-items:center;flex-wrap:wrap;gap:9px}\n.team-search{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:9px;padding:0 10px;background:var(--surface)}\n.team-search svg{color:var(--muted);flex:none}.team-search input{border:0;background:transparent;font-size:12px;width:200px;height:37px;outline:0;min-width:0}\n.team-search:focus-within{border-color:#d8395d;box-shadow:0 0 0 3px rgba(216,57,93,.09)}\n.team-table-filters select{height:39px;border:1px solid var(--line);border-radius:9px;background:var(--surface);padding:0 10px;font-size:12px}\n.team-users{width:100%;min-width:960px;table-layout:fixed;border-collapse:collapse}\n.team-users th{background:var(--surface-2);padding:12px 13px;font-size:10px;letter-spacing:.075em}\n.team-users th:nth-child(1){width:21%}.team-users th:nth-child(2){width:22%}.team-users th:nth-child(3){width:13%}\n.team-users th:nth-child(4){width:12%}.team-users th:nth-child(5){width:12%}.team-users th:nth-child(6){width:20%;text-align:center}\n.team-users td{padding:13px;border-bottom:1px solid var(--line);vertical-align:middle;font-size:12px}\n.team-users tbody tr:last-child td{border-bottom:none}.team-users tbody tr:hover{background:rgba(232,57,85,.03)}\n.team-users tbody tr[hidden]{display:none}\n.team-person{display:flex;align-items:center;gap:10px;min-width:0}.team-person>.av,.team-person>img{flex:none}\n.team-person span{min-width:0}.team-person b,.team-identity b{display:block;font-size:12.5px;color:var(--ink)}\n.team-person small,.team-identity small{display:block;font-size:11px;line-height:1.5;color:var(--muted);overflow-wrap:anywhere}\n.team-placeholder{color:var(--muted);font-size:11px;background:var(--surface-2);border-radius:100px;padding:5px 9px}\n.team-role{font-size:12px!important;width:100%;min-width:0!important;padding:8px!important;border-radius:9px}\n.team-state{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;font-size:11px;font-weight:800;border-radius:100px;white-space:nowrap}\n.team-state i{width:6px;height:6px;background:currentColor;border-radius:100%}\n.team-state.is-on{color:#187b51;background:#e8f6ee}.team-state.is-off{color:#bd3a52;background:#fff0f2}.team-state.is-missing{color:#777;background:#f0eff0}\n.team-pending{display:block;font-size:10px;color:var(--muted);margin-top:5px}\n.team-last span{color:var(--muted);font-size:11px}.team-last b{font-size:11.5px}\n.team-actions{display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap}\n.team-icon{width:32px;height:32px;min-width:32px;border-radius:9px;border:1px solid transparent;background:transparent;color:#777;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;transition:background .15s,color .15s}\n.team-icon:hover{background:#f9e9ee;color:#bd2b4d;border-color:#eedbe0}.team-icon:focus-visible{outline:2px solid #d83a5a;outline-offset:2px}\n.team-icon-primary{background:#fbe4ec;color:#d92e53}.team-icon-primary:hover{background:#f8d4df}\n.team-icon-danger:hover{color:#b02d49}.team-icon-success:hover{color:#19784e;background:#ebf7ef}\n.team-no-results{text-align:center;color:var(--muted);padding:28px;font-size:13px}\n.team-reload{display:inline-flex;align-items:center;gap:7px}.team-reload svg{width:15px;height:15px}\n@media(max-width:740px){.team-table-head{padding:14px}.team-table-filters{width:100%}.team-search{flex:1}.team-search input{width:100%}}\n@media(prefers-reduced-motion:reduce){.team-icon{transition:none}}\n";
 document.head.appendChild(style)})();
