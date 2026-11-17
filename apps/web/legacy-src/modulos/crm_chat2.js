/* ================= Chat da equipe · v2 =================
   Sem IA. Mensagens em tempo real pelo banco do Terzo (assinaturas), com autoria protegida pelo banco:
   - cm/<conta>/m/<id>   mensagens que ESSA conta escreveu (só ela grava; a equipe lê)  → regra cm/{self}
   - cr/<conta>          última leitura por conversa dessa conta (só ela grava)          → regra cr/{self}
   - ck/<conta>          chave pública dessa conta para conversas individuais            → regra ck/{self}
   - data/users/<conta>/chatkey   chave privada (só a própria conta lê; nem o dono do Terzo)
   - chat_channels       canais extras (criados por administrador/líder)
   - chat_cfg/main       configurações (tamanho máximo de anexo, urgência para designers)
   Conversas individuais (dm:<membroA>:<membroB>) são cifradas no navegador (ECDH P-256 + AES-GCM 256):
   o banco guarda só o texto cifrado; só os dois participantes conseguem ler.
   Canais (# Geral e os extras) são abertos à equipe. Autor = dono da área onde a mensagem está gravada.
   A coleção antiga `chat` continua sendo lida (histórico do Geral) e não é alterada. */
COLS.push('chat_channels','chat_cfg');S.chat_channels=[];S.chat_cfg=[];
if(!VIEWS.some(v=>v[0]==='chat')){const i=VIEWS.findIndex(v=>v[0]==='aprovacoes');VIEWS.splice(i>=0?i+1:VIEWS.length,0,['chat','Chat','Chat'])}
if(!VIEWS_COM.includes('chat'))VIEWS_COM.push('chat');
try{delete VIEW_ALIAS.chat}catch(e){}
function viewOk(k){if(!VIEWS.some(v=>v[0]===k))return false;if(mode==='wait')return true;if(k==='chat')return true;const mm=myMember();
 if(mm&&Array.isArray(mm.views)&&mm.views.length)return mm.views.includes(k);
 if(mm&&mm.area==='Comercial'&&!isAdmin())return VIEWS_COM.includes(k);
 if(['producao','equipe'].includes(k))return isAdmin();return true}
if(typeof IC!=='undefined'&&!IC.chat)IC.chat='<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>';

const TC={msgs:new Map(),reads:{},keys:{},subs:{},pend:new Map(),conn:'on',loaded:false,shared:{},priv:null,pubMine:null,dec:new Map(),seen:new Set(),boot:0};
const TC_DAYS=60;
const TC_LV={normal:'Normal',atencao:'Atenção',urgente:'Urgente'};
const tcCfg=()=>Object.assign({maxMB:20,designerUrgent:false},(S.chat_cfg||[]).find(x=>x.id==='main')||{});
const tcMe=()=>myMember();
const tcAcc=m=>m&&m.accountId||'';
const tcActive=()=>S.members.filter(m=>!m.disabled);
const tcCanManage=()=>isAdmin()||isLeader();
const tcCanUrgent=()=>isAdmin()||isLeader()||tcCfg().designerUrgent;
const tcDmId=(a,b)=>'dm:'+[a,b].sort().join(':');
const tcIsDm=ch=>String(ch||'').startsWith('dm:');
const tcDmPeer=ch=>{const mm=tcMe();const p=String(ch).slice(3).split(':');return p.find(x=>x!==mm?.id)||p[0]};
const tcChannels=()=>[{id:'geral',name:'Geral — Terceiro Andar',desc:'Comunicados, avisos e alinhamentos de toda a agência',fixed:true},...(S.chat_channels||[]).filter(c=>!c.archived).sort((a,b)=>String(a.name).localeCompare(String(b.name),'pt')).map(c=>({id:'c:'+c.id,name:c.name,desc:c.desc||'',doc:c}))];
const tcChName=ch=>tcIsDm(ch)?mName(tcDmPeer(ch)):'# '+(tcChannels().find(c=>c.id===ch)?.name||'Canal');
const b64=u8=>btoa(String.fromCharCode(...new Uint8Array(u8)));const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));

/* ---------- chaves para conversas individuais ---------- */
async function tcKeysInit(){const mm=tcMe();if(!mm||!me.id||mode!=='db'||TC.priv||TC.keyBusy||ui.viewAs)return;TC.keyBusy=true;
 try{const col=db.collection('data/users/'+me.id);
  const got=await new Promise(res=>{let done=false;const un=col.onSnapshot(s=>{if(done)return;done=true;try{un&&un()}catch(e){}res(s.docs.map(d=>({id:d.id,...d.data()})).find(d=>d.id==='chatkey'))},()=>{if(!done){done=true;res(null)}});setTimeout(()=>{if(!done){done=true;res(null)}},6000)});
  let rec=got;
  if(!rec||!rec.priv){const kp=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveKey']);
   rec={priv:await crypto.subtle.exportKey('jwk',kp.privateKey),pub:await crypto.subtle.exportKey('jwk',kp.publicKey),at:new Date().toISOString()};
   await col.doc('chatkey').set(rec)}
  TC.priv=await crypto.subtle.importKey('jwk',rec.priv,{name:'ECDH',namedCurve:'P-256'},false,['deriveKey']);TC.pubMine=rec.pub;
  const pubDoc=TC.keys[me.id];if(!pubDoc||JSON.stringify(pubDoc.pub)!==JSON.stringify(rec.pub))await db.collection('ck').doc(me.id).set({pub:rec.pub,member:mm.id,at:new Date().toISOString()});
  TC.dec.clear();tcUpdate()}catch(e){console.error('chat keys',e)}finally{TC.keyBusy=false}}
async function tcShared(acc){if(!TC.priv)throw new Error('nokey');const k=TC.keys[acc];if(!k||!k.pub)throw new Error('nopeer');const tag=acc+'|'+JSON.stringify(k.pub).length+JSON.stringify(k.pub).slice(-12);
 if(TC.shared[tag])return TC.shared[tag];const pub=await crypto.subtle.importKey('jwk',k.pub,{name:'ECDH',namedCurve:'P-256'},false,[]);
 return TC.shared[tag]=await crypto.subtle.deriveKey({name:'ECDH',public:pub},TC.priv,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function tcEncrypt(peerAcc,ch,obj){const key=await tcShared(peerAcc);const iv=crypto.getRandomValues(new Uint8Array(12));
 const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(ch)},key,new TextEncoder().encode(JSON.stringify(obj)));return{iv:b64(iv),ct:b64(ct)}}
async function tcDecryptMsg(m){if(TC.dec.has(m.id))return;const mm=tcMe();const p=String(m.ch).slice(3).split(':');if(!mm||!p.includes(mm.id)){TC.dec.set(m.id,{err:'priv'});return}
 const other=m.acc===me.id?byId('members',tcDmPeer(m.ch)):byId('members',m.by);const acc=tcAcc(other);
 try{const key=await tcShared(acc);const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(m.enc.iv),additionalData:new TextEncoder().encode(m.ch)},key,unb64(m.enc.ct));TC.dec.set(m.id,JSON.parse(new TextDecoder().decode(pt)))}
 catch(e){TC.dec.set(m.id,{err:'key'})}}
function tcBody(m){if(!m.enc)return m;const d=TC.dec.get(m.id);if(!d)return{...m,text:'',pendingDec:true};if(d.err)return{...m,text:'',decErr:d.err};return{...m,...d}}

/* ---------- assinaturas em tempo real ---------- */
function tcSubAll(){if(mode!=='db'||!db||!me.id)return;const accs=new Set(S.members.map(tcAcc).filter(Boolean));accs.add(me.id);
 const from=new Date(Date.now()-TC_DAYS*864e5).toISOString();
 accs.forEach(acc=>{if(TC.subs['m:'+acc])return;TC.subs['m:'+acc]=db.collection('cm/'+acc+'/m').where('at','>=',from).onSnapshot(s=>{tcConnOk();const firstLoad=!TC.ready?.has(acc);(TC.ready=TC.ready||new Set()).add(acc);
  const seen=new Set();s.docs.forEach(d=>{const v=d.data();seen.add(d.id);const prev=TC.msgs.get(d.id);TC.msgs.set(d.id,{id:d.id,...v,acc});TC.pend.delete(d.id);if(!prev&&!firstLoad)tcIncoming({id:d.id,...v,acc})});
  [...TC.msgs.values()].forEach(m=>{if(m.acc===acc&&!seen.has(m.id))TC.msgs.delete(m.id)});TC.loaded=true;tcUpdate()},e=>tcConnLost('m:'+acc))});
 if(!TC.subs.cr)TC.subs.cr=db.collection('cr').onSnapshot(s=>{tcConnOk();TC.reads={};s.docs.forEach(d=>TC.reads[d.id]=d.data());tcUpdate()},()=>tcConnLost('cr'));
 if(!TC.subs.ck)TC.subs.ck=db.collection('ck').onSnapshot(s=>{TC.keys={};s.docs.forEach(d=>TC.keys[d.id]=d.data());TC.dec.forEach((v,k)=>{if(v&&v.err)TC.dec.delete(k)});tcUpdate()},()=>tcConnLost('ck'));
 try{chatSub()}catch(e){}
 if(!TC.boot)TC.boot=setTimeout(()=>{TC.loaded=true},4000)}
function tcConnOk(){if(TC.conn!=='on'){TC.conn='on';tcUpdate()}}
function tcConnLost(k){TC.conn='off';const un=TC.subs[k];try{typeof un==='function'&&un()}catch(e){}delete TC.subs[k];tcUpdate();setTimeout(()=>{if(navigator.onLine!==false)tcSubAll()},4000)}
window.addEventListener('offline',()=>{TC.conn='off';tcUpdate()});window.addEventListener('online',()=>{tcSubAll();setTimeout(tcConnOk,1500)});

/* ---------- leitura das mensagens ---------- */
function tcLegacy(){return (typeof CHAT!=='undefined'?CHAT:[]).flatMap(d=>(d.msgs||[]).map(m=>({id:'L'+m.id,ch:'geral',at:m.at,by:d.author,text:m.text,sys:!!m.sys,link:m.link,legacy:true,acc:''})))}
function tcValid(m){if(m.legacy)return true;if(m.sys)return true;const mem=byId('members',m.by);return !!mem&&tcAcc(mem)===m.acc}
function tcCanSee(ch){if(!tcIsDm(ch))return ch==='geral'||tcChannels().some(c=>c.id===ch);const mm=tcMe();return !!mm&&String(ch).slice(3).split(':').includes(mm.id)}
function tcList(ch){const mm=tcMe();const lead=isLeader();
 const L=[...(ch==='geral'?tcLegacy():[]),...[...TC.msgs.values()].filter(m=>m.ch===ch&&tcValid(m)),...[...TC.pend.values()].filter(m=>m.ch===ch&&!TC.msgs.has(m.id))];
 return L.filter(m=>{if(!m.sys||lead||m.link?.act!=='task-open')return true;const t=byId('todos',m.link.id);return !!t&&tkMine(t)}).sort((a,b)=>String(a.at).localeCompare(String(b.at)))}
const tcMyRead=ch=>(TC.reads[me.id]||{})[tcKey(ch)]||'';
const tcKey=ch=>String(ch).replace(/[.:\/]/g,'_');
const tcFromOther=m=>{const mm=tcMe();return !m.legacy&&!m.pend&&m.by!==mm?.id&&!m.del};
function tcUnread(ch){const r=tcMyRead(ch);return tcList(ch).filter(m=>tcFromOther(m)&&m.at>r)}
function tcMentionsMe(m){const mm=tcMe();if(!mm)return false;return (m.men||[]).some(x=>x.id===mm.id||x.id==='*')}
function tcConvs(){const mm=tcMe();if(!mm)return[];const dms=new Set();TC.msgs.forEach(m=>{if(tcIsDm(m.ch)&&tcCanSee(m.ch))dms.add(m.ch)});if(ui.tcCh&&tcIsDm(ui.tcCh))dms.add(ui.tcCh);
 return {chans:tcChannels(),dms:[...dms].filter(ch=>byId('members',tcDmPeer(ch))).map(ch=>({id:ch,last:tcList(ch).slice(-1)[0]})).sort((a,b)=>String(b.last?.at||'').localeCompare(String(a.last?.at||'')))}}
function tcAllUnread(){const c=tcConvs();if(!c.chans)return{n:0,men:0,urg:0,items:[]};const items=[];[...c.chans,...c.dms].forEach(x=>tcUnread(x.id).forEach(m=>items.push(m)));
 const men=items.filter(m=>tcMentionsMe(tcBody(m))||tcIsDm(m.ch)&&false);return{n:items.length,men:items.filter(m=>tcMentionsMe(m)).length,urg:items.filter(m=>m.lvl==='urgente').length,items}}
function chatUnreadAll(){try{return tcAllUnread().n}catch(e){return 0}}

/* ---------- marcar como lido ---------- */
let tcReadTimer=null;
function tcMarkRead(ch){if(!ch||mode!=='db'||!me.id||ui.viewAs||document.hidden)return;const L=tcList(ch).filter(m=>!m.pend);const last=L[L.length-1];if(!last)return;
 const k=tcKey(ch);const cur=(TC.reads[me.id]||{})[k]||'';if(last.at<=cur)return;
 TC.reads[me.id]={...(TC.reads[me.id]||{}),[k]:last.at};clearTimeout(tcReadTimer);tcReadTimer=setTimeout(()=>{db.collection('cr').doc(me.id).set({...(TC.reads[me.id]||{})}).catch(()=>{})},400)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&tcOpenCh())tcMarkRead(tcOpenCh())});
const tcOpenCh=()=>ui.view==='chat'||cwOpen?ui.tcCh||'geral':'';

/* ---------- envio ---------- */
function tcRateOk(){const now=Date.now();TC.sent=(TC.sent||[]).filter(t=>now-t<30000);if(TC.sent.length>=20){toast('Muitas mensagens em sequência. Espere alguns segundos.');return false}TC.sent.push(now);return true}
async function tcSend(){const mm=tcMe();if(!mm){toast('Vincule a sua conta para conversar.');return}if(ui.viewAs){toast('Modo visualização: nada pode ser enviado.');return}
 const ch=ui.tcCh||'geral';if(!tcCanSee(ch)){toast('Você não participa desta conversa.');return}
 const ta=$('#tc-text');const text=(ta?.value||'').replace(/\s+$/,'');const files=ui.tcFiles||[];if(!text.trim()&&!files.length)return;
 if(text.length>4000){toast('Mensagem muito longa (máximo 4.000 caracteres).');return}if(!tcRateOk())return;
 const lvl=ui.tcLvl==='urgente'&&!tcCanUrgent()?'normal':(ui.tcLvl||'normal');
 const men=(ui.tcMen||[]).filter(x=>text.includes(x.t)).filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i);
 const rp=ui.tcReply&&ui.tcReply.ch===ch?{id:ui.tcReply.id,by:ui.tcReply.by,snip:ui.tcReply.snip}:null;
 const id=uid()+uid().slice(0,4);const at=new Date().toISOString();
 let doc={ch,at,by:mm.id,lvl};
 if(tcIsDm(ch)){const peer=byId('members',tcDmPeer(ch));const pacc=tcAcc(peer);if(!pacc||!TC.keys[pacc]){toast(first(peer?.id)+' ainda não abriu o chat novo. A conversa individual fica disponível depois do primeiro acesso.');return}
  try{doc.enc=await tcEncrypt(pacc,ch,{text,reply:rp,files})}catch(e){toast('Não foi possível proteger a mensagem. Recarregue o Terzo e tente de novo.');return}}
 else Object.assign(doc,{text,men,files,...(rp?{reply:rp}:{})});
 const local={id,...doc,acc:me.id,pend:'sending',...(tcIsDm(ch)?{text,files,reply:rp}:{})};TC.pend.set(id,local);
 ui.tcDraft={...(ui.tcDraft||{}),[ch]:''};ui.tcMen=[];ui.tcFiles=[];ui.tcReply=null;ui.tcLvl='normal';if(ta){ta.value='';ta.style.height='auto'}tcStick=true;tcUpdate(true);
 await tcPush(id,doc)}
async function tcPush(id,doc){const p=TC.pend.get(id);if(p){p.pend='sending';tcUpdate()}
 try{if(mode!=='db')throw new Error('offline');await db.collection('cm/'+me.id+'/m').doc(id).set(doc);const q=TC.pend.get(id);if(q){q.pend='sent';q.doc=doc}tcUpdate();
  if(doc.lvl==='urgente'||(doc.men||[]).length)tcLogEvt(doc)}
 catch(e){const q=TC.pend.get(id);if(q){q.pend='fail';q.doc=doc}tcUpdate();toast(e?.code==='quota_exceeded'?'O chat atingiu o limite de armazenamento.':'Mensagem não enviada. Use "Tentar de novo".')}}
function tcLogEvt(){/* reservado: no servidor, menções e urgências viram linhas em notifications */}

/* mensagens automáticas do sistema (antes iam para a coleção chat) */
async function sysPost(text,link){try{if(mode!=='db'||!me.id||ui.viewAs)return;const mm=tcMe();const id=uid()+uid().slice(0,4);
 await db.collection('cm/'+me.id+'/m').doc(id).set({ch:'geral',at:new Date().toISOString(),by:mm?.id||'',sys:true,text,...(link?{link}:{})})}catch(e){}}

/* ---------- novas mensagens: avisos ---------- */
function tcIncoming(m){const mm=tcMe();if(!mm||m.by===mm.id||!tcCanSee(m.ch)||!tcValid({...m}))return;if(TC.seen.has(m.id))return;TC.seen.add(m.id);
 const open=tcOpenCh()===m.ch&&!document.hidden;const who=first(m.by);
 const finish=()=>{const b=tcBody(m);const men=tcMentionsMe(b);const urg=m.lvl==='urgente';const txt=String(b.sys?String(b.text||'').replace(/\*\*/g,''):b.text||(b.files?.length?'📎 '+b.files[0].name:'')).slice(0,120);
  if(!open){if(urg)tcAlert(m,who,txt);else if(!m.sys)toast((men?'Você foi mencionado(a) · ':'')+who+': '+txt)}
  if((document.hidden||!open)&&!m.sys&&typeof Notification!=='undefined'&&Notification.permission==='granted'){try{const n=new Notification(urg?'Mensagem urgente — Terceiro Andar':men?'Você foi mencionado(a) — Terceiro Andar':'Nova mensagem — Terceiro Andar',{body:(tcIsDm(m.ch)?'':tcChName(m.ch)+' · ')+who+': "'+txt+'"',tag:m.id});n.onclick=()=>{window.focus();tcGo(m.ch,m.id)}}catch(e){}}};
 if(m.enc)tcDecryptMsg(m).then(finish);else finish()}
function tcAlert(m,who,txt){let a=document.getElementById('tc-alert');if(!a){a=document.createElement('div');a.id='tc-alert';a.setAttribute('role','alert');document.body.appendChild(a)}
 a.dataset.ch=m.ch;a.dataset.id=m.id;a.innerHTML=`<span class="tc-lv urgente">Urgente</span><span><b>${esc(who)}</b> · ${esc(tcIsDm(m.ch)?'conversa individual':tcChName(m.ch))}<br>${esc(txt)}</span><button class="btn sm primary" data-act="tc-go" data-v="${esc(m.ch)}" data-id="${esc(m.id)}">Abrir</button><button class="x" data-act="tc-alert-x" aria-label="Fechar aviso">×</button>`}

/* ---------- renderização ---------- */
let tcStick=true;
function tcTime(iso){const t=new Date(iso);return pad(t.getHours())+':'+pad(t.getMinutes())}
function tcDayL(d){return d===today()?'Hoje':d===ymd(addD(new Date(),-1))?'Ontem':WD[new Date(d+'T12:00').getDay()]+', '+fD(d)}
function tcFmt(m){const b=tcBody(m);let h=esc(b.text||'').replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
 const mm=tcMe();(b.men||[]).slice().sort((x,y)=>y.t.length-x.t.length).forEach(x=>{const cur=x.id==='*'?'@todos':'@'+(byId('members',x.id)?.name||x.t.slice(1));
  h=h.split(esc(x.t)).join(`<span class="tc-men ${x.id===mm?.id||x.id==='*'?'me':''}" data-mid="${esc(x.id)}">${esc(cur)}</span>`)});
 if(b.sys)h=h.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');return h.replace(/\n/g,'<br>')}
function tcStatus(m){const mm=tcMe();if(m.by!==mm?.id||m.sys||m.legacy)return'';if(m.pend==='sending')return'<span class="tc-st">Enviando…</span>';
 if(m.pend==='fail')return`<span class="tc-st bad">Não enviada · <button class="lnk" data-act="tc-retry" data-id="${esc(m.id)}">Tentar de novo</button></span>`;
 const k=tcKey(m.ch);if(tcIsDm(m.ch)){const pacc=tcAcc(byId('members',tcDmPeer(m.ch)));const r=(TC.reads[pacc]||{})[k]||'';return r>=m.at?'<span class="tc-st ok">✓✓ Lida</span>':'<span class="tc-st">✓ Enviada</span>'}
 const rd=tcActive().filter(x=>x.id!==mm.id&&tcAcc(x)&&((TC.reads[tcAcc(x)]||{})[k]||'')>=m.at);
 return `<span class="tc-st">✓ Enviada${rd.length?` · <button class="lnk" data-act="tc-readers" data-id="${esc(m.id)}" ${tcCanManage()?'':'disabled'} title="${tcCanManage()?esc(rd.map(x=>x.name).join(', ')):''}">vista por ${rd.length}</button>`:''}</span>`}
function tcFiles(files){return (files||[]).length?`<div class="tc-files">${files.map(f=>`<span class="tc-file"><span class="ic" aria-hidden="true">${/^image\//.test(f.type)?'🖼':/pdf/.test(f.type)?'📄':'📎'}</span><span class="nm"><b>${esc(f.name)}</b><small>${esc(cfSize(f.size))}</small></span>${/^image\//.test(f.type)?`<a class="btn sm" href="/_blob/${esc(f.assetId)}" target="_blank" rel="noopener">Abrir</a>`:''}<button class="btn sm" data-act="cf-dl" data-asset="${esc(f.assetId)}" data-name="${esc(f.name)}">Baixar</button></span>`).join('')}</div>`:''}
function tcRows(ch){const L=tcList(ch);const mm=tcMe();const myR=tcMyRead(ch);let last='',lastA='',lastT=0,newMark=false;
 L.filter(m=>m.enc&&!TC.dec.has(m.id)).forEach(m=>tcDecryptMsg(m).then(()=>tcUpdate()));
 return L.map(m=>{const d=String(m.at).slice(0,10);const t=new Date(m.at);let out='';const b=tcBody(m);
  if(d!==last){out+=`<div class="chat-day"><span>${tcDayL(d)}</span></div>`;last=d;lastA=''}
  if(!newMark&&myR&&m.at>myR&&tcFromOther(m)){newMark=true;out+=`<div class="tc-new"><span>Novas mensagens</span></div>`}
  const mem=byId('members',m.by);const mine=m.by===mm?.id;
  if(m.sys){lastA='';return out+`<div class="msg sys"><span class="sys-ic">${avatar(mem,22)}</span><div class="msg-b"><div class="msg-t">${tcFmt(m)}</div><small>${tcTime(m.at)}${m.link?` · <button class="lnk" data-act="${esc(m.link.act)}" data-id="${esc(m.link.id)}" ${m.link.v?`data-v="${esc(m.link.v)}"`:''}>Abrir</button>`:''}</small></div></div>`}
  const cont=m.by===lastA&&(t-lastT)<5*60000&&(!m.lvl||m.lvl==='normal')&&!b.reply;lastA=m.by;lastT=t;
  const lv=m.lvl&&m.lvl!=='normal'?`<span class="tc-lv ${m.lvl}">${m.lvl==='urgente'?'⚠ ':'! '}${TC_LV[m.lvl]}</span>`:'';
  const menMe=!mine&&tcMentionsMe(b);
  const body=m.del?'<div class="msg-t tc-del">Mensagem apagada</div>':b.decErr?`<div class="msg-t tc-del">${b.decErr==='priv'?'Conversa privada':'Não foi possível abrir esta mensagem neste dispositivo'}</div>`:b.pendingDec?'<div class="msg-t tc-del">Abrindo…</div>':
   `${b.reply?`<button class="tc-quote" data-act="tc-jump" data-id="${esc(b.reply.id)}"><b>${esc(first(b.reply.by))}</b><span>${esc(b.reply.snip)}</span></button>`:''}<div class="msg-t">${tcFmt(m)}</div>${tcFiles(b.files)}`;
  return out+`<div class="msg tc-msg ${cont?'cont':''} ${menMe?'tome':''} ${mine?'mine':''} ${m.lvl==='urgente'?'urg':m.lvl==='atencao'?'att':''}" id="tcm-${esc(m.id)}">${cont?'<span class="msg-av"></span>':`<span class="msg-av">${avatar(mem,32)}</span>`}
   <div class="msg-b">${cont&&!lv?'':`<div class="msg-h"><b>${esc(mine?'Você':mem?.name||'Alguém')}</b><small>${tcTime(m.at)}</small>${lv}${menMe?'<span class="tc-lv men">@ Menção</span>':''}</div>`}${body}${tcStatus(m)}</div>
   ${m.del||m.legacy||b.pendingDec||b.decErr?'':`<span class="tc-acts"><button data-act="tc-reply" data-id="${esc(m.id)}" title="Responder" aria-label="Responder">↩</button><button data-act="tc-copy" data-id="${esc(m.id)}" title="Copiar" aria-label="Copiar texto">⧉</button>${mine&&!m.pend?`<button data-act="tc-del" data-id="${esc(m.id)}" title="Apagar" aria-label="Apagar mensagem">🗑</button>`:''}</span>`}</div>`}).join('')}
function tcSide(){const mm=tcMe();const c=tcConvs();const q=(ui.tcQ||'').trim();const cur=ui.tcCh||'geral';
 const item=(id,label,sub,av,n,flags)=>`<button class="tc-it" data-act="tc-open" data-v="${esc(id)}" aria-current="${id===cur}">${av}<span class="nm"><b>${esc(label)}</b>${sub?`<small>${sub}</small>`:''}</span>${flags}${n?`<span class="badge">${n}</span>`:''}</button>`;
 const fl=id=>{const u=tcUnread(id);const men=u.some(m=>tcMentionsMe(m));const urg=u.some(m=>m.lvl==='urgente');return (urg?'<span class="tc-flag urg" title="Mensagem urgente não lida">Urgente</span>':'')+(men?'<span class="tc-flag men" title="Menção não lida">@</span>':'')};
 if(q)return tcSearch(q);
 const peers=tcActive().filter(m=>m.id!==mm?.id&&!c.dms.some(d=>tcDmPeer(d.id)===m.id));
 return `<div class="tc-sec"><span>Canais</span>${tcCanManage()?'<button class="lnk" data-act="tc-ch-new">+ Novo canal</button>':''}</div>
  ${c.chans.map(x=>item(x.id,'# '+x.name,'','<span class="tc-hash">#</span>',x.id===cur?0:tcUnread(x.id).length,fl(x.id))).join('')}
  <div class="tc-sec"><span>Conversas individuais</span></div>
  ${c.dms.map(x=>{const p=byId('members',tcDmPeer(x.id));const lb=x.last?tcBody(x.last):null;return item(x.id,p?.name||'—',lb?esc((lb.by===mm?.id?'Você: ':'')+String(lb.del?'Mensagem apagada':lb.text||(lb.files?.length?'📎 Arquivo':lb.pendingDec?'…':'')).slice(0,42)):'',avatar(p,28),x.id===cur?0:tcUnread(x.id).length,fl(x.id))}).join('')||'<p class="tc-none">Nenhuma conversa ainda.</p>'}
  ${peers.length?`<label class="tc-new-dm"><span class="acc-sr">Nova conversa com</span><select class="sel" id="tc-dm-new" aria-label="Nova conversa individual"><option value="">+ Nova conversa com…</option>${peers.map(m=>`<option value="${m.id}">${esc(m.name)}${tcAcc(m)?'':' (sem conta vinculada)'}</option>`).join('')}</select></label>`:''}`}
function tcSearch(q){const mm=tcMe();const ql=q.toLowerCase();const men=q.startsWith('@')?tcActive().filter(m=>m.name.toLowerCase().includes(ql.slice(1))).map(m=>m.id):null;
 const c=tcConvs();const all=[...c.chans,...c.dms].flatMap(x=>tcList(x.id).filter(m=>!m.del&&!m.sys).map(m=>({m,b:tcBody(m)})));
 const convHits=[...c.chans.map(x=>({id:x.id,l:'# '+x.name})),...tcActive().filter(m=>m.id!==mm?.id).map(m=>({id:tcDmId(mm?.id,m.id),l:m.name}))].filter(x=>!men&&x.l.toLowerCase().includes(ql)).slice(0,6);
 const hits=all.filter(({m,b})=>men?(b.men||[]).some(x=>men.includes(x.id)):(String(b.text||'').toLowerCase().includes(ql)||(byId('members',m.by)?.name||'').toLowerCase().includes(ql)||(b.files||[]).some(f=>f.name.toLowerCase().includes(ql)))).slice(-40).reverse();
 return `<div class="tc-sec"><span>Resultados para “${esc(q)}”</span><button class="lnk" data-act="tc-q-x">Limpar</button></div>
  ${convHits.map(x=>`<button class="tc-it" data-act="tc-open" data-v="${esc(x.id)}"><span class="tc-hash">${tcIsDm(x.id)?'@':'#'}</span><span class="nm"><b>${esc(x.l)}</b><small>Abrir conversa</small></span></button>`).join('')}
  ${hits.map(({m,b})=>`<button class="tc-it hit" data-act="tc-go" data-v="${esc(m.ch)}" data-id="${esc(m.id)}">${avatar(byId('members',m.by),24)}<span class="nm"><b>${esc(first(m.by))} · ${esc(tcIsDm(m.ch)?'conversa individual':tcChName(m.ch))}</b><small>${esc(String(b.text||b.files?.[0]?.name||'').slice(0,80))} · ${fD(String(m.at).slice(0,10))}</small></span></button>`).join('')||(!convHits.length?'<p class="tc-none">Nada encontrado nas conversas que você acessa.</p>':'')}`}
function tcHead(){const ch=ui.tcCh||'geral';const mm=tcMe();
 if(tcIsDm(ch)){const p=byId('members',tcDmPeer(ch));return `<button class="tc-back" data-act="tc-back" aria-label="Voltar para as conversas">‹</button>${avatar(p,32)}<span class="nm"><b>${esc(p?.name||'—')}</b><small>${esc(p?.area||'')} · 🔒 conversa privada e cifrada: só vocês dois leem</small></span>`}
 const c=tcChannels().find(x=>x.id===ch)||tcChannels()[0];return `<button class="tc-back" data-act="tc-back" aria-label="Voltar para as conversas">‹</button><span class="tc-hash big">#</span><span class="nm"><b>${esc(c.name)}</b><small>${esc(c.desc||'')} · ${tcActive().length} integrantes</small></span>${c.doc&&tcCanManage()?`<button class="btn sm ghost" data-act="tc-ch-edit" data-id="${esc(c.doc.id)}">Editar canal</button>`:''}`}
function tcCompactPicker(){const mm=tcMe();const cur=ui.tcCh||'geral';const convs=tcConvs();
 const channelOptions=convs.chans.map(x=>{const n=tcUnread(x.id).length;return `<option value="${esc(x.id)}" ${x.id===cur?'selected':''}># ${esc(x.name)}${n?' · '+n+' nova'+(n>1?'s':''):''}</option>`}).join('');
 const people=tcActive().filter(m=>m.id!==mm?.id);const dmOptions=people.map(m=>{const id=tcDmId(mm?.id,m.id),n=tcUnread(id).length;return `<option value="${esc(id)}" ${id===cur?'selected':''}>${esc(m.name)}${n?' · '+n+' nova'+(n>1?'s':''):''}</option>`}).join('');
 return `<label class="tc-compact-pick"><span>Conversa</span><select class="sel" id="tc-conv-select" aria-label="Selecionar conversa"><optgroup label="Canais">${channelOptions}</optgroup>${dmOptions?`<optgroup label="Conversas individuais">${dmOptions}</optgroup>`:''}</select></label>`}
function tcComposer(){const ch=ui.tcCh||'geral';const mm=tcMe();if(!mm)return `<p class="cw-ro">${mode==='db'?'Sua conta precisa estar vinculada para conversar.':'O chat funciona quando o Terzo é aberto pelo link compartilhado.'}</p>`;
 if(ui.viewAs)return '<p class="cw-ro">Modo visualização: o chat fica somente leitura.</p>';
 if(tcIsDm(ch)){const p=byId('members',tcDmPeer(ch));const pacc=tcAcc(p);if(!pacc)return `<p class="cw-ro">${esc(p?.name||'Esta pessoa')} ainda não tem conta vinculada ao Terzo.</p>`;if(!TC.keys[pacc])return `<p class="cw-ro">${esc(first(p.id))} ainda não abriu o chat novo. A conversa individual fica disponível depois do primeiro acesso.</p>`;if(!TC.priv)return '<p class="cw-ro">Preparando a proteção da conversa…</p>'}
 const lv=ui.tcLvl||'normal';const rp=ui.tcReply&&ui.tcReply.ch===ch?ui.tcReply:null;const files=ui.tcFiles||[];
 return `<form class="tc-in" id="tc-form">${rp?`<div class="tc-rp"><span>Respondendo a <b>${esc(first(rp.by))}</b>: ${esc(rp.snip)}</span><button type="button" class="x" data-act="tc-reply-x" aria-label="Cancelar resposta">×</button></div>`:''}
  ${files.length?`<div class="tc-up">${files.map((f,i)=>`<span class="tc-chip">📎 ${esc(f.name)} · ${esc(cfSize(f.size))}<button type="button" class="x" data-act="tc-file-x" data-v="${i}" aria-label="Remover anexo">×</button></span>`).join('')}</div>`:''}
  <div class="tc-box"><textarea id="tc-text" rows="1" placeholder="${esc(tcIsDm(ch)?'Mensagem para '+first(tcDmPeer(ch)):'Mensagem em # '+(tcChannels().find(x=>x.id===ch)?.name||'Geral'))}" aria-label="Mensagem" autocomplete="off">${esc(ui.tcDraft?.[ch]||'')}</textarea><div class="tc-pop" id="tc-pop" role="listbox" hidden></div></div>
  <div class="tc-tools"><div class="tc-lvs" role="radiogroup" aria-label="Classificação da mensagem">${Object.entries(TC_LV).filter(([k])=>k!=='urgente'||tcCanUrgent()).map(([k,l])=>`<button type="button" role="radio" aria-checked="${lv===k}" class="tc-lvb ${k}" data-act="tc-lvl" data-v="${k}">${k==='urgente'?'⚠ ':k==='atencao'?'! ':''}${l}</button>`).join('')}</div>
   <button type="button" class="btn sm ghost" data-act="tc-attach">📎 Anexar</button><input type="file" id="tc-file" multiple hidden><span class="spacer"></span><button class="btn primary sm" type="submit">Enviar</button></div>
  <p class="chat-hint">Enter envia · Shift + Enter quebra a linha · @ menciona alguém</p></form>`}
function tcPane(compact){const ch=ui.tcCh||'geral';if(!tcCanSee(ch))ui.tcCh='geral';const u=tcAllUnread();
 return `<div class="tc ${compact?'compact':(ui.tcSideOpen?'side-open':'')}" data-ch="${esc(ui.tcCh||'geral')}">
  ${compact?'':`<aside class="tc-side"><div class="tc-search"><input id="tc-q" type="search" placeholder="Buscar mensagens, pessoas, canais" value="${esc(ui.tcQ||'')}" aria-label="Buscar no chat"></div>
   ${u.men||u.urg?`<button class="tc-notif" data-act="tc-notif">${u.urg?`<span class="tc-lv urgente">${u.urg} urgente${u.urg>1?'s':''}</span>`:''}${u.men?`<span class="tc-lv men">${u.men} menç${u.men>1?'ões':'ão'}</span>`:''}<small>não lidas · ver</small></button>`:''}
   <div class="tc-list" id="tc-list">${tcSide()}</div>
   <div class="tc-sidefoot">${typeof Notification!=='undefined'&&Notification.permission==='default'?'<button class="lnk" data-act="tc-notify-on">Ativar avisos do navegador</button>':typeof Notification!=='undefined'&&Notification.permission==='granted'?'<small>Avisos do navegador ativos</small>':'<small>Avisos do navegador indisponíveis aqui</small>'}${isAdmin()?' · <button class="lnk" data-act="tc-cfg">Configurações</button>':''}</div></aside>`}
  <section class="tc-main"><div class="tc-top ${compact?'tc-top-compact':''}" id="tc-top">${compact?tcCompactPicker():tcHead()}</div>${TC.conn!=='on'?'<div class="tc-conn" role="status">Sem conexão. Tentando reconectar… Mensagens novas aparecem quando a conexão voltar.</div>':''}
   <div class="tc-msgs" id="tc-msgs" aria-live="polite">${tcRows(ui.tcCh||'geral')||'<div class="cw-empty"><b>Nenhuma mensagem ainda</b><p>Escreva a primeira abaixo.</p></div>'}</div>
   <div id="tc-foot">${tcComposer()}</div></section></div>`}
function vChat(){tcSubAll();tcKeysInit();ui.tcCh=ui.tcCh||'geral';return `<div class="head"><div><h1>Chat da equipe</h1><p>Canais abertos à agência e conversas individuais privadas. Use @ para mencionar e marque Atenção ou Urgente quando precisar.</p></div></div>${tcPane(false)}`}

/* atualização parcial: preserva o texto que está sendo digitado */
let tcUpd=0;
function tcUpdate(force){cancelAnimationFrame(tcUpd);tcUpd=requestAnimationFrame(()=>{renderChatBadge();const al=document.getElementById('tc-alert');if(al&&!tcUnread(al.dataset.ch).some(x=>x.id===al.dataset.id))al.remove();const host=document.querySelector('.tc');if(!host)return;const ch=ui.tcCh||'geral';
 if(host.dataset.ch!==ch){tcMount();return}
 const box=$('#tc-msgs');const atB=!box||box.scrollHeight-box.scrollTop-box.clientHeight<80;
 const ae=document.activeElement,list=$('#tc-list');if(list&&!(ae&&ae.id==='tc-q'))list.innerHTML=tcSide();const top=$('#tc-top');if(top)top.innerHTML=host.classList.contains('compact')?tcCompactPicker():tcHead();
 const conn=host.querySelector('.tc-conn');if(TC.conn!=='on'&&!conn)$('#tc-top').insertAdjacentHTML('afterend','<div class="tc-conn" role="status">Sem conexão. Tentando reconectar… Mensagens novas aparecem quando a conexão voltar.</div>');if(TC.conn==='on'&&conn)conn.remove();
 if(box){box.innerHTML=tcRows(ch)||'<div class="cw-empty"><b>Nenhuma mensagem ainda</b><p>Escreva a primeira abaixo.</p></div>';if(atB||tcStick||force){box.scrollTop=box.scrollHeight;tcStick=false}}
 const ft=$('#tc-foot');if(ft&&(force||!$('#tc-text')||ft.dataset.k!==tcFootKey())){ft.innerHTML=tcComposer();ft.dataset.k=tcFootKey()}
 if(atB||force)tcMarkRead(ch)})}
const tcFootKey=()=>[ui.tcCh,ui.tcLvl,(ui.tcFiles||[]).length,ui.tcReply?.id||'',!!TC.priv,Object.keys(TC.keys).length,!!tcMe()].join('|');
function tcMount(){if(ui.view==='chat'){const h=$('#main .tc');if(h){h.outerHTML=tcPane(false);tcAfterMount()}}else if(cwOpen){const p=document.getElementById('cw-panel');if(p){p.innerHTML=`<div class="cw-h"><span class="cw-dot"></span><b>Chat da equipe</b><span style="flex:1"></span><button class="lnk" data-act="tc-full">Abrir em tela cheia</button><button class="x" data-act="cw-toggle" aria-label="Fechar chat">×</button></div>`+tcPane(true);tcAfterMount()}}}
function tcAfterMount(){const box=$('#tc-msgs');if(box){if(ui.tcJump){const el=document.getElementById('tcm-'+ui.tcJump);if(el){el.scrollIntoView({block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1600)}ui.tcJump=''}else box.scrollTop=box.scrollHeight}
 const ft=$('#tc-foot');if(ft)ft.dataset.k=tcFootKey();tcMarkRead(ui.tcCh||'geral');const ta=$('#tc-text');if(ta){tcGrow(ta)}}
function tcGo(ch,id){if(!tcCanSee(ch)){toast('Você não participa desta conversa.');return}ui.tcCh=ch;ui.tcQ='';ui.tcJump=id||'';ui.tcSideOpen=false;if(ui.view==='chat'||!cwOpen){if(ui.view!=='chat'){go('chat');setTimeout(tcAfterMount,60)}else tcMount()}else tcMount()}

/* widget flutuante usa o mesmo chat */
function cwRender(){cwInit();const u=tcAllUnread();const bd=document.getElementById('cw-badge');if(bd){bd.hidden=!u.n;bd.textContent=u.n>99?'99+':u.n;bd.classList.toggle('hot',!!(u.men||u.urg))}
 const wrap=document.getElementById('chatw');if(wrap)wrap.style.display=ui.view==='chat'||document.body.classList.contains('acc-locked')?'none':'';
 const btn=document.getElementById('cw-btn');if(btn){btn.setAttribute('aria-expanded',cwOpen);btn.classList.toggle('on',cwOpen)}
 const pn=document.getElementById('cw-panel');if(!pn)return;pn.hidden=!cwOpen;if(!cwOpen)return;if(!pn.querySelector('.tc'))tcMount();else tcUpdate()}
function cwNotify(){tcUpdate()}
function renderChatBadge(){const u=tcAllUnread();document.querySelectorAll('#nav [data-v="chat"],#mobnav [data-v="chat"]').forEach(b=>{let s=b.querySelector('.badge');if(!u.n){s&&s.remove();return}if(!s){s=document.createElement('span');s.className='badge';b.appendChild(s)}s.textContent=u.n>99?'99+':u.n;s.classList.toggle('hot',!!(u.men||u.urg));s.title=(u.urg?u.urg+' urgente(s) · ':'')+(u.men?u.men+' menção(ões) · ':'')+u.n+' não lida(s)'});cwRender0()}
function cwRender0(){const u=tcAllUnread();const bd=document.getElementById('cw-badge');if(bd){bd.hidden=!u.n;bd.textContent=u.n>99?'99+':u.n;bd.classList.toggle('hot',!!(u.men||u.urg))}}

/* ---------- @ menções: autocompletar ---------- */
function tcGrow(ta){ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,180)+'px'}
function tcMentionQ(ta){const v=ta.value.slice(0,ta.selectionStart);const m=v.match(/(^|\s)@([^\s@]{0,30})$/);return m?{q:m[2],start:ta.selectionStart-m[2].length-1}:null}
function tcPopRender(ta){const pop=$('#tc-pop');if(!pop)return;const mq=tcMentionQ(ta);const ch=ui.tcCh||'geral';if(!mq||tcIsDm(ch)){pop.hidden=true;return}
 const q=mq.q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');const mm=tcMe();
 let L=tcActive().filter(m=>m.id!==mm?.id&&m.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').includes(q)).slice(0,7);
 const all=tcCanManage()&&'todos'.startsWith(q)?[{id:'*',name:'todos',area:'Avisa toda a equipe'}]:[];L=[...all,...L];
 if(!L.length){pop.hidden=true;return}ui.tcPopI=Math.min(ui.tcPopI||0,L.length-1);
 pop.innerHTML=L.map((m,i)=>`<button type="button" role="option" aria-selected="${i===ui.tcPopI}" data-act="tc-men-pick" data-id="${m.id}">${m.id==='*'?'<span class="tc-hash">@</span>':avatar(m,24)}<span class="nm"><b>${esc(m.id==='*'?'@todos':m.name)}</b><small>${esc(m.area||'')}${m.id!=='*'?' · '+esc(ACC_PL[accProfile(m)]):''}</small></span></button>`).join('');pop.hidden=false}
function tcPickMention(id){const ta=$('#tc-text');if(!ta)return;const mq=tcMentionQ(ta);if(!mq)return;const m=id==='*'?{id:'*',name:'todos'}:byId('members',id);if(!m)return;
 const t='@'+m.name;ta.value=ta.value.slice(0,mq.start)+t+' '+ta.value.slice(ta.selectionStart);const pos=mq.start+t.length+1;ta.setSelectionRange(pos,pos);ta.focus();
 ui.tcMen=[...(ui.tcMen||[]),{id:m.id,t}];ui.tcDraft={...(ui.tcDraft||{}),[ui.tcCh||'geral']:ta.value};$('#tc-pop').hidden=true;tcGrow(ta)}

/* ---------- eventos ---------- */
document.addEventListener('input',e=>{const t=e.target;if(t.id==='tc-text'){ui.tcDraft={...(ui.tcDraft||{}),[ui.tcCh||'geral']:t.value};tcGrow(t);ui.tcPopI=0;tcPopRender(t)}
 if(t.id==='tc-q'){ui.tcQ=t.value;clearTimeout(TC.qT);TC.qT=setTimeout(()=>{const l=$('#tc-list');if(l)l.innerHTML=tcSide()},150)}});
document.addEventListener('change',async e=>{const t=e.target;if(t.id==='tc-conv-select'&&t.value){tcGo(t.value);return}if(t.id==='tc-dm-new'&&t.value){const mm=tcMe();tcGo(tcDmId(mm.id,t.value));}
 if(t.id==='tc-file'){const fl=[...(t.files||[])];t.value='';if(!fl.length)return;if(!assets){toast('O envio de arquivos não está disponível nesta visualização.');return}const max=tcCfg().maxMB;const mm=tcMe();
  for(const f of fl){if(f.size>max*1048576){toast(f.name+': acima de '+max+' MB.');continue}try{toast('Enviando '+f.name+'…');const r=await assets.upload(f);ui.tcFiles=[...(ui.tcFiles||[]),{assetId:r.id,name:f.name,type:r.contentType||f.type,size:r.sizeBytes||f.size}]}catch(x){toast(f.name+': formato não aceito aqui (imagens, PDF, vídeo e texto). Para DOCX, XLSX e PPTX, compartilhe um link.')}}
  const ft=$('#tc-foot');if(ft){ft.innerHTML=tcComposer();ft.dataset.k=tcFootKey()}}});
document.addEventListener('keydown',e=>{const t=e.target;if(t.id!=='tc-text')return;const pop=$('#tc-pop');
 if(pop&&!pop.hidden){const n=pop.querySelectorAll('[role=option]').length;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();ui.tcPopI=((ui.tcPopI||0)+(e.key==='ArrowDown'?1:-1)+n)%n;tcPopRender(t);return}
  if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();const b=pop.querySelectorAll('[role=option]')[ui.tcPopI||0];if(b)tcPickMention(b.dataset.id);return}if(e.key==='Escape'){pop.hidden=true;return}}
 if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();tcSend()}},true);
document.addEventListener('submit',e=>{if(e.target.id==='tc-form'){e.preventDefault();tcSend()}},true);
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;if(!a.startsWith('tc-'))return;e.preventDefault();e.stopPropagation();const id=b.dataset.id,v=b.dataset.v;
 try{switch(a){
 case'tc-open':ui.tcCh=v;ui.tcSideOpen=false;ui.tcQ='';tcMount();break;
 case'tc-go':document.getElementById('tc-alert')?.remove();tcGo(v,id);break;
 case'tc-alert-x':document.getElementById('tc-alert')?.remove();break;
 case'tc-back':ui.tcSideOpen=true;document.querySelector('.tc')?.classList.add('side-open');break;
 case'tc-full':cwOpen=false;cwRender();go('chat');break;
 case'tc-q-x':ui.tcQ='';const q=$('#tc-q');if(q)q.value='';$('#tc-list').innerHTML=tcSide();break;
 case'tc-lvl':ui.tcLvl=v;const ft=$('#tc-foot');if(ft){const keep=$('#tc-text')?.value;ft.innerHTML=tcComposer();ft.dataset.k=tcFootKey();const ta=$('#tc-text');if(ta){ta.value=keep||'';ta.focus()}}break;
 case'tc-attach':$('#tc-file')?.click();break;
 case'tc-file-x':ui.tcFiles=(ui.tcFiles||[]).filter((_,i)=>i!==+v);tcUpdate(true);break;
 case'tc-men-pick':tcPickMention(id);break;
 case'tc-reply':{const m=TC.msgs.get(id)||TC.pend.get(id);if(!m)return;const bd=tcBody(m);ui.tcReply={ch:m.ch,id:m.id,by:m.by,snip:String(bd.text||bd.files?.[0]?.name||'').replace(/\s+/g,' ').slice(0,90)};const ft2=$('#tc-foot');const keep=$('#tc-text')?.value;if(ft2){ft2.innerHTML=tcComposer();ft2.dataset.k=tcFootKey()}const ta=$('#tc-text');if(ta){ta.value=keep||'';ta.focus()}break}
 case'tc-reply-x':ui.tcReply=null;tcUpdate(true);break;
 case'tc-copy':{const m=TC.msgs.get(id)||TC.pend.get(id);const bd=m&&tcBody(m);try{await navigator.clipboard.writeText(bd?.text||'');toast('Mensagem copiada')}catch(x){toast('Não foi possível copiar aqui. Selecione o texto e copie.')}break}
 case'tc-jump':{const el=document.getElementById('tcm-'+id);if(el){el.scrollIntoView({block:'center',behavior:'smooth'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1600)}else toast('A mensagem original é mais antiga que o histórico carregado.');break}
 case'tc-del':{const m=TC.msgs.get(id);if(!m||m.acc!==me.id)return;if(!b.classList.contains('armed')){b.classList.add('armed');b.textContent='Confirmar';setTimeout(()=>{if(b.isConnected){b.classList.remove('armed');b.textContent='🗑'}},3000);return}
  const {id:_i,acc:_a,...rest}=m;await db.collection('cm/'+me.id+'/m').doc(id).set({ch:m.ch,at:m.at,by:m.by,lvl:m.lvl||'normal',del:true,delAt:new Date().toISOString()});toast('Mensagem apagada');break}
 case'tc-retry':{const p=TC.pend.get(id);if(p&&p.doc)await tcPush(id,p.doc);break}
 case'tc-readers':{if(!tcCanManage())return;const m=TC.msgs.get(id);if(!m)return;const k=tcKey(m.ch);const rd=tcActive().filter(x=>x.id!==m.by&&tcAcc(x)&&((TC.reads[tcAcc(x)]||{})[k]||'')>=m.at);toast('Vista por: '+rd.map(x=>x.name).join(', '));break}
 case'tc-notif':{const u=tcAllUnread().items.filter(m=>m.lvl==='urgente'||tcMentionsMe(m)).sort((x,y)=>String(x.at).localeCompare(String(y.at)));const m=u[0];if(m)tcGo(m.ch,m.id);break}
 case'tc-notify-on':{try{const r=await Notification.requestPermission();toast(r==='granted'?'Avisos do navegador ativados enquanto o Terzo estiver aberto.':'O navegador não liberou os avisos. O chat continua com os indicadores internos.')}catch(x){toast('Este navegador não permite avisos aqui.')}tcMount();break}
 case'tc-ch-new':case'tc-ch-edit':{if(!tcCanManage()){toast('Só administradores e líderes gerenciam canais.');return}const c=a==='tc-ch-edit'?(S.chat_channels||[]).find(x=>x.id===id):null;
  formModal({title:c?'Editar canal':'Novo canal',values:{name:c?.name||'',desc:c?.desc||''},fields:[{k:'name',l:'Nome do canal',t:'text',req:1,ph:'produção',full:1},{k:'desc',l:'Para que serve',t:'text',ph:'Ex.: andamento das peças do dia',full:1}],
   onDelete:c?async()=>{await put('chat_channels',c.id,{...c,archived:true,archivedAt:new Date().toISOString()});if(ui.tcCh==='c:'+c.id)ui.tcCh='geral';toast('Canal arquivado. O histórico continua guardado.')}:null,delLabel:'Arquivar canal',
   onSave:async v=>{const name=String(v.name||'').trim().replace(/^#\s*/,'').slice(0,40);if(!name){toast('Dê um nome ao canal.');throw new Error('n')}
    if((S.chat_channels||[]).some(x=>!x.archived&&x.id!==c?.id&&x.name.toLowerCase()===name.toLowerCase())||name.toLowerCase().startsWith('geral')){toast('Já existe um canal com esse nome.');throw new Error('d')}
    const nid=c?.id||uid();await put('chat_channels',nid,{...(c||{}),name,desc:String(v.desc||'').trim().slice(0,120),createdBy:c?.createdBy||tcMe()?.id||''});ui.tcCh='c:'+nid;toast(c?'Canal atualizado':'Canal # '+name+' criado');setTimeout(tcMount,50)}});break}
 case'tc-cfg':{if(!isAdmin())return;const cfg=tcCfg();const wk=new Date(Date.now()-7*864e5).toISOString();const cnt=[...TC.msgs.values()].filter(m=>m.at>=wk&&!m.sys);
  formModal({title:'Configurações do chat',values:{maxMB:String(cfg.maxMB),designerUrgent:cfg.designerUrgent?'sim':'nao'},fields:[{k:'maxMB',l:'Tamanho máximo de anexo (MB)',t:'select',o:['5','10','20'].map(x=>({v:x,l:x+' MB'}))},{k:'designerUrgent',l:'Designers podem marcar Urgente',t:'select',o:[{v:'nao',l:'Não (só administradores e líderes)'},{v:'sim',l:'Sim'}],full:1,hint:`Uso nos últimos 7 dias: ${cnt.filter(m=>!tcIsDm(m.ch)).length} mensagens nos canais · ${new Set(cnt.filter(m=>tcIsDm(m.ch)).map(m=>m.ch)).size} conversas individuais ativas. O conteúdo das conversas individuais é cifrado e não é lido pela administração.`}],
   onSave:async v=>{await put('chat_cfg','main',{maxMB:+v.maxMB||20,designerUrgent:v.designerUrgent==='sim'});toast('Configurações salvas')}});break}
 }}catch(err){console.error(err);toast('Não foi possível concluir.')}},true);
/* menção antiga do widget e atalhos de abrir conversa a partir de outras telas */
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="cw-toggle"]');if(b){setTimeout(()=>{if(cwOpen){tcSubAll();tcKeysInit();tcMount()}},0)}},false);

/* ---------- ciclo de vida ---------- */
let tcAfterT=0;
function tcAfter(){if(mode!=='db'||!me.id)return;tcSubAll();tcKeysInit();if(ui.view==='chat'){const h=$('#main .tc');if(h&&!h.dataset.mounted){h.dataset.mounted='1';tcAfterMount()}}renderChatBadge();cwRender()}

(()=>{const st=document.createElement('style');st.textContent=`
.tc{display:grid;grid-template-columns:280px 1fr;height:calc(100dvh - 190px);min-height:460px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--surface)}
.tc-side{display:flex;flex-direction:column;border-right:1px solid var(--line);min-height:0;background:var(--surface-2,var(--bg))}
.tc-search{padding:10px}.tc-search input{width:100%}
.tc-list{flex:1;overflow:auto;padding:0 6px 10px;display:flex;flex-direction:column;gap:2px}
.tc-sec{display:flex;justify-content:space-between;align-items:center;padding:12px 8px 4px;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:700}
.tc-it{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:0;background:none;padding:7px 8px;border-radius:9px;color:var(--ink);min-width:0}
.tc-it:hover{background:var(--surface)}.tc-it[aria-current="true"]{background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,.08)}
.tc-it .nm{flex:1;min-width:0;display:flex;flex-direction:column}.tc-it .nm b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tc-it .nm small{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tc-it .badge{position:static}
.tc-hash{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:8px;background:var(--surface);border:1px solid var(--line);font-weight:700;color:var(--muted);flex:none}.tc-hash.big{width:32px;height:32px}
.tc-flag{font-size:10.5px;font-weight:800;padding:2px 6px;border-radius:6px;letter-spacing:.03em}.tc-flag.urg{background:var(--crit);color:#fff}.tc-flag.men{background:#1d4ed8;color:#fff}
.tc-none{font-size:13px;color:var(--muted);padding:6px 8px;margin:0}
.tc-new-dm{padding:8px}.tc-new-dm .sel{width:100%}
.tc-notif{margin:0 10px 6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:8px 10px;text-align:left}.tc-notif small{color:var(--muted)}
.tc-sidefoot{padding:8px 12px;border-top:1px solid var(--line);font-size:12.5px;color:var(--muted)}
.tc-main{display:flex;flex-direction:column;min-width:0;min-height:0}
.tc-top{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--line)}.tc-top .nm{flex:1;min-width:0;display:flex;flex-direction:column}.tc-top .nm small{color:var(--muted);font-size:12.5px}
.tc-back{display:none;border:0;background:none;font-size:26px;line-height:1;padding:0 6px;color:var(--ink)}
.tc-conn{padding:8px 16px;background:color-mix(in srgb,var(--warn,#c98a00) 14%,var(--surface));font-size:13px}
.tc-msgs{flex:1;overflow:auto;padding:12px 16px;display:flex;flex-direction:column;gap:2px}
.tc-msg{position:relative}.tc-msg .msg-b{min-width:0}
.tc-msg.urg{background:color-mix(in srgb,var(--crit) 7%,transparent);border-left:3px solid var(--crit);border-radius:8px;padding-left:6px}
.tc-msg.att{border-left:3px solid var(--warn,#c98a00);border-radius:8px;padding-left:6px}
.tc-msg.flash{outline:2px solid #1d4ed8;outline-offset:2px;border-radius:8px}
.tc-lv{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:2px 6px;border-radius:6px;margin-left:6px;border:1px solid currentColor}
.tc-lv.urgente{color:var(--crit)}.tc-lv.atencao{color:#9a6700}.tc-lv.men{color:#1d4ed8}
.tc-men{background:#1d4ed81a;color:#1d4ed8;font-weight:600;border-radius:5px;padding:0 3px}.tc-men.me{background:#1d4ed8;color:#fff}
.tc-st{display:block;font-size:11.5px;color:var(--muted);margin-top:2px}.tc-st.ok{color:var(--ok)}.tc-st.bad{color:var(--crit)}.tc-st .lnk{font-size:11.5px}
.tc-del{color:var(--muted);font-style:italic}
.tc-quote{display:flex;flex-direction:column;align-items:flex-start;gap:1px;border:0;border-left:3px solid var(--line);background:var(--surface-2,var(--bg));padding:4px 8px;border-radius:6px;margin:2px 0 4px;text-align:left;max-width:100%;font-size:12.5px;color:var(--muted)}.tc-quote b{color:var(--ink);font-size:12px}
.tc-acts{position:absolute;right:6px;top:-6px;display:none;gap:2px;background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:2px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.tc-msg:hover .tc-acts,.tc-msg:focus-within .tc-acts{display:flex}.tc-acts button{border:0;background:none;padding:4px 7px;border-radius:6px;font-size:13px}.tc-acts button:hover{background:var(--surface-2,var(--bg))}.tc-acts .armed{background:var(--crit);color:#fff}
.tc-new{display:flex;align-items:center;gap:8px;margin:8px 0;color:var(--crit);font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}.tc-new::before,.tc-new::after{content:"";flex:1;height:1px;background:var(--crit);opacity:.5}
.tc-files{display:flex;flex-direction:column;gap:6px;margin-top:6px}.tc-file{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;padding:6px 8px;max-width:420px}.tc-file .nm{flex:1;min-width:0;display:flex;flex-direction:column}.tc-file .nm b{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tc-file .nm small{font-size:11.5px;color:var(--muted)}
#tc-foot{border-top:1px solid var(--line);padding:10px 12px}
.tc-in{display:flex;flex-direction:column;gap:8px}.tc-box{position:relative}.tc-box textarea{width:100%;resize:none;min-height:42px;max-height:180px}
.tc-pop{position:absolute;left:0;bottom:calc(100% + 6px);width:min(340px,100%);background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 14px 34px rgba(0,0,0,.16);padding:4px;z-index:20}
.tc-pop button{display:flex;gap:8px;align-items:center;width:100%;border:0;background:none;padding:6px 8px;border-radius:8px;text-align:left}.tc-pop button[aria-selected="true"]{background:var(--surface-2,var(--bg))}.tc-pop .nm{display:flex;flex-direction:column}.tc-pop small{color:var(--muted);font-size:12px}
.tc-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.tc-lvs{display:inline-flex;gap:2px;padding:2px;border:1px solid var(--line);border-radius:9px}.tc-lvb{border:0;background:none;padding:4px 10px;border-radius:7px;font-size:12.5px;font-weight:600;color:var(--muted)}
.tc-lvb[aria-checked="true"]{background:var(--surface-2,var(--bg));color:var(--ink)}.tc-lvb.urgente[aria-checked="true"]{background:var(--crit);color:#fff}.tc-lvb.atencao[aria-checked="true"]{background:#fff3c4;color:#6b4a00}
.tc-rp{display:flex;align-items:center;gap:8px;justify-content:space-between;font-size:13px;background:var(--surface-2,var(--bg));border-left:3px solid #1d4ed8;border-radius:6px;padding:4px 8px}
.tc-up{display:flex;flex-wrap:wrap;gap:6px}.tc-chip{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;border:1px solid var(--line);border-radius:8px;padding:2px 2px 2px 8px}
.badge.hot,.cw-badge.hot{background:var(--crit)!important;box-shadow:0 0 0 2px #fff,0 0 0 4px var(--crit)}
#tc-alert{position:fixed;top:14px;right:14px;z-index:9500;display:flex;align-items:center;gap:10px;max-width:min(440px,calc(100vw - 28px));background:var(--surface);border:2px solid var(--crit);border-radius:12px;padding:10px 12px;box-shadow:0 18px 40px rgba(0,0,0,.2);font-size:13.5px}
#cw-panel{width:min(440px,calc(100vw - 24px));height:min(520px,calc(100dvh - 130px));max-height:calc(100dvh - 110px)}
#cw-panel .tc{height:100%;min-height:0;border:0;border-radius:0;grid-template-columns:1fr}
#cw-panel .tc.compact .tc-side{display:none}#cw-panel .tc.compact .tc-main{display:flex}
.tc-compact-pick{display:flex;align-items:center;gap:10px;width:100%;min-width:0}.tc-compact-pick>span{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);flex:none}.tc-compact-pick .sel{flex:1;min-width:0;font-size:13px;font-weight:600;padding:7px 30px 7px 9px}
#cw-panel .tc-top-compact{padding:9px 12px;background:var(--surface-2,var(--bg))}
#cw-panel .tc-msgs{padding:10px 12px}
#cw-panel #tc-foot{padding:8px 10px}
#cw-panel .tc-in{gap:6px}#cw-panel .tc-box textarea{max-height:110px;font-size:13.5px}
#cw-panel .tc-tools{gap:5px}#cw-panel .tc-lvb{padding:4px 7px;font-size:11.5px}#cw-panel .btn.sm{padding:5px 8px;font-size:12px}
#cw-panel .chat-hint{display:none}
@media (max-width:820px){.tc{grid-template-columns:1fr;height:calc(100dvh - 210px)}.tc .tc-side{display:none}.tc.side-open .tc-side{display:flex}.tc.side-open .tc-main{display:none}.tc .tc-back{display:block}}
`;(document.body||document.head).appendChild(st)})();
