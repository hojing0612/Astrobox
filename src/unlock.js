// 미션 팩 해금 상태 — 서버 권한(로그인) 또는 로컬 데모 해금. 미션 1은 항상 무료.
import { current } from './account.js';
const KEY = 'astrobox.unlock';
export const PACKS = { 'pack-1': { title: '우주 미션 팩 1 — 궤도와 달', missions: ['m2', 'm3', 'm4'], note: '가격 검증 중 · 지금은 무료 데모' } };
function local() { try { return JSON.parse(localStorage.getItem(KEY)) || { packs: [], requests: [] }; } catch { return { packs: [], requests: [] }; } }
function saveLocal(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} }
export function packOf(missionId) { return Object.keys(PACKS).find((k) => PACKS[k].missions.includes(missionId)) || null; }
export function isUnlocked(missionId) { const pk = packOf(missionId); if (!pk) return true; return local().packs.includes(pk); }
export function grantLocal(pack) { const d = local(); if (!d.packs.includes(pack)) d.packs.push(pack); saveLocal(d); }
export function localRequests() { return local().requests; }
async function post(url, body) { const acc = current(); if (!acc) return null; const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: acc.token, ...body }) }); if (r.status === 503 || r.status === 501) return null; const d = await r.json(); if (!r.ok) throw new Error(d.error || 'fail'); return d; }
/** 아이의 요청: 서버 또는 로컬 */
export async function requestNext(mission, next) {
  const d = await post('/api/request', { action: 'create', mission, next }).catch(() => null);
  if (d) { applyEntitlements(d.entitlements); return { where: 'server', requests: d.requests }; }
  const l = local(); if (!l.requests.some((r) => r.next === next && r.status === 'pending')) l.requests.push({ id: 'l' + Date.now(), mission, next, status: 'pending', t: Date.now() }); saveLocal(l); return { where: 'local', requests: l.requests };
}
/** 부모 화면: 요청 목록 + 권한 */
export async function fetchRequests() {
  const d = await post('/api/request', { action: 'list' }).catch(() => null);
  if (d) { applyEntitlements(d.entitlements); return { where: 'server', requests: d.requests, entitlements: d.entitlements }; }
  const l = local(); return { where: 'local', requests: l.requests, entitlements: l.packs.map((p) => ({ pack: p, source: 'local' })) };
}
export async function decide(id, action) {
  const d = await post('/api/request', { action, id }).catch(() => null);
  if (d) { applyEntitlements(d.entitlements); return d; }
  const l = local(); const r = l.requests.find((x) => x.id === id); if (r) { r.status = action === 'approve' ? 'approved' : 'declined'; r.decided_at = Date.now(); } saveLocal(l); return { requests: l.requests };
}
/** 결제(데모): 서버 주문 생성 → 권한. 서버 없으면 로컬 해금 */
export async function checkout(pack) {
  const d = await post('/api/pay', { action: 'checkout', pack }).catch(() => null);
  if (d) { applyEntitlements(d.entitlements); return { where: 'server', orders: d.orders }; }
  grantLocal(pack); const l = local(); l.requests.forEach((r) => { if (r.status === 'pending') { r.status = 'approved'; r.decided_at = Date.now(); } }); saveLocal(l); return { where: 'local' };
}
function applyEntitlements(ents) { if (!Array.isArray(ents)) return; const d = local(); for (const e of ents) if (!d.packs.includes(e.pack)) d.packs.push(e.pack); saveLocal(d); }
export async function refresh() { await fetchRequests().catch(() => {}); }
