/* ================= Relacionamento · carteira de clientes e página 360° da conta =================
   Fonte única: tudo vem do cadastro do cliente (clients), da agenda (meetings), do fluxo de aprovação (creatives),
   das tarefas (todos) e dos calendários (calendars). Campos novos no cliente, só quando não havia onde guardar:
   designerId / designerSince / designerHist (carteira), agreement (acordo de marketing), profile.style com 7 perfis + profile.hist. */
{const v=VIEWS.find(x=>x[0]==='estrategia');if(v){v[1]='Relacionamento';v[2]='Contas'}}
IC.estrategia='<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18M10.5 12.5v1.6h3v-1.6"/>';
Object.assign(ui,{rlWho:'all',rlSit:'ativas'});
const REL_PERFIS=[['apressado','Apressado','Prefere respostas rápidas, objetivas e soluções diretas.'],
 ['analitico','Analítico','Gosta de entender os detalhes e avaliar as propostas antes de aprovar.'],
 ['relacional','Relacional / Comunicativo','Valoriza proximidade, diálogo e contato frequente.'],
 ['expressivo','Expressivo','Gosta de participar, sugerir ideias e demonstrar suas opiniões.'],
 ['indeciso','Indeciso','Precisa de mais direcionamento e segurança para tomar decisões.'],
 ['desconfiado','Desconfiado','Valoriza transparência, explicações e demonstrações claras do que está sendo feito.'],
 ['fiel','Fiel','Relacionamento consolidado; tende a valorizar a continuidade da parceria.']];
const REL_OLD={direto:'apressado'};
const relPerfil=c=>{const s=c?.profile?.style;return REL_PERFIS.find(x=>x[0]===(REL_OLD[s]||s))||null};
const PKG_BASICO=[{id:'artes',l:'Artes',qty:8,kind:'arte'},{id:'videos',l:'Vídeos/Reels',qty:4,kind:'video'}];
const REL_VID=['Reels','Vídeo longo','Captação audiovisual'];

(()=>{const st=document.createElement('style');st.textContent=`
.rl-bar{display:flex;flex-direction:column;gap:10px}
.rl-list{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.rl-hd,.rl-row{display:grid;grid-template-columns:minmax(220px,2.2fr) minmax(150px,1.2fr) minmax(110px,.9fr) minmax(150px,1.2fr) minmax(110px,.9fr);gap:14px;align-items:center;padding:12px 16px}
.rl-hd{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line);padding-block:10px}
.rl-row{width:100%;background:none;border:0;border-top:1px solid var(--line);text-align:left;color:inherit;transition:background .15s}
.rl-row:first-of-type{border-top:0}.rl-row:hover{background:var(--surface-2)}
.rl-nm{display:flex;align-items:center;gap:12px;min-width:0}.rl-nm b{display:block;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rl-nm small,.rl-c small{display:block;font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rl-c{min-width:0;font-size:13.5px}.rl-c b{font-weight:600}
.rl-who{display:flex;align-items:center;gap:8px;min-width:0}.rl-who .av{width:26px;height:26px;font-size:10.5px}
.rl-sit{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600}.rl-sit i{width:8px;height:8px;border-radius:50%;background:var(--low);flex:none}
.rl-sit.ok i{background:var(--ok)}.rl-sit.warn i{background:var(--high)}.rl-sit.risk i{background:var(--crit)}.rl-sit.lead i{background:var(--med)}
.rl-muted{color:var(--muted)}.rl-fill{color:var(--muted);font-style:italic;font-weight:400}
@media (max-width:900px){.rl-hd{display:none}.rl-row{grid-template-columns:1fr auto;row-gap:6px}.rl-row .rl-c.o{display:none}.rl-row .rl-sitc{grid-column:2;grid-row:1}}
/* página da conta */
.rc-top{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center}
.rc-hero{background:var(--brand-bg);color:#fff;border-radius:18px;padding:22px clamp(16px,3vw,28px);display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center;position:relative;overflow:hidden}
.rc-hero::after{content:"";position:absolute;right:-60px;top:-80px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(232,52,81,.18),transparent 65%);pointer-events:none}
.rc-logo{width:96px;height:96px;border-radius:20px;background:#fff;display:grid;place-items:center;overflow:hidden;flex:none;position:relative}
.rc-logo .clogo{width:84px!important;height:84px!important;border:0;border-radius:12px;font-size:26px}
.rc-hero h1{color:#fff;font-size:clamp(24px,3.2vw,32px);line-height:1.1}
.rc-sub{color:#BDBDBD;font-size:14.5px;margin-top:4px}
.rc-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:18px;position:relative;z-index:1}
.rc-facts>div{border-top:1px solid #2E2E2E;padding-top:10px;min-width:0}
.rc-facts>div>span{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8F8F8F;font-weight:700}
.rc-facts b{display:flex;align-items:center;gap:8px;font-size:15px;margin-top:4px;color:#fff;overflow-wrap:anywhere}
.rc-facts small{display:block;color:#9A9A9A;font-size:12px;margin-top:2px}
.rc-facts .av{width:26px;height:26px;font-size:10.5px}
.rc-facts .lnk{color:#FF8A9C;font-size:12px}
.rc-hero .rl-sit{color:#fff;font-size:15px}
.rc-logo-x{position:absolute;inset:auto 0 0 0;background:rgba(0,0,0,.65);color:#fff;border:0;font-size:11px;font-weight:600;padding:4px 0;opacity:0;transition:opacity .15s}
.rc-logo:hover .rc-logo-x,.rc-logo-x:focus-visible{opacity:1}
.rc-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:6px 0 -6px}
.rc-h h2{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-family:var(--f-body);font-weight:700;display:flex;align-items:center;gap:10px}
.rc-h h2::before{content:"";width:18px;height:6px;border-radius:2px;background:var(--brand-red)}
.rc-ops{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) 1.4fr;gap:0;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.rc-ops>div{padding:14px 16px;border-left:1px solid var(--line);min-width:0}.rc-ops>div:first-child{border-left:0}
.rc-ops span{display:block;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:700}
.rc-ops b{display:block;font-family:var(--f-display);font-size:28px;line-height:1.1;margin-top:4px;font-variant-numeric:tabular-nums}
.rc-ops b.late{color:var(--crit)}
.rc-ops small{display:block;font-size:12px;color:var(--muted);margin-top:2px}
.rc-prog{height:8px;border-radius:4px;background:var(--surface-2);overflow:hidden;margin-top:10px}.rc-prog i{display:block;height:100%;background:var(--ink);border-radius:4px;transition:width .4s}
.rc-pend{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.rc-pend button{display:grid;grid-template-columns:8px 1fr auto;gap:10px;align-items:center;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:9px 12px;color:inherit;font-size:14px}
.rc-pend button:hover{border-color:var(--muted)}.rc-pend i{width:8px;height:8px;border-radius:50%;background:var(--high)}.rc-pend i.late{background:var(--crit)}
.rc-pend small{color:var(--muted);font-size:12.5px;white-space:nowrap}
.rc-grid{display:grid;grid-template-columns:1.25fr 1fr;gap:16px;align-items:start}
.rc-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:14px;min-width:0}
.rc-card>header{display:flex;justify-content:space-between;align-items:center;gap:8px}
.rc-card h3{font-size:16px}
.rc-plan{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.rc-plan b{font-family:var(--f-display);font-size:18px}.rc-plan small{color:var(--muted);font-size:13px}
.rc-tbl{width:100%;border-collapse:collapse;font-size:14px}
.rc-tbl th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);text-align:right;padding:6px 8px;border-bottom:1px solid var(--line);font-weight:700}
.rc-tbl th:first-child,.rc-tbl td:first-child{text-align:left;padding-left:0}
.rc-tbl td{text-align:right;padding:10px 8px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
.rc-tbl tr:last-child td{border-bottom:0}
.rc-tbl .st{font-size:12.5px;font-weight:600;white-space:nowrap}.rc-tbl .st.ok{color:var(--ok)}.rc-tbl .st.warn{color:var(--high)}.rc-tbl .st.mute{color:var(--muted)}
.rc-dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 20px}
.rc-dl>div{min-width:0}.rc-dl>div.full{grid-column:1/-1}
.rc-dl>div>span{display:block;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:700}
.rc-dl b{display:block;font-weight:600;margin-top:3px;overflow-wrap:anywhere;white-space:pre-wrap}
.rc-next{display:grid;grid-template-columns:64px 1fr;gap:14px;align-items:center;background:var(--surface-2);border-radius:12px;padding:12px 14px;text-align:left;border:1px solid transparent;color:inherit;width:100%}
.rc-next:hover{border-color:var(--muted)}
.rc-date{background:var(--brand-bg);color:#fff;border-radius:12px;text-align:center;padding:8px 0;line-height:1.1}
.rc-date b{display:block;font-family:var(--f-display);font-size:24px}.rc-date small{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#BDBDBD}
.rc-next .t{font-weight:700;font-size:15px;display:block}.rc-next .m{display:block;font-size:13px;color:var(--muted);margin-top:3px}
.rc-ag{display:flex;flex-direction:column}
.rc-ag button{display:grid;grid-template-columns:118px 1fr;gap:12px;padding:10px 2px;border:0;border-top:1px solid var(--line);background:none;text-align:left;color:inherit;font-size:14px}
.rc-ag button:first-child{border-top:0}.rc-ag button:hover b{text-decoration:underline}
.rc-ag time{font-family:var(--f-mono);font-size:12px;color:var(--muted);padding-top:2px}
.rc-ag small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
.rc-prof{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:start}
.rc-badge{width:52px;height:52px;border-radius:14px;background:var(--brand-bg);color:#fff;display:grid;place-items:center;font-family:var(--f-display);font-size:22px;font-weight:700}
.rc-prof h4{margin:0;font-family:var(--f-display);font-size:19px}.rc-prof p{margin:4px 0 0;color:var(--muted);font-size:14px}
.rc-quote{border-left:3px solid var(--brand-red);padding:4px 0 4px 12px;font-size:14.5px;white-space:pre-wrap;overflow-wrap:anywhere}
.rc-hist{font-size:12.5px;color:var(--muted);margin:0}
@media (max-width:1000px){.rc-ops{grid-template-columns:repeat(2,minmax(0,1fr))}.rc-ops>div{border-left:0;border-top:1px solid var(--line)}.rc-ops>div:nth-child(-n+2){border-top:0}.rc-ops>div:nth-child(even){border-left:1px solid var(--line)}.rc-ops>div:last-child{grid-column:1/-1;border-left:0}.rc-grid{grid-template-columns:1fr}}
@media (max-width:700px){.rc-hero{grid-template-columns:1fr;gap:14px}.rc-logo{width:76px;height:76px}.rc-logo .clogo{width:66px!important;height:66px!important}.rc-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.rc-dl{grid-template-columns:1fr}.rc-tbl{font-size:13px}.rc-tbl th,.rc-tbl td{padding-inline:5px}}
@media (prefers-reduced-motion:no-preference){.rc-hero,.rc-ops,.rc-card{animation:rcIn .25s ease-out both}@keyframes rcIn{from{opacity:0;transform:translateY(6px)}}}
`;document.head.appendChild(st)})();

/* ---------- fonte única: responsável, início, situação ---------- */
function relDesigner(c){if(!c)return'';if(c.designerId&&byId('members',c.designerId))return c.designerId;
 const mt=String(c.packageNotes||'').match(/Calend[áa]rio:\s*([^·\n]+)/i);if(!mt)return'';const nm=calNorm(mt[1]);
 const m=S.members.find(x=>calNorm(x.name)===nm)||S.members.find(x=>nm&&calNorm(x.name).split(' ')[0]===nm.split(' ')[0]&&calNorm(x.name).split(' ').pop()===nm.split(' ').pop());return m?m.id:''}
const relStart=c=>c.contractStart||c.closedAt||'';
function relTenure(s){const d=parseD(s);if(!d)return'';const n=new Date();let m=(n.getFullYear()-d.getFullYear())*12+n.getMonth()-d.getMonth();if(n.getDate()<d.getDate())m--;
 if(m<0)return'começa em '+fD(s);if(m<1){const dd=Math.max(0,daysSince(s));return dd+' dia'+(dd===1?'':'s')}const y=Math.floor(m/12),r=m%12;
 return [y?y+' ano'+(y>1?'s':''):'',r?r+' '+(r>1?'meses':'mês'):''].filter(Boolean).join(' e ')}
function relSit(c){if(c.stage==='Perdido')return{k:'mute',l:'Encerrada'};if(c.stage!=='Fechado')return{k:'lead',l:'Em negociação · '+c.stage};
 const h=health(c);return h?{k:h.lv,l:h.lv==='ok'?'Ativa · saudável':h.lv==='warn'?'Ativa · atenção':'Ativa · em risco',h}:{k:'ok',l:'Ativa'}}
const relSitHtml=(s,cls)=>`<span class="rl-sit ${s.k} ${cls||''}"><i></i>${esc(s.l)}</span>`;
const relFill=t=>`<span class="rl-fill">${t||'A preencher'}</span>`;
function relNextMeet(cid){const now=Date.now();return S.meetings.filter(m=>m.clientId===cid&&m.status!=='Cancelado'&&m.status!=='Concluído'&&parseD(m.when)&&parseD(m.when).getTime()+(+m.dur||60)*6e4>=now).sort((a,b)=>parseD(a.when)-parseD(b.when))}
const relCanEdit=()=>isAdmin();
const relConsult=c=>!isLeader()&&!seeAllCarteiras()&&relDesigner(c)!==myMember()?.id;

/* ---------- produção real do mês ---------- */
function relAgreement(c){const a=c.agreement;if(!a||!Array.isArray(a.items))return null;return a}
function relOps(c,month){const mo=s=>String(s||'').slice(0,7);const t0=today();
 const cr=S.creatives.filter(x=>x.clientId===c.id);const kindOf=x=>REL_VID.includes(x.format)||crKind(x)==='video'?'video':'arte';
 const prodOk=x=>[AP_FREE,'Aprovado','Publicado'].includes(x.status);
 const delivered=x=>(x.sentAt&&mo(x.sentAt)===month)||(x.status==='Publicado'&&mo(x.statusAt)===month);
 const by=k=>{const L=cr.filter(x=>kindOf(x)===k);return{prod:L.filter(x=>prodOk(x)&&mo(x.review?.decidedAt||x.statusAt)===month).length,deliv:L.filter(delivered).length,
  inprog:L.filter(x=>['Em criação','Em aprovação','Ajustes solicitados'].includes(x.status)).length}};
 const arte=by('arte'),video=by('video');
 const tks=S.todos.filter(t=>t.clientId===c.id&&t.tipo!=='Calendário'&&(mo(t.due)===month||(t.status==='Concluída'&&mo(t.doneAt)===month)));
 const q=t=>+t.qtd||1;const tkDone=tks.filter(t=>t.status==='Concluída');
 const tkLate=S.todos.filter(t=>t.clientId===c.id&&t.status!=='Concluída'&&t.due&&t.due<t0);
 const cal=S.calendars.find(x=>x.clientId===c.id&&x.month===month)||null;
 const ag=relAgreement(c);const lines=(ag?.items||[]).map(i=>{const s=i.kind==='arte'?arte:i.kind==='video'?video:null;return{...i,prod:s?s.prod:null,deliv:s?s.deliv:null}});
 const pkgPrev=lines.reduce((s,i)=>s+(+i.qty||0),0),pkgDone=lines.reduce((s,i)=>s+(i.deliv==null?0:Math.min(+i.qty||0,i.deliv)),0);
 const prev=pkgPrev+(cal?1:0)+tks.reduce((s,t)=>s+q(t),0);
 const done=pkgDone+(cal&&cal.stage==='entregue'?1:0)+tkDone.reduce((s,t)=>s+q(t),0);
 const late=tkLate.length+(cal&&calLate(cal)?1:0);
 return{arte,video,lines,cal,tks,tkDone,tkLate,prev,done,pend:Math.max(0,prev-done),late,pct:prev?Math.round(done/prev*100):0,ag}}
function relPace(qty,deliv){if(!qty)return{k:'mute',l:'—'};if(deliv>=qty)return{k:'ok',l:'Completo'};
 const d=new Date(),dim=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();const exp=qty*d.getDate()/dim;
 if(!deliv)return d.getDate()<=7?{k:'mute',l:'Não iniciado'}:{k:'warn',l:'Abaixo do ritmo'};return deliv+1<exp?{k:'warn',l:'Abaixo do ritmo'}:{k:'ok',l:'Em dia'}}

/* ---------- lista: carteira ---------- */
function stList(){const q=ui.stQ.trim().toLowerCase();const norm=s=>String(s||'').toLowerCase();
 const sitOf=c=>c.stage==='Perdido'?'encerradas':c.stage!=='Fechado'?'leads':(health(c)?.lv||'ok')==='ok'?'ativas':'atencao';
 const base=S.clients.filter(c=>!q||[c.name,c.legalName,c.contact,c.segment,c.email,c.address].some(x=>norm(x).includes(q)));
 const inSit=c=>ui.rlSit==='todas'||sitOf(c)===ui.rlSit||(ui.rlSit==='ativas'&&sitOf(c)==='atencao');
 const L=base.filter(c=>inSit(c)&&(ui.rlWho==='all'||(ui.rlWho==='none'?!relDesigner(c):relDesigner(c)===ui.rlWho))).sort((a,b)=>String(a.name).localeCompare(b.name,'pt'));
 const act=base.filter(inSit);const ds=[...new Set(S.clients.filter(c=>c.stage==='Fechado').map(relDesigner).filter(Boolean))].map(id=>byId('members',id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 const noD=act.filter(c=>!relDesigner(c)).length;const cnt=(k)=>base.filter(c=>k==='ativas'?['ativas','atencao'].includes(sitOf(c)):k==='todas'?true:sitOf(c)===k).length;
 const sits=[['ativas','Ativas'],['atencao','Em atenção'],['leads','Em negociação'],['encerradas','Encerradas'],['todas','Todas']];
 return `<div class="head"><div><h1>Relacionamento</h1><p>A carteira de clientes da agência: quem cuida de cada conta, há quanto tempo é cliente, como está a conta e quando é o próximo contato.</p></div>${isAdmin()&&S.clients.filter(c=>c.stage==='Fechado'&&!stNext(c.id)).length?`<button class="btn" data-act="st-bulk">Agendar follow quinzenal</button>`:''}</div>
 <div class="rl-bar"><input class="st-search" id="st-q" placeholder="Buscar cliente por nome, contato ou segmento" value="${esc(ui.stQ)}" autocomplete="off">
  <div class="row" style="justify-content:space-between;gap:10px"><div class="chips" role="group" aria-label="Situação da conta">${sits.map(([k,l])=>`<button class="chip" data-act="rl-sit" data-v="${k}" aria-pressed="${ui.rlSit===k}">${l} <span class="num" style="opacity:.6">${cnt(k)}</span></button>`).join('')}</div>
  <label class="row" style="gap:8px"><span style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700">Carteira</span><select class="sel" id="rl-who" aria-label="Filtrar por designer responsável"><option value="all">Todos os designers</option>${ds.map(m=>`<option value="${m.id}" ${ui.rlWho===m.id?'selected':''}>${esc(m.name)} · ${act.filter(c=>relDesigner(c)===m.id).length}</option>`).join('')}${noD?`<option value="none" ${ui.rlWho==='none'?'selected':''}>Sem designer definido · ${noD}</option>`:''}</select></label></div></div>
 ${L.length?`<div class="rl-list" role="list"><div class="rl-hd"><span>Cliente</span><span>Designer responsável</span><span>Tempo de casa</span><span>Próximo compromisso</span><span>Situação</span></div>
 ${L.map(c=>{const d=relDesigner(c);const s=relSit(c);const nx=relNextMeet(c.id)[0];const st=relStart(c);
  return `<button class="rl-row" role="listitem" data-act="st-open" data-id="${c.id}"><span class="rl-nm">${clientLogo(c,44)}<span style="min-width:0"><b>${esc(c.name)}</b><small>${esc(c.segment||'Segmento a preencher')}</small></span></span>
   <span class="rl-c o">${d?`<span class="rl-who">${av(d)}<span style="min-width:0"><b>${esc(mName(d))}</b></span></span>`:'<span class="rl-muted">A definir</span>'}</span>
   <span class="rl-c o">${st?`<b>${esc(relTenure(st))}</b><small>desde ${fD(st)}/${st.slice(0,4)}</small>`:'<span class="rl-muted">Início a preencher</span>'}</span>
   <span class="rl-c o">${nx?`<b>${esc(WD[parseD(nx.when).getDay()]+' '+fD(nx.when)+' · '+pad(parseD(nx.when).getHours())+':'+pad(parseD(nx.when).getMinutes()))}</b><small>${esc(nx.kind||nx.title||'Compromisso')}</small>`:'<span class="rl-muted">Nada agendado</span>'}</span>
   <span class="rl-c rl-sitc">${relSitHtml(s)}</span></button>`}).join('')}</div>`:emptyBox(q?'Nenhum cliente encontrado':'Nenhum cliente nesta seleção',q?'Tente outro nome ou parte do nome.':'Mude a situação ou o designer no filtro acima.')}`}

/* ---------- página do cliente ---------- */
function stClient(c){const adm=relCanEdit();const month=thisMonth();const o=relOps(c,month);const d=relDesigner(c);const s=relSit(c);const st=relStart(c);const pf=relPerfil(c);const p=c.profile||{};
 const fromNote=d&&!c.designerId;const ML=MN[new Date().getMonth()].replace(/^./,x=>x.toUpperCase());
 const city=(String(c.address||'').match(/[^,\-]+\([A-Z]{2}\)\s*$/)||[''])[0].trim();
 const I=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${{tel:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',pin:'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>'}[k]}</svg>`;
 const fill=t=>`<em class="rc-miss">${t||'a preencher'}</em>`;
 const details=[['Outros contatos',c.otherContacts],['Tom da conversa',p.tone],['Canal e melhor horário',[p.channel,p.bestTime].filter(Boolean).join(' · ')],['O que valoriza',p.values],['Interesses do público',p.audience]].filter(x=>x[1]);
 const notes=(c.notes||[]).slice().reverse();
 const hero=`<section class="rc-hero">
  <div class="rc-id"><div class="rc-logo">${clientLogo(c,80)}${adm?`<button class="rc-logo-x" data-act="cl-logo" data-id="${c.id}">${c.logoId?'Trocar logo':'Adicionar logo'}</button>`:''}</div>
   <div style="min-width:0;flex:1"><div class="rc-name"><h1>${esc(c.name)}</h1>${adm?`<button class="btn sm" data-act="st-edit" data-id="${c.id}">Editar dados</button>`:''}</div>
    <div class="rc-sub">${esc(c.segment||'Segmento a preencher')}${city?' · '+esc(city):''}</div>
    <div class="rc-contacts"><span>${I('user')}${c.contact?esc(c.contact):fill('contato principal a preencher')}</span>
     <span>${I('tel')}${c.phone?`<a href="https://wa.me/${waNum(c.phone)}" target="_blank" rel="noopener">${esc(c.phone)}</a>`:fill('telefone / WhatsApp a preencher')}</span>
     <span>${I('mail')}${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:fill('e-mail a preencher')}</span>
     <span>${I('pin')}${c.address?esc(c.address)+(/\d/.test(c.address)?'':' '+fill('· rua e número a preencher')):fill('endereço a preencher')}</span></div></div></div>
  <div class="rc-facts">
   <div><span>Designer responsável</span><b>${d?av(d)+esc(mName(d)):fill('a definir')}</b><small>${d?(c.designerSince?'desde '+fD(c.designerSince)+'/'+c.designerSince.slice(0,4):fromNote?'conforme o cadastro do calendário':''):''}${adm?` <button class="lnk" data-act="rl-designer" data-id="${c.id}">${d?'Alterar':'Definir'}</button>`:''}</small></div>
   <div><span>Editor de vídeo principal</span><b>${c.videoEditorId?av(c.videoEditorId)+esc(mName(c.videoEditorId)):'A definir'}</b>${adm?`<small><button class="lnk" data-act="rl-video-owner" data-id="${c.id}">${c.videoEditorId?'Alterar':'Definir'}</button></small>`:''}</div>
   <div><span>Cliente desde</span><b>${st?fD(st)+'/'+st.slice(0,4):fill()}</b>${!st&&adm?`<small><button class="lnk" data-act="rl-agree" data-id="${c.id}">Informar início</button></small>`:''}</div>
   <div><span>Tempo de casa</span><b>${st?esc(relTenure(st)):'—'}</b></div>
   <div><span>Situação</span><b>${relSitHtml(s)}</b>${s.h&&s.h.why.length?`<small>${esc(s.h.why[0])}</small>`:''}</div>
   <div><span>Perfil do cliente</span><b>${pf?`<span title="${esc(pf[2])}">${esc(pf[1])}</span>`:fill('a definir')}</b>${adm?`<small><button class="lnk" data-act="st-prof" data-id="${c.id}">${pf?'Revisar':'Definir'}</button></small>`:''}</div></div>
  ${p.care||pf?`<p class="rc-care">${pf?`<b>${esc(pf[1])}:</b> ${esc(pf[2])}`:''}${p.care?`${pf?' ':''}<b>Como prefere ser atendido:</b> ${esc(p.care)}`:''}</p>`:''}
  ${details.length||notes.length?`<details class="rc-more"><summary>Mais informações da conta</summary><div class="rc-dl">${details.map(([l,v])=>`<div><span>${l}</span><b>${esc(v)}</b></div>`).join('')}${notes.length?`<div class="full"><span>Observações importantes</span>${notes.slice(0,5).map(n=>`<b style="font-weight:400">${esc(n.text)}</b>`).join('')}</div>`:''}</div></details>`:''}
 </section>`;
 const pend=[];o.tkLate.filter(t=>isLeader()||tkMine(t)).forEach(t=>pend.push({late:1,t:t.title,m:'atrasada '+(-daysTo(t.due))+'d · '+(t.assigneeId?first(t.assigneeId):'sem responsável'),act:['task-open',t.id]}));
 if(o.cal&&o.cal.stage!=='entregue')pend.push({late:calLate(o.cal)?1:0,t:'Calendário de '+ML+' · '+CAL_L[o.cal.stage],m:calLate(o.cal)?'atrasado, prazo '+fD(o.cal.due):o.cal.due?'prazo '+fD(o.cal.due):'sem prazo',act:['cal-open',o.cal.id]});
 S.creatives.filter(x=>x.clientId===c.id&&x.status==='Ajustes solicitados').forEach(x=>pend.push({late:0,t:(x.title||'Peça')+' · ajustes pedidos',m:x.memberId?first(x.memberId):'',act:['open-creative',x.id]}));
 S.creatives.filter(x=>x.clientId===c.id&&x.status==='Em aprovação').forEach(x=>pend.push({late:0,t:(x.title||'Peça')+' · aguardando aprovação',m:ago(x.review?.requestedAt),act:['ap-review',x.id]}));
 S.creatives.filter(x=>x.clientId===c.id&&x.status===AP_FREE&&!x.sentAt).forEach(x=>pend.push({late:0,t:(x.title||'Peça')+' · aprovada, falta enviar ao cliente',m:'',act:['open-creative',x.id]}));
 const ops=`<div class="rc-h"><h2>Entregas de ${ML}</h2><button class="lnk" data-act="rl-how">Como é calculado</button></div>
  <div class="rc-ops"><div><span>Previstas no mês</span><b>${o.prev}</b><small>${esc([o.lines.length?o.lines.map(i=>i.qty+' '+i.l).join(' + '):'acordo não definido',o.cal?'1 calendário':'',o.tks.length?o.tks.length+' demanda'+(o.tks.length>1?'s':'')+' extra'+(o.tks.length>1?'s':''):''].filter(Boolean).join(' · '))}</small></div>
   <div><span>Entregues</span><b>${o.done}</b><small>enviadas ao cliente</small></div>
   <div><span>Pendentes</span><b>${o.pend}</b><small>${o.arte.inprog+o.video.inprog?o.arte.inprog+o.video.inprog+' em produção':'no mês'}</small></div>
   <div><span>Atrasadas</span><b class="${o.late?'late':''}">${o.late}</b><small>${o.late?'prazo vencido':'nada vencido'}</small></div>
   <div><span>Pacote do mês</span><b>${o.prev?o.pct+'%':'—'}</b><div class="rc-prog" aria-hidden="true"><i style="width:${Math.min(100,o.pct)}%"></i></div></div></div>
  ${pend.length?`<div class="rc-pend">${pend.slice(0,6).map(x=>`<button data-act="${x.act[0]}" data-id="${esc(x.act[1])}"><i class="${x.late?'late':''}"></i><span>${esc(x.t)}</span><small>${esc(x.m||'')}</small></button>`).join('')}</div>`:''}`;
 const ag=o.ag;const plan=ag?(ag.plan==='basico'?'Pacote básico':'Pacote personalizado'):'';
 const agree=`<section class="rc-card"><header><h3>Acordo de marketing</h3>${adm?`<button class="btn sm" data-act="rl-agree" data-id="${c.id}">${ag?'Editar acordo':'Definir acordo'}</button>`:''}</header>
  ${ag?`<div class="rc-plan"><b>${plan}</b><small>${esc(ag.items.map(i=>i.qty+' '+i.l).join(' + '))} por mês</small></div>
  <div style="overflow-x:auto;margin:0 -2px"><table class="rc-tbl"><thead><tr><th>${ML}</th><th>Contratado</th><th>Produzido</th><th>Entregue</th><th>Restante</th><th>Situação</th></tr></thead><tbody>
  ${o.lines.map(i=>{const pc=i.deliv==null?{k:'mute',l:'Acompanhar em Tarefas'}:relPace(+i.qty,i.deliv);return `<tr><td><b>${esc(i.l)}</b></td><td>${i.qty}</td><td>${i.prod==null?'—':i.prod}</td><td>${i.deliv==null?'—':i.deliv}</td><td>${i.deliv==null?'—':Math.max(0,i.qty-i.deliv)}</td><td><span class="st ${pc.k}">${pc.l}</span></td></tr>`}).join('')}
  ${o.cal?`<tr><td><b>Calendário</b></td><td>1</td><td>${['validacao','entregue'].includes(o.cal.stage)?1:0}</td><td>${o.cal.stage==='entregue'?1:0}</td><td>${o.cal.stage==='entregue'?0:1}</td><td><span class="st ${o.cal.stage==='entregue'?'ok':calLate(o.cal)?'warn':'mute'}">${CAL_L[o.cal.stage]}</span></td></tr>`:''}</tbody></table></div>`
  :`<p style="margin:0;color:var(--muted);font-size:14px">O acordo deste cliente ainda não foi registrado. A referência mais comum é o <b style="color:var(--ink)">pacote básico: 8 artes e 4 vídeos/Reels por mês</b>, mas cada cliente pode ter o seu.</p>`}
  <div class="rc-dl"><div><span>Serviços contratados</span><b>${esc((c.onboarding?.services||[]).map(sName).filter(Boolean).join(', '))||relFill()}</b></div>
   <div><span>Contrato</span><b>${c.contractStart?fD(c.contractStart)+'/'+c.contractStart.slice(0,4)+(c.contractEnd?' a '+fD(c.contractEnd)+'/'+c.contractEnd.slice(0,4):' · sem prazo final'):relFill()}</b></div>
   ${ag&&ag.extras?`<div class="full"><span>Serviços adicionais</span><b>${esc(ag.extras)}</b></div>`:''}${ag&&ag.notes?`<div class="full"><span>Particularidades</span><b>${esc(ag.notes)}</b></div>`:''}
   ${c.packageNotes?`<div class="full"><span>Combinados registrados</span><b style="font-weight:400">${esc(c.packageNotes)}</b></div>`:''}</div></section>`;
 const meets=relNextMeet(c.id);const nx=meets[0];const md=m=>parseD(m.when);const hm=m=>pad(md(m).getHours())+':'+pad(md(m).getMinutes());
 const ppl=m=>(m.memberIds||[]).map(first).join(', ');
 const agenda=`<section class="rc-card"><header><h3>Próximos compromissos</h3><button class="btn sm" data-act="new-meeting" data-client="${c.id}" data-scope="externa">+ Agendar</button></header>
  ${nx?`<button class="rc-next" data-act="edit-meeting" data-id="${nx.id}"><span class="rc-date"><small>${WD[md(nx).getDay()]}</small><b>${md(nx).getDate()}</b><small>${MN[md(nx).getMonth()].slice(0,3)}</small></span>
   <span style="min-width:0"><span class="pill ${nx.status==='Confirmado'?'p-ok':''}" style="margin-bottom:4px">${esc(nx.status||'Agendado')}</span><span class="t">${esc(nx.kind||nx.title||'Compromisso')}</span>
   <span class="m">${hm(nx)}${nx.dur?' · '+durTxt(nx.dur):''}${nx.place?' · '+esc(nx.place):''}</span><span class="m">${ppl(nx)?'Atendimento: '+esc(ppl(nx)):'Sem responsável escalado'}</span>${nx.notes?`<span class="m">${esc(String(nx.notes).slice(0,140))}</span>`:''}</span></button>
   ${meets.length>1?`<div class="rc-ag">${meets.slice(1,8).map(m=>`<button data-act="edit-meeting" data-id="${m.id}"><time>${fD(m.when)} · ${hm(m)}</time><span style="min-width:0"><b>${esc(m.kind||m.title||'Compromisso')}</b><small>${esc([ppl(m),m.place].filter(Boolean).join(' · ')||'—')}</small></span></button>`).join('')}</div>`:''}`
  :`<p style="margin:0;color:var(--muted);font-size:14px">Nenhum compromisso futuro com este cliente. Reuniões, visitas e captações marcadas em Compromissos aparecem aqui sozinhas.</p>`}</section>`;
 const since=stLast(c.id)?.doneAt||c.closedAt||'';
 return `<div class="rc-top"><button class="btn" data-act="st-back">‹ Carteira de clientes</button><button class="btn" data-act="open-client" data-id="${c.id}">Ficha comercial completa</button></div>
 ${hero}${ops}
 <div class="rc-grid">${agree}${agenda}</div>
 ${rcHistory(c)}
 ${stDone(c,since)}`}

/* histórico do relacionamento: largura total, agrupado por mês */
function rcEvents(c){const f=ui.stFilter||'all';const ev=[];
 if(f==='all'||f==='up')S.updates.filter(u=>u.clientId===c.id).forEach(u=>ev.push({at:u.at,kind:u.kind||'Atualização',cls:UP_CLS[u.kind]||'',text:u.text,acc:u.by,mid:u.byMember,up:u}));
 if(f==='all'||f==='fu')S.follows.filter(x=>x.clientId===c.id&&x.status==='Feito').forEach(x=>ev.push({at:(x.doneAt||'')+'T23:59',dateOnly:true,kind:x.type===ST_TYPE?'Follow-up estratégico':isCad(x)?'Contato comercial':'Follow-up',cls:'p-alto',text:[x.result&&'Resultado: '+x.result,x.notes,x.business&&'Negócio: '+x.business,x.life&&'Momento de vida: '+x.life,x.opportunity&&'Oportunidade: '+x.opportunity].filter(Boolean).join('\n'),acc:x.doneBy,mid:x.doneMember,act:['fu-view',x.id]}));
 if(f==='all'){(c.designerHist||[]).forEach(h=>ev.push({at:h.at,kind:'Carteira',cls:'',text:'Designer responsável: '+(h.from?mName(h.from):'a definir')+' → '+(h.to?mName(h.to):'a definir'),mid:h.by}));
  (c.profile?.hist||[]).forEach(h=>{const P=REL_PERFIS.find(x=>x[0]===h.style);ev.push({at:h.at,dateOnly:String(h.at).length<=10,kind:'Perfil',cls:'',text:'Perfil do cliente: '+(P?P[1]:'não definido'),mid:h.by})});
  S.meetings.filter(m=>m.clientId===c.id&&m.status==='Concluído').forEach(m=>ev.push({at:m.when,kind:'Reunião realizada',cls:'p-medio',text:(m.kind||m.title||'Reunião')+(m.notes?'\n'+m.notes:''),mid:(m.memberIds||[])[0],act:['edit-meeting',m.id]}))}
 return ev.sort((a,b)=>(b.at||'').localeCompare(a.at||''))}
function rcHistory(c){const ev=rcEvents(c);const n=ui.rcHistN||15;const adm=isAdmin();let lastM='';
 const fdt=e=>{const d=parseD(e.at);if(!d)return{d:'—',t:''};return{d:pad(d.getDate())+' '+MN[d.getMonth()].slice(0,3)+' '+d.getFullYear(),t:e.dateOnly?WDF[d.getDay()]:pad(d.getHours())+':'+pad(d.getMinutes())}};
 const rows=ev.slice(0,n).map(e=>{const d=parseD(e.at);const mk=d?d.getFullYear()+'-'+d.getMonth():'';const head=mk!==lastM&&d?`<li class="rc-mh">${MN[d.getMonth()].replace(/^./,x=>x.toUpperCase())} de ${d.getFullYear()}</li>`:'';lastM=mk;const t=fdt(e);
  return head+`<li class="rc-ev"><time><b>${t.d}</b><small>${t.t}</small></time><div class="rc-evb">${authorAv(e.acc,e.mid)}<div style="min-width:0;flex:1"><div class="rc-evh"><b>${esc(authorName(e.acc,e.mid))}</b><span class="pill ${e.cls}">${esc(e.kind)}</span>${e.up?.editedAt?'<small>editado</small>':''}<span style="flex:1"></span>${e.act?`<button class="lnk" data-act="${e.act[0]}" data-id="${e.act[1]}">Abrir</button>`:''}${e.up&&adm?`<button class="lnk" data-act="up-edit" data-id="${e.up.id}" data-v="${esc(e.up.uid)}">Editar</button><button class="lnk" data-act="up-del" data-id="${e.up.id}" data-v="${esc(e.up.uid)}" style="color:var(--crit)">Excluir</button>`:''}</div>${e.text?`<p>${esc(e.text)}</p>`:''}</div></div></li>`}).join('');
 return `<section class="rc-card rc-histc"><header><div><h3>Histórico do relacionamento</h3><small style="color:var(--muted);font-size:13px">${ev.length} registro${ev.length===1?'':'s'} · visível para toda a equipe</small></div><div class="chips">${[['all','Tudo'],['up','Atualizações'],['fu','Follow-ups']].map(([k,l])=>`<button class="chip" data-act="st-filter" data-v="${k}" aria-pressed="${(ui.stFilter||'all')===k}">${l}</button>`).join('')}</div></header>
  ${relConsult(c)?`<p class="rc-consult">Modo consulta: este cliente é da carteira de ${esc(relDesigner(c)?mName(relDesigner(c)):"outro profissional")}. Você pode ver o histórico, mas os registros ficam com quem cuida da conta.</p>`:`<div class="rc-compose"><select id="st-kind" aria-label="Tipo de registro">${UP_KINDS.map(k=>`<option ${ui.stKind===k?'selected':''}>${k}</option>`).join('')}</select><textarea id="st-text" placeholder="Registre uma conversa, um combinado, um resultado ou um ponto de atenção">${esc(ui.stDraft)}</textarea><button class="btn primary" data-act="st-post" data-id="${c.id}">Registrar</button></div>`}
  ${ev.length?`<ol class="rc-tl">${rows}</ol>${ev.length>n?`<div style="text-align:center"><button class="btn" data-act="rc-more">Ver registros anteriores (${ev.length-n})</button></div>`:''}`:emptyBox('Nenhum registro ainda','Registre a primeira interação com este cliente acima.')}</section>`}

/* histórico sem as observações fixas (que já aparecem em Contatos e informações) */
function stTimeline(c){const f=ui.stFilter||'all';const ev=[];
 if(f==='all'||f==='up')S.updates.filter(u=>u.clientId===c.id).forEach(u=>ev.push({at:u.at,kind:u.kind||'Atualização',cls:UP_CLS[u.kind]||'',text:u.text,acc:u.by,mid:u.byMember,up:u}));
 if(f==='all'||f==='fu')S.follows.filter(x=>x.clientId===c.id&&x.status==='Feito').forEach(x=>ev.push({at:(x.doneAt||'')+'T23:59',dateOnly:true,kind:x.type===ST_TYPE?'Follow-up estratégico':isCad(x)?'Contato comercial':'Follow-up',cls:'p-alto',text:[x.result&&'Resultado: '+x.result,x.notes,x.business&&'Negócio: '+x.business,x.life&&'Momento de vida: '+x.life,x.opportunity&&'Oportunidade: '+x.opportunity].filter(Boolean).join('\n'),acc:x.doneBy,mid:x.doneMember,act:['fu-view',x.id]}));
 if(f==='all'){(c.designerHist||[]).forEach(h=>ev.push({at:h.at,kind:'Carteira',cls:'',text:'Designer responsável: '+(h.from?mName(h.from):'a definir')+' → '+(h.to?mName(h.to):'a definir'),mid:h.by}));
  (c.profile?.hist||[]).forEach(h=>{const P=REL_PERFIS.find(x=>x[0]===h.style);ev.push({at:h.at,kind:'Perfil',cls:'',text:'Perfil do cliente: '+(P?P[1]:'não definido'),mid:h.by})})}
 ev.sort((a,b)=>(b.at||'').localeCompare(a.at||''));const adm=isAdmin();
 return ev.length?ev.map(e=>`<div class="st-up">${authorAv(e.acc,e.mid)}<div style="min-width:0"><div class="h"><b>${esc(authorName(e.acc,e.mid))}</b><span class="pill ${e.cls}">${esc(e.kind)}</span><span>${e.dateOnly||String(e.at).length<=10?fD(e.at)+'/'+String(e.at).slice(0,4):fDT(e.at)}</span>${e.up?.editedAt?`<span>· editado</span>`:''}
  <span style="flex:1"></span>${e.act?`<button class="lnk" data-act="${e.act[0]}" data-id="${e.act[1]}">Ver registro</button>`:''}${e.up&&adm?`<button class="lnk" data-act="up-edit" data-id="${e.up.id}" data-v="${esc(e.up.uid)}">Editar</button><button class="lnk" data-act="up-del" data-id="${e.up.id}" data-v="${esc(e.up.uid)}" style="color:var(--crit)">Excluir</button>`:''}</div>
  ${e.text?`<p>${esc(e.text)}</p>`:''}</div></div>`).join(''):emptyBox('Nenhum registro ainda','Registre a primeira atualização sobre este cliente acima.')}

/* ---------- formulários ---------- */
function stProfileForm(id){const c=byId('clients',id);const p=c.profile||{};const cur=relPerfil(c);
 formModal({title:'Perfil do cliente · '+c.name,values:{...p,style:cur?cur[0]:'',channel:p.channel||''},back:()=>{},fields:[
  {k:'style',l:'Perfil principal',t:'select',o:REL_PERFIS.map(([v,l,d])=>({v,l:l+' · '+d})),empty:'Ainda não definido',full:1,hint:'É uma orientação de atendimento, não um diagnóstico. Revise quando o relacionamento mudar.'},
  {k:'care',l:'Como prefere ser atendido',t:'textarea',full:1,ph:'Ex.: responde melhor por áudio curto; aprova rápido se receber 2 opções; sempre copiar a sócia'},
  {k:'tone',l:'Tom da conversa',t:'select',o:['Formal','Informal','Próximo, mas profissional'],empty:'—'},{k:'channel',l:'Canal preferido',t:'select',o:FU_CH,empty:'—'},
  {k:'bestTime',l:'Melhor dia e horário para contato',ph:'Ex.: terças de manhã'},{k:'values',l:'O que ele valoriza',ph:'Ex.: agilidade e ver números de vendas'},
  {k:'audience',l:'Interesses do público do cliente',full:1,ph:'Ex.: futebol, churrasco, sertanejo'}],
  onSave:async v=>{const cur0=byId('clients',id);const old=cur0.profile||{};const mm=myMember();const hist=[...(old.hist||[])];
   if((REL_OLD[old.style]||old.style||'')!==(v.style||''))hist.push({at:today(),by:mm?.id||'',style:v.style||''});
   await put('clients',id,{...cur0,profile:{...old,...v,hist,updatedAt:today(),by:mm?.id||''}});toast('Perfil salvo')}})}
function relDesignerForm(id){const c=byId('clients',id);const cur=relDesigner(c);
 const opts=S.members.filter(m=>m.area!=='Comercial').sort((a,b)=>a.name.localeCompare(b.name,'pt')).map(m=>({v:m.id,l:m.name+' · '+m.area}));
 formModal({title:'Designer responsável · '+c.name,values:{designerId:cur,designerSince:c.designerSince||''},back:()=>{},fields:[
  {k:'designerId',l:'Designer responsável pela conta',t:'select',o:opts,empty:'A definir',full:1,hint:'É a carteira do designer. Os novos calendários do cliente já vêm com essa pessoa.'},
  {k:'designerSince',l:'Responsável desde',t:'date'}],
  onSave:async v=>{const cur0=byId('clients',id);const was=relDesigner(cur0);const mm=myMember();const rec={...cur0,designerId:v.designerId,designerSince:v.designerSince||(v.designerId!==was?today():cur0.designerSince||'')};
   if(v.designerId!==was||!cur0.designerId)rec.designerHist=[...(cur0.designerHist||[]),{at:new Date().toISOString(),by:mm?.id||'',from:was||'',to:v.designerId||''}];
   await put('clients',id,rec);toast('Designer responsável atualizado')}})}
function relAgreeForm(id){const c=byId('clients',id);const ag=relAgreement(c);const it=k=>ag?.items?.find(i=>i.id===k);
 const others=(ag?.items||[]).filter(i=>!['artes','videos'].includes(i.id)).map(i=>i.qty+' '+i.l).join('\n');
 formModal({title:'Acordo de marketing · '+c.name,values:{plan:ag?.plan||'basico',artes:it('artes')?.qty??(ag?0:8),videos:it('videos')?.qty??(ag?0:4),others,extras:ag?.extras||'',notes:ag?.notes||'',contractStart:c.contractStart||'',contractEnd:c.contractEnd||''},back:()=>{},fields:[
  {k:'plan',l:'Tipo de acordo',t:'select',o:[{v:'basico',l:'Pacote básico · 8 artes + 4 vídeos/Reels por mês'},{v:'personalizado',l:'Pacote personalizado'}],full:1,hint:'Se as quantidades abaixo forem diferentes de 8 e 4, o acordo fica como personalizado.'},
  {k:'artes',l:'Artes por mês',t:'number'},{k:'videos',l:'Vídeos / Reels por mês',t:'number'},
  {k:'others',l:'Outros itens mensais (um por linha)',t:'textarea',full:1,ph:'Ex.: 1 captação\n8 stories',hint:'Comece com a quantidade. Esses itens são acompanhados pelas Tarefas.'},
  {k:'extras',l:'Serviços adicionais',t:'textarea',full:1,ph:'Ex.: tráfego pago com verba de R$ 1.500; manutenção do site'},
  {k:'notes',l:'Particularidades comerciais',t:'textarea',full:1,ph:'Ex.: aprova tudo na sexta; mês de dezembro com 4 artes extras de Natal'},
  {k:'contractStart',l:'Início do relacionamento / contrato',t:'date'},{k:'contractEnd',l:'Fim do contrato',t:'date'}],
  onSave:async v=>{const a=Math.max(0,Math.round(+v.artes||0)),vd=Math.max(0,Math.round(+v.videos||0));
   const items=[{id:'artes',l:'Artes',qty:a,kind:'arte'},{id:'videos',l:'Vídeos/Reels',qty:vd,kind:'video'}].filter(i=>i.qty>0);
   String(v.others||'').split('\n').map(x=>x.trim()).filter(Boolean).forEach((x,i)=>{const m=x.match(/^(\d+)\s*x?\s*(.+)$/i);if(m)items.push({id:'o'+i,l:m[2].trim().replace(/^./,s=>s.toUpperCase()),qty:+m[1],kind:'outro'})});
   const plan=a===8&&vd===4&&items.length===2&&v.plan==='basico'?'basico':'personalizado';const cur0=byId('clients',id);const mm=myMember();
   const agreement={plan,items,extras:v.extras,notes:v.notes,updatedAt:today(),by:mm?.id||'',hist:[...(cur0.agreement?.hist||[]),{at:today(),by:mm?.id||'',plan,items:items.map(i=>i.qty+' '+i.l).join(' + ')}].slice(-24)};
   await put('clients',id,{...cur0,agreement,contractStart:v.contractStart,contractEnd:v.contractEnd});toast('Acordo de marketing salvo')}})}
function relHow(){openModal(`<div class="mh"><h2>Como o resumo é calculado</h2><button class="x" data-act="close" aria-label="Fechar">×</button></div><div class="mb" style="font-size:14.5px">
 <p style="margin:0"><b>Previstas no mês</b> = itens do acordo de marketing + o calendário do mês (aba Calendários) + demandas extras do cliente com prazo no mês (aba Tarefas).</p>
 <p style="margin:0"><b>Produzido</b> = artes e vídeos aprovados pela liderança no fluxo de Aprovações no mês. Produzir não é entregar.</p>
 <p style="margin:0"><b>Entregue</b> = peças marcadas como enviadas no grupo do cliente (ou publicadas), calendário com entrega registrada e demandas extras concluídas.</p>
 <p style="margin:0"><b>Atrasadas</b> = tarefas abertas com prazo vencido e calendário do mês atrasado. Vídeos são as peças em formato Reels, vídeo longo ou captação, ou arquivos de vídeo; o restante conta como arte.</p>
 <p style="margin:0;color:var(--muted)">Nada aqui é digitado à mão: os números vêm dos registros da equipe.</p></div><div class="mf"><span class="spacer"></span><button class="btn primary" data-act="close">Entendi</button></div>`)}

/* ---------- eventos ---------- */
document.addEventListener('change',e=>{if(e.target.id==='rl-who'){ui.rlWho=e.target.value;refresh()}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id,v=b.dataset.v;
 if(a==='rc-more'){e.stopPropagation();ui.rcHistN=(ui.rcHistN||15)+20;refresh();return}
 if(!['rl-sit','rl-designer','rl-agree','rl-how'].includes(a))return;e.stopPropagation();e.preventDefault();
 if(a==='rl-sit'){ui.rlSit=v;refresh()}else if(a==='rl-how')relHow();else if(!relCanEdit())toast('Só administradores alteram estes dados.');else if(a==='rl-designer')relDesignerForm(id);else relAgreeForm(id)},true);

/* ---------- interface clara ---------- */
try{document.documentElement.setAttribute('data-theme','light')}catch(e){}
(()=>{const st=document.createElement('style');st.textContent=`
:root{--bg:#F6F6F4;--surface-2:#F0F0EE;--line:#E6E6E2;--muted:#62625E}
.side{background:#FFFFFF;color:var(--ink);border-right:1px solid var(--line)}
.brand small{color:var(--muted)}
.nav button{color:#55554F}.nav button:hover{background:var(--surface-2);color:var(--ink)}
.nav button[aria-current="page"]{background:#F2F2EF;color:var(--ink)}
.who{background:var(--bg);border-color:var(--line);color:var(--ink)}.who small{color:var(--muted)}
.who-x{border-color:var(--line);color:var(--muted)}.who-x:hover,.who-x.armed{color:var(--accent);border-color:var(--accent)}
.sync{color:var(--muted)}
@media (max-width:820px){.mobnav{background:#FFFFFF;border-top:1px solid var(--line);box-shadow:0 -4px 16px rgba(0,0,0,.04)}.mobnav button{color:#6A6A66}.mobnav button[aria-current="page"]{color:var(--ink)}}
.rc-hero{background:var(--surface);color:var(--ink);border:1px solid var(--line);border-top:4px solid var(--brand-red);border-radius:18px;padding:22px clamp(16px,3vw,28px);display:flex;flex-direction:column;align-items:stretch;gap:18px;box-shadow:0 1px 2px rgba(12,12,12,.03),0 10px 30px rgba(12,12,12,.05)}
.rc-hero::after{display:none}
.rc-id{display:flex;gap:20px;align-items:flex-start}
.rc-logo{width:92px;height:92px;border-radius:18px;background:#fff;border:1px solid var(--line);display:grid;place-items:center;overflow:hidden;flex:none;position:relative}
.rc-logo .clogo{width:80px!important;height:80px!important;border:0;border-radius:12px;font-size:26px}
.rc-name{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
.rc-hero h1{color:var(--ink);font-size:clamp(24px,3vw,30px);line-height:1.1}
.rc-sub{color:var(--muted);font-size:14.5px;margin-top:4px}
.rc-contacts{display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:12px;font-size:14px}
.rc-contacts span{display:inline-flex;align-items:center;gap:7px;min-width:0;overflow-wrap:anywhere}
.rc-contacts svg{width:16px;height:16px;flex:none;fill:none;stroke:var(--muted);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.rc-contacts a{color:var(--ink);text-decoration:none;font-weight:600}.rc-contacts a:hover{color:var(--accent)}
.rc-miss{color:#9A9A94;font-style:normal;font-weight:400}
.rc-facts{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0;margin:0;border-top:1px solid var(--line);padding-top:16px}
.rc-facts>div{border:0;border-left:1px solid var(--line);padding:0 16px;min-width:0}.rc-facts>div:first-child{border-left:0;padding-left:0}
.rc-facts>div>span{display:block;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:700}
.rc-facts b{display:flex;align-items:center;gap:8px;font-size:15px;margin-top:6px;color:var(--ink);font-weight:600;overflow-wrap:anywhere}
.rc-facts small{display:block;color:var(--muted);font-size:12px;margin-top:3px}
.rc-facts .lnk{color:var(--accent)}
.rc-hero .rl-sit{color:var(--ink);font-size:15px}
.rc-care{margin:0;background:var(--bg);border-radius:12px;padding:10px 14px;font-size:14px;color:#3E3E3A}.rc-care b{color:var(--ink)}
.rc-more summary{cursor:pointer;font-size:13.5px;font-weight:600;color:var(--muted);list-style:none;display:inline-flex;gap:6px;align-items:center}
.rc-more summary::before{content:"›";display:inline-block;transition:transform .15s;font-size:16px}.rc-more[open] summary::before{transform:rotate(90deg)}
.rc-more summary::-webkit-details-marker{display:none}.rc-more .rc-dl{margin-top:12px}
.rc-ops{box-shadow:none}.rc-prog i{background:var(--brand-red)}
.rc-date{background:var(--surface);color:var(--ink);border:1px solid var(--line)}.rc-date small{color:var(--muted)}
.rc-next{background:var(--bg)}
.rc-card{gap:16px}
.rc-histc{padding:22px clamp(16px,2.6vw,28px)}
.rc-histc>header{align-items:flex-start;flex-wrap:wrap}
.rc-histc h3{font-size:18px}
.rc-compose{display:grid;grid-template-columns:190px 1fr auto;gap:10px;align-items:start}
.rc-compose select,.rc-compose textarea{border:1px solid var(--line);background:var(--bg);border-radius:10px;padding:10px 12px;width:100%;min-width:0}
.rc-compose textarea{min-height:46px;resize:vertical}.rc-compose textarea:focus{min-height:90px}
.rc-tl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.rc-mh{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:18px 0 8px;border-bottom:1px solid var(--line)}
.rc-mh:first-child{padding-top:4px}
.rc-ev{display:grid;grid-template-columns:130px 1fr;gap:20px;padding:16px 0;border-bottom:1px solid var(--line)}
.rc-ev:last-child{border-bottom:0}
.rc-ev time b{display:block;font-size:14px;font-weight:700}.rc-ev time small{display:block;color:var(--muted);font-size:12.5px;font-family:var(--f-mono);margin-top:2px}
.rc-evb{display:flex;gap:12px;align-items:flex-start;min-width:0}
.rc-evh{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:14px}.rc-evh small{color:var(--muted);font-size:12px}
.rc-evb p{margin:6px 0 0;font-size:15px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;max-width:110ch}
@media (max-width:1000px){.rc-facts{grid-template-columns:repeat(3,minmax(0,1fr));row-gap:16px}.rc-facts>div:nth-child(4){border-left:0;padding-left:0}}
@media (max-width:700px){.rc-id{flex-direction:column;gap:12px}.rc-logo{width:76px;height:76px}.rc-logo .clogo{width:66px!important;height:66px!important}.rc-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.rc-facts>div{border-left:0;padding:0}.rc-compose{grid-template-columns:1fr}.rc-ev{grid-template-columns:1fr;gap:6px}.rc-ev time{display:flex;gap:8px;align-items:baseline}}
`;(document.body||document.head).appendChild(st)})();


// Editor principal vive no próprio documento clients; a API registra o histórico com hora do servidor.
function relVideoOwnerForm(id){
 const c=byId('clients',id);if(!c||!isAdmin())return;
 const eligible=S.members.filter(m=>!m.disabled&&(String(m.area||'').toLowerCase().includes('audiovisual')||/otávio|leonardo|bruno/i.test(m.name||''))).sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 formModal({title:'Editor de vídeo principal · '+c.name,values:{videoEditorId:c.videoEditorId||''},fields:[{k:'videoEditorId',l:'Editor de vídeo principal',t:'select',o:eligible.map(m=>({v:m.id,l:m.name})),empty:'Não definido',full:1}],onSave:async v=>{
 const current=byId('clients',id);if(!current)return;
 if(v.videoEditorId&&(!byId('members',v.videoEditorId)||byId('members',v.videoEditorId).disabled)){toast('Editor indisponível');throw new Error('editor')}
 await put('clients',id,{...current,videoEditorId:v.videoEditorId});
 toast('Editor principal atualizado');
 }});
}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-act="rl-video-owner"]');if(!btn)return;e.preventDefault();e.stopPropagation();relVideoOwnerForm(btn.dataset.id)},true);
