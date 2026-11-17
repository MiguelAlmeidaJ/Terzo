/* ================= Terceiro Andar Academy =================
   Coleções próprias: acad_tracks (1 documento por trilha: dados, módulos e aulas; arquivos ficam nos assets, só o id fica aqui)
   e acad_progress (1 documento por pessoa, id = conta do usuário: aulas concluídas, trilhas, avaliações e entregas).
   Regras do banco: só editores do artifact gravam acad_tracks; cada pessoa só grava o próprio acad_progress/{self}. */
COLS.push('acad_tracks','acad_progress','acad_home');S.acad_tracks=[];S.acad_progress=[];S.acad_home=[];
IC.academy='<path d="M2 9.5 12 4.5l10 5-10 5z"/><path d="M6 11.6V16c0 1.6 2.7 3.2 6 3.2s6-1.6 6-3.2v-4.4"/><path d="M22 9.5V15"/>';
VIEWS.push(['academy','Terzo<br><small>Academy</small>','Academy']);if(!VIEWS_COM.includes('academy'))VIEWS_COM.push('academy');
ui.ac={v:'home',t:'',l:''};ui.acQ='';ui.acFmt='all';ui.acTeam={who:'all',t:'all',per:'all'};
const AC_AREAS=['Design','Marketing e conteúdo','Audiovisual','Ferramentas e produtividade','Clientes e processos'];
const AC_LEVELS=['Básico','Intermediário','Avançado'];

(()=>{const st=document.createElement('style');st.textContent=`
.nav button[data-v="academy"]{margin-top:16px;color:var(--ink)}
.nav button[data-v="academy"]::after{content:"";position:absolute;left:6px;right:6px;top:-9px;border-top:1px solid var(--line)}
.nav button[data-v="academy"] svg{color:var(--brand-red)}
.nav button[data-v="academy"]>span{font-size:13px;line-height:1.15}
.nav button[data-v="academy"]>span small{display:block;font-size:11.5px;font-weight:600;color:var(--muted);margin-top:2px}
.ac-top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.ac-brand{display:flex;align-items:center;gap:10px;font-family:var(--f-display);font-weight:700;font-size:15px}
.ac-brand i{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--brand-bg);color:#fff}.ac-brand i svg{width:20px;height:20px}
.ac-brand small{display:block;font-family:var(--f-body);font-weight:500;font-size:12px;color:var(--muted)}
.ac-hero{position:relative;overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:30px clamp(18px,4vw,40px);display:grid;grid-template-columns:1.4fr 1fr;gap:24px;align-items:center}
.ac-hero h1{font-size:clamp(26px,3.4vw,36px);line-height:1.08}.ac-hero p{margin:10px 0 0;color:#46463F;font-size:16px;max-width:56ch;line-height:1.55}
.ac-hero .kick{font-family:var(--f-mono);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--brand-red);font-weight:600}
.ac-art{height:150px;position:relative}
.ac-sec{display:flex;flex-direction:column;gap:12px}
.ac-sec>header{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}
.ac-sec h2{font-size:19px}.ac-sec>header small{color:var(--muted);font-size:13px}
.ac-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}
.ac-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;text-align:left;color:inherit;padding:0;transition:box-shadow .2s,transform .2s;min-width:0}
.ac-card:hover{box-shadow:0 10px 30px rgba(12,12,12,.08);transform:translateY(-2px)}
.ac-cv{aspect-ratio:16/7;position:relative;overflow:hidden;background:#F1F0EC}.ac-cv svg,.ac-cv img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.ac-cv .lv{position:absolute;left:12px;top:12px;background:rgba(255,255,255,.92);border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:700;color:var(--ink)}
.ac-cv .lock{position:absolute;right:12px;top:12px;background:rgba(12,12,12,.75);color:#fff;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:600}
.ac-cb{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1}
.ac-cb b{font-family:var(--f-display);font-size:16.5px;line-height:1.2}.ac-cb p{margin:0;color:var(--muted);font-size:13.5px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ac-meta{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12.5px;color:var(--muted)}
.ac-prog{display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--muted);margin-top:auto}.ac-prog .bar{flex:1;height:6px}.ac-prog .bar>i{background:var(--brand-red)}
.ac-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.ac-kpis>div{padding:14px 16px;border-left:1px solid var(--line)}.ac-kpis>div:first-child{border-left:0}
.ac-kpis span{display:block;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:700}.ac-kpis b{display:block;font-family:var(--f-display);font-size:26px;margin-top:4px}.ac-kpis small{display:block;font-size:12px;color:var(--muted)}
.ac-area{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:6px 0 -4px}
.ac-search{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ac-list{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.ac-li{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:12px 16px;border:0;border-top:1px solid var(--line);background:none;width:100%;text-align:left;color:inherit}
.ac-li:first-child{border-top:0}.ac-li:hover{background:var(--bg)}.ac-li b{font-size:14.5px}.ac-li small{grid-column:1/-1;color:var(--muted);font-size:12.5px}
.ac-tag{font-size:12px;color:var(--muted);white-space:nowrap}
/* trilha */
.ac-th{display:grid;grid-template-columns:1.1fr 1fr;gap:0;background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden}
.ac-th .ac-cv{aspect-ratio:auto;min-height:240px}
.ac-thb{padding:24px clamp(16px,3vw,30px);display:flex;flex-direction:column;gap:12px}
.ac-thb h1{font-size:clamp(24px,3vw,30px)}.ac-thb p{margin:0;color:#46463F;line-height:1.55}
.ac-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;border-top:1px solid var(--line);padding-top:12px}
.ac-facts span{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:700}.ac-facts b{font-size:14.5px}
.ac-mods{display:flex;flex-direction:column;gap:10px}
.ac-mod{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.ac-mod>header{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--line)}
.ac-mod>header b{font-size:15px}.ac-mod>header small{color:var(--muted);font-size:12.5px;white-space:nowrap}
.ac-les{display:grid;grid-template-columns:28px 1fr auto;gap:12px;align-items:center;padding:11px 16px;border:0;border-top:1px solid var(--line);background:none;width:100%;text-align:left;color:inherit}
.ac-les:first-of-type{border-top:0}.ac-les:hover{background:var(--bg)}.ac-les[disabled]{opacity:.55;cursor:not-allowed}
.ac-les small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
.ac-st{width:24px;height:24px;border-radius:50%;border:2px solid var(--line);display:grid;place-items:center;font-size:12px;color:#fff}
.ac-st.done{background:var(--ok);border-color:var(--ok)}.ac-st.cur{border-color:var(--brand-red);box-shadow:inset 0 0 0 4px #fff,inset 0 0 0 12px var(--brand-red)}.ac-st.lock{border-style:dashed}
/* aula */
.ac-lw{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px;align-items:start}
.ac-main{display:flex;flex-direction:column;gap:16px;min-width:0}
.ac-side{position:sticky;top:16px;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;max-height:calc(100vh - 32px);display:flex;flex-direction:column}
.ac-side>header{padding:14px 16px;border-bottom:1px solid var(--line)}.ac-side>header b{display:block;font-size:14.5px}.ac-side>header .bar{margin-top:8px;height:6px}.ac-side>header .bar>i{background:var(--brand-red)}
.ac-side nav{overflow-y:auto;padding:6px 0}
.ac-side h4{margin:10px 16px 4px;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.ac-side button{display:grid;grid-template-columns:22px 1fr;gap:10px;align-items:center;width:100%;border:0;background:none;text-align:left;padding:7px 16px;color:inherit;font-size:13.5px}
.ac-side button:hover{background:var(--bg)}.ac-side button[aria-current="page"]{background:#FCEFF1;font-weight:700}.ac-side button[disabled]{opacity:.5;cursor:not-allowed}
.ac-side .ac-st{width:20px;height:20px;font-size:10px}
.ac-lh .crumb{font-size:13px;color:var(--muted)}.ac-lh h1{font-size:clamp(22px,2.8vw,28px);margin-top:4px}.ac-lh p{margin:8px 0 0;color:#46463F}
.ac-box{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px clamp(16px,2.6vw,26px)}
.ac-box>h3{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-family:var(--f-body);margin-bottom:10px}
.ac-text{font-size:15.5px;line-height:1.7;color:#24241F;max-width:74ch}
.ac-text h3{font-family:var(--f-display);font-size:18px;margin:22px 0 6px;color:var(--ink);letter-spacing:-.01em;text-transform:none}.ac-text p{margin:0 0 12px}
.ac-text ul,.ac-text ol{margin:0 0 12px;padding-left:22px}.ac-text li{margin:4px 0}
.ac-text blockquote{margin:14px 0;border-left:3px solid var(--brand-red);background:#FBF7F3;padding:10px 14px;border-radius:0 10px 10px 0}
.ac-video{position:relative;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden}.ac-video iframe,.ac-video video{position:absolute;inset:0;width:100%;height:100%;border:0}
.ac-pdf{width:100%;height:min(72vh,820px);border:1px solid var(--line);border-radius:12px;background:#F4F4F2}
.ac-pend{display:flex;gap:12px;align-items:flex-start;background:#FBF7F3;border:1px dashed #E5D7C8;border-radius:12px;padding:12px 14px;font-size:14px;color:#5E5348}
.ac-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;position:sticky;bottom:0;background:linear-gradient(transparent,var(--bg) 30%);padding:14px 0 4px}
.ac-q{border-top:1px solid var(--line);padding:14px 0}.ac-q:first-child{border-top:0;padding-top:0}.ac-q b{display:block;margin-bottom:8px;font-size:15px}
.ac-opt{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border:1px solid var(--line);border-radius:10px;margin-top:6px;cursor:pointer;font-size:14.5px}
.ac-opt input{margin-top:3px;accent-color:var(--brand-red)}.ac-opt.ok{border-color:var(--ok);background:#EEF8F2}.ac-opt.no{border-color:var(--crit);background:#FDF0EA}
.ac-exp{font-size:13px;color:var(--muted);margin-top:6px}
.ac-res{display:flex;gap:10px;align-items:center;font-weight:700;font-size:14.5px}.ac-res.ok{color:var(--ok)}.ac-res.no{color:var(--crit)}
.ac-files{display:flex;flex-wrap:wrap;gap:8px}
/* gestão */
.ac-adm-row{display:grid;grid-template-columns:72px 1fr auto;gap:14px;align-items:center;padding:12px 16px;border-top:1px solid var(--line)}.ac-adm-row:first-child{border-top:0}
.ac-adm-row .ac-cv{aspect-ratio:16/10;border-radius:8px}
.ac-ed-l{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:9px 16px;border-top:1px solid var(--line);font-size:14px}
.ac-ed-l small{display:block;color:var(--muted);font-size:12px}
.ac-mini{display:flex;gap:4px;flex-wrap:wrap}.ac-mini .btn{padding:4px 9px;font-size:12.5px}
.ac-tbl{width:100%;border-collapse:collapse;font-size:14px}.ac-tbl th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);text-align:left;padding:10px 12px;border-bottom:1px solid var(--line)}
.ac-tbl td{padding:10px 12px;border-bottom:1px solid var(--line)}.ac-tbl tr.click{cursor:pointer}.ac-tbl tr.click:hover td{background:var(--bg)}
@media (max-width:1000px){.ac-lw{grid-template-columns:1fr}.ac-side{position:static;max-height:none}.ac-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.ac-kpis>div:nth-child(4){border-left:0}.ac-kpis>div:nth-child(n+4){border-top:1px solid var(--line)}}
@media (max-width:700px){.ac-hero{grid-template-columns:1fr}.ac-art{display:none}.ac-th{grid-template-columns:1fr}.ac-th .ac-cv{min-height:150px}.ac-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.ac-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.ac-kpis>div{border-left:0!important;border-top:1px solid var(--line)}.ac-kpis>div:nth-child(-n+2){border-top:0}.ac-adm-row{grid-template-columns:1fr}.ac-adm-row .ac-cv{display:none}}
`;(document.body||document.head).appendChild(st)})();

/* ---------- capas (SVG geradas, ou imagem enviada pelo administrador) ---------- */
function acCoverSvg(k,seed){const P={design:['#F5C518','#FFFFFF','#0C0C0C'],mkt:['#0C0C0C','#F5C518','#FFFFFF'],av:['#F4F3EF','#F5C518','#0C0C0C'],ia:['#0C0C0C','#F5C518','#FFFFFF'],cx:['#F5C518','#FFFFFF','#0C0C0C']}[k]||['#F5C518','#FFFFFF','#0C0C0C'];
 const r=n=>{let x=Math.sin((seed||1)*9301+n*49297)*233280;return x-Math.floor(x)};
 let g='';if(k==='design'){for(let i=0;i<5;i++)g+=`<rect x="${40+i*70}" y="${30+r(i)*60}" width="${40+r(i+9)*120}" height="18" rx="5" fill="${i%2?P[2]:P[1]}" opacity="${i%2?.85:.9}"/>`;g+=`<circle cx="470" cy="80" r="46" fill="none" stroke="${P[2]}" stroke-width="3"/>`}
 else if(k==='mkt'){for(let i=0;i<6;i++)g+=`<rect x="${70+i*62}" y="${170-(30+i*18+r(i)*20)}" width="38" height="${30+i*18+r(i)*20}" rx="6" fill="${i===5?P[1]:P[2]}" opacity="${i===5?1:.18+i*.1}"/>`;g+=`<path d="M70 120 L190 90 L300 70 L430 30" stroke="${P[1]}" stroke-width="4" fill="none" stroke-linecap="round"/>`}
 else if(k==='av'){g+=`<rect x="60" y="40" width="250" height="140" rx="16" fill="${P[2]}"/><path d="M165 80 L215 110 L165 140z" fill="#fff"/>`;for(let i=0;i<4;i++)g+=`<rect x="${340+i*44}" y="60" width="30" height="${40+r(i)*80}" rx="6" fill="${P[1]}" opacity=".85"/>`}
 else if(k==='ia'){for(let y=0;y<4;y++)for(let x=0;x<9;x++){const on=r(x*7+y)>.62;g+=`<circle cx="${70+x*48}" cy="${45+y*40}" r="${on?9:5}" fill="${on?P[1]:P[2]}" opacity="${on?1:.2}"/>`}}
 else{g+=`<rect x="60" y="40" width="220" height="90" rx="22" fill="${P[2]}"/><path d="M100 130 L95 160 L130 130z" fill="${P[2]}"/><rect x="300" y="80" width="220" height="80" rx="22" fill="${P[1]}"/><path d="M480 160 L490 185 L455 160z" fill="${P[1]}"/>`}
 return `<svg viewBox="0 0 560 210" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="560" height="210" fill="${P[0]}"/>${g}</svg>`}
function acCover(t){const c=t.cover||{};const seed=[...String(t.id)].reduce((s,ch)=>s+ch.charCodeAt(0),0);return c.asset?`<img src="/_blob/${esc(c.asset)}" alt="">`:acCoverSvg(c.k||'design',seed)}

/* ---------- dados e regras ---------- */
const acAdmin=()=>isAdmin();const acLead=()=>isLeader();
const acUid=()=>me.id||'';
function acProg(uid){uid=uid||acUid();const d=S.acad_progress.find(p=>p.id===uid);return{lessons:{},tracks:{},quiz:{},subs:{},...(d||{})}}
function acCanSee(t,m){const other=!!m;m=m||myMember();if(!t.published&&(other||!acAdmin()))return false;if(!other&&acAdmin())return true;return t.access==='all'||!Array.isArray(t.access)||!t.access.length||(!!m&&t.access.includes(m.id))}
const acTracks=()=>S.acad_tracks.filter(t=>acCanSee(t)).sort((a,b)=>(a.order??99)-(b.order??99));
const acFlat=t=>(t.modules||[]).flatMap((m,mi)=>(m.lessons||[]).map((l,li)=>({l,m,mi,li})));
const acDone=(p,id)=>!!p.lessons?.[id];
function acStat(t,p){const F=acFlat(t);const d=F.filter(x=>acDone(p,x.l.id)).length;return{total:F.length,done:d,pct:F.length?Math.round(d/F.length*100):0,started:!!p.tracks?.[t.id]?.startedAt||d>0,complete:F.length>0&&d===F.length}}
function acLocked(t,idx,p){if(acAdmin())return false;if(!t.sequential||idx<=0)return false;const F=acFlat(t);return !acDone(p,F[idx-1].l.id)}
function acPrereqMissing(t,p){return (t.prereq||[]).map(id=>S.acad_tracks.find(x=>x.id===id)).filter(x=>x&&!acStat(x,p).complete)}
function acHours(t){if(t.hours)return t.hours;const m=acFlat(t).reduce((s,x)=>s+(+x.l.min||0),0);return m?((m/60).toFixed(m>=90?0:1).replace('.',',')+' h de leitura e prática'):'A definir'}
function acNext(t,p){const F=acFlat(t);const last=p.tracks?.[t.id]?.last;const i=F.findIndex(x=>!acDone(p,x.l.id));if(last&&F.some(x=>x.l.id===last)&&!acDone(p,last))return last;return (F[i]||F[F.length-1])?.l.id}
function acMd(s){const lines=String(s||'').split('\n');let h='',list='';const inl=x=>esc(x).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');const flush=()=>{if(list){h+=list+(list.startsWith('<ul')?'</ul>':'</ol>');list=''}};let para=[];
 const fp=()=>{if(para.length){h+=`<p>${inl(para.join(' '))}</p>`;para=[]}};
 for(const ln of lines){const t=ln.trim();if(!t){fp();flush();continue}
  if(t.startsWith('## ')){fp();flush();h+=`<h3>${inl(t.slice(3))}</h3>`}
  else if(t.startsWith('> ')){fp();flush();h+=`<blockquote>${inl(t.slice(2))}</blockquote>`}
  else if(/^- (\[ \] )?/.test(t)){fp();if(!list.startsWith('<ul')){flush();list='<ul>'}list+=`<li>${inl(t.replace(/^- (\[ \] )?/,''))}</li>`}
  else if(/^\d+\. /.test(t)){fp();if(!list.startsWith('<ol')){flush();list='<ol>'}list+=`<li>${inl(t.replace(/^\d+\. /,''))}</li>`}
  else{flush();para.push(t)}}
 fp();flush();return h}
function acVideoHtml(v){if(!v)return'';const a=String(v);let src='',kind='frame';
 if(a.startsWith('asset:'))return `<div class="ac-video"><video controls preload="metadata" src="/_blob/${esc(a.slice(6))}"></video></div>`;
 let m;if((m=a.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/)))src='https://www.youtube-nocookie.com/embed/'+m[1];
 else if((m=a.match(/vimeo\.com\/(?:video\/)?(\d+)/)))src='https://player.vimeo.com/video/'+m[1];
 else if((m=a.match(/drive\.google\.com\/file\/d\/([\w-]+)/)))src='https://drive.google.com/file/d/'+m[1]+'/preview';
 else if((m=a.match(/loom\.com\/share\/([\w]+)/)))src='https://www.loom.com/embed/'+m[1];
 else if(/\.(mp4|webm|m4v)(\?|$)/i.test(a)){kind='video';src=a}
 if(!src)return `<div class="ac-pend"><span>▶</span><div>Este vídeo não pode ser exibido aqui. <a href="${esc(a)}" target="_blank" rel="noopener">Abrir o vídeo em outra aba ↗</a></div></div>`;
 return `<div class="ac-video">${kind==='video'?`<video controls preload="metadata" src="${esc(src)}"></video>`:`<iframe src="${esc(src)}" title="Vídeo da aula" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>`}</div>
 <p style="margin:6px 0 0;font-size:12.5px;color:var(--muted)">Não carregou? <a href="${esc(a)}" target="_blank" rel="noopener">Abrir o vídeo em outra aba ↗</a></p>`}
async function acSaveProg(fn){const uid=acUid();if(!uid){toast('Vincule a sua conta para registrar o seu progresso.');return}const cur=JSON.parse(JSON.stringify(acProg(uid)));delete cur.id;const next=fn(cur)||cur;next.lastAt=new Date().toISOString();next.memberId=myMember()?.id||next.memberId||'';
 try{await put('acad_progress',uid,next)}catch(e){}}
async function acSaveTrack(t){const rec={...t};delete rec.id;await put('acad_tracks',t.id,rec)}

/* ---------- telas ---------- */
function acTop(){const lead=acLead(),adm=acAdmin();const v=ui.ac.v;
 return `<div class="ac-top"><div class="ac-brand"><i>${svg('academy')}</i><span>Terceiro Andar Academy<small>Conhecimento, desenvolvimento e evolução profissional</small></span></div>
 <div class="tabs" role="tablist"><button role="tab" data-act="ac-go" data-v="home" aria-selected="${['home','track','lesson'].includes(v)}">Aprender</button>${lead?`<button role="tab" data-act="ac-go" data-v="team" aria-selected="${v==='team'}">Desenvolvimento da equipe</button>`:''}${adm?`<button role="tab" data-act="ac-go" data-v="admin" aria-selected="${v==='admin'||v==='edit'}">Gerenciar conteúdo</button>`:''}</div></div>`}
function acCard(t,p,cta){const s=acStat(t,p);const miss=acPrereqMissing(t,p);
 return `<button class="ac-card" data-act="ac-track" data-id="${esc(t.id)}"><div class="ac-cv">${acCover(t)}<span class="lv">${esc(t.level||'')}</span>${miss.length?'<span class="lock">Pré-requisito</span>':!t.published?'<span class="lock">Rascunho</span>':''}</div>
  <div class="ac-cb"><b>${esc(t.title)}</b><p>${esc(t.desc||'')}</p><div class="ac-meta"><span>${(t.modules||[]).length} módulos</span><span>${s.total} aulas</span><span>${esc(acHours(t))}</span></div>
  ${s.started?`<div class="ac-prog"><div class="bar"><i style="width:${s.pct}%"></i></div><span>${s.complete?'Concluída':s.done+'/'+s.total+' aulas · '+s.pct+'%'}</span></div>`:''}${cta?`<span class="btn sm primary" style="align-self:flex-start;margin-top:4px">${cta}</span>`:''}</div></button>`}
function acHomeVideo(){const h=S.acad_home.find(x=>x.id==='main')||{};if(h.video)return acVideoHtml(h.video)+(h.caption?`<p class="ac-hvc">${esc(h.caption)}</p>`:'');
 return `<div class="ac-hv-empty"><span class="pl">▶</span><b>Vídeo de boas-vindas</b><small>${acAdmin()?'Adicione em “Gerenciar conteúdo”.':'Em breve.'}</small>${acAdmin()?'<button class="btn sm" data-act="ac-go" data-v="admin">Adicionar vídeo</button>':''}</div>`}
function acHome(){const p=acProg();const T=acTracks();const mm=myMember();
 const going=T.filter(t=>{const s=acStat(t,p);return s.started&&!s.complete}).sort((a,b)=>(p.tracks?.[b.id]?.lastAt||'').localeCompare(p.tracks?.[a.id]?.lastAt||''));
 const st=T.map(t=>acStat(t,p));const lessonsDone=Object.keys(p.lessons||{}).length;const mins=T.flatMap(acFlat).filter(x=>acDone(p,x.l.id)).reduce((s,x)=>s+(+x.l.min||0),0);
 const totalL=st.reduce((s,x)=>s+x.total,0),doneL=st.reduce((s,x)=>s+x.done,0);
 const q=ui.acQ.trim().toLowerCase();const fm=ui.acFmt;
 const lessons=T.flatMap(t=>acFlat(t).map(x=>({...x,t}))).filter(x=>(!q||[x.l.title,x.l.desc,x.t.title,x.m.title].some(s=>String(s||'').toLowerCase().includes(q)))&&(fm==='all'||(fm==='video'&&x.l.video)||(fm==='pdf'&&(x.l.pdfs||[]).length)||(fm==='texto'&&x.l.text)||(fm==='quiz'&&x.l.quiz)||(fm==='pratica'&&x.l.submit)));
 return `${acTop()}
 <section class="ac-hero"><div><div class="kick">Bem-vindo${mm?', '+esc(mm.name.split(' ')[0]):''}</div><h1>Bem-vindo à Terceiro Andar Academy.</h1><p>Aqui, o conhecimento se transforma em evolução. Explore nossas trilhas, desenvolva novas habilidades e aprimore sua capacidade de criar, comunicar e entregar resultados.</p></div>
  <div class="ac-hv">${acHomeVideo()}</div></section>
 ${going.length?`<section class="ac-sec"><header><h2>Continue aprendendo</h2><small>${going.length} trilha${going.length>1?'s':''} em andamento</small></header><div class="ac-grid">${going.map(t=>acCard(t,p,'Continuar aprendendo')).join('')}</div></section>`:''}
 <section class="ac-sec"><header><h2>Trilhas de aprendizagem</h2><small>${T.length} trilhas · organizadas por área</small></header>
  ${AC_AREAS.concat([...new Set(T.map(t=>t.area))].filter(a=>!AC_AREAS.includes(a))).map(a=>{const L=T.filter(t=>t.area===a);return L.length?`<div class="ac-area">${esc(a||'Outras')}</div><div class="ac-grid">${L.map(t=>acCard(t,p)).join('')}</div>`:''}).join('')||emptyBox('Nenhuma trilha publicada ainda',acAdmin()?'Crie a primeira em “Gerenciar conteúdo”.':'Em breve.')}</section>
 <section class="ac-sec"><header><h2>Explore nossos conteúdos</h2><small>${lessons.length} aula${lessons.length===1?'':'s'}</small></header>
  <div class="ac-search"><input class="search" id="ac-q" placeholder="Buscar aula, tema ou trilha" value="${esc(ui.acQ)}" style="flex:1 1 260px"><div class="chips">${[['all','Tudo'],['texto','Com texto'],['video','Com vídeo'],['pdf','Com PDF'],['quiz','Avaliações'],['pratica','Atividades práticas']].map(([k,l])=>`<button class="chip" data-act="ac-fmt" data-v="${k}" aria-pressed="${fm===k}">${l}</button>`).join('')}</div></div>
  <div class="ac-list">${lessons.slice(0,q||fm!=='all'?60:8).map(x=>`<button class="ac-li" data-act="ac-lesson" data-id="${esc(x.t.id)}" data-v="${esc(x.l.id)}"><b>${esc(x.l.title)}</b><span class="ac-tag">${acDone(p,x.l.id)?'✓ concluída':[x.l.video&&'vídeo',(x.l.pdfs||[]).length&&'PDF',x.l.quiz&&'avaliação',x.l.submit&&'atividade',x.l.text&&'texto'].filter(Boolean).join(' · ')||'conteúdo em produção'}</span><small>${esc(x.t.title)} · ${esc(x.m.title)}</small></button>`).join('')||'<div class="tk-none">Nenhuma aula encontrada.</div>'}</div>
  ${!q&&fm==='all'&&lessons.length>8?'<small style="color:var(--muted)">Use a busca ou os filtros para ver todas as aulas.</small>':''}</section>
 <section class="ac-sec"><header><h2>Minha evolução</h2><small>registrado a partir das suas aulas concluídas</small></header>
  <div class="ac-kpis"><div><span>Trilhas iniciadas</span><b>${st.filter(s=>s.started).length}</b></div><div><span>Trilhas concluídas</span><b>${st.filter(s=>s.complete).length}</b></div><div><span>Aulas concluídas</span><b>${lessonsDone}</b></div>
   <div><span>Tempo de estudo</span><b>${mins?(mins>=60?(mins/60).toFixed(1).replace('.',',')+' h':mins+' min'):'—'}</b><small>${mins?'estimado pelas aulas concluídas':'sem dados ainda'}</small></div><div><span>Progresso geral</span><b>${totalL?Math.round(doneL/totalL*100):0}%</b><small>das trilhas disponíveis</small></div></div></section>`}
function acTrack(t){const p=acProg();const s=acStat(t,p);const miss=acPrereqMissing(t,p);const F=acFlat(t);const nx=acNext(t,p);const idxOf=id=>F.findIndex(x=>x.l.id===id);
 return `${acTop()}<div><button class="btn" data-act="ac-go" data-v="home">‹ Todas as trilhas</button></div>
 <section class="ac-th"><div class="ac-cv">${acCover(t)}<span class="lv">${esc(t.level||'')}</span></div><div class="ac-thb"><div class="ac-area" style="margin:0">${esc(t.area||'')}</div><h1>${esc(t.title)}</h1><p>${esc(t.desc||'')}</p>
  <div class="ac-facts"><div><span>Objetivo</span><b style="font-weight:500;font-size:13.5px">${esc(t.objective||'—')}</b></div><div><span>Público recomendado</span><b style="font-weight:500;font-size:13.5px">${esc(t.audience||'Toda a equipe')}</b></div><div><span>Duração estimada</span><b>${esc(acHours(t))}</b></div>
   <div><span>Conteúdo</span><b>${(t.modules||[]).length} módulos · ${F.length} aulas</b></div><div><span>Sequência</span><b>${t.sequential?'Liberação em ordem':'Acesso livre'}</b></div><div><span>Pré-requisitos</span><b style="font-size:13.5px">${(t.prereq||[]).map(id=>S.acad_tracks.find(x=>x.id===id)?.title).filter(Boolean).map(esc).join(', ')||'Nenhum'}</b></div></div>
  ${s.started?`<div class="ac-prog"><div class="bar"><i style="width:${s.pct}%"></i></div><span>${s.done}/${s.total} aulas · ${s.pct}%</span></div>`:''}
  ${miss.length&&!acAdmin()?`<div class="ac-pend"><span>🔒</span><div>Conclua antes: <b>${miss.map(x=>esc(x.title)).join(', ')}</b>.</div></div>`:`<div class="row"><button class="btn primary" data-act="ac-lesson" data-id="${esc(t.id)}" data-v="${esc(nx||'')}" ${nx?'':'disabled'}>${s.complete?'Revisar a trilha':s.started?'Continuar aprendendo':'Começar a trilha'}</button>${s.complete?'<span class="pill p-ok">Trilha concluída</span>':''}</div>`}
  ${t.activity?`<p style="font-size:13.5px"><b>Atividade prática:</b> ${esc(t.activity)}</p>`:''}</div></section>
 <div class="ac-mods">${(t.modules||[]).map(m=>{const L=m.lessons||[];const d=L.filter(l=>acDone(p,l.id)).length;return `<section class="ac-mod"><header><b>${esc(m.title)}</b><small>${d}/${L.length} concluída${L.length===1?'':'s'}</small></header>
  ${L.map(l=>{const i=idxOf(l.id);const lk=acLocked(t,i,p)||(miss.length&&!acAdmin());const dn=acDone(p,l.id);return `<button class="ac-les" data-act="ac-lesson" data-id="${esc(t.id)}" data-v="${esc(l.id)}" ${lk?'disabled':''}><span class="ac-st ${dn?'done':l.id===nx&&s.started?'cur':lk?'lock':''}">${dn?'✓':lk?'':''}</span><span><b style="font-weight:600">${esc(l.title)}</b><small>${esc(l.desc||'')}</small></span><span class="ac-tag">${l.min?l.min+' min':''}${l.quiz?(l.min?' · ':'')+'avaliação':''}</span></button>`}).join('')}</section>`}).join('')}</div>`}
function acQuizHtml(t,l,p){const qz=l.quiz;if(!qz||!(qz.questions||[]).length)return'';const at=(p.quiz?.[l.id]||[]);const best=at.reduce((b,x)=>Math.max(b,x.pct),-1);const show=ui.acQuizShow===l.id?ui.acQuizLast:null;
 return `<section class="ac-box"><h3>Avaliação ${qz.required?'· obrigatória para concluir':'· opcional'}</h3>
  ${at.length?`<p style="margin:0 0 10px;font-size:13.5px;color:var(--muted)">${at.length} tentativa${at.length>1?'s':''} · melhor resultado ${best}%${qz.required?' · mínimo '+(qz.pass||70)+'%':''}</p>`:''}
  <form id="ac-quiz" data-t="${esc(t.id)}" data-l="${esc(l.id)}">${qz.questions.map((qq,i)=>`<div class="ac-q"><b>${i+1}. ${esc(qq.q)}</b>${qq.opts.map((o,j)=>{const cls=show?(j===qq.ans?'ok':show.a[i]===j?'no':''):'';return `<label class="ac-opt ${cls}"><input type="radio" name="q${i}" value="${j}" ${show&&show.a[i]===j?'checked':''}><span>${esc(o)}</span></label>`}).join('')}${show&&qq.exp?`<div class="ac-exp">${esc(qq.exp)}</div>`:''}</div>`).join('')}</form>
  ${show?`<div class="ac-res ${show.pass?'ok':'no'}">${show.pass?'✓':'✕'} Você acertou ${show.score} de ${show.total} (${show.pct}%).${!show.pass&&qz.required?' Revise a aula e tente de novo.':''}</div>`:''}
  <div class="row" style="margin-top:10px"><button class="btn ${show?'':'primary'}" data-act="ac-quiz-send" data-id="${esc(t.id)}" data-v="${esc(l.id)}">${show?'Tentar de novo':'Enviar respostas'}</button></div></section>`}
function acLesson(t,lid){const p=acProg();const F=acFlat(t);const i=F.findIndex(x=>x.l.id===lid);if(i<0)return acTrack(t);const {l,m}=F[i];const s=acStat(t,p);const dn=acDone(p,l.id);
 const miss=acPrereqMissing(t,p);if((acLocked(t,i,p)||(miss.length&&!acAdmin())))return acTrack(t)+'';
 const qz=l.quiz;const passed=!qz||!qz.required||(p.quiz?.[l.id]||[]).some(x=>x.pass);const sub=p.subs?.[l.id];const subOk=!l.submit||!!sub;
 const nxt=F[i+1];const prv=F[i-1];const nl=nxt&&!acLocked(t,i+1,{...p,lessons:{...p.lessons,[l.id]:dn||p.lessons?.[l.id]}});
 const pdfs=l.pdfs||[];const links=l.links||[];const sel=ui.acPdf&&pdfs.find(x=>x.assetId===ui.acPdf)||pdfs[0];
 const side=`<aside class="ac-side"><header><b>${esc(t.title)}</b><div class="bar"><i style="width:${s.pct}%"></i></div><small style="color:var(--muted);font-size:12.5px">${s.done}/${s.total} aulas · ${s.pct}%</small></header><nav>${(t.modules||[]).map(mm=>`<h4>${esc(mm.title)}</h4>${(mm.lessons||[]).map(x=>{const k=F.findIndex(y=>y.l.id===x.id);const lk=acLocked(t,k,p);const d=acDone(p,x.id);return `<button data-act="ac-lesson" data-id="${esc(t.id)}" data-v="${esc(x.id)}" ${x.id===l.id?'aria-current="page"':''} ${lk?'disabled':''}><span class="ac-st ${d?'done':x.id===l.id?'cur':lk?'lock':''}">${d?'✓':''}</span><span>${esc(x.title)}</span></button>`}).join('')}`).join('')}</nav></aside>`;
 const hasMat=l.video||pdfs.length||l.text;
 return `${acTop()}<div class="ac-lw"><div class="ac-main">
  <div class="ac-lh"><div class="crumb"><button class="lnk" data-act="ac-track" data-id="${esc(t.id)}">${esc(t.title)}</button> · ${esc(m.title)}</div><h1>${esc(l.title)}</h1>${l.desc?`<p>${esc(l.desc)}</p>`:''}</div>
  ${l.video?acVideoHtml(l.video):''}
  ${pdfs.length?`<section class="ac-box"><h3>Material em PDF</h3>${pdfs.length>1?`<div class="chips" style="margin-bottom:10px">${pdfs.map(x=>`<button class="chip" data-act="ac-pdf" data-v="${esc(x.assetId)}" aria-pressed="${x===sel}">${esc(x.name)}</button>`).join('')}</div>`:''}
   <iframe class="ac-pdf" src="/_blob/${esc(sel.assetId)}#view=FitH" title="${esc(sel.name)}"></iframe><div class="row" style="margin-top:8px"><a class="btn sm" href="/_blob/${esc(sel.assetId)}" target="_blank" rel="noopener">Abrir em outra aba ↗</a><button class="btn sm" data-act="file-dl" data-asset="${esc(sel.assetId)}" data-name="${esc(sel.name)}">${DL_ICO}Baixar PDF</button></div></section>`:''}
  ${!hasMat?`<div class="ac-pend"><span>✎</span><div><b>Material em produção.</b> Esta aula já tem objetivo e conteúdo programático definidos. Formato previsto: ${esc(l.format||'a definir')}.</div></div>`:''}
  ${l.objective||(l.program||[]).length?`<section class="ac-box"><h3>Objetivo e conteúdo programático</h3>${l.objective?`<p style="margin:0 0 10px;font-size:15px"><b>Objetivo:</b> ${esc(l.objective)}</p>`:''}${(l.program||[]).length?`<ul style="margin:0;padding-left:20px;line-height:1.7">${l.program.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${hasMat&&l.format?`<p style="margin:10px 0 0;font-size:13px;color:var(--muted)">Formato: ${esc(l.format)}</p>`:''}</section>`:''}
  ${l.text?`<section class="ac-box"><h3>Conteúdo da aula</h3><div class="ac-text">${acMd(l.text)}</div></section>`:''}
  ${links.length?`<section class="ac-box"><h3>Materiais complementares</h3><div class="ac-files">${links.map(x=>`<a class="tk-file" href="${esc(x.url)}" target="_blank" rel="noopener">↗ ${esc(x.label||x.url)}</a>`).join('')}</div></section>`:''}
  ${l.practice?`<section class="ac-box"><h3>Aplicação prática</h3><p style="margin:0;font-size:15px">${esc(l.practice)}</p></section>`:''}
  ${acQuizHtml(t,l,p)}
  ${l.submit?`<section class="ac-box"><h3>Entrega da atividade</h3>${sub?`<p style="margin:0 0 8px;font-size:13.5px;color:var(--ok)"><b>✓ Entregue em ${fDT(sub.at)}</b></p>${sub.text?`<div class="note"><p>${esc(sub.text)}</p></div>`:''}<div class="ac-files" style="margin-top:8px">${(sub.files||[]).map(f=>`<button class="tk-file" data-act="file-dl" data-asset="${esc(f.assetId)}" data-name="${esc(f.name)}">↓ ${esc(f.name)}</button>`).join('')}</div>`:''}
   <textarea id="ac-sub-text" class="sel" style="width:100%;min-height:90px;margin-top:8px" placeholder="Resposta, link da peça ou comentários">${esc(sub?.text||'')}</textarea>
   <div class="row" style="margin-top:8px">${assets?`<button class="btn" data-act="ac-sub-file" data-id="${esc(t.id)}" data-v="${esc(l.id)}">Anexar arquivo</button>`:''}<button class="btn primary" data-act="ac-sub-send" data-id="${esc(t.id)}" data-v="${esc(l.id)}">${sub?'Atualizar entrega':'Enviar entrega'}</button></div></section>`:''}
  <div class="ac-actions"><div>${prv?`<button class="btn" data-act="ac-lesson" data-id="${esc(t.id)}" data-v="${esc(prv.l.id)}">‹ Aula anterior</button>`:''}</div>
   <div class="row">${dn?'<span class="pill p-ok">✓ Aula concluída</span>':`<button class="btn ${passed&&subOk?'primary':''}" data-act="ac-done" data-id="${esc(t.id)}" data-v="${esc(l.id)}" ${passed&&subOk?'':'disabled'} title="${!passed?'Faça a avaliação obrigatória':!subOk?'Envie a atividade':''}">Marcar como concluída</button>`}
   ${nxt?`<button class="btn ${dn?'primary':''}" data-act="ac-lesson" data-id="${esc(t.id)}" data-v="${esc(nxt.l.id)}" ${dn||!t.sequential||acAdmin()?'':'disabled'}>Próxima aula ›</button>`:`<button class="btn" data-act="ac-track" data-id="${esc(t.id)}">Voltar à trilha</button>`}</div></div>
  ${!passed?'<small style="color:var(--muted);text-align:right">Para concluir esta aula, acerte o mínimo na avaliação.</small>':!subOk?'<small style="color:var(--muted);text-align:right">Para concluir, envie a atividade.</small>':''}
 </div>${side}</div>`}

/* ---------- gestão de conteúdo ---------- */
function acAdminView(){if(!acAdmin())return acHome();const T=S.acad_tracks.slice().sort((a,b)=>(a.order??99)-(b.order??99));
 return `${acTop()}<div class="head"><div><h1>Gerenciar conteúdo</h1><p>Crie e organize trilhas, módulos e aulas. Vídeos podem ser links (YouTube, Vimeo, Google Drive, Loom ou MP4) ou arquivos enviados; PDFs são enviados para a biblioteca da plataforma.</p></div><button class="btn primary" data-act="ac-new-track">+ Nova trilha</button></div>
 ${(()=>{const h=S.acad_home.find(x=>x.id==='main')||{};const isA=String(h.video||'').startsWith('asset:');return `<section class="ac-box"><h3>Vídeo de boas-vindas da página inicial</h3>
  <div class="ac-hvadm"><div>${h.video?acVideoHtml(h.video):'<div class="ac-hv-empty" style="min-height:140px"><span class="pl">▶</span><small>Nenhum vídeo ainda</small></div>'}</div>
  <div style="display:flex;flex-direction:column;gap:8px;min-width:0"><label class="fld"><span>Link do vídeo</span><input id="ac-hv-url" value="${esc(isA?'':h.video||'')}" placeholder="YouTube, Vimeo, Google Drive, Loom ou link .mp4"></label>
   <label class="fld"><span>Legenda (opcional)</span><input id="ac-hv-cap" value="${esc(h.caption||'')}" placeholder="Ex.: Uma mensagem do Clério para a equipe"></label>
   <div class="row"><button class="btn primary" data-act="ac-hv-save">Salvar link</button>${assets?'<button class="btn" data-act="ac-hv-up">Enviar arquivo de vídeo</button>':''}${h.video?'<button class="btn danger" data-act="ac-hv-del">Remover vídeo</button>':''}</div>
   <small style="color:var(--muted)">${isA?'Vídeo enviado em uso. Salvar um link o substitui. ':''}Arquivos de até 20 MB (MP4 ou WEBM). Para vídeos maiores, use um link.</small></div></div></section>`})()}
 <div class="ac-list">${T.map((t,i)=>{const F=acFlat(t);return `<div class="ac-adm-row"><div class="ac-cv">${acCover(t)}</div><div style="min-width:0"><b style="font-size:15px">${esc(t.title)}</b><div class="ac-meta"><span>${esc(t.area||'')}</span><span>${(t.modules||[]).length} módulos · ${F.length} aulas</span><span>${F.filter(x=>x.l.text||x.l.video||(x.l.pdfs||[]).length).length} com material</span><span>${t.published?'Publicada':'Rascunho'}</span><span>${Array.isArray(t.access)&&t.access.length?t.access.length+' pessoa(s) com acesso':'Toda a equipe'}</span></div></div>
  <div class="ac-mini"><button class="btn" data-act="ac-move-t" data-id="${esc(t.id)}" data-v="-1" ${i?'':'disabled'} aria-label="Subir">↑</button><button class="btn" data-act="ac-move-t" data-id="${esc(t.id)}" data-v="1" ${i<T.length-1?'':'disabled'} aria-label="Descer">↓</button><button class="btn" data-act="ac-pub" data-id="${esc(t.id)}">${t.published?'Despublicar':'Publicar'}</button><button class="btn primary" data-act="ac-edit" data-id="${esc(t.id)}">Editar</button></div></div>`}).join('')||'<div class="tk-none">Nenhuma trilha ainda.</div>'}</div>`}
function acEditView(t){if(!acAdmin()||!t)return acAdminView();
 return `${acTop()}<div class="row" style="justify-content:space-between"><button class="btn" data-act="ac-go" data-v="admin">‹ Gerenciar conteúdo</button><div class="row"><button class="btn" data-act="ac-track" data-id="${esc(t.id)}">Ver como aluno</button><button class="btn danger" data-act="ac-del-t" data-id="${esc(t.id)}">Excluir trilha</button></div></div>
 <section class="ac-th"><div class="ac-cv">${acCover(t)}</div><div class="ac-thb"><div class="ac-area" style="margin:0">${esc(t.area||'')} · ${t.published?'Publicada':'Rascunho'}</div><h1>${esc(t.title)}</h1><p>${esc(t.desc||'')}</p>
  <div class="row"><button class="btn primary" data-act="ac-meta" data-id="${esc(t.id)}">Editar dados da trilha</button>${assets?`<button class="btn" data-act="ac-cover" data-id="${esc(t.id)}">${t.cover?.asset?'Trocar capa':'Enviar capa'}</button>`:''}${t.cover?.asset?`<button class="btn ghost" data-act="ac-cover-x" data-id="${esc(t.id)}">Usar capa padrão</button>`:''}</div></div></section>
 <div class="ac-mods">${(t.modules||[]).map((m,mi)=>`<section class="ac-mod"><header><b>${esc(m.title)}</b><div class="ac-mini"><button class="btn" data-act="ac-mv-m" data-id="${esc(t.id)}" data-v="${mi}" data-d="-1" ${mi?'':'disabled'}>↑</button><button class="btn" data-act="ac-mv-m" data-id="${esc(t.id)}" data-v="${mi}" data-d="1" ${mi<t.modules.length-1?'':'disabled'}>↓</button><button class="btn" data-act="ac-ren-m" data-id="${esc(t.id)}" data-v="${mi}">Renomear</button><button class="btn danger" data-act="ac-del-m" data-id="${esc(t.id)}" data-v="${mi}">Excluir</button></div></header>
  ${(m.lessons||[]).map((l,li)=>`<div class="ac-ed-l"><div style="min-width:0"><b style="font-weight:600">${esc(l.title)}</b><small>${[l.text&&'texto',l.video&&'vídeo',(l.pdfs||[]).length&&(l.pdfs.length+' PDF'),l.quiz&&('avaliação'+(l.quiz.required?' obrigatória':'')),l.submit&&'entrega'].filter(Boolean).join(' · ')||'sem material: '+esc(l.format||'')}</small></div>
   <div class="ac-mini"><button class="btn" data-act="ac-mv-l" data-id="${esc(t.id)}" data-v="${mi}:${li}" data-d="-1" ${li?'':'disabled'}>↑</button><button class="btn" data-act="ac-mv-l" data-id="${esc(t.id)}" data-v="${mi}:${li}" data-d="1" ${li<m.lessons.length-1?'':'disabled'}>↓</button>${assets?`<button class="btn" data-act="ac-up" data-id="${esc(t.id)}" data-v="${mi}:${li}" data-k="pdf">+ PDF</button><button class="btn" data-act="ac-up" data-id="${esc(t.id)}" data-v="${mi}:${li}" data-k="video">+ Vídeo</button>`:''}<button class="btn primary" data-act="ac-ed-l" data-id="${esc(t.id)}" data-v="${mi}:${li}">Editar</button><button class="btn danger" data-act="ac-del-l" data-id="${esc(t.id)}" data-v="${mi}:${li}">Excluir</button></div></div>
   ${(l.pdfs||[]).map((f,fi)=>`<div class="ac-ed-l" style="padding-left:32px"><small>PDF · ${esc(f.name)}</small><button class="btn sm ghost" data-act="ac-rm-pdf" data-id="${esc(t.id)}" data-v="${mi}:${li}:${fi}">Remover</button></div>`).join('')}`).join('')}
  <div class="ac-ed-l"><span></span><button class="btn sm" data-act="ac-add-l" data-id="${esc(t.id)}" data-v="${mi}">+ Aula neste módulo</button></div></section>`).join('')}
  <div><button class="btn" data-act="ac-add-m" data-id="${esc(t.id)}">+ Módulo</button></div></div>`}
function acQuizToText(qz){return (qz?.questions||[]).map(q=>`? ${q.q}\n${q.opts.map((o,j)=>(j===q.ans?'* ':'- ')+o).join('\n')}${q.exp?'\n> '+q.exp:''}`).join('\n\n')}
function acQuizParse(s){const out=[];let cur=null;for(const raw of String(s||'').split('\n')){const t=raw.trim();if(!t)continue;
  if(t.startsWith('?')){cur={q:t.slice(1).trim(),opts:[],ans:-1,exp:''};out.push(cur)}else if(cur&&(t.startsWith('*')||t.startsWith('-'))){if(t.startsWith('*'))cur.ans=cur.opts.length;cur.opts.push(t.slice(1).trim())}else if(cur&&t.startsWith('>'))cur.exp=t.slice(1).trim()}
 const bad=out.find(q=>q.opts.length<2||q.ans<0);if(bad)throw{msg:'Na pergunta “'+bad.q+'”, informe ao menos duas opções e marque a correta com *.'};
 return out.map(q=>({...q,type:q.opts.length===2&&/^verdadeiro$/i.test(q.opts[0])&&/^falso$/i.test(q.opts[1])?'tf':'mc'}))}
function acLessonForm(t,mi,li){const isNew=li==null;const l=isNew?{id:t.id+'-'+uid(),title:'',lessons:[]}:t.modules[mi].lessons[li];
 formModal({title:isNew?'Nova aula':'Editar aula',back:()=>refresh(),values:{...l,program:(l.program||[]).join('\n'),links:(l.links||[]).map(x=>(x.label?x.label+' | ':'')+x.url).join('\n'),quizText:acQuizToText(l.quiz),quizReq:l.quiz?.required?'sim':'nao',quizPass:l.quiz?.pass||70,submit:l.submit?'sim':'nao',video:String(l.video||'').startsWith('asset:')?'':l.video||'',min:l.min||''},fields:[
  {k:'title',l:'Título da aula',req:1,full:1},{k:'desc',l:'Descrição',full:1},{k:'objective',l:'Objetivo de aprendizagem',full:1},
  {k:'program',l:'Conteúdo programático (um tópico por linha)',t:'textarea',full:1},
  {k:'format',l:'Formato do material',ph:'Ex.: Videoaula + PDF'},{k:'min',l:'Duração estimada (minutos)',t:'number'},
  {k:'text',l:'Texto da aula',t:'textarea',full:1,rows:10,hint:'Parágrafos separados por linha em branco. “## ” para subtítulo, “- ” para lista, “> ” para destaque e **negrito**.'},
  {k:'video',l:'Link do vídeo',full:1,ph:'YouTube, Vimeo, Google Drive, Loom ou link .mp4',hint:String(l.video||'').startsWith('asset:')?'Esta aula tem um vídeo enviado. Preencha um link só se quiser substituí-lo.':'Para enviar um arquivo de vídeo, use “+ Vídeo” na lista de aulas.'},
  {k:'links',l:'Materiais complementares (um por linha: Rótulo | link)',t:'textarea',full:1},
  {k:'practice',l:'Aplicação prática',t:'textarea',full:1},{k:'submit',l:'Pede entrega de atividade?',t:'select',o:[{v:'nao',l:'Não'},{v:'sim',l:'Sim, com resposta e/ou arquivo'}]},
  {k:'quizText',l:'Avaliação',t:'textarea',full:1,rows:8,hint:'Formato: “? Pergunta”, depois “* opção correta” e “- opção errada” (uma por linha) e “> explicação” opcional. Para verdadeiro ou falso, use as opções Verdadeiro e Falso.'},
  {k:'quizReq',l:'Avaliação obrigatória para concluir?',t:'select',o:[{v:'nao',l:'Não'},{v:'sim',l:'Sim'}]},{k:'quizPass',l:'Nota mínima (%)',t:'number'}],
  onSave:async v=>{let qs=[];try{qs=acQuizParse(v.quizText)}catch(e){toast(e.msg||'Confira a avaliação.');throw e}
   const links=String(v.links||'').split('\n').map(x=>x.trim()).filter(Boolean).map(x=>{const[a,b]=x.includes('|')?x.split('|').map(s=>s.trim()):['',x];return{label:a,url:b}});
   if(links.some(x=>!/^https?:\/\//i.test(x.url))||(v.video&&!/^https?:\/\//i.test(v.video))){toast('Os links precisam começar com http:// ou https://');throw new Error('url')}
   const rec={...l,title:v.title,desc:v.desc,objective:v.objective,program:String(v.program||'').split('\n').map(x=>x.trim()).filter(Boolean),format:v.format,min:+v.min||'',text:v.text,video:v.video||(String(l.video||'').startsWith('asset:')?l.video:''),links,practice:v.practice,submit:v.submit==='sim'};
   if(qs.length)rec.quiz={required:v.quizReq==='sim',pass:Math.min(100,Math.max(1,+v.quizPass||70)),questions:qs};else delete rec.quiz;delete rec.lessons;
   const tt=JSON.parse(JSON.stringify(byId('acad_tracks',t.id)));if(isNew)tt.modules[mi].lessons.push(rec);else tt.modules[mi].lessons[li]=rec;await acSaveTrack(tt);toast('Aula salva')}})}
function acMetaForm(t){const isNew=!t;t=t||{id:'t'+uid(),title:'',area:AC_AREAS[0],level:'Básico',published:false,sequential:false,access:'all',prereq:[],modules:[{id:'m'+uid(),title:'1. Introdução',lessons:[]}],order:(Math.max(0,...S.acad_tracks.map(x=>+x.order||0))+1),cover:{k:'design'}};
 const others=S.acad_tracks.filter(x=>x.id!==t.id);
 formModal({title:isNew?'Nova trilha':'Dados da trilha',back:isNew?null:()=>refresh(),values:{...t,published:t.published?'sim':'nao',sequential:t.sequential?'sim':'nao',access:Array.isArray(t.access)?t.access:[],coverk:t.cover?.k||'design'},fields:[
  {k:'title',l:'Nome da trilha',req:1,full:1},{k:'area',l:'Área de conhecimento',list:AC_AREAS},{k:'level',l:'Nível',t:'select',o:AC_LEVELS},
  {k:'desc',l:'Descrição',t:'textarea',full:1},{k:'objective',l:'Objetivo de aprendizagem',t:'textarea',full:1},
  {k:'audience',l:'Público recomendado'},{k:'hours',l:'Duração estimada',ph:'Ex.: 6 horas (vazio = soma das aulas)'},
  {k:'activity',l:'Atividade prática da trilha',t:'textarea',full:1},
  {k:'prereq',l:'Pré-requisitos',t:'chips',o:others.map(x=>({v:x.id,l:x.title})),full:1},
  {k:'sequential',l:'Liberação das aulas',t:'select',o:[{v:'nao',l:'Acesso livre a todas as aulas'},{v:'sim',l:'Em ordem: cada aula libera a próxima'}]},
  {k:'published',l:'Situação',t:'select',o:[{v:'nao',l:'Rascunho (só administradores veem)'},{v:'sim',l:'Publicada'}]},
  {k:'coverk',l:'Estilo da capa padrão',t:'select',o:[{v:'design',l:'Design'},{v:'mkt',l:'Marketing'},{v:'av',l:'Audiovisual'},{v:'ia',l:'Tecnologia'},{v:'cx',l:'Clientes'}]},
  {k:'access',l:'Quem acessa (nenhum marcado = toda a equipe)',t:'chips',o:S.members.map(m=>({v:m.id,l:m.name.split(' ')[0]})),full:1}],
  onSave:async v=>{const cur=isNew?t:JSON.parse(JSON.stringify(byId('acad_tracks',t.id)));const rec={...cur,title:v.title,area:v.area||'Outras',level:v.level,desc:v.desc,objective:v.objective,audience:v.audience,hours:v.hours,activity:v.activity,prereq:v.prereq||[],sequential:v.sequential==='sim',published:v.published==='sim',access:(v.access||[]).length?v.access:'all',cover:{...(cur.cover||{}),k:v.coverk}};
   await acSaveTrack(rec);toast(isNew?'Trilha criada':'Trilha atualizada');if(isNew){ui.ac={v:'edit',t:rec.id};setTimeout(refresh,60)}}})}

/* ---------- desenvolvimento da equipe ---------- */
function acTeam(){if(!acLead())return acHome();const f=ui.acTeam;const T=S.acad_tracks.filter(t=>t.published).sort((a,b)=>(a.order??99)-(b.order??99));
 const since=f.per==='all'?'':ymd(addD(new Date(),-(+f.per)));const inPer=s=>!since||String(s||'').slice(0,10)>=since;
 const ppl=S.members.filter(m=>m.accountId&&(f.who==='all'||m.id===f.who)).sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 const TT=f.t==='all'?T:T.filter(t=>t.id===f.t);
 const rows=ppl.map(m=>{const p=acProg(m.accountId);const vis=TT.filter(t=>acCanSee(t,m));const st=vis.map(t=>({t,s:acStat(t,p)}));const ls=Object.entries(p.lessons||{}).filter(([id,x])=>vis.some(t=>acFlat(t).some(y=>y.l.id===id))&&inPer(x.at));
  const qz=Object.entries(p.quiz||{}).flatMap(([id,a])=>a.filter(x=>inPer(x.at)&&vis.some(t=>acFlat(t).some(y=>y.l.id===id))));const tot=st.reduce((s,x)=>s+x.s.total,0),dn=st.reduce((s,x)=>s+x.s.done,0);
  return{m,p,started:st.filter(x=>x.s.started&&!x.s.complete).length,done:st.filter(x=>x.s.complete).length,pct:tot?Math.round(dn/tot*100):0,lessons:ls.length,quiz:qz.length,avg:qz.length?Math.round(qz.reduce((s,x)=>s+x.pct,0)/qz.length):null,last:p.lastAt||''}});
 const pop=T.map(t=>({t,n:S.members.filter(m=>m.accountId&&acStat(t,acProg(m.accountId)).started).length})).filter(x=>x.n).sort((a,b)=>b.n-a.n).slice(0,5);
 const going=rows.reduce((s,r)=>s+r.started,0),done=rows.reduce((s,r)=>s+r.done,0);const avgPct=rows.length?Math.round(rows.reduce((s,r)=>s+r.pct,0)/rows.length):0;
 return `${acTop()}<div class="head"><div><h1>Desenvolvimento da equipe</h1><p>Acompanhe o aprendizado do time para identificar oportunidades de capacitação. Estes números não são avaliação de desempenho.</p></div></div>
 <div class="tk-fl"><select class="sel" data-acf="who" aria-label="Integrante"><option value="all">Todos os integrantes</option>${S.members.filter(m=>m.accountId).map(m=>`<option value="${m.id}" ${f.who===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select>
  <select class="sel" data-acf="t" aria-label="Trilha"><option value="all">Todas as trilhas</option>${T.map(t=>`<option value="${esc(t.id)}" ${f.t===t.id?'selected':''}>${esc(t.title)}</option>`).join('')}</select>
  <select class="sel" data-acf="per" aria-label="Período">${[['all','Todo o período'],['7','Últimos 7 dias'],['30','Últimos 30 dias'],['90','Últimos 90 dias']].map(([k,l])=>`<option value="${k}" ${f.per===k?'selected':''}>${l}</option>`).join('')}</select></div>
 <div class="ac-kpis" style="grid-template-columns:repeat(6,minmax(0,1fr))"><div><span>Integrantes com acesso</span><b>${S.members.filter(m=>m.accountId).length}</b><small>contas vinculadas</small></div><div><span>Trilhas disponíveis</span><b>${T.length}</b></div><div><span>Em andamento</span><b>${going}</b><small>trilhas iniciadas</small></div><div><span>Concluídas</span><b>${done}</b></div><div><span>Conclusão média</span><b>${avgPct}%</b></div><div><span>Mais acessada</span><b style="font-size:15px;line-height:1.3">${pop[0]?esc(pop[0].t.title):'—'}</b><small>${pop[0]?pop[0].n+' pessoa(s)':''}</small></div></div>
 <div class="ac-list" style="overflow-x:auto"><table class="ac-tbl"><thead><tr><th>Integrante</th><th>Em andamento</th><th>Concluídas</th><th>Progresso</th><th>Aulas${since?' no período':''}</th><th>Avaliações</th><th>Último acesso</th></tr></thead><tbody>
  ${rows.map(r=>`<tr class="click" data-act="ac-person" data-id="${r.m.id}"><td><span class="row" style="gap:8px;flex-wrap:nowrap">${avatar(r.m,28)}<b style="font-weight:600">${esc(r.m.name)}</b></span></td><td>${r.started}</td><td>${r.done}</td><td style="min-width:140px"><div class="ac-prog"><div class="bar"><i style="width:${r.pct}%"></i></div><span>${r.pct}%</span></div></td><td>${r.lessons}</td><td>${r.quiz?r.quiz+' · média '+r.avg+'%':'—'}</td><td>${r.last?fDT(r.last):'Nunca acessou'}</td></tr>`).join('')||'<tr><td colspan="7" style="color:var(--muted)">Nenhum integrante com conta vinculada.</td></tr>'}</tbody></table></div>
 ${pop.length>1?`<section class="ac-sec"><header><h2>Trilhas mais acessadas</h2></header><div class="ac-list">${pop.map(x=>`<div class="ac-li" style="cursor:default"><b>${esc(x.t.title)}</b><span class="ac-tag">${x.n} pessoa(s)</span></div>`).join('')}</div></section>`:''}`}
function acPerson(mid){const m=byId('members',mid);if(!m)return;const p=acProg(m.accountId);const T=S.acad_tracks.filter(t=>t.published&&acCanSee(t,m));
 openModal(`<div class="mh"><div class="row" style="gap:10px;flex-wrap:nowrap">${avatar(m,40)}<div><h2>${esc(m.name)}</h2><small style="color:var(--muted)">Último acesso: ${p.lastAt?fDT(p.lastAt):'nunca'}</small></div></div><button class="x" data-act="close" aria-label="Fechar">×</button></div>
 <div class="mb">${T.map(t=>{const s=acStat(t,p);const ql=acFlat(t).filter(x=>(p.quiz?.[x.l.id]||[]).length);const sb=acFlat(t).filter(x=>p.subs?.[x.l.id]);return `<div class="sec"><h3>${esc(t.title)}</h3><div class="ac-prog"><div class="bar"><i style="width:${s.pct}%"></i></div><span>${s.complete?'Concluída em '+fD(p.tracks?.[t.id]?.doneAt||''):s.done+'/'+s.total+' aulas'}</span></div>
  ${ql.map(x=>{const a=p.quiz[x.l.id];return `<p style="margin:6px 0 0;font-size:13px">Avaliação “${esc(x.l.title)}”: ${a.length} tentativa(s), melhor ${Math.max(...a.map(y=>y.pct))}%</p>`}).join('')}
  ${sb.map(x=>{const s2=p.subs[x.l.id];return `<div class="note" style="margin-top:6px"><div><p><b>Entrega: ${esc(x.l.title)}</b>${s2.text?'<br>'+esc(s2.text):''}</p><small>${fDT(s2.at)}</small><div class="ac-files" style="margin-top:6px">${(s2.files||[]).map(f=>`<button class="tk-file" data-act="file-dl" data-asset="${esc(f.assetId)}" data-name="${esc(f.name)}">↓ ${esc(f.name)}</button>`).join('')}</div></div></div>`}).join('')}</div>`}).join('')||'<p style="color:var(--muted)">Nenhuma trilha disponível para esta pessoa.</p>'}</div>
 <div class="mf"><span class="spacer"></span><button class="btn primary" data-act="close">Fechar</button></div>`)}

function vAcademy(){return `<div class="ac-scope">${vAcademy0()}</div>`}
function vAcademy0(){const v=ui.ac.v;const t=ui.ac.t&&S.acad_tracks.find(x=>x.id===ui.ac.t);
 if(v==='admin')return acAdminView();if(v==='edit')return acEditView(t);if(v==='team')return acTeam();
 if(v==='track'&&t&&acCanSee(t))return acTrack(t);if(v==='lesson'&&t&&acCanSee(t))return acLesson(t,ui.ac.l);return acHome()}

/* ---------- eventos ---------- */
let acFileCtx=null;const acFile=document.createElement('input');acFile.type='file';acFile.id='ac-file';acFile.hidden=true;document.body.appendChild(acFile);
acFile.addEventListener('change',async()=>{const f=acFile.files[0];acFile.value='';const c=acFileCtx;acFileCtx=null;if(!f||!c)return;
 if(f.size>20*1048576){toast('O arquivo passa de 20 MB. Para vídeos maiores, use um link (YouTube, Vimeo, Drive ou Loom).');return}
 if(c.kind==='home'&&!/^video\//.test(f.type)){toast('Escolha um arquivo de vídeo (MP4 ou WEBM).');return}
 if(c.kind==='pdf'&&f.type!=='application/pdf'){toast('Escolha um arquivo PDF.');return}if(c.kind==='video'&&!/^video\//.test(f.type)){toast('Escolha um arquivo de vídeo (MP4 ou WEBM).');return}if(c.kind==='cover'&&!/^image\//.test(f.type)){toast('Escolha uma imagem.');return}
 try{toast('Enviando '+f.name+'…');const r=await assets.upload(f);
  if(c.kind==='sub'){await acSaveProg(p=>{const s=p.subs[c.l]||{files:[]};p.subs[c.l]={...s,files:[...(s.files||[]),{assetId:r.id,name:f.name}],at:new Date().toISOString()};return p});toast('Arquivo anexado à entrega');return}
  if(c.kind==='home'){const h=S.acad_home.find(x=>x.id==='main')||{};const rec={...h,video:'asset:'+r.id};delete rec.id;await put('acad_home','main',rec);toast('Vídeo de boas-vindas enviado');return}
  const tt=JSON.parse(JSON.stringify(byId('acad_tracks',c.t)));
  if(c.kind==='cover')tt.cover={...(tt.cover||{}),asset:r.id};else{const l=tt.modules[c.mi].lessons[c.li];if(c.kind==='pdf')l.pdfs=[...(l.pdfs||[]),{assetId:r.id,name:f.name}];else l.video='asset:'+r.id}
  await acSaveTrack(tt);toast(c.kind==='cover'?'Capa atualizada':c.kind==='pdf'?'PDF adicionado à aula':'Vídeo adicionado à aula')}catch(e){toast({too_large:'O arquivo é grande demais.',unsupported_type:'Formato não aceito.',not_granted:'Seu acesso não permite enviar arquivos.'}[e?.code]||'Não foi possível enviar o arquivo.')}});
document.addEventListener('input',e=>{if(e.target.id==='ac-q'){ui.acQ=e.target.value;clearTimeout(window.__acT);window.__acT=setTimeout(refresh,180)}});
document.addEventListener('change',e=>{const k=e.target.dataset?.acf;if(k){ui.acTeam[k]=e.target.value;refresh()}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act^="ac-"]');if(!b)return;e.stopPropagation();e.preventDefault();const a=b.dataset.act,id=b.dataset.id,v=b.dataset.v;
 const go=(o)=>{ui.ac={...ui.ac,...o};modalCtx=null;$('#mwrap').hidden=true;if(ui.view!=='academy'){ui.view='academy'}refresh();window.scrollTo(0,0)};
 const T=()=>JSON.parse(JSON.stringify(byId('acad_tracks',id)));const ml=()=>String(v).split(':').map(Number);
 const armed=()=>{if(b.classList.contains('armed'))return true;b.classList.add('armed');const t0=b.textContent;b.textContent='Confirmar';setTimeout(()=>{if(document.body.contains(b)){b.classList.remove('armed');b.textContent=t0}},4000);return false};
 try{switch(a){
 case'ac-go':go({v,t:'',l:''});break;
 case'ac-fmt':ui.acFmt=v;refresh();break;
 case'ac-track':go({v:'track',t:id});break;
 case'ac-lesson':{if(!v)return;ui.acQuizShow='';ui.acPdf='';go({v:'lesson',t:id,l:v});const p=acProg();if(acUid()&&p.tracks?.[id]?.last!==v)acSaveProg(pp=>{const tr=pp.tracks[id]||{};pp.tracks[id]={...tr,startedAt:tr.startedAt||new Date().toISOString(),last:v,lastAt:new Date().toISOString()};return pp});break}
 case'ac-pdf':ui.acPdf=v;refresh();break;
 case'ac-done':{const t=byId('acad_tracks',id);b.disabled=true;let fin=false;await acSaveProg(p=>{p.lessons[v]={at:new Date().toISOString()};const tr=p.tracks[id]||{};p.tracks[id]={...tr,startedAt:tr.startedAt||new Date().toISOString(),lastAt:new Date().toISOString()};
  const F=acFlat(t);if(F.every(x=>p.lessons[x.l.id])){fin=true;if(!tr.doneAt)p.tracks[id].doneAt=new Date().toISOString()}return p});
  if(fin)toast('Trilha concluída: '+t.title+'. Parabéns!');else toast('Aula concluída');break}
 case'ac-quiz-send':{const t=byId('acad_tracks',id);const l=acFlat(t).find(x=>x.l.id===v)?.l;if(!l?.quiz)return;
  if(ui.acQuizShow===v){ui.acQuizShow='';refresh();return}
  const form=$('#ac-quiz');const ans=l.quiz.questions.map((q,i)=>{const r=form.querySelector(`input[name="q${i}"]:checked`);return r?+r.value:-1});
  if(ans.some(x=>x<0)){toast('Responda todas as perguntas.');return}const score=ans.filter((x,i)=>x===l.quiz.questions[i].ans).length;const total=ans.length;const pct=Math.round(score/total*100);const pass=pct>=(l.quiz.pass||70);
  ui.acQuizShow=v;ui.acQuizLast={a:ans,score,total,pct,pass};await acSaveProg(p=>{p.quiz[v]=[...(p.quiz[v]||[]),{at:new Date().toISOString(),score,total,pct,pass,answers:ans}].slice(-20);return p});refresh();break}
 case'ac-sub-send':{const txt=($('#ac-sub-text')?.value||'').trim();const cur=acProg().subs?.[v];if(!txt&&!(cur?.files||[]).length){toast('Escreva a resposta ou anexe um arquivo.');return}
  await acSaveProg(p=>{p.subs[v]={...(p.subs[v]||{}),text:txt,at:new Date().toISOString()};return p});toast('Entrega registrada');break}
 case'ac-sub-file':if(!assets){toast('Seu acesso não permite enviar arquivos.');return}acFileCtx={kind:'sub',t:id,l:v};acFile.accept='';acFile.click();break;
 case'ac-person':if(acLead())acPerson(id);break;
 /* gestão (somente administradores; o banco também recusa quem não é editor) */
 default:{if(!acAdmin()){toast('Só administradores gerenciam a Academy.');return}
 switch(a){
 case'ac-new-track':acMetaForm(null);break;
 case'ac-edit':go({v:'edit',t:id});break;
 case'ac-meta':acMetaForm(byId('acad_tracks',id));break;
 case'ac-pub':{const t=T();t.published=!t.published;await acSaveTrack(t);toast(t.published?'Trilha publicada':'Trilha despublicada');break}
 case'ac-move-t':{const L=S.acad_tracks.slice().sort((x,y)=>(x.order??99)-(y.order??99));const i=L.findIndex(x=>x.id===id),j=i+(+v);if(j<0||j>=L.length)return;
  const A=JSON.parse(JSON.stringify(L[i])),B=JSON.parse(JSON.stringify(L[j]));const oa=A.order??i,ob=B.order??j;A.order=ob;B.order=oa===ob?ob+(+v>0?-1:1):oa;await acSaveTrack(A);await acSaveTrack(B);break}
 case'ac-del-t':{if(!armed())return;await del('acad_tracks',id);toast('Trilha excluída');go({v:'admin',t:''});break}
 case'ac-cover':acFileCtx={kind:'cover',t:id};acFile.accept='image/*';acFile.click();break;
 case'ac-cover-x':{const t=T();if(t.cover)delete t.cover.asset;await acSaveTrack(t);break}
 case'ac-add-m':{const t=T();t.modules=[...(t.modules||[]),{id:'m'+uid(),title:(t.modules.length+1)+'. Novo módulo',lessons:[]}];await acSaveTrack(t);break}
 case'ac-ren-m':{const t=T();const mi=+v;formModal({title:'Nome do módulo',back:()=>refresh(),values:{title:t.modules[mi].title},fields:[{k:'title',l:'Nome do módulo',req:1,full:1}],onSave:async x=>{const tt=T();tt.modules[mi].title=x.title;await acSaveTrack(tt)}});break}
 case'ac-del-m':{if(!armed())return;const t=T();t.modules.splice(+v,1);await acSaveTrack(t);toast('Módulo excluído');break}
 case'ac-mv-m':{const t=T();const i=+v,j=i+(+b.dataset.d);if(j<0||j>=t.modules.length)return;[t.modules[i],t.modules[j]]=[t.modules[j],t.modules[i]];await acSaveTrack(t);break}
 case'ac-add-l':acLessonForm(byId('acad_tracks',id),+v,null);break;
 case'ac-ed-l':{const[mi,li]=ml();acLessonForm(byId('acad_tracks',id),mi,li);break}
 case'ac-del-l':{if(!armed())return;const[mi,li]=ml();const t=T();t.modules[mi].lessons.splice(li,1);await acSaveTrack(t);toast('Aula excluída');break}
 case'ac-mv-l':{const[mi,li]=ml();const t=T();const L=t.modules[mi].lessons;const j=li+(+b.dataset.d);if(j<0||j>=L.length)return;[L[li],L[j]]=[L[j],L[li]];await acSaveTrack(t);break}
 case'ac-up':{if(!assets){toast('Seu acesso não permite enviar arquivos.');return}const[mi,li]=ml();acFileCtx={kind:b.dataset.k,t:id,mi,li};acFile.accept=b.dataset.k==='pdf'?'application/pdf':'video/mp4,video/webm';acFile.click();break}
 case'ac-hv-save':{const u=($('#ac-hv-url')?.value||'').trim(),c=($('#ac-hv-cap')?.value||'').trim();const h=S.acad_home.find(x=>x.id==='main')||{};
  if(u&&!/^https?:\/\//i.test(u)){toast('O link precisa começar com http:// ou https://');return}const rec={...h,video:u||(String(h.video||'').startsWith('asset:')?h.video:''),caption:c};delete rec.id;await put('acad_home','main',rec);toast('Vídeo de boas-vindas salvo');break}
 case'ac-hv-up':acFileCtx={kind:'home'};acFile.accept='video/mp4,video/webm';acFile.click();break;
 case'ac-hv-del':{if(!armed())return;const h=S.acad_home.find(x=>x.id==='main')||{};const rec={...h,video:''};delete rec.id;await put('acad_home','main',rec);toast('Vídeo removido');break}
 case'ac-rm-pdf':{const[mi,li,fi]=ml();const t=T();t.modules[mi].lessons[li].pdfs.splice(fi,1);await acSaveTrack(t);toast('PDF removido da aula');break}}}}}catch(err){b.disabled=false}},true);

/* identidade da Academy: preto, amarelo e branco */
(()=>{const st=document.createElement('style');st.textContent=`
.ac-scope{--ac-y:#F5C518;--ac-k:#0C0C0C;--ac-ys:#FFF6D1;display:flex;flex-direction:column;gap:20px;min-width:0}
.nav button[data-v="academy"] svg{color:var(--ink);background:#F5C518;border-radius:6px;padding:2px;width:22px;height:22px;margin:-2px}
.mobnav button[data-v="academy"] svg{color:#0C0C0C;background:#F5C518;border-radius:6px;padding:2px}
.ac-scope .ac-brand i{background:var(--ac-y);color:var(--ac-k)}
.ac-scope .tabs button[aria-selected="true"]{box-shadow:inset 0 -3px 0 var(--ac-y),var(--shadow)}
.ac-scope .btn.primary{background:var(--ac-k);border-color:var(--ac-k);color:#fff}
.ac-scope .btn.primary:hover{filter:none;color:var(--ac-y)}
.ac-scope .lnk{color:var(--ink);text-decoration:underline;text-decoration-color:var(--ac-y);text-decoration-thickness:2px;text-underline-offset:3px}
.ac-scope .chip[aria-pressed="true"]{background:var(--ac-k);color:var(--ac-y);border-color:var(--ac-k)}
.ac-scope .bar>i,.ac-scope .ac-prog .bar>i,.ac-scope .ac-side>header .bar>i{background:var(--ac-y)}
.ac-scope .bar{background:#EDEBE4}
.ac-hero{background:var(--ac-k);border:0;color:#fff;grid-template-columns:1fr 1.05fr;align-items:center}
.ac-hero h1{color:#fff}.ac-hero p{color:#D9D9D4}.ac-hero .kick{color:var(--ac-y)}
.ac-hero::before{content:"";position:absolute;left:clamp(18px,4vw,40px);top:0;width:64px;height:6px;background:var(--ac-y);border-radius:0 0 4px 4px}
.ac-hv{min-width:0}.ac-hv .ac-video{border-radius:14px;box-shadow:0 0 0 1px #2A2A2A}
.ac-hv>p{color:#A3A3A0!important}.ac-hv a{color:var(--ac-y)}.ac-hvc{margin:8px 0 0!important;font-size:13.5px;color:#D9D9D4!important}
.ac-hv-empty{aspect-ratio:16/9;border:1.5px dashed #3A3A3A;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#BDBDB8;text-align:center;padding:12px}
.ac-hv-empty .pl{width:54px;height:54px;border-radius:50%;background:var(--ac-y);color:var(--ac-k);display:grid;place-items:center;font-size:20px;padding-left:4px;margin-bottom:4px}
.ac-hv-empty b{color:#fff}.ac-hv-empty small{font-size:12.5px}
.ac-hv-empty .btn{background:#1C1C1C;border-color:#333;color:#fff;margin-top:6px}
.ac-box .ac-hv-empty{background:var(--ac-k)}
.ac-hvadm{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}
.ac-cv .lv{background:#fff;color:var(--ac-k)}.ac-cv .lock{background:var(--ac-k);color:var(--ac-y)}
.ac-card:hover{box-shadow:0 0 0 2px var(--ac-y),0 10px 30px rgba(12,12,12,.08)}
.ac-area{color:var(--ac-k);display:flex;align-items:center;gap:8px}.ac-area::before{content:"";width:14px;height:6px;border-radius:2px;background:var(--ac-y)}
.ac-sec h2{display:flex;align-items:center;gap:10px}
.ac-st.done{background:var(--ac-k);border-color:var(--ac-k);color:var(--ac-y)}
.ac-st.cur{border-color:var(--ac-k);box-shadow:inset 0 0 0 4px #fff,inset 0 0 0 12px var(--ac-y)}
.ac-side button[aria-current="page"]{background:var(--ac-ys)}
.ac-text blockquote{border-left-color:var(--ac-y);background:#FFFBEA}
.ac-pend{background:#FFFBEA;border-color:#EAD98A;color:#5A4E1C}
.ac-opt input{accent-color:var(--ac-k)}
.ac-scope .pill.p-ok{background:var(--ac-k);color:var(--ac-y)}
.ac-kpis{border-top:4px solid var(--ac-y)}
.ac-th{border-top:4px solid var(--ac-y)}
@media (max-width:700px){.ac-hero{grid-template-columns:1fr}.ac-hvadm{grid-template-columns:1fr}}
`;(document.body||document.head).appendChild(st)})();
