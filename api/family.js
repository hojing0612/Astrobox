// 각 계정의 기록은 그대로 두고 학생↔학부모 관계만 연결한다. 연결 코드는 10분·1회용.
import crypto from 'node:crypto';
import { ensure, json, readBody } from './_db.js';
import { verify } from './_auth.js';
import { PACKS } from './pay.js';
const fail = (status, message) => { const e = new Error(message); e.status = status; throw e; };
const digest = code => crypto.createHash('sha256').update(code).digest('hex');
export async function familyAction(sql, fid, b) {
  const [me] = await sql`select id, code, child_name, account_role from astrobox.families where id = ${fid}`;
  if (!me) fail(401, '다시 로그인해 주세요.');
  if (b.action === 'role') {
    if (!['student','parent'].includes(b.role)) fail(400, '학생용 또는 학부모용을 선택해 주세요.');
    const changed = await sql`update astrobox.families set account_role = ${b.role} where id = ${fid} and account_role = 'legacy' returning id`;
    if (!changed.length) fail(409, '이미 선택한 계정 유형은 바꿀 수 없어요.');
    me.account_role = b.role;
  }
  if (b.action === 'invite') {
    if (me.account_role === 'legacy') fail(400, '먼저 계정 유형을 선택해 주세요.');
    const code = crypto.randomBytes(6).toString('hex').toUpperCase(), expiresAt = Date.now() + 600000;
    await sql.begin(async tx => {
      await tx`select id from astrobox.families where id = ${fid} for update`;
      await tx`delete from astrobox.family_invites where owner_id = ${fid} or expires_at < ${Date.now()}`;
      await tx`insert into astrobox.family_invites (code_hash, owner_id, expires_at) values (${digest(code)}, ${fid}, ${expiresAt})`;
    });
    return { code, expiresAt };
  }
  if (b.action === 'cancel') await sql`delete from astrobox.family_invites where owner_id = ${fid}`;
  if (b.action === 'connect') {
    const code = String(b.code || '').replace(/[\s-]/g, '').toUpperCase();
    if (!/^[A-F0-9]{12}$/.test(code)) fail(400, '연결 코드 12자리를 확인해 주세요.');
    await sql.begin(async tx => {
      const [invite] = await tx`select i.owner_id, i.expires_at, f.account_role from astrobox.family_invites i join astrobox.families f on f.id = i.owner_id where i.code_hash = ${digest(code)} for update of i`;
      if (!invite || Number(invite.expires_at) <= Date.now()) fail(400, '만료되었거나 사용한 코드예요. 새 코드를 받아 주세요.');
      if (String(invite.owner_id) === String(fid)) fail(400, '자신의 계정과는 연결할 수 없어요.');
      if (![me.account_role, invite.account_role].includes('student') || ![me.account_role, invite.account_role].includes('parent')) fail(400, '학생 계정과 학부모 계정끼리만 연결할 수 있어요.');
      const parent = me.account_role === 'parent' ? fid : invite.owner_id, student = me.account_role === 'student' ? fid : invite.owner_id;
      await tx`insert into astrobox.family_links (parent_id, student_id) values (${parent}, ${student}) on conflict do nothing`;
      await tx`delete from astrobox.family_invites where code_hash = ${digest(code)}`;
    });
  }
  if (b.action === 'unlink') {
    if (!/^\d+$/.test(String(b.id))) fail(400, '연결할 계정을 확인해 주세요.');
    await sql.begin(async tx => {
      await tx`delete from astrobox.family_links where (parent_id = ${fid} and student_id = ${b.id}) or (student_id = ${fid} and parent_id = ${b.id})`;
      await tx`delete from astrobox.family_invites where owner_id = ${fid}`;
    });
  }
  if (['approve','decline'].includes(b.action)) {
    if (me.account_role !== 'parent' || !/^\d+$/.test(String(b.id)) || !/^\d+$/.test(String(b.requestId))) fail(403,'연결된 학부모만 요청을 처리할 수 있어요.');
    await sql.begin(async tx => {
      const [link] = await tx`select student_id from astrobox.family_links where parent_id = ${fid} and student_id = ${b.id} for update`;
      if (!link) fail(403,'연결된 학생 계정이 아니에요.');
      const [request] = await tx`select id, next_mission, status from astrobox.requests where family_id = ${b.id} and id = ${b.requestId} for update`;
      if (!request || request.status !== 'pending') fail(409,'이미 처리했거나 없는 요청이에요.');
      const now=Date.now();
      if (b.action === 'approve') {
        const pack=Object.keys(PACKS).find(k=>PACKS[k].missions.includes(request.next_mission));
        if (!pack || PACKS[pack].amount !== 0 || (process.env.PAY_PROVIDER || 'demo') !== 'demo') fail(400,'현재 무료 데모 이용권만 열 수 있어요.');
        await tx`insert into astrobox.entitlements (family_id,pack,source,t) values (${b.id},${pack},'linked-parent',${now}) on conflict (family_id,pack) do nothing`;
        await tx`insert into astrobox.orders (family_id,pack,amount,provider,status,t) values (${b.id},${pack},0,'demo','paid',${now})`;
      }
      await tx`update astrobox.requests set status = ${b.action === 'approve' ? 'approved' : 'declined'}, decided_at = ${now} where id = ${b.requestId} and family_id = ${b.id}`;
    });
    return {ok:true};
  }
  if (b.action === 'report') {
    if (me.account_role !== 'parent' || !/^\d+$/.test(String(b.id))) fail(403, '연결된 학부모만 학생 기록을 볼 수 있어요.');
    // 연결 관계를 각 조회에 포함해 다른 학생의 ID를 보내도 접근할 수 없게 한다.
    const [student] = await sql`select f.id, f.child_name from astrobox.families f join astrobox.family_links l on l.student_id = f.id where l.parent_id = ${fid} and f.id = ${b.id}`;
    if (!student) fail(403, '연결된 학생 계정이 아니에요.');
    const events = await sql`select e.client_id cid, e.t, e.type, e.data from astrobox.events e join astrobox.family_links l on l.student_id = e.family_id where l.parent_id = ${fid} and e.family_id = ${b.id} order by e.t`;
    const cards = await sql`select c.client_id cid, c.t, c.data from astrobox.cards c join astrobox.family_links l on l.student_id = c.family_id where l.parent_id = ${fid} and c.family_id = ${b.id} order by c.t`;
    const requests = await sql`select r.id, r.next_mission, r.t from astrobox.requests r join astrobox.family_links l on l.student_id = r.family_id where l.parent_id = ${fid} and r.family_id = ${b.id} and r.status = 'pending' order by r.t`;
    return { student: { id: String(student.id), name: student.child_name }, requests:requests.map(r=>({...r,id:String(r.id),t:Number(r.t)})), events: events.map(e => ({...e.data, cid:e.cid,t:Number(e.t),type:e.type})), cards: cards.map(c => ({...c.data,cid:c.cid,t:Number(c.t)})) };
  }
  if (!['status','role','connect','unlink','cancel'].includes(b.action)) fail(400, '지원하지 않는 요청이에요.');
  const linked = await sql`select f.id, f.child_name, f.account_role from astrobox.families f join astrobox.family_links l on (l.parent_id = ${fid} and l.student_id = f.id) or (l.student_id = ${fid} and l.parent_id = f.id) order by f.id`;
  return { me: { code: me.code, childName: me.child_name, role: me.account_role }, linked: linked.map(f => ({ id:String(f.id),name:f.child_name,role:f.account_role })) };
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, {error:'POST only'});
  const b = await readBody(req), p = verify(b.token);
  if (!p?.fid) return json(res, 401, {error:'로그인이 필요해요.'});
  try { const sql = await ensure(); if (!sql) return json(res,503,{error:'계정 서버에 연결할 수 없어요.'}); return json(res,200,await familyAction(sql,p.fid,b)); }
  catch(e) { return json(res,e.status || 500,{error:e.status ? e.message : '처리하지 못했어요. 잠시 후 다시 시도해 주세요.'}); }
}
