function navItemHTML(key,icon,label,count){
  return `<button class="nav-item ${currentView===key?'active':''}" type="button" data-view="${escapeHTML(key)}"><span>${icon}</span><span class="nav-name">${escapeHTML(label)}</span><span class="nav-count">${count}</span></button>`;
}
function renderSidebar(){
  const recentCount=state.bookmarks.filter(b=>b.recent).length;
  $('#desktopNav').innerHTML=navItemHTML('all','▱','全部書籤',state.bookmarks.length)+navItemHTML('favorites','☆','我的最愛',state.bookmarks.filter(b=>b.favorite).length)+navItemHTML('recent','◷','最近開啟',recentCount)+navItemHTML('unsorted','□','未分類',state.bookmarks.filter(b=>b.folder==='未分類').length);
  $('#desktopFolders').innerHTML=state.folders.filter(f=>f!=='未分類').map(folder=>{
    const count=state.bookmarks.filter(b=>b.folder===folder).length;
    return `<button class="folder-nav-item ${currentView===`folder:${folder}`?'active':''}" type="button" draggable="true" data-drag-folder="${escapeHTML(folder)}" data-folder-target="${escapeHTML(folder)}" data-view="folder:${escapeHTML(folder)}"><span class="grip" draggable="true" data-drag-folder="${escapeHTML(folder)}">⋮⋮</span><span>▱</span><span class="nav-name">${escapeHTML(folder)}</span><span class="nav-count">${count}</span></button>`;
  }).join('');
}
function currentItems(){
  let items=[...state.bookmarks];
  if(currentView==='favorites')items=items.filter(b=>b.favorite);
  if(currentView==='recent')items=items.filter(b=>b.recent).sort((a,b)=>b.recent-a.recent);
  if(currentView==='unsorted')items=items.filter(b=>b.folder==='未分類');
  if(currentView.startsWith('folder:'))items=items.filter(b=>b.folder===currentView.slice(7));
  const query=$('#desktopSearch').value.trim().toLowerCase();
  if(query)items=items.filter(b=>[b.name,b.url,b.folder,hostOf(b.url)].some(v=>String(v).toLowerCase().includes(query)));
  return items;
}
function renderDesktop(){
  const items=currentItems();let title='全部書籤';
  if(currentView==='favorites')title='我的最愛';if(currentView==='recent')title='最近開啟';if(currentView==='unsorted')title='未分類';if(currentView.startsWith('folder:'))title=currentView.slice(7);
  $('#desktopTitle').textContent=title;$('#desktopCount').textContent=`${items.length} 個書籤`;$$('[data-layout]').forEach(btn=>btn.classList.toggle('active',btn.dataset.layout===layout));
  if(!items.length){$('#desktopContent').innerHTML='<div class="empty">沒有符合的書籤</div>';return}
  if(layout==='list'){
    $('#desktopContent').innerHTML=`<table class="bookmark-table"><thead><tr><th>名稱</th><th>網址</th><th>資料夾</th><th>加入日期</th><th></th></tr></thead><tbody>${items.map(bookmark=>`<tr data-bookmark="${escapeHTML(bookmark.id)}" data-folder-target="${escapeHTML(bookmark.folder)}"><td><div class="table-name"><span class="grip table-grip" draggable="true" data-drag-bookmark="${escapeHTML(bookmark.id)}">⋮⋮</span>${iconHTML(bookmark)}<button type="button" data-open="${escapeHTML(bookmark.id)}">${escapeHTML(bookmark.name)}</button></div></td><td>${escapeHTML(hostOf(bookmark.url))}</td><td>${escapeHTML(bookmark.folder)}</td><td>${new Date(bookmark.createdAt||Date.now()).toLocaleDateString('zh-TW')}</td><td class="table-actions"><button class="star-btn ${bookmark.favorite?'on':''}" type="button" data-star="${escapeHTML(bookmark.id)}">${bookmark.favorite?'★':'☆'}</button><button class="dots-btn" type="button" data-bookmark-menu="${escapeHTML(bookmark.id)}">⋯</button></td></tr>`).join('')}</tbody></table>`;
    return;
  }
  $('#desktopContent').innerHTML=`<div class="bookmark-grid">${items.map(bookmark=>`<article class="bookmark-card" data-bookmark="${escapeHTML(bookmark.id)}" data-folder-target="${escapeHTML(bookmark.folder)}"><button class="bookmark-open" type="button" data-open="${escapeHTML(bookmark.id)}" aria-label="開啟 ${escapeHTML(bookmark.name)}"></button><div class="card-head">${iconHTML(bookmark)}<div class="bookmark-copy"><b>${escapeHTML(bookmark.name)}</b><small>${escapeHTML(hostOf(bookmark.url))}</small></div></div><div class="card-tools"><button class="star-btn ${bookmark.favorite?'on':''}" type="button" data-star="${escapeHTML(bookmark.id)}">${bookmark.favorite?'★':'☆'}</button><button class="dots-btn" type="button" data-bookmark-menu="${escapeHTML(bookmark.id)}">⋯</button></div><span class="card-folder">${escapeHTML(bookmark.folder)}</span><span class="grip card-grip" draggable="true" data-drag-bookmark="${escapeHTML(bookmark.id)}" title="拖曳排序">⋮⋮</span></article>`).join('')}</div>`;
}
function renderFolderSelect(){$('#bookmarkFolder').innerHTML=state.folders.map(folder=>`<option value="${escapeHTML(folder)}">${escapeHTML(folder)}</option>`).join('')}
function render(){renderFolderSelect();renderMobile();renderSidebar();renderDesktop()}
