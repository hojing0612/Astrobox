// 가족 코드 + PIN. 이메일·실명 없음(만 14세 미만 사용자 고려). 토큰 = HMAC 서명(코드·만료).
import crypto from 'node:crypto';
const SECRET = () => process.env.SESSION_SECRET || 'dev-secret-change-me';
export const hashPin = (code, pin) => crypto.scryptSync(String(pin), 'astrobox:' + code, 32).toString('hex');
export const newCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 6; i++) c += A[crypto.randomInt(A.length)]; return c; };
export function sign(payload) { const body = Buffer.from(JSON.stringify(payload)).toString('base64url'); const mac = crypto.createHmac('sha256', SECRET()).update(body).digest('base64url'); return body + '.' + mac; }
export function verify(token) { if (!token || typeof token !== 'string' || !token.includes('.')) return null; const [body, mac] = token.split('.'); const good = crypto.createHmac('sha256', SECRET()).update(body).digest('base64url'); if (mac.length !== good.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return null; try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); if (p.exp && p.exp < Date.now()) return null; return p; } catch { return null; } }
