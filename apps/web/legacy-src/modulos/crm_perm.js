/* ================= Permissões por perfil (Administrador / Líder / Designer) =================
   Matriz aplicada nesta camada (interface + bloqueio das ações mesmo quando chamadas direto):
   - Criativos: só Administrador exclui (botões, formulário e a ação ap-del/mdel checam isAdmin()).
   - Tarefas: Designer só vê e abre as tarefas em que é responsável (assigneeId/assigneeIds);
     mensagens automáticas de tarefa no chat da equipe só aparecem para a liderança e para os envolvidos.
   - Carteira: Designer abre em "Minha carteira" e pode consultar "Todos os clientes" sem editar.
   - Equipe: só Administrador (aba, troca de view e ações de cadastro/edição/remoção de integrantes).
   Observação: o banco deste artifact só distingue editores do artifact; a regra no servidor
   definitivo é do time de dev (ver resumo entregue ao Thiago). */
ui.ctScope='mine';

/* chat: esconde de quem não é liderança os avisos automáticos de tarefas de outras pessoas */
function chatMsgs(ch){const lead=isLeader();return CHAT.flatMap(d=>(d.msgs||[]).map(m=>({...m,author:d.author,doc:d.id})))
 .filter(m=>{if(lead||!m.sys||m.link?.act!=='task-open')return true;const t=byId('todos',m.link.id);return !!t&&tkMine(t)})
 .sort((a,b)=>(a.at||'').localeCompare(b.at||''))}

/* guarda das ações: roda antes dos handlers originais */
document.addEventListener('click',e=>{const b=e.target.closest('[data-act],[data-v]');if(!b)return;const a=b.dataset.act;const id=b.dataset.id;const v=b.dataset.v;
 const deny=msg=>{e.stopPropagation();e.preventDefault();e.stopImmediatePropagation();toast(msg)};
 if(a==='nav'&&v==='clientes'&&b.closest('#nav,#mobnav')){ui.ctScope='mine';ui.stClient='';return}
 if(['new-member','edit-member','remove-member','remove-member-ok','unlink-member'].includes(a)&&!isAdmin())return deny('Só administradores gerenciam a equipe.');
 if(a==='nav'&&v==='equipe'&&!isAdmin())return deny('A área Equipe é exclusiva dos administradores.');
 if(['ap-del','cr-del','mdel'].includes(a)&&!isAdmin()){if(a!=='mdel'||$('#mform')&&/Excluir criativo/.test(b.textContent))return deny('Só administradores excluem criativos.')}
 if(a==='cl-logo'&&!isAdmin())return deny('Só administradores alteram o cadastro do cliente.');
 if(a==='st-post'){const c=byId('clients',id);if(c&&relConsult(c))return deny('Este cliente é de outra carteira. Você está em modo consulta.')}
 if(a==='task-open'){const t=byId('todos',id);if(t&&!tkCanSee(t))return deny('Esta tarefa é de outro integrante da equipe.')}
 if(a==='ct-scope'){e.stopPropagation();e.preventDefault();ui.ctScope=v==='all'?'all':'mine';refresh();return}
 if(a==='tq-open'){e.stopPropagation();e.preventDefault();const p=$('#tq-pop');if(!p)return;p.hidden=!p.hidden;b.setAttribute('aria-expanded',String(!p.hidden));if(!p.hidden)p.querySelector('select')?.focus();return}
 if(a==='tq-apply'||a==='tq-clear'){e.stopPropagation();e.preventDefault();
  if(a==='tq-clear')Object.assign(ui,TQ_DEF);else document.querySelectorAll('#tq-pop [data-tqp]').forEach(s=>{ui[s.dataset.tqp]=s.value});
  if(!isLeader())ui.tqWho='all';tqSave();refresh();return}
},true);
/* fecha o painel de filtros ao clicar fora ou com Esc */
document.addEventListener('click',e=>{const p=$('#tq-pop');if(p&&!p.hidden&&!e.target.closest('.tq-wrap')){p.hidden=true;$('.tq-btn')?.setAttribute('aria-expanded','false')}});
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const p=$('#tq-pop');if(p&&!p.hidden){p.hidden=true;$('.tq-btn')?.focus()}});

(()=>{const st=document.createElement('style');st.textContent=`
.tq-bar{display:flex;align-items:center;justify-content:space-between;gap:10px}
.tq-sum{font-size:13.5px;color:var(--muted)}
.tq-wrap{position:relative}
.tq-btn{display:inline-flex;align-items:center;gap:8px}.tq-btn svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round}
.tq-n{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:var(--ink);color:var(--surface);font-size:11.5px;font-weight:700}
.tq-pop{position:absolute;right:0;top:calc(100% + 8px);z-index:30;width:min(560px,calc(100vw - 32px));background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.14);padding:16px}
.tq-pop[hidden]{display:none}
.tq-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px}
.tq-f{display:flex;flex-direction:column;gap:5px;min-width:0}.tq-f>span{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:700}
.tq-f .sel{width:100%;min-width:0}
.tq-ft{display:flex;align-items:center;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--line)}
.ct-sw{display:inline-flex;gap:2px;padding:3px;background:var(--surface-2,var(--bg));border:1px solid var(--line);border-radius:11px;align-self:flex-start}
.ct-sw button{border:0;background:none;padding:7px 14px;border-radius:8px;font-weight:600;font-size:14px;color:var(--muted)}
.ct-sw button .num{opacity:.6;margin-left:4px}
.ct-sw button[aria-selected="true"]{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.1)}
.rc-consult{margin:0;padding:10px 14px;border:1px dashed var(--line);border-radius:10px;color:var(--muted);font-size:13.5px}
@media (max-width:560px){.tq-grid{grid-template-columns:1fr}.tq-pop{position:fixed;left:16px;right:16px;top:auto;bottom:16px;width:auto;max-height:80dvh;overflow:auto}}
`;(document.body||document.head).appendChild(st)})();
