/* Terzo 23/11: extends the active operations task form without replacing historical task data. */
const task23BaseFormModal=formModal;
const task23Editors=()=>S.members.filter(m=>!m.disabled&&(String(m.area||'').toLowerCase().includes('audiovisual')||/otávio|leonardo|bruno/i.test(m.name||''))).sort((a,b)=>a.name.localeCompare(b.name,'pt'));
function task23Workdays(value,n){const d=new Date(value+'T12:00:00');for(let i=0;i<n;){d.setDate(d.getDate()+1);if(d.getDay()!==0&&d.getDay()!==6)i++}return [d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-')}
function task23Sync(mode){
 const client=byId('clients',document.getElementById('f_clientId')?.value);
 const designer=document.getElementById('f_designerId'),editor=document.getElementById('f_videoEditorId'),secondary=document.getElementById('f_editor2Id'),route=document.getElementById('f_execFor'),assignee=document.getElementById('f_assigneeId');
 if(!designer||!editor||!secondary||!route||!assignee)return;
 if(mode==='client'){
  designer.value=client?.designerId||'';editor.value=client?.videoEditorId||'';secondary.value='';
  route.dataset.selected='';
 }
 for(const option of secondary.options)option.disabled=!!option.value&&option.value===editor.value;
 if(secondary.value===editor.value)secondary.value='';
 const original=route.dataset.selected||'';
 const options=[['','Escolha para quem encaminhar'],['designer',designer.value?'Designer · '+mName(designer.value):'Designer · responsável não definido'],['editor',editor.value?'Editor principal · '+mName(editor.value):'Editor principal · responsável não definido'],['editor2',secondary.value?'Editor secundário · '+mName(secondary.value):'Editor secundário · não escolhido'],['outro','Outro profissional']];
 route.innerHTML=options.map(([id,label])=>'<option value="'+esc(id)+'" '+(id&&id!=='outro'&&!(id==='designer'?designer.value:id==='editor'?editor.value:secondary.value)?'disabled':'')+'>'+esc(label)+'</option>').join('');
 route.value=original;route.dataset.selected=route.value;
 const other=route.value==='outro';assignee.closest('.fld').hidden=!other;
 if(!other)assignee.value=({designer:designer.value,editor:editor.value,editor2:secondary.value})[route.value]||'';
 const hint=document.getElementById('task23-hint');if(hint)hint.textContent=client?'Sugestões da carteira. Alterações aqui valem apenas para esta tarefa.':'Nenhum / interno: escolha o profissional responsável.';
 const owner=document.getElementById('f_saveEditorOwner');if(owner)owner.closest('.fld').hidden=!(isAdmin()&&client&&editor.value!==(client.videoEditorId||''));
}
function team23AllPeople(existing){return S.members.filter(m=>!m.disabled).sort((a,b)=>a.name.localeCompare(b.name,'pt')).map(m=>({v:m.id,l:m.name+' · '+(m.area||'Equipe')}))}
// Substitui chips de participantes por uma lista pesquisável com seleção múltipla.
const task23OldField=fld,task23OldRead=readForm;
fld=function(field,value){
 if(field.t!=='multipeople')return task23OldField(field,value);
 return '<fieldset class="fld full task23-people"><legend>'+esc(field.l)+'</legend><input type="search" aria-label="Buscar integrantes" placeholder="Buscar integrante..." data-task23-search><div id="f_'+esc(field.k)+'" role="group" aria-label="Participantes">'+field.o.map(opt=>'<label><input type="checkbox" value="'+esc(opt.v)+'" '+((value||[]).includes(opt.v)?'checked':'')+'> '+esc(opt.l)+'</label>').join('')+'</div></fieldset>';
};
readForm=function(fields){
 const result=task23OldRead(fields.filter(field=>field.t!=='multipeople'));
 for(const field of fields.filter(field=>field.t==='multipeople'))result[field.k]=[...document.querySelectorAll('#f_'+field.k+' input[type="checkbox"]:checked')].map(el=>el.value);
 return result;
};
formModal=function(cfg){
 if(!cfg.fields?.some(f=>f.k==='svcCat')||!cfg.fields.some(f=>f.k==='assigneeIds'))return task23BaseFormModal(cfg);
 const orig=cfg.onSave,values=cfg.values||{},fields=cfg.fields.filter(f=>!['requester','nivel'].includes(f.k)).map(f=>f.k==='assigneeId'?{...f,l:'Outro profissional',req:false}:f.k==='assigneeIds'?{...f,t:'multipeople',o:team23AllPeople(f.o)}:f);
 const ci=fields.findIndex(f=>f.k==='clientId');
 const cl=byId('clients',values.clientId);
 fields.splice(ci+1,0,
  {k:'designerId',l:'Designer responsável',t:'select',o:memberCapOpts(),empty:'Responsável não definido para este cliente.'},
  {k:'videoEditorId',l:'Editor de vídeo principal',t:'select',o:task23Editors().map(m=>({v:m.id,l:m.name})),empty:'Responsável não definido para este cliente.'},
  {k:'editor2Id',l:'Editor de vídeo secundário (opcional)',t:'select',o:task23Editors().map(m=>({v:m.id,l:m.name})),empty:'Selecionar editor opcional'},
  {k:'execFor',l:'Encaminhar tarefa para',t:'select',o:[],empty:'Selecione o encaminhamento',req:1}
 );
 const as=fields.findIndex(f=>f.k==='assigneeId');fields.splice(as,1);fields.splice(ci+5,0,{k:'assigneeId',l:'Outro profissional',t:'select',o:memberCapOpts(),empty:'Escolha o profissional'});
 if(isAdmin())fields.push({k:'saveEditorOwner',l:'Carteira do cliente',t:'chips',o:[{v:'sim',l:'Salvar como editor principal deste cliente'}],full:1,hint:'Desmarcado por padrão. Só altera a carteira com sua autorização.'});
 const due=fields.find(f=>f.k==='due');if(due)due.req=false;
 const urg=fields.find(f=>f.k==='urg');if(urg)urg.l='Urgente?';
 const initial={...values,designerId:values.designerId||cl?.designerId||'',videoEditorId:values.videoEditorId||cl?.videoEditorId||'',editor2Id:values.editor2Id||'',execFor:values.execFor||'outro',saveEditorOwner:[]};
 cfg={...cfg,fields,values:initial,onSave:async v=>{
  const map={designer:v.designerId,editor:v.videoEditorId,editor2:v.editor2Id,outro:v.assigneeId};
  v.assigneeId=map[v.execFor]||'';
  if(!v.assigneeId||!byId('members',v.assigneeId)||byId('members',v.assigneeId).disabled){toast('Escolha um executor ativo.');throw new Error('executor')}
  if(v.editor2Id&&v.editor2Id===v.videoEditorId){toast('Editor secundário deve ser diferente do principal.');throw new Error('editor2')}
  if((v.urg||[]).includes('sim')&&!v.due){toast('Tarefa urgente exige um prazo.');throw new Error('due')}
  if((v.saveEditorOwner||[]).includes('sim')&&isAdmin()&&v.clientId){
   const c=byId('clients',v.clientId);
   if(c&&c.videoEditorId!==v.videoEditorId)await put('clients',c.id,{...c,videoEditorId:v.videoEditorId});
  }
  delete v.saveEditorOwner;
  if(!values.openedAt)v.createdBy=me.id||'';
  if(values.openedAt&&(values.assigneeId!==v.assigneeId||values.due!==v.due)){
   v.history=[...(values.history||[]),{at:new Date().toISOString(),by:me.id||'',s:values.status||'Aberto',note:'Executor '+mName(values.assigneeId)+' → '+mName(v.assigneeId)+'; prazo '+(values.due||'—')+' → '+(v.due||'—')}].slice(-30);
  }
  await orig(v);
  if(!values.openedAt)toast('Tarefa criada e encaminhada a '+mName(v.assigneeId));
 }};
 task23BaseFormModal(cfg);
 const f=document.getElementById('mform');if(!f)return;
 f.classList.add('task23-modal');
 const client=document.getElementById('f_clientId'),designer=document.getElementById('f_designerId'),editor=document.getElementById('f_videoEditorId'),secondary=document.getElementById('f_editor2Id'),route=document.getElementById('f_execFor');
 if(client){client.closest('.fld').insertAdjacentHTML('beforeend','<small id="task23-hint">Sugestões da carteira do cliente.</small>');client.addEventListener('change',()=>task23Sync('client'))}
 route.dataset.selected=initial.execFor;
 for(const el of [designer,editor,secondary,route])el?.addEventListener('change',()=>{if(el===route)route.dataset.selected=route.value;task23Sync('selection')});
 const kind=document.getElementById('f_categoria');kind?.addEventListener('change',()=>{if(!route.dataset.selected||route.dataset.selected==='outro'){route.dataset.selected=/vídeo|video|reels|audiovisual/i.test(kind.value)?'editor':/arte|design|imagem/i.test(kind.value)?'designer':route.dataset.selected;task23Sync('selection')}});
 task23Sync('selection');
 const fold=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 f.querySelectorAll('[data-task23-search]').forEach(search=>search.addEventListener('input',()=>{const q=fold(search.value);search.closest('.task23-people').querySelectorAll('label').forEach(label=>{label.hidden=!fold(label.textContent).includes(q)})}));
 f.querySelectorAll('select').forEach(select=>{
   if(select.options.length<=7||select.id==='f_execFor')return;
   const search=document.createElement('input');search.type='search';search.placeholder='Buscar nome (sem acentos)...';search.setAttribute('aria-label','Buscar opções de '+(select.closest('.fld')?.querySelector('span')?.textContent||select.name));
   select.before(search);search.addEventListener('input',()=>{const q=fold(search.value);for(const opt of select.options)opt.hidden=!!q&&!fold(opt.textContent).includes(q)});
 });
 const urgent=document.getElementById('f_urg');urgent?.addEventListener('click',()=>setTimeout(()=>{if(urgent.querySelector('[aria-pressed="true"]')){const el=document.getElementById('f_due');if(el&&!el.dataset.urgentSuggested){el.value=task23Workdays(today(),2);el.dataset.urgentSuggested='1';toast('Prazo sugerido: '+fD(el.value))}}},0));
};
(()=>{const st=document.createElement('style');st.textContent='#modal:has(.task23-modal){width:min(900px,calc(100vw - 28px));max-width:900px}.task23-modal .fgrid{grid-template-columns:repeat(2,minmax(0,1fr))}.task23-modal .fld{min-width:0}.task23-people>div{max-height:170px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px}.task23-people>div label{display:block;padding:5px}.task23-people>div label[hidden]{display:none}.task23-people input[type=search],.task23-modal .fld>input[type=search]{width:100%;margin:6px 0;padding:8px;border:1px solid var(--line);border-radius:8px}@media(max-width:680px){#modal:has(.task23-modal){width:calc(100vw - 18px)}.task23-modal .fgrid{grid-template-columns:1fr}}';document.head.appendChild(st)})();
