/* ================= Janelas modais: estrutura única de rolagem =================
   .mwrap (camada fixa, limitada à tela visível com dvh) > .modal (flex em coluna, nunca maior que a tela)
   > [form#mform opcional, também flex] > .mh (fixo no topo) + .mb (única área que rola) + .mf (botões sempre visíveis).
   O formulário (formModal) ficava fora da estrutura flex: o .mb não encolhia e o .modal cortava o final. */
(()=>{const st=document.createElement('style');st.textContent=`
.mwrap{top:0;bottom:auto;height:100vh;height:100dvh;overscroll-behavior:contain}
.modal{max-height:100%;min-height:0}
.modal>form{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;max-height:100%;margin:0}
.modal .mh,.modal .mf{flex:0 0 auto}
.modal .mh{background:var(--surface);position:relative;z-index:1}
.modal .mb{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.modal .mf{background:var(--surface)}
html.modal-open,html.modal-open body{overflow:hidden}
@media (max-width:820px){.modal{max-height:calc(100% - env(safe-area-inset-top,0px) - 8px)}}
`;(document.body||document.head).appendChild(st)
 const w=document.getElementById('mwrap');if(w){const sync=()=>document.documentElement.classList.toggle('modal-open',!w.hidden);new MutationObserver(sync).observe(w,{attributes:true,attributeFilter:['hidden']});sync()}})();
