
/* ================= APROVAÇÃO DE PEÇAS ================= */
/* fluxo: criador envia → Em aprovação → (aprovador) Aprovado = Liberado para o cliente | Recusado = Ajustes solicitados com motivo → criador envia nova versão → Em aprovação */
const AP_FREE='Liberado para o cliente';
if(!CR_STATUS.includes(AP_FREE))CR_STATUS.splice(CR_STATUS.indexOf('Aprovado'),0,AP_FREE);
CR_CLS[AP_FREE]='p-acc';CR_CLS['Aprovado']='p-ok';
VIEWS.splice(VIEWS.findIndex(v=>v[0]==='criativos')+1,0,['aprovacoes','Aprovações','Aprovar']);
IC.aprovacoes='<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 12.2l2.4 2.4 4.8-5"/>';
try{if(localStorage.getItem('crm-ui-view')==='aprovacoes')ui.view='aprovacoes'}catch(e){}
Object.assign(ui,{apTab:'fila',apRefuse:''});
document.head.insertAdjacentHTML('beforeend',`<style>
.ap-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.ap-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;text-align:left;padding:0;min-width:0;color:inherit;font:inherit;cursor:pointer}
.ap-card:hover{border-color:var(--ink)}
.ap-card .thumb{aspect-ratio:4/5}
.ap-card .ap-v{position:absolute;right:8px;top:8px;background:var(--high);color:#fff;font-size:11px;font-weight:700;border-radius:6px;padding:2px 7px}
.ap-bd{padding:12px 14px;display:flex;flex-direction:column;gap:6px;min-width:0}
.ap-bd b{font-size:15px;line-height:1.3;overflow-wrap:anywhere}
.ap-bd small{color:var(--muted);font-size:12.5px}
.ap-by{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--muted);flex-wrap:nowrap;min-width:0}
.ap-reason{font-size:13.5px;line-height:1.4;background:var(--crit-soft);color:var(--ink);border-left:3px solid var(--crit);border-radius:8px;padding:8px 10px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ap-start{display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:var(--high-soft);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.ap-start p{margin:0;font-size:14px;flex:1;min-width:200px}
.ap-who{font-size:13px;color:var(--muted);margin:0;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.modal:has(.ap-art){max-width:920px}
.ap-art{background:#0E0E0E;border-radius:14px;display:grid;place-items:center;min-height:220px;overflow:hidden}
.ap-art img,.ap-art video{display:block;max-width:100%;max-height:min(64vh,720px);object-fit:contain}
.ap-art .ap-file{display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 20px;color:#E9E9E9;text-align:center}
.ap-art .ap-file b{font-size:18px}
.ap-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:14px;color:var(--muted)}
.ap-meta b{color:var(--ink)}
.ap-acts{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ap-btn{border:0;border-radius:14px;min-height:60px;font:700 18px/1 inherit;font-family:inherit;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;letter-spacing:.01em}
.ap-btn svg{width:22px;height:22px}
.ap-btn.ok{background:#1F8A55}.ap-btn.ok:hover{background:#18744A}
.ap-btn.no{background:#D62C2C}.ap-btn.no:hover{background:#B52222}
.ap-btn.no[aria-expanded="true"]{box-shadow:0 0 0 3px var(--surface),0 0 0 5px #D62C2C}
.ap-btn:disabled{opacity:.5;cursor:default}
.ap-why{border:2px solid #D62C2C;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;background:var(--surface)}
.ap-why textarea{min-height:110px;width:100%;font:inherit;font-size:16px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);resize:vertical}
.ap-why label span{font-weight:700;font-size:14px}
.btn.ap-send{background:#D62C2C;border-color:#D62C2C;color:#fff}
.modal .mb>*{flex-shrink:0}
.ap-hist{display:flex;flex-direction:column;gap:6px}
.ap-hist .h{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;font-size:13.5px;padding:8px 10px;border-radius:10px;background:var(--surface-2)}
.ap-hist .h p{margin:2px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
.ap-tag{font-size:11.5px;font-weight:700;border-radius:6px;padding:2px 7px;white-space:nowrap}
.ap-tag.ok{background:var(--ok-soft);color:var(--ok)}.ap-tag.no{background:var(--crit-soft);color:var(--crit)}.ap-tag.req{background:var(--high-soft);color:var(--high)}
.ap-acts{position:sticky;bottom:-16px;z-index:2;background:var(--surface);padding:8px 0 10px;margin-bottom:-8px}
@media (max-width:560px){.ap-acts{gap:8px}.ap-btn{min-height:54px;font-size:16px}.ap-art img,.ap-art video{max-height:44vh}}
</style>`);

const AP_DEF=/^(ana carolina|carol|thiago|heider|osvaldo|cl[eé]rio)(\s|$)/i;
const isApprover=m=>!!m&&(m.approver===true||(m.approver!==false&&AP_DEF.test(String(m.name||'').trim())));
const approvers=()=>S.members.filter(isApprover);
const canApprove=()=>isApprover(myMember());
const orList=L=>L.length<2?L.join(''):L.slice(0,-1).join(', ')+' ou '+L[L.length-1];
const apShort=n=>{const w=String(n||'').trim().split(/\s+/);return w[0].length<=3&&w[1]?w[0]+' '+w[1]:w[0]};
const apNames=()=>orList(approvers().map(m=>apShort(m.name)))||'os aprovadores';
const apReqAt=c=>c.review?.requestedAt||c.updatedAt||'';
const apQueue=()=>S.creatives.filter(c=>c.status==='Em aprovação').sort((a,b)=>apReqAt(a).localeCompare(apReqAt(b)));
const apAdj=()=>S.creatives.filter(c=>c.status==='Ajustes solicitados').sort((a,b)=>(b.review?.decidedAt||'').localeCompare(a.review?.decidedAt||''));
const apFree=()=>S.creatives.filter(c=>c.status===AP_FREE).sort((a,b)=>(!!a.sentAt-!!b.sentAt)||(b.review?.decidedAt||'').localeCompare(a.review?.decidedAt||''));
function ago(iso){if(!iso)return'';const d=new Date(iso);if(isNaN(d))return fD(iso);const m=Math.round((Date.now()-d)/6e4);if(m<1)return'agora';if(m<60)return'há '+m+' min';const h=Math.round(m/60);if(h<24)return'há '+h+' h';const n=Math.round(h/24);return n===1?'ontem':'há '+n+' dias'}
const apBy=c=>c.review?.requestedBy||c.memberId||'';
const ICO_OK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICO_NO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
function apReq(c,extra){return{round:(c?.reviews||[]).length+1,requestedBy:myMember()?.id||'',requestedAcc:me.id||'',requestedAt:new Date().toISOString(),...(extra||{})}}

/* ---------- envio ---------- */
let apTarget=null;
function pickFiles(list){const files=[...list];const bad=files.filter(f=>!CR_TYPES[f.type]||f.size>20*1048576);const good=files.filter(f=>!bad.includes(f));
 if(bad.length)toast(bad.length===1?`“${bad[0].name}” não pode ser enviado (formato ou tamanho). Use “Enviar por link”.`:`${bad.length} arquivos ficaram de fora (formato ou tamanho acima de 20 MB).`);
 if(!good.length){apTarget=null;return}
 if(apTarget){const id=apTarget;apTarget=null;apResendForm(id,good[0]);return}
 apSubmitForm(good)}
function apSubmitForm(files){const multi=files&&files.length>1;const mm=myMember();
 const pre={clientId:ui.crClient!=='all'&&ui.crClient!=='int'?ui.crClient:'',memberId:mm?.id||'',month:thisMonth(),send:ui.view==='criativos'?'nao':'sim',title:files&&files.length===1?files[0].name.replace(/\.[^.]+$/,''):''};
 const fields=[];
 if(!multi)fields.push({k:'title',l:'Nome da peça',req:1,full:1,ph:'Ex.: Carrossel 5 erros no clareamento'});
 if(!files)fields.push({k:'link',l:'Link do arquivo',req:1,full:1,ph:'https://drive.google.com/…',hint:'Para vídeos grandes, PSD, Canva ou Figma. Deixe o link aberto para quem tem o endereço.'});
 fields.push({k:'clientId',l:'Cliente',t:'select',o:clientOpts(),empty:'Escolha o cliente',req:1},{k:'format',l:'Formato',t:'select',o:FORMATS,empty:'—'},
  {k:'memberId',l:'Quem criou',t:'select',o:memberOpts(),empty:'—'},{k:'send',l:'Depois de enviar',t:'select',o:[{v:'sim',l:'Pedir aprovação agora'},{v:'nao',l:'Só guardar na biblioteca'}]},
  {k:'notes',l:'Recado para quem aprova (opcional)',t:'textarea',full:1,ph:'Legenda, contexto, o que conferir…'});
 formModal({title:files?(multi?`Enviar ${files.length} peças`:'Enviar peça'):'Enviar peça por link',values:pre,fields,
  onSave:async v=>{if(v.link&&!/^https?:\/\//i.test(v.link)){toast('O link precisa começar com http:// ou https://');throw new Error('link')}
   const ask=v.send!=='nao';const send=v.send;delete v.send;const base={...v,status:ask?'Em aprovação':'Em criação',statusAt:today(),month:pre.month,...(ask?{review:apReq(null)}:{})};
   const made=[];
   if(!files){const id=uid();await put('creatives',id,{...base,createdAt:today(),ts:Date.now()});made.push({id,title:v.title})}
   else for(let i=0;i<files.length;i++){const f=files[i];toast(`Enviando ${i+1} de ${files.length}…`);
    try{const r=await assets.upload(f,{clientId:v.clientId});const id=uid();const title=multi?f.name.replace(/\.[^.]+$/,''):v.title;
     await put('creatives',id,{...base,title,assetId:r.id,contentType:r.contentType,sizeBytes:r.sizeBytes,fileName:f.name,createdAt:today(),ts:Date.now()});made.push({id,title})}
    catch(e){const m={too_large:'é maior que 20 MB',unsupported_type:'tem um formato não aceito',quota_or_state:'não coube: o espaço da biblioteca acabou',rate_limited:'não foi enviado: muitos envios seguidos, tente em instantes',not_granted:'não foi enviado: seu acesso não permite upload'}[e?.code]||'não foi enviado';toast(`“${f.name}” ${m}.`);await new Promise(r=>setTimeout(r,1800))}}
   if(!made.length)throw new Error('none');
   if(ask)sysPost(`🎨 **${actor()}** pediu aprovação de ${made.length>1?made.length+' peças':'**'+made[0].title+'**'} · ${cName(v.clientId)}. Quem aprova: ${apNames()}.`,{act:made.length>1?'nav':'ap-review',id:made.length>1?'':made[0].id,...(made.length>1?{v:'aprovacoes'}:{})});
   else sysPost(`**${actor()}** subiu ${made.length>1?made.length+' criativos':'o criativo **'+made[0].title+'**'} de **${cName(v.clientId)}** na biblioteca`,{act:'nav',id:'',v:'criativos'});
   toast(ask?(made.length>1?made.length+' peças enviadas para aprovação':'Peça enviada para aprovação'):(made.length>1?made.length+' criativos guardados':'Criativo guardado'))}});
 const mb=$('#modal .mb');if(mb&&files&&!multi&&/^image\//.test(files[0].type)){const u=URL.createObjectURL(files[0]);mb.insertAdjacentHTML('afterbegin',`<div class="ap-art" style="min-height:0"><img src="${u}" alt="" style="max-height:38vh"></div>`)}}
async function apSend(id){const c=byId('creatives',id);if(!c)return;if(c.status==='Em aprovação'){toast('Esta peça já está aguardando aprovação.');return}
 await put('creatives',id,{...c,status:'Em aprovação',statusAt:today(),review:apReq(c),sentAt:'',sentBy:''});toast('Enviada para aprovação de '+apNames());
 sysPost(`🎨 **${actor()}** pediu aprovação de **${c.title||'peça sem nome'}** · ${cName(c.clientId)}. Quem aprova: ${apNames()}.`,{act:'ap-review',id})}
function apResendForm(id,file){const c=byId('creatives',id);if(!c)return;const last=(c.reviews||[]).filter(r=>r.decision==='recusado').pop();
 const fields=[];if(!file&&!c.assetId)fields.push({k:'link',l:'Link da nova versão',req:1,full:1,hint:'Se o arquivo foi atualizado no mesmo link, mantenha.'});
 fields.push({k:'changes',l:'O que foi ajustado',t:'textarea',full:1,req:1,ph:'Ex.: troquei a foto do 2º card e corrigi o preço'});
 formModal({title:(file?'Nova versão · ':'Reenviar para aprovação · ')+(c.title||'peça'),values:{link:c.link||'',changes:''},fields,back:()=>byId('creatives',id)&&creativeDetail(id),
  onSave:async v=>{if(v.link&&!/^https?:\/\//i.test(v.link)){toast('O link precisa começar com http:// ou https://');throw new Error('link')}
   const cur=byId('creatives',id);const rec={...cur,status:'Em aprovação',statusAt:today(),review:apReq(cur,{changes:v.changes}),sentAt:'',sentBy:''};
   if(file){toast('Enviando a nova versão…');let r;try{r=await assets.upload(file,{clientId:cur.clientId})}catch(e){toast(e?.code==='too_large'?'O arquivo passa de 20 MB. Use o link.':'Não foi possível enviar o arquivo.');throw e}
    rec.versions=[...(cur.versions||[]),{assetId:cur.assetId||'',link:cur.link||'',contentType:cur.contentType||'',fileName:cur.fileName||'',round:cur.review?.round||1,at:cur.review?.requestedAt||cur.createdAt||''}].slice(-10);
    Object.assign(rec,{assetId:r.id,contentType:r.contentType,sizeBytes:r.sizeBytes,fileName:file.name,link:''})}
   else if(v.link&&v.link!==cur.link){rec.versions=[...(cur.versions||[]),{link:cur.link,round:cur.review?.round||1,at:cur.review?.requestedAt||''}].slice(-10);rec.link=v.link}
   await put('creatives',id,rec);toast('Nova versão enviada para aprovação');
   sysPost(`🔁 **${actor()}** reenviou **${cur.title||'peça'}** (versão ${rec.review.round}) · ${cName(cur.clientId)}: ${String(v.changes).slice(0,140)}`,{act:'ap-review',id})}});
 const mb=$('#modal .mb');if(mb&&last)mb.insertAdjacentHTML('afterbegin',`<div class="ap-reason" style="-webkit-line-clamp:unset"><b>Pedido de ${esc(first(last.decidedBy))}:</b> ${esc(last.reason)}</div>`)}

/* ---------- decisão ---------- */
async function apDecide(id,ok,reason){const c=byId('creatives',id);if(!c)return false;
 if(c.status!=='Em aprovação'){toast('Esta peça já foi avaliada'+(c.review?.decidedBy?' por '+first(c.review.decidedBy):'')+'.');return false}
 if(!canApprove()){toast('Só '+apNames()+' podem aprovar ou recusar.');return false}
 const now=new Date().toISOString();const rv={...(c.review||{round:1}),decision:ok?'aprovado':'recusado',decidedBy:myMember()?.id||'',decidedAcc:me.id||'',decidedAt:now,...(ok?{}:{reason})};
 await put('creatives',id,{...c,status:ok?AP_FREE:'Ajustes solicitados',statusAt:today(),review:rv,reviews:[...(c.reviews||[]),rv].slice(-20)});
 const who2=c.memberId||c.review?.requestedBy;
 if(ok)sysPost(`✅ **${actor()}** aprovou **${c.title||'peça'}** · ${cName(c.clientId)}. Arte liberada para envio no grupo do cliente${who2?' · **'+first(who2)+'**':''}.`,{act:'open-creative',id});
 else sysPost(`↩️ **${actor()}** recusou **${c.title||'peça'}** · ${cName(c.clientId)} e devolveu${who2?' para **'+first(who2)+'**':''}: ${String(reason).slice(0,160)}`,{act:'open-creative',id});
 return true}
function apNext(id){const nx=apQueue().find(x=>x.id!==id);if(nx){apReview(nx.id);return true}closeModal();return false}

function apArt(c){const k=crKind(c);const u=esc(crUrl(c));
 if(k==='img')return `<img src="${u}" alt="${esc(c.title||'')}" data-fb="1">`;
 if(k==='video')return `<video src="${u}" controls preload="metadata" playsinline></video>`;
 return `<div class="ap-file">${k==='pdf'?ICO_DOC:ICO_LINK}<b>${k==='pdf'?'Arquivo PDF':esc(host(c.link))}</b><a class="btn primary" href="${u}" target="_blank" rel="noopener">Abrir ${k==='pdf'?'o PDF':'o link'} para conferir ↗</a></div>`}
function apHist(c){const ev=[];(c.reviews||[]).forEach(r=>{ev.push({at:r.requestedAt,tag:['req','Enviada · v'+(r.round||1)],by:r.requestedBy,text:r.changes||''});ev.push({at:r.decidedAt,tag:r.decision==='aprovado'?['ok','Aprovada']:['no','Recusada'],by:r.decidedBy,text:r.reason||''})});
 if(c.status==='Em aprovação'&&c.review)ev.push({at:c.review.requestedAt,tag:['req','Enviada · v'+(c.review.round||1)],by:c.review.requestedBy,text:c.review.changes||''});
 if(c.sentAt)ev.push({at:c.sentAt,tag:['ok','Enviada ao grupo'],by:c.sentBy,text:''});
 ev.sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
 return ev.length?`<div class="ap-hist">${ev.map(e=>`<div class="h">${av(e.by)}<div style="min-width:0"><span class="row" style="gap:6px"><span class="ap-tag ${e.tag[0]}">${e.tag[1]}</span><b>${esc(e.by?mName(e.by):'Alguém')}</b><small style="color:var(--muted)">${e.at&&e.at.length>10?fDT(e.at):fD(e.at)}</small></span>${e.text?`<p>${esc(e.text)}</p>`:''}</div></div>`).join('')}</div>`:''}

function apReview(id){const draw=()=>{const c=byId('creatives',id);if(!c){closeModal();return}const rv=c.review||{};const pend=c.status==='Em aprovação';const can=canApprove();
 const keep=document.getElementById('ap-reason')?.value??'';const open=ui.apRefuse===id;const by=apBy(c);const q=apQueue();const pos=q.findIndex(x=>x.id===id);
 const prev=(c.reviews||[]).filter(r=>r.decision==='recusado');const dest=c.memberId?first(c.memberId):by?first(by):'o criador';
 $('#modal').innerHTML=`<div class="mh"><div style="min-width:0"><h2 style="overflow-wrap:anywhere">${esc(c.title||'Peça sem nome')}</h2><div style="font-size:13px;color:var(--muted)">${esc(cName(c.clientId))}${c.format?' · '+esc(c.format):''}${(rv.round||1)>1?' · versão '+rv.round:''}${pend&&q.length>1&&pos>=0?' · '+(pos+1)+' de '+q.length+' na fila':''}</div></div><button class="x" data-act="close" aria-label="Fechar">×</button></div>
 <div class="mb">
  <div class="ap-art">${apArt(c)}</div>
  <div class="ap-meta">${av(by)}<span>Enviada por <b>${esc(by?mName(by):'—')}</b> ${esc(ago(rv.requestedAt))}</span>${c.memberId&&c.memberId!==by?`<span>· criada por <b>${esc(mName(c.memberId))}</b></span>`:''}<span class="pill ${CR_CLS[c.status]||''}">${esc(c.status)}</span></div>
  ${rv.changes&&pend?`<div class="note"><p><b>O que foi ajustado nesta versão:</b> ${esc(rv.changes)}</p></div>`:''}
  ${c.notes?`<div class="note"><p><b>Recado:</b> ${esc(c.notes)}</p></div>`:''}
  ${pend&&prev.length?`<div class="ap-reason" style="-webkit-line-clamp:unset;background:var(--surface-2);border-left-color:var(--muted)"><b>Pedido anterior (${esc(first(prev[prev.length-1].decidedBy))}):</b> ${esc(prev[prev.length-1].reason)}</div>`:''}
  ${pend?(can?`<div class="ap-acts"><button class="ap-btn ok" data-act="ap-ok" data-id="${id}">${ICO_OK}Aprovado</button><button class="ap-btn no" data-act="ap-no" data-id="${id}" aria-expanded="${open}">${ICO_NO}Recusado</button></div>
   <div class="ap-why" id="ap-why" ${open?'':'hidden'}><label class="fld full"><span>Motivo / sugestão de alteração</span><textarea id="ap-reason" placeholder="Ex.: trocar a foto do 2º card, o preço está errado, aumentar a logo no final">${esc(keep)}</textarea><small>${esc(dest)} recebe o pedido no Meu dia e envia a nova versão.</small></label>
    <div class="row"><button class="btn" data-act="ap-no-cancel">Cancelar</button><span class="spacer"></span><button class="btn ap-send" data-act="ap-no-send" data-id="${id}">Devolver para ${esc(dest)} ajustar</button></div></div>`
   :`<div class="note"><p>Aguardando aprovação de <b>${esc(apNames())}</b>.</p></div>`)
  :c.status===AP_FREE?`<div class="alertbox" style="border-color:var(--ok);background:var(--ok-soft)"><span>✓</span><div><b>Aprovada por ${esc(first(rv.decidedBy))} ${esc(ago(rv.decidedAt))}.</b> Liberada para envio no grupo do cliente.</div></div>`
  :c.status==='Ajustes solicitados'?`<div class="ap-reason" style="-webkit-line-clamp:unset"><b>Recusada por ${esc(first(rv.decidedBy))} · ${esc(ago(rv.decidedAt))}:</b> ${esc(rv.reason||'')}</div>`:''}
  ${(c.reviews||[]).length?`<details class="sec"><summary style="cursor:pointer;font-size:13px;color:var(--muted)">Histórico de aprovação</summary><div style="margin-top:8px">${apHist(c)}</div></details>`:''}
 </div>
 <div class="mf"><a class="btn" href="${esc(crUrl(c))}" target="_blank" rel="noopener">Abrir arquivo ↗</a><button class="btn" data-act="copy-link" data-id="${id}">Copiar link</button><span class="spacer"></span>${isAdmin()?`<button class="btn danger" data-act="ap-del" data-id="${id}">Excluir pedido</button>`:''}<button class="btn ghost" data-act="ap-detail" data-id="${id}">Ficha da peça</button></div>`;
 if(open){const t=document.getElementById('ap-reason');if(t&&document.activeElement!==t&&!keep)t.focus()}};
 if(ui.apRefuse!==id)ui.apRefuse='';openModal('',{rerender:draw});draw()}

/* ---------- ficha da peça (com o fluxo de aprovação) ---------- */
function apBox(c){const h=apBox0(c);if(!h||!isAdmin()||!['Em aprovação','Ajustes solicitados',AP_FREE].includes(c.status))return h;return h.replace(/<\/div>$/,`<div class="row" style="margin-top:8px"><button class="btn sm danger" data-act="ap-del" data-id="${c.id}">Excluir pedido de aprovação</button></div></div>`)}
function apBox0(c){const id=c.id;const rv=c.review||{};const k=crKind(c);
 if(c.status==='Em aprovação')return `<div class="sec"><h3>Aprovação</h3><div class="note" style="align-items:center"><p>Aguardando ${esc(apNames())} · enviada ${esc(ago(rv.requestedAt))}${rv.requestedBy?' por '+esc(first(rv.requestedBy)):''}</p>${canApprove()?`<button class="btn sm primary" data-act="ap-review" data-id="${id}">Avaliar agora</button>`:''}</div></div>`;
 if(c.status==='Ajustes solicitados')return `<div class="sec"><h3>Ajuste pedido</h3><div class="ap-reason" style="-webkit-line-clamp:unset"><b>Pedido por ${esc(first(rv.decidedBy))} · ${esc(ago(rv.decidedAt))}:</b> ${esc(rv.reason||'Sem motivo registrado.')}</div>
  <div class="row" style="margin-top:8px">${k!=='link'?`<button class="btn primary" data-act="ap-version" data-id="${id}">↑ Enviar nova versão</button>`:''}<button class="btn ${k==='link'?'primary':''}" data-act="ap-resend" data-id="${id}">${k==='link'?'Reenviar para aprovação':'Reenviar sem trocar o arquivo'}</button></div></div>`;
 if(c.status===AP_FREE)return `<div class="sec"><h3>Aprovação</h3><div class="alertbox" style="border-color:var(--ok);background:var(--ok-soft);margin:0"><span>✓</span><div><b>Aprovada por ${esc(first(rv.decidedBy))} ${esc(ago(rv.decidedAt))}.</b> ${c.sentAt?'Enviada no grupo do cliente em '+fD(c.sentAt)+(c.sentBy?' por '+esc(first(c.sentBy)):'')+'.':'Pode enviar no grupo do cliente.'}
  <div class="row" style="margin-top:8px"><button class="btn sm" data-act="copy-link" data-id="${id}">Copiar link da arte</button>${c.sentAt?'':`<button class="btn sm primary" data-act="ap-sent" data-id="${id}">Marcar como enviada no grupo</button>`}</div></div></div></div>`;
 if(c.status==='Em criação')return `<div class="sec"><h3>Aprovação</h3><div class="note" style="align-items:center"><p>Ainda não foi enviada para aprovação.</p><button class="btn sm primary" data-act="ap-send" data-id="${id}">Enviar para aprovação</button></div></div>`;
 return''}
function creativeDetail(id){const draw=()=>{const c=byId('creatives',id);if(!c){closeModal();return}const k=crKind(c);
 $('#modal').innerHTML=`<div class="mh"><div style="min-width:0"><h2 style="overflow-wrap:anywhere">${esc(c.title||'Sem nome')}</h2><div style="font-size:13px;color:var(--muted)">${esc(cName(c.clientId)==='Interno'?'Agência':cName(c.clientId))}${c.campaign?' · '+esc(c.campaign):''}${c.month?' · '+esc(MN[+c.month.slice(5)-1]+' '+c.month.slice(0,4)):''}${(c.review?.round||1)>1?' · versão '+c.review.round:''}</div></div><button class="x" data-act="close" aria-label="Fechar">×</button></div>
 <div class="mb">
  <div class="preview">${k==='img'||k==='video'?thumb(c,true):`<div class="thumb" style="aspect-ratio:3/1">${thumb(c)}</div>`}</div>
  <div class="row"><span class="pill">${kindLabel[k]}</span>${c.format?`<span class="pill">${esc(c.format)}</span>`:''}${c.sizeBytes?`<span class="pill num">${fSize(c.sizeBytes)}</span>`:''}${c.memberId?`<span class="pill">Criado por ${esc(mName(c.memberId))}</span>`:''}<span class="pill">Adicionado ${fD(c.createdAt)}</span></div>
  ${apBox(c)}
  <div class="sec"><h3>Status</h3><div class="chips">${CR_STATUS.map(s=>`<button class="chip" data-act="cr-status" data-id="${id}" data-v="${s}" aria-pressed="${c.status===s}">${s}</button>`).join('')}</div>${c.statusAt?`<p style="font-size:12px;color:var(--muted);margin:6px 0 0">Atualizado em ${fD(c.statusAt)}</p>`:''}</div>
  ${approvalBox(c.approval)}
  ${c.notes?`<div class="note"><p>${esc(c.notes)}</p></div>`:''}
  ${(c.reviews||[]).length?`<div class="sec"><h3>Histórico de aprovação</h3>${apHist(c)}${(c.versions||[]).length?`<p style="font-size:12.5px;color:var(--muted);margin:8px 0 0">Versões anteriores: ${c.versions.map(x=>`<a href="${esc(x.assetId?'/_blob/'+x.assetId:x.link)}" target="_blank" rel="noopener">v${x.round||1}</a>`).join(' · ')}</p>`:''}</div>`:''}
  ${stamp(c)}
 </div>
 <div class="mf"><a class="btn" href="${esc(crUrl(c))}" target="_blank" rel="noopener">Abrir ${k==='link'?'link':'arquivo'} ↗</a><button class="btn" data-act="copy-link" data-id="${id}">Copiar link</button>${caLinkButton('creative',c)}<span class="spacer"></span><button class="btn primary" data-act="edit-creative" data-id="${id}">Editar</button></div>`};
 openModal('',{rerender:draw});draw()}

/* ---------- tela de aprovações ---------- */
function apCard(c){const rv=c.review||{};const by=apBy(c);const r=rv.round||1;const st=c.status;
 return `<button class="ap-card" data-act="${st==='Em aprovação'?'ap-review':'open-creative'}" data-id="${c.id}"><span class="thumb">${thumb(c)}<span class="kind">${kindLabel[crKind(c)]}</span>${r>1?`<span class="ap-v">Versão ${r}</span>`:''}</span>
  <span class="ap-bd"><span class="ap-type cr">Criativo</span><b>${esc(c.title||'Sem nome')}</b><small>${esc(cName(c.clientId))}${c.format?' · '+esc(c.format):''}</small>
  ${st==='Em aprovação'?`<span class="ap-by">${av(by)}<span>${esc(by?first(by):'—')} · ${esc(ago(rv.requestedAt))}</span></span>`:''}
  ${st==='Ajustes solicitados'?`<span class="ap-reason">${esc(rv.reason||'')}</span><span class="ap-by">${av(c.memberId||by)}<span>Com ${esc(first(c.memberId||by))} · pedido por ${esc(first(rv.decidedBy))} ${esc(ago(rv.decidedAt))}</span></span>`:''}
  ${st===AP_FREE?`<span class="row" style="gap:6px"><span class="pill p-ok">✓ ${esc(first(rv.decidedBy))} · ${fD(rv.decidedAt)}</span>${c.sentAt?'<span class="pill">Enviada ao grupo</span>':'<span class="pill p-alto">Falta enviar ao grupo</span>'}</span>`:''}</span></button>`}
function vAprovacoes(){const tab=ui.apTab||'fila';const can=canApprove();const mm=myMember();const full=can||isAdmin();const own=c=>!!mm&&((c.memberId||'')===mm.id||apBy(c)===mm.id);const vis=c=>full||own(c);
 const typ=ui.apType||'all';const cfFull=cfDecider()||isAdmin();const visC=c=>cfFull||cfMineCal(c);
 const Q=apQueue().filter(vis),A=apAdj().filter(vis),F=apFree().filter(c=>vis(c)&&(!c.sentAt||daysSince((c.sentAt||'').slice(0,10))<=30));
 const CQ=cfPending().filter(visC),CA=cfAdjusting().filter(visC),CF=cfReleased().filter(visC);
 const mineA=mm?A.filter(c=>(c.memberId||apBy(c))===mm.id):[];const mineCA=mm?CA.filter(c=>cfLast(c).by===mm.id||cfMineCal(c)):[];
 const T=(cr,cal)=>typ==='cr'?cr.length:typ==='cal'?cal.length:cr.length+cal.length;
 const items=(cr,cal,key,ck,desc)=>{const L=[...(typ==='cal'?[]:cr.map(c=>({t:key(c)||'',h:apCard(c)}))),...(typ==='cr'?[]:cal.map(c=>({t:ck(c)||'',h:cfCard(c)})))];L.sort((a,b)=>desc?String(b.t).localeCompare(String(a.t)):String(a.t).localeCompare(String(b.t)));return L.map(x=>x.h)};
 const L={fila:items(Q,CQ,apReqAt,c=>cfLast(c).at),ajustes:items(A,CA,c=>c.review?.decidedAt,c=>cfLast(c).decidedAt,1),liberadas:items(F,CF,c=>c.review?.decidedAt,c=>c.approvedAt,1)}[tab]||[];
 const empty={fila:['Nada aguardando aprovação','Quando alguém enviar uma peça ou uma etapa de calendário, ela aparece aqui.'],ajustes:['Nada em ajuste','Peças e etapas de calendário devolvidas ficam aqui até a nova versão.'],liberadas:['Nada liberado ainda','Peças aprovadas e calendários com validação final aprovada aparecem aqui, prontos para o cliente.']}[tab];
 const myCQ=CQ.filter(c=>cfLast(c).by!==mm?.id);
 return `<div class="head"><div><h1>${full||cfFull?'Aprovações':'Minhas aprovações'}</h1><p>${full||cfFull?'':'Você vê só o que enviou. '}Peças avulsas e etapas dos calendários (pré-calendário, artes e validação final) passam por aqui. ${esc(apNames())} aprovam ou devolvem com o motivo.</p></div>
  <div class="row"><button class="btn" data-act="ap-link">+ Enviar por link</button><button class="btn primary" data-act="ap-upload">↑ Enviar peça para aprovação</button></div></div>
 <div class="ap-top">${subTabs('ap-tab',tab,[['fila','Aguardando aprovação',T(Q,CQ)],['ajustes','Em ajuste com o criador',T(A,CA)],['liberadas','Liberadas para o cliente',T(F.filter(c=>!c.sentAt),CF)]])}
  <div class="ap-tsw" role="group" aria-label="Tipo de material">${[['all','Todos'],['cr','Criativos'],['cal','Calendários']].map(([v,l])=>`<button data-act="cf-type" data-v="${v}" aria-pressed="${typ===v}">${l}</button>`).join('')}</div></div>
 ${tab==='fila'&&can&&Q.length&&typ!=='cal'?`<div class="ap-start"><p><b>${Q.length} peça${Q.length>1?'s':''} esperando você.</b> Abra e decida uma por uma: a próxima abre sozinha, da mais antiga para a mais nova.</p><button class="btn primary" data-act="ap-review" data-id="${Q[0].id}">Começar a aprovar peças</button></div>`:''}
 ${tab==='fila'&&cfDecider()&&myCQ.length&&typ!=='cr'?`<div class="ap-start"><p><b>${myCQ.length} etapa${myCQ.length>1?'s':''} de calendário aguardando você.</b> A mais antiga primeiro. Aprovada, o calendário libera a próxima etapa sozinho.</p><button class="btn primary" data-act="cf-review" data-id="${myCQ[0].id}">Analisar calendários</button></div>`:''}
 ${tab==='ajustes'&&(mineA.length||mineCA.length)?`<div class="alertbox"><span>!</span><div><b>${mineA.length+mineCA.length} ${mineA.length+mineCA.length>1?'itens seus voltaram':'item seu voltou'} para ajuste.</b> Abra, veja o pedido e envie a nova versão.</div></div>`:''}
 ${L.length?`<div class="ap-grid">${L.join('')}</div>`:emptyBox(empty[0],empty[1])}
 <p class="ap-who"><span>Quem aprova:</span>${approvers().map(m=>`<span class="row" style="gap:6px;flex-wrap:nowrap">${av(m.id)}${esc(m.name)}</span>`).join('')||'<span>ninguém definido</span>'}${isAdmin()?`<button class="lnk" data-act="ap-who">Alterar</button>`:''}<span style="flex-basis:100%">Basta uma aprovação para liberar. Nas etapas de calendário, a liderança também aprova, e ninguém aprova o próprio envio.</span></p>`}
function apWhoModal(){const sel=new Set(approvers().map(m=>m.id));
 openModal(`<div class="mh"><h2>Quem aprova as peças</h2><button class="x" data-act="close" aria-label="Fechar">×</button></div>
 <div class="mb"><p style="margin:0;font-size:14px;color:var(--muted)">Uma aprovação de qualquer pessoa marcada libera a peça. Quem ainda não está na Equipe (Osvaldo, Clério) entra sozinho como aprovador quando for cadastrado com esse nome.</p>
  <div class="chips" id="ap-who-chips">${S.members.map(m=>`<button type="button" class="chip" data-act="chip" data-v="${m.id}" aria-pressed="${sel.has(m.id)}">${esc(m.name)}</button>`).join('')}</div></div>
 <div class="mf"><button class="btn" data-act="close">Cancelar</button><span class="spacer"></span><button class="btn primary" data-act="ap-who-save">Salvar</button></div>`)}

/* ---------- Meu dia, navegação ---------- */
function todayItems(mm){const t0=today();const out=[];
 S.todos.filter(t=>t.assigneeId===mm.id&&tkOpen(t)&&t.due&&t.due<=t0).forEach(t=>{const p=t.projectId&&byId('projects',t.projectId);out.push({k:p?'Etapa de projeto':'Tarefa',cls:p?'p-alto':'p-acc',t:t.title+(p?' · '+p.title:''),c:t.clientId,due:t.due,time:t.dueTime||'',late:taskState(t)==='late',urg:!!t.urgent,act:['task-open',t.id],extra:tkS(t)})});
 S.follows.filter(f=>f.status!=='Feito'&&fuOwns(f,mm.id)&&fuState(f)!=='ok').forEach(f=>out.push({k:isCad(f)?'Cadência comercial':'Follow-up',cls:isCad(f)?'p-alto':'p-medio',t:isCad(f)?(f.source?.label||'Contato')+(f.goal?' · '+f.goal:''):f.type+(f.source?.label?' · '+f.source.label:''),c:f.clientId,due:f.dueTo||f.dueFrom,late:fuState(f)==='late',act:['fu-do',f.id]}));
 if(isApprover(mm))apQueue().forEach(c=>out.push({k:'Aprovar peça',cls:'p-alto',t:(c.title||'Peça')+' · enviada por '+first(apBy(c)),c:c.clientId,due:t0,late:false,act:['ap-review',c.id],extra:ago(c.review?.requestedAt)}));
 S.creatives.filter(c=>(c.memberId||apBy(c))===mm.id&&c.status==='Ajustes solicitados').forEach(c=>out.push({k:'Ajuste de criativo',cls:'p-critico',t:(c.title||'Criativo')+(c.review?.reason?' · “'+String(c.review.reason).slice(0,90)+(String(c.review.reason).length>90?'…':'')+'”':''),c:c.clientId,due:c.statusAt||t0,late:!!c.statusAt&&daysTo(c.statusAt)<=-2,act:['open-creative',c.id],extra:c.format}));
 S.creatives.filter(c=>(c.memberId||apBy(c))===mm.id&&c.status===AP_FREE&&!c.sentAt&&daysSince(c.statusAt)<=7).forEach(c=>out.push({k:'Arte liberada',cls:'p-ok',t:(c.title||'Peça')+' · aprovada por '+first(c.review?.decidedBy)+', enviar no grupo do cliente',c:c.clientId,due:t0,late:false,act:['open-creative',c.id]}));
 S.meetings.filter(m=>m.status!=='Cancelado'&&(m.memberIds||[]).includes(mm.id)&&parseD(m.when)&&ymd(parseD(m.when))===t0).forEach(m=>{const d=parseD(m.when);out.push({k:'Reunião',cls:'',t:m.title||m.kind,c:m.clientId,due:t0,time:pad(d.getHours())+':'+pad(d.getMinutes()),late:false,past:d<new Date(),act:['edit-meeting',m.id]})});
 try{calToday(mm,out)}catch(e){}
 try{tkToday(mm,out)}catch(e){}
 return out.sort((a,b)=>(b.late-a.late)||(b.urg?1:0)-(a.urg?1:0)||(a.due||'').localeCompare(b.due||'')||(a.time||'99').localeCompare(b.time||'99'))}
function renderNav(){const mm=mode==='wait'?null:myMember();const adm=mode!=='wait'&&isAdmin();
 const badge=k=>{if(mode==='wait')return 0;
  if(k==='meudia')return mm?openTasks(t=>t.assigneeId===mm.id).filter(t=>taskState(t)!=='ok').length+S.follows.filter(f=>f.status!=='Feito'&&fuOwns(f,mm.id)&&fuState(f)==='late').length:0;
  if(k==='calendarios')return calBadge(mm);
  if(k==='tarefas')return tkBadge(mm);
  if(k==='aprovacoes')return (canApprove()&&mm?apQueue().length:mm?apAdj().filter(c=>(c.memberId||apBy(c))===mm.id).length:0)+(cfDecider()?cfPending().filter(c=>cfLast(c).by!==mm?.id).length:mm?cfAdjusting().filter(cfMineCal).length:0);
  if(k==='producao')return S.todos.filter(t=>tkOpen(t)&&taskState(t)==='late'&&(adm||t.assigneeId===mm?.id)).length;
  if(k==='clientes')return S.follows.filter(f=>f.status!=='Feito'&&!isCad(f)&&fuState(f)==='late'&&(adm||!mm||fuOwns(f,mm.id))).length;
  if(k==='planejamento')return S.radar.filter(r=>(r.eventDate||r.date)===today()).length;
  if(k==='estrategia')return S.follows.filter(f=>f.status!=='Feito'&&f.type==='Follow-up estratégico'&&fuState(f)==='late'&&(adm||!mm||fuOwns(f,mm.id))).length;
  if(k==='comercial')return S.follows.filter(f=>f.status!=='Feito'&&isCad(f)&&fuState(f)!=='ok'&&(adm||!mm||fuOwns(f,mm.id))).length;
  return 0};
 const b=(k,l)=>{const n=badge(k);return `<button data-act="nav" data-v="${k}" ${ui.view===k?'aria-current="page"':''}>${svg(k)}<span>${l}</span>${n?`<span class="badge">${n}</span>`:''}</button>`};
 const VV=VIEWS.filter(([k])=>viewOk(k));$('#nav').innerHTML=VV.map(([k,l])=>b(k,l)).join('');$('#mobnav').innerHTML=VV.map(([k,,s])=>b(k,s)).join('');
 $('#whoami').innerHTML=mm?`<div class="who"><button class="who-me" data-act="profile" data-id="${mm.id}" title="Meu perfil">${meAv(mm,32)}<span style="min-width:0"><b>${esc(mm.name)}</b><small>${esc(mm.area)}${isAdmin()?' · Administrador':''}</small></span></button><button class="who-x" data-act="unlink-me" title="Desvincular minha conta">Trocar</button></div>`
  :me.id&&mode==='db'?`<button class="who" data-act="link-open" style="width:100%;text-align:left"><span class="av" style="background:#333">?</span><span><b>Conta não vinculada</b><small>Toque para dizer quem é você</small></span></button>`:''}
function refresh(){if(mode==='wait')return;applyMine();if(VIEW_ALIAS[ui.view])ui.view=aliasView(ui.view);if(!viewOk(ui.view)){ui.view='meudia';modalCtx=null;$('#mwrap').hidden=true}renderNav();
 const a=document.activeElement,id=a&&a.id&&$('#main').contains(a)?a.id:null,ss=id?a.selectionStart:null;
 resolveNames();autoLink();applyMine();
 $('#main').innerHTML=linkBanner()+({meudia:vMeuDia,painel:vPainel,producao:vProducao,clientes:vClientes,comercial:vComercial,estrategia:vEstrategia,planejamento:vPlanejamento,agenda:vAgenda,criativos:vCriativos,aprovacoes:vAprovacoes,calendarios:vCalendarios,tarefas:vTarefasOps,academy:vAcademy,chat:vChat,equipe:vEquipe}[ui.view]||vPainel)();
 try{todayPeople()}catch(e){}
 try{calAfter()}catch(e){}
 try{opsAfter()}catch(e){}
 try{agAfter()}catch(e){}
 try{accAfter()}catch(e){}
 try{tcAfter()}catch(e){}
 if(id){const n=document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(ss,ss)}catch(e){}}}
 cwRender();
 if(modalCtx&&modalCtx.rerender){const f=document.activeElement;if(!(f&&$('#modal').contains(f)&&/^(TEXTAREA|INPUT)$/.test(f.tagName)))modalCtx.rerender()}}

/* ---------- eventos (captura: rodam antes dos antigos) ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id,v=b.dataset.v;
 const stop=()=>{e.stopPropagation();e.preventDefault()};
 if(a==='cr-status'){const c=byId('creatives',id);if(!c||c.status===v)return;
  if(v==='Em aprovação'){stop();try{await apSend(id)}catch(x){}return}
  if(c.status==='Em aprovação'&&(v===AP_FREE||v==='Ajustes solicitados')){stop();if(!canApprove()){toast('Só '+apNames()+' podem aprovar ou recusar.');return}ui.apRefuse=v==='Ajustes solicitados'?id:'';apReview(id);return}
  if(v===AP_FREE&&!canApprove()){stop();toast('Só '+apNames()+' podem liberar uma peça para o cliente.');return}
  return}
 if(a==='cr-upload'){apTarget=null;return}
 try{switch(a){
 case'ap-tab':stop();ui.apTab=v;refresh();break;
 case'ap-review':stop();modalCtx=null;apReview(id);break;
 case'ap-detail':stop();creativeDetail(id);break;
 case'ap-upload':stop();if(!assets){toast('Seu acesso não permite enviar arquivos. Use “Enviar por link”.');return}apTarget=null;$('#cr-file').click();break;
 case'ap-link':stop();apSubmitForm(null);break;
 case'ap-send':stop();await apSend(id);break;
 case'ap-resend':stop();apResendForm(id,null);break;
 case'ap-version':stop();if(!assets){toast('Seu acesso não permite enviar arquivos. Use “Reenviar sem trocar o arquivo” com o link.');return}apTarget=id;$('#cr-file').click();break;
 case'ap-ok':{stop();b.disabled=true;const c=byId('creatives',id);if(await apDecide(id,true)){ui.apRefuse='';toast('Aprovada · '+(c?.title||'peça')+' liberada para o grupo do cliente');apNext(id)}else b.disabled=false;break}
 case'ap-no':{stop();ui.apRefuse=id;const w=$('#ap-why');if(w){w.hidden=false;b.setAttribute('aria-expanded','true');const t=$('#ap-reason');if(t){t.focus();w.scrollIntoView({block:'nearest',behavior:'smooth'})}}break}
 case'ap-no-cancel':{stop();ui.apRefuse='';const w=$('#ap-why');if(w)w.hidden=true;const n=$('[data-act="ap-no"]');if(n)n.setAttribute('aria-expanded','false');break}
 case'ap-no-send':{stop();const t=$('#ap-reason');const r=(t?.value||'').trim();if(r.length<3){toast('Escreva o motivo ou a sugestão de alteração.');t?.focus();return}
  b.disabled=true;const c=byId('creatives',id);if(await apDecide(id,false,r)){ui.apRefuse='';if(t)t.value='';toast('Devolvida para '+(c?.memberId?first(c.memberId):'o criador')+' ajustar');apNext(id)}else b.disabled=false;break}
 case'ap-sent':{stop();const c=byId('creatives',id);if(!c)return;await put('creatives',id,{...c,sentAt:new Date().toISOString(),sentBy:myMember()?.id||''});toast('Marcada como enviada no grupo do cliente');
  sysPost(`📤 **${actor()}** enviou **${c.title||'peça'}** no grupo de **${cName(c.clientId)}**`,{act:'open-creative',id});break}
 case'ap-del':{stop();if(!isAdmin()){toast('Só administradores podem excluir pedidos.');return}
  if(!b.classList.contains('armed')){b.classList.add('armed');const t0=b.textContent;b.textContent='Confirmar exclusão';setTimeout(()=>{if(document.body.contains(b)){b.classList.remove('armed');b.textContent=t0}},4000);return}
  const c=byId('creatives',id);if(!c)return;const inReview=!!$('#modal .ap-art');b.disabled=true;
  if(assets)for(const a of [c.assetId,...(c.versions||[]).map(x=>x.assetId)].filter(Boolean))await assets.delete(a).catch(()=>{});
  await del('creatives',id);ui.apRefuse='';toast('Pedido excluído');
  sysPost(`🗑️ **${actor()}** excluiu o pedido de aprovação de **${c.title||'peça'}** · ${cName(c.clientId)}`);
  if(inReview&&canApprove())apNext(id);else closeModal();break}
 case'ap-who':stop();if(isAdmin())apWhoModal();break;
 case'ap-who-save':{stop();const on=new Set([...document.querySelectorAll('#ap-who-chips .chip[aria-pressed="true"]')].map(x=>x.dataset.v));
  for(const m of S.members){const want=on.has(m.id);if(isApprover(m)!==want)await put('members',m.id,{...m,approver:want})}closeModal();toast('Aprovadores atualizados');break}
 }}catch(err){}},true);
