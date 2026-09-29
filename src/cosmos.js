// 우주 138억 년 — 시간 여행 장면(Canvas 2D). 슬라이더 시각 t(빅뱅 후 년)에 따라 시대가 바뀐다. 값은 content.js의 근사 이정표 기준.
import { AGE, sliderT } from './content.js';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (t, a, b) => { const x = clamp((Math.log10(Math.max(t, 1e-12)) - Math.log10(a)) / (Math.log10(b) - Math.log10(a))); return x * x * (3 - 2 * x); };
const rnd = (i) => ((Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1 + 1) % 1;

export class CosmosView {
  constructor(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.t = AGE; this.playing = false; this.onTick = null; this.onDone = null; this.frame = 0;
    this.penguin = new Image(); this.penguin.src = 'assets/penguin-256.png'; this.earthImg = new Image(); this.earthImg.src = 'assets/tex/earth-day-2k.jpg';
    this.stars = Array.from({ length: 220 }, (_, i) => ({ x: rnd(i), y: rnd(i + 500), r: 0.5 + rnd(i + 900) * 1.4, p: rnd(i + 1300) * 6.28 }));
    this.galaxies = Array.from({ length: 7 }, (_, i) => ({ x: 0.12 + rnd(i + 40) * 0.76, y: 0.15 + rnd(i + 80) * 0.6, s: 0.5 + rnd(i + 120) * 0.8, rot: rnd(i + 160) * 6.28, born: 4e8 * (1 + i * 0.9), spin: (rnd(i + 200) > 0.5 ? 1 : -1) * (0.15 + rnd(i + 240) * 0.2) }));
    this.firstStars = Array.from({ length: 14 }, (_, i) => ({ x: 0.08 + rnd(i + 300) * 0.84, y: 0.1 + rnd(i + 340) * 0.7, born: 1e8 * (1 + 1.8 * rnd(i + 380)), r: 2.5 + rnd(i + 420) * 3 }));
    this.resize(); window.addEventListener('resize', () => this.resize()); this.last = performance.now(); this.loop();
  }
  resize() { const r = this.c.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); this.c.width = Math.max(1, r.width * dpr); this.c.height = Math.max(1, r.height * dpr); this.g.setTransform(dpr, 0, 0, dpr, 0, 0); this.w = r.width; this.h = r.height; }
  setTime(t) { this.t = clamp(t, 0, AGE); }
  /** 자동 시간 여행: 로그 눈금으로 s=0→1 (약 14초) */
  play() { this.playing = true; this.s = 0; }
  stop() { this.playing = false; }
  loop() {
    requestAnimationFrame(() => this.loop()); const now = performance.now(); const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.frame += dt;
    if (this.playing) { this.s = clamp(this.s + dt / 18); this.t = sliderT(this.s); if (this.s >= 1) { this.t = AGE; this.playing = false; this.onDone && this.onDone(); } this.onTick && this.onTick(this.t, this.s); }
    this.draw();
  }
  draw() {
    const g = this.g, w = this.w, h = this.h, t = this.t, f = this.frame; g.clearRect(0, 0, w, h);
    // 시대 가중치(0~1)
    const flash = 1 - smooth(t, 1e-9, 1e-4);                 // 빅뱅 섬광
    const plasma = 1 - smooth(t, 3e4, 3.8e5);                 // 뜨거운 안개(불투명)
    const dark = smooth(t, 3.8e5, 2e6) * (1 - smooth(t, 5e7, 4e8)); // 암흑 시대
    const starsOn = smooth(t, 1e8, 1.2e9);                    // 별하늘
    const galOn = smooth(t, 4e8, 4e9);
    const solar = smooth(t, AGE - 4.7e9, AGE - 4.4e9);        // 태양계
    const earthBig = smooth(t, AGE - 3.9e9, AGE - 3.7e9);     // 지구 확대(생명 이후)
    // 배경
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#04070f'); bg.addColorStop(1, '#0a1224'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // 별하늘
    for (const s of this.stars) { const tw = 0.55 + 0.45 * Math.sin(f * 2 + s.p); g.globalAlpha = starsOn * tw; g.fillStyle = '#e8f0ff'; g.beginPath(); g.arc(s.x * w, s.y * h, s.r, 0, 7); g.fill(); }
    g.globalAlpha = 1;
    // 은하
    for (const gal of this.galaxies) { const a = galOn * smooth(t, gal.born, gal.born * 3) * (1 - earthBig * 0.85); if (a <= 0.01) continue; this.spiral(gal.x * w, gal.y * h, 26 * gal.s, gal.rot + f * gal.spin, a); }
    // 최초의 별(크고 푸른)
    for (const s of this.firstStars) { const a = smooth(t, s.born * 0.85, s.born * 1.25) * (1 - galOn * 0.6) * (1 - earthBig); if (a <= 0.01) continue; const x = s.x * w, y = s.y * h; const gr = g.createRadialGradient(x, y, 0, x, y, s.r * 6); gr.addColorStop(0, `rgba(220,235,255,${a})`); gr.addColorStop(0.3, `rgba(140,180,255,${a * 0.5})`); gr.addColorStop(1, 'rgba(140,180,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s.r * 6, 0, 7); g.fill(); g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.arc(x, y, s.r, 0, 7); g.fill(); }
    // 태양계
    if (solar > 0.01) this.solarSystem(w * 0.62, h * 0.5, solar * (1 - earthBig), t);
    if (earthBig > 0.01) this.earth(w * 0.66, h * 0.5, 64 * earthBig, t);
    // 암흑 시대: 어둡고 붉은 여운
    if (dark > 0.01) { g.fillStyle = `rgba(60,10,10,${0.55 * dark})`; g.fillRect(0, 0, w, h); }
    // 뜨거운 안개(플라스마): 시간이 지날수록 식어(주황→검붉음) 옅어짐
    if (plasma > 0.01) { const cool = smooth(t, 1, 3.8e5); const gr = g.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75); gr.addColorStop(0, `rgba(${255 - 60 * cool},${200 - 150 * cool},${90 - 80 * cool},${plasma})`); gr.addColorStop(1, `rgba(${180 - 100 * cool},${60 - 40 * cool},20,${plasma})`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { const x = (rnd(i + 700) + Math.sin(f * 1.7 + i) * 0.01) * w, y = (rnd(i + 800) + Math.cos(f * 1.3 + i) * 0.01) * h; g.fillStyle = `rgba(255,${230 - 120 * cool},${180 - 120 * cool},${plasma * 0.6})`; g.beginPath(); g.arc(x, y, 1.5 + rnd(i + 900) * 2.5, 0, 7); g.fill(); } }
    // 빅뱅 섬광 + 퍼지는 고리
    if (flash > 0.01) { g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(0, 0, w, h); for (let k = 0; k < 3; k++) { const R = (1 - flash) * Math.max(w, h) * (0.4 + k * 0.25); g.strokeStyle = `rgba(255,220,180,${flash * 0.8})`; g.lineWidth = 6 - k * 1.5; g.beginPath(); g.arc(w * 0.5, h * 0.5, R, 0, 7); g.stroke(); } }
    // 펭귄 타임머신(왼쪽 아래)
    this.timeMachine(w * 0.16, h * 0.78, f);
  }
  spiral(x, y, r, rot, a) { const g = this.g; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,240,220,${a * 0.9})`); gr.addColorStop(0.35, `rgba(200,180,255,${a * 0.35})`); gr.addColorStop(1, 'rgba(120,100,200,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 40; i++) { const u = i / 40; const th = rot + arm * Math.PI + u * 3.2; const rr = r * 0.15 + u * r * 1.05; const px = x + Math.cos(th) * rr, py = y + Math.sin(th) * rr * 0.55; g.fillStyle = `rgba(230,225,255,${a * (0.9 - u * 0.7)})`; g.beginPath(); g.arc(px, py, 1.2 + (1 - u) * 1.2, 0, 7); g.fill(); } }
  solarSystem(x, y, a, t) { const g = this.g; g.globalAlpha = a; const born = smooth(t, AGE - 4.7e9, AGE - 4.5e9);
    const sg = g.createRadialGradient(x, y, 0, x, y, 40); sg.addColorStop(0, '#fff6d0'); sg.addColorStop(0.3, '#ffcf5a'); sg.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = sg; g.beginPath(); g.arc(x, y, 40, 0, 7); g.fill();
    const planets = [{ r: 34, s: 4.1, c: '#c9b7a0', size: 2 }, { r: 48, s: 1.6, c: '#f0d9a0', size: 3.2 }, { r: 64, s: 1.0, c: '#5aa9ff', size: 3.4 }, { r: 82, s: 0.53, c: '#ff7a55', size: 2.6 }, { r: 120, s: 0.084, c: '#e6c59a', size: 8 }];
    for (const p of planets) { g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, p.r, p.r * 0.45, 0, 0, 7); g.stroke(); const th = this.frame * p.s * 0.8; const px = x + Math.cos(th) * p.r, py = y + Math.sin(th) * p.r * 0.45; g.fillStyle = p.c; g.beginPath(); g.arc(px, py, p.size * (0.4 + 0.6 * born), 0, 7); g.fill(); if (p.c === '#5aa9ff' && born < 0.999) { g.fillStyle = `rgba(255,120,60,${1 - born})`; g.beginPath(); g.arc(px, py, p.size, 0, 7); g.fill(); } }
    g.globalAlpha = 1; }
  earth(x, y, R, t) { const g = this.g; const gr = g.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R); gr.addColorStop(0, '#7fc2ff'); gr.addColorStop(0.6, '#1f6fd6'); gr.addColorStop(1, '#0b2a5c'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
    const img = this.earthImg; const green = smooth(t, AGE - 5e8, AGE - 4e8); // 육상 식물(약 4.7억 년 전) 이후 초록
    if (img.complete && img.naturalWidth) { g.save(); g.beginPath(); g.arc(x, y, R, 0, 7); g.clip(); const W = R * 2 * 3.14159; const off = (this.frame * 0.04 * W) % W; // 자전처럼 스크롤
      for (let k = -1; k <= 1; k++) g.drawImage(img, x - R - off + k * W, y - R, W, R * 2); if (green < 0.95) { g.fillStyle = `rgba(200,140,80,${0.55 * (1 - green)})`; g.fillRect(x - R, y - R, R * 2, R * 2); } // 초록 이전엔 갈색 돌 행성 느낌
      const sh = g.createRadialGradient(x - R * 0.4, y - R * 0.4, R * 0.2, x, y, R * 1.05); sh.addColorStop(0, 'rgba(255,255,255,0.12)'); sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,30,0.65)'); g.fillStyle = sh; g.fillRect(x - R, y - R, R * 2, R * 2); g.restore(); }
    else for (let i = 0; i < 9; i++) { const th = rnd(i + 50) * 6.28 + this.frame * 0.15, rr = rnd(i + 60) * R * 0.75; g.fillStyle = green > 0.05 ? `rgba(70,${150 + 60 * green},110,0.9)` : 'rgba(150,120,90,0.9)'; g.beginPath(); g.ellipse(x + Math.cos(th) * rr, y + Math.sin(th) * rr * 0.9, R * (0.12 + rnd(i + 70) * 0.16), R * (0.08 + rnd(i + 80) * 0.1), th, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(120,190,255,0.7)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, R + 3, 0, 7); g.stroke();
    // 시대 이모지(지구 위에서 콩콩)
    const em = t >= AGE - 20 ? '🐧' : t >= AGE - 600 ? '📖' : t >= AGE - 3e5 ? '🧑' : t >= AGE - 6.6e7 ? '☄️' : t >= AGE - 2.3e8 ? '🦕' : t >= AGE - 2.4e9 ? '🫧' : '🦠';
    g.font = `${Math.round(R * 0.7)}px serif`; g.textAlign = 'center'; g.fillText(em, x, y - R - 10 + Math.sin(this.frame * 4) * 5); }
  timeMachine(x, y, f) { const g = this.g; const bob = Math.sin(f * 2.2) * 4; const gr = g.createRadialGradient(x, y + bob, 10, x, y + bob, 58); gr.addColorStop(0, 'rgba(90,169,255,0.35)'); gr.addColorStop(1, 'rgba(90,169,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y + bob, 58, 0, 7); g.fill();
    g.strokeStyle = 'rgba(160,210,255,0.8)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.lineDashOffset = -f * 30; g.beginPath(); g.arc(x, y + bob, 44, 0, 7); g.stroke(); g.setLineDash([]);
    if (this.penguin.complete && this.penguin.naturalWidth) g.drawImage(this.penguin, x - 32, y + bob - 36, 64, 64); }
}
