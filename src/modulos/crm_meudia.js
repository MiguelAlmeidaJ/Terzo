/* ================= Meu Dia (página inicial) =================
   Visão dos registros reais: tarefas (todos), compromissos (meetings), clientes, calendários, aprovações e ranking.
   O Painel sai do menu; reuniões, saúde das contas, aguardando cliente e funil passam para o Meu Dia (visão da liderança). */
{const i=VIEWS.findIndex(v=>v[0]==='painel');if(i>=0)VIEWS.splice(i,1);VIEW_ALIAS.painel=['meudia','',''];if(ui.view==='painel')ui.view='meudia'}
{const v=VIEWS.find(x=>x[0]==='meudia');if(v){v[1]='Meu Dia';v[2]='Meu Dia'}}
Object.assign(ui,{mdQ:'',mdF:'all'});

/* ---------- status "Aguardando retorno do cliente" no fluxo padrão (usa o status existente "Aguardando cliente") ---------- */
if(!TK_FLOW.some(x=>x[0]==='cliente'))TK_FLOW.splice(TK_FLOW.findIndex(x=>x[0]==='ajustes'),0,['cliente','Aguardando retorno do cliente']);TK_FL.cliente='Aguardando retorno do cliente';
function tkFk(t){const s=tkS(t);if(s==='Concluída')return'entregue';if(s==='Aguardando aprovação'||s==='Aprovado')return'aprovacao';if(s==='Aguardando cliente')return'cliente';if(s==='Em ajustes')return'ajustes';if(s==='Aberto')return'nao';return'execucao'}
{const i=TK_PRIOS.indexOf('Urgente');if(i>=0)TK_PRIOS.splice(i,1)}

(()=>{const st=document.createElement('style');st.textContent=`
.tk-s.cliente i{background:#8A6D3B}.tk-s.cliente{color:#6B5426}
.md-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}
.md-head h1{font-size:clamp(24px,3vw,30px)}.md-head p{margin:4px 0 0;color:var(--muted)}
.md-search{position:relative}
.md-search input{width:100%;font-size:16px;padding:15px 18px 15px 48px;border-radius:14px;border:1px solid var(--line);background:var(--surface);box-shadow:0 1px 2px rgba(12,12,12,.04),0 8px 24px rgba(12,12,12,.05)}
.md-search input:focus{outline:2px solid var(--ink);outline-offset:0}
.md-search>svg{position:absolute;left:17px;top:50%;transform:translateY(-50%);width:20px;height:20px;color:var(--muted);pointer-events:none}
.md-res{position:absolute;left:0;right:0;top:calc(100% + 6px);background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:0 16px 40px rgba(12,12,12,.12);z-index:20;overflow:hidden;max-height:420px;overflow-y:auto}
.md-res button{display:grid;grid-template-columns:40px 1fr auto;gap:12px;align-items:center;width:100%;border:0;border-top:1px solid var(--line);background:none;padding:10px 14px;text-align:left;color:inherit}
.md-res button:first-child{border-top:0}.md-res button:hover,.md-res button:focus-visible{background:var(--bg)}
.md-res b{display:block;font-size:14.5px}.md-res small{display:block;color:var(--muted);font-size:12.5px}.md-res .go{font-size:12.5px;color:var(--muted);white-space:nowrap}
.md-kpis{display:flex;gap:8px;flex-wrap:wrap}
.md-k{display:flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:6px 14px 6px 8px;font-size:13.5px;color:var(--muted);cursor:pointer}
.md-k b{min-width:26px;height:26px;border-radius:999px;background:var(--surface-2);color:var(--ink);display:grid;place-items:center;font-family:var(--f-mono);font-size:13px;padding:0 6px}
.md-k[aria-pressed="true"]{border-color:var(--ink);color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.md-k.hot b{background:var(--crit);color:#fff}.md-k.warn b{background:#F5C518;color:#0C0C0C}
.md-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:16px;align-items:start}
.md-col{display:flex;flex-direction:column;gap:16px;min-width:0}
.md-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:12px;min-width:0}
.md-card>header{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.md-card h2{font-size:17px}.md-card>header small{color:var(--muted);font-size:13px}
.md-g{font-size:11.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:8px;margin-top:4px}
.md-g .n{font-family:var(--f-mono);font-weight:600}
.md-g.urg{color:var(--crit)}
.md-t{display:grid;grid-template-columns:4px 1fr auto;gap:12px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px 12px 10px 0;background:var(--surface);text-align:left;color:inherit;width:100%;overflow:hidden}
.md-t:hover{border-color:var(--muted)}
.md-t>i{align-self:stretch;background:var(--line);border-radius:0 3px 3px 0}
.md-t.urg>i{background:var(--crit)}.md-t.late>i{background:var(--high)}.md-t.cli>i{background:#8A6D3B}
.md-t .t{font-weight:600;font-size:14.5px;overflow-wrap:anywhere}
.md-t .m{display:flex;flex-wrap:wrap;gap:3px 10px;font-size:12.5px;color:var(--muted);margin-top:3px}
.md-t .r{display:flex;flex-direction:column;align-items:flex-end;gap:4px;font-size:12.5px;text-align:right}
.md-t .due{font-weight:700;color:var(--ink)}.md-t .due.late{color:var(--crit)}
.md-urg{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:700;color:var(--crit);text-transform:uppercase;letter-spacing:.04em}
.md-wait{font-size:12.5px;color:#6B5426;background:#F7F1E6;border-radius:8px;padding:4px 8px;margin-top:6px;display:inline-block}
.md-empty{border:1px dashed var(--line);border-radius:12px;padding:16px;text-align:center;color:var(--muted);font-size:14px}.md-empty b{display:block;color:var(--ink);margin-bottom:2px}
.md-ag{display:flex;flex-direction:column}
.md-m{display:grid;grid-template-columns:62px 1fr;gap:12px;padding:11px 0;border-top:1px solid var(--line);text-align:left;background:none;border-left:0;border-right:0;border-bottom:0;color:inherit;width:100%}
.md-m:first-child{border-top:0}
.md-m time{font-family:var(--f-mono);font-size:13px;font-weight:600;line-height:1.3}.md-m time small{display:block;color:var(--muted);font-weight:400}
.md-m b{font-size:14.5px}.md-m .m{font-size:12.5px;color:var(--muted);display:flex;flex-wrap:wrap;gap:3px 10px;margin-top:3px}
.md-m .st{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}
.md-m.now{background:#FFF6D1;border-radius:12px;padding:11px 10px;margin:0 -10px;border-top-color:transparent}.md-m.now .st{color:#8A6400}
.md-m.next .st{color:var(--ink)}.md-m.done{opacity:.6}.md-m.cx{opacity:.55}.md-m.cx b{text-decoration:line-through}
.md-m .lnk{font-size:12.5px}
.md-o{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--line);background:none;border-left:0;border-right:0;border-bottom:0;width:100%;text-align:left;color:inherit;font-size:14px}
.md-o:first-child{border-top:0}.md-o small{display:block;color:var(--muted);font-size:12.5px}
.md-cl{display:flex;flex-wrap:wrap;gap:8px}
.md-cl button{display:flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--surface);border-radius:12px;padding:6px 12px 6px 6px;font-size:13.5px;font-weight:600;color:inherit;max-width:100%}
.md-cl button:hover{border-color:var(--muted)}.md-cl button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.md-team{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.md-team button{border:1px solid var(--line);background:var(--surface);border-radius:12px;padding:10px 12px;text-align:left;color:inherit}.md-team button:hover{border-color:var(--muted)}
.md-team span{display:block;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:700}.md-team b{font-family:var(--f-display);font-size:22px}
.md-ops summary{cursor:pointer;font-weight:700;font-size:15px;list-style:none;display:flex;align-items:center;gap:8px}.md-ops summary::-webkit-details-marker{display:none}
.md-ops summary::before{content:"›";font-size:18px;transition:transform .15s}.md-ops[open] summary::before{transform:rotate(90deg)}
.md-ops .grid2{margin-top:12px}
@media (max-width:1000px){.md-grid{grid-template-columns:1fr}.md-team{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.md-t{grid-template-columns:4px 1fr}.md-t .r{grid-column:2;flex-direction:row;align-items:center;justify-content:flex-start;padding-bottom:2px}}
`;(document.body||document.head).appendChild(st)})();

/* ---------- busca de clientes ---------- */
function mdSearch(){const q=calNorm(ui.mdQ.trim());if(!q)return'';
 const hit=s=>calNorm(s).includes(q);
 const cl=S.clients.filter(c=>[c.name,c.legalName,c.segment,c.contact].some(hit));
 const pj=S.projects.filter(p=>hit(p.title)&&p.clientId&&!cl.some(c=>c.id===p.clientId)).map(p=>({c:byId('clients',p.clientId),p})).filter(x=>x.c);
 const rows=[...cl.slice(0,8).map(c=>({c})),...pj.slice(0,4)];
 return `<div class="md-res" role="listbox">${rows.map(({c,p})=>{const d=relDesigner(c);return `<button data-act="st-open" data-id="${c.id}" role="option">${clientLogo(c,40)}<span style="min-width:0"><b>${esc(c.name)}</b><small>${esc([p?'Projeto: '+p.title:'',c.segment,d?'Responsável: '+mName(d):'Sem designer definido'].filter(Boolean).join(' · '))}</small></span><span class="go">Abrir perfil ›</span></button>`}).join('')||`<div class="tk-none">Nenhum cliente encontrado para “${esc(ui.mdQ)}”.</div>`}</div>`}

/* ---------- blocos ---------- */
function mdTaskRow(t,mm){const fk=tkFk(t);const late=taskState(t)==='late'&&fk!=='cliente';const co=tkPeople(t).filter(x=>x!==mm.id);const n=t.due?daysTo(t.due):null;
 const due=t.due?(late?(n<0?'Atrasada '+(-n)+'d':'Venceu hoje'):n===0?'Hoje'+(t.dueTime?' até '+t.dueTime:''):n===1?'Amanhã':fD(t.due)):'Sem prazo';const pr=tkPrioOf(t);
 return `<button class="md-t ${t.urgent?'urg':late?'late':fk==='cliente'?'cli':''}" data-act="task-open" data-id="${t.id}"><i></i><span style="min-width:0"><span class="t">${t.urgent?'<span class="md-urg">⚠ Urgente</span> ':''}${esc(t.title)}</span>
  <span class="m"><span>${esc(t.clientId?cName(t.clientId):'Interno')}</span>${t.svcCat?`<span>${esc(tcName(t.svcCat))}</span>`:''}${co.length?`<span>com ${esc(co.map(first).join(', '))}</span>`:''}${pr!=='Normal'?`<span>Prioridade ${esc(pr.toLowerCase())}</span>`:''}</span>
  ${fk==='cliente'?`<span class="md-wait">Aguardando: ${esc(t.waitingWhat||'retorno do cliente')}${t.waitingSince?' · desde '+fD(t.waitingSince):''}</span>`:''}</span>
  <span class="r"><span class="due ${late?'late':''}">${due}</span><span class="tk-s ${fk}"><i></i>${TK_FL[fk]}</span></span></button>`}
function mdTasks(mm){const mine=S.todos.filter(t=>tkPeople(t).includes(mm.id)&&tkFk(t)!=='entregue');const t0=today();const used=new Set();
 const take=f=>{const L=mine.filter(t=>!used.has(t.id)&&f(t));L.forEach(t=>used.add(t.id));return L.sort((a,b)=>(a.due||'9').localeCompare(b.due||'9'))};
 const G={urg:take(t=>t.urgent&&tkFk(t)!=='cliente'&&tkFk(t)!=='aprovacao'),late:take(t=>taskState(t)==='late'&&!['cliente','aprovacao'].includes(tkFk(t))),hoje:take(t=>t.due===t0&&!['cliente','aprovacao'].includes(tkFk(t))),cli:take(t=>tkFk(t)==='cliente')};
 const rest=mine.filter(t=>!used.has(t.id)).sort((a,b)=>(a.due||'9').localeCompare(b.due||'9'));return{mine,G,rest}}
function mdMeets(mm){const t0=today();return S.meetings.filter(m=>mS(m)&&ymd(mS(m))===t0&&(m.memberIds||[]).includes(mm.id)).sort((a,b)=>mS(a)-mS(b))}
function mdAgenda(L){const now=new Date();const act=L.filter(m=>!mCxl(m));const cur=act.find(m=>mS(m)<=now&&mE(m)>now);const nx=act.find(m=>mS(m)>now);
 return L.length?`<div class="md-ag">${L.map(m=>{const s=mS(m),e=mE(m);const cx=mCxl(m);const done=!cx&&(m.status==='Concluído'||e<=now);const k=cx?'cx':m===cur?'now':m===nx?'next':done?'done':'';
  const lab=cx?'Cancelado':m===cur?'● Em andamento':m===nx?'Próximo':done?'Realizado':(m.status||'Agendado');const mode=m.mode||(m.clientId?'':'Interna');
  return `<button class="md-m ${k}" data-act="ag-open" data-id="${m.id}"><time>${hm(s)}<small>${hm(e)}</small></time><span style="min-width:0"><span class="st">${esc(lab)}${!cx&&!done&&m.status==='Confirmado'?' · confirmado':''}</span><b>${esc(m.title||m.kind||'Compromisso')}</b>
   <span class="m">${m.clientId?`<span>${esc(cName(m.clientId))}</span>`:''}<span>${esc((m.memberIds||[])[0]?mName(m.memberIds[0]):'Sem responsável')}</span>${mode?`<span>${esc(mode)}</span>`:''}${m.place?`<span>${esc(m.place)}</span>`:''}</span>
   ${m.link&&!cx?`<a class="lnk" href="${esc(m.link)}" target="_blank" rel="noopener" data-stop="1">Entrar na reunião ↗</a>`:''}</span></button>`}).join('')}</div>`
 :`<div class="md-empty"><b>Agenda livre hoje</b>Você não possui compromissos agendados para hoje.</div>`}
function mdOthers(mm){const skip=['Tarefa','Reunião','Etapa de projeto','Ajustes na tarefa','Aprovar tarefa'];return todayItems(mm).filter(x=>!skip.includes(x.k))}
function mdTeam(){const all=S.todos.filter(t=>tkFk(t)!=='entregue');const u=all.filter(t=>t.urgent),l=all.filter(t=>taskState(t)==='late'&&!['cliente','aprovacao'].includes(tkFk(t))),c=all.filter(t=>tkFk(t)==='cliente'),a=all.filter(t=>tkS(t)==='Aguardando aprovação');
 const items=[...a.map(t=>({t,k:'Aguardando aprovação'})),...u.map(t=>({t,k:'Urgente'})),...l.filter(t=>!t.urgent).map(t=>({t,k:'Atrasada'})),...c.map(t=>({t,k:'Aguardando cliente'}))];const seen=new Set();const top=items.filter(x=>!seen.has(x.t.id)&&seen.add(x.t.id)).slice(0,8);
 return `<section class="md-card"><header><h2>Equipe hoje</h2><button class="btn sm" data-act="nav" data-v="tarefas">Abrir Tarefas ›</button></header>
  <div class="md-team"><button data-act="md-team" data-v="aprovacao"><span>Para aprovar</span><b>${a.length}</b></button><button data-act="md-team" data-v="urg"><span>Urgentes</span><b>${u.length}</b></button><button data-act="md-team" data-v="late"><span>Atrasadas</span><b>${l.length}</b></button><button data-act="md-team" data-v="cliente"><span>Aguardando cliente</span><b>${c.length}</b></button></div>
  ${top.length?`<div>${top.map(({t,k})=>`<button class="md-o" data-act="task-open" data-id="${t.id}"><span style="min-width:0"><b style="font-weight:600">${k==='Urgente'?'⚠ ':''}${esc(t.title)}</b><small>${esc(tkPeople(t).map(first).join(', ')||'Sem responsável')} · ${esc(t.clientId?cName(t.clientId):'Interno')}</small></span><span class="tk-s ${tkFk(t)}"><i></i>${esc(k)}</span></button>`).join('')}</div>`:'<div class="md-empty"><b>Nada pendente na equipe</b>Sem urgências, atrasos ou aprovações esperando.</div>'}</section>`}
function mdOps(){const active=S.clients.filter(c=>c.stage==='Fechado');const hs=active.map(c=>({c,h:health(c)})).filter(x=>x.h&&x.h.lv!=='ok').sort((a,b)=>a.h.score-b.h.score);const wq=waiting();const pmax=Math.max(1,...PIPE.map(p=>S.clients.filter(c=>c.stage===p).length));
 return `<details class="md-card md-ops"><summary>Visão da operação <small style="color:var(--muted);font-weight:500;font-size:13px">saúde das contas, pendências com clientes e funil</small></summary>
  <div class="grid2"><section><div class="md-g">Contas que pedem atenção <span class="n">${hs.length}/${active.length}</span></div><div class="list">${hs.slice(0,6).map(({c,h})=>`<button class="item" data-act="st-open" data-id="${c.id}"><span class="stripe s-${h.lv==='warn'?'alto':'critico'}"></span><span><span class="t">${esc(c.name)}</span><span class="m">${esc(h.why.join(' · '))}</span></span><span class="r">${healthTag(h)}</span></button>`).join('')||'<div class="md-empty">Todas as contas ativas estão saudáveis.</div>'}</div></section>
  <section><div class="md-g">Aguardando o cliente <span class="n">${wq.length}</span></div><div class="list">${wq.slice(0,5).map(waitRow).join('')||'<div class="md-empty">Nada parado com os clientes.</div>'}</div>
   <div class="md-g" style="margin-top:14px">Funil comercial</div><div class="funnel">${PIPE.map(p=>{const n=S.clients.filter(c=>c.stage===p).length;return `<div class="fbar"><span>${esc(p)}</span><div class="bar ${p==='Fechado'?'ok':p==='Perdido'?'mute':''}"><i style="width:${n/pmax*100}%"></i></div><span class="num">${n}</span></div>`}).join('')}</div></section></div></details>`}

function vMeuDia(){const mm=myMember();
 if(!mm)return `<div class="head"><div><h1>Meu Dia</h1><p>Sua agenda, suas tarefas e seus clientes em um só lugar.</p></div></div>`+(me.id&&mode==='db'?emptyBox('Vincule a sua conta para ver o seu dia','Escolha o seu nome no quadro acima. Se ele não aparecer, toque em “Conta não vinculada” no menu.'):emptyBox('“Meu Dia” funciona quando o Terzo é aberto pelo link compartilhado','Cada pessoa entra com a própria conta do Claude e o sistema reconhece quem é.'));
 const lead=isLeader();const d=new Date();const h=d.getHours();const hi=h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
 const {mine,G,rest}=mdTasks(mm);const meets=mdMeets(mm);const others=mdOthers(mm);const F=ui.mdF;
 const myCl=S.clients.filter(c=>c.stage!=='Perdido'&&relDesigner(c)===mm.id);
 const crs=S.creatives.filter(c=>c.memberId===mm.id&&['Em criação','Ajustes solicitados','Em aprovação'].includes(c.status));
 const K=(k,l,n,cls)=>`<button class="md-k ${n&&cls?cls:''}" data-act="md-f" data-v="${k}" aria-pressed="${F===k}"><b>${n}</b>${l}</button>`;
 const grp=(k,l,L,cls)=>L.length&&(F==='all'||F===k||(F==='abertas'))?`<div class="md-g ${cls||''}">${l} <span class="n">${L.length}</span></div>${L.map(t=>mdTaskRow(t,mm)).join('')}`:'';
 const anyTask=G.urg.length+G.late.length+G.hoje.length+G.cli.length;
 const tasksHtml=(F==='all'||F==='abertas'||['urg','late','hoje','cli'].includes(F))?`${grp('urg','⚠ Urgentes',G.urg,'urg')}${grp('late','Atrasadas',G.late)}${grp('hoje','Para hoje',G.hoje)}${grp('cli','Aguardando retorno do cliente',G.cli)}
   ${F==='abertas'&&rest.length?`<div class="md-g">Próximos dias e com a liderança <span class="n">${rest.length}</span></div>${rest.map(t=>mdTaskRow(t,mm)).join('')}`:''}
   ${!anyTask&&F!=='abertas'?`<div class="md-empty"><b>Tudo em dia por aqui.</b>Nenhuma tarefa urgente, atrasada ou com prazo para hoje.</div>`:''}
   ${F==='all'&&rest.length?`<details><summary style="cursor:pointer;font-size:13.5px;color:var(--muted);font-weight:600">Próximos dias e com a liderança (${rest.length})</summary><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">${rest.map(t=>mdTaskRow(t,mm)).join('')}</div></details>`:''}`:'';
 return `<div class="md-head"><div><h1>${hi}, ${esc(mm.name.split(' ')[0])}</h1><p>${WDF[d.getDay()].replace(/^./,x=>x.toUpperCase())}, ${d.getDate()} de ${MN[d.getMonth()]} · ${esc(mm.role||mm.area||'')}</p></div>
  <div class="row"><button class="btn" data-act="profile" data-id="${mm.id}">${mm.photoId?'Meu perfil':'Adicionar minha foto'}</button></div></div>
 <div class="md-search">${svg('search')}<input id="md-q" type="search" placeholder="Pesquisar cliente, empresa ou projeto..." value="${esc(ui.mdQ)}" autocomplete="off" aria-label="Pesquisar cliente, empresa ou projeto">${mdSearch()}</div>
 <div class="md-kpis" role="group" aria-label="Resumo do dia">${K('agenda','compromissos hoje',meets.filter(m=>!mCxl(m)).length)}${K('abertas','tarefas em aberto',mine.length)}${K('urg','urgentes',G.urg.length,'hot')}${K('late','atrasadas',mine.filter(t=>taskState(t)==='late'&&!['cliente','aprovacao'].includes(tkFk(t))).length,'hot')}${K('cli','aguardando cliente',G.cli.length,'warn')}${F!=='all'?'<button class="md-k" data-act="md-f" data-v="all">Limpar filtro ✕</button>':''}</div>
 <div class="md-grid"><div class="md-col">
  ${F!=='agenda'?`<section class="md-card" id="md-tasks"><header><h2>Minhas tarefas</h2><button class="lnk" data-act="nav" data-v="tarefas">Ver todas ›</button></header>${tasksHtml}</section>`:''}
  ${others.length&&F==='all'?`<section class="md-card"><header><h2>Outras pendências</h2><small>aprovações, calendários e contatos</small></header><div>${others.map(x=>`<button class="md-o" data-act="${x.act[0]}" data-id="${esc(x.act[1])}" ${x.act[2]?`data-v="${esc(x.act[2])}"`:''}><span style="min-width:0"><b style="font-weight:600">${esc(x.t)}</b><small>${esc(x.k)}${x.c?' · '+esc(cName(x.c)):''}${x.extra?' · '+esc(x.extra):''}</small></span><span class="when ${x.late?'late':''}">${x.late?'atrasado':x.time?x.time:''}</span></button>`).join('')}</div></section>`:''}
  ${lead&&F==='all'?mdTeam():''}
 </div><div class="md-col">
  <section class="md-card" id="md-agenda"><header><h2>Compromissos de hoje</h2><button class="lnk" data-act="nav" data-v="agenda">Agenda completa ›</button></header>${mdAgenda(meets)}</section>
  ${myCl.length?`<section class="md-card"><header><h2>Meus clientes</h2><button class="lnk" data-act="nav" data-v="clientes">Carteira ›</button></header><div class="md-cl">${myCl.slice(0,12).map(c=>`<button data-act="st-open" data-id="${c.id}">${clientLogo(c,28)}<span>${esc(c.name)}</span></button>`).join('')}</div></section>`:''}
  ${crs.length?`<section class="md-card"><header><h2>Meus criativos em andamento</h2><small>${crs.length}</small></header><div class="mini" style="flex-wrap:wrap">${crs.slice(0,10).map(x=>`<button data-act="open-creative" data-id="${x.id}" title="${esc(x.title)} · ${esc(x.status)}" style="${x.status==='Ajustes solicitados'?'outline:2px solid var(--crit)':''}">${crKind(x)==='img'?`<img src="${esc(crUrl(x))}" alt="" loading="lazy">`:kindLabel[crKind(x)]}</button>`).join('')}</div></section>`:''}
 </div></div>
 ${isAdmin()&&F==='all'?mdOps():''}
 <div class="today" hidden></div>
 ${rankPanel()}`}
IC.search='<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>';

/* ---------- eventos ---------- */
document.addEventListener('input',e=>{if(e.target.id==='md-q'){ui.mdQ=e.target.value;clearTimeout(window.__mdT);window.__mdT=setTimeout(refresh,120)}});
document.addEventListener('keydown',e=>{if(e.target.id==='md-q'){if(e.key==='Escape'){ui.mdQ='';refresh()}if(e.key==='Enter'){const f=document.querySelector('.md-res button');if(f){e.preventDefault();f.click()}}}});
document.addEventListener('click',e=>{if(e.target.closest('[data-stop]')){e.stopPropagation();return}const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,v=b.dataset.v;
 if(a==='st-open'&&ui.mdQ){ui.mdQ=''}
 if(a==='md-f'){e.stopPropagation();ui.mdF=v;refresh();const el=document.getElementById(v==='agenda'?'md-agenda':'md-tasks');if(el)el.scrollIntoView({block:'start',behavior:'smooth'})}
 if(a==='md-team'){e.stopPropagation();Object.assign(ui,{tqWho:'all',tqClient:'all',tqDue:v==='late'?'late':'all',tqPrio:v==='urg'?'urg':'all',tqSt:v==='aprovacao'?'aprovacao':v==='cliente'?'cliente':'abertas'});go('tarefas')}},true);
