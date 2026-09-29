// 결제 — 지금은 '데모 결제'(청구 없음). 실제 PG(토스페이먼츠 등)는 이 파일의 provider 부분만 바꿔 끼운다.
// POST {token, action:'checkout', pack} → 주문 생성 + 권한 부여 | {action:'status'}
import { ensure, json, readBody } from './_db.js';
import { verify } from './_auth.js';
export const PACKS = { 'pack-1': { title: '우주 미션 팩 1 — 궤도와 달', missions: ['m2', 'm3', 'm4'], amount: 0, note: '가격 검증 중 · 지금은 무료 데모' } };
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const sql = await ensure(); if (!sql) return json(res, 503, { error: 'no database' });
  const b = await readBody(req); const p = verify(b.token); if (!p) return json(res, 401, { error: '로그인이 필요해요' });
  const fid = p.fid; const now = Date.now();
  if (b.action === 'checkout') {
    const pack = PACKS[b.pack]; if (!pack) return json(res, 400, { error: 'unknown pack' });
    const provider = process.env.PAY_PROVIDER || 'demo';
    if (provider !== 'demo') return json(res, 501, { error: 'PG 연동 전' }); // 여기서 PG 결제창 생성·검증으로 교체
    await sql`insert into astrobox.orders (family_id, pack, amount, provider, status, t) values (${fid}, ${b.pack}, ${pack.amount}, 'demo', 'paid', ${now})`;
    await sql`insert into astrobox.entitlements (family_id, pack, source, t) values (${fid}, ${b.pack}, 'demo-order', ${now}) on conflict (family_id, pack) do nothing`;
    await sql`update astrobox.requests set status = 'approved', decided_at = ${now} where family_id = ${fid} and status = 'pending'`;
  }
  const ent = await sql`select pack, source, t from astrobox.entitlements where family_id = ${fid}`;
  const orders = await sql`select id, pack, amount, provider, status, t from astrobox.orders where family_id = ${fid} order by t desc limit 20`;
  return json(res, 200, { packs: PACKS, entitlements: ent.map((e) => ({ ...e, t: Number(e.t) })), orders: orders.map((o) => ({ ...o, id: Number(o.id), t: Number(o.t) })) });
}
