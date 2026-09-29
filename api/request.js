// 아이 → 부모 요청. POST {token, action:'create', mission, next} | {action:'list'} | {action:'approve'|'decline', id}
import { ensure, json, readBody } from './_db.js';
import { verify } from './_auth.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const sql = await ensure(); if (!sql) return json(res, 503, { error: 'no database' });
  const b = await readBody(req); const p = verify(b.token); if (!p) return json(res, 401, { error: '로그인이 필요해요' });
  const fid = p.fid; const now = Date.now();
  if (b.action === 'create') {
    const mission = String(b.mission || '').slice(0, 16), next = String(b.next || '').slice(0, 16);
    const dup = await sql`select id from astrobox.requests where family_id = ${fid} and status = 'pending' and next_mission = ${next} limit 1`;
    if (!dup.length) await sql`insert into astrobox.requests (family_id, mission, next_mission, status, t) values (${fid}, ${mission}, ${next}, 'pending', ${now})`;
  } else if (b.action === 'approve' || b.action === 'decline') {
    await sql`update astrobox.requests set status = ${b.action === 'approve' ? 'approved' : 'declined'}, decided_at = ${now} where id = ${Number(b.id)} and family_id = ${fid}`;
  }
  const list = await sql`select id, mission, next_mission next, status, t, decided_at from astrobox.requests where family_id = ${fid} order by t desc limit 50`;
  const ent = await sql`select pack, source, t from astrobox.entitlements where family_id = ${fid}`;
  return json(res, 200, { requests: list.map((r) => ({ ...r, id: Number(r.id), t: Number(r.t), decided_at: r.decided_at ? Number(r.decided_at) : null })), entitlements: ent.map((e) => ({ ...e, t: Number(e.t) })) });
}
