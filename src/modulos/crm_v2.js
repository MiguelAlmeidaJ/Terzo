
/* ================= v2 · acesso por perfil, Meu dia e Painel enxutos, agenda com status ================= */
{const i=VIEWS.findIndex(v=>v[0]==='planejamento');if(i>=0)VIEWS.splice(i,1)}
const VIEWS_COM=['meudia','painel','clientes','estrategia','aprovacoes','agenda'];
function viewOk(k){if(!VIEWS.some(v=>v[0]===k))return false;if(mode==='wait')return true;const mm=myMember();
 if(mm&&Array.isArray(mm.views)&&mm.views.length)return mm.views.includes(k);
 if(mm&&mm.area==='Comercial'&&!isAdmin())return VIEWS_COM.includes(k);
 if(['producao','equipe'].includes(k))return isAdmin();return true}

/* ---------- Meu dia: sem radar, sem "em execução agora", sem catálogo ---------- */
function vMeuDia(){const mm=myMember();
 if(!mm)return `<div class="head"><div><h1>Meu dia</h1><p>Suas tarefas, contatos, reuniões e criativos em um só lugar.</p></div></div>`+(me.id&&mode==='db'?emptyBox('Vincule a sua conta para ver o seu dia','Escolha o seu nome no quadro acima. Se ele não aparecer, toque em “Conta não vinculada” no menu.'):emptyBox('“Meu dia” funciona quando o CRM é aberto pelo link compartilhado','Cada pessoa entra com a própria conta do Claude e o sistema reconhece quem é.'));
 const now=new Date();
 const meets=S.meetings.filter(m=>!mCxl(m)&&(m.memberIds||[]).includes(mm.id)&&parseD(m.when)&&parseD(m.when)>=new Date(now-36e5)&&parseD(m.when)<=new Date(+now+7*864e5)).sort((a,b)=>parseD(a.when)-parseD(b.when));
 const crs=S.creatives.filter(c=>c.memberId===mm.id&&['Em criação','Ajustes solicitados','Em aprovação'].includes(c.status)).sort((a,b)=>(a.status!=='Ajustes solicitados')-(b.status!=='Ajustes solicitados'));
 const myC=S.clients.filter(c=>c.stage==='Fechado'?relOwner(c)===mm.id:c.ownerId===mm.id&&c.stage!=='Perdido');
 const wq=waiting().filter(w=>w.ownerId===mm.id||myC.some(c=>c.id===w.clientId));
 const l0=weekLoad(mm.id,0),c0=cap(mm);
 return `<div class="head"><div class="row" style="flex-wrap:nowrap">${meAv(mm,48)}<div><h1>Olá, ${esc(mm.name)}</h1><p>${esc(mm.role||mm.area)}${mm.hideRank?'':` · <span class="${capCls(l0,c0)==='over'?'when late':''}">${l0}/${c0} pontos nesta semana</span>`}</p></div></div>
  <div class="row"><button class="btn" data-act="profile" data-id="${mm.id}">${mm.photoId?'Meu perfil':'Adicionar minha foto'}</button><button class="btn" data-act="new-meeting" data-scope="interna">+ Interna</button><button class="btn primary" data-act="cr-upload">↑ Enviar arte</button></div></div>
 ${todayBlock(mm)}
 ${rankPanel()}
 <div class="grid2">
  <section class="panel"><h2>Minhas reuniões · 7 dias <span class="sub">${meets.length}</span></h2><div class="list">${meets.length?meets.map(meetingRow).join(''):emptyBox('Agenda livre','Nenhuma reunião com você nos próximos 7 dias.')}</div></section>
  <section class="panel"><h2>Meus criativos em andamento <span class="sub">${crs.length}</span></h2>${crs.length?`<div class="mini" style="flex-wrap:wrap">${crs.slice(0,12).map(x=>`<button data-act="open-creative" data-id="${x.id}" title="${esc(x.title)} · ${esc(x.status)}" style="${x.status==='Ajustes solicitados'?'outline:2px solid var(--crit)':''}">${crKind(x)==='img'?`<img src="${esc(crUrl(x))}" alt="" loading="lazy" data-fb="1">`:kindLabel[crKind(x)]}</button>`).join('')}</div><p style="font-size:12px;color:var(--muted);margin:8px 0 0">Contorno vermelho: ajuste pedido.</p>`:emptyBox('Nada em aberto','Os criativos em que você aparece como “Quem criou” ficam aqui até serem aprovados.')}</section>
 </div>
 ${myC.length||wq.length?`<div class="grid2"><section class="panel"><h2>Cobrar dos meus clientes <span class="sub">${wq.length}</span></h2><div class="list">${wq.length?wq.slice(0,8).map(waitRow).join(''):emptyBox('Nada parado','')}</div></section>
 ${myC.length?`<section class="panel"><h2>${mm.area==='Comercial'?'Meus leads e clientes':'Meus clientes'} <span class="sub">${myC.length}</span></h2><div class="list">${myC.slice(0,10).map(c=>{const h=health(c);const nx=isLead(c)?cadPending(c.id)[0]:null;return `<button class="item" data-act="open-client" data-id="${c.id}"><span class="stripe s-${h?(h.lv==='ok'?'ok':h.lv==='warn'?'alto':'critico'):'baixo'}"></span><span><span class="t">${esc(c.name)}</span><span class="m"><span>${esc(c.stage)}</span>${nx?`<span>${nx.step==='R'?'Retorno':'D+'+nx.step}: ${esc(fuWhen(nx))}</span>`:''}${c.nextStep?`<span>Próximo: ${esc(c.nextStep)}</span>`:''}</span></span><span class="r">${h?healthTag(h):''}</span></button>`}).join('')}${myC.length>10?`<button class="btn sm ghost" data-act="nav" data-v="clientes">Ver todos os ${myC.length} →</button>`:''}</div></section>`:''}</div>`:''}`}

/* ---------- Painel: só reuniões, saúde das contas, aguardando cliente e funil ---------- */
function vPainel(){const leads=S.clients.filter(isLead),active=S.clients.filter(c=>c.stage==='Fechado');
 const hs=active.map(c=>({c,h:health(c)})).sort((a,b)=>a.h.score-b.h.score);
 const wq=waiting();const now=new Date(),wk=new Date(now.getTime()+7*864e5);
 let meets=S.meetings.filter(m=>{const d=parseD(m.when);return !mCxl(m)&&d&&d>=new Date(now.getTime()-36e5)&&d<=wk});
 if(ui.prio!=='all')meets=meets.filter(m=>(m.priority||'medio')===ui.prio);meets.sort((a,b)=>parseD(a.when)-parseD(b.when));
 const pipeMax=Math.max(1,...PIPE.map(p=>S.clients.filter(c=>c.stage===p).length));const d=new Date();
 return `<div class="head"><div><h1>Painel</h1><p>${WD[d.getDay()]}, ${d.getDate()} de ${MN[d.getMonth()]} · visão geral da agência</p></div>
  <div class="row"><button class="btn" data-act="new-meeting">+ Reunião</button><button class="btn primary" data-act="new-client">+ Cliente</button></div></div>
 <div class="grid2">
  <section class="panel"><h2>Próximas reuniões · 7 dias <span class="sub">${meets.length}</span></h2>
   <div class="chips" style="margin-bottom:8px"><button class="chip" data-act="f-prio" data-v="all" aria-pressed="${ui.prio==='all'}">Todos os níveis</button>${PRIOS.map(p=>`<button class="chip" data-act="f-prio" data-v="${p.id}" aria-pressed="${ui.prio===p.id}">${p.l}</button>`).join('')}</div>
   <div class="list">${meets.length?meets.map(meetingRow).join(''):emptyBox('Nenhuma reunião nesse filtro','Agende pelo botão “+ Reunião”.')}</div>
   <button class="btn sm ghost" style="margin-top:8px" data-act="nav" data-v="agenda">Abrir Agenda →</button></section>
  <section class="panel"><h2>Saúde das contas <span class="sub">${active.length} ativas</span></h2>
   <div class="list">${hs.length?hs.slice(0,8).map(({c,h})=>`<button class="item" data-act="open-client" data-id="${c.id}"><span class="stripe s-${h.lv==='ok'?'ok':h.lv==='warn'?'alto':'critico'}"></span><span><span class="t">${esc(c.name)}</span><span class="m">${h.why.length?esc(h.why.join(' · ')):'Tudo em dia'}</span></span><span class="r">${healthTag(h)}</span></button>`).join(''):emptyBox('Nenhum cliente ativo','Quando um cliente fechar negócio, a saúde da conta aparece aqui.')}</div>
   ${hs.length>8?`<button class="btn sm ghost" style="margin-top:8px" data-act="nav" data-v="clientes">Ver todos os ${hs.length} →</button>`:''}</section>
 </div>
 <div class="grid2">
  <section class="panel"><h2>Aguardando o cliente <span class="sub">lista de cobrança</span></h2>
   <div class="list">${wq.length?wq.slice(0,8).map(waitRow).join(''):emptyBox('Nada parado com os clientes','Quando uma tarefa ficar “Aguardando cliente”, ela aparece aqui.')}</div>
   ${wq.length>8?`<button class="btn sm ghost" data-act="go-wait">Ver todos os ${wq.length} →</button>`:''}</section>
  <section class="panel"><h2>Funil comercial <span class="sub">${leads.length} leads em aberto</span></h2>
   <div class="funnel">${PIPE.map(p=>{const n=S.clients.filter(c=>c.stage===p).length;return `<div class="fbar"><span>${p}</span><span class="bar ${p==='Fechado'?'ok':p==='Perdido'?'mute':''}"><i style="width:${n/pipeMax*100}%"></i></span><span class="num">${n}</span></div>`}).join('')}</div>
   <button class="btn sm ghost" style="margin-top:8px" data-act="nav" data-v="comercial">Abrir Comercial →</button></section>
 </div>`}

/* ---------- Agenda: compromissos do Radar (visitas, captações) com status e semana ---------- */
const MT_ST=['Agendado','Confirmado','Concluído','Cancelado'];
const MT_CLS={'Agendado':'','Confirmado':'p-acc','Concluído':'p-ok','Cancelado':'p-critico'};
const mCxl=m=>m.status==='Cancelado';
['Visita da carteira'].forEach(k=>{if(!KINDS_EXT.includes(k))KINDS_EXT.unshift(k)});
const durTxt=n=>{n=+n||0;if(!n)return'';const h=Math.floor(n/60),m=n%60;return h?(h+'h'+(m?pad(m):'')):m+'min'};
function meetingRow(m){const r=relMeeting(m.when);const cx=mCxl(m);
 return `<button class="item" data-act="edit-meeting" data-id="${m.id}" ${cx?'style="opacity:.55"':''}><span class="stripe s-${cx?'baixo':m.priority||'medio'}"></span>
 <span><span class="t" ${cx?'style="text-decoration:line-through"':''}>${esc(m.title||m.kind)}</span><span class="m"><span class="pill ${mScope(m)==='interna'?'p-medio':'p-acc'}">${mScope(m)==='interna'?'Interna':'Externa'}</span>${m.status?`<span class="pill ${MT_CLS[m.status]||''}">${esc(m.status)}</span>`:''}${mScope(m)==='externa'&&!String(m.title||'').startsWith(cName(m.clientId))?`<span>${esc(cName(m.clientId))}</span>`:''}<span>${esc(m.kind||'')}</span>${m.place?`<span>${esc(m.place)}</span>`:''}<span>${(m.memberIds||[]).map(id=>mName(id).split(' ')[0]).map(esc).join(', ')}</span></span></span>
 <span class="r"><span class="when ${cx?'':r.c}">${cx?'cancelado':esc(r.t)}</span><span class="when">${fDT(m.when)}${m.dur?' · '+durTxt(m.dur):''}</span></span></button>`}
function meetingForm(m,preClient,scope,pre){const isNew=!m;const d=new Date(Date.now()+864e5);
 scope=m?mScope(m):(preClient?'externa':scope||'externa');const int=scope==='interna';
 m=m||{priority:'medio',status:'Agendado',dur:120,kind:int?'Reunião de equipe':preClient?'Visita da carteira':'Prospecção',clientId:preClient||'',when:ymd(d)+'T10:00',memberIds:int?S.members.map(x=>x.id):(myMember()?[myMember().id]:[]),...(pre||{})};
 const kinds=int?KINDS_INT:KINDS_EXT;const kv=kinds.includes(m.kind)?kinds:[m.kind,...kinds].filter(Boolean);
 formModal({title:(isNew?'Novo ':'Editar ')+(int?'compromisso interno':'compromisso com cliente'),values:{...m,status:m.status||'Agendado',dur:m.dur||''},fields:[
  {k:'title',l:'Assunto',full:1,ph:int?'Ex.: Alinhamento da semana':'Ex.: Visita da carteira, gravação de depoimento'},
  ...(int?[]:[{k:'clientId',l:'Cliente',t:'select',o:clientOpts(),empty:'Escolha o cliente',req:1}]),
  {k:'kind',l:'Tipo',t:'select',o:kv},{k:'status',l:'Status',t:'select',o:MT_ST},
  {k:'when',l:'Data e hora',t:'datetime-local',req:1},{k:'dur',l:'Duração',t:'select',o:[{v:'60',l:'1 hora'},{v:'90',l:'1h30'},{v:'120',l:'2 horas'},{v:'180',l:'3 horas'},{v:'240',l:'Meio período'},{v:'480',l:'O dia todo'}],empty:'—'},
  {k:'place',l:'Local ou link'},{k:'priority',l:'Nível de criticidade',t:'select',o:prioOpts()},
  {k:'memberIds',l:int?'Quem participa (equipe)':'Quem da equipe vai',t:'chips',o:S.members.map(x=>({v:x.id,l:x.name})),full:1},
  {k:'notes',l:int?'Pauta, materiais e combinados':'Pauta e anotações',t:'textarea',full:1}],
  onSave:async v=>{if(!v.title)v.title=v.kind;const rec={...m,...v,dur:+v.dur||'',scope};if(int)rec.clientId='';await put('meetings',m.id||uid(),rec);toast(isNew?'Compromisso agendado':'Compromisso atualizado')},
  onDelete:isNew?null:async()=>{await del('meetings',m.id);toast('Compromisso removido')}})}
Object.assign(ui,{agWeek:0});
document.head.insertAdjacentHTML('beforeend',`<style>
.wk{display:grid;grid-template-columns:repeat(7,minmax(150px,1fr));gap:8px;overflow-x:auto;padding-bottom:4px}
.wkd{overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:12px;min-height:180px;display:flex;flex-direction:column;min-width:0}
.wkd.wk-today{border-color:var(--ink);box-shadow:inset 0 3px 0 var(--brand-red,#E83451)}
.wkd h3{margin:0;padding:8px 10px;font-size:13px;display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--line)}
.wkd h3 b{font-size:18px}.wkd h3 small{color:var(--muted);text-transform:uppercase;font-weight:700}
.wke{display:flex;flex-direction:column;gap:6px;padding:8px}
.wkev{overflow:hidden;border:0;border-left:4px solid var(--ink);background:var(--surface-2);border-radius:8px;padding:6px 8px;text-align:left;color:var(--ink);font:inherit;cursor:pointer;display:flex;flex-direction:column;gap:2px;min-width:0}
.wkev .t{display:flex;gap:6px;align-items:center}.wkev .t i{font-style:normal;background:#000;color:#fff;border-radius:5px;padding:0 5px;font-weight:800;font-size:12px}
.wkev b{font-size:13.5px;line-height:1.25;overflow-wrap:anywhere}.wkev small{color:var(--muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wkev.int{border-left-color:var(--med)}.wkev.cap{border-left-color:var(--high)}.wkev.cx{opacity:.5}.wkev.cx b{text-decoration:line-through}.wkev.ok{border-left-color:var(--ok)}
.wkadd{margin:auto 8px 8px;border:1px dashed var(--line);background:none;border-radius:8px;color:var(--muted);font-weight:700;padding:4px}
</style>`);
function weekBody(){const base=new Date();base.setHours(0,0,0,0);const dow=(base.getDay()+6)%7;const mon=addD(base,-dow+7*(ui.agWeek||0));const days=[...Array(7)].map((_,i)=>addD(mon,i));const t0=today();
 const ev=d=>S.meetings.filter(m=>{const x=parseD(m.when);return x&&ymd(x)===ymd(d)&&(!ui.agMine||!myMember()||(m.memberIds||[]).includes(myMember().id))}).sort((a,b)=>(a.when||'').localeCompare(b.when||''));
 const all=days.flatMap(ev);const act=all.filter(m=>!mCxl(m));
 return `<div class="row" style="justify-content:space-between"><div class="row"><button class="btn sm" data-act="ag-wk" data-v="-1" aria-label="Semana anterior">‹</button><b>${fD(ymd(days[0]))} a ${fD(ymd(days[6]))}</b><button class="btn sm" data-act="ag-wk" data-v="1" aria-label="Próxima semana">›</button>${ui.agWeek?'<button class="btn sm ghost" data-act="ag-wk" data-v="0">Hoje</button>':''}</div>
  <div class="row" style="gap:6px"><span class="pill">${act.length} compromisso${act.length===1?'':'s'}</span><span class="pill">${act.filter(m=>/Visita/.test(m.kind||'')).length} visitas</span><span class="pill">${act.filter(m=>/Capta/.test(m.kind||'')).length} captações</span>${all.length-act.length?`<span class="pill p-critico">${all.length-act.length} cancelado${all.length-act.length>1?'s':''}</span>`:''}</div></div>
 <div class="wk">${days.map(d=>{const L=ev(d);const k=ymd(d);return `<div class="wkd ${k===t0?'wk-today':''}"><h3><small>${WD[d.getDay()]}</small><b>${d.getDate()}</b></h3><div class="wke">${L.map(m=>{const x=parseD(m.when);const cls=mCxl(m)?'cx':m.status==='Concluído'?'ok':mScope(m)==='interna'?'int':/Capta/.test(m.kind||'')?'cap':'';
   return `<button class="wkev ${cls}" data-act="edit-meeting" data-id="${m.id}"><span class="t"><i>${pad(x.getHours())}:${pad(x.getMinutes())}</i><small>${esc(durTxt(m.dur))}${m.status&&m.status!=='Agendado'?' · '+esc(m.status):''}</small></span><b>${esc(m.title||m.kind)}</b><small>${esc(m.kind||'')}${m.place?' · '+esc(m.place):''}</small><small>${esc((m.memberIds||[]).map(id=>mName(id).split(' ')[0]).join(', '))}</small></button>`}).join('')}</div>
   <button class="wkadd" data-act="ag-new-day" data-v="${k}">+ compromisso</button></div>`}).join('')}</div>
 <p style="margin:0;font-size:12.5px;color:var(--muted)">Borda preta: visita · laranja: captação · azul: interno · verde: concluído. Toque num compromisso para mudar o status, os participantes ou o horário.</p>`}
function vAgenda(){const now=new Date();const tab=ui.agTab==='pass'||ui.agTab==='prox'?ui.agTab:'sem';const mm=myMember();const mine=ui.agMine&&mm;
 const all=S.meetings.filter(m=>!mine||(m.memberIds||[]).includes(mm.id)).sort((a,b)=>parseD(a.when)-parseD(b.when));
 let body='';
 if(tab==='sem')body=weekBody();
 else if(tab==='prox'){const groups={};const lbl=m=>{const d=parseD(m.when);if(!d)return'Sem data';if(d<now)return null;const n=daysTo(ymd(d));if(n===0)return'Hoje';if(n===1)return'Amanhã';if(n<=7)return'Próximos 7 dias';return'Mais adiante'};
  all.forEach(m=>{const g=lbl(m);if(g)(groups[g]=groups[g]||[]).push(m)});
  body=['Hoje','Amanhã','Próximos 7 dias','Mais adiante','Sem data'].filter(g=>groups[g]).map(g=>`<section class="panel"><h2>${g} <span class="sub">${groups[g].length}</span></h2><div class="list">${groups[g].map(meetingRow).join('')}</div></section>`).join('')||emptyBox('Nenhum compromisso agendado','Use os botões acima para marcar visitas, captações e reuniões.')}
 else{const past=all.filter(m=>parseD(m.when)<now).reverse();body=past.length?`<section class="panel"><div class="list">${past.map(meetingRow).join('')}</div></section>`:emptyBox('Nada realizado ainda','')}
 const soon=all.filter(m=>{const d=parseD(m.when);return !mCxl(m)&&d>now&&d-now<48*36e5}).length;
 return `<div class="head"><div><h1>Agenda</h1><p>Visitas da carteira, captações e reuniões da equipe. ${soon?`<b style="color:var(--crit)">${soon} compromisso${soon>1?'s':''} nas próximas 48h.</b>`:'Nada nas próximas 48h.'}</p></div>
  <div class="row"><button class="btn" data-act="new-meeting" data-scope="interna">+ Interno</button><button class="btn primary" data-act="new-meeting" data-scope="externa">+ Com cliente</button></div></div>
 <div class="row" style="justify-content:space-between"><div class="tabs" role="tablist"><button role="tab" data-act="agtab" data-v="sem" aria-selected="${tab==='sem'}">Semana</button><button role="tab" data-act="agtab" data-v="prox" aria-selected="${tab==='prox'}">Próximos</button><button role="tab" data-act="agtab" data-v="pass" aria-selected="${tab==='pass'}">Realizados</button></div>
 ${mm?`<button class="chip" data-act="agmine" aria-pressed="${!!ui.agMine}">Só os que eu participo</button>`:''}</div>${body}`}
ui.agTab='sem';
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,v=b.dataset.v;
 if(a==='ag-wk'){e.stopPropagation();ui.agWeek=v==='0'?0:(ui.agWeek||0)+(+v);refresh()}
 if(a==='ag-new-day'){e.stopPropagation();meetingForm(null,null,'externa',{kind:'Visita da carteira',when:v+'T10:00'})}},true);

/* ---------- Meu dia: escalados abaixo do horário do compromisso ---------- */
document.head.insertAdjacentHTML('beforeend',`<style>
.today-ppl{margin-top:6px;font-size:12.5px;font-weight:600;color:#D6D6D6;text-align:right;max-width:260px;line-height:1.35}
</style>`);
function todayPeople(){if(ui.view!=='meudia')return;const mm=myMember();
 document.querySelectorAll('#main .today-i[data-act="edit-meeting"]').forEach(el=>{const m=byId('meetings',el.dataset.id);const d=el.querySelector('.today-d');if(!m||!d||d.querySelector('.today-ppl'))return;
  const ids=(m.memberIds||[]).filter(id=>byId('members',id));
  d.insertAdjacentHTML('beforeend',`<div class="today-ppl">${ids.length?esc(ids.map(id=>first(id)).join(', ')):'Ninguém escalado'}</div>`)})}
