const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const encoder=new TextEncoder();
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{...JSON_HEADERS,...extra}});
const invalid=()=>json({error:'Invalid request'},404);
const tooMany=()=>json({error:'Too many requests'},429,{'retry-after':'60'});

function base64url(bytes){
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fromBase64url(value){
  try{
    const base=value.replace(/-/g,'+').replace(/_/g,'/');
    const padded=base+'='.repeat((4-base.length%4)%4);
    const binary=atob(padded);
    return Uint8Array.from(binary,c=>c.charCodeAt(0));
  }catch{return null}
}
async function hmacKey(secret){
  if(!secret)return null;
  return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
async function signedToken(raw,secret){
  const key=await hmacKey(secret);
  if(!key)return null;
  const mac=await crypto.subtle.sign('HMAC',key,encoder.encode(raw));
  return 'v1.'+raw+'.'+base64url(new Uint8Array(mac));
}
async function verifyToken(token,secret){
  if(!token)return {ok:false};
  if(/^[a-f0-9]{40}$/i.test(token))return {ok:true,legacy:true,raw:token.toLowerCase()};
  const parts=token.split('.');
  if(parts.length!==3||parts[0]!=='v1')return {ok:false};
  const raw=parts[1],sig=parts[2];
  if(!/^[A-Za-z0-9_-]{32,128}$/.test(raw))return {ok:false};
  const signature=fromBase64url(sig);
  if(!signature||signature.length!==32)return {ok:false};
  const key=await hmacKey(secret);
  if(!key)return {ok:false,misconfigured:true};
  const ok=await crypto.subtle.verify('HMAC',key,signature,encoder.encode(raw));
  return ok?{ok:true,legacy:false,raw}:{ok:false};
}
function requestToken(request,url){
  const auth=request.headers.get('authorization')||'';
  if(auth.startsWith('Bearer '))return auth.slice(7).trim();
  return url.searchParams.get('token')||'';
}
function requestBook(request,url){
  const value=request.headers.get('x-bookmark-book')||url.searchParams.get('book')||'main';
  return /^[A-Za-z0-9._-]{1,80}$/.test(value)?value:null;
}
function requestKey(request){return request.headers.get('cf-connecting-ip')||'unknown'}
async function limited(binding,key){
  if(!binding)return false;
  const result=await binding.limit({key});
  return !result.success;
}
async function scopeId(raw,book){
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(raw+'\n'+book));
  const hex=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  return 'token:'+hex;
}

function validState(body){
  if(!body||typeof body!=='object')return false;
  if(!Array.isArray(body.folders)||!Array.isArray(body.marks))return false;
  if(body.folders.length>500||body.marks.length>5000)return false;
  return true;
}

async function ensureSchema(db){
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS folders (user_id TEXT NOT NULL,name TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY (user_id, name))'),
    db.prepare('CREATE TABLE IF NOT EXISTS bookmarks (user_id TEXT NOT NULL,id TEXT NOT NULL,name TEXT NOT NULL,url TEXT NOT NULL,folder TEXT,favorite INTEGER NOT NULL DEFAULT 0,added_date TEXT,last_opened INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY (user_id, id))'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_folders_user_sort ON folders(user_id, sort_order)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_bookmarks_user_sort ON bookmarks(user_id, sort_order)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_bookmarks_user_folder ON bookmarks(user_id, folder, sort_order)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_bookmarks_user_favorite ON bookmarks(user_id, favorite)')
  ]);
}

async function readState(db,user){
  const [foldersResult,marksResult]=await db.batch([
    db.prepare('SELECT name FROM folders WHERE user_id = ? ORDER BY sort_order ASC').bind(user),
    db.prepare('SELECT id,name,url,folder,favorite,added_date,last_opened FROM bookmarks WHERE user_id = ? ORDER BY sort_order ASC').bind(user)
  ]);
  const folders=(foldersResult.results||[]).map(r=>r.name);
  const marks=(marksResult.results||[]).map(r=>({id:r.id,n:r.name,u:r.url,f:r.folder||'',fav:r.favorite?1:0,d:r.added_date||'',lastOpened:Number(r.last_opened||0)}));
  return {version:3,initialized:folders.length>0||marks.length>0,folders,marks};
}

async function writeState(db,user,body){
  const now=Date.now();
  const folders=[...new Set(body.folders.map(x=>String(x).trim()).filter(Boolean))];
  const marks=body.marks.map((m,i)=>({
    id:String(m.id||('b-'+now+'-'+i)),
    name:String(m.n??m.name??m.u??m.url??'Untitled').slice(0,300),
    url:String(m.u??m.url??'').replace(/^https?:\/\//i,'').slice(0,4000),
    folder:String(m.f??m.folder??'').slice(0,200),
    favorite:(m.fav??m.favorite)?1:0,
    addedDate:String(m.d??m.addedDate??'').slice(0,40),
    lastOpened:Number(m.lastOpened??m.recent??0)||0
  })).filter(m=>m.url);
  const statements=[
    db.prepare('DELETE FROM bookmarks WHERE user_id = ?').bind(user),
    db.prepare('DELETE FROM folders WHERE user_id = ?').bind(user)
  ];
  folders.forEach((name,i)=>statements.push(db.prepare('INSERT INTO folders (user_id,name,sort_order,created_at,updated_at) VALUES (?,?,?,?,?)').bind(user,name.slice(0,200),i,now,now)));
  marks.forEach((m,i)=>statements.push(db.prepare('INSERT INTO bookmarks (user_id,id,name,url,folder,favorite,added_date,last_opened,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(user,m.id,m.name,m.url,m.folder||null,m.favorite,m.addedDate,m.lastOpened,i,now,now)));
  await db.batch(statements);
  return {ok:true,folders:folders.length,marks:marks.length,updatedAt:now};
}

async function issueToken(request,env){
  if(request.method!=='POST')return invalid();
  if(!env.TOKEN_SIGNING_SECRET)return json({error:'Token service unavailable'},503);
  if(await limited(env.TOKEN_ISSUE_LIMIT,requestKey(request)))return tooMany();
  const raw=base64url(crypto.getRandomValues(new Uint8Array(32)));
  const token=await signedToken(raw,env.TOKEN_SIGNING_SECRET);
  return json({token});
}

async function stateRequest(request,env,url){
  if(!env.DB)return json({error:'Storage unavailable'},503);
  const token=requestToken(request,url);
  const book=requestBook(request,url);
  if(!book){
    if(await limited(env.INVALID_TOKEN_LIMIT,requestKey(request)))return tooMany();
    return invalid();
  }
  const verified=await verifyToken(token,env.TOKEN_SIGNING_SECRET);
  if(verified.misconfigured)return json({error:'Token service unavailable'},503);
  if(!verified.ok){
    if(await limited(env.INVALID_TOKEN_LIMIT,requestKey(request)))return tooMany();
    return invalid();
  }
  if(verified.legacy&&await limited(env.LEGACY_TOKEN_LIMIT,requestKey(request)))return tooMany();
  const scope=await scopeId(verified.raw,book);
  if(!verified.legacy&&await limited(env.VALID_TOKEN_LIMIT,scope))return tooMany();
  try{
    await ensureSchema(env.DB);
    let upgrade=null;
    if(request.method==='GET'){
      const state=await readState(env.DB,scope);
      if(verified.legacy&&state.initialized&&env.TOKEN_SIGNING_SECRET)upgrade=await signedToken(verified.raw,env.TOKEN_SIGNING_SECRET);
      return json(state,200,upgrade?{'x-library-token-upgrade':upgrade}:{});
    }
    if(request.method==='PUT'){
      const body=await request.json().catch(()=>null);
      if(!validState(body))return invalid();
      const result=await writeState(env.DB,scope,body);
      if(verified.legacy&&env.TOKEN_SIGNING_SECRET)upgrade=await signedToken(verified.raw,env.TOKEN_SIGNING_SECRET);
      return json(result,200,upgrade?{'x-library-token-upgrade':upgrade}:{});
    }
    return invalid();
  }catch(error){
    console.error('API error',error);
    return json({error:'Storage unavailable'},503);
  }
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/'))return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
    if(url.pathname==='/api/health')return json({ok:true,d1:Boolean(env.DB),tokenSigning:Boolean(env.TOKEN_SIGNING_SECRET),rateLimits:Boolean(env.VALID_TOKEN_LIMIT)});
    if(url.pathname==='/api/token')return issueToken(request,env);
    if(url.pathname==='/api/state')return stateRequest(request,env,url);
    return invalid();
  }
};
