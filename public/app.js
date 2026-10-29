function routeScope(){
  const url=new URL(location.href),params=url.searchParams;
  const hadToken=Boolean(params.get('token'));
  let token=params.get('token')||'';
  let book=params.get('book')||'main';
  if(!token){
    const bytes=crypto.getRandomValues(new Uint8Array(20));
    token=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    params.set('token',token);
  }
  if(!params.get('book'))params.set('book',book);
  if(url.search!==location.search)history.replaceState(null,'',url.pathname+'?'+params.toString()+url.hash);
  return {token,book,hadToken};
}
const ROUTE=routeScope();
const STORAGE_KEY=`cloud-bookmarks:v3:${ROUTE.token}:${ROUTE.book}`;
const SETTINGS_KEY='cloud-bookmarks:settings';
const API_STATE=`/api/state?token=${encodeURIComponent(ROUTE.token)}&book=${encodeURIComponent(ROUTE.book)}`;
const COLORS=['#10a37f','#24292f','#d9593b','#4a6fd8','#7c3aed','#f59e0b','#0891b2','#be185d'];
const PALETTES=[
  ['warm','Warm',['#fff','#b42318','#1c1917']],
  ['github','GitHub',['#f6f8fa','#0969da','#1f2328']],
  ['nord','Nord',['#eceff4','#5e81ac','#2e3440']],
  ['dracula','Dracula',['#282a36','#bd93f9','#ff79c6']],
  ['catppuccin','Catppuccin',['#1e1e2e','#cba6f7','#89b4fa']],
  ['solarized','Solarized',['#fdf6e3','#268bd2','#2aa198']]
];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colorOf=s=>COLORS[[...String(s||'?')].reduce((a,c)=>a+c.charCodeAt(0),0)%COLORS.length];
const uid=()=>crypto.randomUUID?crypto.randomUUID():`b-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
const today=()=>new Date().toLocaleDateString('zh-TW');
const normalizeUrl=u=>String(u||'').trim().replace(/^https?:\/\//i,'');

const SAMPLE={
  folders:['股票','AI','工作','Server','工具','閱讀清單','設計參考','旅遊'],
  marks:[
    {n:'ChatGPT',u:'chatgpt.com',f:'AI',fav:1,d:'2024/06/01'},
    {n:'GitHub',u:'github.com',f:'AI',fav:1,d:'2024/06/01'},
    {n:'Claude',u:'claude.ai',f:'AI',fav:0,d:'2024/05/28'},
    {n:'Gemini',u:'gemini.google.com',f:'AI',fav:0,d:'2024/05/27'},
    {n:'OpenAI',u:'openai.com',f:'AI',fav:0,d:'2024/05/26'},
    {n:'Hugging Face',u:'huggingface.co',f:'AI',fav:0,d:'2024/05/25'},
    {n:'Perplexity',u:'perplexity.ai',f:'AI',fav:0,d:'2024/05/24'},
    {n:'Notion AI',u:'notion.so',f:'AI',fav:0,d:'2024/05/23'},
    {n:'XQ',u:'xq.com.tw',f:'股票',fav:1,d:'2024/05/20'},
    {n:'NAS',u:'192.168.1.10',f:'Server',fav:1,d:'2024/05/18'},
    {n:'Cloudflare Docs',u:'developers.cloudflare.com',f:'工具',fav:0,d:'2024/05/10'},
    {n:'Dribbble',u:'dribbble.com',f:'設計參考',fav:0,d:'2024/05/02'}
  ]
};

function normalizeMark(m,i=0){
  return {
    id:String(m.id||`b-${Date.now()}-${i}`),
    n:String(m.n??m.name??m.title??m.url??m.u??'Untitled'),
    u:normalizeUrl(m.u??m.url??''),
    f:String(m.f??m.folder??''),
    fav:Number(Boolean(m.fav??m.favorite)),
    d:String(m.d??m.addedDate??m.created_at??today()),
    lastOpened:Number(m.lastOpened??m.recent??0)||0
  };
}
function normalizeData(raw){
  if(!raw||typeof raw!=='object')raw=SAMPLE;
  const folders=Array.isArray(raw.folders)?raw.folders.map(String):Array.isArray(raw.folderOrder)?raw.folderOrder.map(String):[];
  const src=Array.isArray(raw.marks)?raw.marks:Array.isArray(raw.bookmarks)?raw.bookmarks:[];
  const marks=src.map(normalizeMark).filter(m=>m.u);
  const discovered=marks.map(m=>m.f).filter(Boolean);
  return {folders:[...new Set([...folders,...discovered])],marks};
}
function loadLocal(){
  try{
    const v3=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(v3)return normalizeData(v3);
    if(!ROUTE.hadToken){
      const legacy=JSON.parse(localStorage.getItem('cloud-bookmarks:v3')||'null');
      if(legacy)return normalizeData(legacy);
      const old=JSON.parse(localStorage.getItem('cb-v2-proto')||'null');
      if(old)return normalizeData(old);
    }
  }catch{}
  return normalizeData(SAMPLE);
}
function settings(){
  try{return {...{palette:'warm',mode:'system'},...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null')}}catch{return {palette:'warm',mode:'system'}}
}

let data=loadLocal();
let S={folders:data.folders,marks:data.marks,open:new Set(['AI']),cur:'all',view:localStorage.getItem('cloud-bookmarks:view')||'grid',q:''};
let editId=null,menuId=null,dragState=null,cloudReady=false,syncTimer=null,syncState='local';

function localSnapshot(){return {version:3,token:ROUTE.token,book:ROUTE.book,folders:S.folders,marks:S.marks}}
function persist({sync=true}={}){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(localSnapshot()));
  localStorage.setItem('cloud-bookmarks:view',S.view);
  if(sync)scheduleCloudSync();
}
function setSyncState(next){syncState=next;document.querySelectorAll('.sync-dot').forEach(el=>{el.className=`sync-dot ${next}`;el.title=next==='cloud'?'已同步 D1':next==='syncing'?'同步中':next==='error'?'雲端同步失敗':'本機模式'})}
function scheduleCloudSync(){
  if(!cloudReady)return;
  clearTimeout(syncTimer);setSyncState('syncing');
  syncTimer=setTimeout(syncCloud,450);
}
async function syncCloud(){
  try{
    const r=await fetch(API_STATE,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(localSnapshot())});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    setSyncState('cloud');
  }catch(e){console.warn('Cloud sync failed',e);setSyncState('error')}
}
async function hydrateCloud(){
  try{
    const r=await fetch(API_STATE,{headers:{accept:'application/json'}});
    if(r.status===503||r.status===404){setSyncState('local');return}
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const remote=await r.json();cloudReady=true;
    if(remote.initialized){
      const normalized=normalizeData(remote);
      S.folders=normalized.folders;S.marks=normalized.marks;persist({sync:false});render();
    }else{
      await syncCloud();
    }
    setSyncState('cloud');
  }catch(e){console.warn('Cloud bootstrap unavailable',e);setSyncState('local')}
}

const icon=m=>`<span class="ico" style="background:${colorOf(m.n)}">${esc((m.n||'?')[0].toUpperCase())}</span>`;
const hit=m=>!S.q||`${m.n} ${m.u} ${m.f}`.toLowerCase().includes(S.q.toLowerCase());
const inF=f=>S.marks.filter(m=>m.f===f&&hit(m));
const markById=id=>S.marks.find(m=>m.id===id);

function goById(id){const m=markById(id);if(!m)return;m.lastOpened=Date.now();persist();renderDesktop();window.open('https://'+m.u.replace(/^https?:\/\//,''),'_blank','noopener,noreferrer')}
function favById(id){const m=markById(id);if(!m)return;m.fav=m.fav?0:1;persist();render()}
function setQ(v){S.q=v;render()}
function setView(v){S.view=v;persist({sync:false});render()}
function setCur(c){S.cur=c;render()}
function toggle(f){S.open.has(f)?S.open.delete(f):S.open.add(f);renderMobile();queueSortableInit()}

function mobileRow(m){
  return `<div class="row sortable-item" data-id="${esc(m.id)}" data-folder="${esc(m.f)}">
    ${icon(m)}<div class="t" onclick="goById('${esc(m.id)}')"><b>${esc(m.n)}</b><small>${esc(m.u)}</small></div>
    <button class="star ${m.fav?'on':''}" onclick="favById('${esc(m.id)}')">${m.fav?'★':'☆'}</button>
    <button class="more" onclick="openMarkMenu('${esc(m.id)}',this,event)">⋯</button>
  </div>`;
}
function renderMobile(){
  const favs=S.marks.filter(m=>m.fav&&hit(m));
  let h=`<header><h1>雲端書籤 <span class="sync-dot ${syncState}"></span></h1><span><button class="head-act" onclick="focusMobileSearch()">🔍</button><button class="head-act" onclick="openToolsMenu(this)">⋮</button></span></header>
  <div class="search"><span>🔍</span><input id="mq" placeholder="搜尋書籤…" value="${esc(S.q)}" oninput="setQ(this.value)"></div>
  <div class="sec"><span style="color:#f59e0b">★</span> 我的最愛</div>
  <div class="fav-row">${favs.map(m=>`<button class="chip" onclick="goById('${esc(m.id)}')">${icon(m)}${esc(m.n)}<small>${esc(m.u)}</small></button>`).join('')||'<span class="empty">尚無最愛</span>'}</div>`;
  S.folders.forEach(f=>{
    const list=inF(f),open=S.open.has(f);
    h+=`<button class="fold ${open?'open':''}" data-folder="${esc(f)}" onclick="toggle('${esc(f)}')">📁 ${esc(f)}<span class="n">${list.length}</span><span class="ch">›</span></button>`;
    if(open)h+=`<div class="bookmark-sortable mobile-bookmark-sortable" data-folder="${esc(f)}">${list.map(mobileRow).join('')||'<div class="empty sortable-empty">空資料夾</div>'}</div>`;
  });
  const none=S.marks.filter(m=>!m.f&&hit(m));
  if(none.length){
    const f='未分類',open=S.open.has(f);
    h+=`<button class="fold ${open?'open':''}" onclick="toggle('${f}')">📁 ${f}<span class="n">${none.length}</span><span class="ch">›</span></button>`;
    if(open)h+=`<div class="bookmark-sortable mobile-bookmark-sortable" data-folder="">${none.map(mobileRow).join('')||'<div class="empty sortable-empty">空資料夾</div>'}</div>`;
  }
  $('m').innerHTML=h;
}
function focusMobileSearch(){const q=$('mq');q?.focus()}

function nav(k,l,n,ic,folder=''){
  if(folder){
    return `<div class="nav folder-nav sortable-folder-item ${S.cur===k?'act':''}" data-folder="${esc(folder)}" role="button" tabindex="0" onclick="setCur('${esc(k)}')"><span class="folder-handle" title="拖曳資料夾">⋮⋮</span><span>${ic}</span><span class="folder-label">${esc(l)}</span><span class="n">${n}</span><div class="folder-drop-host" data-folder="${esc(folder)}"></div></div>`;
  }
  return `<button class="nav ${S.cur===k?'act':''}" onclick="setCur('${esc(k)}')">${ic} ${esc(l)}<span class="n">${n}</span></button>`;
}
function filteredDesktop(){
  let list=S.marks.filter(hit),title='全部書籤';
  if(S.cur==='fav'){list=list.filter(m=>m.fav);title='我的最愛'}
  else if(S.cur==='recent'){list=list.filter(m=>m.lastOpened).sort((a,b)=>b.lastOpened-a.lastOpened).slice(0,20);title='最近開啟'}
  else if(S.cur==='none'){list=list.filter(m=>!m.f);title='未分類'}
  else if(S.cur.startsWith('f:')){title=S.cur.slice(2);list=list.filter(m=>m.f===title)}
  return {list,title};
}
function renderDesktop(){
  const cnt=f=>S.marks.filter(m=>m.f===f).length;
  $('dnav').innerHTML=nav('all','全部書籤',S.marks.length,'🔖')+nav('fav','我的最愛',S.marks.filter(m=>m.fav).length,'☆')+nav('recent','最近開啟',S.marks.filter(m=>m.lastOpened).length,'🕘')+nav('none','未分類',S.marks.filter(m=>!m.f).length,'📁');
  $('dfold').innerHTML=S.folders.map(f=>nav('f:'+f,f,cnt(f),'📁',f)).join('');
  const {list,title}=filteredDesktop();
  $('dtitle').innerHTML=`${esc(title)} <span class="sync-dot ${syncState}"></span>`;$('dcount').textContent=list.length+' 個書籤';
  $('vl').className=S.view==='list'?'on':'';$('vg').className=S.view==='grid'?'on':'';
  if(!list.length){$('dcontent').innerHTML='<div class="empty">沒有符合的書籤</div>';return}
  $('dcontent').innerHTML=S.view==='grid'
   ?`<div class="grid bookmark-sortable desktop-bookmark-sortable">${list.map(m=>`<div class="card sortable-item" data-id="${esc(m.id)}" data-folder="${esc(m.f)}"><button class="star ${m.fav?'on':''}" onclick="event.stopPropagation();favById('${esc(m.id)}')">${m.fav?'★':'☆'}</button><button class="more" onclick="openMarkMenu('${esc(m.id)}',this,event)">⋯</button>${icon(m)}<div onclick="goById('${esc(m.id)}')" style="cursor:pointer"><b>${esc(m.n)}</b><small>${esc(m.u)}</small></div><span class="drag-handle" title="拖曳排序">⋮⋮</span></div>`).join('')}</div>`
   :`<table><thead><tr><th>名稱</th><th>網址</th><th>資料夾</th><th>加入日期</th><th></th></tr></thead><tbody class="bookmark-sortable desktop-bookmark-sortable">${list.map(m=>`<tr class="sortable-item" data-id="${esc(m.id)}" data-folder="${esc(m.f)}"><td><span class="drag-handle table-drag" title="拖曳排序">⋮⋮</span>${icon(m)}<button onclick="goById('${esc(m.id)}')">${esc(m.n)}</button></td><td>${esc(m.u)}</td><td>${esc(m.f||'-')}</td><td>${esc(m.d)}</td><td class="table-actions"><button class="star ${m.fav?'on':''}" onclick="favById('${esc(m.id)}')">${m.fav?'★':'☆'}</button><button class="more" onclick="openMarkMenu('${esc(m.id)}',this,event)">⋯</button></td></tr>`).join('')}</tbody></table>`;
}
function render(){renderMobile();renderDesktop();queueSortableInit()}

function openSheet(id=null){
  editId=id;const m=id?markById(id):null;
  $('ff').innerHTML='<option value="">未分類</option>'+S.folders.map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join('');
  const currentFolder=S.cur.startsWith('f:')?S.cur.slice(2):'';
  $('ff').value=m?.f??currentFolder;$('fu').value=m?.u||'';$('ft').value=m?.n||'';$('fs').classList.toggle('on',!!m?.fav);
  document.querySelector('.sheet .hd span').textContent=m?'編輯書籤':'新增書籤';
  document.querySelector('.sheet .btn').textContent=m?'儲存變更':'儲存';
  $('mask').classList.add('show');$('fu').focus();
}
function closeSheet(){$('mask').classList.remove('show');editId=null}
function autoTitle(){
  if(editId&&$('ft').value.trim())return;
  try{const h=new URL($('fu').value.startsWith('http')?$('fu').value:'https://'+$('fu').value).hostname.replace(/^www\./,'');const p=h.split('.');$('ft').value=p.length>2?p.slice(0,-1).map(s=>s[0].toUpperCase()+s.slice(1)).join(' '):p[0][0].toUpperCase()+p[0].slice(1)}catch{}
}
function save(){
  const u=normalizeUrl($('fu').value);if(!u)return;
  const next={n:$('ft').value.trim()||u,u,f:$('ff').value,fav:$('fs').classList.contains('on')?1:0};
  if(editId){const m=markById(editId);if(m)Object.assign(m,next)}
  else S.marks.unshift({id:uid(),...next,d:today(),lastOpened:0});
  if(next.f)S.open.add(next.f);persist();closeSheet();render();
}
function addFolder(){const n=prompt('新資料夾名稱')?.trim();if(n&&!S.folders.includes(n)){S.folders.push(n);persist();render()}}

function ensureContext(){
  let el=document.getElementById('context');
  if(!el){el=document.createElement('div');el.id='context';el.className='context';el.hidden=true;document.body.appendChild(el)}
  return el;
}
function placeMenu(menu,anchor){const r=anchor.getBoundingClientRect();menu.style.left=Math.min(innerWidth-190,Math.max(8,r.right-180))+'px';menu.style.top=Math.min(innerHeight-270,r.bottom+5)+'px';menu.hidden=false}
function openMarkMenu(id,anchor,event){event?.stopPropagation();menuId=id;const m=markById(id);if(!m)return;const menu=ensureContext();menu.innerHTML=`<button onclick="openSheet('${esc(id)}');hideContext()">編輯</button><button onclick="moveMark('${esc(id)}');hideContext()">移動到…</button><button onclick="moveStep('${esc(id)}',-1);hideContext()">往上移</button><button onclick="moveStep('${esc(id)}',1);hideContext()">往下移</button><button onclick="favById('${esc(id)}');hideContext()">${m.fav?'移出我的最愛':'加入我的最愛'}</button><button class="danger" onclick="deleteMark('${esc(id)}');hideContext()">刪除</button>`;placeMenu(menu,anchor)}
function hideContext(){const m=document.getElementById('context');if(m)m.hidden=true}
function moveMark(id){const m=markById(id);if(!m)return;const choices=['未分類',...S.folders];const answer=prompt('移動到哪個資料夾？\n'+choices.join(' / '),m.f||'未分類')?.trim();if(!answer)return;if(answer==='未分類')m.f='';else if(S.folders.includes(answer))m.f=answer;else return;persist();render()}
function moveStep(id,dir){const m=markById(id);if(!m)return;const same=S.marks.filter(x=>x.f===m.f),i=same.findIndex(x=>x.id===id),target=same[i+dir];if(!target)return;const from=S.marks.findIndex(x=>x.id===id),[item]=S.marks.splice(from,1);let to=S.marks.findIndex(x=>x.id===target.id);if(dir>0)to++;S.marks.splice(to,0,item);persist();render()}
function deleteMark(id){const m=markById(id);if(!m||!confirm(`刪除「${m.n}」？`))return;S.marks=S.marks.filter(x=>x.id!==id);persist();render()}

let sortableInstances=[],sortableFrame=null,dropIndicator=null;

function queueSortableInit(){
  cancelAnimationFrame(sortableFrame);
  sortableFrame=requestAnimationFrame(initSortables);
}
function destroySortables(){
  sortableInstances.forEach(instance=>{try{instance.destroy()}catch{}});
  sortableInstances=[];
  hideDropIndicator();
}
function ensureDropIndicator(){
  if(dropIndicator)return dropIndicator;
  dropIndicator=document.createElement('div');
  dropIndicator.className='drop-indicator';
  document.body.appendChild(dropIndicator);
  return dropIndicator;
}
function hideDropIndicator(){if(dropIndicator)dropIndicator.hidden=true}
function showDropIndicator(related,after,container){
  if(!related)return hideDropIndicator();
  const line=ensureDropIndicator(),r=related.getBoundingClientRect(),grid=container?.classList.contains('grid');
  line.hidden=false;
  if(grid){
    line.classList.add('vertical');
    line.style.left=(after?r.right:r.left-1)+'px';
    line.style.top=r.top+'px';
    line.style.width='3px';
    line.style.height=r.height+'px';
  }else{
    line.classList.remove('vertical');
    line.style.left=r.left+'px';
    line.style.top=(after?r.bottom-1:r.top-1)+'px';
    line.style.width=r.width+'px';
    line.style.height='3px';
  }
}
function visibleIds(container){return [...container.querySelectorAll(':scope > .sortable-item')].map(el=>el.dataset.id).filter(Boolean)}
function reorderSubset(ids){
  if(ids.length<2)return;
  const set=new Set(ids),map=new Map(S.marks.map(m=>[m.id,m])),ordered=ids.map(id=>map.get(id)).filter(Boolean);
  let p=0;
  S.marks=S.marks.map(m=>set.has(m.id)?ordered[p++]:m);
}
function applyFolderContainerOrder(container){
  const folder=container.dataset.folder||'',ids=visibleIds(container);
  const folderMarks=S.marks.filter(m=>m.f===folder);
  if(ids.length!==folderMarks.length)return reorderSubset(ids);
  const map=new Map(folderMarks.map(m=>[m.id,m])),ordered=ids.map(id=>map.get(id)).filter(Boolean);
  let p=0;
  S.marks=S.marks.map(m=>m.f===folder?ordered[p++]:m);
}
function sortableStart(evt){
  document.body.classList.add('sorting-bookmark');
  evt.item?.classList.add('is-drag-source');
}
function sortableEnd(evt){
  document.body.classList.remove('sorting-bookmark');
  evt.item?.classList.remove('is-drag-source');
  hideDropIndicator();
}
function initSortables(){
  destroySortables();
  if(typeof Sortable==='undefined')return;
  const mobile=innerWidth<768;
  const containers=[...document.querySelectorAll(mobile?'.mobile-bookmark-sortable':'.desktop-bookmark-sortable')];
  containers.forEach(container=>{
    sortableInstances.push(new Sortable(container,{
      group:{name:'bookmarks',pull:true,put:true},
      draggable:'.sortable-item',
      handle:mobile?undefined:'.drag-handle',
      animation:180,
      easing:'cubic-bezier(.2,.8,.2,1)',
      ghostClass:'sortable-ghost',
      chosenClass:'sortable-chosen',
      dragClass:'sortable-drag',
      forceFallback:true,
      fallbackOnBody:true,
      fallbackTolerance:4,
      delay:mobile?180:0,
      delayOnTouchOnly:true,
      touchStartThreshold:4,
      emptyInsertThreshold:28,
      onStart:sortableStart,
      onMove:evt=>{showDropIndicator(evt.related,evt.willInsertAfter,evt.to);return true},
      onAdd:evt=>{
        const moved=markById(evt.item.dataset.id);
        if(moved&&evt.to.classList.contains('mobile-bookmark-sortable'))moved.f=evt.to.dataset.folder||'';
        if(evt.from?.classList.contains('mobile-bookmark-sortable'))applyFolderContainerOrder(evt.from);
        if(evt.to.classList.contains('mobile-bookmark-sortable'))applyFolderContainerOrder(evt.to);else reorderSubset(visibleIds(evt.to));
        persist();sortableEnd(evt);render();
      },
      onUpdate:evt=>{
        if(evt.to.classList.contains('mobile-bookmark-sortable'))applyFolderContainerOrder(evt.to);
        else reorderSubset(visibleIds(evt.to));
        persist();sortableEnd(evt);render();
      },
      onEnd:evt=>sortableEnd(evt)
    }));
  });

  if(!mobile){
    const folders=$('dfold');
    if(folders){
      sortableInstances.push(new Sortable(folders,{
        draggable:'.sortable-folder-item',
        handle:'.folder-handle',
        animation:180,
        ghostClass:'sortable-folder-ghost',
        chosenClass:'sortable-chosen',
        forceFallback:true,
        fallbackOnBody:true,
        onStart:()=>document.body.classList.add('sorting-folder'),
        onEnd:()=>{
          document.body.classList.remove('sorting-folder');
          S.folders=[...folders.querySelectorAll(':scope > .sortable-folder-item')].map(el=>el.dataset.folder).filter(Boolean);
          persist();render();
        }
      }));
    }
    document.querySelectorAll('.folder-drop-host').forEach(host=>{
      sortableInstances.push(new Sortable(host,{
        group:{name:'bookmarks',pull:false,put:true},
        sort:false,
        draggable:'.sortable-item',
        forceFallback:true,
        ghostClass:'sortable-folder-drop-ghost',
        onAdd:evt=>{
          const moved=markById(evt.item.dataset.id),folder=host.dataset.folder;
          if(moved&&folder){
            moved.f=folder;
            persist();
            toast(`已移動到「${folder}」`);
          }
          sortableEnd(evt);render();
        }
      }));
    });
  }
}
window.addEventListener('resize',()=>queueSortableInit());

function createThemePanel(){
  let mask=document.getElementById('themeMask');if(mask)return mask;
  mask=document.createElement('div');mask.id='themeMask';mask.className='theme-mask';mask.hidden=true;mask.onclick=e=>{if(e.target===mask)mask.hidden=true};document.body.appendChild(mask);return mask;
}
function applyTheme(){const s=settings(),dark=matchMedia('(prefers-color-scheme:dark)').matches,mode=s.mode==='system'?(dark?'dark':'light'):s.mode;document.documentElement.dataset.theme=s.palette;document.documentElement.dataset.mode=mode}
function openTheme(){hideContext();const s=settings(),mask=createThemePanel();mask.innerHTML=`<div class="theme-panel"><div class="theme-head"><b>配色主題</b><button onclick="document.getElementById('themeMask').hidden=true">完成</button></div><div class="theme-modes">${[['system','跟隨系統'],['light','淺色'],['dark','深色']].map(([k,l])=>`<button class="${s.mode===k?'on':''}" onclick="setTheme('mode','${k}')">${l}</button>`).join('')}</div><div class="theme-grid">${PALETTES.map(([k,l,cs])=>`<button class="theme-choice ${s.palette===k?'on':''}" onclick="setTheme('palette','${k}')"><span class="swatches">${cs.map(c=>`<i style="background:${c}"></i>`).join('')}</span><b>${l}</b><small>Theme preset</small></button>`).join('')}</div></div>`;mask.hidden=false}
function setTheme(key,value){const s=settings();s[key]=value;localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));applyTheme();openTheme()}

function openToolsMenu(anchor){
  const menu=ensureContext();menu.innerHTML=`<button onclick="copyLibraryLink();hideContext()">🔗 複製此書籤庫連結</button><button onclick="triggerImport();hideContext()">⇧ 匯入書籤</button><button onclick="downloadJSON();hideContext()">⇩ 匯出書籤</button><button onclick="openTheme()">◐ 配色主題</button>`;placeMenu(menu,anchor)
}
async function copyLibraryLink(){
  try{await navigator.clipboard.writeText(location.href);toast(`已複製 ${ROUTE.book} 書籤庫連結`)}
  catch{prompt('複製此書籤庫連結',location.href)}
}
function triggerImport(){let input=document.getElementById('importInput');if(!input){input=document.createElement('input');input.id='importInput';input.type='file';input.accept='.json,application/json';input.hidden=true;input.onchange=()=>{if(input.files?.[0])importJSON(input.files[0]);input.value=''};document.body.appendChild(input)}input.click()}
async function importJSON(file){
  try{const raw=JSON.parse(await file.text()),next=normalizeData(raw);if(!confirm(`將匯入 ${next.marks.length} 個書籤並覆蓋目前資料，繼續嗎？`))return;S.folders=next.folders;S.marks=next.marks;S.open=new Set(next.folders.slice(0,1));S.cur='all';S.q='';persist();render();toast(`已匯入 ${next.marks.length} 個書籤`)}catch(e){alert('JSON 格式無法讀取')}
}
function downloadJSON(){const blob=new Blob([JSON.stringify(localSnapshot(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`cloud-bookmarks-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportJSON(){downloadJSON()}
function toast(text){const el=document.createElement('div');el.className='toast';el.textContent=text;document.body.appendChild(el);setTimeout(()=>el.remove(),1600)}

document.addEventListener('click',e=>{if(!e.target.closest('.context')&&!e.target.closest('.more')&&!e.target.closest('.head-act'))hideContext();document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'))});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();(innerWidth>=768?$('dq'):$('mq'))?.focus()}if(e.key==='Escape'){hideContext();const t=document.getElementById('themeMask');if(t)t.hidden=true;closeSheet()}});
matchMedia('(prefers-color-scheme:dark)').addEventListener?.('change',()=>{if(settings().mode==='system')applyTheme()});

applyTheme();render();hydrateCloud();
