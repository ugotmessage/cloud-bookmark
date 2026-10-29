function openBookmark(id){const b=state.bookmarks.find(x=>x.id===id);if(!b)return;b.recent=Date.now();persist();renderSidebar();window.open(normalizeUrl(b.url),'_blank','noopener,noreferrer')}
function setFavorite(id,forced){const b=state.bookmarks.find(x=>x.id===id);if(!b)return;b.favorite=typeof forced==='boolean'?forced:!b.favorite;persist();render()}
function suggestTitleFromUrl(){if($('#bookmarkName').value.trim()&&!titleAutoSuggested)return;const host=hostOf($('#bookmarkUrl').value);if(!host)return;const part=host.split('.')[0].replace(/[-_]+/g,' ');$('#bookmarkName').value=part.replace(/\b\w/g,c=>c.toUpperCase());titleAutoSuggested=true}
function openSheet(bookmark=null){
  renderFolderSelect();$('#sheetTitle').textContent=bookmark?'編輯書籤':'新增書籤';$('#bookmarkId').value=bookmark?.id||'';$('#bookmarkUrl').value=bookmark?.url||'';$('#bookmarkName').value=bookmark?.name||'';
  $('#bookmarkFolder').value=bookmark?.folder||(currentView.startsWith('folder:')?currentView.slice(7):state.folders[0]);$('#bookmarkFavorite').classList.toggle('on',!!bookmark?.favorite);$('#bookmarkFavorite').setAttribute('aria-pressed',String(!!bookmark?.favorite));titleAutoSuggested=false;showBackdrop();$('#bookmarkSheet').classList.remove('hidden');setTimeout(()=>$('#bookmarkUrl').focus(),30)
}
function closeSheet(){$('#bookmarkSheet').classList.add('hidden');hideBackdropIfPossible()}
function saveBookmark(){
  const id=$('#bookmarkId').value,url=normalizeUrl($('#bookmarkUrl').value),name=$('#bookmarkName').value.trim(),folder=$('#bookmarkFolder').value||'未分類';if(!url||!name)return;
  if(!state.folders.includes(folder))state.folders.push(folder);
  if(id){const existing=state.bookmarks.find(b=>b.id===id);if(existing)Object.assign(existing,{name,url,folder,favorite:$('#bookmarkFavorite').classList.contains('on')})}
  else{state.bookmarks.unshift({id:`b-${Date.now()}`,name,url,folder,favorite:$('#bookmarkFavorite').classList.contains('on'),recent:0,createdAt:Date.now()});expanded[folder]=true;localStorage.setItem(EXPANDED_KEY,JSON.stringify(expanded))}
  persist();closeSheet();render();
}
function addFolder(){const folder=prompt('新資料夾名稱')?.trim();if(!folder||state.folders.includes(folder))return;const i=state.folders.indexOf('未分類');state.folders.splice(i>=0?i:state.folders.length,0,folder);persist();render()}

function openBookmarkMenu(id,anchor){
  menuBookmarkId=id;const b=state.bookmarks.find(x=>x.id===id);if(!b)return;const menu=$('#contextMenu');
  menu.innerHTML=`<button type="button" data-action="edit">編輯</button><button type="button" data-action="move">移動到…</button><button type="button" data-action="up">往上移</button><button type="button" data-action="down">往下移</button><button type="button" data-action="copy">複製網址</button><button type="button" data-action="favorite">${b.favorite?'移出我的最愛':'加入我的最愛'}</button><button class="danger" type="button" data-action="delete">刪除</button>`;
  const rect=anchor.getBoundingClientRect();menu.classList.remove('hidden');menu.style.left=`${Math.min(innerWidth-200,Math.max(8,rect.right-190))}px`;menu.style.top=`${Math.min(innerHeight-290,rect.bottom+5)}px`;
}
function handleBookmarkAction(action){
  const b=state.bookmarks.find(x=>x.id===menuBookmarkId);if(!b)return;
  if(action==='edit')openSheet(b);if(action==='favorite')setFavorite(b.id);if(action==='copy')navigator.clipboard?.writeText(b.url);
  if(action==='move'){const folder=prompt(`移動到哪個資料夾？\n${state.folders.join(' / ')}`,b.folder)?.trim();if(folder&&state.folders.includes(folder))moveBookmarkToFolder(b.id,folder)}
  if(action==='up')moveBookmarkStep(b.id,-1);if(action==='down')moveBookmarkStep(b.id,1);
  if(action==='delete'&&confirm(`刪除「${b.name}」？`)){state.bookmarks=state.bookmarks.filter(x=>x.id!==b.id);persist();render()}
  $('#contextMenu').classList.add('hidden');
}
