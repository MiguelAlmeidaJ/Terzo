/* Terzo 23/11: extends the active operations task form without replacing historical task data. */
const task23BaseFormModal=formModal;
const task23DesignerId=client=>{
 if(!client)return '';
 const id=typeof relDesigner==='function'?relDesigner(client):client.designerId||'';
 const member=id&&byId('members',id);
 return member&&!member.disabled?id:'';
};
const task23Editors=()=>S.members.filter(m=>!m.disabled&&(String(m.area||'').toLowerCase().includes('audiovisual')||/otávio|leonardo|bruno/i.test(m.name||''))).sort((a,b)=>a.name.localeCompare(b.name,'pt'));
function task23Workdays(value,n){const d=new Date(value+'T12:00:00');for(let i=0;i<n;){d.setDate(d.getDate()+1);if(d.getDay()!==0&&d.getDay()!==6)i++}return [d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-')}
function task23Sync(mode){
 const client=byId('clients',document.getElementById('f_clientId')?.value);
 const designer=document.getElementById('f_designerId'),editor=document.getElementById('f_videoEditorId'),secondary=document.getElementById('f_editor2Id'),route=document.getElementById('f_execFor'),assignee=document.getElementById('f_assigneeId');
 if(!designer||!editor||!secondary||!route||!assignee)return;
 if(mode==='client'){
  designer.value=task23DesignerId(client);editor.value=client?.videoEditorId||'';secondary.value='';
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
 const designerHint=document.getElementById('task23-designer-hint');
 if(designerHint){
  const fallback=client&&!client.designerId&&task23DesignerId(client);
  designerHint.textContent=designer.value?(fallback?'Responsável identificado pela carteira existente.':'Responsável sugerido pela carteira do cliente.'):'Cliente sem designer vinculado. Selecione manualmente para esta tarefa.';
 }
 const owner=document.getElementById('f_saveEditorOwner');if(owner)owner.closest('.fld').hidden=!(isAdmin()&&client&&editor.value!==(client.videoEditorId||''));
}
formModal=function(cfg){
 if(!cfg.fields?.some(f=>f.k==='svcCat')||!cfg.fields.some(f=>f.k==='assigneeIds'))return task23BaseFormModal(cfg);
 const orig=cfg.onSave,values=cfg.values||{},fields=cfg.fields.filter(f=>!['requester','nivel','assigneeIds'].includes(f.k)).map(f=>f.k==='assigneeId'?{...f,l:'Outro profissional',req:false}:f);
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
 // Ordem do protótipo: cliente e carteira primeiro, depois execução, prazo e informações.
 const sectionOrder=['clientId','designerId','videoEditorId','editor2Id','execFor','assigneeId','categoria','prioridade','urg','due','dueTime','svcCat','svcTitle','title','desc'];
 fields.sort((a,b)=>{
  const ia=sectionOrder.indexOf(a.k),ib=sectionOrder.indexOf(b.k);
  return (ia<0?sectionOrder.length:ia)-(ib<0?sectionOrder.length:ib);
 });
 const clientField=fields.find(f=>f.k==='clientId');if(clientField)clientField.full=1;
 const due=fields.find(f=>f.k==='due');if(due)due.req=false;
 const urg=fields.find(f=>f.k==='urg');if(urg)urg.l='Urgente?';
 const initial={...values,designerId:values.designerId||task23DesignerId(cl),videoEditorId:values.videoEditorId||cl?.videoEditorId||'',editor2Id:values.editor2Id||'',execFor:values.execFor||'',saveEditorOwner:[]};
 cfg={...cfg,fields,values:initial,onSave:async v=>{
  // Preserve existing co-assignees on edited historical tasks without showing the field.
  v.assigneeIds=Array.isArray(values.assigneeIds)?values.assigneeIds.slice():[];
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
 const grid=f.querySelector('.fgrid');
 if(grid){
  const section=(id,label)=>{const target=document.getElementById('f_'+id)?.closest('.fld');if(!target)return;const heading=document.createElement('div');heading.className='task23-section';heading.textContent=label;grid.insertBefore(heading,target)};
  section('clientId','CLIENTE E RESPONSÁVEIS');
  section('prioridade','PRIORIDADE E PRAZO');
  section('svcCat','INFORMAÇÕES DA TAREFA');
 }
 const client=document.getElementById('f_clientId'),designer=document.getElementById('f_designerId'),editor=document.getElementById('f_videoEditorId'),secondary=document.getElementById('f_editor2Id'),route=document.getElementById('f_execFor');
 const designerLabel=designer?.closest('.fld');
 if(designerLabel)designerLabel.insertAdjacentHTML('beforeend','<small id="task23-designer-hint" class="task23-field-hint"></small>');

 if(client){client.closest('.fld').insertAdjacentHTML('beforeend','<small id="task23-hint">Sugestões da carteira do cliente.</small>');client.addEventListener('change',()=>task23Sync('client'));}
 route.dataset.selected=initial.execFor;
 for(const el of [designer,editor,secondary,route])el?.addEventListener('change',()=>{if(el===route)route.dataset.selected=route.value;task23Sync('selection')});
 const kind=document.getElementById('f_categoria');kind?.addEventListener('change',()=>{if(!route.dataset.selected||route.dataset.selected==='outro'){route.dataset.selected=/vídeo|video|reels|audiovisual/i.test(kind.value)?'editor':/arte|design|imagem/i.test(kind.value)?'designer':route.dataset.selected;task23Sync('selection')}});
 task23Sync('selection');
 const fold=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 f.querySelectorAll('[data-task23-search]').forEach(search=>search.addEventListener('input',()=>{const q=fold(search.value);search.closest('.task23-people').querySelectorAll('label').forEach(label=>{label.hidden=!fold(label.textContent).includes(q)})}));
 // Search stays available only inside the selector, avoiding duplicate empty fields.
 f.querySelectorAll('select').forEach(select=>{
  if(select.options.length<=7||select.id==='f_execFor')return;
  const field=select.closest('.fld');
  if(!field)return;
  const searchWrap=document.createElement('div');
  searchWrap.className='task23-select-filter';
  searchWrap.hidden=true;
  searchWrap.innerHTML='<input type="search" aria-label="Filtrar opções" placeholder="Buscar opção..." autocomplete="off">';
  select.before(searchWrap);
  const filter=searchWrap.querySelector('input');
  filter.addEventListener('input',()=>{
   const q=fold(filter.value);
   for(const opt of select.options)opt.hidden=!!q&&!fold(opt.textContent).includes(q);
  });
  select.addEventListener('focus',()=>{searchWrap.hidden=false});
  select.addEventListener('change',()=>{searchWrap.hidden=true;filter.value='';for(const opt of select.options)opt.hidden=false});
  field.addEventListener('focusout',()=>setTimeout(()=>{if(!field.contains(document.activeElement)){searchWrap.hidden=true;filter.value='';for(const opt of select.options)opt.hidden=false}},150));
 });

 const urgent=document.getElementById('f_urg');urgent?.addEventListener('click',()=>setTimeout(()=>{if(urgent.querySelector('[aria-pressed="true"]')){const el=document.getElementById('f_due');if(el&&!el.dataset.urgentSuggested){el.value=task23Workdays(today(),2);el.dataset.urgentSuggested='1';toast('Prazo sugerido: '+fD(el.value))}}},0));
};
(()=>{const st=document.createElement('style');st.textContent=`
#modal:has(.task23-modal){width:min(1040px,calc(100vw - 36px));max-width:1040px;border-radius:22px;box-shadow:0 26px 90px rgba(10,18,30,.23);overflow:hidden}
.task23-modal{--task23-accent:#ee3459}
.task23-modal .mh{padding:19px 27px;border-bottom:1px solid var(--line)}
.task23-modal .mh h2{font-size:23px;letter-spacing:-.035em}
.task23-modal .mb{padding:24px 27px 32px;background:color-mix(in srgb,var(--surface) 95%,var(--bg))}
.task23-modal .fgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:18px;row-gap:17px;align-items:start}
.task23-modal .fld{min-width:0;margin:0;display:flex;flex-direction:column;gap:7px}
.task23-modal .fld.full{grid-column:1/-1}
.task23-modal .fld>span,.task23-modal .task23-people>legend{font-size:11px;font-weight:800;letter-spacing:.07em;color:var(--muted);text-transform:uppercase}
.task23-modal .fld>select,.task23-modal .fld>input:not([type=checkbox]),.task23-modal .fld>textarea{width:100%;min-width:0;min-height:47px;margin:0;border:1px solid #dce1e6;border-radius:11px;background:var(--surface);padding:11px 13px;font-size:14px;line-height:1.4;transition:border-color .15s,box-shadow .15s}
.task23-modal .fld>textarea{min-height:105px;resize:vertical}
.task23-modal .fld>select:focus,.task23-modal .fld>input:focus,.task23-modal .fld>textarea:focus,.task23-select-filter input:focus{outline:none;border-color:var(--task23-accent);box-shadow:0 0 0 3px rgba(238,52,89,.11)}
.task23-modal .fld>small,.task23-field-hint{font-size:11.5px;color:var(--muted);line-height:1.5}
.task23-modal .task23-section{grid-column:1/-1;display:flex;align-items:center;gap:10px;font-size:11px;font-weight:850;letter-spacing:.085em;color:var(--muted);padding:23px 0 0;border-top:1px solid var(--line);margin-top:7px}
.task23-modal .task23-section:first-child{border-top:0;margin-top:0;padding-top:0}
.task23-modal .task23-section::before{content:'';width:4px;height:17px;border-radius:4px;background:var(--task23-accent)}
.task23-modal .mf{padding:15px 25px;border-top:1px solid var(--line);box-shadow:0 -8px 25px rgba(0,0,0,.025);gap:9px}
.task23-modal .mf .btn{border-radius:10px;min-height:42px;padding-inline:18px}
.task23-modal .mf .primary{background:var(--task23-accent);border-color:var(--task23-accent)}
.task23-people{border:0;padding:0;margin:0;min-width:0}
.task23-people>div{max-height:150px;overflow:auto;border:1px solid var(--line);border-radius:11px;padding:9px 12px;background:var(--surface);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 12px}
.task23-people>div label{display:flex;align-items:center;gap:7px;padding:8px;border-radius:7px;font-size:13px}
.task23-people>div label:hover{background:var(--surface-2)}
.task23-people>div label[hidden],.task23-select-filter[hidden]{display:none!important}
.task23-people input[type=search],.task23-select-filter input{width:100%;padding:9px 12px;border:1px solid var(--line);border-radius:9px;background:var(--surface);font-size:13px}
.task23-select-filter{width:100%}
@media(max-width:700px){
 #modal:has(.task23-modal){width:calc(100vw - 16px);border-radius:14px}
 .task23-modal .mh{padding:15px 17px}
 .task23-modal .mb{padding:18px 16px 24px}
 .task23-modal .fgrid{grid-template-columns:minmax(0,1fr);gap:15px}
 .task23-modal .task23-section{padding-top:17px}
 .task23-people>div{grid-template-columns:1fr}
 .task23-modal .mf{padding:12px 16px}
}
`;document.head.appendChild(st)})();
