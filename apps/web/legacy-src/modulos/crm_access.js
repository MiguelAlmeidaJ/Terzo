/* ================= Acesso e Gerenciamento de usuários =================
   Identidade: a conta claude.ai de cada integrante (validada no servidor da Anthropic).
   O Terzo NÃO guarda senhas. O vínculo conta ↔ cadastro da Equipe (members.accountId) é a chave de tudo
   (carteira, tarefas, calendários, Academy). Regras desta camada:
   - Conta sem vínculo não entra: vê a tela "Aguardando liberação" e deixa um pedido em access_req.
     Exceção: quem edita o Terzo (dono) pode se vincular para não ficar trancado fora.
   - Vínculo automático continua só por e-mail cadastrado pelo administrador (autoLink original).
   - Cadastro desativado (members.disabled) não entra; a trava reage na hora, sem recarregar.
   - "Trocar"/"Sou fulano"/"Não estou na lista" saem para quem não é administrador (brecha fechada).
   - "Visualizar como" (só administrador): usa o perfil do integrante, somente leitura, registrado em access_log.
   - Último acesso: members.lastSeen, gravado pela própria pessoa no máximo a cada 30 min. */
COLS.push('access_req','access_log');S.access_req=[];S.access_log=[];
const ACC_FREE=['access_req','access_log'];
const accEditor=()=>!!(me.isOwner||me.canEdit);
const accProfile=m=>!m?'':m.admin?'admin':m.leader===true?'lider':'designer';
const ACC_PL={admin:'Administrador',lider:'Líder',designer:'Designer'};
async function accLog(action,target,note){if(mode!=='db')return;const r=realMember();
 try{await put0('access_log',uid(),{at:new Date().toISOString(),by:r?.id||'',byAcc:me.id||'',action,target:target||'',note:note||''})}catch(e){}}
const ACC_ACT={'view-as':'Começou a visualizar como','view-as-end':'Voltou para a própria conta',link:'Vinculou conta a','unlink':'Desvinculou a conta de',disable:'Desativou o acesso de',enable:'Reativou o acesso de',profile:'Alterou o perfil de',create:'Cadastrou','req-ignore':'Recusou o pedido de acesso de'};

/* ---------- trava de entrada ---------- */
function accGateKind(){if(mode!=='db'||!me.id||!S.members.length)return'';const r=realMember();
 if(r&&r.disabled&&!accEditor())return'off';if(!r&&!accEditor())return'pend';return''}
let accReqSent=false;
function accGateHtml(k){const logo=document.querySelector('.brand img')?.src||'';
 const t=k==='off'?['Acesso desativado','O acesso desta conta ao Terzo foi desativado pelo administrador. Seus registros continuam guardados. Se isso for um engano, fale com o administrador da agência.']
  :['Aguardando liberação',`Sua conta${me.name?' (<b>'+esc(me.name)+'</b>'+(me.email?' · '+esc(me.email):'')+')':''} ainda não está liberada no Terzo. O administrador recebeu o seu pedido e vai vincular a conta ao seu cadastro na equipe. Depois disso, é só abrir o Terzo de novo.`];
 return `<div class="acc-card" role="main"><h1 class="acc-sr">Terzo · Agência Terceiro Andar</h1>${logo?`<img class="acc-logo" src="${logo}" alt="Terzo · Agência Terceiro Andar">`:''}
  <p class="acc-kicker">Bem-vindo à Agência Terceiro Andar</p><h2>${t[0]}</h2><p>${t[1]}</p>
  <p class="acc-small">O acesso usa a sua conta pessoal${me.email?' ('+esc(me.email)+')':''}. Para sair, encerre a sessão na sua conta.</p></div>`}
function accGate(){let g=document.getElementById('acc-gate');const k=accGateKind();
 document.body.classList.toggle('acc-locked',!!k);
 if(!k){if(g)g.remove();return false}
 if(!g){g=document.createElement('div');g.id='acc-gate';document.body.appendChild(g)}
 g.innerHTML=accGateHtml(k);$('#mwrap').hidden=true;$('#main').innerHTML='';$('#nav').innerHTML='';$('#mobnav').innerHTML='';
 if(k==='pend'&&!accReqSent){accReqSent=true;const o=(S.access_req||[]).find(x=>x.id===me.id);
  put0('access_req',me.id,{name:me.name||'',email:me.email||'',at:o?.at||new Date().toISOString(),lastAt:new Date().toISOString()}).catch(()=>{})}
 return true}

/* ---------- visualizar como (somente leitura) ---------- */
function accBanner(){let b=document.getElementById('acc-viewas');const v=ui.viewAs&&byId('members',ui.viewAs);
 document.body.classList.toggle('acc-va',!!v);
 if(!v){if(b)b.remove();return}
 if(!b){b=document.createElement('div');b.id='acc-viewas';b.setAttribute('role','status');document.body.appendChild(b)}
 b.innerHTML=`<span>👁 Visualizando como <b>${esc(v.name)}</b> · ${ACC_PL[accProfile(v)]} · somente leitura</span><button class="btn sm" data-act="acc-va-end">Voltar para a minha conta</button>`}
async function accViewAs(id){const r=realMember();if(!(accEditor()||r?.admin)){toast('Só administradores podem visualizar como outro integrante.');return}
 const m=byId('members',id);if(!m||m.id===r?.id)return;
 await accLog('view-as',m.id);ui.viewAs=m.id;mineApplied=false;hadView=false;ui.view='meudia';closeModal();refresh();toast('Visualizando como '+m.name+'. Nada pode ser alterado neste modo.')}
async function accViewEnd(){const v=ui.viewAs;if(!v)return;ui.viewAs='';mineApplied=false;hadView=true;Object.assign(ui,{pMember:'all',crMember:'all',agMine:false,prMine:false});await accLog('view-as-end',v);ui.view='equipe';ui.eqTab='usuarios';refresh();toast('De volta à sua conta')}

/* ---------- último acesso ---------- */
let accSeenAt=0;
function accSeen(){const r=realMember();if(!r||ui.viewAs||mode!=='db')return;const now=Date.now();if(now-accSeenAt<60000)return;
 const last=r.lastSeen?Date.parse(r.lastSeen):0;if(now-last<30*60000){accSeenAt=now;return}
 accSeenAt=now;put0('members',r.id,{...r,lastSeen:new Date(now).toISOString()}).catch(()=>{})}

function accAfter(){if(accGate())return;accBanner();accSeen();
 if(!accEditor()&&!ui.viewAs)document.querySelectorAll('[data-act="unlink-me"],[data-act="link-open"]').forEach(x=>x.remove())}

/* vínculo manual só para quem edita o Terzo (evita ficar trancado fora); os demais são vinculados pelo administrador */
function linkBanner(){if(mode!=='db'||!me.id||myMember()||linkLater||!S.members.length||!accEditor())return'';
 const all=S.members.slice().sort((a,b)=>(!!a.accountId-!!b.accountId)||(!!b.admin-!!a.admin)||a.name.localeCompare(b.name,'pt'));
 return `<section class="linkbox" id="linkbox"><h2>Vincule a sua conta de administrador</h2><p>Escolha o seu cadastro na equipe (${all.length} integrantes). Quem já tem conta ligada aparece marcado; os outros integrantes são liberados por você em Equipe › Gerenciamento de usuários.</p>
  <div class="row">${all.map(m=>m.accountId?`<button class="btn" disabled aria-disabled="true" title="Já vinculado a outra conta" style="opacity:.5">${esc(m.name)} · já vinculado</button>`:`<button class="btn" data-act="link-me" data-id="${m.id}">Sou ${esc(m.name)}${m.admin?' <small style="opacity:.7">· Administrador</small>':''}</button>`).join('')}<button class="btn ghost" data-act="link-later">Agora não</button></div></section>`}

/* ---------- Equipe › Gerenciamento de usuários ---------- */
function vEquipe(){const adm=isAdmin();let tab=ui.eqTab||'pessoas';if(!adm&&['servicos','objetivos','usuarios'].includes(tab))tab='pessoas';
 const body={pessoas:pessoasBody,usuarios:accUsersBody,fluxo:()=>`<section class="panel"><h2>Fluxo padrão de produção <span class="sub">${flow().length} etapas · toque numa etapa para ver o que fazer</span></h2>${flowStrip(S.projects.filter(p=>!projDone(p)))}</section><p style="margin:0;font-size:13px;color:var(--muted)">Cada projeto criado no fluxo vira uma sequência de tarefas, uma por etapa, com o responsável abaixo. O andamento fica em Produção › Fluxo.</p>${adm?'<div class="row"><button class="btn primary" data-act="pr-edit">Editar fluxo</button></div>':''}`,servicos:servicosBody,objetivos:objetivosBody}[tab];
 const pend=accPendingReqs().length;
 return `<div class="head"><div><h1>${tab==='usuarios'?'Gerenciamento de usuários':'Equipe'}</h1><p>${tab==='usuarios'?'Quem acessa o Terzo, com qual perfil, e quando entrou pela última vez.':`${S.members.length} integrante${S.members.length===1?'':'s'} · pessoas, fluxo de produção${adm?', serviços e objetivos':''}.`}</p></div>${adm&&(tab==='pessoas'||tab==='usuarios')?'<button class="btn primary" data-act="new-member">+ Cadastrar integrante</button>':''}</div>
 ${subTabs('eq-tab',tab,[['pessoas','Pessoas'],adm&&['usuarios','Gerenciamento de usuários',pend],['fluxo','Fluxo'],adm&&['servicos','Serviços'],adm&&['objetivos','Objetivos']])}
 ${body()}`}
function accPendingReqs(){const linked=new Set(S.members.map(m=>m.accountId).filter(Boolean));return (S.access_req||[]).filter(r=>!linked.has(r.id)&&!r.ignored).sort((a,b)=>String(b.lastAt||b.at).localeCompare(String(a.lastAt||a.at)))}
function accUsersBody(){const M=S.members.slice().sort((a,b)=>(!!a.disabled-!!b.disabled)||a.name.localeCompare(b.name,'pt'));const R=accPendingReqs();
 const act=M.filter(m=>m.accountId&&!m.disabled).length,off=M.filter(m=>m.disabled).length,nolink=M.filter(m=>!m.accountId&&!m.disabled).length;
 const seen=m=>m.lastSeen?`${fD(m.lastSeen.slice(0,10))} · ${esc(ago(m.lastSeen))}`:'<span class="mut">Nunca entrou</span>';
 const log=(S.access_log||[]).slice().sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,25);
 const nm=id=>byId('members',id)?.name||(S.access_req||[]).find(r=>r.id===id)?.name||'—';
 return `<div class="kpis acc-k"><div class="kpi"><div class="l">Com acesso ativo</div><div class="v">${act}</div></div><div class="kpi"><div class="l">Sem conta vinculada</div><div class="v">${nolink}</div><div class="s">cadastre o e-mail para o 1º acesso</div></div><div class="kpi"><div class="l">Desativados</div><div class="v">${off}</div></div><div class="kpi"><div class="l">Pedidos de acesso</div><div class="v" ${R.length?'style="color:var(--crit)"':''}>${R.length}</div></div></div>
 ${R.length?`<section class="panel"><h2>Pedidos de acesso <span class="sub">contas que abriram o Terzo e ainda não estão vinculadas</span></h2><div class="acc-reqs">${R.map(r=>`<div class="acc-req"><div><b>${esc(r.name||'Sem nome')}</b><small>${esc(r.email||'e-mail não informado')} · pediu ${esc(ago(r.lastAt||r.at))}</small></div>
   <div class="row"><select class="sel" id="acc-to-${esc(r.id)}" aria-label="Vincular a qual integrante"><option value="">Vincular a…</option>${M.filter(m=>!m.accountId).map(m=>`<option value="${m.id}">${esc(m.name)}${m.disabled?' (desativado)':''}</option>`).join('')}</select>
   <button class="btn sm primary" data-act="acc-link" data-id="${esc(r.id)}">Vincular</button><button class="btn sm" data-act="acc-new" data-id="${esc(r.id)}">Cadastrar como novo</button><button class="btn sm ghost" data-act="acc-ignore" data-id="${esc(r.id)}">Recusar</button></div></div>`).join('')}</div></section>`:''}
 <section class="panel"><h2>Integrantes e acessos</h2><div class="acc-tw"><table class="acc-t"><thead><tr><th>Integrante</th><th>Conta de acesso</th><th>Perfil</th><th>Status</th><th>Último acesso</th><th><span class="acc-sr">Ações</span></th></tr></thead><tbody>
 ${M.map(m=>{const p=accProfile(m);const self=m.id===realMember()?.id;return `<tr class="${m.disabled?'off':''}"><td><span class="row" style="gap:8px;flex-wrap:nowrap">${av(m.id)}<span><b>${esc(m.name)}</b><small>${esc(m.area||'')}${m.email?' · '+esc(m.email):''}</small></span></span></td>
  <td>${m.accountId?`<span class="pill p-ok">✓ ${esc(NAMES[m.accountId]||'Vinculada')}</span>`:m.email?'<span class="pill p-alto">Aguardando 1º acesso</span>':'<span class="pill">Sem conta</span>'}</td>
  <td><select class="sel" data-acc-prof="${m.id}" aria-label="Perfil de ${esc(m.name)}" ${self?'disabled title="Você não pode alterar o próprio perfil"':''}>${Object.entries(ACC_PL).map(([k,l])=>`<option value="${k}" ${p===k?'selected':''}>${l}</option>`).join('')}</select></td>
  <td>${m.disabled?'<span class="pill p-critico">Desativado</span>':'<span class="pill p-ok">Ativo</span>'}</td><td>${seen(m)}</td>
  <td><span class="row acc-acts">${self?'<span class="mut">Você</span>':`${m.disabled?`<button class="btn sm" data-act="acc-on" data-id="${m.id}">Reativar</button>`:`<button class="btn sm" data-act="acc-off" data-id="${m.id}">Desativar</button>`}${m.accountId?`<button class="btn sm ghost" data-act="acc-unlink" data-id="${m.id}">Desvincular conta</button>`:''}${!m.disabled?`<button class="btn sm ghost" data-act="acc-va" data-id="${m.id}">Visualizar como</button>`:''}`}</span></td></tr>`}).join('')}
 </tbody></table></div></section>
 <section class="panel acc-how"><h2>Como funciona o acesso</h2><ol><li><b>Primeiro acesso:</b> cadastre o integrante com o e-mail da conta que ele usa. Quando ele abrir o Terzo com essa conta, o vínculo é feito sozinho. Sem e-mail, o pedido aparece aqui em cima para você vincular.</li><li><b>Perfil:</b> Administrador vê e gerencia tudo; Líder acompanha a equipe, cria tarefas e aprova; Designer vê só o que é seu.</li><li><b>Desativar</b> bloqueia a entrada na hora e mantém todo o histórico. Para cortar também o acesso ao link, remova a pessoa no menu Compartilhar do Terzo.</li><li><b>Senha:</b> o Terzo não guarda senhas. Cada pessoa entra com a própria conta; o login com senha próprio fica para o servidor do time de dev.</li></ol></section>
 <section class="panel"><h2>Registro de acessos e alterações <span class="sub">últimas ${log.length}</span></h2>${log.length?`<ul class="acc-log">${log.map(l=>`<li><span>${cfDT(l.at)}</span><span><b>${esc(nm(l.by))}</b> ${esc(ACC_ACT[l.action]||l.action)} <b>${esc(nm(l.target))}</b>${l.note?' · '+esc(l.note):''}</span></li>`).join('')}</ul>`:'<p class="mut">Nada registrado ainda.</p>'}</section>`}

async function accSetProfile(id,p){const m=byId('members',id);const r=realMember();if(!m)return;if(!isAdmin()){toast('Só administradores alteram perfis.');return}
 if(m.id===r?.id){toast('Você não pode alterar o próprio perfil.');refresh();return}
 if(m.admin&&p!=='admin'&&S.members.filter(x=>x.admin&&!x.disabled).length<=1){toast('É preciso manter pelo menos um administrador ativo.');refresh();return}
 const from=ACC_PL[accProfile(m)];await put('members',id,{...m,admin:p==='admin',leader:p==='lider'});await accLog('profile',id,from+' → '+ACC_PL[p]);toast(m.name+' agora é '+ACC_PL[p])}
async function accToggle(id,on){const m=byId('members',id);if(!m||!isAdmin())return;if(m.id===realMember()?.id){toast('Você não pode desativar a própria conta.');return}
 if(!on&&m.admin&&S.members.filter(x=>x.admin&&!x.disabled).length<=1){toast('É preciso manter pelo menos um administrador ativo.');return}
 await put('members',id,{...m,disabled:!on,disabledAt:on?'':new Date().toISOString()});await accLog(on?'enable':'disable',id);toast(on?m.name+' reativado(a)':m.name+' desativado(a). O acesso foi bloqueado.')}

document.addEventListener('change',async e=>{const s=e.target.closest('[data-acc-prof]');if(!s)return;try{await accSetProfile(s.dataset.accProf,s.value)}catch(x){refresh()}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');
 /* trancado: só a tela de acesso responde */
 if(document.body.classList.contains('acc-locked')){if(!e.target.closest('#acc-gate')){e.stopImmediatePropagation();e.preventDefault()}return}
 if(!b)return;const a=b.dataset.act,id=b.dataset.id;const stop=()=>{e.stopPropagation();e.stopImmediatePropagation();e.preventDefault()};
 if(['link-me','link-new','unlink-me'].includes(a)&&!accEditor()){stop();toast('O vínculo de contas é feito pelo administrador em Equipe › Gerenciamento de usuários.');return}
 if(a==='acc-va-end'){stop();await accViewEnd();return}
 if(!a.startsWith('acc-'))return;stop();if(!isAdmin()){toast('Só administradores gerenciam usuários.');return}
 try{switch(a){
  case'acc-off':{const m=byId('members',id);if(!b.classList.contains('armed')){b.classList.add('armed');b.textContent='Confirmar desativação';setTimeout(()=>{if(b.isConnected){b.classList.remove('armed');b.textContent='Desativar'}},4000);return}
   await accToggle(id,false);break}
  case'acc-on':await accToggle(id,true);break;
  case'acc-unlink':{const m=byId('members',id);if(!m)return;if(m.id===realMember()?.id){toast('Você não pode desvincular a própria conta por aqui.');return}
   if(!b.classList.contains('armed')){b.classList.add('armed');b.textContent='Confirmar';setTimeout(()=>{if(b.isConnected){b.classList.remove('armed');b.textContent='Desvincular conta'}},4000);return}
   await put('members',id,{...m,accountId:''});await accLog('unlink',id);toast('Conta desvinculada de '+m.name+'. O cadastro e o histórico continuam.');break}
  case'acc-va':await accViewAs(id);break;
  case'acc-link':{const r=(S.access_req||[]).find(x=>x.id===id);const to=$('#acc-to-'+CSS.escape(id))?.value;if(!r)return;if(!to){toast('Escolha o integrante para vincular.');return}
   const m=byId('members',to);if(!m)return;if(m.accountId){toast('Esse cadastro já tem uma conta vinculada.');return}if(S.members.some(x=>x.accountId===id)){toast('Essa conta já está vinculada.');return}
   await put('members',to,{...m,accountId:id,email:m.email||r.email||''});await accLog('link',to,r.name||r.email||'');toast((r.name||'Conta')+' vinculada a '+m.name);break}
  case'acc-new':{const r=(S.access_req||[]).find(x=>x.id===id);if(!r)return;if(S.members.some(x=>x.accountId===id)){toast('Essa conta já está vinculada.');return}
   const dup=S.members.find(m=>!m.accountId&&r.name&&m.name.trim().toLowerCase()===r.name.trim().toLowerCase());if(dup){toast('Já existe um cadastro com esse nome ('+dup.name+'). Use "Vincular a…" para não duplicar.');return}
   const nid=uid();await put('members',nid,{name:r.name||r.email||'Novo integrante',email:r.email||'',area:'Design',accountId:id,createdAt:today()});await accLog('create',nid,'a partir de pedido de acesso');toast('Integrante cadastrado e vinculado. Revise área e perfil.');break}
  case'acc-ignore':{const r=(S.access_req||[]).find(x=>x.id===id);if(!r)return;await put0('access_req',id,{...r,ignored:true});await accLog('req-ignore',id);toast('Pedido recusado');break}
 }}catch(err){console.error(err);toast('Não foi possível concluir.')}},true);

(()=>{const st=document.createElement('style');st.textContent=`
#acc-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:24px 16px;background:radial-gradient(1200px 600px at 20% 0%,#2a2a2a 0%,#111 60%);color:#fff;overflow:auto}
.acc-card{width:min(440px,100%);background:#fff;color:#141414;border-radius:20px;padding:36px 32px;box-shadow:0 30px 80px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:10px}
.acc-logo{height:46px;width:auto;align-self:flex-start;margin-bottom:10px}
.acc-kicker{margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#777;font-weight:700}
.acc-card h2{margin:0;font-size:26px;letter-spacing:-.01em}.acc-card p{margin:0;font-size:15px;line-height:1.5;color:#333}.acc-card .acc-small{font-size:13px;color:#777;margin-top:8px}
.acc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
body.acc-locked #chatw,body.acc-locked .chat-fab{display:none!important}
#acc-viewas{position:fixed;left:50%;transform:translateX(-50%);top:10px;z-index:9000;display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 32px);padding:8px 10px 8px 16px;border-radius:12px;background:#141414;color:#fff;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
#acc-viewas .btn{background:#ffd23f;color:#141414;border-color:#ffd23f}
body.acc-va #main{padding-top:56px}
.acc-k{grid-template-columns:repeat(4,1fr)}
.acc-reqs{display:flex;flex-direction:column;gap:10px}.acc-req{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;padding:12px;border:1px solid var(--line);border-radius:12px}
.acc-req small{display:block;color:var(--muted);font-size:12.5px}
.acc-tw{overflow-x:auto}.acc-t{width:100%;border-collapse:collapse;font-size:14px;min-width:820px}
.acc-t th{text-align:left;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:8px;border-bottom:1px solid var(--line)}
.acc-t td{padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:middle}.acc-t td small{display:block;color:var(--muted);font-size:12px}
.acc-t tr.off td{opacity:.6}.acc-t .sel{min-width:140px}.acc-acts{gap:6px;flex-wrap:wrap}.acc-acts .armed{background:var(--crit);color:#fff;border-color:var(--crit)}
.acc-how ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:14px;line-height:1.5}
.acc-log{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:13.5px}.acc-log li{display:flex;gap:12px}.acc-log li>span:first-child{color:var(--muted);min-width:150px}
.mut{color:var(--muted)}
@media (max-width:760px){.acc-k{grid-template-columns:repeat(2,1fr)}.acc-card{padding:28px 22px}}
`;(document.body||document.head).appendChild(st)})();
