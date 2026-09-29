// 로컬 저장 — 실험 로그·설명 카드. (계정 없음, 이 브라우저에만 남는다)
const KEY = 'astrobox.v1';
export function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { events: [], cards: [] }; } catch { return { events: [], cards: [] }; } }
export function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} }
export function log(type, data) { const db = load(); db.events.push({ t: Date.now(), type, ...data }); save(db); return db; }
export function addCard(card) { const db = load(); db.cards.push({ t: Date.now(), ...card }); save(db); return db; }
export function reset() { try { localStorage.removeItem(KEY); } catch {} }
export function summary() {
  const db = load(); const ev = db.events;
  const byMission = {};
  for (const e of ev) { const m = e.mission || '-'; byMission[m] ??= { experiments: 0, coach: 0, judged: 0, supported: 0, transfer: 0, transferOk: 0, cards: 0, first: e.t, last: e.t }; const b = byMission[m]; b.last = e.t;
    if (e.type === 'experiment') b.experiments++; if (e.type === 'coach') b.coach++; if (e.type === 'judge') { b.judged++; if (e.verdict === 'supported') b.supported++; } if (e.type === 'transfer') { b.transfer++; if (e.correct) b.transferOk++; } }
  for (const c of db.cards) { byMission[c.mission] ??= { experiments: 0, coach: 0, judged: 0, supported: 0, transfer: 0, transferOk: 0, cards: 0 }; byMission[c.mission].cards++; }
  return { byMission, cards: db.cards, events: ev, missions: Object.keys(byMission).filter((k) => k !== '-') };
}
