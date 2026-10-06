// POST {action:'create', childName, pin} → {code, token} / {action:'login', code, pin} → {token, childName}
import { ensure, json, readBody } from './_db.js';
import { hashPin, newCode, sign } from './_auth.js';
export const createAuthHandler = (getDb = ensure) => async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const sql = await getDb(); if (!sql) return json(res, 503, { error: 'no database' });
  const b = await readBody(req);
  const pin = String(b.pin || '').trim();
  if (!/^\d{4}$/.test(pin)) return json(res, 400, { error: 'PIN은 숫자 4자리' });
  const exp = Date.now() + 180 * 86400 * 1000;
  if (b.action === 'create') {
    const role = b.role; if (!['student', 'parent'].includes(role)) return json(res, 400, { error: '학생용 또는 학부모용을 선택해 주세요.' });
    const childName = String(b.childName || '').trim().slice(0, 12); if (!childName) return json(res, 400, { error: '실명 대신 별명을 넣어 주세요.' });
    for (let i = 0; i < 5; i++) { const code = newCode(); try { const r = await sql`insert into astrobox.families (code, pin_hash, child_name, account_role) values (${code}, ${hashPin(code, pin)}, ${childName}, ${role}) returning id`; return json(res, 200, { code, childName, role, token: sign({ fid: r[0].id, code, exp }) }); } catch (e) { if (!String(e.message).includes('unique')) throw e; } }
    return json(res, 500, { error: 'code collision' });
  }
  if (b.action === 'login') {
    const code = String(b.code || '').trim().toUpperCase();
    const r = await sql`select id, pin_hash, child_name, account_role from astrobox.families where code = ${code}`;
    if (!r.length || r[0].pin_hash !== hashPin(code, pin)) return json(res, 401, { error: '코드나 PIN이 맞지 않아요' });
    return json(res, 200, { code, childName: r[0].child_name, role: r[0].account_role, token: sign({ fid: r[0].id, code, exp }) });
  }
  return json(res, 400, { error: 'unknown action' });
};
export default createAuthHandler();
