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
  return '<section class="sec post-section" aria-label="Calendário editorial">'+
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
function calPostForm(c,existing) {
  if (!calCanEdit(c) || c.stage==='entregue') { toast('Este calendário não pode ser editado.');return; }
  const isNew=!existing;
  const values={date:c.month+'-01',kind:'special',title:'',caption:'',format:'',notes:'',creativeId:'',...(existing||{})};
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
    if(b.dataset.act==='ps-new')calPostForm(c,null);
    if(b.dataset.act==='ps-edit'){const post=(c.posts||[]).find(p=>p.id===b.dataset.post);if(post)calPostForm(c,post)}
    if(b.dataset.act==='ps-regenerate')await calPostRegenerate(c.id);
  }catch(err){console.error(err);toast('Falha ao atualizar a programação.')}
},true);
(()=>{const css=document.createElement('style');css.textContent=
'.post-info{font-size:12.5px;color:var(--muted);margin:0 0 12px;line-height:1.6}'+
'.post-list{display:flex;flex-direction:column;gap:7px}'+
'.post-row{display:flex;align-items:flex-start;gap:13px;background:var(--surface-2);padding:11px;border-radius:10px}'+
'.post-date{display:flex;flex-direction:column;text-align:center;min-width:47px;background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:4px}'+
'.post-date b{font-size:20px}.post-date small{font-size:10px;color:var(--muted)}'+
'.post-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}'+
'.post-body b{font-size:14px}.post-body small{font-size:11px;color:var(--muted)}'+
'.post-body p{font-size:12px;margin:2px 0;white-space:pre-wrap}'+
'.post-empty{color:var(--muted);font-size:13px}'+
'@media(max-width:560px){.post-row{flex-wrap:wrap}.post-row>.btn{margin-left:auto}}';
document.head.appendChild(css)})();
