// POST {action:'create', childName, pin} → {code, token} / {action:'login', code, pin} → {token, childName}
import { ensure, json, readBody } from './_db.js';
import { hashPin, newCode, sign } from './_auth.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const sql = await ensure(); if (!sql) return json(res, 503, { error: 'no database' });
  const b = await readBody(req);
  const pin = String(b.pin || '').trim();
  if (!/^\d{4}$/.test(pin)) return json(res, 400, { error: 'PIN은 숫자 4자리' });
  const exp = Date.now() + 180 * 86400 * 1000;
  if (b.action === 'create') {
    const childName = String(b.childName || '').trim().slice(0, 12); if (!childName) return json(res, 400, { error: '아이 이름(별명)을 넣어요' });
    for (let i = 0; i < 5; i++) { const code = newCode(); try { const r = await sql`insert into astrobox.families (code, pin_hash, child_name) values (${code}, ${hashPin(code, pin)}, ${childName}) returning id`; return json(res, 200, { code, childName, token: sign({ fid: r[0].id, code, exp }) }); } catch (e) { if (!String(e.message).includes('unique')) throw e; } }
    return json(res, 500, { error: 'code collision' });
  }
  if (b.action === 'login') {
    const code = String(b.code || '').trim().toUpperCase();
    const r = await sql`select id, pin_hash, child_name from astrobox.families where code = ${code}`;
    if (!r.length || r[0].pin_hash !== hashPin(code, pin)) return json(res, 401, { error: '코드나 PIN이 맞지 않아요' });
    return json(res, 200, { code, childName: r[0].child_name, token: sign({ fid: r[0].id, code, exp }) });
  }
  return json(res, 400, { error: 'unknown action' });
}
