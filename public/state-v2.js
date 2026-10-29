const STATE_KEY = 'cb-v2-proto';
const THEME_KEY = 'cb-theme-v2';
const EXPANDED_KEY = 'cb-exp';
const LAYOUT_KEY = 'cb-layout';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const SAMPLE = {
  folders: ['股票','AI','工作','Server','工兯','閱讀清單','設計參考','旅遊','未分類'],
  bookmarks: [
    ['ChatGPT','https://chatgpt.com/','AI',1],['GitHub','https://github.com/','AI',1],['Claude','https://claude.ai/','AI',0],
    ['Gemini','https://gemini.google.com/','AI',0],['OpenAI','https://openai.com/','AI',0],['Hugging Face','https://huggingface.co/','AI',0],
    ['Perplexity','https://www.perplexity.ai/','AI',0],['Notion AI','https://www.notion.so/','AI',0],['XQ','https://www.xq.com.tw/','股票',1],
    ['NAS','http://192.168.1.10/','Server',1],['Cloudflare Docs','https://developers.cloudflare.com/','工具',0],['Dribbble','https://dribbble.com/','設計參考',0]
  ].map((x,i)=>({id:`b${i}`,name:x[0],url:x[1],folder:x[2],favorite:!!x[3],recent:0,createdAt:Date.now()-i*86400000}))
};

function normalizeUrl(value=''){
  const trimmed=value.trim();
  if(!trimmed)return '';
  return /^https?:\/\//i.test(trimmed)?trimmed:`https://${trimmed}`;
}
function hostOf(url=''){
  try{return new URL(normalizeUrl(url)).hostname.replace(/^www\./,'')}
  catch{return url.replace(/^https?:\/\//,'').split('/')[0]}
}
function originFavicon(url=''){
  try{const parsed=new URL(normalizeUrl(url));return /^https?:$/.test(parsed.protocol)?`${parsed.origin}/favicon.ico`:''}
  catch{return ''}
}
function normalizeState(raw){
  if(!raw||typeof raw!=='object')return structuredClone(SAMPLE);
  const folders=Array.isArray(raw.folders)?raw.folders.map(String):Array.isArray(raw.folderOrder)?raw.folderOrder.map(String):[];
  let bookmarks=[];
  if(Array.isArray(raw.bookmarks)){
    bookmarks=raw.bookmarks.map((b,i)=>({
      id:String(b.id||`b${Date.now()}-${i}`),name:String(b.name||b.title||b.url||'Untitled'),url:normalizeUrl(String(b.url||'')),
      folder:String(b.folder||'未分類'),favorite:!!(b.favorite??b.fav),recent:Number(b.recent||0),createdAt:Number(b.createdAt||b.created_at||Date.now())
    })).filter(b=>b.url);
  }else if(Array.isArray(raw.marks)){
    bookmarks=raw.marks.map((b,i)=>({
      id:`legacy-${Date.now()}-${i}`,name:String(b.n||b.u||'Untitled'),url:normalizeUrl(String(b.u||'')),folder:String(b.f||'未分類'),
      favorite:!!b.fav,recent:0,createdAt:b.d?(Date.parse(b.d)||Date.now()):Date.now()
    })).filter(b=>b.url);
  }
  const discovered=bookmarks.map(b=>b.folder).filter(Boolean);
  return {folders:[...new Set([...folders,...discovered,'未分類'])],bookmarks};
}

let state=(()=>{try{const stored=JSON.parse(localStorage.getItem(STATE_KEY)||'null');return stored?normalizeState(stored):structuredClone(SAMPLE)}catch{return structuredClone(SAMPLE)}})();
let expanded=(()=>{try{return JSON.parse(localStorage.getItem(EXPANDED_KEY)||'{}')||{}}catch{return {}}})();
let currentView='all';
let layout=localStorage.getItem(LAYOUT_KEY)||'grid';
let menuBookmarkId=null;
let dragState=null;
let titleAutoSuggested=false;

function persist(){localStorage.setItem(STATE_KEY,JSON.stringify(state))}
