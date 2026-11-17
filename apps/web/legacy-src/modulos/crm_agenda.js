/* ================= Compromissos · agenda em grade (Dia / Semana / Mês / Lista) =================
   Mesma coleção "meetings" de sempre (Painel, Meu dia e página do cliente leem daqui).
   Campos usados: title, kind, clientId, scope, when (AAAA-MM-DDTHH:MM), dur (min), status, place, memberIds (1º = responsável),
   notes, priority; novos e opcionais: mode (Presencial/Online/Interna), link. */
const AG_H0=7,AG_H1=21,AG_RH=26;const AG_TEAM=['Design','Audiovisual','Relacionamento','Comercial','Copywriting','Social media'];
const AG_KINDS=[...new Set(['Reunião com cliente','Visita da carteira','Visita comercial','Captação / gravação','Captação de conteúdo','Gravação','Aprovação de conteúdo','Alinhamento de projeto','Reunião interna','Reunião de equipe','Alinhamento de equipe',...KINDS_EXT,...KINDS_INT,'Outro'])];
Object.assign(ui,{agMode:'semana',agDate:today(),agWho:'all',agClient:'all',agKind:'all',agCx:false,agList:'prox'});
const agSeeAll=()=>isLeader()||myMember()?.area==='Comercial';
const mS=m=>parseD(m.when);const mDur=m=>Math.max(15,+m.dur||60);const mE=m=>{const d=mS(m);return d?new Date(d.getTime()+mDur(m)*6e4):null};
const hm=d=>pad(d.getHours())+':'+pad(d.getMinutes());
const agMon=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());return addD(x,-((x.getDay()+6)%7))};
function agCanEdit(m){if(isLeader())return true;const mm=myMember();return !!mm&&(!m||(m.memberIds||[]).includes(mm.id)||(m.createdBy&&m.createdBy===me.id))}
function agBase(){const mm=myMember();const all=agSeeAll();
 return S.meetings.filter(m=>mS(m)&&(all||(mm&&(m.memberIds||[]).includes(mm.id)))&&(ui.agCx||!mCxl(m))&&(ui.agClient==='all'||(ui.agClient==='int'?!m.clientId:m.clientId===ui.agClient))&&(ui.agKind==='all'||m.kind===ui.agKind)&&(ui.agWho==='all'||(m.memberIds||[]).includes(ui.agWho)))}
function agConflicts(L){const out=new Set();const act=L.filter(m=>!mCxl(m));for(let i=0;i<act.length;i++)for(let j=i+1;j<act.length;j++){const a=act[i],b=act[j];
  if(mS(a)<mE(b)&&mS(b)<mE(a)&&(a.memberIds||[]).some(x=>(b.memberIds||[]).includes(x))){out.add(a.id);out.add(b.id)}}return out}
function agLanes(L){const ev=L.slice().sort((a,b)=>mS(a)-mS(b)||mDur(b)-mDur(a));const res={};let cl=[],end=0;
 const flush=()=>{const n=Math.max(1,...cl.map(x=>res[x.id].lane+1));cl.forEach(x=>res[x.id].n=n);cl=[]};
 ev.forEach(m=>{if(cl.length&&mS(m)>=end){flush();end=0}const used=new Set(cl.filter(x=>mE(x)>mS(m)).map(x=>res[x.id].lane));let l=0;while(used.has(l))l++;res[m.id]={lane:l};cl.push(m);end=Math.max(end,mE(m).getTime())});flush();return res}
const agTop=d=>Math.max(0,((d.getHours()*60+d.getMinutes())-AG_H0*60)/30*AG_RH);

(()=>{const st=document.createElement('style');st.textContent=`
.ag-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.ag-nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.ag-nav b{font-family:var(--f-display);font-size:18px;margin-left:6px}
.ag-ib{width:36px;height:36px;border:1px solid var(--line);background:var(--surface);border-radius:9px;display:grid;place-items:center;font-size:18px;color:var(--ink)}
.ag-ib:hover{border-color:var(--muted)}
.ag-fl{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.ag-load{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;scrollbar-width:thin}
.ag-ld{display:flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:4px 12px 4px 4px;flex:none;font-size:13px;color:inherit}
.ag-ld[aria-pressed="true"]{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.ag-ld .av{width:26px;height:26px;font-size:10.5px}.ag-ld small{color:var(--muted)}.ag-ld i{display:block;width:44px;height:4px;border-radius:2px;background:var(--surface-2);overflow:hidden}.ag-ld i b{display:block;height:100%;background:var(--ink)}
.ag-wrap{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.ag-scroll{overflow:auto;max-height:min(70vh,760px);position:relative}
.ag-grid{display:grid;min-width:100%;position:relative}
.ag-head{position:sticky;top:0;z-index:4;background:var(--surface);border-bottom:1px solid var(--line);display:contents}
.ag-hc{position:sticky;top:0;z-index:4;background:var(--surface);border-bottom:1px solid var(--line);border-left:1px solid var(--line);padding:10px 10px;min-width:0;display:flex;align-items:center;gap:8px;text-align:left;color:inherit;border-top:0;border-right:0}
.ag-hc.corner{left:0;z-index:6;border-left:0}
button.ag-hc:hover{background:var(--bg)}
.ag-hc .av{width:32px;height:32px;font-size:12px}.ag-hc b{display:block;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ag-hc small{display:block;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag-hc.today{box-shadow:inset 0 -3px 0 var(--brand-red)}.ag-hc .dn{font-family:var(--f-display);font-size:22px;line-height:1}
.ag-times{position:sticky;left:0;z-index:3;background:var(--surface);border-right:1px solid var(--line)}
.ag-times div{height:${AG_RH}px;font-size:11px;color:var(--muted);text-align:right;padding-right:8px;transform:translateY(-7px);font-family:var(--f-mono)}
.ag-col{position:relative;border-left:1px solid var(--line);background-image:repeating-linear-gradient(to bottom,transparent 0,transparent ${AG_RH*2-1}px,var(--line) ${AG_RH*2-1}px,var(--line) ${AG_RH*2}px),repeating-linear-gradient(to bottom,transparent 0,transparent ${AG_RH-1}px,#F0F0EC ${AG_RH-1}px,#F0F0EC ${AG_RH}px);cursor:cell;min-width:0}
.ag-col.ro{cursor:default}.ag-col.wkend{background-color:#FBFBFA}
.ag-ev{position:absolute;border:1px solid var(--line);border-left:3px solid var(--med);background:#F3F6FD;border-radius:7px;padding:4px 6px;text-align:left;color:var(--ink);font-size:12px;line-height:1.3;overflow:hidden;cursor:pointer;display:flex;flex-direction:column;gap:1px;z-index:1}
.ag-ev:hover{z-index:2;box-shadow:0 4px 14px rgba(0,0,0,.1)}
.ag-ev.int{border-left-color:var(--low);background:#F4F4F2}.ag-ev.cap{border-left-color:var(--high);background:#FBF6EA}
.ag-ev.cx{opacity:.55;text-decoration:line-through}
.ag-ev.conf{border-color:var(--crit);box-shadow:0 0 0 1px var(--crit) inset}
.ag-ev b{font-weight:700;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ag-ev small{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11.5px}
.ag-ev .cf{color:var(--crit);font-weight:700;font-size:11px}
.ag-ev .ppl{display:flex;margin-top:2px}.ag-ev .ppl .av{width:18px;height:18px;font-size:8px;margin-right:-4px;border:1.5px solid #fff}
.ag-now{position:absolute;left:0;right:0;height:0;border-top:2px solid var(--brand-red);z-index:3;pointer-events:none}.ag-now::before{content:"";position:absolute;left:-4px;top:-5px;width:8px;height:8px;border-radius:50%;background:var(--brand-red)}
.ag-month{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
.ag-mh{padding:8px 10px;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)}
.ag-md{min-height:112px;border-top:1px solid var(--line);border-left:1px solid var(--line);padding:6px;display:flex;flex-direction:column;gap:3px;min-width:0;text-align:left;background:none;color:inherit;border-right:0;border-bottom:0;cursor:pointer}
.ag-md:nth-child(7n+1){border-left:0}.ag-md.out{background:#FAFAF8;color:var(--muted)}.ag-md:hover{background:var(--bg)}
.ag-md .d{font-weight:700;font-size:13px;display:flex;justify-content:space-between}.ag-md.today .d span:first-child{background:var(--brand-red);color:#fff;border-radius:999px;padding:0 7px}
.ag-mi{font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-left:3px solid var(--med);padding-left:5px}.ag-mi.int{border-left-color:var(--low)}.ag-mi.cap{border-left-color:var(--high)}.ag-mi.conf{color:var(--crit)}
.ag-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--muted);padding:10px 14px;border-top:1px solid var(--line)}
.ag-legend span{display:inline-flex;align-items:center;gap:6px}.ag-legend i{width:10px;height:10px;border-radius:3px;border-left:3px solid var(--med);background:#F3F6FD}
.ag-legend i.int{border-left-color:var(--low);background:#F4F4F2}.ag-legend i.cap{border-left-color:var(--high);background:#FBF6EA}.ag-legend i.conf{border:1.5px solid var(--crit);background:#fff}
@media (max-width:700px){.ag-nav b{font-size:16px;width:100%;margin:4px 0 0}.ag-md{min-height:64px}.ag-mi{display:none}.ag-md .d small{display:inline}}
`;(document.body||document.head).appendChild(st)})();

/* ---------- grade ---------- */
const agCls=m=>/capta|grava/i.test(m.kind||'')?'cap':m.clientId?'':'int';
function agBlock(m,lay,conf,showPpl){const s=mS(m),e=mE(m);const top=agTop(s);const h=Math.max(AG_RH-3,Math.min(mDur(m),(AG_H1*60)-(s.getHours()*60+s.getMinutes()))/30*AG_RH-3);const w=100/(lay?.n||1);const left=(lay?.lane||0)*w;
 const ppl=m.memberIds||[];
 return `<button class="ag-ev ${agCls(m)} ${mCxl(m)?'cx':''} ${conf?'conf':''}" data-act="ag-open" data-id="${m.id}" style="top:${top+1}px;height:${h}px;left:calc(${left}% + 2px);width:calc(${w}% - 5px)" title="${esc((m.title||m.kind)+' · '+hm(s)+'–'+hm(e))}">
  ${conf&&h>=78&&(lay?.n||1)===1?'<span class="cf">⚠ Conflito de horário</span>':''}<b>${conf&&!(h>=78&&(lay?.n||1)===1)?'<span class="cf">⚠ </span>':''}${esc(m.title||m.kind||'Compromisso')}</b>${m.clientId?`<small>${esc(cName(m.clientId))}</small>`:''}<small>${hm(s)}–${hm(e)}${m.kind&&m.kind!==m.title?' · '+esc(m.kind):''}</small>${m.place||m.mode?`<small>${esc([m.mode,m.place].filter(Boolean).join(' · '))}</small>`:''}
  ${showPpl&&ppl.length?`<span class="ppl">${ppl.slice(0,4).map(av).join('')}</span>`:''}</button>`}
function agTimes(){let h='';for(let t=AG_H0*60;t<AG_H1*60;t+=30)h+=`<div>${t%60?'':pad(t/60)+':00'}</div>`;return `<div class="ag-times" style="grid-row:2">${h}</div>`}
function agNow(dayKey){const n=new Date();if(ymd(n)!==dayKey)return'';const mins=n.getHours()*60+n.getMinutes();if(mins<AG_H0*60||mins>=AG_H1*60)return'';return `<div class="ag-now" style="top:${agTop(n)}px"></div>`}
function agPeople(dayKey,L){const mm=myMember();if(!agSeeAll())return mm?[mm]:[];if(ui.agWho!=='all')return [byId('members',ui.agWho)].filter(Boolean);
 const busy=new Set(L.flatMap(m=>m.memberIds||[]));return S.members.filter(m=>AG_TEAM.includes(m.area)||busy.has(m.id)).sort((a,b)=>(busy.has(b.id)-busy.has(a.id))||a.name.localeCompare(b.name,'pt'))}
function agDay(){const key=ui.agDate;const L=agBase().filter(m=>ymd(mS(m))===key);const conf=agConflicts(L);const P=agPeople(key,L);const noOwner=L.filter(m=>!(m.memberIds||[]).length);
 const cols=[...P.map(p=>({p,L:L.filter(m=>(m.memberIds||[]).includes(p.id))})),...(noOwner.length?[{p:null,L:noOwner}]:[])];
 const H=(AG_H1-AG_H0)*2*AG_RH;
 return `<div class="ag-grid" style="grid-template-columns:58px repeat(${cols.length||1},minmax(150px,1fr))">
  <div class="ag-hc corner"></div>${cols.map(({p,L:l})=>{const hrs=l.filter(m=>!mCxl(m)).reduce((s,m)=>s+mDur(m),0)/60;return p?`<div class="ag-hc">${avatar(p,32)}<span style="min-width:0"><b>${esc(p.name.split(' ').slice(0,2).join(' '))}</b><small>${esc(p.role||p.area||'')} · ${hrs?(Math.round(hrs*10)/10).toString().replace('.',',')+'h ocupada'+(hrs>=2?'s':''):'livre'}</small></span></div>`:`<div class="ag-hc"><span class="av" style="width:32px;height:32px;background:var(--low)">?</span><span><b>Sem responsável</b><small>defina quem vai</small></span></div>`}).join('')}
  ${agTimes()}${cols.map(({p,L:l})=>{const lay=agLanes(l);const ro=!p||!(isLeader()||p.id===myMember()?.id);return `<div class="ag-col ${ro?'ro':''}" style="grid-row:2;height:${H}px" ${ro?'':`data-slot="${key}" data-mid="${p.id}"`}>${l.map(m=>agBlock(m,lay[m.id],conf.has(m.id),false)).join('')}${agNow(key)}</div>`}).join('')}
  ${!cols.length?`<div class="ag-col" style="grid-row:2;height:${H}px"></div>`:''}</div>`}
function agWeek(){const mon=agMon(parseD(ui.agDate));const days=[...Array(7)].map((_,i)=>addD(mon,i));const B=agBase();const t0=today();const H=(AG_H1-AG_H0)*2*AG_RH;const mm=myMember();
 const per=days.map(d=>{const k=ymd(d);return{k,d,L:B.filter(m=>ymd(mS(m))===k)}});const conf=agConflicts(per.flatMap(x=>x.L));
 const canSlot=isLeader()||!!mm;
 return `<div class="ag-grid" style="grid-template-columns:58px repeat(7,minmax(120px,1fr))">
  <div class="ag-hc corner"></div>${per.map(({k,d,L})=>`<button class="ag-hc ${k===t0?'today':''}" data-act="ag-goday" data-v="${k}" title="Ver o dia por integrante"><span class="dn">${d.getDate()}</span><span style="min-width:0"><b>${WD[d.getDay()]}</b><small>${L.filter(m=>!mCxl(m)).length} compromisso${L.filter(m=>!mCxl(m)).length===1?'':'s'}${L.some(m=>conf.has(m.id))?' · ⚠':''}</small></span></button>`).join('')}
  ${agTimes()}${per.map(({k,d,L})=>{const lay=agLanes(L);return `<div class="ag-col ${[0,6].includes(d.getDay())?'wkend':''} ${canSlot?'':'ro'}" style="grid-row:2;height:${H}px" ${canSlot?`data-slot="${k}" data-mid="${ui.agWho!=='all'?ui.agWho:(isLeader()?'':mm?.id||'')}"`:''}>${L.map(m=>agBlock(m,lay[m.id],conf.has(m.id),true)).join('')}${agNow(k)}</div>`}).join('')}</div>`}
function agMonth(){const d0=parseD(ui.agDate);const first=new Date(d0.getFullYear(),d0.getMonth(),1);const start=agMon(first);const B=agBase();const t0=today();
 const cells=[...Array(42)].map((_,i)=>addD(start,i));const conf=agConflicts(B.filter(m=>{const k=ymd(mS(m));return k>=ymd(cells[0])&&k<=ymd(cells[41])}));
 return `<div class="ag-month">${['seg','ter','qua','qui','sex','sáb','dom'].map(x=>`<div class="ag-mh">${x}</div>`).join('')}
  ${cells.map(d=>{const k=ymd(d);const L=B.filter(m=>ymd(mS(m))===k).sort((a,b)=>mS(a)-mS(b));return `<button class="ag-md ${d.getMonth()!==d0.getMonth()?'out':''} ${k===t0?'today':''}" data-act="ag-goday" data-v="${k}"><span class="d"><span>${d.getDate()}</span>${L.length?`<small style="color:var(--muted);font-weight:600">${L.length}</small>`:''}</span>
   ${L.slice(0,3).map(m=>`<span class="ag-mi ${agCls(m)} ${conf.has(m.id)?'conf':''}">${hm(mS(m))} ${esc(m.title||m.kind||'')}</span>`).join('')}${L.length>3?`<span class="ag-mi" style="border:0;color:var(--muted)">+${L.length-3} mais</span>`:''}</button>`}).join('')}</div>`}
function agList(){const now=new Date();const B=agBase().sort((a,b)=>mS(a)-mS(b));
 if(ui.agList==='pass'){const past=B.filter(m=>mS(m)<now).reverse();return past.length?`<div class="list" style="padding:6px 14px">${past.map(meetingRow).join('')}</div>`:emptyBox('Nada realizado ainda','')}
 const up=B.filter(m=>mE(m)>=now);return up.length?`<div class="list" style="padding:6px 14px">${up.map(meetingRow).join('')}</div>`:emptyBox('Nenhum compromisso agendado','Use “Novo compromisso” para marcar visitas, captações e reuniões.')}
function agLoad(){if(!agSeeAll())return'';const mon=agMon(parseD(ui.agDate));const k0=ymd(mon),k1=ymd(addD(mon,6));
 const B=S.meetings.filter(m=>mS(m)&&!mCxl(m)&&ymd(mS(m))>=k0&&ymd(mS(m))<=k1);const ppl=S.members.filter(m=>AG_TEAM.includes(m.area)||B.some(x=>(x.memberIds||[]).includes(m.id)));
 const hrs=id=>B.filter(m=>(m.memberIds||[]).includes(id)).reduce((s,m)=>s+mDur(m),0)/60;const mx=Math.max(1,...ppl.map(p=>hrs(p.id)));
 return `<div class="ag-load" role="group" aria-label="Carga da equipe na semana">${ppl.sort((a,b)=>hrs(b.id)-hrs(a.id)).map(p=>{const h=hrs(p.id);return `<button class="ag-ld" data-act="ag-who" data-v="${p.id}" aria-pressed="${ui.agWho===p.id}">${av(p.id)}<span><b style="font-weight:600">${esc(p.name.split(' ')[0])}</b> <small>${h?(Math.round(h*10)/10).toString().replace('.',',')+'h':'livre'}</small></span><i><b style="width:${Math.round(h/mx*100)}%"></b></i></button>`}).join('')}</div>`}
function vAgenda(){const mode=ui.agMode;const d=parseD(ui.agDate)||new Date();const mm=myMember();
 let label;if(mode==='dia')label=WDF[d.getDay()].replace(/^./,x=>x.toUpperCase())+', '+d.getDate()+' de '+MN[d.getMonth()];
 else if(mode==='semana'){const a=agMon(d),b=addD(a,6);label=a.getMonth()===b.getMonth()?a.getDate()+' a '+b.getDate()+' de '+MN[b.getMonth()]+' '+b.getFullYear():a.getDate()+' '+MN[a.getMonth()].slice(0,3)+' a '+b.getDate()+' '+MN[b.getMonth()].slice(0,3)+' '+b.getFullYear()}
 else if(mode==='mes')label=MN[d.getMonth()].replace(/^./,x=>x.toUpperCase())+' de '+d.getFullYear();else label=ui.agList==='pass'?'Realizados':'Próximos';
 const all=agSeeAll();const kinds=[...new Set(S.meetings.map(m=>m.kind).filter(Boolean))].sort();
 const body=mode==='dia'?agDay():mode==='semana'?agWeek():mode==='mes'?agMonth():agList();
 return `<div class="head"><div><h1>Compromissos</h1><p>${all?'Agenda da equipe: quem está ocupado, quem está livre e quais clientes serão atendidos.':'Os seus compromissos. Clique em um horário livre para marcar.'}</p></div><button class="btn primary" data-act="ag-new">+ Novo compromisso</button></div>
 <div class="ag-bar"><div class="ag-nav">${mode!=='lista'?`<button class="btn sm" data-act="ag-today">Hoje</button><button class="ag-ib" data-act="ag-step" data-v="-1" aria-label="Anterior">‹</button><button class="ag-ib" data-act="ag-step" data-v="1" aria-label="Próximo">›</button>`:`<div class="tabs"><button data-act="ag-list" data-v="prox" aria-selected="${ui.agList!=='pass'}">Próximos</button><button data-act="ag-list" data-v="pass" aria-selected="${ui.agList==='pass'}">Realizados</button></div>`}<b>${esc(label)}</b></div>
  <div class="row" style="gap:8px">${all?`<select class="sel" data-ag="agWho" aria-label="Integrante"><option value="all">Todos os integrantes</option>${S.members.slice().sort((a,b)=>a.name.localeCompare(b.name,'pt')).map(m=>`<option value="${m.id}" ${ui.agWho===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select>`:''}<div class="tabs" role="tablist" aria-label="Visualização">${[['dia','Dia'],['semana','Semana'],['mes','Mês'],['lista','Lista']].map(([k,l])=>`<button role="tab" data-act="ag-mode" data-v="${k}" aria-selected="${mode===k}">${l}</button>`).join('')}</div></div></div>
 <div class="ag-fl">
  <select class="sel" data-ag="agClient" aria-label="Cliente"><option value="all">Todos os clientes</option><option value="int" ${ui.agClient==='int'?'selected':''}>Internos (sem cliente)</option>${S.clients.slice().sort((a,b)=>a.name.localeCompare(b.name,'pt')).map(c=>`<option value="${c.id}" ${ui.agClient===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
  <select class="sel" data-ag="agKind" aria-label="Tipo"><option value="all">Todos os tipos</option>${kinds.map(k=>`<option ${ui.agKind===k?'selected':''}>${esc(k)}</option>`).join('')}</select>
  <button class="chip" data-act="ag-cx" aria-pressed="${!!ui.agCx}">Mostrar cancelados</button></div>

 <div class="ag-wrap">${mode==='dia'||mode==='semana'?`<div class="ag-scroll" id="ag-scroll">${body}</div>`:body}
  ${mode!=='lista'?`<div class="ag-legend"><span><i></i>Com cliente</span><span><i class="cap"></i>Captação / gravação</span><span><i class="int"></i>Interno</span><span><i class="conf"></i>Conflito: mesma pessoa em dois compromissos</span>${mode!=='mes'?'<span>Clique num horário livre para marcar</span>':''}</div>`:''}</div>`}
function agAfter(){if(ui.view!=='agenda')return;const sc=$('#ag-scroll');if(!sc||sc.dataset.done)return;sc.dataset.done='1';const n=new Date();const h=Math.min(Math.max(n.getHours()-1,8),AG_H1-6);if(ui.agScrollTop!=null)sc.scrollTop=ui.agScrollTop;else sc.scrollTop=Math.max(0,(h-AG_H0)*2*AG_RH-12);sc.addEventListener('scroll',()=>{ui.agScrollTop=sc.scrollTop},{passive:true})}

/* ---------- detalhe ---------- */
function agDetail(id){const draw=()=>{const m=byId('meetings',id);if(!m){closeModal();return}const s=mS(m),e=mE(m);const c=m.clientId&&byId('clients',m.clientId);
 const others=S.meetings.filter(x=>x.id!==m.id&&!mCxl(x)&&!mCxl(m)&&mS(x)&&mS(x)<e&&s<mE(x)&&(x.memberIds||[]).some(p=>(m.memberIds||[]).includes(p)));const ed=agCanEdit(m);
 openModal(`<div class="mh"><div style="min-width:0"><h2 style="overflow-wrap:anywhere">${esc(m.title||m.kind||'Compromisso')}</h2><div style="font-size:13px;color:var(--muted)">${WDF[s.getDay()]}, ${s.getDate()} de ${MN[s.getMonth()]} · ${hm(s)}–${hm(e)} (${durTxt(mDur(m))})</div></div><button class="x" data-act="close" aria-label="Fechar">×</button></div>
 <div class="mb">${others.length?`<div class="alertbox" style="border-color:var(--crit);background:var(--crit-soft)"><span>⚠</span><div><b style="color:var(--crit)">Conflito de horário.</b> ${others.map(x=>esc((x.memberIds||[]).filter(p=>(m.memberIds||[]).includes(p)).map(first).join(', ')+' também está em “'+(x.title||x.kind)+'” às '+hm(mS(x)))).join('; ')}.</div></div>`:''}
  <div class="tk-info">${[['Status',m.status||'Agendado'],['Tipo',m.kind],['Modalidade',m.mode||(m.clientId?'':'Interna')],['Responsável',(m.memberIds||[])[0]?mName(m.memberIds[0]):'A definir'],['Também vão',(m.memberIds||[]).slice(1).map(first).join(', ')],['Local',m.place],['Criticidade',PRIOS.find(p=>p.id===m.priority)?.l||'']].filter(x=>x[1]).map(([l,v])=>`<div><span>${l}</span><b>${esc(v)}</b></div>`).join('')}</div>
  ${m.link?`<div><a class="btn" href="${esc(m.link)}" target="_blank" rel="noopener">Entrar na reunião ↗</a></div>`:''}
  ${c?`<div class="note" style="align-items:center"><div class="row" style="gap:10px;flex-wrap:nowrap">${clientLogo(c,40)}<div><b>${esc(c.name)}</b><small>${esc([c.segment,c.phone,c.address].filter(Boolean).join(' · '))}</small></div></div><button class="btn sm" data-act="st-open" data-id="${c.id}">Página do cliente</button></div>`:''}
  ${m.notes?`<div class="sec"><h3>Descrição e observações</h3><div class="note"><p>${esc(m.notes)}</p></div></div>`:''}${stamp(m)}</div>
 <div class="mf">${ed&&!mCxl(m)?`<button class="btn danger" data-act="ag-cancel" data-id="${m.id}">Cancelar compromisso</button>`:''}${ed&&isLeader()?`<button class="btn danger" data-act="ag-del" data-id="${m.id}">Excluir</button>`:''}<span class="spacer"></span>${ed?`<button class="btn primary" data-act="ag-edit" data-id="${m.id}">Editar</button>`:'<small style="color:var(--muted)">Só quem participa e a liderança editam.</small>'}</div>`,{rerender:draw})};draw()}

/* ---------- formulário (substitui o anterior, mesmos registros) ---------- */
function meetingForm(m,preClient,scope,pre){const isNew=!m;const lead=isLeader();const mm=myMember();
 if(isNew&&!lead&&!mm){toast('Vincule a sua conta para marcar compromissos.');return}if(!isNew&&!agCanEdit(m)){toast('Só quem participa e a liderança editam este compromisso.');return}
 const d=new Date(Date.now()+864e5);const int=scope==='interna';
 m=m||{priority:'medio',status:'Agendado',dur:60,kind:preClient?'Visita da carteira':int?'Reunião interna':'Reunião com cliente',clientId:preClient||'',when:ymd(d)+'T10:00',memberIds:mm?[mm.id]:[],mode:int?'Interna':'Presencial',...(pre||{})};
 const s=mS(m)||new Date();const e=new Date(s.getTime()+mDur(m)*6e4);const resp=(m.memberIds||[])[0]||'';
 const team=S.members.slice().sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 const respOpts=lead?team.map(x=>({v:x.id,l:x.name+(x.role?' · '+x.role:'')})):team.filter(x=>x.id===(resp||mm?.id)).map(x=>({v:x.id,l:x.name}));
 const kinds=AG_KINDS.includes(m.kind)?AG_KINDS:[m.kind,...AG_KINDS].filter(Boolean);
 formModal({title:isNew?'Novo compromisso':'Editar compromisso',values:{...m,date:ymd(s),start:hm(s),end:hm(e),resp:resp||mm?.id||'',others:(m.memberIds||[]).slice(1),mode:m.mode||(m.clientId?'Presencial':'Interna')},back:isNew?null:()=>byId('meetings',m.id)&&agDetail(m.id),fields:[
  {k:'title',l:'Título do compromisso',full:1,ph:'Ex.: Gravação dos Reels de dezembro'},
  {k:'kind',l:'Tipo de compromisso',t:'select',o:kinds},{k:'clientId',l:'Cliente (opcional)',t:'select',o:clientOpts(),empty:'Nenhum · compromisso interno'},
  {k:'resp',l:'Responsável',t:'select',o:respOpts,empty:respOpts.length?undefined:'—',req:1,hint:lead?'':'Só a liderança muda o responsável.'},{k:'others',l:'Também vão (opcional)',t:'chips',o:team.map(x=>({v:x.id,l:x.name.split(' ')[0]})),full:1},
  {k:'date',l:'Data',t:'date',req:1},{k:'start',l:'Início',t:'time',req:1},{k:'end',l:'Término',t:'time',req:1},{k:'status',l:'Status',t:'select',o:MT_ST},
  {k:'mode',l:'Modalidade',t:'select',o:['Presencial','Online','Interna']},{k:'place',l:'Local ou endereço',ph:'Ex.: na loja do cliente, Rua…'},
  {k:'link',l:'Link da reunião',full:1,ph:'https://meet.google.com/…'},{k:'priority',l:'Criticidade',t:'select',o:prioOpts()},
  {k:'notes',l:'Descrição e observações',t:'textarea',full:1,ph:'Pauta, materiais, combinados'}],
  onSave:async v=>{const [h1,m1]=v.start.split(':').map(Number),[h2,m2]=v.end.split(':').map(Number);const dur=(h2*60+m2)-(h1*60+m1);
   if(dur<=0){toast('O término precisa ser depois do início.');document.getElementById('f_end')?.focus();throw new Error('dur')}
   if(v.link&&!/^https?:\/\//i.test(v.link)){toast('O link precisa começar com http:// ou https://');throw new Error('url')}
   const respId=lead?v.resp:(resp||mm?.id||'');const ids=[respId,...(v.others||[]).filter(x=>x!==respId)].filter(Boolean);
   const rec={...m,title:v.title||v.kind,kind:v.kind,clientId:v.clientId,scope:v.clientId?'externa':'interna',when:v.date+'T'+v.start,dur,status:v.status,mode:v.mode,place:v.place,link:v.link,priority:v.priority,notes:v.notes,memberIds:ids};delete rec.id;
   const id=m.id||uid();const tmp={...rec,id};const cf=S.meetings.filter(x=>x.id!==id&&!mCxl(x)&&!mCxl(tmp)&&mS(x)&&mS(x)<mE(tmp)&&mS(tmp)<mE(x)&&(x.memberIds||[]).some(p=>ids.includes(p)));
   await put('meetings',id,rec);toast((isNew?'Compromisso marcado':'Compromisso atualizado')+(cf.length?' · atenção: conflito com '+cf.map(x=>'“'+(x.title||x.kind)+'”').join(', '):''))}})
 const cs=document.getElementById('f_clientId');if(cs)cs.addEventListener('change',()=>{const c=byId('clients',cs.value);const pl=document.getElementById('f_place'),md=document.getElementById('f_mode');if(c&&pl&&!pl.value&&c.address)pl.value=c.address;if(md&&!cs.value&&md.value==='Presencial')md.value='Interna';if(md&&cs.value&&md.value==='Interna')md.value='Presencial'})}

/* ---------- eventos ---------- */
document.addEventListener('change',e=>{const k=e.target.dataset?.ag;if(k){ui[k]=e.target.value;refresh()}});
document.addEventListener('click',async e=>{const col=e.target.closest('.ag-col[data-slot]');if(col&&!e.target.closest('.ag-ev')){e.stopPropagation();
  const r=col.getBoundingClientRect();const y=e.clientY-r.top;let mins=AG_H0*60+Math.floor(y/AG_RH)*30;mins=Math.min(mins,AG_H1*60-30);
  const mid=col.dataset.mid;meetingForm(null,null,'externa',{when:col.dataset.slot+'T'+pad(Math.floor(mins/60))+':'+pad(mins%60),dur:60,memberIds:mid?[mid]:(myMember()?[myMember().id]:[]),kind:'Reunião com cliente'});return}
 const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id,v=b.dataset.v;
 if(a==='edit-meeting'&&ui.view==='agenda'){e.stopPropagation();e.preventDefault();agDetail(id);return}
 if(!a.startsWith('ag-'))return;if(['ag-wk','ag-new-day'].includes(a))return;e.stopPropagation();e.preventDefault();
 const d=parseD(ui.agDate)||new Date();
 switch(a){
 case'ag-mode':ui.agMode=v;ui.agScrollTop=null;refresh();break;
 case'ag-today':ui.agDate=today();ui.agScrollTop=null;refresh();break;
 case'ag-step':{const n=+v;ui.agDate=ui.agMode==='dia'?ymd(addD(d,n)):ui.agMode==='semana'?ymd(addD(d,7*n)):ymd(new Date(d.getFullYear(),d.getMonth()+n,1));refresh();break}
 case'ag-goday':ui.agDate=v;ui.agMode='dia';ui.agScrollTop=null;refresh();break;
 case'ag-who':ui.agWho=ui.agWho===v?'all':v;refresh();break;
 case'ag-cx':ui.agCx=!ui.agCx;refresh();break;
 case'ag-list':ui.agList=v;refresh();break;
 case'ag-new':meetingForm(null,null,'externa',{when:(ui.agDate>=today()?ui.agDate:today())+'T10:00',dur:60});break;
 case'ag-open':agDetail(id);break;
 case'ag-edit':meetingForm(byId('meetings',id));break;
 case'ag-cancel':case'ag-del':{const m=byId('meetings',id);if(!m||!agCanEdit(m))return;if(a==='ag-del'&&!isLeader())return;
  if(!b.classList.contains('armed')){b.classList.add('armed');const t0=b.textContent;b.textContent=a==='ag-del'?'Confirmar exclusão':'Confirmar cancelamento';setTimeout(()=>{if(document.body.contains(b)){b.classList.remove('armed');b.textContent=t0}},4000);return}
  if(a==='ag-del'){await del('meetings',id);closeModal();toast('Compromisso excluído')}else{await put('meetings',id,{...m,status:'Cancelado'});toast('Compromisso cancelado')}break}}},true);
