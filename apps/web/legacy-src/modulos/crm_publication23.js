/* Publicação é confirmação humana: aprovado → programado → publicado. */
if(!CR_STATUS.includes('Programado'))CR_STATUS.splice(CR_STATUS.indexOf('Publicado'),0,'Programado');
CR_CLS.Programado='p-acc';
const pub23BaseList=vCriativos;
vCriativos=function(){
 const pending=S.creatives.filter(c=>c.status==='Programado'&&c.scheduledFor&&new Date(c.scheduledFor).getTime()+2*3600000<Date.now());
 const canSee=isAdmin()||isLeader()||myMember()?.area==='Relacionamento';
 const alert=canSee&&pending.length?'<div class="alertbox" role="status"><span>⚠</span><div><b>'+pending.length+' publicação(ões) sem confirmação</b><p>Programadas há mais de 2 horas; confira no mLabs antes de marcar como publicado.</p></div></div>':'';
 return alert+pub23BaseList();
};
document.addEventListener('click',async e=>{
 const btn=e.target.closest('[data-act="cr-status"]');if(!btn)return;
 const next=btn.dataset.v;
 if(next!=='Programado'&&next!=='Publicado')return;
 e.preventDefault();e.stopImmediatePropagation();
 const id=btn.dataset.id,c=byId('creatives',id);if(!c)return;
 const responsible=isAdmin()||myMember()?.area==='Relacionamento';
 if(!responsible){toast('Somente atendimento ou gestão podem confirmar publicações.');return}
 if(next==='Programado'){
  if(c.status!=='Aprovado'){toast('Apenas peças aprovadas podem ser programadas.');return}
  formModal({title:'Programar publicação · '+(c.title||'Peça'),back:()=>creativeDetail(id),values:{scheduledLocal:''},
   fields:[{k:'scheduledLocal',l:'Data e horário programados no mLabs',t:'datetime-local',req:1,full:1}],
   onSave:async v=>{
    const date=new Date(v.scheduledLocal);if(!Number.isFinite(date.getTime())){toast('Informe uma data e hora válidas.');throw new Error('date')}
    const live=byId('creatives',id);if(!live||live.status!=='Aprovado')throw new Error('outdated');
    await put('creatives',id,{...live,status:'Programado',scheduledFor:date.toISOString(),scheduledBy:me.id||'',statusAt:new Date().toISOString()});
    toast('Publicação programada. Confirme manualmente quando sair.');setTimeout(()=>creativeDetail(id),70);
   }});
 }else{
  if(!['Programado','Aprovado'].includes(c.status)){toast('É necessário aprovar a peça antes de publicá-la.');return}
  if(!confirm('Você conferiu que a publicação foi realmente ao ar?'))return;
  try{await put('creatives',id,{...c,status:'Publicado',publishedAt:new Date().toISOString(),publishedBy:me.id||'',statusAt:new Date().toISOString()});toast('Publicação confirmada.');creativeDetail(id)}
  catch(err){toast('Não foi possível confirmar a publicação.')}
 }
},true);
