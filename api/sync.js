// POST {token, events:[{cid,t,type,...}], cards:[{cid,t,...}]} → 서버에 병합 후 전체 반환. GET ?token= → 전체 반환.
import { ensure, json, readBody } from './_db.js';
import { verify } from './_auth.js';
export const createSyncHandler = (getDb = ensure) => async function handler(req, res) {
  if (!['GET','POST'].includes(req.method)) return json(res,405,{error:'GET or POST only'});
  const sql = await getDb(); if (!sql) return json(res, 503, { error: 'no database' });
  const b = req.method === 'POST' ? await readBody(req) : {};
  const token = b.token || new URL(req.url, 'http://x').searchParams.get('token');
  const p = verify(token); if (!p) return json(res, 401, { error: '로그인이 필요해요' });
  const fid = p.fid;
  if (req.method === 'POST') {
    const events = Array.isArray(b.events) ? b.events.slice(0, 500) : []; const cards = Array.isArray(b.cards) ? b.cards.slice(0, 200) : [];
    for (const e of events) { if (!e.cid || !e.type) continue; const { cid, t, type, ...data } = e; await sql`insert into astrobox.events (family_id, client_id, t, type, data) values (${fid}, ${String(cid)}, ${Number(t) || Date.now()}, ${String(type).slice(0, 32)}, ${sql.json(data)}) on conflict (family_id, client_id) do nothing`; }
    for (const c of cards) { if (!c.cid) continue; const { cid, t, ...data } = c; await sql`insert into astrobox.cards (family_id, client_id, t, data) values (${fid}, ${String(cid)}, ${Number(t) || Date.now()}, ${sql.json(data)}) on conflict (family_id, client_id) do nothing`; }
  }
  const ev = await sql`select client_id cid, t, type, data from astrobox.events where family_id = ${fid} order by t`;
  const cd = await sql`select client_id cid, t, data from astrobox.cards where family_id = ${fid} order by t`;
  return json(res, 200, { events: ev.map((r) => ({ cid: r.cid, t: Number(r.t), type: r.type, ...r.data })), cards: cd.map((r) => ({ cid: r.cid, t: Number(r.t), ...r.data })) });
};
export default createSyncHandler();
