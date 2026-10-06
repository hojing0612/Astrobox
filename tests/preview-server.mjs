// 브라우저 검수 전용: 임시 메모리 PostgreSQL, 실제 계정/비밀값 사용 없음.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {testDatabase,call} from './helpers/database.mjs';
import {createAuthHandler} from '../api/auth.js';
import {createSyncHandler} from '../api/sync.js';
import {familyAction} from '../api/family.js';
import {verify} from '../api/_auth.js';
const {db,sql}=await testDatabase(),root=fileURLToPath(new URL('../',import.meta.url));
const auth=createAuthHandler(async()=>sql),sync=createSyncHandler(async()=>sql);
if(process.argv.includes('--seed')){
 const student=(await call(auth,{action:'create',role:'student',childName:'검수학생',pin:'2468'})).body;
 const parent=(await call(auth,{action:'create',role:'parent',childName:'검수학부모',pin:'1357'})).body;
 const sid=verify(student.token).fid,pid=verify(parent.token).fid;
 const invite=await familyAction(sql,sid,{action:'invite'});await familyAction(sql,pid,{action:'connect',code:invite.code});
 await call(sync,{token:student.token,events:[{cid:'preview-event',t:Date.now(),type:'experiment',mission:'rocket'}],cards:[{cid:'preview-card',t:Date.now(),title:'로켓 탐구',initial:'처음 예상',observation:'직접 관찰',explanation:'조건을 바꾸어 보았어요'}]});
 await sql`insert into astrobox.requests (family_id,mission,next_mission,status,t) values (${sid},'m1','m2','pending',${Date.now()})`;
 console.log('Temporary test login:',parent.code,'PIN 1357');
}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){
 let raw='';for await(const chunk of req)raw+=chunk;req.body=JSON.parse(raw||'{}');
 if(url.pathname==='/api/auth')return await auth(req,res);
 if(url.pathname==='/api/sync')return await sync(req,res);
 if(url.pathname==='/api/family'){const p=verify(req.body.token);if(!p)throw Object.assign(new Error('로그인이 필요해요.'),{status:401});const d=await familyAction(sql,p.fid,req.body);res.setHeader('content-type','application/json');return res.end(JSON.stringify(d));}
 res.statusCode=503;return res.end(JSON.stringify({error:'preview only'}));
 }
 const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root)||url.pathname.includes('/.')){res.statusCode=403;return res.end();}
 res.setHeader('content-type',types[path.extname(file)]||'application/octet-stream');res.setHeader('cache-control','no-store');res.end(await fs.readFile(file));
 }catch(e){res.statusCode=e.status||500;res.end(JSON.stringify({error:e.message}));}
});server.listen(Number(process.env.PORT || 8095),'127.0.0.1',()=>console.log('Ephemeral account preview: http://localhost:'+(process.env.PORT || 8095)));
process.on('SIGINT',()=>server.close(async()=>{await db.close();process.exit();}));
