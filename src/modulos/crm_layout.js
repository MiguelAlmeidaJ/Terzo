/* ================= Layout: sidebar recolhível + header da conta ================= */
(()=>{const st=document.createElement('style');st.textContent=`
.app{grid-template-columns:228px minmax(0,1fr);transition:grid-template-columns .22s ease}
.side{padding:20px 14px;gap:18px;z-index:30;overflow-x:hidden;transition:padding .22s ease}
.side>#whoami{display:none}
.brand{height:58px;padding:0 6px;display:flex;align-items:center;overflow:hidden}
.brand-full{display:flex;flex-direction:column;align-items:flex-start;gap:5px;white-space:nowrap}
.brand-full img{display:block;width:142px;height:auto}
.brand-full small{margin:0;color:var(--muted);font-size:11.5px}
.brand-mini{display:none;width:40px;height:40px;position:relative;align-items:center;justify-content:center;color:var(--ink)}
.brand-mini b{font-family:var(--f-display);font-size:30px;line-height:1;transform:translate(-5px,-2px)}
.brand-mini i{position:absolute;left:20px;width:17px;height:5px;border-radius:2px;background:var(--brand-red)}
.brand-mini i:nth-of-type(1){top:12px}.brand-mini i:nth-of-type(2){top:21px;background:var(--ink)}
.nav button{min-height:42px;transition:background-color .15s,color .15s}
.nav button svg{transition:color .15s;flex:none}
.nav button:hover svg,.nav button:focus-visible svg,.nav button[aria-current="page"] svg{color:var(--brand-red)}
.nav button span:not(.badge){white-space:nowrap}
.content-shell{min-width:0}
main{padding:0 0 40px;min-width:0}
.wrap{padding:24px max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px))}
.topbar{height:72px;position:sticky;top:0;z-index:25;display:flex;align-items:center;gap:12px;padding:10px max(18px,calc(env(safe-area-inset-right,0px) + 10px)) 10px max(18px,calc(env(safe-area-inset-left,0px) + 10px));background:color-mix(in srgb,var(--surface) 94%,transparent);border-bottom:1px solid var(--line);backdrop-filter:blur(14px)}
.topbar-spacer{flex:1}
.side-toggle{width:40px;height:40px;display:grid;place-items:center;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--muted)}
.side-toggle:hover{color:var(--brand-red);border-color:color-mix(in srgb,var(--brand-red) 45%,var(--line));background:var(--accent-soft)}
.side-toggle svg{width:20px;height:20px}
.account-menu-wrap{position:relative}
.account-trigger{display:flex;align-items:center;gap:10px;min-width:210px;padding:6px 9px 6px 7px;border:1px solid transparent;border-radius:12px;background:transparent;text-align:left}
.account-trigger:hover,.account-trigger[aria-expanded="true"]{background:var(--surface-2);border-color:var(--line)}
.header-avatar{width:36px;height:36px;display:grid;place-items:center;flex:none}
.header-avatar .av{width:36px!important;height:36px!important}
.account-copy{display:flex;flex:1;min-width:0;flex-direction:column}
.account-copy b,.account-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.account-copy b{font-size:13.5px}.account-copy small{font-size:11.5px;color:var(--muted)}
.account-chevron{width:16px;height:16px;color:var(--muted);transition:transform .16s}
.account-trigger[aria-expanded="true"] .account-chevron{transform:rotate(180deg)}
.account-dropdown{position:absolute;right:0;top:calc(100% + 8px);width:230px;padding:7px;background:var(--surface);border:1px solid var(--line);border-radius:13px;box-shadow:0 16px 45px rgba(12,12,12,.16)}
.account-dropdown button{width:100%;display:flex;align-items:center;gap:10px;border:0;border-radius:9px;background:transparent;padding:10px;text-align:left;font-size:13.5px;font-weight:600}
.account-dropdown button:hover,.account-dropdown button:focus-visible{background:var(--surface-2);color:var(--brand-red)}
.account-dropdown button:disabled{opacity:.45;cursor:not-allowed}
.account-item-icon{width:20px;text-align:center;font-size:17px;color:var(--muted)}
.account-separator{display:block;height:1px;background:var(--line);margin:5px 3px}
.account-dropdown .account-logout{color:var(--crit)}
.app[data-side-collapsed="true"]{grid-template-columns:76px minmax(0,1fr)}
.app[data-side-collapsed="true"] .side{padding-inline:10px}
.app[data-side-collapsed="true"] .brand{padding:0;justify-content:center}
.app[data-side-collapsed="true"] .brand-full,.app[data-side-collapsed="true"] #whoami,.app[data-side-collapsed="true"] .sync{display:none}
.app[data-side-collapsed="true"] .brand-mini{display:flex}
.app[data-side-collapsed="true"] .nav button{justify-content:center;padding-inline:10px}
.app[data-side-collapsed="true"] .nav button span{display:none}
.app[data-side-collapsed="true"] .nav button[aria-current="page"]::before{left:-10px}
.app[data-side-collapsed="true"] .nav .badge{display:grid;position:absolute;top:2px;right:1px;min-width:17px;height:17px;place-items:center;padding:0 4px;font-size:9px}
@media (prefers-reduced-motion:reduce){.app,.side{transition:none}}
@media (max-width:820px){
 .app,.app[data-side-collapsed="true"]{grid-template-columns:1fr}
 .side-toggle{display:none}.topbar{height:64px;padding-block:8px}
 main{padding:0 0 96px}.wrap{padding-top:16px}
 .account-trigger{min-width:0}.account-copy{display:none}.account-dropdown{position:fixed;top:70px;right:12px}
}
`;document.head.appendChild(st)})();

const layoutApp=document.querySelector('.app');
const sideToggle=document.getElementById('side-toggle');
const accountTrigger=document.getElementById('account-trigger');
const accountMenu=document.getElementById('account-menu');

function setSideCollapsed(collapsed){
 if(!layoutApp||!sideToggle)return;
 layoutApp.dataset.sideCollapsed=String(collapsed);
 sideToggle.setAttribute('aria-expanded',String(!collapsed));
 sideToggle.setAttribute('aria-label',collapsed?'Expandir menu lateral':'Recolher menu lateral');
 try{localStorage.setItem('terzo-sidebar-collapsed',collapsed?'1':'0')}catch(e){}
}
try{setSideCollapsed(localStorage.getItem('terzo-sidebar-collapsed')==='1')}catch(e){setSideCollapsed(false)}

function closeAccountMenu(){if(!accountMenu||!accountTrigger)return;accountMenu.hidden=true;accountTrigger.setAttribute('aria-expanded','false')}
function toggleAccountMenu(){if(!accountMenu||!accountTrigger)return;const willOpen=accountMenu.hidden;accountMenu.hidden=!willOpen;accountTrigger.setAttribute('aria-expanded',String(willOpen));if(willOpen)accountMenu.querySelector('button:not(:disabled)')?.focus()}
function renderHeaderAccount(){
 const mm=mode==='wait'?null:myMember();
 const name=mm?.name||me.name||'Minha conta';
 const role=mm?`${mm.area||'Equipe'}${isAdmin()?' · Administrador':''}`:(me.email||'Perfil');
 const avatar=document.getElementById('header-avatar'),nameEl=document.getElementById('header-name'),roleEl=document.getElementById('header-role');
 if(nameEl)nameEl.textContent=name;if(roleEl)roleEl.textContent=role;
 if(avatar)avatar.innerHTML=mm?meAv(mm,36):`<span class="av" style="width:36px;height:36px;background:var(--brand-red)">${esc(initials(name))}</span>`;
 const profile=accountMenu?.querySelector('[data-header-action="profile"]');
 if(profile){profile.dataset.id=mm?.id||'';profile.disabled=!mm}
}

const layoutRenderNav=renderNav;
renderNav=function(){layoutRenderNav();document.querySelectorAll('#nav button').forEach(b=>b.title=b.dataset.v==='academy'?'Terzo Academy':(b.querySelector('span:not(.badge)')?.textContent||''));renderHeaderAccount()};

sideToggle?.addEventListener('click',()=>setSideCollapsed(layoutApp?.dataset.sideCollapsed!=='true'));
accountTrigger?.addEventListener('click',e=>{e.stopPropagation();toggleAccountMenu()});
document.addEventListener('click',e=>{
 const profile=e.target.closest('[data-header-action="profile"]');
 if(profile){closeAccountMenu();if(profile.dataset.id)profileView(profile.dataset.id);return}
 if(!e.target.closest('.account-menu-wrap'))closeAccountMenu();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAccountMenu()});
