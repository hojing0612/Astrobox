// 기록 — 로컬(localStorage)에 항상 저장하고, 로그인돼 있으면 서버(/api/sync)에 병합. 클라이언트 id로 중복 방지.
import { current } from './account.js';
const KEY = 'astrobox.v1';
const cid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { events: [], cards: [] }; } catch { return { events: [], cards: [] }; } }
export function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} }
export function log(type, data) { const db = load(); db.events.push({ cid: cid(), t: Date.now(), type, ...data }); save(db); scheduleSync(); return db; }
export function addCard(card) { const db = load(); db.cards.push({ cid: cid(), t: Date.now(), ...card }); save(db); scheduleSync(); return db; }
export function reset() { try { localStorage.removeItem(KEY); } catch {} }
let timer = null; export const syncState = { status: 'local', last: null, error: null };
export function scheduleSync() { if (!current()) return; clearTimeout(timer); timer = setTimeout(() => sync().catch(() => {}), 800); }
/** 로컬 ↔ 서버 병합. 서버가 없으면 local 상태 유지 */
export async function sync() {
  const acc = current(); if (!acc) { syncState.status = 'local'; return null; }
  const db = load();
  try {
    const r = await fetch('/api/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: acc.token, events: db.events.filter((e) => e.cid), cards: db.cards.filter((c) => c.cid) }) });
    if (r.status === 401) { syncState.status = 'expired'; return null; }
    if (!r.ok) throw new Error('sync ' + r.status);
    const d = await r.json();
    const merged = { events: mergeBy(db.events, d.events), cards: mergeBy(db.cards, d.cards) }; save(merged);
    syncState.status = 'synced'; syncState.last = Date.now(); syncState.error = null; window.dispatchEvent(new CustomEvent('astrobox:synced')); return merged;
  } catch (e) { syncState.status = 'offline'; syncState.error = String(e.message); return null; }
}
function mergeBy(a, b) { const m = new Map(); for (const x of [...a, ...b]) { const k = x.cid || ('legacy:' + x.t + ':' + (x.type || 'card')); if (!m.has(k)) m.set(k, x); } return [...m.values()].sort((x, y) => x.t - y.t); }
export function summary() {
  const db = load(); const ev = db.events;
  const byMission = {};
  for (const e of ev) { const m = e.mission || '-'; byMission[m] ??= { experiments: 0, coach: 0, judged: 0, supported: 0, transfer: 0, transferOk: 0, cards: 0, hints: 0, solutions: 0, first: e.t, last: e.t }; const b = byMission[m]; b.last = e.t;
    if (e.type === 'experiment') b.experiments++; if (e.type === 'coach') b.coach++; if (e.type === 'hint') b.hints++; if (e.type === 'solution') b.solutions++; if (e.type === 'judge') { b.judged++; if (e.verdict === 'supported') b.supported++; } if (e.type === 'transfer') { b.transfer++; if (e.correct) b.transferOk++; } }
  for (const c of db.cards) { byMission[c.mission] ??= { experiments: 0, coach: 0, judged: 0, supported: 0, transfer: 0, transferOk: 0, cards: 0, hints: 0, solutions: 0 }; byMission[c.mission].cards++; }
  return { byMission, cards: db.cards, events: ev, missions: Object.keys(byMission).filter((k) => k !== '-') };
}
