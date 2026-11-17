/* ================= Objetivos do cliente em lista =================
   Mesmo modelo: clients.objectives (ids do catálogo "objectives") + primaryObjective (foco).
   Objetivos escritos à mão ficam em clients.objectivesCustom (lista de textos). */
(()=>{const st=document.createElement('style');st.textContent=`
.objl ul{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
.objl li{display:flex;align-items:center;gap:10px;padding:9px 12px;border-top:1px solid var(--line);font-size:14.5px;min-height:42px}
.objl li:first-child{border-top:0}
.objl li::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--ink);flex:none;opacity:.55}
.objl li .t{flex:1;min-width:0;overflow-wrap:anywhere}.objl li .t small{color:var(--muted);font-size:12.5px;margin-left:6px}
.objl li input{flex:1;min-width:0;border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:var(--bg)}
.objl .ib{border:0;background:none;color:var(--muted);width:30px;height:30px;border-radius:8px;display:grid;place-items:center;flex:none;padding:0}
.objl .ib:hover{background:var(--surface-2);color:var(--ink)}.objl .ib svg{width:16px;height:16px}
.objl .empty-l{padding:12px;color:var(--muted);font-size:14px;border:1px dashed var(--line);border-radius:10px}
.objl-add{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center}
.objl-add select,.objl-add input{border:1px solid var(--line);background:var(--bg);border-radius:9px;padding:8px 10px;min-width:0;flex:1 1 220px}
.objl .lnk{margin-top:8px;font-size:13.5px}
.objl-view{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.objl-view li{padding:7px 0;border-top:1px solid var(--line);font-size:14.5px;display:flex;gap:10px;align-items:baseline}.objl-view li:first-child{border-top:0}
.objl-view li::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--ink);opacity:.55;flex:none;transform:translateY(-2px)}
.objl-view small{color:var(--muted)}
`;(document.body||document.head).appendChild(st)})();
const OBJ_I={edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',del:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'};
function objlHtml(el){const ids=JSON.parse(el.dataset.ids||'[]'),cu=JSON.parse(el.dataset.custom||'[]'),edit=el.dataset.edit;const prim=document.getElementById('f_primaryObjective')?.value||'';
 const rows=[...ids.map((id,i)=>({k:'id',i,t:oName(id)||'Objetivo removido do catálogo',p:id===prim})),...cu.map((t,i)=>({k:'cu',i,t}))];
 const free=objs().filter(o=>!ids.includes(o.id));
 el.innerHTML=(rows.length?`<ul>${rows.map(r=>edit===r.k+r.i?`<li><input id="objl-edit-in" value="${esc(r.t)}" aria-label="Editar objetivo"><button type="button" class="btn sm" data-act="objl-edit-save" data-i="${r.i}">Salvar</button></li>`
  :`<li><span class="t">${esc(r.t)}${r.p?'<small>foco atual</small>':''}${r.k==='cu'?'<small>personalizado</small>':''}</span>${r.k==='cu'?`<button type="button" class="ib" data-act="objl-edit" data-i="${r.i}" aria-label="Editar objetivo" title="Editar">${OBJ_I.edit}</button>`:''}<button type="button" class="ib" data-act="objl-del" data-k="${r.k}" data-i="${r.i}" aria-label="Remover objetivo" title="Remover">${OBJ_I.del}</button></li>`).join('')}</ul>`:'<div class="empty-l">Nenhum objetivo cadastrado ainda.</div>')
  +(el.dataset.open?`<div class="objl-add"><select id="objl-sel" aria-label="Escolher objetivo"><option value="">Escolha um objetivo sugerido…</option>${free.map(o=>`<option value="${esc(o.id)}">${esc(o.name)}</option>`).join('')}<option value="__txt">Outro: escrever um objetivo</option></select><input id="objl-txt" placeholder="Escreva o objetivo" hidden><button type="button" class="btn sm primary" data-act="objl-add">Adicionar</button><button type="button" class="btn sm ghost" data-act="objl-cancel">Cancelar</button></div>`
  :`<button type="button" class="lnk" data-act="objl-open">+ Adicionar objetivo</button>`)}
function fld(f,v){const id='f_'+f.k,cls='fld'+(f.full?' full':''),hint=f.hint?`<small>${esc(f.hint)}</small>`:'';
 if(f.t==='objlist')return `<div class="${cls}"><span>${f.l}</span><div class="objl" id="${id}" data-ids="${esc(JSON.stringify((v||[]).filter(Boolean)))}" data-custom="${esc(JSON.stringify(f.custom||[]))}"></div>${hint}</div>`;
 if(f.t==='select')return `<label class="${cls}"><span>${f.l}</span><select id="${id}">${opt(f.o,v,f.empty)}</select>${hint}</label>`;
 if(f.t==='textarea')return `<label class="${cls}"><span>${f.l}</span><textarea id="${id}" placeholder="${esc(f.ph||'')}" ${f.rows?`style="min-height:${f.rows*22}px"`:''}>${esc(v)}</textarea>${hint}</label>`;
 if(f.t==='chips')return `<div class="${cls}"><span>${f.l}</span><div class="chips" id="${id}">${f.o.map(o=>`<button type="button" class="chip obj" data-act="chip" data-v="${esc(o.v)}" aria-pressed="${(v||[]).includes(o.v)}">${esc(o.l)}</button>`).join('')||'<small style="color:var(--muted)">Nada para escolher ainda.</small>'}</div></div>`;
 return `<label class="${cls}"><span>${f.l}</span><input id="${id}" type="${f.t||'text'}" value="${esc(v)}" placeholder="${esc(f.ph||'')}" ${f.t==='number'?'min="0" step="any" inputmode="decimal"':''} ${f.list?`list="${id}-dl"`:''}>${f.list?`<datalist id="${id}-dl">${[...new Set(f.list)].map(x=>`<option value="${esc(x)}"></option>`).join('')}</datalist>`:''}${hint}</label>`}
function readForm(fields){const o={};for(const f of fields){const n=document.getElementById('f_'+f.k);if(!n)continue;
 if(f.t==='objlist'){o[f.k]=JSON.parse(n.dataset.ids||'[]');o[f.k+'Custom']=JSON.parse(n.dataset.custom||'[]');continue}
 o[f.k]=f.t==='chips'?[...n.querySelectorAll('[aria-pressed="true"]')].map(b=>b.dataset.v):n.value.trim()}return o}
function objlInit(){document.querySelectorAll('#modal .objl:not([data-ready])').forEach(el=>{el.dataset.ready='1';objlHtml(el)})}
new MutationObserver(()=>objlInit()).observe(document.getElementById('modal')||document.body,{childList:true,subtree:false});
document.addEventListener('change',e=>{if(e.target.id==='objl-sel'){const t=$('#objl-txt');if(t){t.hidden=e.target.value!=='__txt';if(!t.hidden)t.focus()}}if(e.target.id==='f_primaryObjective'){const el=$('#f_objectives.objl');if(el)objlHtml(el)}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.target.id==='objl-txt'||e.target.id==='objl-edit-in')){e.preventDefault();document.querySelector(e.target.id==='objl-txt'?'[data-act="objl-add"]':'[data-act="objl-edit-save"]')?.click()}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-act^="objl-"]');if(!b)return;const el=b.closest('.objl');if(!el)return;e.stopPropagation();e.preventDefault();
 const ids=JSON.parse(el.dataset.ids||'[]'),cu=JSON.parse(el.dataset.custom||'[]');const i=+b.dataset.i;const set=()=>{el.dataset.ids=JSON.stringify(ids);el.dataset.custom=JSON.stringify(cu);objlHtml(el)};
 switch(b.dataset.act){
 case'objl-open':el.dataset.open='1';objlHtml(el);$('#objl-sel')?.focus();break;
 case'objl-cancel':delete el.dataset.open;objlHtml(el);break;
 case'objl-add':{const s=$('#objl-sel')?.value||'';if(s&&s!=='__txt'){if(!ids.includes(s))ids.push(s)}else{const t=($('#objl-txt')?.value||'').trim();if(!t){toast('Escolha um objetivo ou escreva um.');($('#objl-txt')&&!$('#objl-txt').hidden?$('#objl-txt'):$('#objl-sel'))?.focus();return}
   const hit=objs().find(o=>calNorm(o.name)===calNorm(t));if(hit){if(!ids.includes(hit.id))ids.push(hit.id)}else if(!cu.some(x=>calNorm(x)===calNorm(t)))cu.push(t)}
  delete el.dataset.open;set();break}
 case'objl-del':if(b.dataset.k==='id')ids.splice(i,1);else cu.splice(i,1);set();break;
 case'objl-edit':el.dataset.edit='cu'+i;objlHtml(el);$('#objl-edit-in')?.focus();break;
 case'objl-edit-save':{const t=($('#objl-edit-in')?.value||'').trim();if(t)cu[i]=t;else cu.splice(i,1);delete el.dataset.edit;set();break}}},true);
/* ficha do cliente: lista no lugar dos balões */
function objlView(c){const L=[...(c.objectives||[]).map(id=>({t:oName(id),p:id===c.primaryObjective})).filter(x=>x.t),...(c.objectivesCustom||[]).map(t=>({t}))];
 return L.length?`<ul class="objl-view">${L.map(x=>`<li><span>${esc(x.t)}${x.p?' <small>· foco atual</small>':''}</span></li>`).join('')}</ul>`:'<p style="margin:0;color:var(--muted);font-size:14px">Nenhum objetivo cadastrado.</p>'}
