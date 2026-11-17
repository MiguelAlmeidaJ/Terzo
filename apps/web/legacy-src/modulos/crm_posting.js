/* Calendários: datas editoriais por semana, preservadas no registro de cada mês. */
const POST_WEEK = ['dom','seg','ter','qua','qui','sex','sab'];
const POST_LABELS = {seg:'SEG',ter:'TER',qua:'QUA',qui:'QUI',sex:'SEX',sab:'SÁB',dom:'DOM'};

function postDay(date) {
  const d = new Date(date + 'T12:00:00Z');
  return Number.isNaN(d.getTime()) ? '' : POST_LABELS[POST_WEEK[d.getUTCDay()]];
}
function postMonth(date, month) {
  return /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date) && date.slice(0,7)===month &&
    !Number.isNaN(new Date(date+'T12:00:00Z').getTime()) &&
    new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;
}
function calBuildPosts(client,month) {
  if (!client || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const days = new Set((client.postingDays||[]).filter(k=>POST_WEEK.includes(k)));
  if (!days.size) return [];
  const [y,m] = month.split('-').map(Number);
  const count = new Date(Date.UTC(y,m,0)).getUTCDate();
  const result = [];
  for (let n=1;n<=count;n++) {
    const date = month+'-'+String(n).padStart(2,'0');
    if (days.has(POST_WEEK[new Date(Date.UTC(y,m-1,n)).getUTCDay()])) {
      result.push({id:'post_'+date.replace(/-/g,''),date,kind:'regular',title:'',caption:'',format:'',notes:''});
    }
  }
  return result;
}
function postMonthGrid(month, posts) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { offset:0, days:[] };
  const [year,mon] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year,mon,0)).getUTCDate();
  const offset = (new Date(Date.UTC(year,mon-1,1)).getUTCDay()+6)%7;
  const days = [];
  for (let n=1;n<=count;n++) {
    const date=month+'-'+String(n).padStart(2,'0');
    days.push({ date, num:n, posts:(posts||[]).filter(p=>p.date===date) });
  }
  return { offset, days };
}
function calPostingPanel(c) {
  const posts=Array.isArray(c.posts)?c.posts:[];
  const can=calCanEdit(c)&&c.stage!=='entregue';
  const days=(byId('clients',c.clientId)?.postingDays||[]).map(k=>POST_LABELS[k]).filter(Boolean);
  const grid=postMonthGrid(c.month,posts);
  const labels=['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
  const picked=ui.psPicked&&ui.psPicked.calId===c.id?ui.psPicked.postId:'';
  const countSpecial=posts.filter(p=>p.kind==='special').length;
  const cells=grid.days.map(day=>{
    const occupied=day.posts.length>0,free=!occupied;
    const movable=can&&occupied,available=can&&free;
    const entry=day.posts.map(p=>'<div class="post-event'+(picked===p.id?' is-picked':'')+'"'+
      (can?' draggable="true" tabindex="0" role="button" data-post="'+esc(p.id)+'" data-act="ps-pick" data-id="'+esc(c.id)+'"':'')+
      ' title="'+esc((can?'Arraste, clique ou pressione Enter para selecionar. Duplo clique para editar. ':'')+(p.title||'Postagem planejada'))+'">'+
      '<span class="post-event-title">'+esc(p.title||'Postagem planejada')+'</span>'+
      '<span class="post-event-meta">'+(p.kind==='special'?'★ Especial':'Publicação')+(p.format?' · '+esc(p.format):'')+'</span></div>').join('');
    return '<div class="post-cell'+(occupied?' has-post':' is-free')+
      (available?' can-drop':'')+(picked&&available?' can-place':'')+'" data-day="'+esc(day.date)+'"'+
      (available?' tabindex="0" role="button" data-act="ps-place" data-id="'+esc(c.id)+'" aria-label="Dia '+day.num+' livre: '+(picked?'realocar postagem selecionada':'adicionar postagem especial')+'"':'')+
      ' title="'+(occupied?'Duplo clique na publicação para editar':available?(picked?'Clique para realocar a postagem':'Dia livre. Duplo clique para adicionar postagem'):'Dia sem postagem')+'">'+
      '<div class="post-cell-head"><span class="post-cell-num">'+String(day.num).padStart(2,'0')+'</span>'+
      (occupied?'<span class="post-cell-indicator" aria-hidden="true"></span>':'')+'</div>'+entry+'</div>';
  });
  const empty=Array(grid.offset).fill('<div class="post-cell post-padding" aria-hidden="true"></div>');
  const status=picked?'<div class="post-move-hint" role="status">Postagem selecionada. Clique em uma data cinza para realocar, ou use Esc para cancelar. <button type="button" data-act="ps-cancel" data-id="'+esc(c.id)+'">Cancelar seleção</button></div>':'';
  return '<section class="sec post-section" data-cal-id="'+esc(c.id)+'" aria-label="Calendário editorial">'+
    '<div class="post-panel-head"><div><h3>Calendário de publicações</h3><p>'+esc(calMonthL(c.month))+' · '+posts.length+' postagens · '+countSpecial+' especiais</p></div>'+
    '<div class="post-legend"><span><i class="post-key published"></i>Com postagem</span><span><i class="post-key available"></i>Dia livre</span></div></div>'+
    '<p class="post-info">Dias habituais: <strong>'+esc(days.join(' · ')||'não definidos')+'</strong>. '+(can?'Arraste uma publicação rosa para uma data livre em cinza. Duplo clique na publicação para editar. No celular, toque na publicação e depois no dia livre.':'Programação somente para consulta.')+'</p>'+
    status+
    '<div class="post-calendar-wrap"><div class="post-calendar" role="group" aria-label="Mês de '+esc(calMonthL(c.month))+'">'+
    labels.map(x=>'<div class="post-week-label">'+x+'</div>').join('')+empty.join('')+cells.join('')+'</div></div>'+
    (can?'<div class="post-toolbar"><button class="btn primary" data-act="ps-new" data-id="'+esc(c.id)+'">+ Postagem especial</button>'+
       '<button class="btn" data-act="ps-regenerate" data-id="'+esc(c.id)+'">'+(Array.isArray(c.posts)?'Recriar pelos dias cadastrados':'Gerar pelos dias cadastrados')+'</button></div>':'')+
    '</section>';
}
async function calMovePost(c,postId,date){
  if(!c||!calCanEdit(c)||c.stage==='entregue')throw Error('permission_denied');
  if(!postMonth(date,c.month))throw Error('invalid_date');
  const fresh=byId('calendars',c.id);
  if(!fresh||!calCanEdit(fresh)||fresh.stage==='entregue')throw Error('permission_denied');
  const posts=Array.isArray(fresh.posts)?fresh.posts.map(x=>({...x})):[];
  const current=posts.find(x=>x.id===postId);
  if(!current)throw Error('post_not_found');
  if(current.date===date)return false;
  if(posts.some(x=>x.date===date)){toast('Esta data já possui postagem. Escolha um dia cinza livre.');return false}
  const previous=current.date;
  current.movedFrom=current.movedFrom||previous;
  current.date=date;
  const reset=fresh.stage==='validacao'&&fresh.approvedAt?{approvedAt:'',approvedBy:''}:{};
  await calSave(fresh,{posts,...reset},{k:'postagem',note:'Postagem realocada: '+previous+' → '+date+(current.title?' · '+current.title:'')});
  ui.psPicked=null;
  toast('Postagem transferida para '+fD(date));
  return true;
}
function calPostForm(c,existing,proposedDate) {
  if (!calCanEdit(c) || c.stage==='entregue') { toast('Este calendário não pode ser editado.');return; }
  const isNew=!existing;
  const values={date:proposedDate||c.month+'-01',kind:'special',title:'',caption:'',format:'',notes:'',creativeId:'',...(existing||{})};
  formModal({
    title:(isNew?'Adicionar postagem':'Editar / realocar postagem')+' · '+calMonthL(c.month),
    values,back:()=>calDetail(c.id),fields:[
      {k:'date',l:'Data da publicação',t:'date',req:1,full:1,hint:'Você pode mover a arte para qualquer dia deste mês, inclusive datas comemorativas.'},
      {k:'kind',l:'Tipo de publicação',t:'select',o:[{v:'regular',l:'Postagem recorrente'},{v:'special',l:'Data comemorativa / campanha'}]},
      {k:'creativeId',l:'Vincular arte da biblioteca',t:'select',o:S.creatives.filter(x=>x.clientId===c.clientId).map(x=>({v:x.id,l:x.title||x.fileName||'Criativo'})),empty:'Sem arte vinculada',full:1,hint:'A postagem acompanha esta arte mesmo se a data for realocada. A prévia externa só mostrará artes já liberadas internamente.'},
      {k:'title',l:'Tema da arte',full:1,ph:'Ex.: Dia das Mães, campanha de produto'},
      {k:'format',l:'Formato',t:'select',o:[{v:'',l:'A definir'},{v:'Feed',l:'Feed'},{v:'Carrossel',l:'Carrossel'},{v:'Reels',l:'Reels'},{v:'Stories',l:'Stories'}]},
      {k:'caption',l:'Copy / legenda',t:'textarea',full:1},
      {k:'notes',l:'Observações da arte',t:'textarea',full:1}
    ],
    onSave:async v=>{
      const current=byId('calendars',c.id);
      if(!current||!calCanEdit(current))throw Error('permission_denied');
      if(!postMonth(v.date,current.month)){toast('Escolha uma data válida no mês deste calendário.');throw Error('invalid_date')}
      const posts=Array.isArray(current.posts)?[...current.posts]:[];
      if(posts.some(p=>p.date===v.date&&p.id!==existing?.id)){toast('Esta data já tem uma postagem. Escolha um dia livre no calendário.');throw Error('occupied_date')}
      const moved=existing && existing.date!==v.date;
      const item={id:existing?.id||uid(),date:v.date,kind:v.kind==='special'?'special':'regular',
        title:v.title.slice(0,200),caption:v.caption.slice(0,3000),format:v.format,notes:v.notes.slice(0,1000),creativeId:v.creativeId||''};
      if(existing?.movedFrom||moved)item.movedFrom=existing?.movedFrom||existing.date;
      if(existing){const at=posts.findIndex(p=>p.id===existing.id);if(at<0){toast('Esta postagem foi alterada por outra pessoa.');throw Error('outdated')}posts[at]=item}
      else posts.push(item);
      const reset=current.stage==='validacao'&&current.approvedAt?{approvedAt:'',approvedBy:''}:{};
      await calSave(current,{posts,...reset},{k:'postagem',note:(existing?'Postagem editada':'Postagem criada')+' · '+v.date+(moved?' (realocada de '+existing.date+')':'')});
      toast(existing?'Postagem atualizada':'Postagem adicionada');
      setTimeout(()=>calDetail(c.id),70);
    },
    onDelete:existing?async()=>{
      const current=byId('calendars',c.id);
      if(!current||!calCanEdit(current)||!confirm('Remover esta postagem?'))throw Error('cancelled');
      const posts=(current.posts||[]).filter(p=>p.id!==existing.id);
      const reset=current.stage==='validacao'&&current.approvedAt?{approvedAt:'',approvedBy:''}:{};
      await calSave(current,{posts,...reset},{k:'postagem',note:'Postagem removida · '+existing.date});
      toast('Postagem removida');
    }:null,delLabel:'Remover postagem'
  });
}
async function calPostRegenerate(id) {
  const c=byId('calendars',id);
  if(!c||!calCanEdit(c)||c.stage==='entregue')return;
  const posts=calBuildPosts(byId('clients',c.clientId),c.month);
  if(!posts.length){toast('Primeiro defina os dias de postagem no cadastro do cliente.');return}
  if(Array.isArray(c.posts)&&!confirm('Recriar a programação? Os ajustes de datas e os temas existentes serão substituídos.'))return;
  const reset=c.stage==='validacao'&&c.approvedAt?{approvedAt:'',approvedBy:''}:{};
  await calSave(c,{posts,...reset},{k:'postagem',note:'Programação gerada: '+posts.length+' publicações'});
  toast(posts.length+' postagens programadas');calDetail(id);
}
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act^="ps-"]');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  const c=byId('calendars',b.dataset.id);if(!c)return;
  try {
    if(b.dataset.act==='ps-cancel'){ui.psPicked=null;calDetail(c.id);return}
    if(b.dataset.act==='ps-pick'){
      if(!calCanEdit(c)||c.stage==='entregue')return;
      ui.psPicked=ui.psPicked?.calId===c.id&&ui.psPicked?.postId===b.dataset.post?null:{calId:c.id,postId:b.dataset.post};
      calDetail(c.id);return;
    }
    if(b.dataset.act==='ps-place'){
      if(!ui.psPicked||ui.psPicked.calId!==c.id)return;
      if(await calMovePost(c,ui.psPicked.postId,b.closest('[data-day]')?.dataset.day))calDetail(c.id);
      return;
    }
    if(b.dataset.act==='ps-new')calPostForm(c,null);
    if(b.dataset.act==='ps-edit'){const post=(c.posts||[]).find(p=>p.id===b.dataset.post);if(post)calPostForm(c,post)}
    if(b.dataset.act==='ps-regenerate')await calPostRegenerate(c.id);
  }catch(err){console.error(err);toast('Falha ao atualizar a programação.')}
},true);

document.addEventListener('dragstart',e=>{
  const post=e.target.closest('.post-event[draggable="true"]');
  if(!post)return;
  const c=byId('calendars',post.dataset.id);
  if(!c||!calCanEdit(c)||c.stage==='entregue'){e.preventDefault();return}
  ui.psDragging={calId:c.id,postId:post.dataset.post};
  if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',post.dataset.post)}
  post.classList.add('dragging');
},true);
document.addEventListener('dragover',e=>{
  const cell=e.target.closest('.post-cell.can-drop');
  if(!cell||!ui.psDragging||cell.closest('.post-section')?.dataset.calId!==ui.psDragging.calId)return;
  e.preventDefault();
  if(e.dataTransfer)e.dataTransfer.dropEffect='move';
  cell.classList.add('drag-target');
},true);
document.addEventListener('dragleave',e=>{
  const cell=e.target.closest('.post-cell');
  if(cell&&!cell.contains(e.relatedTarget))cell.classList.remove('drag-target');
},true);
document.addEventListener('drop',async e=>{
  const cell=e.target.closest('.post-cell.can-drop');
  if(!cell||!ui.psDragging)return;
  const drag=ui.psDragging;ui.psDragging=null;
  if(cell.closest('.post-section')?.dataset.calId!==drag.calId)return;
  e.preventDefault();e.stopImmediatePropagation();
  document.querySelectorAll('.post-cell.drag-target').forEach(el=>el.classList.remove('drag-target'));
  const c=byId('calendars',drag.calId);
  try{if(await calMovePost(c,drag.postId,cell.dataset.day))calDetail(c.id)}
  catch(err){console.error(err);toast('Não foi possível realocar esta publicação.')}
},true);
document.addEventListener('dragend',()=>{
  ui.psDragging=null;
  document.querySelectorAll('.post-cell.drag-target,.post-event.dragging').forEach(el=>el.classList.remove('drag-target','dragging'));
},true);
document.addEventListener('dblclick',e=>{
  const cell=e.target.closest('.post-cell[data-day]');
  if(!cell)return;
  e.preventDefault();e.stopImmediatePropagation();
  const section=cell.closest('.post-section'),c=byId('calendars',section?.dataset.calId);
  if(!c||!calCanEdit(c)||c.stage==='entregue')return;
  const postEl=e.target.closest('.post-event[data-post]');
  const selected=postEl?(c.posts||[]).find(p=>p.id===postEl.dataset.post):(c.posts||[]).find(p=>p.date===cell.dataset.day);
  if(selected)calPostForm(c,selected);
  else calPostForm(c,null,cell.dataset.day);
},true);
document.addEventListener('keydown',e=>{
  const target=e.target.closest('.post-event[data-post],.post-cell.can-drop');
  if(e.key==='Escape'&&ui.psPicked){ui.psPicked=null;const c=byId('calendars',target?.dataset.id||document.querySelector('.post-section')?.dataset.calId);if(c)calDetail(c.id);return}
  if(!target||!['Enter',' '].includes(e.key))return;
  e.preventDefault();target.click();
},true);
(()=>{const css=document.createElement('style');css.textContent="\n.modal:has(.cal-workspace){max-width:min(1120px,calc(100vw - 32px));max-height:min(92dvh,960px)}\n.modal:has(.cal-workspace) .mb{gap:16px;padding:20px 24px}\n.modal:has(.cal-workspace) .mh{padding:18px 24px}\n.modal:has(.cal-workspace) .mf{padding:12px 24px}\n.post-section{margin:0;padding:0;border:0}\n.post-panel-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}\n.post-panel-head h3{font-size:18px;margin:0 0 4px;color:var(--ink);letter-spacing:-.02em}\n.post-panel-head p{font-size:12.5px;color:var(--muted);margin:0}\n.post-legend{display:flex;gap:14px;align-items:center;flex-wrap:wrap}\n.post-legend span{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted);font-weight:650}\n.post-key{display:block;width:13px;height:13px;border-radius:4px;border:1px solid var(--line);background:#eeecee}\n.post-key.published{background:#ffdbe4;border-color:#ef9db3}\n.post-info{font-size:12.5px;color:var(--muted);margin:0;padding:11px 14px;line-height:1.6;background:var(--surface-2);border-radius:9px}\n.post-calendar-wrap{overflow-x:auto;max-width:100%;padding:1px 1px 4px}\n.post-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;min-width:580px}\n.post-week-label{font-size:10.5px;letter-spacing:.08em;color:var(--muted);font-weight:800;text-align:center;text-transform:uppercase;padding:8px 0 5px}\n.post-cell{min-height:112px;min-width:0;padding:9px;border-radius:11px;border:1px solid #e2e0e3;background:#f0eff1;display:flex;flex-direction:column;gap:6px;transition:background .14s,border-color .14s,box-shadow .14s}\n.post-cell.has-post{background:#ffe0e9;border-color:#f2acc0}\n.post-cell.post-padding{background:transparent;border:0;pointer-events:none}\n.post-cell.can-place,.post-cell.can-drop.drag-target{background:#fde8ec;border:2px dashed #dd3d67;padding:8px;box-shadow:0 0 0 2px rgba(232,52,81,.07)}\n.post-cell-head{display:flex;justify-content:space-between;align-items:center}\n.post-cell-num{font-family:var(--f-display);font-size:15px;font-weight:850;letter-spacing:-.03em;color:#777178}\n.post-cell.has-post .post-cell-num{color:#b72951}\n.post-cell-indicator{width:6px;height:6px;border-radius:100%;background:#e83451}\n.post-event{min-width:0;padding:7px 8px;background:#fff;border:1px solid #f0bdcb;border-left:3px solid #e83451;border-radius:7px;display:flex;flex-direction:column;gap:3px;color:#552334;user-select:none;cursor:grab;outline-offset:2px;transition:opacity .15s}\n.post-event:hover,.post-event:focus-visible{border-color:#d84163;box-shadow:0 1px 7px rgba(216,57,98,.18)}\n.post-event.dragging{opacity:.4;cursor:grabbing}\n.post-event.is-picked{outline:2px solid #e83451;background:#fff8fa}\n.post-event-title{display:block;font-size:11.5px;font-weight:780;line-height:1.32;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\n.post-event-meta{font-size:10px;color:#ab536f}\n.post-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}\n.post-move-hint{border-radius:9px;border:1px solid #ea9fb0;background:#fff1f5;padding:10px 12px;color:#812c4e;font-size:12.5px}\n.post-move-hint button{margin-left:6px;background:none;border:0;color:#aa2250;text-decoration:underline;font-weight:750}\n@media(max-width:820px){.modal:has(.cal-workspace){max-width:none;max-height:94dvh;border-radius:16px 16px 0 0}.modal:has(.cal-workspace) .mb{padding:12px 14px}.modal:has(.cal-workspace) .mh,.modal:has(.cal-workspace) .mf{padding-inline:14px}}\n@media(prefers-reduced-motion:reduce){.post-cell,.post-event{transition:none}}\n";document.head.appendChild(css)})();
