/* =====================================================================
   Terzo · ponte do navegador para o servidor próprio
   ---------------------------------------------------------------------
   O Terzo foi escrito para pedir quatro serviços por window.claude.use(nome):
     db         banco de documentos com atualização em tempo real
     assets     envio e remoção de arquivos (servidos em /_blob/<id>)
     user       quem está usando (id, nome, e-mail, se é dono/administrador)
     downloads  salvar um arquivo no computador
   Este arquivo oferece esses serviços pela API NestJS, persistida no PostgreSQL:
     GET  /api/db?coll=...            lista documentos de uma coleção
     POST /api/db/set | /api/db/delete grava ou apaga um documento
     GET  /api/events                 Server-Sent Events com cada mudança
     POST /api/assets, DELETE /api/assets/:id, GET /_blob/:id
     GET  /api/auth/me, /api/users/profiles
   Nada aqui depende de IA nem do claude.ai.
   ===================================================================== */
(function(){'use strict';
window.TERZO_SELFHOST=true;
function err(code,msg){var e=new Error(msg||code);e.code=code;return e}
async function api(url,opt){opt=opt||{};var h={'X-Terzo':'1'};if(opt.json!==undefined){h['Content-Type']='application/json';opt.body=JSON.stringify(opt.json)}
 var r;try{r=await fetch(url,{method:opt.method||'GET',credentials:'same-origin',headers:Object.assign(h,opt.headers||{}),body:opt.body})}catch(e){throw err('unavailable','Sem conexão com o servidor')}
 if(r.status===401){location.href='/login?expirada=1';throw err('unauthenticated')}
 var j=null;try{j=await r.json()}catch(e){}
 if(r.status===403&&j&&j.error==='must_change_password'){location.href='/login?trocar=1';throw err('must_change_password')}
 if(!r.ok)throw err(r.status===403?'permission_denied':r.status===413?'too_large':r.status===429?'rate_limited':(j&&j.error)||'unavailable');
 return j}

/* ---------------- banco + tempo real ---------------- */
var subs=new Map();   /* coleção -> {cache:Map, loaded:bool, loading:Promise, listeners:Set} */
var es=null,down=false;
function snap(s,flt){var docs=[];s.cache.forEach(function(d,id){if(flt&&!flt(d))return;docs.push({id:id,exists:true,data:function(){return JSON.parse(JSON.stringify(d))}})});return{docs:docs,size:docs.length,empty:!docs.length}}
function emit(coll){var s=subs.get(coll);if(!s||!s.loaded)return;s.listeners.forEach(function(l){try{l.cb(snap(s,l.flt))}catch(e){console.error(e)}})}
function load(coll){var s=subs.get(coll);s.loading=api('/api/db?coll='+encodeURIComponent(coll)).then(function(j){s.cache=new Map(j.docs.map(function(d){return[d.id,d.data]}));s.loaded=true;emit(coll)}).catch(function(e){s.listeners.forEach(function(l){l.err&&l.err(e)})});return s.loading}
function ensureStream(){if(es)return;es=new EventSource('/api/events');
 es.addEventListener('doc',function(ev){var m=JSON.parse(ev.data);var s=subs.get(m.coll);if(!s)return;if(m.data===null)s.cache.delete(m.id);else s.cache.set(m.id,m.data);emit(m.coll)});
 es.addEventListener('ready',function(){if(down){down=false;subs.forEach(function(s,coll){if(s.listeners.size)load(coll)});window.dispatchEvent(new Event('online'))}});
 es.addEventListener('logout',function(){location.href='/login?expirada=1'});
 es.onerror=function(){if(!down){down=true;window.dispatchEvent(new Event('offline'))}}}
var CMP={'>=':function(a,b){return a>=b},'<=':function(a,b){return a<=b},'>':function(a,b){return a>b},'<':function(a,b){return a<b},'==':function(a,b){return a===b},'!=':function(a,b){return a!==b}};
function collection(coll,flt){return{
 where:function(f,op,v){var c=CMP[op];var prev=flt;return collection(coll,function(d){return(!prev||prev(d))&&d[f]!=null&&c(d[f],v)})},
 orderBy:function(){return collection(coll,flt)},limit:function(){return collection(coll,flt)},
 onSnapshot:function(cb,errCb){ensureStream();var s=subs.get(coll);if(!s){s={cache:new Map(),loaded:false,loading:null,listeners:new Set()};subs.set(coll,s)}
  var l={cb:cb,err:errCb,flt:flt};s.listeners.add(l);if(s.loaded)setTimeout(function(){if(s.listeners.has(l))cb(snap(s,flt))},0);else if(!s.loading)load(coll);
  return function(){s.listeners.delete(l)}},
 doc:function(id){return{
  set:async function(data){await api('/api/db/set',{method:'POST',json:{coll:coll,id:id,data:data}});var s=subs.get(coll);if(s){s.cache.set(id,JSON.parse(JSON.stringify(data)));emit(coll)}},
  update:async function(patch){var s=subs.get(coll);var cur=s&&s.cache.get(id)||{};return this.set(Object.assign({},cur,patch))},
  delete:async function(){await api('/api/db/delete',{method:'POST',json:{coll:coll,id:id}});var s=subs.get(coll);if(s){s.cache.delete(id);emit(coll)}}}}}}
var db={collection:function(p){return collection(String(p))},doc:function(p){var i=String(p).lastIndexOf('/');return collection(String(p).slice(0,i)).doc(String(p).slice(i+1))}};

/* ---------------- arquivos ---------------- */
var assets={
 upload:async function(blob,opts){var type=(opts&&opts.type)||blob.type||'application/octet-stream';
  var headers={'Content-Type':type,'X-File-Name':encodeURIComponent(blob.name||'arquivo')};
  if(opts&&opts.clientId)headers['X-Client-Id']=String(opts.clientId);
  var r=await api('/api/assets',{method:'POST',body:blob,headers:headers});return r},
 delete:async function(id){await api('/api/assets/'+encodeURIComponent(id),{method:'DELETE'})},
 nextcloud:async function(clientId,path){var u='/api/assets/nextcloud/'+encodeURIComponent(clientId);if(path)u+='?path='+encodeURIComponent(path);return api(u)},
 importNextcloud:async function(clientId,path){return api('/api/assets/nextcloud',{method:'POST',json:{clientId:clientId,path:path}})},
 list:async function(){var r=await api('/api/assets');return{assets:r.assets,usage:{}}}};

window.terzoStorage={
 folders:async function(){return api('/api/admin/storage/folders')},
 bindings:async function(){return api('/api/admin/storage/bindings')},
 bind:async function(clientId,folder){return api('/api/admin/storage/bindings/'+encodeURIComponent(clientId),{method:'PUT',json:{folder:folder}})}
};

/* ---------------- quem está usando ---------------- */
var ME=null;
var user={me:async function(){if(!ME)ME=await api('/api/auth/me');return{id:ME.id,email:ME.email,name:ME.name,isOwner:ME.isOwner,canEdit:ME.canEdit,avatarUrl:''}},
 id:async function(){return(await user.me()).id},isOwner:function(){return!!(ME&&ME.isOwner)},canEdit:function(){return!!(ME&&ME.canEdit)},
 profiles:async function(ids){return api('/api/users/profiles?ids='+encodeURIComponent((ids||[]).join(',')))},search:async function(){return[]}};

/* ---------------- downloads ---------------- */
var downloads={save:async function(o){var blob=o.data instanceof Blob?o.data:new Blob([o.data]);var u=URL.createObjectURL(blob);var a=document.createElement('a');a.href=u;a.download=o.filename||'arquivo';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000);return{ok:true}}};

window.claude={use:async function(k){return{db:db,assets:assets,user:user,downloads:downloads}[k]||null}};

/* ---------------- conta: Sair, trocar senha, logins ---------------- */
async function logout(){try{await fetch('/api/auth/logout',{method:'POST',headers:{'X-Terzo':'1'},credentials:'same-origin'})}catch(e){}location.href='/login'}
window.terzoLogout=logout;
function acctBar(){var w=document.getElementById('whoami');if(w&&!document.getElementById('account-menu')&&!document.getElementById('terzo-acct')){var d=document.createElement('div');d.id='terzo-acct';
  d.innerHTML='<button type="button" data-tz="pw">Trocar senha</button>'+(ME&&ME.canEdit?'<a href="/admin">Logins</a>':'')+'<button type="button" data-tz="out">Sair</button>';w.insertAdjacentElement('afterend',d)}
 var g=document.querySelector('#acc-gate .acc-card');if(g&&!g.querySelector('[data-tz="out"]')){var b=document.createElement('button');b.type='button';b.setAttribute('data-tz','out');b.className='tz-gate-out';b.textContent='Sair desta conta';g.appendChild(b)}}
document.addEventListener('click',function(e){var b=e.target.closest('[data-tz]');if(!b)return;if(b.dataset.tz==='out')logout();if(b.dataset.tz==='pw')location.href='/login?trocar=1&voltar=1'});
setInterval(acctBar,800);
var st=document.createElement('style');st.textContent='#terzo-acct{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 4px;font-size:12.5px}#terzo-acct button,#terzo-acct a{border:1px solid var(--line,#ddd);background:none;border-radius:8px;padding:4px 10px;color:inherit;text-decoration:none;cursor:pointer;font:inherit}[data-act="unlink-me"]{display:none!important}.tz-gate-out{margin-top:12px;align-self:flex-start;border:1px solid #ccc;background:#fff;border-radius:10px;padding:8px 14px;cursor:pointer;font:inherit}';
document.addEventListener('DOMContentLoaded',function(){document.head.appendChild(st)});
})();
