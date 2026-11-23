/* Presença complementa o Next Time e utiliza exclusivamente horários da API. */
const presence23Labels={online:'Online',meeting:'Reunião',visit:'Visita ao cliente',capture:'Captação',lunch:'Almoço',other:'Outra pausa',ended:'Expediente encerrado'};
let presence23State=null,presence23Opened=false;
const presence23Clock=date=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(new Date(date));
const presence23Min=minutes=>{const n=Math.max(0,Math.round(minutes||0));return Math.floor(n/60)+'h'+String(n%60).padStart(2,'0')};
const presence23Req=async(url,options={})=>{const res=await fetch(url,{credentials:'same-origin',...options});if(!res.ok)throw new Error('presence_http_'+res.status);return res.json()};
function presence23Button(){
 const wrap=document.getElementById('presence23-wrap');if(!wrap)return;
 wrap.hidden=!me?.id;
 if(!me?.id)return;
 const button=document.getElementById('presence23-button'),c=presence23State?.current;
 const status=c?.status||'ended',label=presence23Labels[status]||'Indisponível';
 let suffix='';
 if(c?.since&&status!=='online'&&status!=='ended'){
  const elapsed=Math.max(0,Math.floor((Date.now()-new Date(c.since).getTime())/60000));
  if(status==='lunch'){const left=(presence23State?.lunchMinutes||60)-elapsed;suffix=left>=0?' · faltam '+presence23Min(left):' · '+presence23Min(-left)+' de atraso'}
  else suffix=' · há '+presence23Min(elapsed);
 }
 button.textContent='● '+label+suffix;
 button.className='presence23-button '+status+(status==='lunch'&&suffix.includes('atraso')?' overdue':'');
 const menu=document.getElementById('presence23-menu');
 if(menu&&presence23Opened){
  menu.innerHTML='<b>HOJE · '+presence23Min(presence23State?.today?.workedMinutes)+' trabalhadas</b>'+
  '<small>Status atual: '+esc(label)+'</small>'+
  ['online','meeting','visit','capture','lunch','other','ended'].map(id=>'<button type="button" data-presence23-set="'+id+'">'+(id==='ended'?'Encerrar expediente':id==='online'?'Voltar ao trabalho':presence23Labels[id])+'</button>').join('')+
  ((isAdmin()||isLeader())?'<button type="button" data-presence23-panel="1">Abrir painel de presença</button>':'');
 }
}
async function presence23Refresh(){if(!me?.id)return;try{presence23State=await presence23Req('/api/presence/me');presence23Button()}catch(e){document.getElementById('presence23-wrap')?.setAttribute('hidden','')}}
function presence23Timeline(line){
 const start=7*60,end=20*60,colors={online:'#22966a',meeting:'#3578cf',visit:'#8556c5',capture:'#ad7a16',lunch:'#129f9b',other:'#a4a4a4'};
 const inMinutes=instant=>{const x=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(instant)).split(':').map(Number);return x[0]*60+x[1]};
 return '<div class="presence23-timeline">'+(line||[]).filter(e=>e.status!=='ended').map(e=>{const a=Math.max(start,inMinutes(e.from)),b=Math.min(end,inMinutes(e.to));return b>a?'<i title="'+esc(presence23Labels[e.status]||e.status)+'" style="left:'+((a-start)/(end-start)*100).toFixed(2)+'%;width:'+((b-a)/(end-start)*100).toFixed(2)+'%;background:'+(colors[e.status]||'#888')+'"></i>':''}).join('')+'</div>';
}
async function presence23Panel(days=1){
 try{
  const [today,period]=await Promise.all([presence23Req('/api/presence/team?days=1'),days===1?presence23Req('/api/presence/team?days=1'):presence23Req('/api/presence/team?days='+days)]);
  const counts=today.summary;
  const periodMap=new Map(period.people.map(p=>[p.userId,p]));
  const card=(label,value,small)=>'<div class="presence23-card"><small>'+label+'</small><b>'+value+'</b><small>'+small+'</small></div>';
  openModal('<div class="mh"><h2>Presença e horas</h2><button class="x" data-act="close" aria-label="Fechar">×</button></div><div class="mb presence23-panel">'+
  '<p>Complementa o ponto do Next Time; não o substitui.</p>'+
  '<div class="presence23-stats">'+card('Online agora',counts.online,'integrantes')+card('Em pausa',counts.paused,'motivos registrados')+card('Almoço estourado',counts.lunchLate,'acima de '+today.lunchMinutes+' min')+card('Saldo negativo do período','−'+presence23Min(period.summary.negativeMinutes),'almoço excedente')+'</div>'+
  '<div class="presence23-period"><b>Horas por pessoa</b> '+[[1,'Hoje'],[7,'Semana'],[30,'30 dias']].map(([n,l])=>'<button class="btn sm" data-presence23-days="'+n+'" '+(days===n?'aria-pressed="true"':'')+'>'+l+'</button>').join('')+'</div>'+
  '<div class="presence23-list"><div class="presence23-row presence23-head"><b>Pessoa</b><b>Status</b><b>Horas</b><b>Linha de hoje (7h–20h)</b></div>'+
  today.people.map(p=>{const total=periodMap.get(p.userId)||p;return '<div class="presence23-row"><b>'+esc(p.name)+'</b><span>'+esc(presence23Labels[p.status]||'Fora')+(p.status==='lunch'&&p.lunchOverMinutes?' · atraso':'')+'</span><b>'+presence23Min(total.workedMinutes)+'</b>'+presence23Timeline(p.line)+'</div>'}).join('')+
  '</div><p class="presence23-foot">Trabalhado: online, reunião, visita e captação. Almoço excedente é saldo negativo. Eventos usam horário do servidor em America/Sao_Paulo.</p></div>');
 }catch(e){toast('Não foi possível carregar o painel de presença.')}
}
const presence23Bar=document.querySelector('.topbar');
if(presence23Bar){
 const wrap=document.createElement('div');wrap.id='presence23-wrap';wrap.className='presence23-wrap';wrap.hidden=true;
 wrap.innerHTML='<button type="button" id="presence23-button" class="presence23-button" aria-haspopup="true" aria-expanded="false">● Online</button><div id="presence23-menu" class="presence23-menu" hidden></div>';
 presence23Bar.querySelector('.account-menu-wrap')?.before(wrap);
}
document.addEventListener('click',async e=>{
 const button=e.target.closest('#presence23-button');
 if(button){e.preventDefault();e.stopImmediatePropagation();presence23Opened=!presence23Opened;document.getElementById('presence23-menu').hidden=!presence23Opened;button.setAttribute('aria-expanded',String(presence23Opened));presence23Button();return}
 const choice=e.target.closest('[data-presence23-set]');if(choice){
  e.preventDefault();e.stopImmediatePropagation();const status=choice.dataset.presence23Set;let reason='';
  if(status==='other'){const answer=prompt('Qual o motivo desta pausa?');if(!answer?.trim())return;reason=answer.trim()}
  try{presence23State.current=(await presence23Req('/api/presence/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,reason})})).current;presence23Opened=false;document.getElementById('presence23-menu').hidden=true;await presence23Refresh()}catch(err){toast('Não foi possível atualizar o status.')}return
 }
 const panel=e.target.closest('[data-presence23-panel]');if(panel){e.preventDefault();e.stopImmediatePropagation();presence23Opened=false;document.getElementById('presence23-menu').hidden=true;presence23Panel(1);return}
 const period=e.target.closest('[data-presence23-days]');if(period){e.preventDefault();e.stopImmediatePropagation();presence23Panel(+period.dataset.presence23Days);return}
 if(presence23Opened&&!e.target.closest('#presence23-wrap')){presence23Opened=false;const menu=document.getElementById('presence23-menu');if(menu)menu.hidden=true}
},true);
setInterval(()=>{if(me?.id)presence23Refresh()},30000);
setTimeout(()=>presence23Refresh(),1500);
(()=>{const style=document.createElement('style');style.textContent=`
.presence23-wrap{position:relative;flex:none}.presence23-button{border:1px solid #439e78;background:#f0fbf5;color:#17603f;border-radius:100px;padding:9px 15px;font-size:12px;font-weight:800;white-space:nowrap}.presence23-button.lunch{background:#e8fbf9;color:#007b79;border-color:#2ab9aa}.presence23-button.overdue{background:#fff0ec;color:#bd3c16;border-color:#e79070}.presence23-button.ended{background:#f4f4f4;color:#555;border-color:#ccc}.presence23-menu{position:absolute;z-index:100;right:0;top:calc(100% + 8px);width:250px;padding:12px;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:0 20px 44px #0002}.presence23-menu>b,.presence23-menu>small{display:block;margin:4px 6px}.presence23-menu>small{color:var(--muted)}.presence23-menu button{display:block;width:100%;padding:9px;border:0;text-align:left;background:transparent;border-radius:6px;font-size:13px}.presence23-menu button:hover{background:var(--surface-2)}.presence23-panel{min-width:0}.presence23-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.presence23-card{border:1px solid var(--line);border-radius:12px;padding:12px}.presence23-card>*{display:block}.presence23-card b{font-size:24px}.presence23-card small{font-size:11px;color:var(--muted)}.presence23-period{display:flex;gap:8px;align-items:center;margin:20px 0}.presence23-list{overflow-x:auto}.presence23-row{display:grid;grid-template-columns:150px 130px 75px minmax(200px,1fr);gap:12px;align-items:center;padding:10px;border-top:1px solid var(--line);font-size:13px}.presence23-head{font-size:11px;color:var(--muted);text-transform:uppercase}.presence23-timeline{height:16px;border-radius:20px;background:var(--surface-2);position:relative;overflow:hidden}.presence23-timeline i{position:absolute;top:0;bottom:0}.presence23-foot{font-size:12px;color:var(--muted);margin-top:10px}@media(max-width:650px){.presence23-stats{grid-template-columns:repeat(2,1fr)}.presence23-button{padding:7px 9px;font-size:11px}.presence23-menu{position:fixed;right:8px;top:65px}.presence23-row{min-width:600px}}
`;document.head.appendChild(style)})();
