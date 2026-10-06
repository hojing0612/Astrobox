import test from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase, call } from './helpers/database.mjs';
import { createAuthHandler } from '../api/auth.js';
import { createSyncHandler } from '../api/sync.js';
import { familyAction } from '../api/family.js';
import { verify, sign } from '../api/_auth.js';
import { migrate } from '../api/_db.js';

test('가입·로그인·가족 연결·리포트 권한·만료·해제는 실제 SQL로 검증한다', async()=>{
 const {db,sql}=await testDatabase();
 try {
  const auth=createAuthHandler(async()=>sql),sync=createSyncHandler(async()=>sql);
  assert.equal((await call(auth,{action:'create',childName:'학생',pin:'1234',role:'admin'})).status,400);
  const create=async(role,name)=>{const r=await call(auth,{action:'create',childName:name,pin:'1234',role});assert.equal(r.status,200);return {...r.body,id:verify(r.body.token).fid};};
  const student=await create('student','별탐험가'),parent=await create('parent','달보호자'),stranger=await create('parent','다른보호자'),other=await create('student','다른학생');
  assert.equal((await call(auth,{action:'login',code:student.code,pin:'9999'})).status,401);
  assert.equal((await call(auth,{action:'login',code:student.code,pin:'1234'})).body.role,'student');
  const own=await call(sync,{token:student.token,events:[{cid:'event1',t:1,type:'experiment',mission:'rocket'}],cards:[{cid:'card1',t:2,title:'나의 로켓',explanation:'관찰했어요'}]});assert.equal(own.body.cards.length,1);
  await assert.rejects(familyAction(sql,parent.id,{action:'report',id:student.id}),{status:403});
  const invite=await familyAction(sql,student.id,{action:'invite'});
  await assert.rejects(familyAction(sql,student.id,{action:'connect',code:invite.code}),/자신/);
  await assert.rejects(familyAction(sql,other.id,{action:'connect',code:invite.code}),/학생 계정과 학부모/);
  const linked=await familyAction(sql,parent.id,{action:'connect',code:invite.code});assert.equal(linked.linked[0].name,'별탐험가');
  await assert.rejects(familyAction(sql,stranger.id,{action:'connect',code:invite.code}),/만료/);
  const [request]=await sql`insert into astrobox.requests (family_id,mission,next_mission,status,t) values (${student.id},'m1','m2','pending',1) returning id`;
  await assert.rejects(familyAction(sql,stranger.id,{action:'approve',id:student.id,requestId:request.id}),{status:403});
  await assert.rejects(familyAction(sql,student.id,{action:'approve',id:student.id,requestId:request.id}),{status:403});
  await familyAction(sql,parent.id,{action:'approve',id:student.id,requestId:request.id});
  assert.equal((await sql`select pack from astrobox.entitlements where family_id = ${student.id}`)[0].pack,'pack-1');
  assert.equal((await sql`select pack from astrobox.entitlements where family_id = ${parent.id}`).length,0);
  await assert.rejects(familyAction(sql,parent.id,{action:'approve',id:student.id,requestId:request.id}),{status:409});
  const report=await familyAction(sql,parent.id,{action:'report',id:student.id});assert.equal(report.events.length,1);assert.equal(report.cards[0].explanation,'관찰했어요');
  await assert.rejects(familyAction(sql,stranger.id,{action:'report',id:student.id}),{status:403});
  await assert.rejects(familyAction(sql,student.id,{action:'report',id:parent.id}),{status:403});
  assert.equal((await call(sync,{token:parent.token,events:[],cards:[]})).body.cards.length,0);
  await familyAction(sql,stranger.id,{action:'unlink',id:student.id});assert.equal((await familyAction(sql,parent.id,{action:'status'})).linked.length,1);
  await familyAction(sql,student.id,{action:'unlink',id:parent.id});
  await assert.rejects(familyAction(sql,parent.id,{action:'report',id:student.id}),{status:403});
  assert.equal((await call(sync,{token:student.token})).body.cards.length,1);
  const expired=await familyAction(sql,parent.id,{action:'invite'});await sql`update astrobox.family_invites set expires_at = 1`;
  await assert.rejects(familyAction(sql,student.id,{action:'connect',code:expired.code}),/만료/);
  const first=await familyAction(sql,parent.id,{action:'invite'}),second=await familyAction(sql,parent.id,{action:'invite'});
  await assert.rejects(familyAction(sql,student.id,{action:'connect',code:first.code}),/만료/);
  await familyAction(sql,parent.id,{action:'cancel'});await assert.rejects(familyAction(sql,student.id,{action:'connect',code:second.code}),/만료/);
  const valid=await familyAction(sql,parent.id,{action:'invite'});await familyAction(sql,student.id,{action:'connect',code:valid.code});
  assert.equal((await familyAction(sql,student.id,{action:'status'})).linked[0].role,'parent');
  await assert.rejects(familyAction(sql,parent.id,{action:'role',role:'student'}),{status:409});
  await sql`insert into astrobox.families (code,pin_hash,child_name) values ('OLD123','hash','기존별명')`;
  const [old]=await sql`select id from astrobox.families where code = 'OLD123'`;
  await migrate(sql);const converted=await familyAction(sql,old.id,{action:'role',role:'student'});assert.equal(converted.me.childName,'기존별명');assert.equal(converted.me.code,'OLD123');assert.equal(converted.me.role,'student');
 }finally{await db.close();}
});

test('서명 위조·만료·필수값 없는 토큰은 거부한다',()=>{
 assert.equal(verify('a.'+'é'.repeat(43)),null);
 assert.equal(verify(sign({fid:1,exp:Date.now()-1})),null);
 assert.equal(verify(sign({fid:1})),null);
 assert.equal(verify(sign({fid:1,exp:Date.now()+60000})+'x'),null);
});
