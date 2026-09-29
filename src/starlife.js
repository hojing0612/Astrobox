// 별의 생애 — 별 키우기 장면(Canvas 2D). 질량에 따라 색·크기가 바뀌고, '일생 빨리 감기'로 운명(백색왜성·중성자별·블랙홀·갈색왜성)을 애니메이션으로 본다.
import { fateId, lifetimeYears } from './content.js';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const rnd = (i) => ((Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1 + 1) % 1;
const lerp = (a, b, u) => a + (b - a) * u;
/** 주계열 색: 질량이 클수록 뜨겁고 푸르다(교과서 스펙트럼형 근사) */
function colorOf(m) { const stops = [[0.08, [255, 90, 60]], [0.5, [255, 150, 80]], [1, [255, 236, 170]], [2, [255, 255, 255]], [6, [200, 220, 255]], [20, [150, 185, 255]], [100, [120, 160, 255]]]; let i = 0; while (i < stops.length - 2 && m > stops[i + 1][0]) i++; const [m0, c0] = stops[i], [m1, c1] = stops[i + 1]; const u = clamp((Math.log(m) - Math.log(m0)) / (Math.log(m1) - Math.log(m0))); return c0.map((v, k) => Math.round(lerp(v, c1[k], u))); }
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
/** 화면 반지름: 태양=30px, 대략 질량^0.6(주계열 반지름 근사), 8~140px */
const radiusOf = (m) => clamp(30 * Math.pow(m, 0.5), 8, 110);
// 운명별 단계(진행 0~1). 각 단계 { name, from, to } — 시간은 연출용이며 실제 비율과 다르다(화면에 표기)
const STAGES = {
  none: [{ name: '불이 붙지 않음', from: 0, to: 1, desc: '질량이 태양의 8%도 안 돼서 수소 핵융합을 못 켜요. 천천히 식어 가는 갈색왜성' }],
  wd_small: [{ name: '주계열 · 아주 천천히', from: 0, to: 0.85, desc: '작은 별은 연료를 아껴 써서 우주 나이(138억 년)보다 오래 살아요. 아직 죽은 적색왜성은 하나도 없어요' }, { name: '백색왜성', from: 0.85, to: 1, desc: '먼 미래에 핵만 남아요' }],
  wd: [{ name: '주계열', from: 0, to: 0.42, desc: '수소를 헬륨으로 바꾸며 안정하게 빛나요. 태양은 지금 이 단계' }, { name: '적색거성', from: 0.42, to: 0.66, desc: '중심 수소가 떨어지면 바깥이 크게 부풀고 붉어져요. 태양은 지구 궤도 근처까지 커져요' }, { name: '행성상 성운', from: 0.66, to: 0.88, desc: '바깥층을 우주로 날려 보내요. 알록달록한 고리가 돼요' }, { name: '백색왜성', from: 0.88, to: 1, desc: '지구만 한 크기에 태양 질량 절반이 눌려 있어요. 천천히 식어요' }],
  ns: [{ name: '주계열', from: 0, to: 0.32, desc: '무거운 별은 뜨겁고 푸르게, 그리고 빨리 타요' }, { name: '적색초거성', from: 0.32, to: 0.56, desc: '엄청나게 부풀어요. 베텔게우스가 이 단계' }, { name: '초신성 폭발!', from: 0.56, to: 0.72, desc: '철 핵이 무너지며 폭발. 은하 하나만큼 밝아지고, 금·철 같은 원소를 우주에 뿌려요' }, { name: '중성자별', from: 0.72, to: 1, desc: '도시만 한 크기에 태양보다 무거워요. 1초에 수백 번 돌며 빛줄기를 쏘기도 해요' }],
  bh: [{ name: '주계열', from: 0, to: 0.32, desc: '아주 무거운 별은 몇백만 년밖에 못 살아요' }, { name: '적색초거성', from: 0.32, to: 0.56, desc: '태양 자리에 두면 목성 궤도까지 닿아요' }, { name: '초신성 폭발!', from: 0.56, to: 0.72, desc: '폭발하고 남은 핵이 너무 무거워서 중성자별로도 못 버텨요' }, { name: '블랙홀', from: 0.72, to: 1, desc: '빛도 못 빠져나와요. 주변 물질이 빨려 들며 빛나는 원반을 만들어요' }],
};
export const stagesFor = (m) => { const id = fateId(m); return STAGES[id === 'wd' && m < 0.5 ? 'wd_small' : id]; };

export class StarView {
  constructor(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.m = 1; this.p = null; this.playing = false; this.onStage = null; this.onDone = null; this.frame = 0; this.parts = [];
    this.bgStars = Array.from({ length: 160 }, (_, i) => ({ x: rnd(i), y: rnd(i + 500), r: 0.4 + rnd(i + 900) * 1.2, p: rnd(i + 1300) * 6.28 }));
    this.resize(); window.addEventListener('resize', () => this.resize()); this.last = performance.now(); this.loop();
  }
  resize() { const r = this.c.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); this.c.width = Math.max(1, r.width * dpr); this.c.height = Math.max(1, r.height * dpr); this.g.setTransform(dpr, 0, 0, dpr, 0, 0); this.w = r.width; this.h = r.height; }
  setMass(m) { this.m = m; if (!this.playing) { this.p = null; this.parts = []; } }
  play() { this.playing = true; this.p = 0; this.parts = []; this.stageIdx = -1; this.boomDone = false; }
  stop() { this.playing = false; this.p = null; this.parts = []; }
  loop() { requestAnimationFrame(() => this.loop()); const now = performance.now(); const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.frame += dt;
    if (this.playing) { this.p = clamp(this.p + dt / 11); const st = stagesFor(this.m); const i = st.findIndex((s) => this.p >= s.from && this.p < s.to + 1e-9); if (i !== this.stageIdx && i >= 0) { this.stageIdx = i; this.onStage && this.onStage(st[i], i, st.length); } if (this.p >= 1) { this.playing = false; this.onDone && this.onDone(); } }
    this.draw(); }
  draw() {
    const g = this.g, w = this.w, h = this.h, m = this.m, f = this.frame; g.clearRect(0, 0, w, h);
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#04070f'); bg.addColorStop(1, '#0a1224'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (const s of this.bgStars) { g.globalAlpha = 0.5 + 0.5 * Math.sin(f * 2 + s.p); g.fillStyle = '#e8f0ff'; g.beginPath(); g.arc(s.x * w, s.y * h, s.r, 0, 7); g.fill(); } g.globalAlpha = 1;
    const cx = w * 0.42, cy = h * 0.5; const base = radiusOf(m); const col = colorOf(m); const id = fateId(m);
    // 기준: 태양 크기(점선) + 지구(점)
    g.strokeStyle = 'rgba(255,220,120,0.45)'; g.setLineDash([4, 5]); g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, 30, 0, 7); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#91a0bd'; g.font = '11px system-ui'; g.textAlign = 'left'; g.fillText('태양 크기', cx + 34, cy - 24); g.fillStyle = '#5aa9ff'; g.beginPath(); g.arc(cx + 36, cy - 8, 1.6, 0, 7); g.fill(); g.fillStyle = '#91a0bd'; g.fillText('지구', cx + 41, cy - 4);
    let R = base, C = col, glow = 1, shape = 'star';
    if (this.p !== null) { // 일생 연출
      const p = this.p; const st = stagesFor(m); const cur = st.find((s) => p >= s.from && p < s.to + 1e-9) || st[st.length - 1]; const u = clamp((p - cur.from) / (cur.to - cur.from));
      if (id === 'none') { R = base * (1 - u * 0.4); C = [140 + 60 * (1 - u), 60, 40]; glow = 0.6 * (1 - u) + 0.1; }
      else if (cur.name.startsWith('주계열')) { const pulse = 1 + 0.02 * Math.sin(f * 6); R = base * pulse; }
      else if (cur.name === '적색거성' || cur.name === '적색초거성') { const k = cur.name === '적색거성' ? 3.2 : 4.2; R = base * lerp(1, k, u * u); C = [255, lerp(col[1], 110, u), lerp(col[2], 60, u)]; glow = 0.8; }
      else if (cur.name === '행성상 성운') { R = base * lerp(3.2, 0.35, u); C = [lerp(255, 240, u), lerp(110, 240, u), lerp(60, 255, u)]; this.nebula(cx, cy, base, u); }
      else if (cur.name === '백색왜성') { R = Math.max(5, base * 0.35 * (1 - u * 0.3)); C = [235, 240, 255]; glow = 0.5; if (st.length > 2) this.nebula(cx, cy, base, 1, 1 - u); }
      else if (cur.name === '초신성 폭발!') { if (!this.boomDone) { this.boom(cx, cy, base); this.boomDone = true; } R = u < 0.15 ? base * 4.2 * (1 - u / 0.15) + 12 : 10; C = [255, 255, 255]; glow = u < 0.15 ? 3 : 1.5; if (u < 0.12) { g.fillStyle = `rgba(255,255,255,${1 - u / 0.12})`; g.fillRect(0, 0, w, h); } this.shock(cx, cy, u, base); }
      else if (cur.name === '중성자별') { shape = 'ns'; R = 7; C = [220, 235, 255]; this.shock(cx, cy, 1, base, 1 - u); }
      else if (cur.name === '블랙홀') { shape = 'bh'; R = 16 + 4 * u; this.shock(cx, cy, 1, base, 1 - u); }
    }
    R = Math.min(R, h * 0.44); // 화면 밖으로 넘치지 않게
    this.drawParts();
    if (shape === 'star') { // 후광 + 본체 + 표면 무늬
      const gr = g.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * (2.2 + 0.15 * Math.sin(f * 3))); gr.addColorStop(0, rgba(C, 0.55 * glow)); gr.addColorStop(1, rgba(C, 0)); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * 2.6, 0, 7); g.fill();
      for (let i = 0; i < 10; i++) { const th = i * 0.628 + f * 0.4; const L = R * (1.15 + 0.25 * Math.sin(f * 5 + i * 1.7)); g.strokeStyle = rgba(C, 0.35 * glow); g.lineWidth = 2; g.beginPath(); g.moveTo(cx + Math.cos(th) * R * 0.95, cy + Math.sin(th) * R * 0.95); g.lineTo(cx + Math.cos(th) * L, cy + Math.sin(th) * L); g.stroke(); }
      const body = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R); body.addColorStop(0, 'rgba(255,255,255,0.95)'); body.addColorStop(0.35, rgba(C, 1)); body.addColorStop(1, rgba(C.map((v) => v * 0.55), 1)); g.fillStyle = body; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
      if (m >= 0.5 && m < 2 && R > 14) for (let i = 0; i < 5; i++) { const th = rnd(i + 20) * 6.28 + f * 0.25, rr = rnd(i + 30) * R * 0.7; g.fillStyle = 'rgba(120,60,20,0.35)'; g.beginPath(); g.arc(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr, R * 0.06 + rnd(i + 40) * R * 0.05, 0, 7); g.fill(); }
    } else if (shape === 'ns') { const th = f * 12; for (const s of [1, -1]) { g.strokeStyle = 'rgba(160,200,255,0.55)'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(th) * s * 140, cy + Math.sin(th) * s * 140); g.stroke(); } const gr = g.createRadialGradient(cx, cy, 2, cx, cy, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(160,200,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 30, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); }
    else if (shape === 'bh') { g.save(); g.translate(cx, cy); g.rotate(-0.35); const ring = g.createRadialGradient(0, 0, R, 0, 0, R * 3.2); ring.addColorStop(0, 'rgba(255,200,120,0.95)'); ring.addColorStop(0.35, 'rgba(255,120,50,0.7)'); ring.addColorStop(1, 'rgba(255,90,40,0)'); g.fillStyle = ring; g.beginPath(); g.ellipse(0, 0, R * 3.2, R * 1.1, 0, 0, 7); g.fill(); g.restore();
      const halo = g.createRadialGradient(cx, cy, R, cx, cy, R * 1.5); halo.addColorStop(0, 'rgba(255,220,180,0.9)'); halo.addColorStop(1, 'rgba(255,220,180,0)'); g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, R * 1.5, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); }
    // 라벨
    g.fillStyle = 'rgba(247,249,255,0.9)'; g.font = 'bold 13px system-ui'; g.textAlign = 'center'; g.fillText(`${m < 10 ? m.toFixed(2) : m.toFixed(0)} 태양질량`, cx, h - 16);
  }
  nebula(cx, cy, base, u, fade = 1) { const g = this.g; for (let k = 0; k < 3; k++) { const R = base * (1.2 + u * (4 + k * 1.6)); const a = fade * (0.35 - k * 0.08) * (1 - u * 0.5); const cols = ['rgba(255,110,80,', 'rgba(90,200,255,', 'rgba(120,255,170,']; g.strokeStyle = cols[k] + a + ')'; g.lineWidth = 10 - k * 2; g.beginPath(); g.ellipse(cx, cy, R, R * (0.75 + 0.1 * k), 0.4 * k, 0, 7); g.stroke(); } }
  boom(cx, cy, base) { for (let i = 0; i < 160; i++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 260; this.parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2 + Math.random() * 1.6, c: ['#fff', '#ffb454', '#ff6237', '#5aa9ff', '#46d49a'][i % 5] }); } }
  shock(cx, cy, u, base, fade = 1) { const g = this.g; const R = base * (1 + u * 9); g.strokeStyle = `rgba(255,180,120,${0.7 * (1 - u * 0.8) * fade})`; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); }
  drawParts() { const g = this.g; const dt = 1 / 60; this.parts = this.parts.filter((p) => p.life > 0); for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.995; p.vy *= 0.995; p.life -= dt; g.globalAlpha = clamp(p.life); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 2, 0, 7); g.fill(); } g.globalAlpha = 1; }
}
export { colorOf, radiusOf, lifetimeYears };
