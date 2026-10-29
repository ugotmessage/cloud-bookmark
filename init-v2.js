document.addEventListener('click',event=>{
  const target=event.target.closest('[data-open],[data-star],[data-bookmark-menu],[data-toggle-folder],[data-view],[data-layout],[data-add],[data-new-folder],[data-close-sheet],[data-theme],[data-close-theme],[data-theme-mode],[data-palette],[data-import],[data-export],[data-action],[data-mobile-menu]');
  if(!target){if(!event.target.closest('#contextMenu'))$('#contextMenu').classList.add('hidden');if(!event.target.closest('#mobileOverflow'))$('#mobileOverflow').classList.add('hidden');return}
  if(target.hasAttribute('data-open'))openBookmark(target.dataset.open);
  if(target.hasAttribute('data-star'))setFavorite(target.dataset.star);
  if(target.hasAttribute('data-bookmark-menu'))openBookmarkMenu(target.dataset.bookmarkMenu,target);
  if(target.hasAttribute('data-toggle-folder')){const folder=target.dataset.toggleFolder;expanded[folder]=!(target.getAttribute('aria-expanded')==='true');localStorage.setItem(EXPANDED_KEY,JSON.stringify(expanded));renderMobile()}
  if(target.hasAttribute('data-view')){currentView=target.dataset.view;$('#desktopSearch').value='';renderSidebar();renderDesktop()}
  if(target.hasAttribute('data-layout')){layout=target.dataset.layout;localStorage.setItem(LAYOUT_KEY,layout);renderDesktop()}
  if(target.hasAttribute('data-add'))openSheet();if(target.hasAttribute('data-new-folder'))addFolder();if(target.hasAttribute('data-close-sheet'))closeSheet();
  if(target.hasAttribute('data-theme'))openTheme();if(target.hasAttribute('data-close-theme'))closeTheme();if(target.hasAttribute('data-theme-mode'))setThemePart('mode',target.dataset.themeMode);if(target.hasAttribute('data-palette'))setThemePart('palette',target.dataset.palette);
  if(target.hasAttribute('data-export'))exportJSON();if(target.hasAttribute('data-import'))$('#importFile').click();if(target.hasAttribute('data-action'))handleBookmarkAction(target.dataset.action);if(target.hasAttribute('data-mobile-menu'))openMobileOverflow(target);
});

$('#backdrop').addEventListener('click',()=>{closeSheet();closeTheme()});
$('#saveBookmark').addEventListener('click',saveBookmark);
$('#bookmarkFavorite').addEventListener('click',()=>{const on=!$('#bookmarkFavorite').classList.contains('on');$('#bookmarkFavorite').classList.toggle('on',on);$('#bookmarkFavorite').setAttribute('aria-pressed',String(on))});
$('#bookmarkUrl').addEventListener('blur',suggestTitleFromUrl);$('#bookmarkName').addEventListener('input',()=>{titleAutoSuggested=false});
$('#mobileSearch').addEventListener('input',renderMobile);$('#desktopSearch').addEventListener('input',renderDesktop);$('#importFile').addEventListener('change',event=>{const [file]=event.target.files||[];if(file)importJSON(file)});

document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();(matchMedia('(min-width:820px)').matches?$('#desktopSearch'):$('#mobileSearch')).focus()}if(event.key==='Escape'){closeSheet();closeTheme();$('#contextMenu').classList.add('hidden');$('#mobileOverflow').classList.add('hidden')}});

document.addEventListener('dragstart',event=>{
  const bookmarkHandle=event.target.closest('[data-drag-bookmark]'),folderHandle=event.target.closest('[data-drag-folder]');
  if(bookmarkHandle){dragState={type:'bookmark',id:bookmarkHandle.dataset.dragBookmark};bookmarkHandle.closest('[data-bookmark]')?.classList.add('dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',`bookmark:${dragState.id}`)}
  else if(folderHandle){dragState={type:'folder',name:folderHandle.dataset.dragFolder};folderHandle.closest('[data-folder-drag]')?.classList.add('dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',`folder:${dragState.name}`)}
});
document.addEventListener('dragover',event=>{if(!dragState)return;const bookmarkTarget=event.target.closest('[data-bookmark]'),folderTarget=event.target.closest('[data-folder-target]');if((dragState.type==='bookmark'&&(bookmarkTarget||folderTarget))||(dragState.type==='folder'&&folderTarget)){event.preventDefault();(bookmarkTarget||folderTarget)?.classList.add('drag-over')}});
document.addEventListener('dragleave',event=>{event.target.closest('.drag-over')?.classList.remove('drag-over')});
document.addEventListener('drop',event=>{if(!dragState)return;event.preventDefault();const bookmarkTarget=event.target.closest('[data-bookmark]'),folderTarget=event.target.closest('[data-folder-target]');$$('.drag-over').forEach(el=>el.classList.remove('drag-over'));if(dragState.type==='bookmark'){if(bookmarkTarget&&bookmarkTarget.dataset.bookmark!==dragState.id)moveBookmarkBefore(dragState.id,bookmarkTarget.dataset.bookmark);else if(folderTarget)moveBookmarkToFolder(dragState.id,folderTarget.dataset.folderTarget)}else if(dragState.type==='folder'&&folderTarget)reorderFolder(dragState.name,folderTarget.dataset.folderTarget);dragState=null});
document.addEventListener('dragend',()=>{$$('.dragging,.drag-over').forEach(el=>el.classList.remove('dragging','drag-over'));dragState=null});

applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(themePref().mode==='system')applyTheme()});
render();
