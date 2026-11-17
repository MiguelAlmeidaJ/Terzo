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
function calPostingPanel(c) {
  const posts = Array.isArray(c.posts) ? c.posts.slice().sort((a,b)=>a.date.localeCompare(b.date)) : [];
  const can = calCanEdit(c) && c.stage!=='entregue';
  const days = (byId('clients',c.clientId)?.postingDays||[]).map(k=>POST_LABELS[k]).filter(Boolean);
  const rows = posts.map(p =>
    '<div class="post-row"><span class="post-date"><b>'+esc(String(p.date||'').slice(-2))+'</b><small>'+esc(postDay(p.date))+'</small></span>'+
    '<span class="post-body"><b>'+esc(p.title||'Postagem planejada')+'</b>'+
    '<small>'+esc(p.kind==='special'?'Data especial / campanha':'Postagem recorrente')+
    (p.movedFrom?' · realocada de '+esc(fD(p.movedFrom)):'')+(p.format?' · '+esc(p.format):'')+'</small>'+
    (p.caption?'<p>'+esc(p.caption)+'</p>':'')+(p.notes?'<small>'+esc(p.notes)+'</small>':'')+'</span>'+ 
    (p.creativeId&&byId('creatives',p.creativeId)?'<button type="button" class="btn sm" data-act="open-creative" data-id="'+esc(p.creativeId)+'">Abrir arte</button>':'')+
    (can?'<button type="button" class="btn sm" data-act="ps-edit" data-id="'+esc(c.id)+'" data-post="'+esc(p.id)+'">Editar / realocar</button>':'')+'</div>'
  ).join('');
  return '<div class="sec post-section"><h3>Programação de postagens · '+posts.length+' publicações</h3>'+
    '<p class="post-info">Dias cadastrados: <b>'+esc(days.join(' · ')||'não definidos')+'</b>. As datas do mês podem ser ajustadas para campanhas e datas comemorativas sem alterar a rotina do cliente.</p>'+
    (rows?'<div class="post-list">'+rows+'</div>':'<p class="post-empty">Nenhuma publicação programada para este calendário.</p>')+
    (can?'<div class="row" style="margin-top:12px"><button class="btn sm primary" data-act="ps-new" data-id="'+esc(c.id)+'">+ Postagem especial</button>'+
      (!Array.isArray(c.posts)?'<button class="btn sm" data-act="ps-regenerate" data-id="'+esc(c.id)+'">Gerar pelos dias cadastrados</button>':'')+
      '</div>':'')+'</div>';
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
