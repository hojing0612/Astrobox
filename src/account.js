// 가족 계정 — 코드 6자리 + PIN 4자리. 이메일·실명 없음. 토큰은 localStorage.
const KEY = 'astrobox.account';
export function current() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } }
function set(a) { try { a ? localStorage.setItem(KEY, JSON.stringify(a)) : localStorage.removeItem(KEY); } catch {} }
export function logout() { set(null); }
export async function create(childName, pin) { const r = await fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'create', childName, pin }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || '실패'); set({ code: d.code, childName: d.childName, token: d.token }); return d; }
export async function login(code, pin) { const r = await fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'login', code, pin }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || '실패'); set({ code: d.code, childName: d.childName, token: d.token }); return d; }
export async function available() { try { const r = await fetch('/api/sync?token=x'); return r.status !== 503 && r.status !== 404 && r.status !== 501; } catch { return false; } }
