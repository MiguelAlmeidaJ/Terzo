#!/usr/bin/env python3
"""Gera apps/web/public/legacy/index.html a partir de base.html + modulos/*.js.
Uso: python3 src/build.py   (Python 3.8+, sem dependências)
base.html  = versão original do CRM; modulos/ = camadas do Terzo aplicadas por cima, em ordem.
Cada módulo é JavaScript comum; funções declaradas depois substituem as anteriores de mesmo nome."""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
M=lambda n:open(os.path.join('modulos',n),encoding='utf-8').read()
src=open('base.html',encoding='utf-8').read()
mod=M('crm_ap.js')+'\n'+M('crm_v2.js')+'\n'+M('crm_cal.js')+'\n'+M('crm_rel.js')+'\n'+M('crm_ops.js')+'\n'+M('crm_agenda.js')+'\n'+M('crm_modal.js')+'\n'+M('crm_obj.js')+'\n'+M('crm_academy.js')+'\n'+M('crm_meudia.js')+'\n'+M('crm_perm.js')+'\n'+M('crm_calflow.js')+'\n'+M('crm_posting.js')+'\n'+M('crm_clientapproval.js')+'\n'+M('crm_access.js')+'\n'+M('crm_teamaccounts.js')+'\n'+M('crm_tasks23.js')+'\n'+M('crm_publication23.js')+'\n'+M('crm_chat2.js')+'\n'+M('crm_layout.js')+'\n'+M('crm_presence23.js')
anchor='\ninit();\n})();\n</script>'
src=src.replace("'<div class=\"note\"><p>Escolha um cliente para gerar sugestões sob medida com IA, usando os objetivos e as observações dele.</p></div>'","''")

import re
OLDCH='   <div class="chips">${objs().map(o=>`<button class="chip obj" data-act="cl-obj" data-id="${id}" data-v="${o.id}" aria-pressed="${(c.objectives||[]).includes(o.id)}">${o.id===c.primaryObjective?\'★ \':\'\'}${esc(o.name)}</button>`).join(\'\')}</div>\n   <p style="font-size:12px;color:var(--muted);margin:8px 0 0">Toque para ligar ou desligar. O foco principal (★) é definido em “Editar”.</p>'
NEWCH='   ${objlView(c)}<button class="lnk" style="margin-top:6px" data-act="edit-client" data-id="${id}">Editar objetivos</button>'
def brand(s):
    s=s.replace('<title>Agência Terceiro Andar</title>','<title>Terzo · Agência Terceiro Andar</title>')
    s=re.sub(r'<div class="brand"><svg viewBox="0 0 100 100".*?</svg>\s*<span><b>CRM Marketing & Processos</b><small>Clientes, projetos e equipe</small></span></div>',
      '<div class="brand"><span class="brand-full"><img src="/brand/logo" alt="Terzo"><small>Agência Terceiro Andar</small></span><span class="brand-mini" aria-hidden="true"><b>t</b><i></i><i></i></span></div>',s,count=1,flags=re.S)
    for a,b2 in [('o CRM é aberto','o Terzo é aberto'),('do CRM','do Terzo'),('o CRM com','o Terzo com'),('Abra o CRM','Abra o Terzo'),('o CRM a reconhece','o Terzo a reconhece'),('pelo CRM','pelo Terzo'),('<h1>Agenda</h1>','<h1>Compromissos</h1>'),('Abrir Agenda →','Abrir Compromissos →'),('<button class="btn sm ghost" style="margin-top:8px" data-act="nav" data-v="comercial">Abrir Comercial →</button>','')]:
        s=s.replace(a,b2)
    return s
src=brand(src)
assert src.count(OLDCH)>=1
src=src.replace(OLDCH,NEWCH)
src=src.replace("{k:'objectives',l:'Outros objetivos',t:'chips',o:objOpts(),full:1}","{k:'objectives',l:'Objetivos do cliente',t:'objlist',o:objOpts(),custom:c.objectivesCustom||[],full:1}")

# --- permissões (pedido "Ajustes de permissões"): exclusão de criativo só admin; indicadores de colegas ocultos
_a="onDelete:isNew?null:async()=>{await removeCreative(c)},delLabel:'Excluir criativo'"
assert src.count(_a)>=1
src=src.replace(_a,"onDelete:(isNew||!isAdmin())?null:async()=>{await removeCreative(c)},delLabel:'Excluir criativo'")
_b="async function removeCreative(c){"
assert src.count(_b)>=1
src=src.replace(_b,"async function removeCreative(c){if(!isAdmin()){toast('Só administradores excluem criativos.');throw new Error('perm')}")
_c='<div class="sec"><h3>Agora</h3>'
assert src.count(_c)>=1
src=src.replace(_c,'${edit||isLeader()?`<div class="sec"><h3>Agora</h3>')
_d='do catálogo publicados</span></div></div>'
assert src.count(_d)==src.count('${edit||isLeader()?`<div class="sec"><h3>Agora</h3>'),(src.count(_d))
src=src.replace(_d,_d+"`:''}")

# --- acesso: visualizar como + gravações bloqueadas nesse modo
_m="const myMember=()=>me.id?S.members.find(m=>m.accountId===me.id):null;"
assert src.count(_m)==1
src=src.replace(_m,"const realMember=()=>me.id?S.members.find(m=>m.accountId===me.id):null;\nconst myMember=()=>{if(typeof ui!=='undefined'&&ui.viewAs){const v=S.members.find(m=>m.id===ui.viewAs);if(v)return v}return realMember()};")
_i="const isAdmin=()=>me.isOwner||me.canEdit||!!myMember()?.admin;"
assert src.count(_i)==1
src=src.replace(_i,"const isAdmin=()=>(!ui.viewAs&&(me.isOwner||me.canEdit))||!!myMember()?.admin;")
for fn in ['put','del']:
    _f="async function %s(col,id"%fn
    assert src.count(_f)==1,fn
    src=src.replace(_f,"async function %s(col,id){if(ui.viewAs&&!['access_req','access_log'].includes(col)){setTimeout(()=>toast('Modo visualização: nada pode ser alterado.'),80);throw new Error('view-as')}return %s0.apply(null,arguments)}\nasync function %s0(col,id"%(fn,fn,fn))
assert src.count(anchor)==1
mod=brand(mod)
out=src.replace(anchor,'\n'+mod+anchor)
rendered=out.replace('<head>','<head><script src="/terzo-runtime.js"></script>',1)
targets=['../public/legacy/index.html']
for target in targets:
    os.makedirs(os.path.dirname(target),exist_ok=True)
    open(target,'w',encoding='utf-8').write(rendered)
print('interface gerada em '+', '.join(targets)+':',len(out),'caracteres')
