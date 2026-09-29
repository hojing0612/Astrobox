// Canvas 렌더러 — 지구·달·궤적. 스케일은 결과의 범위에 맞춰 자동.
import * as P from './physics.js';

export class OrbitView {
  constructor(canvas) { this.c = canvas; this.ctx = canvas.getContext('2d'); this.result = null; this.progress = 1; this.anim = null; this.resize(); window.addEventListener('resize', () => { this.resize(); this.draw(); }); }
  resize() { const dpr = window.devicePixelRatio || 1; const r = this.c.getBoundingClientRect(); this.c.width = Math.max(1, r.width * dpr); this.c.height = Math.max(1, r.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.w = r.width; this.h = r.height; }
  show(result, animate = true) {
    this.result = result; if (this.anim) cancelAnimationFrame(this.anim);
    if (!animate) { this.progress = 1; this.draw(); return; }
    this.progress = 0; const t0 = performance.now(); const dur = 1800;
    const step = (t) => { this.progress = Math.min(1, (t - t0) / dur); this.draw(); if (this.progress < 1) this.anim = requestAnimationFrame(step); };
    this.anim = requestAnimationFrame(step);
  }
  draw() {
    const { ctx, w, h } = this; ctx.clearRect(0, 0, w, h);
    // 배경 별
    ctx.fillStyle = '#0a1224'; ctx.fillRect(0, 0, w, h);
    const rnd = (i) => ((Math.sin(i * 127.1) * 43758.5453) % 1 + 1) % 1;
    ctx.fillStyle = 'rgba(199,210,229,.55)'; for (let i = 0; i < 90; i++) { ctx.beginPath(); ctx.arc(rnd(i) * w, rnd(i + 99) * h, rnd(i + 7) * 1.4 + .3, 0, 7); ctx.fill(); }
    const res = this.result; if (!res) return;
    const pts = res.sim.pts; const scale = res.scale;
    // 범위 결정
    let extent = P.R_EARTH * 1.9;
    if (scale === 'moon') extent = P.D_MOON * 1.25;
    else { let m = 0; for (const [x, y] of pts) m = Math.max(m, Math.hypot(x, y)); extent = Math.max(P.R_EARTH * 1.12, m * 1.08); if (res.kind === 'escape') extent = Math.min(extent, P.R_EARTH * 12); }
    const cx = w / 2, cy = h / 2, k = Math.min(w, h) / 2 / extent;
    const X = (x) => cx + x * k, Y = (y) => cy - y * k;
    // 대기선(카르만선)
    if (scale !== 'moon') { ctx.strokeStyle = 'rgba(90,169,255,.25)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(cx, cy, (P.R_EARTH + P.ATMO) * k, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    // 지구
    const re = Math.max(3, P.R_EARTH * k); const g = ctx.createRadialGradient(cx - re * .3, cy - re * .3, re * .1, cx, cy, re); g.addColorStop(0, '#6fb1ff'); g.addColorStop(1, '#1d4ed8'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, re, 0, 7); ctx.fill();
    ctx.fillStyle = '#c7d2e5'; ctx.font = '12px system-ui'; ctx.textAlign = 'center'; if (re > 14) ctx.fillText('지구', cx, cy + re + 14);
    // 달 (궤도 + 현재 위치)
    if (scale === 'moon' && res.moon) {
      ctx.strokeStyle = 'rgba(199,210,229,.25)'; ctx.beginPath(); ctx.arc(cx, cy, P.D_MOON * k, 0, 7); ctx.stroke();
      const t = res.sim.t * this.progress; const th = P.OMEGA_MOON * t + res.moon.phase0;
      const mx = X(P.D_MOON * Math.cos(th)), my = Y(P.D_MOON * Math.sin(th));
      ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.arc(mx, my, Math.max(4, P.R_MOON * k * 3), 0, 7); ctx.fill(); ctx.fillText('달', mx, my - 10);
      ctx.strokeStyle = 'rgba(229,231,235,.2)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(mx, my, P.MOON_SOI * k, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
    // 궤적
    const n = Math.max(2, Math.floor(pts.length * this.progress));
    const color = { crash: '#ff6b6b', orbit: '#ff6237', escape: '#5aa9ff', short: '#ffb454', arrive: '#46d49a', overshoot: '#5aa9ff' }[res.kind] || '#ff6237';
    ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i < n; i++) { const [x, y] = pts[i]; if (i === 0) ctx.moveTo(X(x), Y(y)); else ctx.lineTo(X(x), Y(y)); }
    ctx.stroke();
    // 위성 현재 위치
    const [sx, sy] = pts[n - 1]; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(sx), Y(sy), 5, 0, 7); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(sx), Y(sy), 9, 0, 7); ctx.stroke();
    // 축척
    const barKm = scale === 'moon' ? 100000 : (extent > 50000 ? 10000 : 1000); ctx.strokeStyle = '#91a0bd'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(16, h - 16); ctx.lineTo(16 + barKm * k, h - 16); ctx.stroke(); ctx.textAlign = 'left'; ctx.fillStyle = '#91a0bd'; ctx.fillText(`${barKm.toLocaleString()} km`, 16, h - 22); if (scale !== 'moon') { ctx.textAlign = 'right'; ctx.fillText('실제 축척 · 점선 = 대기(100 km)', w - 14, h - 14); }
  }
}
