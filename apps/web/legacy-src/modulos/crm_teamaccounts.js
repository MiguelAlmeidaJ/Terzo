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
  return '<tr class="'+(m.disabled?'off':'')+'">'+
   '<td><span class="row" style="gap:8px;flex-wrap:nowrap">'+av(m.id)+'<span><b>'+esc(m.name)+'</b><small>'+esc(m.area||'')+(m.role?' · '+esc(m.role):'')+'</small></span></span></td>'+
   '<td>'+(u?'<b>'+esc(u.username)+'</b><small>'+esc(u.email)+'</small>':m.accountId?'<span class="pill p-critico">Vínculo sem conta</span>':'<span class="pill">Sem login</span>')+'</td>'+
   '<td><select class="sel" data-acc-prof="'+esc(m.id)+'" aria-label="Perfil de '+esc(m.name)+'" '+(self?'disabled title="Não altere seu próprio perfil"':'')+'>'+
    Object.entries(ACC_PL).map(([k,label])=>'<option value="'+k+'" '+(k===p?'selected':'')+'>'+label+'</option>').join('')+'</select></td>'+
   '<td><span class="pill '+(u?.status==='active'&&!m.disabled?'p-ok':u||m.disabled?'p-critico':'')+'">'+esc(teamStatus(u,m))+'</span>'+(u?.must_change?'<small>Troca de senha pendente</small>':'')+'</td>'+
   '<td>'+esc(u?.last_login?new Date(u.last_login).toLocaleDateString('pt-BR'):lastAccess(m))+'</td>'+
   '<td><span class="row acc-acts">'+(u?
     '<button class="btn sm" data-act="team-edit" data-mid="'+esc(m.id)+'" data-uid="'+esc(u.id)+'">Editar login</button>'+
     (self?'': '<button class="btn sm" data-act="team-reset" data-mid="'+esc(m.id)+'" data-uid="'+esc(u.id)+'">Nova senha</button>'+
       '<button class="btn sm ghost" data-act="team-revoke" data-mid="'+esc(m.id)+'" data-uid="'+esc(u.id)+'">Revogar sessões</button>'+
       '<button class="btn sm" data-act="team-'+(u.status==='active'?'off':'on')+'" data-mid="'+esc(m.id)+'" data-uid="'+esc(u.id)+'">'+(u.status==='active'?'Desativar':'Reativar')+'</button>'+
       '<button class="btn sm ghost" data-act="team-unlink" data-mid="'+esc(m.id)+'" data-uid="'+esc(u.id)+'">Desvincular</button>'):
     !m.accountId&&!m.disabled?'<button class="btn sm primary" data-act="team-provision-one" data-mid="'+esc(m.id)+'">Criar acesso</button>':'')+
     (!m.disabled&&!self?'<button class="btn sm ghost" data-act="acc-va" data-id="'+esc(m.id)+'">Visualizar como</button>':'')+
    '</span></td></tr>';
 }).join('');
 const loose=users.filter(u=>!people.some(m=>m.accountId===u.id||m.id===u.member_id));
 const requests=pending.length?'<section class="panel"><h2>Pedidos de acesso <span class="sub">'+pending.length+'</span></h2><div class="acc-reqs">'+pending.map(r=>
  '<div class="acc-req"><div><b>'+esc(r.name||'Sem nome')+'</b><small>'+esc(r.email||'')+'</small></div>'+
  '<div class="row"><select class="sel" id="acc-to-'+esc(r.id)+'"><option value="">Vincular a…</option>'+people.filter(m=>!m.accountId).map(m=>'<option value="'+esc(m.id)+'">'+esc(m.name)+'</option>').join('')+'</select>'+
  '<button class="btn sm" data-act="acc-link" data-id="'+esc(r.id)+'">Vincular</button><button class="btn sm ghost" data-act="acc-ignore" data-id="'+esc(r.id)+'">Recusar</button></div></div>').join('')+'</div></section>':'';
 const log=(S.access_log||[]).slice().sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,25);
 return '<div class="acc-header-tools"><div><b>Contas e permissões da equipe</b><p class="mut">Crie, edite e redefina logins aqui, sem sair do Terzo. Novas pessoas recebem acesso automaticamente ao serem cadastradas.</p></div>'+
   '<div class="row">'+(free.length?'<button class="btn primary" data-act="team-provision-all">Criar acessos pendentes ('+free.length+')</button>':'')+
   '<button class="btn" data-act="team-reload">Atualizar logins</button></div></div>'+
  (teamAccountState.error?'<div class="acc-warning">'+esc(teamAccountState.error)+'</div>':'')+
  '<div class="kpis acc-k"><div class="kpi"><div class="l">Com acesso ativo</div><div class="v">'+countActive+'</div></div>'+
  '<div class="kpi"><div class="l">Sem conta vinculada</div><div class="v">'+free.length+'</div><div class="s">Criação automática disponível</div></div>'+
  '<div class="kpi"><div class="l">Desativados</div><div class="v">'+disabled+'</div></div>'+
  '<div class="kpi"><div class="l">Pedidos de acesso</div><div class="v">'+pending.length+'</div></div></div>'+
  requests+'<section class="panel"><h2>Integrantes e acessos</h2><div class="acc-tw"><table class="acc-t"><thead><tr>'+
  '<th>Integrante</th><th>Usuário / e-mail</th><th>Perfil</th><th>Status</th><th>Último login</th><th>Ações</th>'+
  '</tr></thead><tbody>'+rows+'</tbody></table></div></section>'+
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
 document.head.appendChild(style)})();
