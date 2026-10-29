function showBackdrop(){$('#backdrop').classList.remove('hidden')}
function hideBackdropIfPossible(){if($('#bookmarkSheet').classList.contains('hidden')&&$('#themePanel').classList.contains('hidden'))$('#backdrop').classList.add('hidden')}
const PALETTES=[['warm','Warm','#fff','#b42318','#1c1917'],['github','GitHub','#f6f8fa','#0969da','#1f2328'],['nord','Nord','#eceff4','#5e81ac','#2e3440'],['dracula','Dracula','#282a36','#bd93f9','#ff79c6'],['catppuccin','Catppuccin','#1e1e2e','#cba6f7','#89b4fa'],['solarized','Solarized','#fdf6e3','#268bd2','#2aa198']];
function themePref(){try{return JSON.parse(localStorage.getItem(THEME_KEY)||'null')||{palette:'warm',mode:'system'}}catch{return {palette:'warm',mode:'system'}}}
function applyTheme(){const pref=themePref(),dark=matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.palette=pref.palette;document.documentElement.dataset.mode=pref.mode==='system'?(dark?'dark':'light'):pref.mode;renderThemeControls()}
function setThemePart(key,value){const pref=themePref();pref[key]=value;localStorage.setItem(THEME_KEY,JSON.stringify(pref));applyTheme()}
function renderThemeControls(){
  const pref=themePref();$('#themeModes').innerHTML=[['system','跟隨系統'],['light','淺色'],['dark','深色']].map(([k,l])=>`<button class="${pref.mode===k?'active':''}" type="button" data-theme-mode="${k}">${l}</button>`).join('');
  $('#paletteGrid').innerHTML=PALETTES.map(([k,l,c1,c2,c3])=>`<button class="palette ${pref.palette===k?'active':''}" type="button" data-palette="${k}"><span class="swatches"><i style="background:${c1}"></i><i style="background:${c2}"></i><i style="background:${c3}"></i></span><span><b>${l}</b><small>Theme preset</small></span></button>`).join('');
}
function openTheme(){renderThemeControls();showBackdrop();$('#themePanel').classList.remove('hidden')}
function closeTheme(){$('#themePanel').classList.add('hidden');hideBackdropIfPossible()}

function exportJSON(){
  const payload=JSON.stringify({version:2,folders:state.folders,bookmarks:state.bookmarks},null,2),link=document.createElement('a');link.href=URL.createObjectURL(new Blob([payload],{type:'application/json'}));link.download=`cloud-bookmarks-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
async function importJSON(file){
  try{const raw=JSON.parse(await file.text()),imported=normalizeState(raw);if(!imported.bookmarks.length&&!confirm('匯入檔案沒有書籤，仍要覆蓋目前資料嗎？'))return;if(!confirm(`將匯入 ${imported.bookmarks.length} 個書籤並覆蓋目前本機資料，繼續嗎？`))return;state=imported;persist();expanded={};localStorage.setItem(EXPANDED_KEY,'{}');currentView='all';render()}
  catch{alert('JSON 格式無法讀取。')}finally{$('#importFile').value=''}
}

function reorderFolder(from,to){if(!from||!to||from===to)return;const i=state.folders.indexOf(from);if(i<0)return;const [folder]=state.folders.splice(i,1),j=state.folders.indexOf(to);state.folders.splice(j<0?state.folders.length:j,0,folder);persist();render()}
function moveBookmarkBefore(id,targetId){if(!id||!targetId||id===targetId)return;const i=state.bookmarks.findIndex(b=>b.id===id);if(i<0)return;const [bookmark]=state.bookmarks.splice(i,1),target=state.bookmarks.find(b=>b.id===targetId);if(!target)return;bookmark.folder=target.folder;const j=state.bookmarks.findIndex(b=>b.id===targetId);state.bookmarks.splice(j,0,bookmark);persist();render()}
function moveBookmarkToFolder(id,folder){if(!state.folders.includes(folder))return;const i=state.bookmarks.findIndex(b=>b.id===id);if(i<0)return;const [bookmark]=state.bookmarks.splice(i,1);bookmark.folder=folder;let last=-1;state.bookmarks.forEach((b,k)=>{if(b.folder===folder)last=k});state.bookmarks.splice(last+1,0,bookmark);persist();render()}
function moveBookmarkStep(id,direction){const b=state.bookmarks.find(x=>x.id===id);if(!b)return;const same=state.bookmarks.filter(x=>x.folder===b.folder),local=same.findIndex(x=>x.id===id),target=same[local+direction];if(!target)return;const from=state.bookmarks.findIndex(x=>x.id===id),[moved]=state.bookmarks.splice(from,1);let j=state.bookmarks.findIndex(x=>x.id===target.id);if(direction>0)j+=1;state.bookmarks.splice(j,0,moved);persist();render()}
function openMobileOverflow(anchor){const menu=$('#mobileOverflow');menu.innerHTML='<button type="button" data-theme>◐ 配色主題</button><button type="button" data-import>⇧ 匯入書籤</button><button type="button" data-export>⇩ 匯出書籤</button>';const rect=anchor.getBoundingClientRect();menu.classList.remove('hidden');menu.style.left=`${Math.max(8,rect.right-190)}px`;menu.style.top=`${rect.bottom+5}px`}
