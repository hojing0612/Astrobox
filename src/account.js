// 가족 계정 — 코드 6자리 + PIN 4자리. 이메일·실명 없음. 토큰은 localStorage.
const KEY = 'astrobox.account';
export function current() { try { const a = JSON.parse(localStorage.getItem(KEY)); if (a?.code && !a.role) { for (const base of ['astrobox.v1','astrobox.unlock']) { const old = localStorage.getItem(base); if (old && !localStorage.getItem(base + ':' + a.code)) localStorage.setItem(base + ':' + a.code, old); } a.role = 'legacy'; set(a); } return a || null; } catch { return null; } }
export const storageKey = base => current()?.code ? base + ':' + current().code : base;
function set(a) { try { a ? localStorage.setItem(KEY, JSON.stringify(a)) : localStorage.removeItem(KEY); } catch {} }
export function logout() { set(null); }
async function post(url, body) { const r = await fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) }); let d; try { d = await r.json(); } catch { throw new Error('계정 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'); } if (!r.ok) throw new Error(d.error === 'no database' ? '계정 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.' : d.error || '요청하지 못했어요.'); return d; }
export async function create(childName, pin, role) { const d = await post('/api/auth',{action:'create',childName,pin,role}); set(d); return d; }
export async function login(code, pin) { const d = await post('/api/auth',{action:'login',code,pin}); set(d); return d; }
export async function family(action='status', data={}) { const acc=current(); if (!acc) throw new Error('먼저 로그인해 주세요.'); const d=await post('/api/family',{...data,action,token:acc.token}); if (current()?.token !== acc.token) throw new Error('계정이 바뀌었어요. 다시 확인해 주세요.'); if(d.me)set({...acc,...d.me}); return d; }
export async function available() { try { const r = await fetch('/api/sync?token=x'); return r.status !== 503 && r.status !== 404 && r.status !== 501; } catch { return false; } }
