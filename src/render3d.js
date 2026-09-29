// 3D 렌더러 — Three.js. 물리는 physics.js 그대로(궤도면 = XZ). 지구·달·별하늘·펭귄 우주선·빛나는 궤적·화살표·카메라 회전.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as P from './physics.js';

const KM = 1 / 1000; // 1 단위 = 1,000 km
function makeEarthTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#1f6fd6'; g.fillRect(0, 0, c.width, c.height);
  // 대륙: 겹친 원들로 만드는 귀여운 스타일(실제 지도 아님)
  const rnd = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
  for (let i = 0; i < 70; i++) { const x = rnd(i) * c.width, y = 80 + rnd(i + 7) * (c.height - 160), r = 20 + rnd(i + 3) * 70; g.fillStyle = i % 3 ? '#4fb37a' : '#3c9a68'; g.beginPath(); g.ellipse(x, y, r * 1.4, r, rnd(i + 11) * 3, 0, 7); g.fill(); }
  g.fillStyle = '#eef6ff'; g.fillRect(0, 0, c.width, 30); g.fillRect(0, c.height - 30, c.width, 30);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeCloudTexture() { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); const rnd = (i) => ((Math.sin(i * 78.233) * 43758.5453) % 1 + 1) % 1; for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.35 + rnd(i) * 0.4})`; g.beginPath(); g.ellipse(rnd(i + 1) * c.width, rnd(i + 2) * c.height, 8 + rnd(i + 3) * 40, 5 + rnd(i + 4) * 14, 0, 0, 7); g.fill(); } return new THREE.CanvasTexture(c); }
function makeMoonTexture() { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#c9c9cf'; g.fillRect(0, 0, c.width, c.height); const rnd = (i) => ((Math.sin(i * 45.1) * 43758.5453) % 1 + 1) % 1; for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(90,90,100,${0.2 + rnd(i) * 0.4})`; g.beginPath(); g.arc(rnd(i + 1) * c.width, rnd(i + 2) * c.height, 3 + rnd(i + 3) * 14, 0, 7); g.fill(); } return new THREE.CanvasTexture(c); }

export class OrbitView3D {
  constructor(canvas) {
    this.c = canvas; this.result = null; this.simTime = 0; this.playing = false; this.speed = 60; this.rate = 1; this.vectors = true; this.onTick = null;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x05080f);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000); this.camera.position.set(0, 12, 20);
    this.controls = new OrbitControls(this.camera, canvas); this.controls.enableDamping = true; this.controls.dampingFactor = 0.08; this.controls.minDistance = 8; this.controls.maxDistance = 2500;
    // 빛
    this.scene.add(new THREE.AmbientLight(0x8899bb, 0.7)); const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-60, 30, 40); this.scene.add(sun); this.sun = sun;
    // 별하늘
    const sg = new THREE.BufferGeometry(); const N = 2500; const pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const r = 2000 + Math.random() * 500, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1); pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th); } sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe7ff, size: 3, sizeAttenuation: true, transparent: true, opacity: 0.9 })));
    // 지구 + 구름 + 대기
    const R = P.R_EARTH * KM;
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), new THREE.MeshPhongMaterial({ map: makeEarthTexture(), shininess: 18, specular: new THREE.Color(0x335577) })); this.scene.add(this.earth);
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 48, 48), new THREE.MeshPhongMaterial({ map: makeCloudTexture(), transparent: true, opacity: 0.85, depthWrite: false })); this.scene.add(this.clouds);
    const atmoMat = new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { c: { value: new THREE.Color(0x5aa9ff) } },
      vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vP = (modelViewMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * vec4(vP,1.0); }',
      fragmentShader: 'uniform vec3 c; varying vec3 vN; varying vec3 vP; void main(){ float f = pow(0.72 - dot(vN, normalize(-vP)), 2.6); gl_FragColor = vec4(c, clamp(f, 0.0, 1.0) * 0.9); }' });
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 48, 48), atmoMat); this.scene.add(this.atmo);
    // 카르만선(대기 경계) 얇은 링
    this.atmoRing = new THREE.Mesh(new THREE.RingGeometry((P.R_EARTH + P.ATMO) * KM - 0.01, (P.R_EARTH + P.ATMO) * KM + 0.01, 128), new THREE.MeshBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); this.atmoRing.rotation.x = -Math.PI / 2; this.scene.add(this.atmoRing);
    // 달 + 달 궤도 링
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(P.R_MOON * KM * 2.2, 32, 32), new THREE.MeshPhongMaterial({ map: makeMoonTexture() })); this.moon.visible = false; this.scene.add(this.moon);
    this.moonRing = new THREE.Mesh(new THREE.RingGeometry(P.D_MOON * KM - 1.2, P.D_MOON * KM + 1.2, 256), new THREE.MeshBasicMaterial({ color: 0xc7d2e5, transparent: true, opacity: 0.18, side: THREE.DoubleSide })); this.moonRing.rotation.x = -Math.PI / 2; this.moonRing.visible = false; this.scene.add(this.moonRing);
    this.soi = new THREE.Mesh(new THREE.SphereGeometry(P.MOON_SOI * KM, 24, 24), new THREE.MeshBasicMaterial({ color: 0xe5e7eb, wireframe: true, transparent: true, opacity: 0.08 })); this.soi.visible = false; this.scene.add(this.soi);
    // 궤적(전체 흐림 + 지나온 빛)
    this.pathAll = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x91a0bd, transparent: true, opacity: 0.25 })); this.scene.add(this.pathAll);
    this.pathDone = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff6237, linewidth: 2 })); this.scene.add(this.pathDone);
    // 펭귄 우주선(스프라이트) + 반짝 후광
    const tex = new THREE.TextureLoader().load('assets/penguin-256.png'); tex.colorSpace = THREE.SRGBColorSpace;
    this.ship = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })); this.scene.add(this.ship);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff6237, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending })); this.scene.add(this.glow);
    this.vArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x46d49a, 0.35, 0.2); this.gArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x5aa9ff, 0.35, 0.2); this.scene.add(this.vArrow, this.gArrow);
    this.resize(); window.addEventListener('resize', () => this.resize());
    this.last = performance.now(); this.loop();
  }
  resize() { const r = this.c.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  show(result, play = true) {
    this.result = result; this.simTime = 0; this.playing = play; this.speed = Math.max(30, result.sim.t / 12);
    const pts = result.sim.pts; const arr = new Float32Array(pts.length * 3); for (let i = 0; i < pts.length; i++) { arr[i * 3] = pts[i][0] * KM; arr[i * 3 + 1] = 0; arr[i * 3 + 2] = -pts[i][1] * KM; }
    this.pathAll.geometry.dispose(); this.pathAll.geometry = new THREE.BufferGeometry(); this.pathAll.geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.doneArr = new Float32Array(arr); this.pathDone.geometry.dispose(); this.pathDone.geometry = new THREE.BufferGeometry(); this.pathDone.geometry.setAttribute('position', new THREE.BufferAttribute(this.doneArr, 3)); this.pathDone.geometry.setDrawRange(0, 1);
    const col = { crash: 0xff6b6b, orbit: 0xff6237, escape: 0x5aa9ff, short: 0xffb454, arrive: 0x46d49a, overshoot: 0x5aa9ff, boost: 0x46d49a, slow: 0xffb454, impact: 0xff6b6b, miss: 0x91a0bd, neutral: 0x91a0bd }[result.kind] || 0xff6237;
    this.pathDone.material.color.setHex(col); this.glow.material.color.setHex(col);
    const moonScale = result.scale === 'moon'; this.moon.visible = this.moonRing.visible = this.soi.visible = moonScale;
    // 카메라 거리: 궤도 범위에 맞춤
    let m = 0; for (const p of pts) m = Math.max(m, Math.hypot(p[0], p[1])); const ext = moonScale ? P.D_MOON * 1.15 : Math.max(P.R_EARTH * 1.6, m * 1.15); if (result.kind === 'escape') { /* 그대로 */ }
    const d = Math.min(2500, ext * KM * 2.2); this.camera.position.set(d * 0.35, d * 0.55, d * 0.8); this.controls.target.set(0, 0, 0); this.controls.minDistance = Math.max(8, ext * KM * 0.3);
    const sc = Math.max(0.9, ext * KM * 0.06); this.ship.scale.set(sc, sc, 1); this.glow.scale.set(sc * 1.9, sc * 1.9, 1); const al = ext * KM * 0.14; this.arrowLen = al;
    const es = moonScale ? 3.5 : 1; this.earth.scale.setScalar(es); this.clouds.scale.setScalar(es); this.atmo.scale.setScalar(es); this.atmoRing.visible = !moonScale;
    if (!play) this.draw();
  }
  play() { this.playing = true; } pause() { this.playing = false; } toggle() { this.playing = !this.playing; return this.playing; } setRate(r) { this.rate = r; }
  stateAt(t) { const pts = this.result.sim.pts; let lo = 0, hi = pts.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid][4] <= t) lo = mid; else hi = mid; } const a = pts[lo], b = pts[hi]; const f = b[4] > a[4] ? Math.min(1, Math.max(0, (t - a[4]) / (b[4] - a[4]))) : 0; return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, vx: a[2] + (b[2] - a[2]) * f, vy: a[3] + (b[3] - a[3]) * f, idx: lo }; }
  loop() { requestAnimationFrame(() => this.loop()); const now = performance.now(); const dt = (now - this.last) / 1000; this.last = now; this.earth.rotation.y += dt * 0.05; this.clouds.rotation.y += dt * 0.07; if (this.result && this.playing) { this.simTime += dt * this.speed * this.rate; const total = this.result.sim.t; if (this.simTime > total) this.simTime = (this.result.kind === 'orbit' && !this.result.sim.crashed) ? this.simTime % total : total; } this.draw(); }
  draw() {
    this.controls.update();
    if (this.result) {
      const st = this.stateAt(this.simTime); const x = st.x * KM, z = -st.y * KM;
      this.ship.position.set(x, 0.001, z); this.glow.position.copy(this.ship.position); this.glow.material.opacity = 0.25 + 0.15 * Math.sin(performance.now() / 180);
      this.pathDone.geometry.setDrawRange(0, Math.max(2, st.idx + 1));
      if (this.result.scale === 'moon' && this.result.moon) { const th = P.OMEGA_MOON * this.simTime + this.result.moon.phase0; this.moon.position.set(P.D_MOON * KM * Math.cos(th), 0, -P.D_MOON * KM * Math.sin(th)); this.soi.position.copy(this.moon.position); }
      const vm = Math.hypot(st.vx, st.vy) || 1; const r = Math.hypot(st.x, st.y) || 1; const gm = (this.result.muScale || 1) * P.MU_EARTH / (r * r); const g0 = P.MU_EARTH / 6771 ** 2;
      this.vArrow.visible = this.gArrow.visible = this.vectors;
      this.vArrow.position.copy(this.ship.position); this.vArrow.setDirection(new THREE.Vector3(st.vx / vm, 0, -st.vy / vm)); this.vArrow.setLength(this.arrowLen * Math.min(1.6, vm / 7.67), this.arrowLen * 0.25, this.arrowLen * 0.15);
      this.gArrow.position.copy(this.ship.position); this.gArrow.setDirection(new THREE.Vector3(-st.x / r, 0, st.y / r)); this.gArrow.setLength(this.arrowLen * 0.8 * Math.min(1.6, gm / g0), this.arrowLen * 0.25, this.arrowLen * 0.15);
      if (this.onTick) this.onTick(this.simTime, st);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
