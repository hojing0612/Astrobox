// Canvas 렌더러 — 라이브 시뮬레이션(재생·배속), 속력·중력 벡터, 경로, 달. 실제 축척.
import * as P from './physics.js';

export class OrbitView {
  constructor(canvas) { this.c = canvas; this.ctx = canvas.getContext('2d'); this.result = null; this.simTime = 0; this.playing = false; this.speed = 60; this.vectors = true; this.anim = null; this.last = 0; this.resize(); window.addEventListener('resize', () => { this.resize(); this.draw(); }); }
  resize() { const dpr = window.devicePixelRatio || 1; const r = this.c.getBoundingClientRect(); this.c.width = Math.max(1, r.width * dpr); this.c.height = Math.max(1, r.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.w = r.width; this.h = r.height; }
  /** 결과를 올리고 처음부터 재생. speed = 시뮬 초/실제 초 */
  show(result, play = true) { this.result = result; this.simTime = 0; this.playing = play; const total = result.sim.t; this.speed = Math.max(30, total / 12); // 12초 안에 한 번 보여주기
    this.loop(); if (!play) this.draw(); }
  play() { this.playing = true; this.loop(); } pause() { this.playing = false; } toggle() { this.playing ? this.pause() : this.play(); return this.playing; }
  setRate(mult) { this.rate = mult; } // 1, 3, 10 배
  loop() { if (this.anim) cancelAnimationFrame(this.anim); this.last = performance.now(); const step = (now) => { const dt = (now - this.last) / 1000; this.last = now; if (this.playing) { this.simTime += dt * this.speed * (this.rate || 1); const total = this.result.sim.t; if (this.simTime > total) this.simTime = (this.result.kind === 'orbit' && !this.result.sim.crashed) ? this.simTime % total : total; } this.draw(); if (this.playing) this.anim = requestAnimationFrame(step); }; this.anim = requestAnimationFrame(step); }
  /** 현재 시각의 상태(보간) */
  stateAt(t) { const pts = this.result.sim.pts; let lo = 0, hi = pts.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid][4] <= t) lo = mid; else hi = mid; } const a = pts[lo], b = pts[hi]; const f = b[4] > a[4] ? Math.min(1, Math.max(0, (t - a[4]) / (b[4] - a[4]))) : 0; return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, vx: a[2] + (b[2] - a[2]) * f, vy: a[3] + (b[3] - a[3]) * f, idx: lo }; }
  draw() {
    const { ctx, w, h } = this; ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a1224'; ctx.fillRect(0, 0, w, h);
    const rnd = (i) => ((Math.sin(i * 127.1) * 43758.5453) % 1 + 1) % 1;
    ctx.fillStyle = 'rgba(199,210,229,.55)'; for (let i = 0; i < 90; i++) { ctx.beginPath(); ctx.arc(rnd(i) * w, rnd(i + 99) * h, rnd(i + 7) * 1.4 + .3, 0, 7); ctx.fill(); }
    const res = this.result; if (!res) return;
    const pts = res.sim.pts; const scale = res.scale;
    let extent = P.R_EARTH * 1.9;
    if (scale === 'moon') extent = P.D_MOON * 1.25;
    else { let m = 0; for (const p of pts) m = Math.max(m, Math.hypot(p[0], p[1])); extent = Math.max(P.R_EARTH * 1.12, m * 1.08); if (res.kind === 'escape') extent = Math.min(extent, P.R_EARTH * 12); }
    const cx = w / 2, cy = h / 2, k = Math.min(w, h) / 2 / extent;
    const X = (x) => cx + x * k, Y = (y) => cy - y * k;
    if (scale !== 'moon') { ctx.strokeStyle = 'rgba(90,169,255,.25)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(cx, cy, (P.R_EARTH + P.ATMO) * k, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    const re = Math.max(3, P.R_EARTH * k * (res.muScale ? Math.cbrt(res.muScale) : 1)); const g = ctx.createRadialGradient(cx - re * .3, cy - re * .3, re * .1, cx, cy, re); g.addColorStop(0, '#6fb1ff'); g.addColorStop(1, '#1d4ed8'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, re, 0, 7); ctx.fill();
    ctx.fillStyle = '#c7d2e5'; ctx.font = '12px system-ui'; ctx.textAlign = 'center'; if (re > 14) ctx.fillText('지구', cx, cy + re + 14);
    const st = this.stateAt(this.simTime);
    if (scale === 'moon' && res.moon) {
      ctx.strokeStyle = 'rgba(199,210,229,.25)'; ctx.beginPath(); ctx.arc(cx, cy, P.D_MOON * k, 0, 7); ctx.stroke();
      const th = P.OMEGA_MOON * this.simTime + res.moon.phase0; const mx = X(P.D_MOON * Math.cos(th)), my = Y(P.D_MOON * Math.sin(th));
      ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.arc(mx, my, Math.max(4, P.R_MOON * k * 3), 0, 7); ctx.fill(); ctx.fillText('달', mx, my - 10);
      ctx.strokeStyle = 'rgba(229,231,235,.2)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(mx, my, P.MOON_SOI * k, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
    // 경로(지나온 곳은 진하게, 앞은 흐리게)
    const color = { crash: '#ff6b6b', orbit: '#ff6237', escape: '#5aa9ff', short: '#ffb454', arrive: '#46d49a', overshoot: '#5aa9ff' }[res.kind] || '#ff6237';
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(199,210,229,.18)'; ctx.beginPath(); for (let i = 0; i < pts.length; i++) { const p = pts[i]; if (i === 0) ctx.moveTo(X(p[0]), Y(p[1])); else ctx.lineTo(X(p[0]), Y(p[1])); } ctx.stroke();
    ctx.lineWidth = 2.4; ctx.strokeStyle = color; ctx.beginPath(); for (let i = 0; i <= st.idx; i++) { const p = pts[i]; if (i === 0) ctx.moveTo(X(p[0]), Y(p[1])); else ctx.lineTo(X(p[0]), Y(p[1])); } ctx.lineTo(X(st.x), Y(st.y)); ctx.stroke();
    // 벡터: 속력(초록) · 중력(파랑)
    const sx = X(st.x), sy = Y(st.y);
    if (this.vectors) {
      const arrow = (x0, y0, dx, dy, col, label) => { const L = Math.hypot(dx, dy); if (L < 2) return; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + dx, y0 + dy); ctx.stroke(); const a = Math.atan2(dy, dx); ctx.beginPath(); ctx.moveTo(x0 + dx, y0 + dy); ctx.lineTo(x0 + dx - 8 * Math.cos(a - .5), y0 + dy - 8 * Math.sin(a - .5)); ctx.lineTo(x0 + dx - 8 * Math.cos(a + .5), y0 + dy - 8 * Math.sin(a + .5)); ctx.closePath(); ctx.fill(); ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText(label, x0 + dx + 4, y0 + dy + 4); };
      const vmag = Math.hypot(st.vx, st.vy); const vlen = Math.min(w, h) * 0.09 * Math.min(1.6, vmag / 7.67);
      arrow(sx, sy, st.vx / vmag * vlen, -st.vy / vmag * vlen, '#46d49a', `속력 ${vmag.toFixed(1)}`);
      const r = Math.hypot(st.x, st.y); const gmag = (res.muScale || 1) * P.MU_EARTH / (r * r); const glen = Math.min(w, h) * 0.07 * Math.min(1.6, gmag / (P.MU_EARTH / 6771 ** 2));
      arrow(sx, sy, -st.x / r * glen, st.y / r * glen, '#5aa9ff', '중력');
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 7); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 7); ctx.stroke();
    // 축척 · 시계
    const barKm = scale === 'moon' ? 100000 : (extent > 50000 ? 10000 : 1000); ctx.strokeStyle = '#91a0bd'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(16, h - 16); ctx.lineTo(16 + barKm * k, h - 16); ctx.stroke(); ctx.textAlign = 'left'; ctx.fillStyle = '#91a0bd'; ctx.font = '12px system-ui'; ctx.fillText(`${barKm.toLocaleString()} km`, 16, h - 22);
    ctx.textAlign = 'right'; const tt = this.simTime; ctx.fillText((scale === 'moon' ? `${(tt / 86400).toFixed(1)}일` : tt < 7200 ? `${Math.round(tt / 60)}분` : `${(tt / 3600).toFixed(1)}시간`) + (scale !== 'moon' ? ' · 실제 축척' : ''), w - 14, h - 14);
  }
}
