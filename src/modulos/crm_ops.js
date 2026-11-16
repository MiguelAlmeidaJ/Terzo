/* ================= Operação: navegação, papéis, Carteira de Clientes, Tarefas e download de criativos =================
   Papéis (fonte única, nos cadastros da Equipe que já existem):
   - Administrador: member.admin (ou dono/editor do artifact) → tudo.
   - Líder: member.leader === true → vê todas as carteiras, cria/distribui/aprova tarefas.
   - Designer: os demais → própria carteira, próprias tarefas, criativos, compromissos e Meu dia.
   Tarefas continuam na coleção "todos" (uma tarefa = um registro, também usado por Meu dia e Produção). */
const isLeaderM=m=>!!m&&(!!m.admin||m.leader===true);
const isLeader=()=>isAdmin()||isLeaderM(myMember());
const seeAllCarteiras=()=>isLeader()||myMember()?.area==='Comercial'||!myMember();

/* ---------- navegação ---------- */
{const rm=k=>{const i=VIEWS.findIndex(v=>v[0]===k);if(i>=0)VIEWS.splice(i,1)};rm('estrategia');rm('comercial');rm('producao');
 const set=(k,l,s)=>{const v=VIEWS.find(x=>x[0]===k);if(v){v[1]=l;v[2]=s}};
 set('clientes','Carteira de Clientes','Carteira');set('agenda','Compromissos','Agenda');
 if(!VIEWS.some(v=>v[0]==='tarefas'))VIEWS.push(['tarefas','Tarefas','Tarefas']);
 const ORD=['meudia','painel','tarefas','calendarios','clientes','agenda','criativos','aprovacoes','producao','equipe'];
 VIEWS.sort((a,b)=>(ORD.indexOf(a[0])+1||99)-(ORD.indexOf(b[0])+1||99));
 delete VIEW_ALIAS.tarefas;VIEW_ALIAS.estrategia=['clientes','cTab','carteira'];VIEW_ALIAS.comercial=['painel','',''];VIEW_ALIAS.producao=['tarefas','',''];VIEW_ALIAS.projetos=['tarefas','',''];VIEW_ALIAS.processos=['tarefas','',''];}
IC.clientes='<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18M10.5 12.5v1.6h3v-1.6"/>';
const TQ_DEF={tqCat:'all',tqWho:'all',tqClient:'all',tqSt:'abertas',tqDue:'all',tqPrio:'all',tqUrg:'all',tqPer:'mes'};
Object.assign(ui,TQ_DEF);try{const sv=JSON.parse(localStorage.getItem('terzo-tq')||'null');if(sv)for(const k in TQ_DEF)if(typeof sv[k]==='string')ui[k]=sv[k]}catch(e){}
function tqSave(){try{const o={};for(const k in TQ_DEF)o[k]=ui[k];localStorage.setItem('terzo-tq',JSON.stringify(o))}catch(e){}}
const tqActive=lead=>Object.keys(TQ_DEF).filter(k=>k!=='tqPer'&&(lead||k!=='tqWho')&&ui[k]!==TQ_DEF[k]).length;

/* ---------- status padronizado (sobre os status que as tarefas já usam) ---------- */
if(!TK_STATUS.includes('Em ajustes'))TK_STATUS.splice(TK_STATUS.indexOf('Aguardando aprovação')+1,0,'Em ajustes');TK_CLS['Em ajustes']='p-critico';
const TK_FLOW=[['nao','Não iniciada'],['execucao','Em execução'],['aprovacao','Aguardando aprovação'],['ajustes','Em ajustes'],['entregue','Entregue']];
const TK_FL=Object.fromEntries(TK_FLOW);
function tkFk(t){const s=tkS(t);if(s==='Concluída')return'entregue';if(s==='Aguardando aprovação'||s==='Aprovado')return'aprovacao';if(s==='Em ajustes')return'ajustes';if(s==='Aberto')return'nao';return'execucao'}
const tkPeople=t=>[...new Set([t.assigneeId,...(t.assigneeIds||[])].filter(Boolean))];
const tkMine=t=>{const mm=myMember();return !!mm&&tkPeople(t).includes(mm.id)};
const tkCanSee=t=>isLeader()||tkMine(t);
const tkPrioOf=t=>{const p=t.prioridade;return p&&p!=='Urgente'?p:(p==='Urgente'?'Alta':'Normal')};
const TK_PRIOS=['Urgente','Alta','Normal','Baixa'];

(()=>{const st=document.createElement('style');st.textContent=`
.tk-kpis{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:0;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.tk-kpis button{border:0;border-left:1px solid var(--line);background:none;text-align:left;padding:14px 16px;color:inherit;min-width:0}
.tk-kpis button:first-child{border-left:0}.tk-kpis button:hover{background:var(--bg)}.tk-kpis button[aria-pressed="true"]{box-shadow:inset 0 -3px 0 var(--ink)}
.tk-kpis span{display:block;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:700}
.tk-kpis b{display:block;font-family:var(--f-display);font-size:26px;margin-top:4px;font-variant-numeric:tabular-nums}
.tk-kpis small{display:block;font-size:12px;color:var(--muted)}
.tk-fl{display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 12px}
.tk-fl .sel{font-size:14px}
.tk-board{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px;align-items:start}
.tk-pc{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.tk-ph{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--line)}
.tk-ph .av{width:40px;height:40px;font-size:14px}.tk-ph b{display:block;font-size:15.5px}.tk-ph small{display:block;color:var(--muted);font-size:12.5px}
.tk-ph .n{margin-left:auto;text-align:right}.tk-ph .n b{font-family:var(--f-display);font-size:22px;line-height:1}.tk-ph .n small{font-size:11.5px}
.tk-ls{display:flex;flex-direction:column}
.tk-it{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center;padding:11px 16px;border:0;border-top:1px solid var(--line);background:none;text-align:left;color:inherit;width:100%}
.tk-it:first-child{border-top:0}.tk-it:hover{background:var(--bg)}
.tk-it .t{font-weight:600;font-size:14.5px;overflow-wrap:anywhere}.tk-it .m{grid-column:1/-1;font-size:12.5px;color:var(--muted);display:flex;gap:4px 10px;flex-wrap:wrap}
.tk-it .m .late{color:var(--crit);font-weight:700}
.tk-s{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;white-space:nowrap;color:var(--ink)}
.tk-s i{width:8px;height:8px;border-radius:50%;background:var(--low);flex:none}
.tk-s.execucao i{background:var(--med)}.tk-s.aprovacao i{background:var(--high)}.tk-s.ajustes i{background:var(--crit)}.tk-s.entregue i{background:var(--ok)}
.tk-urg{font-size:11px;font-weight:700;color:var(--crit);letter-spacing:.04em;text-transform:uppercase;margin-right:6px}
.tk-none{padding:14px 16px;color:var(--muted);font-size:13.5px}
.tk-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.tk-steps div{font-size:11.5px;color:var(--muted);display:flex;flex-direction:column;gap:4px;min-width:0}
.tk-steps i{height:6px;border-radius:3px;background:var(--line)}.tk-steps .done i{background:var(--ink)}.tk-steps .cur i{background:var(--brand-red)}.tk-steps .cur b{color:var(--ink)}
.tk-steps b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tk-act{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.tk-act p{margin:0;font-size:14px}
.tk-act textarea{border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:8px 10px;width:100%;min-height:54px;resize:vertical}
.tk-files{display:flex;flex-wrap:wrap;gap:8px}
.tk-file{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:6px 10px;font-size:13px;font-weight:600;color:var(--ink)}
.tk-hist{list-style:none;margin:0;padding:0}
.tk-hist li{display:grid;grid-template-columns:118px 1fr;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:13.5px}.tk-hist li:first-child{border-top:0}
.tk-hist time{font-family:var(--f-mono);font-size:11.5px;color:var(--muted);padding-top:2px}.tk-hist p{margin:2px 0 0;color:var(--muted);white-space:pre-wrap;overflow-wrap:anywhere}
.cr-w{display:flex;flex-direction:column;gap:6px;min-width:0}.cr-w>.cr{flex:1}
.cr-dl{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;border:0;background:none;color:var(--muted);font-size:13px;font-weight:600;padding:2px 4px;text-decoration:none;border-radius:6px}
.cr-dl:hover{color:var(--ink);background:var(--surface-2)}.cr-acts{display:flex;justify-content:space-between;align-items:center;gap:6px}.cr-x:hover{color:var(--crit)}.cr-x.armed{background:var(--crit);color:#fff}.cr-dl svg{width:15px;height:15px}.cr-dl[disabled]{opacity:.6}
@media (max-width:1000px){.tk-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.tk-kpis button:nth-child(4){border-left:0}.tk-kpis button:nth-child(n+4){border-top:1px solid var(--line)}}
@media (max-width:560px){.tk-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.tk-kpis button{border-left:0!important;border-top:1px solid var(--line)}.tk-kpis button:nth-child(-n+2){border-top:0}.tk-board{grid-template-columns:1fr}.tk-hist li{grid-template-columns:1fr}}
`;(document.body||document.head).appendChild(st)})();

/* ---------- Carteira de Clientes: mesma lista e mesma página do Relacionamento ---------- */
function vClientes(){updSub();const c=ui.stClient&&byId('clients',ui.stClient);if(c)return stClient(c);
 if(!isLeader())return stList();const tab=ui.cTab||'carteira';
 if(tab==='carteira')return stList();const mm=myMember();
 const relN=S.follows.filter(f=>f.status!=='Feito'&&!isCad(f)&&fuState(f)!=='ok'&&(!mm||isAdmin()||fuOwns(f,mm.id))).length;
 const obN=S.clients.filter(c=>c.stage==='Fechado'&&CHECK.some(i=>!c.onboarding?.checklist?.[i.id]?.done)).length;
 return `<div class="head"><div><h1>Carteira de Clientes</h1><p>Follow-ups, onboarding e histórico de contatos de toda a carteira.</p></div><div class="row"><button class="btn primary" data-act="new-client">+ Cliente</button></div></div>
 ${cTabs(relN,obN)}${({relac:relacBody,onboarding:onboardingBody,hist:histBody}[tab]||carteiraBody)()}`}
function cTabs(relN,obN){const mm=myMember();if(relN===undefined){relN=S.follows.filter(f=>f.status!=='Feito'&&!isCad(f)&&fuState(f)!=='ok'&&(!mm||isAdmin()||fuOwns(f,mm.id))).length;obN=S.clients.filter(c=>c.stage==='Fechado'&&CHECK.some(i=>!c.onboarding?.checklist?.[i.id]?.done)).length}
 return subTabs('c-tab',ui.cTab||'carteira',[['carteira','Carteira'],['relac','Follow-ups',relN],['onboarding','Onboarding',obN],['hist','Histórico de contatos']])}
function stList(){const q=ui.stQ.trim().toLowerCase();const norm=s=>String(s||'').toLowerCase();const all=seeAllCarteiras();const mm=myMember();const lead=isLeader();
 const sitOf=c=>c.stage==='Perdido'?'encerradas':c.stage!=='Fechado'?'leads':(health(c)?.lv||'ok')==='ok'?'ativas':'atencao';
 const mine=S.clients.filter(c=>relDesigner(c)===mm?.id);const consult=!all&&ui.ctScope==='all';const scope=all||consult?S.clients:mine;
 const base=scope.filter(c=>!q||[c.name,c.legalName,c.contact,c.segment,c.email,c.address].some(x=>norm(x).includes(q)));
 const inSit=c=>ui.rlSit==='todas'||sitOf(c)===ui.rlSit||(ui.rlSit==='ativas'&&sitOf(c)==='atencao');
 const who=all?ui.rlWho:'all';const sw=all?'':`<div class="ct-sw" role="tablist" aria-label="Visualização"><button role="tab" data-act="ct-scope" data-v="mine" aria-selected="${!consult}">Minha carteira <span class="num">${mine.length}</span></button><button role="tab" data-act="ct-scope" data-v="all" aria-selected="${consult}">Todos os clientes <span class="num">${S.clients.length}</span></button></div>`;
 const L=base.filter(c=>inSit(c)&&(who==='all'||(who==='none'?!relDesigner(c):relDesigner(c)===who))).sort((a,b)=>String(a.name).localeCompare(b.name,'pt'));
 const act=base.filter(inSit);const ds=[...new Set(S.clients.filter(c=>c.stage==='Fechado').map(relDesigner).filter(Boolean))].map(id=>byId('members',id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 const noD=act.filter(c=>!relDesigner(c)).length;const cnt=k=>base.filter(c=>k==='ativas'?['ativas','atencao'].includes(sitOf(c)):k==='todas'?true:sitOf(c)===k).length;
 const sits=[['ativas','Ativas'],['atencao','Em atenção'],['leads','Em negociação'],['encerradas','Encerradas'],['todas','Todas']].filter(([k])=>k==='ativas'||k==='todas'||cnt(k));
 return `<div class="head"><div><h1>${all?'Carteira de Clientes':consult?'Todos os clientes':'Minha carteira de clientes'}</h1><p>${all?'Os clientes da agência, quem cuida de cada conta, há quanto tempo é cliente e o próximo compromisso.':consult?'Consulta dos clientes da agência. Ver um cliente aqui não muda a sua carteira nem o responsável pela conta.':`${mine.length} cliente${mine.length===1?'':'s'} sob a sua responsabilidade. Toque em um cliente para ver tudo sobre a conta.`}</p></div>${lead?`<div class="row">${isAdmin()&&S.clients.filter(c=>c.stage==='Fechado'&&!stNext(c.id)).length?`<button class="btn" data-act="st-bulk">Agendar follow quinzenal</button>`:''}<button class="btn primary" data-act="new-client">+ Cliente</button></div>`:''}</div>
 ${lead?cTabs():''}${sw}
 <div class="rl-bar"><input class="st-search" id="st-q" placeholder="Buscar cliente por nome, contato ou segmento" value="${esc(ui.stQ)}" autocomplete="off">
  <div class="row" style="justify-content:space-between;gap:10px"><div class="chips" role="group" aria-label="Situação da conta">${sits.map(([k,l])=>`<button class="chip" data-act="rl-sit" data-v="${k}" aria-pressed="${ui.rlSit===k}">${l} <span class="num" style="opacity:.6">${cnt(k)}</span></button>`).join('')}</div>
  ${all?`<label class="row" style="gap:8px"><span style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700">Designer</span><select class="sel" id="rl-who" aria-label="Filtrar por designer responsável"><option value="all">Todas as carteiras</option>${ds.map(m=>`<option value="${m.id}" ${ui.rlWho===m.id?'selected':''}>${esc(m.name)} · ${act.filter(c=>relDesigner(c)===m.id).length}</option>`).join('')}${noD?`<option value="none" ${ui.rlWho==='none'?'selected':''}>Sem designer definido · ${noD}</option>`:''}</select></label>`:''}</div></div>
 ${L.length?`<div class="rl-list" role="list"><div class="rl-hd"><span>Cliente</span><span>Designer responsável</span><span>Tempo de casa</span><span>Próximo compromisso</span><span>Situação</span></div>
 ${L.map(c=>{const d=relDesigner(c);const s=relSit(c);const nx=relNextMeet(c.id)[0];const st=relStart(c);
  return `<button class="rl-row" role="listitem" data-act="st-open" data-id="${c.id}"><span class="rl-nm">${clientLogo(c,44)}<span style="min-width:0"><b>${esc(c.name)}</b><small>${esc(c.segment||'Segmento a preencher')}</small></span></span>
   <span class="rl-c o">${d?`<span class="rl-who">${av(d)}<span style="min-width:0"><b>${esc(mName(d))}</b></span></span>`:'<span class="rl-muted">A definir</span>'}</span>
   <span class="rl-c o">${st?`<b>${esc(relTenure(st))}</b><small>desde ${fD(st)}/${st.slice(0,4)}</small>`:'<span class="rl-muted">Início a preencher</span>'}</span>
   <span class="rl-c o">${nx?`<b>${esc(WD[parseD(nx.when).getDay()]+' '+fD(nx.when)+' · '+pad(parseD(nx.when).getHours())+':'+pad(parseD(nx.when).getMinutes()))}</b><small>${esc(nx.kind||nx.title||'Compromisso')}</small>`:'<span class="rl-muted">Nada agendado</span>'}</span>
   <span class="rl-c rl-sitc">${relSitHtml(s)}</span></button>`}).join('')}</div>`
 :emptyBox(q?'Nenhum cliente encontrado':all||consult?'Nenhum cliente nesta seleção':'Nenhum cliente na sua carteira ainda',q?'Tente outro nome ou parte do nome.':all?'Mude a situação ou o designer no filtro acima.':'A liderança define o designer responsável de cada conta na página do cliente.')}`}

/* ---------- TAREFAS ---------- */
function tkDueOk(t){const f=ui.tqDue;if(f==='all')return true;const n=t.due?daysTo(t.due):null;
 if(f==='late')return tkFk(t)!=='entregue'&&taskState(t)==='late';if(f==='today')return n===0;if(f==='week')return n!==null&&n>=0&&n<=7;if(f==='none')return !t.due;return true}
function tkPeriodOk(t){const d=t.doneAt;if(!d)return false;if(ui.tqPer==='mes')return d.slice(0,7)===thisMonth();const n=-daysTo(d);return n>=0&&n<=(ui.tqPer==='7'?7:30)}
function tkRow(t,mid){const fk=tkFk(t);const late=fk!=='entregue'&&taskState(t)==='late';const co=tkPeople(t).filter(x=>x!==mid);const pr=tkPrioOf(t);
 return `<button class="tk-it" data-act="task-open" data-id="${t.id}"><span class="t">${t.urgent?'<span class="tk-urg">⚠ Urgente</span>':''}${pr==='Alta'?'<span class="tk-urg" style="color:var(--high)">Alta</span>':''}${esc(t.title)}</span><span class="tk-s ${fk}"><i></i>${TK_FL[fk]}</span>
  <span class="m"><span>${esc(t.clientId?cName(t.clientId):'Interno')}</span>${t.svcCat?`<span>${esc(tcName(t.svcCat))}</span>`:''}<span class="${late?'late':''}">${fk==='entregue'?'entregue '+fD(t.doneAt):t.due?(late?'atrasada · ':'prazo ')+fD(t.due):'sem prazo'}</span>${co.length?`<span>com ${esc(co.map(first).join(', '))}</span>`:''}</span></button>`}
function vTarefasOps(){const lead=isLeader();const mm=myMember();
 const head=`<div class="head"><div><h1>Tarefas</h1><p>${lead?'Demandas da equipe por profissional: o que está aberto, em execução, aguardando aprovação ou em ajustes.':'As demandas atribuídas a você. Atualize o andamento e envie para aprovação quando terminar.'}</p></div>${lead?`<div class="row">${isAdmin()?'<button class="btn" data-act="tc-edit">Catálogo</button><button class="btn" data-act="tk-leaders">Liderança</button>':''}<button class="btn primary" data-act="task-new">+ Nova tarefa</button></div>`:''}</div>`;
 if(!lead&&!mm)return head+emptyBox('Vincule a sua conta para ver as suas tarefas','Escolha o seu nome no quadro “Conta não vinculada”.');
 const scope=S.todos.filter(t=>lead||tkMine(t));
 const base=scope.filter(t=>(ui.tqClient==='all'||(ui.tqClient==='int'?!t.clientId:t.clientId===ui.tqClient))&&(ui.tqPrio==='all'||(ui.tqPrio==='urg'?!!t.urgent:tkPrioOf(t)===ui.tqPrio))&&(ui.tqUrg==='all'||(ui.tqUrg==='urg')===!!t.urgent)&&(ui.tqCat==='all'||(ui.tqCat==='none'?!t.svcCat:t.svcCat===ui.tqCat))&&tkDueOk(t)&&(!lead||ui.tqWho==='all'||tkPeople(t).includes(ui.tqWho)));
 const n=k=>base.filter(t=>tkFk(t)===k).length;const open=base.filter(t=>tkFk(t)!=='entregue').length;const deliv=base.filter(t=>tkFk(t)==='entregue'&&tkPeriodOk(t)).length;
 const stOk=t=>ui.tqSt==='abertas'?tkFk(t)!=='entregue':ui.tqSt==='todas'?(tkFk(t)!=='entregue'||tkPeriodOk(t)):ui.tqSt==='entregue'?tkFk(t)==='entregue'&&tkPeriodOk(t):tkFk(t)===ui.tqSt;
 const list=base.filter(stOk);
 const K=(k,l,v,s)=>`<button data-act="tq-st" data-v="${k}" aria-pressed="${ui.tqSt===k}"><span>${l}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</button>`;
 const kpis=`<div class="tk-kpis" role="group" aria-label="Filtrar por status">${K('abertas','Abertas',open,base.filter(t=>tkFk(t)!=='entregue'&&taskState(t)==='late').length+' atrasada(s)')}${K('nao','Não iniciadas',n('nao'))}${K('execucao','Em execução',n('execucao'))}${K('aprovacao','Aguardando aprovação',n('aprovacao'))}${K('cliente','Aguardando cliente',n('cliente'))}${K('ajustes','Em ajustes',n('ajustes'))}${K('entregue','Entregues',deliv,{mes:'neste mês','7':'em 7 dias','30':'em 30 dias'}[ui.tqPer])}</div>`;
 const mOpts=S.members.filter(m=>m.area!=='Comercial'||S.todos.some(t=>tkPeople(t).includes(m.id))).sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 const nAct=tqActive(lead);const cls=[...new Set(scope.map(t=>t.clientId).filter(Boolean))].map(x=>byId('clients',x)).filter(Boolean);
 const cOpts=(lead?S.clients:cls).slice().sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 const SEL=(k,l,opts)=>`<label class="tq-f"><span>${l}</span><select class="sel" data-tqp="${k}">${opts.map(([v,t])=>`<option value="${esc(v)}" ${ui[k]===v?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
 const panel=`<div class="tq-pop" id="tq-pop" role="dialog" aria-label="Filtrar tarefas" hidden><div class="tq-grid">
  ${lead?SEL('tqWho','Responsável',[['all','Toda a equipe'],...mOpts.map(m=>[m.id,m.name])]):''}
  ${SEL('tqClient','Cliente',[['all','Todos os clientes'],['int','Interno (sem cliente)'],...cOpts.map(c=>[c.id,c.name])])}
  ${SEL('tqSt','Status',[['abertas','Abertas'],...TK_FLOW,['todas','Abertas e entregues']])}
  ${SEL('tqCat','Categoria',[['all','Todas as categorias'],...tcat().map(c=>[c.id,c.name]),[TC_OTHER,'Outra demanda / personalizada'],['none','Sem categoria']])}
  ${SEL('tqPrio','Prioridade',[['all','Qualquer prioridade'],...TK_PRIOS.filter(p=>p!=='Urgente').map(p=>[p,p])])}
  ${SEL('tqUrg','Urgência',[['all','Urgentes e não urgentes'],['urg','Só urgentes'],['nao','Sem urgência']])}
  ${SEL('tqDue','Prazo',[['all','Qualquer prazo'],['late','Atrasadas'],['today','Vencem hoje'],['week','Próximos 7 dias'],['none','Sem prazo']])}
  ${SEL('tqPer','Período das entregues',[['mes','Neste mês'],['7','Últimos 7 dias'],['30','Últimos 30 dias']])}</div>
  <div class="tq-ft"><button class="btn" type="button" data-act="tq-clear">Limpar filtros</button><span class="spacer"></span><button class="btn primary" type="button" data-act="tq-apply">Aplicar</button></div></div>`;
 const fl=`<div class="tq-bar"><span class="tq-sum">${list.length} tarefa${list.length===1?'':'s'}${nAct?` · <button class="lnk" data-act="tq-clear">limpar filtros</button>`:''}</span><div class="tq-wrap"><button class="btn tq-btn" data-act="tq-open" aria-expanded="false" aria-controls="tq-pop"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/></svg>Filtrar${nAct?`<span class="tq-n">${nAct}</span>`:''}</button>${panel}</div></div>`;
 const people=lead?(ui.tqWho!=='all'?[byId('members',ui.tqWho)].filter(Boolean):mOpts.filter(m=>list.some(t=>tkPeople(t).includes(m.id))||(['Design','Audiovisual','Copywriting','Social media'].includes(m.area)&&ui.tqSt==='abertas'))):[mm];
 const ord=t=>TK_FLOW.findIndex(x=>x[0]===tkFk(t));const sortT=(a,b)=>(tkFk(a)==='entregue')-(tkFk(b)==='entregue')||(!!b.urgent-!!a.urgent)||(taskState(b)==='late')-(taskState(a)==='late')||(TK_PRIOS.indexOf(tkPrioOf(a))-TK_PRIOS.indexOf(tkPrioOf(b)))||(a.due||'9').localeCompare(b.due||'9')||ord(a)-ord(b);
 const unassigned=lead&&ui.tqWho==='all'?list.filter(t=>!tkPeople(t).length):[];
 const card=m=>{const ts=list.filter(t=>tkPeople(t).includes(m.id)).sort(sortT);const op=S.todos.filter(t=>tkPeople(t).includes(m.id)&&tkFk(t)!=='entregue').length;
  return `<section class="tk-pc"><div class="tk-ph">${avatar(m,40)}<div style="min-width:0"><b>${esc(m.name.split(' ').slice(0,2).join(' '))}</b><small>${esc(m.role||m.area||'')}</small></div><div class="n"><b>${op}</b><small>aberta${op===1?'':'s'}</small></div></div>
   <div class="tk-ls">${ts.map(t=>tkRow(t,m.id)).join('')||`<div class="tk-none">${ui.tqSt==='abertas'?'Nenhuma tarefa aberta.':'Nenhuma tarefa nesse filtro.'}</div>`}</div></section>`};
 return head+kpis+fl+`<div class="tk-board">${people.map(card).join('')}${unassigned.length?`<section class="tk-pc"><div class="tk-ph"><span class="av" style="width:40px;height:40px;background:var(--low)">?</span><div><b>Sem responsável</b><small>defina quem faz</small></div><div class="n"><b>${unassigned.length}</b></div></div><div class="tk-ls">${unassigned.map(t=>tkRow(t,'')).join('')}</div></section>`:''}</div>`
  +(!people.length&&!unassigned.length?emptyBox('Nenhuma tarefa nesse filtro','Mude os filtros acima.'):'')}

/* ---------- cadastro (somente liderança) ---------- */
/* ---------- catálogo padronizado de tarefas (editável pelos administradores na coleção taskcatalog/main) ---------- */
COLS.push('taskcatalog');S.taskcatalog=[];
const DEFAULT_TCAT=[
 {id:'design',name:'Design e criação gráfica',titles:['Criação de arte para redes sociais','Criação de carrossel','Criação de stories','Criação de flyer / panfleto','Criação de folder','Criação de cartão de visita','Criação de banner','Criação de encarte','Criação de busdoor / outdoor','Criação de material institucional','Criação de apresentação comercial','Criação de papelaria personalizada']},
 {id:'audiovisual',name:'Audiovisual e edição',titles:['Edição de Reels','Edição de vídeo institucional','Edição de vídeo promocional','Edição de vídeo para redes sociais','Captação de fotos','Captação de vídeos','Produção de conteúdo audiovisual','Tratamento e edição de fotografias','Adaptação de vídeo para formatos diferentes']},
 {id:'branding',name:'Branding e identidade visual',titles:['Criação de logotipo','Redesign de logotipo','Desenvolvimento de identidade visual','Criação de manual da marca','Criação de peças de identidade visual','Desenvolvimento de elementos gráficos','Aplicação de identidade visual']},
 {id:'web',name:'Web e digital',titles:['Criação de site','Criação de landing page','Atualização de site','Criação de página institucional','Criação de banner digital','Criação de criativos para tráfego pago','Adaptação de layout digital']},
 {id:'planejamento',name:'Planejamento e conteúdo',titles:['Desenvolvimento de pré-calendário (copy)','Desenvolvimento de calendário mensal','Revisão de calendário','Planejamento de campanha','Criação de legenda / copy','Roteirização de Reels','Desenvolvimento de estratégia de conteúdo','Pesquisa de referências e tendências']},
 {id:'ajustes',name:'Ajustes e demandas complementares',titles:['Ajuste em material existente','Alteração solicitada pelo cliente','Ajuste pós-aprovação','Redimensionamento de arte','Atualização de informações em material','Revisão de conteúdo','Finalização de arquivo para impressão','Demanda extraordinária']}];
const TC_OTHER='outra';
function tcat(){const d=S.taskcatalog.find(x=>x.id==='main');return d&&Array.isArray(d.cats)&&d.cats.length?d.cats:DEFAULT_TCAT}
const tcName=id=>id===TC_OTHER?'Outra demanda / personalizada':(tcat().find(c=>c.id===id)?.name||(id?id:''));
const tcIsCal=title=>/^Desenvolvimento de (pré-)?calend[áa]rio/i.test(String(title||''));
function tcSync(){const c=document.getElementById('f_svcCat'),t=document.getElementById('f_svcTitle'),ti=document.getElementById('f_title');if(!c||!t||!ti)return;
 const cat=tcat().find(x=>x.id===c.value);const cur=t.value||t.dataset.v||'';t.dataset.v='';
 t.innerHTML=cat?`<option value="">Escolha o título</option>`+cat.titles.map(x=>`<option ${x===cur?'selected':''}>${esc(x)}</option>`).join(''):`<option value="">${c.value===TC_OTHER?'Título próprio abaixo':'Escolha a categoria primeiro'}</option>`;
 t.disabled=!cat;t.closest('.fld').hidden=c.value===TC_OTHER;ti.closest('.fld').hidden=!!cat&&!!c.value;
 const h=document.getElementById('tc-hint');if(h)h.hidden=c.value!=='planejamento'}
function tcEditor(){if(!isAdmin())return;const L=tcat();
 openModal(`<div class="mh"><div><h2>Catálogo de tarefas</h2><p style="margin:2px 0 0;color:var(--muted);font-size:13px">Um título por linha. Tarefas já abertas não mudam.</p></div><button class="x" data-act="close" aria-label="Fechar">×</button></div>
 <div class="mb" id="tc-ed">${L.map(c=>`<div class="fld" data-c="${esc(c.id)}"><span>Categoria</span><input class="tc-n" value="${esc(c.name)}"><textarea class="tc-t" style="min-height:120px">${esc(c.titles.join('\n'))}</textarea></div>`).join('')}
  <div class="fld"><span>Nova categoria (opcional)</span><input id="tc-newn" placeholder="Ex.: Eventos"><textarea id="tc-newt" placeholder="Títulos, um por linha"></textarea></div>
  <p style="margin:0;font-size:13px;color:var(--muted)">“Outra demanda / personalizada” fica sempre disponível. Apagar todos os títulos de uma categoria a remove do catálogo.</p></div>
 <div class="mf"><button class="btn" data-act="tc-reset">Restaurar o padrão</button><span class="spacer"></span><button class="btn" data-act="close">Cancelar</button><button class="btn primary" data-act="tc-save">Salvar catálogo</button></div>`)}
async function tcSaveCats(cats){const d=S.taskcatalog.find(x=>x.id==='main');await put('taskcatalog','main',{...(d||{}),cats,editedBy:myMember()?.id||''})}

function taskForm(t,pre){if(!isLeader()){toast('Só a liderança cria e distribui tarefas.');return}
 const isNew=!t;const mm=myMember();t=t||{status:'Aberto',assigneeId:'',due:ymd(addD(new Date(),3)),...(pre||{})};
 const projs=S.projects.filter(p=>!projDone(p)||p.id===t.projectId);const team=S.members.filter(m=>m.area!=='Comercial'||tkPeople(t).includes(m.id)).sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 const legacy=!isNew&&!t.svcCat;const cats=tcat();
 const fields=[{k:'svcCat',l:'Categoria',t:'select',o:[...cats.map(c=>({v:c.id,l:c.name})),{v:TC_OTHER,l:'Outra demanda / personalizada'}],empty:legacy?'Sem categoria (tarefa antiga)':'Escolha a categoria',req:!legacy},
  {k:'svcTitle',l:'Título da tarefa',t:'select',o:[],empty:'Escolha a categoria primeiro'},
  {k:'title',l:legacy?'Título':'Título personalizado',full:1,ph:'Ex.: Cardápio de verão para o salão'},
  {k:'desc',l:'Descrição',t:'textarea',full:1,ph:'O que precisa ser feito: orientações, formatos, textos, particularidades da solicitação'},
  {k:'clientId',l:'Cliente',t:'select',o:clientOpts(),empty:'Nenhum / interno'},
  {k:'assigneeId',l:'Profissional responsável',t:'select',o:memberCapOpts(),empty:'Escolha o profissional',req:1},
  {k:'assigneeIds',l:'Também participam (opcional)',t:'chips',o:team.map(m=>({v:m.id,l:m.name.split(' ')[0]})),full:1,hint:'A tarefa aparece para cada pessoa marcada, sem duplicar o registro.'},
  {k:'due',l:'Prazo de entrega',t:'date',req:1},{k:'dueTime',l:'Horário limite (opcional)',t:'time'},
  {k:'prioridade',l:'Prioridade',t:'select',o:TK_PRIOS},{k:'urg',l:'Urgência operacional',t:'chips',o:[{v:'sim',l:'⚠ Marcar como urgente'}],hint:'Aparece no topo do Meu Dia de quem faz. Independe da prioridade e pode ser retirada depois.'},{k:'requester',l:'Solicitante',ph:'Quem pediu',list:[...S.clients.map(c=>c.name),...S.members.map(m=>m.name)]}];
 if(projs.length)fields.push({k:'projectId',l:'Projeto',t:'select',o:projs.map(p=>({v:p.id,l:p.title})),empty:'Tarefa avulsa (sem projeto)'});
 fields.push({k:'tipo',l:'Tipo de atendimento',t:'select',o:TK_TIPOS,empty:'Escolha'},{k:'categoria',l:'Tipo de execução',t:'select',o:TK_CATS,empty:'Escolha'},
  {k:'subcategoria',l:'Subcategoria',t:'select',o:TK_SUBS,empty:'Escolha'},{k:'nivel',l:'Nível de esforço',t:'select',o:NIVEL_O,empty:'Escolha'},
  {k:'qtd',l:'Quantidade',t:'number'},{k:'formato',l:'Formato de atendimento',t:'select',o:['Remoto','Presencial']},
  {k:'refs',l:'Links de referência',t:'textarea',full:1,ph:'Um link por linha (Drive, Canva, Figma, referências)',hint:'Arquivos podem ser anexados depois de salvar, na própria tarefa.'},
  {k:'obs',l:'Observações',t:'textarea',full:1});
 formModal({title:isNew?(t.projectId?'Nova etapa do projeto':'Nova tarefa'):'Editar tarefa',values:{...t,prioridade:tkPrioOf(t),urg:t.urgent?['sim']:[],assigneeIds:t.assigneeIds||[],qtd:t.qtd??1,formato:t.formato||'Remoto'},fields,
  back:isNew?(t.projectId?()=>byId('projects',t.projectId)&&projectDetail(t.projectId):null):()=>byId('todos',t.id)&&taskDetail(t.id),
  onSave:async v=>{if(!legacy&&!v.svcCat){toast('Escolha a categoria.');throw new Error('cat')}
   if(v.svcCat&&v.svcCat!==TC_OTHER){if(!v.svcTitle){toast('Escolha o título da tarefa.');document.getElementById('f_svcTitle')?.focus();throw new Error('t')}v.title=v.svcTitle}
   else{v.svcTitle='';if(!String(v.title||'').trim()){toast('Escreva o título da tarefa.');document.getElementById('f_title')?.focus();throw new Error('t')}}
   if(tcIsCal(v.svcTitle)){const mo=(v.due||today()).slice(0,7);const cal=v.clientId&&(S.calendars.find(x=>x.clientId===v.clientId&&x.month===mo)||S.calendars.find(x=>x.clientId===v.clientId&&x.month===thisMonth()));
    if(!cal){toast('Calendários mensais são abertos na aba Calendários. Cadastre o calendário do cliente lá; esta tarefa só pode apoiar um calendário existente.');throw new Error('cal')}v.calId=cal.id}
   const rec={...t,...v};rec.urgent=(v.urg||[]).includes('sim');delete rec.urg;rec.assigneeIds=(v.assigneeIds||[]).filter(x=>x!==v.assigneeId);rec.qtd=+v.qtd||1;delete rec.priority;
   const p=rec.projectId&&byId('projects',rec.projectId);if(p&&!rec.clientId)rec.clientId=p.clientId||'';
   if(p&&(isNew||t.projectId!==rec.projectId)){const ts=projTasks(p).filter(x=>x.id!==t.id);rec.seq=ts.length?Math.max(...ts.map(x=>+x.seq||0))+1:0}
   if(!rec.projectId){rec.projectId='';rec.stageId=''}
   if(!isNew&&(t.assigneeId!==rec.assigneeId||String(t.assigneeIds||[])!==String(rec.assigneeIds)))rec.history=[...(t.history||[]),{s:tkS(t),at:new Date().toISOString(),by:me.id||'',note:'Responsáveis: '+tkPeople(rec).map(first).join(', ')}].slice(-30);
   if(isNew){rec.createdAt=today();rec.openedAt=new Date().toISOString();rec.history=[{s:'Aberto',at:rec.openedAt,by:me.id||'',note:'Criada e atribuída a '+tkPeople(rec).map(first).join(', ')}]}
   const tid=t.id||uid();await put('todos',tid,rec);
   const m=byId('members',rec.assigneeId);const l=m?weekLoad(m.id,0):0;
   toast((isNew?'Tarefa criada para '+tkPeople(rec).map(first).join(', '):'Tarefa atualizada')+(m&&l>cap(m)?' · atenção: '+m.name.split(' ')[0]+' está com '+l+'/'+cap(m)+' pontos nesta semana':''));
   if(isNew)sysPost(`**${actor()}** criou ${rec.urgent?'a tarefa **urgente**':'a tarefa'} **${rec.title}** para **${tkPeople(rec).map(first).join(', ')}**${rec.clientId?' · '+cName(rec.clientId):''} · prazo ${fD(rec.due)}`,{act:'task-open',id:tid})},
  onDelete:isNew||!isLeader()?null:async()=>{await del('todos',t.id);toast('Tarefa excluída')},delLabel:'Excluir tarefa'});
 const ts=document.getElementById('f_svcTitle');if(ts)ts.dataset.v=t.svcTitle||'';
 const cf=document.getElementById('f_svcCat');if(cf)cf.closest('.fld').insertAdjacentHTML('beforeend','<small id="tc-hint" hidden>Calendários mensais têm aba própria. Aqui, só demandas pontuais de planejamento, copy e conteúdo.</small>');
 tcSync()}

/* ---------- detalhe com fluxo de aprovação ---------- */
function taskDetail(id){{const t0=byId('todos',id);if(t0&&!tkCanSee(t0)){toast('Esta tarefa é de outro integrante da equipe.');return}}const draw=()=>{const t=byId('todos',id);if(!t){closeModal();return}const fk=tkFk(t);const lead=isLeader();const mine=tkMine(t);const keep=document.getElementById('tk-cm')?.value||'';const p=t.projectId&&byId('projects',t.projectId);
 const idx=TK_FLOW.findIndex(x=>x[0]===fk);const late=fk!=='entregue'&&taskState(t)==='late';
 const steps=`<div class="tk-steps">${TK_FLOW.map(([k,l],i)=>`<div class="${i<idx&&!(k==='ajustes'&&fk!=='ajustes')?'done':i===idx?'cur':''}"><i></i><b>${l}</b></div>`).join('')}</div>`;
 const B=(v,l,pri)=>`<button class="btn ${pri?'primary':''}" data-act="tk-move" data-id="${id}" data-v="${v}">${l}</button>`;
 const selfOnly=mine&&!isAdmin();let acts='',txt='';
 if(fk==='nao'){txt='Ainda não iniciada.';if(mine||lead)acts=B('Em execução','Iniciar tarefa',1)+`<button class="btn" data-act="tk-wait" data-id="${id}">Aguardando o cliente…</button>`}
 else if(fk==='execucao'||fk==='ajustes'){txt=fk==='ajustes'?'A liderança pediu ajustes. Faça as alterações e envie de novo.':'Em execução.'+(tkS(t)!=='Em execução'?' Status anterior: '+tkS(t)+'.':'');if(mine||lead)acts=B('Aguardando aprovação','Enviar para aprovação',1)+`<button class="btn" data-act="tk-wait" data-id="${id}">Aguardando o cliente…</button>`+(tkS(t)!=='Em execução'&&fk!=='ajustes'?B('Em execução','Retomar execução'):'')}
 else if(fk==='cliente'){txt='Aguardando retorno do cliente'+(t.waitingSince?' desde '+fD(t.waitingSince):'')+': '+(t.waitingWhat||'sem descrição')+'.';if(mine||lead)acts=B('Em execução','Cliente respondeu: retomar',1)+B('Aguardando aprovação','Enviar para aprovação')}
 else if(fk==='aprovacao'){txt='Enviada para a aprovação da liderança.';if(lead&&!selfOnly)acts=B('Concluída','Aprovar e marcar como entregue',1)+`<button class="btn danger" data-act="tk-adj" data-id="${id}">Solicitar ajustes</button>`+B('Em execução','Devolver para execução');else if(lead)txt+=' Outra pessoa da liderança aprova as suas entregas.'}
 else{txt='Entregue em '+fD(t.doneAt)+'/'+String(t.doneAt||'').slice(0,4)+'.';if(lead)acts=B('Em execução','Reabrir')}
 const actBox=`<div class="tk-act"><p>${esc(txt)}</p>${acts&&(mine||lead)?`<textarea id="tk-note" placeholder="Observação para o histórico (opcional)"></textarea><div class="row">${acts}</div>
  <div id="tk-adj-box" hidden style="display:flex;flex-direction:column;gap:8px"><span class="lb">O que precisa ser ajustado</span><textarea id="tk-reason"></textarea><div class="row"><button class="btn danger" data-act="tk-adj-send" data-id="${id}">Devolver com ajustes</button></div></div>
  <div id="tk-wait-box" hidden style="display:flex;flex-direction:column;gap:8px"><span class="lb">O que estamos aguardando do cliente?</span><textarea id="tk-wait" placeholder="Ex.: fotos do produto novo; aprovação do texto da campanha">${esc(t.waitingWhat||'')}</textarea><div class="row"><button class="btn primary" data-act="tk-wait-send" data-id="${id}">Marcar como aguardando o cliente</button></div></div>`:!mine&&!lead?'<p style="color:var(--muted);font-size:13px">Só os responsáveis e a liderança movimentam esta tarefa.</p>':''}</div>`;
 const files=(t.files||[]);const refs=lines(t.refs||'');
 const hist=[...(t.history||[]).map(h=>({at:h.at,by:h.by,b:'Status: '+(TK_FL[tkFk({status:h.s})]||h.s)+(h.s&&!['Aberto','Em execução','Aguardando aprovação','Em ajustes','Concluída'].includes(h.s)?' ('+h.s+')':''),p:h.note||''})),
  ...(t.comments||[]).map(c=>({at:c.at,by:c.by,b:c.kind||'Andamento',p:c.text}))].sort((a,b)=>(b.at||'').localeCompare(a.at||''));
 $('#modal').innerHTML=`<div class="mh"><div style="min-width:0"><h2 style="overflow-wrap:anywhere">${esc(t.title)}</h2><div style="font-size:13px;color:var(--muted)">${esc(tkPeople(t).map(x=>mName(x)).join(', ')||'Sem responsável')}${t.clientId?' · '+esc(cName(t.clientId)):''}</div></div><button class="x" data-act="close" aria-label="Fechar">×</button></div>
 <div class="mb">${steps}${actBox}
  ${p?`<div class="note" style="align-items:center"><p>Etapa ${projTasks(p).findIndex(x=>x.id===id)+1} de ${projTasks(p).length} do projeto <b>${esc(p.title)}</b></p>${isAdmin()?`<button class="btn sm" data-act="open-project" data-id="${p.id}">Abrir projeto</button>`:''}</div>`:''}
  <div class="tk-info">${[['Prazo',t.due?fD(t.due)+'/'+t.due.slice(0,4)+(t.dueTime?' às '+t.dueTime:'')+(late?' · atrasada':''):'Sem prazo'],['Categoria',t.svcCat?tcName(t.svcCat):''],['Urgência',t.urgent?'⚠ Urgente':''],['Prioridade',tkPrioOf(t)],['Cliente',t.clientId?cName(t.clientId):'Interno'],['Responsável',mName(t.assigneeId)],['Também participam',(t.assigneeIds||[]).map(first).join(', ')],['Criada em',fOpen(t.openedAt||t.createdAt)],['Criada por',t.createdBy?who(t.createdBy):''],['Solicitante',t.requester],['Tipo',[t.tipo,t.categoria,t.subcategoria].filter(x=>x&&x!=='Não se aplica').join(' · ')],['Quantidade',t.qtd>1?t.qtd:''],['Nível',t.nivel?'Nível '+t.nivel:'']].filter(x=>x[1]).map(([l,v])=>`<div><span>${l}</span><b>${esc(v)}</b></div>`).join('')}</div>
  ${t.desc?`<div class="sec"><h3>Descrição</h3><div class="note"><p style="white-space:pre-wrap">${esc(t.desc)}</p></div></div>`:''}
  ${refs.length||files.length||lead?`<div class="sec"><h3>Referências e anexos</h3><div class="tk-files">${refs.map(r=>/^https?:\/\//i.test(r)?`<a class="tk-file" href="${esc(r)}" target="_blank" rel="noopener">↗ ${esc(r.replace(/^https?:\/\/(www\.)?/,'').slice(0,40))}</a>`:`<span class="tk-file">${esc(r)}</span>`).join('')}${files.map(f=>`<button class="tk-file" data-act="file-dl" data-asset="${esc(f.assetId)}" data-name="${esc(f.name)}">↓ ${esc(f.name)}</button>`).join('')}${lead?`<button class="tk-file" data-act="tk-attach" data-id="${id}" style="color:var(--muted)">+ Anexar arquivo</button>`:''}</div>${!refs.length&&!files.length?'<small style="color:var(--muted)">Nenhuma referência ainda.</small>':''}</div>`:''}
  ${t.obs?`<div class="sec"><h3>Observações</h3><div class="note"><p style="white-space:pre-wrap">${esc(t.obs)}</p></div></div>`:''}
  ${approvalBox(t.approval)}
  <div class="sec"><h3>Andamento e histórico</h3>${mine||lead?`<div class="row" style="flex-wrap:nowrap;align-items:stretch;margin-bottom:8px"><textarea id="tk-cm" class="sel" style="flex:1;min-height:48px;min-width:0" placeholder="Atualize o andamento, tire uma dúvida ou cole o link da entrega">${esc(keep)}</textarea><button class="btn" data-act="task-comment" data-id="${id}">Registrar</button></div>`:''}
   ${hist.length?`<ul class="tk-hist">${hist.map(h=>`<li><time>${fDT(h.at)}</time><div><b>${esc(h.b)}</b>${h.by?` <span style="color:var(--muted)">· ${esc(firstName(who(h.by)))}</span>`:''}${h.p?`<p>${esc(h.p)}</p>`:''}</div></li>`).join('')}</ul>`:'<small style="color:var(--muted)">Sem movimentações ainda.</small>'}</div>
  ${stamp(t)}</div>
 <div class="mf">${t.clientId?`<button class="btn" data-act="st-open" data-id="${t.clientId}">Página do cliente</button>`:''}<span class="spacer"></span>${lead?`<button class="btn primary" data-act="task-edit" data-id="${id}">Editar</button>`:''}</div>`};
 openModal('',{rerender:draw});draw()}
async function tkMove(id,v,note,kind,more){const t=byId('todos',id);if(!t)return;const lead=isLeader(),mine=tkMine(t);const fk=tkFk(t);
 if(!lead&&!mine){toast('Só os responsáveis e a liderança movimentam esta tarefa.');return}
 if(!lead&&!(v==='Em execução'&&['nao','execucao','cliente'].includes(fk))&&!(v==='Aguardando aprovação'&&['execucao','ajustes','nao','cliente'].includes(fk))&&!(v==='Aguardando cliente'&&['execucao','ajustes','nao'].includes(fk))){toast('Aprovar e entregar é com a liderança.');return}
 if(lead&&mine&&!isAdmin()&&fk==='aprovacao'&&['Concluída','Em ajustes'].includes(v)){toast('Outra pessoa da liderança aprova as suas entregas.');return}
 const now=new Date().toISOString();const extra={...(more||{})};if(note)extra.comments=[...(t.comments||[]),{text:note,by:me.id||'',at:now,kind:kind||(v==='Em ajustes'?'Ajustes solicitados':'Observação')}];
 if(v==='Em ajustes')extra.rounds=(+t.rounds||0)+1;
 await setTaskStatus(id,v,extra);
 if(v==='Em ajustes')sysPost(`↩️ **${actor()}** pediu ajustes na tarefa **${t.title}**${t.clientId?' · '+cName(t.clientId):''} para **${tkPeople(t).map(first).join(', ')}**`,{act:'task-open',id})}
function tkToday(mm,out){const t0=today();S.todos.filter(t=>t.assigneeId!==mm.id&&(t.assigneeIds||[]).includes(mm.id)&&tkOpen(t)&&t.due&&t.due<=t0).forEach(t=>out.push({k:'Tarefa',cls:'p-acc',t:t.title,c:t.clientId,due:t.due,time:t.dueTime||'',late:taskState(t)==='late',urg:!!t.urgent,act:['task-open',t.id],extra:tkS(t)}));
 S.todos.filter(t=>tkPeople(t).includes(mm.id)&&tkS(t)==='Em ajustes'&&!(t.due&&t.due<=t0)).forEach(t=>out.push({k:'Ajustes na tarefa',cls:'p-critico',t:t.title,c:t.clientId,due:t0,late:false,act:['task-open',t.id]}));
 if(isLeaderM(mm))S.todos.filter(t=>tkFk(t)==='aprovacao'&&tkS(t)==='Aguardando aprovação'&&!tkPeople(t).includes(mm.id)).forEach(t=>out.push({k:'Aprovar tarefa',cls:'p-alto',t:t.title+' · '+tkPeople(t).map(first).join(', '),c:t.clientId,due:t0,late:false,act:['task-open',t.id]}))}
function tkBadge(mm){if(mode==='wait')return 0;if(isLeader())return S.todos.filter(t=>tkS(t)==='Aguardando aprovação').length;if(!mm)return 0;return S.todos.filter(t=>tkPeople(t).includes(mm.id)&&(tkS(t)==='Em ajustes'||(tkOpen(t)&&taskState(t)==='late'))).length}
function tkLeadersModal(){const sel=new Set(S.members.filter(m=>m.leader===true).map(m=>m.id));
 openModal(`<div class="mh"><h2>Liderança</h2><button class="x" data-act="close" aria-label="Fechar">×</button></div>
 <div class="mb"><p style="margin:0;font-size:14px;color:var(--muted)">A liderança vê todas as carteiras e cria, distribui e aprova tarefas. Administradores já têm esse acesso. Os demais são tratados como designers.</p>
  <div class="chips" id="tk-lead-chips">${S.members.filter(m=>!m.admin).map(m=>`<button type="button" class="chip" data-act="chip" data-v="${m.id}" aria-pressed="${sel.has(m.id)}">${esc(m.name)}</button>`).join('')}</div>
  <p style="margin:0;font-size:13px;color:var(--muted)">Administradores: ${esc(S.members.filter(m=>m.admin).map(m=>m.name.split(' ')[0]).join(', '))}</p></div>
 <div class="mf"><button class="btn" data-act="close">Cancelar</button><span class="spacer"></span><button class="btn primary" data-act="tk-leaders-save">Salvar</button></div>`)}

/* ---------- download do arquivo original ---------- */
const DL_ICO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>';
const extOf=t=>({'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp','image/svg+xml':'svg','video/mp4':'mp4','video/webm':'webm','application/pdf':'pdf'})[t]||'';
let dlNs;async function dlApi(){if(dlNs!==undefined)return dlNs;try{dlNs=window.claude?.use?await window.claude.use('downloads'):null}catch(e){dlNs=null}return dlNs}
async function fileDl(b,asset,name){const t0=b.innerHTML;b.disabled=true;b.innerHTML=DL_ICO+'Baixando…';let label=t0;
 try{const r=await fetch('/_blob/'+encodeURIComponent(asset));if(!r.ok)throw{code:'fetch'};const bl=await r.blob();
  if(!/\.[a-z0-9]{2,5}$/i.test(name||''))name=(name||'arquivo')+(extOf(bl.type)?'.'+extOf(bl.type):'');
  const api=await dlApi();
  if(api){b.innerHTML=DL_ICO+'Confirme o download';await api.save({filename:name,data:bl});label=DL_ICO+'Baixado';toast('Arquivo salvo: '+name)}
  else{const u=URL.createObjectURL(bl);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);label=DL_ICO+'Baixado';toast('Download iniciado: '+name)}}
 catch(e){const c=e?.code;if(c==='declined'){}else if(c==='rate_limited')toast('Já há um download aguardando confirmação.');else if(c==='rejected_extension'||c==='extension_not_enabled'){toast('Este formato não pode ser baixado por aqui. Abrindo o arquivo.');window.open('/_blob/'+encodeURIComponent(asset),'_blank','noopener')}else toast('Não foi possível baixar agora. Tente de novo.')}
 b.innerHTML=label;setTimeout(()=>{if(document.body.contains(b)){b.disabled=false;b.innerHTML=t0}},2500)}
function crAfter(){if(ui.view!=='criativos')return;document.querySelectorAll('#main .gallery > .cr').forEach(b=>{const c=byId('creatives',b.dataset.id);if(!c)return;const w=document.createElement('div');w.className='cr-w';b.replaceWith(w);w.appendChild(b);
 w.insertAdjacentHTML('beforeend','<div class="cr-acts">'+(c.assetId?`<button class="cr-dl" data-act="cr-dl" data-id="${esc(c.id)}" aria-label="Baixar o arquivo original de ${esc(c.title||'criativo')}">${DL_ICO}Baixar</button>`:c.link?`<a class="cr-dl" href="${esc(c.link)}" target="_blank" rel="noopener">Abrir link ↗</a>`:'')+(isAdmin()?`<button class="cr-dl cr-x" data-act="ap-del" data-id="${esc(c.id)}" aria-label="Excluir ${esc(c.title||'criativo')}">Excluir</button>`:'')+'</div>')})}
function opsAfter(){try{crAfter()}catch(e){}if(!isLeader())document.querySelectorAll('#main [data-act="task-new"]').forEach(x=>x.remove())}

/* ---------- eventos ---------- */
document.addEventListener('change',e=>{if(e.target.id==='f_svcCat'){tcSync();return}const k=e.target.dataset?.tq;if(k){ui[k]=e.target.value;refresh()}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id,v=b.dataset.v;
 const stop=()=>{e.stopPropagation();e.preventDefault()};
 if(a==='task-new'||a==='task-edit'){if(!isLeader()){stop();toast('Só a liderança cria e edita tarefas.');return}return}
 if(a==='task-status'){stop();return}
 if(a==='task-done'){const t=byId('todos',id);if(!t)return;if(isLeader()&&!(tkMine(t)&&!isAdmin()&&tkFk(t)==='aprovacao'))return;stop();
  const fk=tkFk(t);if(!tkMine(t)){toast('Só os responsáveis movimentam esta tarefa.');return}
  if(fk==='aprovacao'){toast('Já está com a liderança para aprovação.');return}if(fk==='entregue'){toast('Tarefa entregue. A liderança pode reabrir se precisar.');return}
  await tkMove(id,'Aguardando aprovação');toast('Enviada para aprovação da liderança');return}
 if(a==='tc-edit'||a==='tc-save'||a==='tc-reset'){stop();if(!isAdmin())return;if(a==='tc-edit')tcEditor();else if(a==='tc-reset'){await tcSaveCats(DEFAULT_TCAT);closeModal();toast('Catálogo padrão restaurado')}else{const used=new Set();const slug=x=>{let k=calNorm(x).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'cat';while(used.has(k))k+='-2';used.add(k);return k};
  const cats=[...document.querySelectorAll('#tc-ed .fld[data-c]')].map(f=>{used.add(f.dataset.c);return{id:f.dataset.c,name:f.querySelector('.tc-n').value.trim(),titles:lines(f.querySelector('.tc-t').value)}}).filter(c=>c.name&&c.titles.length);
  const nn=$('#tc-newn')?.value.trim(),nt=lines($('#tc-newt')?.value||'');if(nn&&nt.length)cats.push({id:slug(nn),name:nn,titles:nt});if(!cats.length){toast('O catálogo precisa de pelo menos uma categoria.');return}await tcSaveCats(cats);closeModal();toast('Catálogo salvo')}return}
 if(!['tq-st','tk-move','tk-adj','tk-adj-send','tk-wait','tk-wait-send','tk-attach','tk-leaders','tk-leaders-save','cr-dl','file-dl'].includes(a))return;stop();
 try{switch(a){
 case'tq-st':ui.tqSt=v;tqSave();refresh();break;
 case'tk-move':b.disabled=true;await tkMove(id,v,($('#tk-note')?.value||'').trim());break;
 case'tk-adj':{const w=$('#tk-adj-box');if(w){w.hidden=false;$('#tk-reason')?.focus()}break}
 case'tk-wait':{const w=$('#tk-wait-box');if(w){w.hidden=false;$('#tk-wait')?.focus()}break}
 case'tk-wait-send':{const r=($('#tk-wait')?.value||'').trim();if(r.length<3){toast('Escreva o que estamos aguardando do cliente.');$('#tk-wait')?.focus();return}b.disabled=true;await tkMove(id,'Aguardando cliente','Aguardando do cliente: '+r,'Aguardando cliente',{waitingWhat:r});break}
 case'tk-adj-send':{const r=($('#tk-reason')?.value||'').trim();if(r.length<3){toast('Descreva o que precisa ser ajustado.');$('#tk-reason')?.focus();return}b.disabled=true;await tkMove(id,'Em ajustes',r,'Ajustes solicitados');break}
 case'tk-attach':{if(!assets){toast('Seu acesso não permite enviar arquivos.');return}let inp=$('#tk-file');if(!inp){inp=document.createElement('input');inp.type='file';inp.id='tk-file';inp.hidden=true;document.body.appendChild(inp);
   inp.addEventListener('change',async()=>{const f=inp.files[0];const tid=inp.dataset.task;inp.value='';if(!f||!tid)return;if(f.size>20*1048576){toast('O arquivo passa de 20 MB. Use um link de referência.');return}
    try{toast('Enviando '+f.name+'…');const r=await assets.upload(f);const t=byId('todos',tid);await put('todos',tid,{...t,files:[...(t.files||[]),{assetId:r.id,name:f.name,type:r.contentType||f.type,at:new Date().toISOString(),by:me.id||''}]});toast('Arquivo anexado')}catch(x){toast('Não foi possível anexar este arquivo.')}})}
  inp.dataset.task=id;inp.click();break}
 case'tk-leaders':if(isAdmin())tkLeadersModal();break;
 case'tk-leaders-save':{if(!isAdmin())return;const on=new Set([...document.querySelectorAll('#tk-lead-chips .chip[aria-pressed="true"]')].map(x=>x.dataset.v));
  for(const m of S.members){if(m.admin)continue;const want=on.has(m.id);if((m.leader===true)!==want)await put('members',m.id,{...m,leader:want})}closeModal();toast('Liderança atualizada');break}
 case'cr-dl':{const c=byId('creatives',id);if(!c?.assetId)return;await fileDl(b,c.assetId,c.fileName||((c.title||'criativo')+(extOf(c.contentType)?'.'+extOf(c.contentType):'')));break}
 case'file-dl':await fileDl(b,b.dataset.asset,b.dataset.name);break}}catch(err){b.disabled=false}},true);
