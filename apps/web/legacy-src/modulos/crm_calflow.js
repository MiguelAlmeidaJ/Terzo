/* ================= Calendários · esteira com aprovação por etapa =================
   Fonte única: o próprio registro em `calendars`. Campos novos (aditivos, nada é apagado):
   - subs[]: envios para aprovação, um por versão: {id, stage, ver, files[], note, by, at,
             status:'pending'|'approved'|'adjust', decidedBy, decidedAt, reason}. Nunca editados depois da decisão.
   - draft:  {stage, files[]} material anexado da etapa atual que ainda não foi enviado.
   - startedBy, artStartedAt: quem iniciou e quando as artes começaram.
   Etapas: pendente (Não iniciado) → copy (Pré-calendário) → artes → validacao → entregue.
   copy, artes e validacao só avançam com aprovação registrada; a aprovação final NÃO marca entregue:
   a entrega ao cliente continua no botão "Registrar entrega" que já existia.
   A decisão acontece só na área de Aprovações (mesma tela dos criativos, tipo "Calendário").
   Migração: calendários antigos mantêm a etapa; sem envio registrado, a etapa fica "em produção"
   e o responsável anexa e envia; validação já aprovada antes (approvedAt) continua aprovada. */

const CF_GATED=['copy','artes','validacao'];
const CF_NAME={copy:'Pré-calendário',artes:'Desenvolvimento das artes',validacao:'Validação final'};
const CF_NEXT={copy:'artes',artes:'validacao'};
const CF_MAXMB=20;
const cfDecider=()=>canApprove()||isLeader();
const cfSubs=(c,st)=>(c.subs||[]).filter(s=>!st||s.stage===st);
const cfLast=(c,st)=>{const L=cfSubs(c,st||c.stage);return L[L.length-1]||null};
function cfState(c){if(c.stage==='pendente')return'nao';if(c.stage==='entregue')return'concluida';
 if(c.stage==='validacao'&&c.approvedAt)return'aprovada';const s=cfLast(c);if(!s)return'producao';
 return s.status==='pending'?'pendente':s.status==='adjust'?'ajustes':'producao'}
const CF_ST_L={nao:'Não iniciada',producao:'Em produção',pendente:'Aguardando aprovação',aprovada:'Aprovada',ajustes:'Devolvida para ajustes',concluida:'Concluída'};
const CF_ST_C={nao:'',producao:'p-acc',pendente:'p-alto',aprovada:'p-ok',ajustes:'p-critico',concluida:'p-ok'};
const cfOwner=(c,st)=>(st||c.stage)==='copy'?c.copyId:c.artId;
function cfCanWork(c){if(isAdmin())return true;const mm=myMember();return !!mm&&calPeople(c).includes(mm.id)}
const cfPending=()=>S.calendars.filter(c=>CF_GATED.includes(c.stage)&&cfState(c)==='pendente').sort((a,b)=>String(cfLast(a).at).localeCompare(String(cfLast(b).at)));
const cfAdjusting=()=>S.calendars.filter(c=>CF_GATED.includes(c.stage)&&cfState(c)==='ajustes').sort((a,b)=>String(cfLast(b).decidedAt).localeCompare(String(cfLast(a).decidedAt)));
const cfReleased=()=>S.calendars.filter(c=>c.stage==='validacao'&&c.approvedAt);
const cfMineCal=c=>{const mm=myMember();return !!mm&&calPeople(c).includes(mm.id)};
const cfFileKind=f=>f.link?'link':/^image\//.test(f.type||'')?'img':/^video\//.test(f.type||'')?'video':/pdf/.test(f.type||'')?'pdf':'file';
const cfSize=b=>!b?'':b>1048576?(b/1048576).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(b/1024))+' KB';
const cfUrl=f=>f.assetId?'/_blob/'+f.assetId:(f.link||'');
const cfDT=iso=>iso?(String(iso).length>10?fDT(iso):fD(iso)):'—';

/* ---------- linha do tempo por etapa ---------- */
function cfStageLog(c,st){const L=[];const H=c.history||[];
 if(st==='pendente'){const s=H.find(h=>h.k==='inicio')||H.find(h=>h.from==='pendente');if(s)L.push(['Produção iniciada',s.at,s.by]);return L}
 const ini=H.filter(h=>h.to===st&&h.from!==st).pop();if(ini)L.push([st==='copy'?'Pré-calendário iniciado':st==='artes'?'Artes iniciadas':'Validação final iniciada',ini.at,ini.by]);
 cfSubs(c,st).forEach(s=>{L.push(['Enviado para aprovação · versão '+s.ver+' · '+s.files.length+' arquivo'+(s.files.length===1?'':'s'),s.at,s.by,s.note]);
  if(s.status==='approved')L.push([st==='validacao'?'Validação final aprovada':'Etapa aprovada',s.decidedAt,s.decidedBy]);
  if(s.status==='adjust')L.push(['Devolvida para ajustes',s.decidedAt,s.decidedBy,s.reason,1])});
 if(st==='validacao'&&c.approvedAt&&!cfSubs(c,'validacao').some(s=>s.status==='approved'))L.push(['Aprovado pela liderança (antes da esteira)',c.approvedAt,c.approvedBy]);
 if(st==='entregue'&&c.doneAt)L.push(['Entregue ao cliente',c.doneAt,c.deliveredBy]);
 return L}
function cfPipe(c){const cur=CAL_ST.indexOf(c.stage);
 const stOf=(s,i)=>{if(i<cur)return s==='pendente'?'concluida':CF_GATED.includes(s)?(cfSubs(c,s).some(x=>x.status==='approved')||(s==='validacao'&&c.approvedAt)?'aprovada':'concluida'):'concluida';
  if(i===cur)return s==='entregue'?'concluida':cfState(c);return'nao'};
 return `<div class="sec cf-pipe"><h3>Esteira de produção</h3><ol>${CAL_ST.map((s,i)=>{const k=stOf(s,i);const log=cfStageLog(c,s);
  return `<li class="cf-s ${k} ${i===cur?'cur':''}"><div class="cf-h"><b>${esc(s==='pendente'?'Não iniciado':s==='validacao'?'Aguardando validação':CF_NAME[s]||CAL_L[s])}</b><span class="pill ${CF_ST_C[k]||''}">${CF_ST_L[k]}</span></div>
  ${log.length?`<ul>${log.map(([t,at,by,note,bad])=>`<li><span>${esc(t)}</span><small>${cfDT(at)}${by?' · '+esc(calFn(by)):''}</small>${note?`<p class="${bad?'bad':''}">${esc(note)}</p>`:''}</li>`).join('')}</ul>`:''}</li>`}).join('')}</ol></div>`}

/* ---------- arquivos ---------- */
function cfFileRow(f,opts={}){const k=cfFileKind(f);const ico=k==='img'?'🖼':k==='video'?'🎬':k==='pdf'?'📄':k==='link'?'🔗':'📎';
 return `<li class="cf-f"><span class="ic" aria-hidden="true">${ico}</span><span class="nm"><b>${esc(f.name||'Arquivo')}</b><small>${k==='link'?esc(host(f.link)):esc(cfSize(f.size))}${f.by?' · '+esc(calFn(f.by)):''}${f.at?' · '+cfDT(f.at):''}</small></span>
  ${cfUrl(f)?`<a class="btn sm" href="${esc(cfUrl(f))}" target="_blank" rel="noopener">Abrir</a>`:''}${f.assetId?`<button class="btn sm" type="button" data-act="cf-dl" data-asset="${esc(f.assetId)}" data-name="${esc(f.name||'arquivo')}">Baixar</button>`:''}
  ${opts.rm!=null?`<button class="btn sm ghost" type="button" data-act="cf-rm" data-id="${esc(opts.cid)}" data-v="${opts.rm}" aria-label="Remover ${esc(f.name||'arquivo')}">Remover</button>`:''}</li>`}
function cfPreview(f){const u=esc(cfUrl(f));const k=cfFileKind(f);
 if(k==='img')return `<figure class="cf-pv"><img src="${u}" alt="${esc(f.name||'')}" loading="lazy"><figcaption>${esc(f.name||'')}</figcaption></figure>`;
 if(k==='video')return `<figure class="cf-pv"><video src="${u}" controls preload="metadata" playsinline></video><figcaption>${esc(f.name||'')}</figcaption></figure>`;
 if(k==='pdf')return `<figure class="cf-pv pdf"><iframe src="${u}" title="${esc(f.name||'PDF')}" loading="lazy"></iframe><figcaption>${esc(f.name||'')}</figcaption></figure>`;
 return ''}

/* ---------- caixa de ação dentro do calendário (substitui os botões antigos) ---------- */
function calNextBox(c){const st=cfState(c);const can=cfCanWork(c);const B=(act,l,cls,attr)=>`<button class="btn ${cls||''}" data-act="${act}" data-id="${esc(c.id)}" ${attr||''}>${l}</button>`;
 const last=cfLast(c);let body='';
 if(c.stage==='pendente'){body=`<p>Calendário atribuído a <b>${esc(calOwnersTxt(c).replace(/^Copy e artes: /,''))}</b>. A produção ainda não começou.</p>`+(can?`<div class="row">${B('cf-start','Iniciar produção','primary')}</div>`:`<p class="mut">Só os responsáveis iniciam a produção.</p>`)}
 else if(c.stage==='entregue'){body=`<p>Entregue ao cliente em <b>${calDT(c.doneAt)}</b>.</p>`+(isAdmin()?`<div class="row">${B('cal-move','Reabrir (voltar para artes)','', 'data-v="artes"')}</div>`:'')}
 else if(st==='aprovada'){body=`<div class="cf-msg ok"><b>Validação final aprovada${c.approvedBy?' por '+esc(calFn(c.approvedBy)):''} em ${calDT(c.approvedAt)}.</b> O material está liberado para envio ao cliente. Registre a entrega quando o cliente receber.</div>`+
  ((can||cfDecider())?`<div class="row"><label class="row" style="gap:8px"><span class="lb" style="margin:0">Entregue em</span><input type="date" id="cal-dlv" value="${today()}" style="width:auto"></label>${B('cal-dlv','Registrar entrega ao cliente','primary')}</div>`:'')}
 else if(st==='pendente'){body=`<div class="cf-msg wait"><b>${cfMineCal(c)?'Seu material foi enviado e está aguardando aprovação da liderança. Você poderá avançar assim que a etapa for aprovada.':'Material enviado e aguardando aprovação da liderança.'}</b><br>${esc(CF_NAME[c.stage])} · versão ${last.ver} · enviada por ${esc(calFn(last.by))} em ${calDT(last.at)} (${esc(ago(last.at))}).</div>
  <ul class="cf-files">${last.files.map(f=>cfFileRow(f)).join('')}</ul>${last.note?`<p class="cf-note"><b>Observação:</b> ${esc(last.note)}</p>`:''}
  ${cfDecider()?`<div class="row">${B('cf-review','Analisar na área de Aprovações','primary')}</div>`:''}`}
 else{const adj=st==='ajustes'?last:null;const draft=c.draft&&c.draft.stage===c.stage?c.draft.files||[]:[];
  const what={copy:'o pré-calendário com os conteúdos e copies do mês',artes:'as artes do calendário',validacao:'o conjunto final de materiais para a conferência interna'}[c.stage];
  body=(adj?`<div class="cf-msg bad"><b>Seu material precisa de ajustes. Confira as observações do líder e envie uma nova versão.</b><br>${esc(CF_NAME[c.stage])} · versão ${adj.ver} devolvida por <b>${esc(calFn(adj.decidedBy))}</b> em ${calDT(adj.decidedAt)}:<p>“${esc(adj.reason||'')}”</p></div>
   <details class="cf-prev"><summary>Material enviado na versão ${adj.ver} (${adj.files.length})</summary><ul class="cf-files">${adj.files.map(f=>cfFileRow(f)).join('')}</ul></details>`
   :c.stage==='validacao'&&!cfSubs(c,'validacao').length&&c.sentAt?`<div class="cf-msg">Este calendário chegou à validação antes da nova esteira. Anexe o material final e envie para aprovação da liderança.</div>`:'')+
   `<p>${esc(CF_NAME[c.stage])} em produção com <b>${esc(calNm(cfOwner(c)))}</b>. Ao concluir, anexe ${what} e envie para aprovação. A próxima etapa só é liberada depois do OK da liderança.</p>`;
  if(can){body+=`<div class="cf-up"><div class="cf-uph"><b>Material desta etapa${adj?' · nova versão '+(adj.ver+1):''}</b><span class="mut">${draft.length?draft.length+' anexado'+(draft.length>1?'s':''):'Nenhum arquivo anexado'}</span></div>
   ${draft.length?`<ul class="cf-files">${draft.map((f,i)=>cfFileRow(f,{rm:i,cid:c.id})).join('')}</ul>`:''}
   <div class="row"><button class="btn" type="button" data-act="cf-pick" data-id="${esc(c.id)}">↑ Anexar arquivos</button><button class="btn" type="button" data-act="cf-link" data-id="${esc(c.id)}">+ Adicionar link (Drive, Canva, Figma)</button>${adj&&adj.files.length?`<button class="btn ghost" type="button" data-act="cf-reuse" data-id="${esc(c.id)}">Reaproveitar arquivos da versão ${adj.ver}</button>`:''}</div>
   <small class="mut">Imagens, vídeos, PDF e textos até ${CF_MAXMB} MB cada, em qualidade original. Arquivos de design (PSD, AI, Figma) entram como link.</small>
   <input type="file" id="cf-file" data-id="${esc(c.id)}" multiple hidden>
   <label class="fld full"><span>Observações para a liderança (opcional)</span><textarea id="cf-note" data-id="${esc(c.id)}" placeholder="${adj?'O que foi ajustado nesta versão':'Ex.: datas comemorativas incluídas, ponto de atenção do cliente'}">${esc((ui.cfNote||{})[c.id]||'')}</textarea></label>
   <div class="row"><span class="spacer"></span><button class="btn primary" data-act="cf-send" data-id="${esc(c.id)}" ${draft.length?'':'disabled aria-disabled="true" title="Anexe o material antes de enviar"'}>Enviar para aprovação${adj?' (versão '+(adj.ver+1)+')':''}</button></div></div>`}
  else body+=`<p class="mut">Só os responsáveis por este calendário anexam e enviam o material.</p>`}
 return `<div class="sec cf-box"><h3>${c.stage==='pendente'?'Próximo passo':c.stage==='entregue'?'Situação':esc(CF_NAME[c.stage]||'Etapa')+' · '+CF_ST_L[st]}</h3>${body}</div>${cfPipe(c)}`}

/* ---------- ações do designer ---------- */
async function cfStart(id){const c=byId('calendars',id);if(!c)return;if(c.stage!=='pendente'){toast('A produção deste calendário já foi iniciada.');return}
 if(!cfCanWork(c)){toast('Só os responsáveis iniciam a produção.');return}
 const mm=myMember();const now=new Date().toISOString();
 await calSave(c,{stage:'copy',startedAt:now,startedBy:mm?.id||''},{k:'inicio',from:'pendente',to:'copy'});toast('Produção iniciada · Pré-calendário')}
async function cfAddFiles(id,list){const c=byId('calendars',id);if(!c||!cfCanWork(c)||!CF_GATED.includes(c.stage)||cfState(c)==='pendente'||cfState(c)==='aprovada')return;
 const files=[...list];const big=files.filter(f=>f.size>CF_MAXMB*1048576);const ok=files.filter(f=>!big.includes(f));
 if(big.length)toast(big.map(f=>f.name).join(', ')+': acima de '+CF_MAXMB+' MB. Envie como link.');if(!ok.length)return;
 if(!assets){toast('O envio de arquivos não está disponível nesta visualização.');return}
 const mm=myMember();const added=[];const fail=[];
 for(const f of ok){try{const r=await assets.upload(f,{clientId:c.clientId});added.push({assetId:r.id,name:f.name,type:r.contentType||f.type,size:r.sizeBytes||f.size,by:mm?.id||'',at:new Date().toISOString()})}catch(e){fail.push(f.name)}}
 if(fail.length)toast('Não foi possível anexar: '+fail.join(', ')+'. Formatos aceitos: imagem, vídeo, PDF ou texto. Para arquivos de design, use link.');
 if(!added.length)return;const c2=byId('calendars',id);const d=c2.draft&&c2.draft.stage===c2.stage?c2.draft.files||[]:[];
 await calSave(c2,{draft:{stage:c2.stage,files:[...d,...added]}});toast(added.length+' arquivo'+(added.length>1?'s anexados':' anexado'))}
function cfLinkForm(id){const c=byId('calendars',id);if(!c||!cfCanWork(c))return;
 formModal({title:'Adicionar link ao material',values:{name:'',link:''},back:()=>calDetail(id),fields:[{k:'link',l:'Link',t:'text',req:1,ph:'https://…',full:1},{k:'name',l:'Nome do arquivo',t:'text',ph:'Ex.: Pré-calendário dezembro (Canva)',full:1}],
  onSave:async v=>{const u=String(v.link||'').trim();if(!/^https?:\/\/\S+\.\S+/.test(u)){toast('Cole um link completo, começando com https://');throw new Error('url')}
   const c2=byId('calendars',id);const d=c2.draft&&c2.draft.stage===c2.stage?c2.draft.files||[]:[];const mm=myMember();
   await calSave(c2,{draft:{stage:c2.stage,files:[...d,{link:u,name:(v.name||'').trim()||host(u),by:mm?.id||'',at:new Date().toISOString()}]}});toast('Link anexado');setTimeout(()=>calDetail(id),40)}})}
async function cfSend(id,btn){const c=byId('calendars',id);if(!c)return;
 if(!CF_GATED.includes(c.stage)){toast('Esta etapa não passa por aprovação.');return}
 if(!cfCanWork(c)){toast('Só os responsáveis enviam o material deste calendário.');return}
 const st=cfState(c);if(st==='pendente'){toast('Já existe um envio aguardando aprovação.');return}if(st==='aprovada'){toast('Esta etapa já foi aprovada.');return}
 const files=c.draft&&c.draft.stage===c.stage?c.draft.files||[]:[];if(!files.length){toast('Anexe o material da etapa antes de enviar para aprovação.');return}
 btn&&(btn.disabled=true);const mm=myMember();const now=new Date().toISOString();const ver=cfSubs(c,c.stage).length+1;const note=((ui.cfNote||{})[id]||'').trim();
 const sub={id:uid(),stage:c.stage,ver,files,note,by:mm?.id||'',at:now,status:'pending'};
 await calSave(c,{subs:[...(c.subs||[]),sub],draft:null,sentAt:c.stage==='validacao'?now:c.sentAt||''},{k:'envio',from:c.stage,to:c.stage,note:'Versão '+ver+' · '+files.length+' arquivo'+(files.length>1?'s':'')+(note?' · '+note:'')});
 if(ui.cfNote)delete ui.cfNote[id];
 toast('Enviado para aprovação · '+CF_NAME[c.stage]);
 sysPost(`📅 **${actor()}** enviou ${CF_NAME[c.stage].toLowerCase()} do calendário de **${cName(c.clientId)}** (${calMonthL(c.month)}) para aprovação${ver>1?' · versão '+ver:''}. Quem aprova: ${apNames()}.`,{act:'cf-review',id})}

/* ---------- única transição manual que sobra: reabrir entregue (administrador) ---------- */
async function calMove(id,to,note){const c=byId('calendars',id);if(!c||c.stage===to)return;
 if(!(c.stage==='entregue'&&to==='artes'&&isAdmin())){toast('As etapas avançam só com a aprovação da liderança.');return}
 await calSave(c,{stage:'artes',doneAt:'',approvedAt:'',approvedBy:'',draft:null},{k:'reaberto',from:'entregue',to:'artes',note:note||''});toast('Calendário reaberto · '+cName(c.clientId))}

/* ---------- decisão (somente na área de Aprovações) ---------- */
async function cfDecide(id,ok,reason){const c=byId('calendars',id);if(!c)return false;const s=cfLast(c);
 if(!s||s.status!=='pending'){toast('Este envio já foi avaliado'+(s?.decidedBy?' por '+first(s.decidedBy):'')+'.');return false}
 if(!cfDecider()){toast('Só '+apNames()+' e a liderança aprovam etapas de calendário.');return false}
 const mm=myMember();if(mm&&s.by===mm.id){toast('Você não pode aprovar o próprio material.');return false}
 if(!s.files||!s.files.length){toast('Este envio não tem material anexado.');return false}
 if(!ok&&String(reason||'').trim().length<3){toast('Escreva a justificativa do ajuste.');return false}
 const now=new Date().toISOString();const dec={...s,status:ok?'approved':'adjust',decidedBy:mm?.id||'',decidedAt:now,...(ok?{}:{reason:String(reason).trim()})};
 const subs=(c.subs||[]).map(x=>x.id===s.id?dec:x);const p={subs};let h;
 if(ok){if(c.stage==='copy'){Object.assign(p,{stage:'artes',copyDoneAt:now,artStartedAt:now});h={k:'aprov',from:'copy',to:'artes',note:'Pré-calendário aprovado (versão '+s.ver+')'}}
  else if(c.stage==='artes'){Object.assign(p,{stage:'validacao',artDoneAt:now,sentAt:'',approvedAt:'',approvedBy:''});h={k:'aprov',from:'artes',to:'validacao',note:'Artes aprovadas (versão '+s.ver+')'}}
  else{Object.assign(p,{approvedAt:now,approvedBy:mm?.id||''});h={k:'aprovado',from:'validacao',to:'validacao',note:'Validação final aprovada (versão '+s.ver+'). Liberado para envio ao cliente.'}}}
 else{Object.assign(p,{rounds:(c.rounds||0)+1,lastAdj:{at:now,by:mm?.id||'',reason:dec.reason,stage:c.stage}});h={k:'ajuste',from:c.stage,to:c.stage,note:CF_NAME[c.stage]+' · versão '+s.ver+': '+dec.reason}}
 await calSave(c,p,h);
 const who=calFn(s.by);
 if(ok)sysPost(`✅ **${actor()}** aprovou ${CF_NAME[c.stage].toLowerCase()} do calendário de **${cName(c.clientId)}** (${calMonthL(c.month)})${c.stage==='validacao'?'. Liberado para envio ao cliente':'. Próxima etapa liberada para **'+who+'**'}.`,{act:'cal-open',id});
 else sysPost(`↩️ **${actor()}** devolveu ${CF_NAME[c.stage].toLowerCase()} do calendário de **${cName(c.clientId)}** para **${who}** ajustar: ${String(reason).slice(0,160)}`,{act:'cal-open',id});
 return true}

/* ---------- tela de análise (área de Aprovações) ---------- */
function cfReview(id){const draw=()=>{const c=byId('calendars',id);if(!c){closeModal();return}const s=cfLast(c);const pend=cfState(c)==='pendente';const can=cfDecider();const mm=myMember();const self=!!mm&&s&&s.by===mm.id;
 const keep=document.getElementById('cf-reason')?.value??'';const open=ui.cfRefuse===id;const q=cfPending();const pos=q.findIndex(x=>x.id===id);
 const prevAdj=cfSubs(c,c.stage).filter(x=>x.status==='adjust').pop();
 const allSubs=[...(c.subs||[])].reverse();
 $('#modal').innerHTML=`<div class="mh"><div class="row" style="gap:10px;flex-wrap:nowrap;min-width:0">${clientLogo(c.clientId,38)}<div style="min-width:0"><h2 style="overflow-wrap:anywhere">${esc(cName(c.clientId))}</h2><div style="font-size:13px;color:var(--muted)"><span class="ap-type cal">Calendário</span> ${calMonthL(c.month)} · ${esc(CF_NAME[c.stage]||CAL_L[c.stage])}${s?' · versão '+s.ver:''}${pend&&q.length>1&&pos>=0?' · '+(pos+1)+' de '+q.length+' calendários na fila':''}</div></div></div><button class="x" data-act="close" aria-label="Fechar">×</button></div>
 <div class="mb">
  ${s?`<div class="ap-meta">${av(s.by)}<span>Enviado por <b>${esc(mName(s.by))}</b> em ${cfDT(s.at)} (${esc(ago(s.at))})</span><span>· ${esc(calOwnersTxt(c))}</span></div>`:''}
  ${s&&s.note?`<div class="note"><p><b>Observações do designer:</b> ${esc(s.note)}</p></div>`:''}
  ${pend&&prevAdj?`<div class="ap-reason" style="-webkit-line-clamp:unset;background:var(--surface-2);border-left-color:var(--muted)"><b>Ajuste pedido na versão ${prevAdj.ver} (${esc(first(prevAdj.decidedBy))}):</b> ${esc(prevAdj.reason)}</div>`:''}
  ${s?`<div class="sec"><h3>Material enviado (${s.files.length})</h3><div class="cf-pvs">${s.files.map(cfPreview).join('')}</div><ul class="cf-files">${s.files.map(f=>cfFileRow(f)).join('')}</ul><small class="mut">Arquivos na qualidade original. Use Abrir ou Baixar para conferir em tamanho real.</small></div>`:''}
  ${pend?(can&&!self?`<div class="ap-acts"><button class="ap-btn ok" data-act="cf-ok" data-id="${id}">${ICO_OK}Aprovar etapa</button><button class="ap-btn no" data-act="cf-no" data-id="${id}" aria-expanded="${open}">${ICO_NO}Solicitar ajustes</button></div>
   <div class="ap-why" id="cf-why" ${open?'':'hidden'}><label class="fld full"><span>Justificativa (obrigatória)</span><textarea id="cf-reason" placeholder="Ex.: faltou a data comemorativa do dia 20; revisar a copy do post 4">${esc(keep)}</textarea><small>${esc(calFn(s.by))} vê a devolução no calendário e no Meu Dia, e envia uma nova versão.</small></label>
    <div class="row"><button class="btn" data-act="cf-no-x">Cancelar</button><span class="spacer"></span><button class="btn ap-send" data-act="cf-no-send" data-id="${id}">Devolver para ajustes</button></div></div>`
   :self?`<div class="note"><p>Você enviou este material. Outra pessoa da liderança precisa aprovar.</p></div>`:`<div class="note"><p>Aguardando aprovação de <b>${esc(apNames())}</b> ou da liderança.</p></div>`)
   :s?`<div class="note"><p>${s.status==='approved'?'Aprovado':s.status==='adjust'?'Devolvido para ajustes':'Avaliado'}${s.decidedBy?' por <b>'+esc(first(s.decidedBy))+'</b> em '+cfDT(s.decidedAt):''}.${s.reason?' “'+esc(s.reason)+'”':''}</p></div>`:''}
  ${allSubs.length?`<details class="sec" ${pend?'':'open'}><summary style="cursor:pointer;font-size:13px;color:var(--muted)">Histórico de versões e aprovações (${allSubs.length})</summary><div class="cf-vers">${allSubs.map(x=>`<div class="cf-ver"><div><span class="ap-tag ${x.status==='approved'?'ok':x.status==='adjust'?'no':'req'}">${esc(CF_NAME[x.stage])} · v${x.ver} · ${x.status==='approved'?'Aprovada':x.status==='adjust'?'Ajustes':'Aguardando'}</span> <small>enviada por ${esc(calFn(x.by))} em ${cfDT(x.at)}</small></div>${x.note?`<p>${esc(x.note)}</p>`:''}${x.decidedAt?`<p class="${x.status==='adjust'?'bad':''}">${x.status==='approved'?'Aprovada':'Devolvida'} por ${esc(calFn(x.decidedBy))} em ${cfDT(x.decidedAt)}${x.reason?': “'+esc(x.reason)+'”':''}</p>`:''}<ul class="cf-files">${x.files.map(f=>cfFileRow(f)).join('')}</ul></div>`).join('')}</div></details>`:''}
 </div>
 <div class="mf"><button class="btn ghost" data-act="cal-open" data-id="${id}">Abrir o calendário</button><span class="spacer"></span><button class="btn" data-act="close">Fechar</button></div>`;
 if(open){const t=document.getElementById('cf-reason');if(t&&document.activeElement!==t&&!keep)t.focus()}};
 const c0=byId('calendars',id);if(c0&&!calVisible(c0)&&!cfDecider()){toast('Este calendário é de outro designer.');return}
 if(ui.cfRefuse!==id)ui.cfRefuse='';openModal('',{rerender:draw});draw()}
function cfNext(id){const nx=cfPending().find(x=>x.id!==id&&cfLast(x).by!==myMember()?.id);if(nx){cfReview(nx.id);return true}closeModal();return false}

/* ---------- cartão na área de Aprovações ---------- */
function cfCard(c){const s=cfLast(c)||{};const st=cfState(c);const rel=st==='aprovada';
 return `<button class="ap-card cf-card" data-act="${st==='pendente'?'cf-review':'cal-open'}" data-id="${c.id}"><span class="thumb cf-th">${clientLogo(c.clientId,54)}<span class="kind">Calendário</span>${s.ver>1&&!rel?`<span class="ap-v">Versão ${s.ver}</span>`:''}</span>
  <span class="ap-bd"><span class="ap-type cal">${esc(rel?'Validação final aprovada':CF_NAME[c.stage]||'')}</span><b>${esc(cName(c.clientId))}</b><small>Calendário de ${calMonthL(c.month)} · ${s.files?s.files.length:0} arquivo${s.files&&s.files.length===1?'':'s'}</small>
  ${st==='pendente'?`<span class="ap-by">${av(s.by)}<span>${esc(first(s.by))} · enviado ${esc(ago(s.at))}</span></span>${s.note?`<span class="cf-cnote">“${esc(s.note)}”</span>`:''}`:''}
  ${st==='ajustes'?`<span class="ap-reason">${esc(s.reason||'')}</span><span class="ap-by">${av(s.by)}<span>Com ${esc(first(s.by))} · pedido por ${esc(first(s.decidedBy))} ${esc(ago(s.decidedAt))}</span></span>`:''}
  ${rel?`<span class="row" style="gap:6px"><span class="pill p-ok">✓ ${esc(first(c.approvedBy))} · ${fD(c.approvedAt)}</span><span class="pill p-alto">Falta registrar a entrega</span></span>`:''}</span></button>`}

/* ---------- Meu Dia e menu ---------- */
function calToday(mm,out){if(!mm)return;const t0=today();
 S.calendars.forEach(c=>{if(c.stage==='entregue')return;const st=cfState(c);const mine=calPeople(c).includes(mm.id);const s=cfLast(c);
  if(mine&&st==='ajustes')out.push({k:'Ajuste de calendário',cls:'p-critico',t:'Calendário de '+calMonthL(c.month)+' · '+CF_NAME[c.stage]+(s.reason?' · “'+String(s.reason).slice(0,90)+(String(s.reason).length>90?'…':'')+'”':''),c:c.clientId,due:t0,late:calLate(c),act:['cal-open',c.id],extra:'devolvido '+fD(s.decidedAt)});
  else if(mine&&st==='aprovada'&&c.artId===mm.id)out.push({k:'Entregar calendário',cls:'p-ok',t:'Calendário de '+calMonthL(c.month)+' aprovado · registrar a entrega ao cliente',c:c.clientId,due:t0,late:false,act:['cal-open',c.id]});
  else if(mine&&(st==='producao'||st==='nao')&&c.due&&c.due<=t0)out.push({k:'Calendário',cls:'p-medio',t:'Calendário de '+calMonthL(c.month)+' · '+(st==='nao'?'não iniciado':CF_NAME[c.stage]),c:c.clientId,due:c.due,late:c.due<t0,act:['cal-open',c.id]});
  if(st==='pendente'&&cfDecider()&&s.by!==mm.id)out.push({k:'Aprovar calendário',cls:'p-alto',t:'Calendário de '+calMonthL(c.month)+' · '+CF_NAME[c.stage]+' · enviado por '+calFn(s.by),c:c.clientId,due:t0,late:false,act:['cf-review',c.id],extra:ago(s.at)})})}
function calBadge(mm){if(mode==='wait'||!mm)return 0;const t0=today();
 return S.calendars.filter(c=>c.stage!=='entregue'&&calPeople(c).includes(mm.id)&&(cfState(c)==='ajustes'||((cfState(c)==='producao'||cfState(c)==='nao')&&c.due&&c.due<t0))).length}

/* ---------- cartões do quadro: selo da situação da aprovação ---------- */
function cfCardBadge(c){const st=cfState(c);if(!['pendente','ajustes','aprovada'].includes(st))return'';return `<span class="pill ${CF_ST_C[st]} cf-badge">${st==='aprovada'?'Aprovado · falta entregar':CF_ST_L[st]}</span>`}

/* ---------- histórico (textos novos) ---------- */
function calHistTxt(h){const L=s=>CAL_L[s]||s;
 return {criado:'Calendário criado',inicio:'Produção iniciada',envio:'Enviado para aprovação · '+(CF_NAME[h.from]||L(h.from)),aprov:(CF_NAME[h.from]||L(h.from))+' aprovado · liberado '+L(h.to),ajuste:'Devolvido para ajustes',aprovado:'Validação final aprovada pela liderança',entregue:'Entregue ao cliente',obs:'Observação',edit:'Dados atualizados',transfer:'Transferido de designer',reaberto:'Reaberto'}[h.k]||(h.from&&h.to?L(h.from)+' → '+L(h.to):L(h.to))}

/* ---------- eventos: ações novas e bloqueio das antigas ---------- */
document.addEventListener('input',e=>{if(e.target.id==='cf-note'){(ui.cfNote=ui.cfNote||{})[e.target.dataset.id]=e.target.value}});
document.addEventListener('change',async e=>{if(e.target.id==='cf-file'){const id=e.target.dataset.id;const fl=e.target.files;if(fl&&fl.length){toast('Enviando '+fl.length+' arquivo'+(fl.length>1?'s':'')+'…');await cfAddFiles(id,fl)}e.target.value=''}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id;
 const stop=()=>{e.stopPropagation();e.stopImmediatePropagation();e.preventDefault()};
 /* fluxo antigo: só "reabrir" (admin) continua; o resto passa pela esteira */
 if(a==='cal-move'){const c=byId('calendars',id);stop();if(c&&c.stage==='entregue'&&b.dataset.v==='artes'&&isAdmin()){b.disabled=true;await calMove(id,'artes','Reaberto pelo administrador')}else toast('As etapas avançam só com a aprovação da liderança.');return}
 if(a==='cal-ok'||a==='cal-adj'||a==='cal-adj-send'){stop();toast('A aprovação dos calendários acontece na área de Aprovações.');return}
 if(a==='cal-dlv'){const c=byId('calendars',id);if(!c||c.stage!=='validacao'||!c.approvedAt){stop();toast('Registre a entrega depois da aprovação da validação final.');return}if(!(cfCanWork(c)||cfDecider())){stop();toast('Só os responsáveis e a liderança registram a entrega.');return}return}
 if(!a.startsWith('cf-'))return;stop();
 try{switch(a){
  case'cf-start':b.disabled=true;await cfStart(id);break;
  case'cf-pick':{const inp=$('#cf-file');if(inp)inp.click();break}
  case'cf-link':cfLinkForm(id);break;
  case'cf-rm':{const c=byId('calendars',id);if(!c||!cfCanWork(c)||!c.draft)return;const i=+b.dataset.v;const f=(c.draft.files||[]).filter((_,j)=>j!==i);await calSave(c,{draft:{...c.draft,files:f}});break}
  case'cf-reuse':{const c=byId('calendars',id);if(!c||!cfCanWork(c))return;const s=cfLast(c);if(!s||s.status!=='adjust')return;const d=c.draft&&c.draft.stage===c.stage?c.draft.files||[]:[];const have=new Set(d.map(f=>f.assetId||f.link));
   await calSave(c,{draft:{stage:c.stage,files:[...d,...s.files.filter(f=>!have.has(f.assetId||f.link))]}});toast('Arquivos da versão '+s.ver+' copiados. Remova ou adicione o que mudou.');break}
  case'cf-send':await cfSend(id,b);break;
  case'cf-dl':await fileDl(b,b.dataset.asset,b.dataset.name);break;
  case'cf-review':ui.cfRefuse='';cfReview(id);break;
  case'cf-ok':{b.disabled=true;if(await cfDecide(id,true)){toast('Etapa aprovada');if(!cfNext(id))refresh()}else b.disabled=false;break}
  case'cf-no':{ui.cfRefuse=id;const w=$('#cf-why');if(w){w.hidden=false;$('#cf-reason')?.focus()}b.setAttribute('aria-expanded','true');break}
  case'cf-no-x':{ui.cfRefuse='';const w=$('#cf-why');if(w)w.hidden=true;break}
  case'cf-no-send':{const r=($('#cf-reason')?.value||'').trim();if(r.length<3){toast('Escreva a justificativa do ajuste.');$('#cf-reason')?.focus();return}b.disabled=true;ui.cfRefuse='';
   if(await cfDecide(id,false,r)){toast('Devolvido para ajustes');if(!cfNext(id))refresh()}else b.disabled=false;break}
  case'cf-type':ui.apType=b.dataset.v;refresh();break}}catch(err){console.error(err);toast('Não foi possível concluir. Tente de novo.')}},true);

(()=>{const st=document.createElement('style');st.textContent=`
.cf-box p{margin:0 0 10px;font-size:14px}.cf-box .mut,.cf-up .mut{color:var(--muted);font-size:13px}
.cf-msg{padding:12px 14px;border-radius:10px;background:var(--surface-2,var(--bg));border-left:4px solid var(--line);font-size:14px;margin-bottom:12px}
.cf-msg.wait{border-left-color:var(--warn,#c98a00);background:color-mix(in srgb,var(--warn,#c98a00) 10%,var(--surface))}
.cf-msg.bad{border-left-color:var(--crit);background:color-mix(in srgb,var(--crit) 8%,var(--surface))}.cf-msg.bad p{margin:6px 0 0}
.cf-msg.ok{border-left-color:var(--ok);background:var(--ok-soft,color-mix(in srgb,var(--ok) 10%,var(--surface)))}
.cf-up{display:flex;flex-direction:column;gap:10px;border:1px solid var(--line);border-radius:12px;padding:14px}
.cf-uph{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.cf-files{list-style:none;margin:0 0 6px;padding:0;display:flex;flex-direction:column;gap:6px}
.cf-f{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
.cf-f .ic{font-size:18px}.cf-f .nm{flex:1;min-width:0;display:flex;flex-direction:column}.cf-f .nm b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.cf-f .nm small{color:var(--muted);font-size:12px}
.cf-note{font-size:14px}.cf-prev{margin-bottom:10px}.cf-prev summary{cursor:pointer;font-size:13px;color:var(--muted);margin-bottom:6px}
.cf-pipe ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0}
.cf-s{position:relative;padding:0 0 14px 22px;border-left:2px solid var(--line);margin-left:6px}
.cf-s:last-child{border-left-color:transparent;padding-bottom:0}
.cf-s::before{content:"";position:absolute;left:-7px;top:3px;width:12px;height:12px;border-radius:50%;background:var(--surface);border:2px solid var(--line)}
.cf-s.aprovada::before,.cf-s.concluida::before{background:var(--ok);border-color:var(--ok)}
.cf-s.pendente::before{background:var(--warn,#c98a00);border-color:var(--warn,#c98a00)}.cf-s.ajustes::before{background:var(--crit);border-color:var(--crit)}
.cf-s.producao::before{border-color:var(--ink);background:var(--ink)}
.cf-s.cur .cf-h b{font-size:15px}
.cf-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.cf-h b{font-size:14px}
.cf-s ul{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:4px}
.cf-s ul li{font-size:13px;display:flex;flex-wrap:wrap;gap:4px 8px}.cf-s ul li small{color:var(--muted)}
.cf-s ul li p{flex-basis:100%;margin:0;color:var(--muted)}.cf-s ul li p.bad{color:var(--crit)}
.cf-pvs{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:10px}
.cf-pvs:empty{display:none}
.cf-pv{margin:0;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface-2,var(--bg))}
.cf-pv img,.cf-pv video{display:block;width:100%;max-height:420px;object-fit:contain;background:#111}
.cf-pv.pdf{grid-column:1/-1}.cf-pv iframe{display:block;width:100%;height:480px;border:0;background:#fff}
.cf-pv figcaption{font-size:12px;color:var(--muted);padding:6px 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cf-vers{display:flex;flex-direction:column;gap:10px;margin-top:8px}.cf-ver{border:1px solid var(--line);border-radius:10px;padding:10px}
.cf-ver p{margin:6px 0;font-size:13px}.cf-ver p.bad{color:var(--crit)}.cf-ver small{color:var(--muted)}
.ap-type{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:6px;background:var(--surface-2,var(--bg));color:var(--muted);margin-bottom:2px}
.ap-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.ap-top .tabs{margin:0}
.ap-type.cal{background:#1d4ed81a;color:#1d4ed8}.ap-type.cr{background:#7c3aed1a;color:#7c3aed}
.cf-th{display:grid!important;place-items:center;background:var(--surface-2,var(--bg))}
.cf-cnote{font-size:12.5px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ap-tsw{display:inline-flex;gap:2px;padding:3px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2,var(--bg))}
.ap-tsw button{border:0;background:none;padding:6px 12px;border-radius:8px;font-weight:600;font-size:13.5px;color:var(--muted)}
.ap-tsw button[aria-pressed="true"]{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.1)}
.cal-card .cf-badge{margin-top:2px}
`;(document.body||document.head).appendChild(st)})();
