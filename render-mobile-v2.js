function iconHTML(bookmark,extraClass=''){
  const host=hostOf(bookmark.url),src=originFavicon(bookmark.url),initial=escapeHTML((bookmark.name||host||'?').trim().charAt(0).toUpperCase());
  return `<span class="site-icon ${extraClass}" data-fallback="${initial}">${src?`<img src="${escapeHTML(src)}" alt="" onerror="this.remove();this.parentElement.textContent=this.parentElement.dataset.fallback">`:initial}</span>`;
}
function bookmarkRowHTML(bookmark,showFolder=false){
  return `<div class="bookmark-row" data-bookmark="${escapeHTML(bookmark.id)}" data-folder-target="${escapeHTML(bookmark.folder)}">
    <span class="grip" draggable="true" data-drag-bookmark="${escapeHTML(bookmark.id)}" title="拖曳排序">⋮⋮</span>
    <button class="bookmark-open" type="button" data-open="${escapeHTML(bookmark.id)}" aria-label="開啟 ${escapeHTML(bookmark.name)}"></button>
    ${iconHTML(bookmark)}
    <div class="bookmark-copy"><b>${escapeHTML(bookmark.name)}</b><small>${escapeHTML(hostOf(bookmark.url))}${showFolder?` · ${escapeHTML(bookmark.folder)}`:''}</small></div>
    <div class="bookmark-actions"><button class="star-btn ${bookmark.favorite?'on':''}" type="button" data-star="${escapeHTML(bookmark.id)}">${bookmark.favorite?'★':'☆'}</button><button class="dots-btn" type="button" data-bookmark-menu="${escapeHTML(bookmark.id)}">⋯</button></div>
  </div>`;
}
function favoriteChipHTML(bookmark){
  return `<button class="favorite-chip" type="button" data-open="${escapeHTML(bookmark.id)}">${iconHTML(bookmark)}<b>${escapeHTML(bookmark.name)}</b><small>${escapeHTML(hostOf(bookmark.url))}</small></button>`;
}
function folderHTML(folder){
  const items=state.bookmarks.filter(b=>b.folder===folder),isOpen=expanded[folder]??(folder==='AI');
  return `<section class="folder-block" data-folder-drag="${escapeHTML(folder)}" data-folder-target="${escapeHTML(folder)}">
    <button class="folder-head" type="button" data-toggle-folder="${escapeHTML(folder)}" aria-expanded="${isOpen}">
      <span class="grip" draggable="true" data-drag-folder="${escapeHTML(folder)}" title="拖曳資料夾排序">⋮⋮</span><span class="folder-symbol">▱</span><span class="folder-name">${escapeHTML(folder)}</span><span class="folder-count">${items.length}</span><span class="folder-chevron">›</span>
    </button>
    <div class="folder-body ${isOpen?'':'hidden'}">${items.length?items.map(b=>bookmarkRowHTML(b)).join(''):'<div class="empty">空資料夾</div>'}</div>
  </section>`;
}

function renderMobile(){
  const query=$('#mobileSearch').value.trim().toLowerCase();
  if(query){
    const results=state.bookmarks.filter(b=>[b.name,b.url,b.folder,hostOf(b.url)].some(v=>String(v).toLowerCase().includes(query)));
    $('#mobileBrowse').classList.add('hidden');$('#mobileSearchResults').classList.remove('hidden');
    $('#mobileSearchResults').innerHTML=`<div class="section-heading"><span>搜尋結果</span><span>${results.length}</span></div><div class="search-result-card">${results.length?results.map(b=>bookmarkRowHTML(b,true)).join(''):'<div class="empty">沒有符合的書籤</div>'}</div>`;
    return;
  }
  $('#mobileSearchResults').classList.add('hidden');$('#mobileBrowse').classList.remove('hidden');
  const favorites=state.bookmarks.filter(b=>b.favorite);
  $('#favoriteRail').innerHTML=favorites.length?favorites.map(favoriteChipHTML).join(''):'<span class="empty">尚無我的最愛</span>';
  $('#mobileFolders').innerHTML=state.folders.map(folderHTML).join('');
}
