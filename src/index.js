const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:JSON_HEADERS});

async function userId(ctx){
  try{
    if(ctx.access){
      const identity=await ctx.access.getIdentity();
      if(identity?.email)return identity.email.toLowerCase();
      if(identity?.sub)return String(identity.sub);
    }
  }catch(e){console.warn('Access identity lookup failed',e)}
  return null;
}

function validState(body){
  if(!body||typeof body!=='object')return false;
  if(!Array.isArray(body.folders)||!Array.isArray(body.marks))return false;
  if(body.folders.length>500||body.marks.length>5000)return false;
  return true;
}

async function readState(db,user){
  const [foldersResult,marksResult]=await db.batch([
    db.prepare('SELECT name FROM folders WHERE user_id = ? ORDER BY sort_order ASC').bind(user),
    db.prepare('SELECT id,name,url,folder,favorite,added_date,last_opened FROM bookmarks WHERE user_id = ? ORDER BY sort_order ASC').bind(user)
  ]);
  const folders=(foldersResult.results||[]).map(r=>r.name);
  const marks=(marksResult.results||[]).map(r=>({
    id:r.id,n:r.name,u:r.url,f:r.folder||'',fav:r.favorite?1:0,d:r.added_date||'',lastOpened:Number(r.last_opened||0)
  }));
  return {version:3,initialized:folders.length>0||marks.length>0,folders,marks};
}

async function writeState(db,user,body){
  const now=Date.now();
  const folders=[...new Set(body.folders.map(x=>String(x).trim()).filter(Boolean))];
  const marks=body.marks.map((m,i)=>({
    id:String(m.id||`b-${now}-${i}`),name:String(m.n??m.name??m.u??m.url??'Untitled'),url:String(m.u??m.url??'').replace(/^https?:\/\//i,''),folder:String(m.f??m.folder??''),favorite:(m.fav??m.favorite)?1:0,addedDate:String(m.d??m.addedDate??''),lastOpened:Number(m.lastOpened??m.recent??0)||0
  })).filter(m=>m.url);

  const statements=[
    db.prepare('DELETE FROM bookmarks WHERE user_id = ?').bind(user),
    db.prepare('DELETE FROM folders WHERE user_id = ?').bind(user)
  ];
  folders.forEach((name,i)=>statements.push(db.prepare('INSERT INTO folders (user_id,name,sort_order,created_at,updated_at) VALUES (?,?,?,?,?)').bind(user,name,i,now,now)));
  marks.forEach((m,i)=>statements.push(db.prepare('INSERT INTO bookmarks (user_id,id,name,url,folder,favorite,added_date,last_opened,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(user,m.id,m.name,m.url,m.folder||null,m.favorite,m.addedDate,m.lastOpened,i,now,now)));
  await db.batch(statements);
  return {ok:true,folders:folders.length,marks:marks.length,updatedAt:now};
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/'))return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
    if(url.pathname==='/api/health')return json({ok:true,d1:Boolean(env.DB),access:Boolean(ctx.access)});
    if(url.pathname!=='/api/state')return json({error:'Not found'},404);
    if(!env.DB)return json({error:'D1 binding DB is not configured'},503);

    const user=await userId(ctx);
    if(!user)return json({error:'Authentication required'},401);
    try{
      if(request.method==='GET')return json(await readState(env.DB,user));
      if(request.method==='PUT'){
        const body=await request.json().catch(()=>null);
        if(!validState(body))return json({error:'Invalid state payload'},400);
        return json(await writeState(env.DB,user,body));
      }
      return json({error:'Method not allowed'},405);
    }catch(error){
      console.error('API error',error);
      return json({error:'Database operation failed'},500);
    }
  }
};
