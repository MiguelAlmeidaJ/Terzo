/* ================= Calendários · produção mensal dos calendários de conteúdo =================
   Coleção nova "calendars": 1 documento por cliente por mês (id cal__<cliente>__<AAAA-MM>, impede duplicidade).
   Copy e artes ficam no mesmo registro (copyId / artId); o filtro por pessoa considera os dois papéis.
   Nada aqui altera tarefas, reuniões ou criativos: Meu dia apenas LÊ os calendários (sem criar compromissos). */
COLS.push('calendars');S.calendars=[];
IC.calendarios='<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M7.5 14h3M13.5 14h3M7.5 17.2h3"/>';
{const i=VIEWS.findIndex(v=>v[0]==='producao');VIEWS.splice(i>=0?i+1:2,0,['calendarios','Calendários','Calendário'])}
const CAL_ST=['pendente','copy','artes','validacao','entregue'];
const CAL_COL={pendente:'Pendentes / não iniciados',copy:'Pré-calendário / copy',artes:'Desenvolvimento das artes',validacao:'Aguardando validação',entregue:'Entregues'};
const CAL_L={pendente:'Pendente',copy:'Pré-calendário (copy)',artes:'Desenvolvimento das artes',validacao:'Aguardando validação',entregue:'Entregue'};
const CAL_TEAM=['Design','Audiovisual','Copywriting','Social media'];
ui.calMonth=thisMonth();ui.calWho='all';ui.calQ='';ui.calInit=false;ui.calAdj='';

(()=>{const st=document.createElement('style');st.textContent=`
.cal-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.cal-kpis .kpi{padding:12px 14px}.cal-kpis .kpi .v{font-size:26px}.cal-kpis .kpi .s .late{color:var(--crit);font-weight:700}
.cal-bar{display:flex;flex-direction:column;gap:10px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px}
.cal-bar .row{gap:10px}
.cal-ppl{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.cal-ppl .chip{display:inline-flex;align-items:center;gap:6px}.cal-ppl .chip .num{font-size:11.5px;opacity:.7}
.cal-board{display:grid;grid-template-columns:repeat(5,minmax(200px,1fr));gap:10px;overflow-x:auto;padding-bottom:6px;align-items:start}
.cal-col{background:var(--surface-2);border-radius:var(--r);padding:10px;display:flex;flex-direction:column;gap:8px;min-height:150px;min-width:0}
.cal-col h3{font-family:var(--f-body);font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);display:flex;justify-content:space-between;gap:6px;align-items:baseline;padding:0 2px 7px;border-bottom:3px solid var(--line);line-height:1.3}
.cal-col h3 .num{font-size:13px;color:var(--ink)}
.cal-col.c-copy h3{border-bottom-color:var(--med)}.cal-col.c-artes h3{border-bottom-color:var(--high)}.cal-col.c-validacao h3{border-bottom-color:var(--accent-btn)}.cal-col.c-entregue h3{border-bottom-color:var(--ok)}
.cal-card{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:9px 10px;display:flex;flex-direction:column;gap:6px;text-align:left;width:100%;min-width:0}
.cal-card:hover{border-color:var(--muted)}
.cal-card.late{box-shadow:inset 3px 0 0 var(--crit)}
.cal-ct{display:flex;align-items:center;gap:8px;min-width:0}.cal-ct b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.cal-who{display:flex;flex-direction:column;gap:1px;font-size:12.5px;color:var(--muted);min-width:0}.cal-who b{color:var(--ink);font-weight:600}
.cal-ft{display:flex;justify-content:space-between;gap:6px;font-size:12px;color:var(--muted)}.cal-ft .late{color:var(--crit);font-weight:700}.cal-ft .adj{color:var(--high);font-weight:700}
.cal-none{font-size:12.5px;color:var(--muted);text-align:center;padding:12px 4px}
.cal-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.cal-steps div{display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:var(--muted);min-width:0}
.cal-steps i{height:6px;border-radius:3px;background:var(--line)}
.cal-steps .done i{background:var(--ink)}.cal-steps .cur i{background:var(--accent-btn)}.cal-steps .cur b{color:var(--ink)}
.cal-steps b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cal-next{background:var(--surface-2);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.cal-next p{margin:0;font-size:14px}
.cal-next .lb{margin-bottom:-4px}
.cal-next textarea,.cal-next input{border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:8px 10px;width:100%;min-width:0}
.cal-next textarea{min-height:56px;resize:vertical}
.cal-hist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.cal-hist li{display:grid;grid-template-columns:118px 1fr;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:13.5px}
.cal-hist li:first-child{border-top:0}
.cal-hist time{font-family:var(--f-mono);font-size:11.5px;color:var(--muted);padding-top:2px}
.cal-hist p{margin:3px 0 0;color:var(--muted);white-space:pre-wrap;overflow-wrap:anywhere}
.cal-gen{display:flex;flex-direction:column}
.cal-gen label.g{display:grid;grid-template-columns:22px 1fr minmax(150px,210px);gap:10px;align-items:center;padding:8px 2px;border-top:1px solid var(--line)}
.cal-gen label.g:first-child{border-top:0}
.cal-gen label.g b{font-size:14px;overflow-wrap:anywhere}.cal-gen label.g small{display:block;font-size:12px;color:var(--muted)}
.cal-gen select{border:1px solid var(--line);background:var(--bg);border-radius:8px;padding:6px 8px;width:100%;min-width:0}
.cal-gen input[type=checkbox]{width:18px;height:18px;accent-color:var(--accent-btn)}
.cal-mine{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
.cal-mine span{font-size:13.5px;color:var(--muted)}.cal-mine span b{color:var(--ink);font-family:var(--f-display);font-size:18px;margin-right:4px}
@media (max-width:1000px){.cal-kpis{grid-template-columns:repeat(3,1fr)}}
@media (max-width:820px){.cal-board{grid-template-columns:repeat(5,minmax(240px,78vw));scroll-snap-type:x mandatory}.cal-col{scroll-snap-align:start}}
@media (max-width:520px){.cal-kpis{grid-template-columns:repeat(2,1fr)}.cal-gen label.g{grid-template-columns:22px 1fr}.cal-gen label.g select{grid-column:2}.cal-hist li{grid-template-columns:1fr;gap:2px}}
`;document.head.appendChild(st)})();

/* ---------- regras ---------- */
const calId=(cid,m)=>'cal__'+cid+'__'+m;
const calMonthL=m=>{const[y,mo]=String(m||'').split('-');return mo?MN[+mo-1].replace(/^./,x=>x.toUpperCase())+' de '+y:'—'};
const calNm=id=>id&&byId('members',id)?byId('members',id).name:'A definir';
const calFn=id=>id&&byId('members',id)?first(id):'a definir';
const calPeople=c=>[...new Set([c.copyId,c.artId].filter(Boolean))];
const calSame=c=>!!c.copyId&&c.copyId===c.artId;
const calLate=c=>c.stage!=='entregue'&&!!c.due&&c.due<today();
const calCanVal=()=>isAdmin()||canApprove();
function calCanEdit(c){if(isAdmin()||canApprove())return true;const mm=myMember();return !!mm&&calPeople(c).includes(mm.id)}
const calDT=iso=>{const d=parseD(iso);return d?pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+(String(iso).length>10?' · '+pad(d.getHours())+':'+pad(d.getMinutes()):''):'—'};
const calOwnersTxt=c=>calSame(c)?'Copy e artes: '+calNm(c.copyId):'Copy: '+calNm(c.copyId)+' · Artes: '+calNm(c.artId);
const calStageOwner=c=>c.stage==='copy'?c.copyId:c.stage==='artes'?c.artId:'';

function calMonths(){const s=new Set(S.calendars.map(c=>c.month).filter(Boolean));const d=new Date();
 for(let i=-3;i<=3;i++){const x=new Date(d.getFullYear(),d.getMonth()+i,1);s.add(x.getFullYear()+'-'+pad(x.getMonth()+1))}
 s.add(ui.calMonth);return [...s].sort()}
function calPeopleOpts(month){const ids=new Set(S.calendars.filter(c=>c.month===month).flatMap(calPeople));
 S.members.filter(m=>CAL_TEAM.includes(m.area)).forEach(m=>ids.add(m.id));
 return [...ids].map(id=>byId('members',id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,'pt'))}
/* designers veem só os próprios calendários; liderança e administradores veem todos */
const calSeeAll=()=>isLeader();
function calVisible(c){if(calSeeAll())return true;const mm=myMember();return !!mm&&calPeople(c).includes(mm.id)}
function calFiltered(){const q=(ui.calQ||'').trim().toLowerCase();
 return S.calendars.filter(c=>c.month===ui.calMonth&&calVisible(c)&&(ui.calWho==='all'||calPeople(c).includes(ui.calWho))&&(!q||cName(c.clientId).toLowerCase().includes(q)))}
const calSort=(a,b)=>(calLate(b)-calLate(a))||(a.due||'9999').localeCompare(b.due||'9999')||cName(a.clientId).localeCompare(cName(b.clientId),'pt');

/* ---------- tela ---------- */
function calCard(c){const late=calLate(c);let who,ft;
 if(c.stage==='copy')who=`<span>Copy · <b>${esc(calNm(c.copyId))}</b></span>`;
 else if(c.stage==='artes')who=`<span>Artes · <b>${esc(calNm(c.artId))}</b></span>${!calSame(c)&&c.copyId?`<span>Copy · ${esc(calFn(c.copyId))}</span>`:''}`;
 else if(calSame(c))who=`<span>Copy e artes · <b>${esc(calNm(c.copyId))}</b></span>`;
 else who=`<span>Copy · <b>${esc(calNm(c.copyId))}</b></span><span>Artes · <b>${esc(calNm(c.artId))}</b></span>`;
 if(c.stage==='validacao')ft=c.approvedAt?`<span>Aprovado ${fD(c.approvedAt)} · falta entregar</span>`:`<span>Enviado em ${fD(c.sentAt)}</span>`;
 else if(c.stage==='entregue')ft=`<span>Entregue em ${fD(c.doneAt)}</span>`;
 else if(late){const n=-daysTo(c.due);ft=`<span class="late">Atrasado ${n} dia${n>1?'s':''} · prazo ${fD(c.due)}</span>`}
 else ft=`<span>${c.due?'Prazo '+fD(c.due):'Sem prazo'}</span>`;
 const adj=c.stage==='artes'&&c.rounds?`<span class="adj">${c.rounds>1?c.rounds+' ajustes':'Em ajuste'}</span>`:'';
 return `<button class="cal-card ${late?'late':''}" data-act="cal-open" data-id="${esc(c.id)}"><span class="cal-ct">${clientLogo(c.clientId,26)}<b>${esc(cName(c.clientId))}</b></span><span class="cal-who">${who}</span><span class="cal-ft">${ft}${adj}</span>${typeof cfCardBadge==='function'?cfCardBadge(c):''}</button>`}

function vCalendarios(){const mm=myMember();if(!calSeeAll())ui.calWho='all';
 if(!ui.calInit&&mode!=='wait'){ui.calInit=true;if(mm&&!isAdmin()&&S.calendars.some(c=>c.month===ui.calMonth&&calPeople(c).includes(mm.id)))ui.calWho=mm.id}
 const all=S.calendars.filter(c=>c.month===ui.calMonth&&calVisible(c));const L=calFiltered();
 const n=s=>L.filter(c=>c.stage===s).length;const late=L.filter(calLate).length;
 const ppl=calPeopleOpts(ui.calMonth);const cnt=id=>all.filter(c=>calPeople(c).includes(id)).length;
 const head=`<div class="head"><div><h1>Calendários</h1><p>Produção mensal dos calendários de conteúdo. Demandas extras (reels, cartões, folders, logos, sites…) continuam em Tarefas.</p></div>
  <div class="row">${isAdmin()?`<button class="btn" data-act="cal-transfer-all">Transferir calendários</button><button class="btn" data-act="${ui.calSelOn?'cal-sel-off':'cal-sel-on'}" aria-pressed="${!!ui.calSelOn}">${ui.calSelOn?'Sair da seleção':'Selecionar para excluir'}</button><button class="btn" data-act="cal-gen">Gerar calendários do mês</button>`:''}<button class="btn primary" data-act="cal-new">+ Novo calendário</button></div></div>`;
 const bar=`<div class="cal-bar"><div class="row">
  <label class="row" style="gap:8px"><span class="lbl" style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700">Mês</span><select class="sel" id="cal-month" aria-label="Mês de referência">${calMonths().map(m=>`<option value="${m}" ${m===ui.calMonth?'selected':''}>${calMonthL(m)}</option>`).join('')}</select></label>
  <input class="search" id="cal-q" type="search" placeholder="Buscar cliente" value="${esc(ui.calQ)}" aria-label="Buscar cliente"></div>
  ${calSeeAll()?'':'<!--'}<div class="cal-ppl" role="group" aria-label="Filtrar por designer"><button class="chip" data-act="cal-who" data-v="all" aria-pressed="${ui.calWho==='all'}">Todos os designers</button>${ppl.map(m=>`<button class="chip" data-act="cal-who" data-v="${m.id}" aria-pressed="${ui.calWho===m.id}">${esc(m.name.split(' ')[0])}<span class="num">${cnt(m.id)}</span></button>`).join('')}</div>${calSeeAll()?'':'-->'}</div>`;
 const who=ui.calWho==='all'?'toda a equipe':first(ui.calWho);
 const kpis=`<div class="cal-kpis">
  <div class="kpi"><div class="l">Previstos</div><div class="v">${L.length}</div><div class="s">${late?`<span class="late">${late} atrasado${late>1?'s':''}</span>`:esc(who)}</div></div>
  <div class="kpi"><div class="l">Não iniciados</div><div class="v">${n('pendente')}</div><div class="s">aguardando início</div></div>
  <div class="kpi"><div class="l">Em produção</div><div class="v">${n('copy')+n('artes')}</div><div class="s">${n('copy')} copy · ${n('artes')} artes</div></div>
  <div class="kpi"><div class="l">Aguardando aprovação</div><div class="v">${L.filter(c=>cfState(c)==='pendente').length}</div><div class="s">${(k=>k?k+' aprovado'+(k>1?'s':'')+', falta entregar':'na área de Aprovações')(L.filter(c=>cfState(c)==='aprovada').length)}</div></div>
  <div class="kpi"><div class="l">Devolvidos</div><div class="v" ${L.some(c=>cfState(c)==='ajustes')?'style="color:var(--crit)"':''}>${L.filter(c=>cfState(c)==='ajustes').length}</div><div class="s">em ajuste com o designer</div></div>
  <div class="kpi"><div class="l">Entregues</div><div class="v">${n('entregue')}</div><div class="s">${L.length?Math.round(n('entregue')/L.length*100):0}% do mês</div></div></div>`;
 if(!all.length)return head+bar+emptyBox('Nenhum calendário cadastrado para '+calMonthL(ui.calMonth),isAdmin()?'Use “Gerar calendários do mês” para criar a partir dos clientes ativos (você confere a lista antes) ou “Novo calendário” para um cliente específico.':'Peça para a liderança gerar os calendários do mês ou cadastre um em “Novo calendário”.');
 const selMode=isAdmin()&&!!ui.calSelOn;const openL=L.filter(c=>c.stage!=='entregue');if(selMode){const ok=new Set(openL.map(c=>c.id));ui.calSel=new Set([...(ui.calSel||[])].filter(x=>ok.has(x)))}
 const selBar=selMode?calSelBar(openL):'';
 const board=`<div class="cal-board">${CAL_ST.map(s=>{const cs=L.filter(c=>c.stage===s).sort(calSort);return `<section class="cal-col c-${s}" aria-label="${CAL_COL[s]}"><h3><span>${CAL_COL[s]}</span><span class="num">${cs.length}</span></h3>${cs.map(c=>selMode?calSelCard(c):calCard(c)).join('')||'<div class="cal-none">Nenhum</div>'}</section>`}).join('')}</div>`;
 return head+bar+kpis+selBar+(L.length?'':`<p style="margin:0;color:var(--muted);font-size:14px">Nenhum calendário com esses filtros em ${calMonthL(ui.calMonth)}.</p>`)+board}

/* ---------- detalhe ---------- */
function calNextBox(c){const can=calCanEdit(c),val=calCanVal();const deny='<p style="color:var(--muted);font-size:13px">Só os responsáveis por este calendário e a liderança movimentam as etapas.</p>';
 const note=`<span class="lb">Observação (opcional, vai para o histórico)</span><textarea id="cal-note" placeholder="Ex.: faltou a data comemorativa do dia 20"></textarea>`;
 const B=(act,v,l,p)=>`<button class="btn ${p?'primary':''}" data-act="${act}" data-id="${esc(c.id)}" ${v?`data-v="${v}"`:''}>${l}</button>`;
 let txt='',btns='',extra='';
 if(c.stage==='pendente'){txt=`Ainda não iniciado. O primeiro passo é o pré-calendário (copy) com <b>${esc(calNm(c.copyId))}</b>.`;btns=B('cal-move','copy','Iniciar pré-calendário',1)+B('cal-move','artes','Copy já pronta, ir para artes')}
 else if(c.stage==='copy'){txt=`Copy em andamento com <b>${esc(calNm(c.copyId))}</b>. Ao concluir, o calendário passa para as artes com <b>${esc(calNm(c.artId))}</b>.`;btns=B('cal-move','artes','Concluir copy',1)+B('cal-move','pendente','Voltar para pendentes')}
 else if(c.stage==='artes'){txt=(c.rounds&&c.lastAdj?`<b>Ajustes pedidos por ${esc(calFn(c.lastAdj.by))}</b> em ${fD(c.lastAdj.at)}: “${esc(c.lastAdj.reason)}”<br>`:'')+`Artes em desenvolvimento com <b>${esc(calNm(c.artId))}</b>. Ao concluir, envie para a validação da liderança.`;btns=B('cal-move','validacao','Concluir artes e enviar para validação',1)+B('cal-move','copy','Voltar para copy')}
 else if(c.stage==='validacao'&&!c.approvedAt){txt=`Enviado para validação em ${calDT(c.sentAt)}.`+(val?'':' Aguardando a liderança.');
  if(val){btns=B('cal-ok','','Aprovar',1)+B('cal-adj','','Devolver para ajustes');
   extra=`<div id="cal-adj-box" ${ui.calAdj===c.id?'':'hidden'} style="display:flex;flex-direction:column;gap:8px"><span class="lb">O que precisa ser ajustado</span><textarea id="cal-reason" placeholder="Descreva os ajustes. O calendário volta para Desenvolvimento das artes."></textarea><div class="row"><button class="btn danger" data-act="cal-adj-send" data-id="${esc(c.id)}">Devolver para as artes</button><button class="btn ghost" data-act="cal-adj-x">Cancelar</button></div></div>`}}
 else if(c.stage==='validacao'){txt=`Aprovado por <b>${esc(calFn(c.approvedBy))}</b> em ${calDT(c.approvedAt)}. Registre a entrega quando o calendário for enviado ao cliente.`;
  btns=`<label class="row" style="gap:8px"><span class="lb" style="margin:0">Entregue em</span><input type="date" id="cal-dlv" value="${today()}" style="width:auto"></label>`+B('cal-dlv','','Registrar entrega',1)+(val?B('cal-adj','','Devolver para ajustes'):'');
  if(val)extra=`<div id="cal-adj-box" ${ui.calAdj===c.id?'':'hidden'} style="display:flex;flex-direction:column;gap:8px"><span class="lb">O que precisa ser ajustado</span><textarea id="cal-reason"></textarea><div class="row"><button class="btn danger" data-act="cal-adj-send" data-id="${esc(c.id)}">Devolver para as artes</button><button class="btn ghost" data-act="cal-adj-x">Cancelar</button></div></div>`}
 else{txt=`Entregue ao cliente em <b>${calDT(c.doneAt)}</b>.`;btns=isAdmin()?B('cal-move','artes','Reabrir (voltar para artes)'):''}
 return `<div class="cal-next"><span class="lb">Próximo passo</span><p>${txt}</p>${can?`${c.stage!=='entregue'?note:''}<div class="row">${btns}${c.stage!=='entregue'?B('cal-obs','','Só registrar observação'):''}</div>${extra}`:deny}</div>`}

function calDetail(id){const c0=byId('calendars',id);if(c0&&!calVisible(c0)){toast('Este calendário é de outro designer.');return}const draw=()=>{const c=byId('calendars',id);if(!c){closeModal();return}
 const idx=CAL_ST.indexOf(c.stage);const sd={pendente:c.createdAt,copy:c.copyDoneAt,artes:c.artDoneAt,validacao:c.approvedAt,entregue:c.doneAt};
 const steps=`<div class="cal-steps">${CAL_ST.map((s,i)=>`<div class="${i<idx?'done':i===idx?'cur':''}"><i></i><b>${CAL_L[s].replace(' (copy)','').replace('Desenvolvimento das artes','Artes').replace('Aguardando validação','Validação')}</b><span>${i<idx&&sd[s]?fD(sd[s]):i===idx?'atual':'&nbsp;'}</span></div>`).join('')}</div>`;
 const info=`<div class="tk-info"><div><span>Etapa</span><b>${CAL_L[c.stage]||c.stage}</b></div><div><span>Mês</span><b>${calMonthL(c.month)}</b></div>
  ${calSame(c)?`<div><span>Copy e artes</span><b>${esc(calNm(c.copyId))}</b></div>`:`<div><span>Responsável pela copy</span><b>${esc(calNm(c.copyId))}</b></div><div><span>Responsável pelas artes</span><b>${esc(calNm(c.artId))}</b></div>`}
  <div><span>Entrega prevista</span><b ${calLate(c)?'style="color:var(--crit)"':''}>${c.due?calDT(c.due)+(calLate(c)?' · atrasado':''):'Sem prazo'}</b></div>
  <div><span>Concluído em</span><b>${c.doneAt?calDT(c.doneAt):'—'}</b></div>${c.rounds?`<div><span>Rodadas de ajuste</span><b>${c.rounds}</b></div>`:''}</div>`;
 const obs=c.notes?`<div class="sec"><h3>Observações</h3><div class="note"><p>${esc(c.notes)}</p></div></div>`:'';
 const tks=S.todos.filter(t=>t.clientId===c.clientId&&t.tipo==='Calendário'&&(String(t.due||t.openedAt||'').slice(0,7)===c.month));
 const tk=tks.length?`<div class="sec"><h3>Tarefas ligadas (aba Tarefas)</h3><div class="list">${tks.map(t=>`<button class="item" data-act="task-open" data-id="${t.id}"><span class="stripe"></span><span><span class="t">${esc(t.title)}</span><span class="m"><span>${esc(mName(t.assigneeId))}</span><span>${esc(tkS(t))}</span></span></span><span class="when">${t.due?fD(t.due):''}</span></button>`).join('')}</div></div>`:'';
 const H=[...(c.history||[])].reverse();
 const hist=`<div class="sec"><h3>Histórico</h3>${H.length?`<ul class="cal-hist">${H.map(h=>`<li><time>${calDT(h.at)}</time><div><b>${esc(calHistTxt(h))}</b>${h.by?` <span style="color:var(--muted)">· ${esc(calFn(h.by))}</span>`:''}${h.note?`<p>${esc(h.note)}</p>`:''}</div></li>`).join('')}</ul>`:'<p style="margin:0;color:var(--muted);font-size:13px">Sem movimentações ainda.</p>'}</div>`;
 openModal(`<div class="mh"><div class="row" style="gap:10px;flex-wrap:nowrap;min-width:0">${clientLogo(c.clientId,38)}<div style="min-width:0"><h2>${esc(cName(c.clientId))}</h2><p style="margin:2px 0 0;color:var(--muted);font-size:13px">Calendário de ${calMonthL(c.month)}</p></div></div><button class="x" data-act="close" aria-label="Fechar">×</button></div>
 <div class="mb">${steps}${info}${calNextBox(c)}${calPostingPanel(c)}${obs}${tk}${hist}${stamp(c)}</div>
 <div class="mf">${calCanEdit(c)?`<button class="btn" data-act="cal-edit" data-id="${esc(c.id)}">Editar responsáveis, prazo e observações</button>`:''}${caLinkButton('calendar',c)}${isAdmin()?`${c.stage!=='entregue'?`<button class="btn cal-del" data-act="cal-del" data-id="${esc(c.id)}">Excluir</button>`:''}<button class="btn" data-act="cal-transfer" data-id="${esc(c.id)}">Transferir</button>`:''}<span class="spacer"></span><button class="btn" data-act="close">Fechar</button></div>`,{rerender:draw})};draw()}
function calHistTxt(h){const L=s=>CAL_L[s]||s;
 return {criado:'Calendário criado',ajuste:'Devolvido para ajustes',aprovado:'Aprovado pela liderança',entregue:'Entregue ao cliente',obs:'Observação',edit:'Dados atualizados',transfer:'Transferido de designer',reaberto:'Reaberto'}[h.k]||(h.from&&h.to?L(h.from)+' → '+L(h.to):L(h.to))}

/* ---------- gravação ---------- */
async function calSave(c,patch,h){const mm=myMember();const rec={...c,...patch};
 if(h)rec.history=[...(c.history||[]),{at:new Date().toISOString(),by:mm?.id||'',...h}];delete rec.id;await put('calendars',c.id,rec);return rec}
async function calMove(id,to,note){const c=byId('calendars',id);if(!c||c.stage===to)return;if(!calCanEdit(c)){toast('Só os responsáveis e a liderança movimentam este calendário.');return}
 const now=new Date().toISOString(),p={stage:to};
 if(c.stage==='pendente'&&to!=='pendente'&&!c.startedAt)p.startedAt=now;
 if(c.stage==='copy'&&to==='artes')p.copyDoneAt=now;
 if(c.stage==='pendente'&&to==='artes'&&!c.copyDoneAt)p.copyDoneAt=now;
 if(to==='validacao'){p.artDoneAt=now;p.sentAt=now;p.approvedAt='';p.approvedBy=''}
 if(c.stage==='entregue'){p.doneAt='';p.approvedAt='';p.approvedBy=''}
 await calSave(c,p,{k:c.stage==='entregue'?'reaberto':'etapa',from:c.stage,to,note:note||''});
 toast(CAL_L[to]+' · '+cName(c.clientId));
 if(to==='validacao')sysPost(`📅 **${actor()}** enviou o calendário de **${cName(c.clientId)}** (${calMonthL(c.month)}) para validação`,{act:'cal-open',id})}

/* ---------- formulários ---------- */
function calForm(c,pre){const isNew=!c;const base=c||{month:ui.calMonth,stage:'pendente',...(pre||{})};
 const mo=[{v:'',l:'A definir'},...S.members.filter(m=>m.area!=='Comercial'||calPeople(base).includes(m.id)).sort((a,b)=>a.name.localeCompare(b.name,'pt')).map(m=>({v:m.id,l:m.name+' · '+m.area}))];
 const values={...base,artId:!base.artId||calSame(base)?'__same':base.artId,stage:base.stage};
 const fields=[];
 if(isNew)fields.push({k:'clientId',l:'Cliente',t:'select',o:S.clients.filter(x=>x.stage==='Fechado'||x.id===base.clientId).sort((a,b)=>a.name.localeCompare(b.name,'pt')).map(x=>({v:x.id,l:x.name})),empty:'Escolha o cliente',req:1},{k:'month',l:'Mês de referência',t:'month',req:1});
 fields.push({k:'copyId',l:'Responsável pela copy',t:'select',o:mo},{k:'artId',l:'Responsável pelas artes',t:'select',o:[{v:'__same',l:'Mesma pessoa da copy'},...mo.filter(o=>o.v)],hint:'Na maioria dos casos a mesma pessoa faz os dois.'},
  {k:'due',l:'Data prevista de entrega',t:'date'});
 if(!isNew&&isAdmin())fields.push({k:'stage',l:'Etapa (correção manual)',t:'select',o:CAL_ST.map(s=>({v:s,l:CAL_L[s]})),hint:'Use os botões do calendário para o fluxo normal; aqui é só para corrigir.'});
 fields.push({k:'notes',l:'Observações',t:'textarea',full:1,ph:'Datas comemorativas, campanhas do mês, pedidos do cliente…'});
 formModal({title:isNew?'Novo calendário':'Editar calendário · '+cName(base.clientId),values,fields,back:isNew?null:()=>calDetail(c.id),
  onSave:async v=>{const art=v.artId==='__same'?v.copyId:v.artId;
   if(isNew){if(!calBuildPosts(byId('clients',v.clientId),v.month).length){toast('Defina os dias de postagem no cadastro do cliente antes de criar o calendário.');throw new Error('postingDays')}if(!/^\d{4}-\d{2}$/.test(v.month)){toast('Escolha o mês de referência.');throw new Error('m')}
    const id=calId(v.clientId,v.month);if(byId('calendars',id)){toast('Já existe o calendário de '+cName(v.clientId)+' em '+calMonthL(v.month)+'.');throw new Error('dup')}
    const mm=myMember();await put('calendars',id,{clientId:v.clientId,month:v.month,copyId:v.copyId,artId:art,due:v.due,notes:v.notes,posts:calBuildPosts(byId('clients',v.clientId),v.month),stage:'pendente',rounds:0,createdAt:new Date().toISOString(),
     history:[{at:new Date().toISOString(),by:mm?.id||'',k:'criado',to:'pendente',note:calOwnersTxt({copyId:v.copyId,artId:art})}]});
    ui.calMonth=v.month;toast('Calendário criado · '+cName(v.clientId));setTimeout(()=>calDetail(id),60);return}
   const ch=[];if(c.copyId!==v.copyId||c.artId!==art)ch.push(calOwnersTxt(c)+' → '+calOwnersTxt({copyId:v.copyId,artId:art}));
   if((c.due||'')!==v.due)ch.push('Prazo: '+(c.due?fD(c.due):'sem prazo')+' → '+(v.due?fD(v.due):'sem prazo'));
   if((c.notes||'')!==v.notes)ch.push('Observações atualizadas');
   const p={copyId:v.copyId,artId:art,due:v.due,notes:v.notes};const hs=[];
   if(ch.length)hs.push({k:'edit',note:ch.join('\n')});
   if(v.stage&&v.stage!==c.stage){p.stage=v.stage;hs.push({k:'etapa',from:c.stage,to:v.stage,note:'Correção manual'});if(v.stage!=='entregue')p.doneAt=c.stage==='entregue'?'':c.doneAt||'';if(v.stage==='entregue'&&!c.doneAt)p.doneAt=today()}
   const mm=myMember();const now=new Date().toISOString();const rec={...c,...p,history:[...(c.history||[]),...hs.map(h=>({at:now,by:mm?.id||'',...h}))]};delete rec.id;
   await put('calendars',c.id,rec);toast('Calendário atualizado')},
  onDelete:!isNew&&isAdmin()?async()=>{await del('calendars',c.id);toast('Calendário removido')}:null,delLabel:'Excluir calendário'})}

const calNorm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
function calSuggest(cl,month){const [y,m]=month.split('-').map(Number);const prev=new Date(y,m-2,1);const pm=prev.getFullYear()+'-'+pad(prev.getMonth()+1);
 const pc=byId('calendars',calId(cl.id,pm));if(pc&&(pc.copyId||pc.artId))return{copyId:pc.copyId,artId:pc.artId||pc.copyId,from:'mesmos responsáveis de '+calMonthL(pm)};
 const rd=relDesigner(cl);if(rd)return{copyId:rd,artId:rd,from:cl.designerId?'designer responsável pela conta':'designer do calendário no cadastro do cliente'};
 const mt=String(cl.packageNotes||'').match(/Calend[áa]rio:\s*([^·\n]+)/i);if(!mt)return null;const nm=calNorm(mt[1]);
 const mem=S.members.find(x=>calNorm(x.name)===nm)||S.members.find(x=>nm&&calNorm(x.name).startsWith(nm.split(' ')[0])&&calNorm(x.name).split(' ').pop()===nm.split(' ').pop());
 return mem?{copyId:mem.id,artId:mem.id,from:'designer do calendário no cadastro do cliente'}:null}
function calGenModal(){if(!isAdmin())return;const month=ui.calMonth;
 const cls=S.clients.filter(x=>x.stage==='Fechado').sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 const mo=S.members.filter(m=>m.area!=='Comercial').sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 const rows=cls.map(cl=>{const ex=byId('calendars',calId(cl.id,month));const sg=ex?null:calSuggest(cl,month);const scheduled=calBuildPosts(cl,month).length;
  if(ex)return `<label class="g" style="opacity:.6"><input type="checkbox" disabled checked><span><b>${esc(cl.name)}</b><small>já cadastrado · ${esc(CAL_L[ex.stage])}</small></span><span style="font-size:12.5px;color:var(--muted)">${esc(calSame(ex)?calFn(ex.copyId):calFn(ex.copyId)+' / '+calFn(ex.artId))}</span></label>`;
  return `<label class="g"><input type="checkbox" class="cal-g-ck" data-c="${cl.id}" ${scheduled?(sg?'checked':''):'disabled'}><span><b>${esc(cl.name)}</b><small>${scheduled?(sg?esc('Sugestão: '+sg.from):'Sem responsável definido no cadastro'):'Configure os dias de postagem no cadastro'} · ${scheduled} postagens</small></span><select class="cal-g-who" data-c="${cl.id}" aria-label="Responsável por ${esc(cl.name)}"><option value="">A definir</option>${mo.map(m=>`<option value="${m.id}" ${sg&&sg.copyId===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select></label>`}).join('');
 openModal(`<div class="mh"><div><h2>Gerar calendários · ${calMonthL(month)}</h2><p style="margin:2px 0 0;color:var(--muted);font-size:13px">Clientes ativos (fechados). Nada é criado até você confirmar.</p></div><button class="x" data-act="close" aria-label="Fechar">×</button></div>
 <div class="mb"><p style="margin:0;font-size:14px;color:var(--muted)">Marque os clientes que têm calendário neste mês e confira o responsável. Ele fica com a copy e as artes; se forem pessoas diferentes, ajuste depois no próprio calendário.</p>
  <label class="fld" style="max-width:260px"><span>Data prevista de entrega (todos)</span><input type="date" id="cal-g-due"><small>Opcional. Pode ser ajustada em cada calendário.</small></label>
  ${cls.length?`<div class="cal-gen">${rows}</div>`:emptyBox('Nenhum cliente ativo','Clientes aparecem aqui quando estão na etapa “Fechado”.')}</div>
 <div class="mf"><button class="btn" data-act="close">Cancelar</button><span class="spacer"></span><button class="btn primary" data-act="cal-gen-save">Criar calendários marcados</button></div>`)}

/* ---------- Meu dia e navegação (somente leitura, sem criar compromissos) ---------- */
function calToday(mm,out){if(!mm)return;const t0=today();
 S.calendars.forEach(c=>{if(c.stage==='entregue')return;const own=calStageOwner(c);
  const mine=c.stage==='pendente'?calPeople(c).includes(mm.id):c.stage==='validacao'?false:own===mm.id;
  if(mine&&c.stage==='artes'&&c.rounds&&(c.history||[]).slice(-1)[0]?.k==='ajuste')out.push({k:'Ajuste de calendário',cls:'p-critico',t:'Calendário de '+calMonthL(c.month)+(c.lastAdj?.reason?' · “'+String(c.lastAdj.reason).slice(0,90)+(String(c.lastAdj.reason).length>90?'…':'')+'”':''),c:c.clientId,due:t0,late:calLate(c),act:['cal-open',c.id],extra:'pedido '+fD(c.lastAdj?.at)});
  else if(mine&&c.due&&c.due<=t0)out.push({k:'Calendário',cls:'p-medio',t:'Calendário de '+calMonthL(c.month)+' · '+(c.stage==='pendente'?'não iniciado':c.stage==='copy'?'copy':'artes'),c:c.clientId,due:c.due,late:c.due<t0,act:['cal-open',c.id]});
  if(c.stage==='validacao'&&!c.approvedAt&&isApprover(mm))out.push({k:'Validar calendário',cls:'p-alto',t:'Calendário de '+calMonthL(c.month)+' · enviado por '+calFn(c.artId),c:c.clientId,due:t0,late:false,act:['cal-open',c.id],extra:'enviado '+fD(c.sentAt)});
  if(c.stage==='validacao'&&c.approvedAt&&c.artId===mm.id)out.push({k:'Entregar calendário',cls:'p-ok',t:'Calendário de '+calMonthL(c.month)+' aprovado · registrar a entrega ao cliente',c:c.clientId,due:t0,late:false,act:['cal-open',c.id]})})}
function calBadge(mm){if(mode==='wait')return 0;const t0=today();let n=0;
 if(mm&&isApprover(mm))n+=S.calendars.filter(c=>c.stage==='validacao'&&!c.approvedAt).length;
 if(mm)n+=S.calendars.filter(c=>c.stage!=='entregue'&&c.stage!=='validacao'&&((c.stage==='pendente'?calPeople(c).includes(mm.id):calStageOwner(c)===mm.id))&&((c.due&&c.due<t0)||(c.stage==='artes'&&(c.history||[]).slice(-1)[0]?.k==='ajuste'))).length;
 return n}
function calAfter(){if(ui.view!=='meudia')return;const mm=myMember();if(!mm)return;const t=$('#main .today');if(!t)return;
 const m=thisMonth();const L=S.calendars.filter(c=>c.month===m&&calPeople(c).includes(mm.id));if(!L.length)return;
 const n=s=>L.filter(c=>c.stage===s).length;
 t.insertAdjacentHTML('afterend',`<section class="panel"><h2>Meus calendários · ${calMonthL(m)}<button class="btn sm" data-act="cal-mine">Abrir Calendários</button></h2><div class="cal-mine"><span><b>${L.length}</b>no mês</span><span><b>${n('pendente')}</b>pendentes</span><span><b>${n('copy')+n('artes')}</b>em produção</span><span><b>${n('validacao')}</b>em validação</span><span><b>${n('entregue')}</b>entregues</span>${L.filter(calLate).length?`<span style="color:var(--crit)"><b style="color:var(--crit)">${L.filter(calLate).length}</b>atrasado${L.filter(calLate).length>1?'s':''}</span>`:''}</div></section>`)}

/* ---------- eventos ---------- */
document.addEventListener('change',e=>{if(e.target.id==='cal-month'){ui.calMonth=e.target.value;refresh()}});
document.addEventListener('input',e=>{if(e.target.id==='cal-q'){ui.calQ=e.target.value;refresh()}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b||!String(b.dataset.act).startsWith('cal-'))return;const a=b.dataset.act,id=b.dataset.id,v=b.dataset.v;
 e.stopPropagation();e.preventDefault();const note=()=>($('#cal-note')?.value||'').trim();
 try{switch(a){
 case'cal-who':ui.calWho=v;refresh();break;
 case'cal-mine':{const mm=myMember();ui.calMonth=thisMonth();ui.calWho=mm?mm.id:'all';ui.calInit=true;go('calendarios');break}
 case'cal-open':ui.calAdj='';calDetail(id);break;
 case'cal-new':calForm(null);break;
 case'cal-edit':{const c=byId('calendars',id);if(c&&calCanEdit(c))calForm(c);break}
 case'cal-gen':calGenModal();break;
 case'cal-transfer':if(isAdmin())calTransferForm(id);break;
 case'cal-transfer-all':if(isAdmin())calTransferAll();break;
 case'cal-del':if(isAdmin())calDelOne(id,b);break;
 case'cal-del-all':if(isAdmin())calDeleteAll();break;
 case'cal-sel-on':if(isAdmin()){ui.calSelOn=true;ui.calSel=new Set();refresh()}break;
 case'cal-sel-off':ui.calSelOn=false;ui.calSel=new Set();refresh();break;
 case'cal-pick':if(isAdmin()&&ui.calSelOn){const S2=ui.calSel||(ui.calSel=new Set());S2.has(id)?S2.delete(id):S2.add(id);refresh()}break;
 case'cal-sel-all':if(isAdmin()){ui.calSel=new Set(calFiltered().filter(c=>c.stage!=='entregue').map(c=>c.id));refresh()}break;
 case'cal-sel-none':ui.calSel=new Set();refresh();break;
 case'cal-sel-del':if(isAdmin())calSelDelete(b);break;
 case'cal-move':b.disabled=true;await calMove(id,v,note());break;
 case'cal-obs':{const c=byId('calendars',id);const t=note();if(!t){toast('Escreva a observação.');$('#cal-note')?.focus();return}if(!c||!calCanEdit(c))return;await calSave(c,{},{k:'obs',note:t});toast('Observação registrada');break}
 case'cal-ok':toast('A aprovação dos calendários acontece na área de Aprovações.');break
 case'cal-adj':{ui.calAdj=id;const w=$('#cal-adj-box');if(w){w.hidden=false;$('#cal-reason')?.focus()}break}
 case'cal-adj-x':{ui.calAdj='';const w=$('#cal-adj-box');if(w)w.hidden=true;break}
 case'cal-adj-send':toast('A aprovação dos calendários acontece na área de Aprovações.');break
 case'cal-dlv':{const c=byId('calendars',id);if(!c||!(calCanEdit(c)))return;if(c.stage!=='validacao'||!c.approvedAt){toast('Registre a entrega depois da aprovação da validação final.');return}const d=$('#cal-dlv')?.value||today();b.disabled=true;const mm=myMember();
  await calSave(c,{stage:'entregue',doneAt:d,deliveredBy:mm?.id||''},{k:'entregue',from:'validacao',to:'entregue',note:note()});toast('Entrega registrada · '+cName(c.clientId));
  sysPost(`✅ Calendário de **${cName(c.clientId)}** (${calMonthL(c.month)}) entregue ao cliente`,{act:'cal-open',id});break}
 case'cal-gen-save':{if(!isAdmin())return;const month=ui.calMonth;const due=$('#cal-g-due')?.value||'';const mm=myMember();const now=new Date().toISOString();
  const pick=[...document.querySelectorAll('.cal-g-ck:checked')].map(x=>x.dataset.c).filter(cid=>!byId('calendars',calId(cid,month)));
  if(!pick.length){toast('Marque pelo menos um cliente.');return}b.disabled=true;let n=0;
  for(const cid of pick){const who=document.querySelector(`.cal-g-who[data-c="${cid}"]`)?.value||'';
   await put('calendars',calId(cid,month),{clientId:cid,month,copyId:who,artId:who,due,notes:'',posts:calBuildPosts(byId('clients',cid),month),stage:'pendente',rounds:0,createdAt:now,history:[{at:now,by:mm?.id||'',k:'criado',to:'pendente',note:'Gerado com os calendários do mês · '+calOwnersTxt({copyId:who,artId:who})}]});n++}
  closeModal();toast(n+' calendário'+(n>1?'s':'')+' criado'+(n>1?'s':'')+' em '+calMonthL(month));break}
 }}catch(err){b.disabled=false}},true);

/* ================= sem IA: a plataforma não usa geração por IA (preparação para o servidor próprio) ================= */
function aiSection(){return ''}
async function getSample(){return null}
async function runAI(){}

/* ---------- transferência de calendários (administradores) ---------- */
const calTeamOpts=()=>S.members.filter(m=>m.area!=='Comercial').sort((a,b)=>a.name.localeCompare(b.name,'pt')).map(m=>({v:m.id,l:m.name+' · '+m.area}));
function calTransferForm(id){const c=byId('calendars',id);if(!c)return;const same=calSame(c);
 formModal({title:'Transferir calendário · '+cName(c.clientId),back:()=>calDetail(id),values:{role:same?'ambos':'ambos',to:''},fields:[
  {k:'role',l:'O que transferir',t:'select',o:same?[{v:'ambos',l:'Copy e artes ('+calNm(c.copyId)+')'},{v:'copy',l:'Só a copy'},{v:'artes',l:'Só as artes'}]:[{v:'ambos',l:'Copy ('+calNm(c.copyId)+') e artes ('+calNm(c.artId)+')'},{v:'copy',l:'Só a copy ('+calNm(c.copyId)+')'},{v:'artes',l:'Só as artes ('+calNm(c.artId)+')'}],full:1},
  {k:'to',l:'Para quem',t:'select',o:calTeamOpts(),empty:'Escolha o designer',req:1,full:1,hint:'A etapa, o prazo e o histórico continuam os mesmos. A transferência fica registrada no histórico.'}],
  onSave:async v=>{const cur=byId('calendars',id);const p={copyId:cur.copyId,artId:cur.artId};if(v.role!=='artes')p.copyId=v.to;if(v.role!=='copy')p.artId=v.to;
   if(p.copyId===cur.copyId&&p.artId===cur.artId){toast('Essa pessoa já é a responsável.');throw new Error('same')}
   await calSave(cur,p,{k:'transfer',note:calOwnersTxt(cur)+' → '+calOwnersTxt(p)});toast('Calendário transferido para '+calFn(v.to));
   sysPost(`🔁 **${actor()}** transferiu o calendário de **${cName(cur.clientId)}** (${calMonthL(cur.month)}) para **${first(v.to)}**`,{act:'cal-open',id})}})}
function calTransferAll(){const months=calMonths();const ppl=[...new Set(S.calendars.flatMap(calPeople))].map(x=>byId('members',x)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 formModal({title:'Transferir calendários entre designers',values:{from:ui.calWho!=='all'?ui.calWho:'',to:'',month:ui.calMonth,which:'abertos',role:'ambos'},fields:[
  {k:'from',l:'De',t:'select',o:ppl.map(m=>({v:m.id,l:m.name})),empty:'Escolha o designer',req:1},{k:'to',l:'Para',t:'select',o:calTeamOpts(),empty:'Escolha o designer',req:1},
  {k:'month',l:'Mês',t:'select',o:months.map(m=>({v:m,l:calMonthL(m)}))},{k:'which',l:'Quais',t:'select',o:[{v:'abertos',l:'Só os não entregues'},{v:'todos',l:'Todos do mês'}]},
  {k:'role',l:'Papel',t:'select',o:[{v:'ambos',l:'Copy e artes'},{v:'copy',l:'Só a copy'},{v:'artes',l:'Só as artes'}],full:1,hint:'Use quando alguém sair de férias ou mudar de carteira. Cada calendário registra a transferência no histórico.'}],
  onSave:async v=>{if(v.from===v.to){toast('Escolha pessoas diferentes.');throw new Error('same')}
   const L=S.calendars.filter(c=>c.month===v.month&&(v.which==='todos'||c.stage!=='entregue')&&((v.role!=='artes'&&c.copyId===v.from)||(v.role!=='copy'&&c.artId===v.from)));
   if(!L.length){toast('Nenhum calendário de '+calFn(v.from)+' nesse filtro.');throw new Error('none')}
   for(const c of L){const p={copyId:c.copyId,artId:c.artId};if(v.role!=='artes'&&c.copyId===v.from)p.copyId=v.to;if(v.role!=='copy'&&c.artId===v.from)p.artId=v.to;await calSave(c,p,{k:'transfer',note:calOwnersTxt(c)+' → '+calOwnersTxt(p)})}
   toast(L.length+' calendário'+(L.length>1?'s':'')+' transferido'+(L.length>1?'s':'')+' para '+calFn(v.to));
   sysPost(`🔁 **${actor()}** transferiu ${L.length} calendário${L.length>1?'s':''} de **${first(v.from)}** para **${first(v.to)}** (${calMonthL(v.month)})`)}})}

/* ---------- exclusão (só administrador, só calendários não entregues) ---------- */
async function calDelRec(c){if(!isAdmin()||!c||c.stage==='entregue')return false;await del('calendars',c.id);return true}
async function calDelOne(id,btn){const c=byId('calendars',id);if(!c)return;
 if(c.stage==='entregue'){toast('Calendários entregues não podem ser excluídos.');return}
 if(!btn.classList.contains('armed')){btn.classList.add('armed');btn.textContent='Confirmar exclusão';setTimeout(()=>{if(btn.isConnected){btn.classList.remove('armed');btn.textContent='Excluir'}},4000);return}
 try{if(await calDelRec(c)){closeModal();toast('Calendário de '+cName(c.clientId)+' excluído.');
  sysPost(`🗑 **${actor()}** excluiu o calendário de **${cName(c.clientId)}** (${calMonthL(c.month)}), que estava em "${CAL_L[c.stage]||c.stage}" com ${calOwnersTxt(c)}`);refresh()}}catch(e){}}
function calDeleteAll(){const open=S.calendars.filter(c=>c.stage!=='entregue');
 if(!open.length){toast('Não há calendários em aberto.');return}
 const months=[...new Set(open.map(c=>c.month).filter(Boolean))].sort().reverse();
 const ppl=[...new Set(open.flatMap(calPeople))].map(x=>byId('members',x)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 const nOf=m=>open.filter(c=>c.month===m).length;
 formModal({title:'Excluir calendários em aberto',values:{month:months.includes(ui.calMonth)?ui.calMonth:months[0],who:'all',stage:'all',ok:''},fields:[
  {k:'month',l:'Mês',t:'select',o:months.map(m=>({v:m,l:calMonthL(m)+' · '+nOf(m)+' em aberto'}))},
  {k:'who',l:'Designer',t:'select',o:[{v:'all',l:'Todos os designers'},...ppl.map(m=>({v:m.id,l:m.name}))]},
  {k:'stage',l:'Etapa',t:'select',o:[{v:'all',l:'Todas as etapas em aberto'},...CAL_ST.filter(s=>s!=='entregue').map(s=>({v:s,l:CAL_L[s]}))],full:1},
  {k:'ok',l:'Confirmação',t:'select',o:[{v:'sim',l:'Entendi: os calendários e o histórico deles serão apagados'}],empty:'Confirme para excluir',req:1,full:1,hint:'Calendários já entregues nunca são excluídos. As tarefas da aba Tarefas não são afetadas.'}],
  onSave:async v=>{if(v.ok!=='sim'){toast('Confirme a exclusão.');throw new Error('ok')}
   const L=open.filter(c=>c.month===v.month&&(v.who==='all'||calPeople(c).includes(v.who))&&(v.stage==='all'||c.stage===v.stage)).filter(c=>byId('calendars',c.id));
   if(!L.length){toast('Nenhum calendário em aberto nesse filtro.');throw new Error('none')}
   let n=0;for(const c of L){try{if(await calDelRec(c))n++}catch(e){}}
   toast(n+' calendário'+(n>1?'s':'')+' excluído'+(n>1?'s':'')+(n<L.length?' · '+(L.length-n)+' não puderam ser excluídos':''));
   if(n)sysPost(`🗑 **${actor()}** excluiu ${n} calendário${n>1?'s':''} em aberto de ${calMonthL(v.month)}${v.who!=='all'?' de **'+first(v.who)+'**':''}: ${L.slice(0,12).map(c=>cName(c.clientId)).join(', ')}${L.length>12?'…':''}`)}});const sb=$('#mform button[type=submit]');if(sb){sb.textContent='Excluir calendários';sb.classList.add('cal-del-go')}}
(()=>{const st=document.createElement('style');st.textContent='.btn.cal-del{color:var(--crit)}.btn.cal-del-go{background:var(--crit);border-color:var(--crit);color:#fff}.btn.cal-del.armed{background:var(--crit);color:#fff;border-color:var(--crit)}';(document.body||document.head).appendChild(st)})();

/* ---------- seleção em massa para excluir (administrador) ---------- */
function calSelCard(c){const can=c.stage!=='entregue';const on=can&&ui.calSel?.has(c.id);
 const html=calCard(c).replace('data-act="cal-open"',can?`data-act="cal-pick" aria-pressed="${on}"`:'data-act="cal-open" aria-disabled="true" title="Calendários entregues não podem ser excluídos"');
 return html.replace('<button class="cal-card','<button class="cal-card sel '+(on?'picked ':'')+(can?'':'locked '));}
function calSelBar(openL){const n=ui.calSel?.size||0;const allOn=openL.length>0&&n===openL.length;
 return `<div class="cal-selbar" role="region" aria-label="Seleção de calendários"><span><b>${n}</b> de ${openL.length} calendário${openL.length===1?'':'s'} em aberto selecionado${n===1?'':'s'}</span>
 <button class="btn" data-act="${allOn?'cal-sel-none':'cal-sel-all'}" ${openL.length?'':'disabled'}>${allOn?'Desmarcar todos':'Selecionar todos'}</button>
 <span class="spacer"></span><button class="btn cal-del-go" data-act="cal-sel-del" ${n?'':'disabled'}>Excluir selecionados${n?' ('+n+')':''}</button></div>`}
async function calSelDelete(btn){const L=[...(ui.calSel||[])].map(id=>byId('calendars',id)).filter(c=>c&&c.stage!=='entregue');if(!L.length)return;
 if(!btn.classList.contains('armed')){btn.classList.add('armed');btn.textContent='Confirmar: excluir '+L.length+' calendário'+(L.length>1?'s':'');setTimeout(()=>{if(btn.isConnected){btn.classList.remove('armed');btn.textContent='Excluir selecionados ('+L.length+')'}},5000);return}
 btn.disabled=true;let n=0;for(const c of L){try{if(await calDelRec(c))n++}catch(e){}}
 ui.calSel=new Set();ui.calSelOn=false;
 toast(n+' calendário'+(n>1?'s':'')+' excluído'+(n>1?'s':'')+(n<L.length?' · '+(L.length-n)+' não puderam ser excluídos':''));
 if(n)sysPost(`🗑 **${actor()}** excluiu ${n} calendário${n>1?'s':''} em aberto de ${calMonthL(ui.calMonth)}: ${L.slice(0,12).map(c=>cName(c.clientId)).join(', ')}${L.length>12?'…':''}`);refresh()}
(()=>{const st=document.createElement('style');st.textContent=`
.cal-selbar{position:sticky;top:8px;z-index:20;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;background:var(--surface);border:1px solid var(--crit);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.08);font-size:14px}
.cal-selbar .btn[disabled]{opacity:.45;pointer-events:none}
.cal-card.sel{position:relative;padding-left:40px}
.cal-card.sel::before{content:"";position:absolute;left:12px;top:14px;width:18px;height:18px;border:2px solid var(--line);border-radius:5px;background:var(--surface)}
.cal-card.sel.picked{outline:2px solid var(--crit);outline-offset:-2px}
.cal-card.sel.picked::before{background:var(--crit);border-color:var(--crit);content:"✓";color:#fff;font-size:12px;font-weight:800;display:grid;place-items:center;line-height:1}
.cal-card.sel.locked{opacity:.5}.cal-card.sel.locked::before{border-style:dashed}
`;(document.body||document.head).appendChild(st)})();
