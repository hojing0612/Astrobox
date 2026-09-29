// 3D 렌더러 — Three.js. 물리는 physics.js 그대로(궤도면 = XZ).
// 지구·달은 NASA 공개 이미지(Blue Marble 2004 · Black Marble 2016 · LRO LROC WAC)로 입힌다. 낮/밤 경계·도시 불빛·바다 반사는 셰이더.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import * as P from './physics.js';

const KM = 1 / 1000; // 1 단위 = 1,000 km
const SUN_DIR = new THREE.Vector3(-0.72, 0.28, 0.63).normalize(); // 햇빛 방향(월드 고정)

function flat(hex) { const c = document.createElement('canvas'); c.width = c.height = 4; const g = c.getContext('2d'); g.fillStyle = hex; g.fillRect(0, 0, 4, 4); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

const EARTH_VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position,1.0); vP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const EARTH_FS = `uniform sampler2D dayMap; uniform sampler2D nightMap; uniform vec3 sunDir; uniform float ready;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
// x^48 — pow(x, 48.0)를 쓰면 ANGLE(Metal·SwiftShader) 셰이더 컴파일러에서 지구가 검게 나온다(2026-09-29 확인). 곱셈으로 풀어 쓴다.
float p48(float x){ float x2 = x * x; float x4 = x2 * x2; float x8 = x4 * x4; float x16 = x8 * x8; float x32 = x16 * x16; return x32 * x16; }
void main(){
  vec3 N = normalize(vN); float cosA = dot(N, sunDir);
  float day = smoothstep(-0.10, 0.22, cosA);
  vec3 d = texture2D(dayMap, vUv).rgb; vec3 n = texture2D(nightMap, vUv).rgb;
  // 바다(파랑이 빨강보다 뚜렷이 큰 곳)만 햇빛 반사
  float ocean = smoothstep(0.05, 0.25, d.b - d.r) * (1.0 - smoothstep(0.35, 0.6, d.r));
  vec3 V = normalize(cameraPosition - vP); vec3 H = normalize(sunDir + V);
  float spec = clamp(p48(max(dot(N, H), 0.0)) * ocean * 0.45 * day, 0.0, 1.0);
  float twilight = smoothstep(-0.15, 0.05, cosA) * (1.0 - smoothstep(0.05, 0.3, cosA)); // 새벽·저녁 띠에 살짝 주황
  vec3 lit = d * (0.06 + 1.05 * day) + vec3(1.0, 0.55, 0.3) * twilight * 0.12 * d;
  vec3 lights = n * (1.0 - day) * 1.35;
  vec3 col = mix(d, lit + lights + vec3(spec), ready);
  col = clamp(col, 0.0, 8.0);
  // 톤매핑(ACES 근사) + sRGB 인코딩을 직접 한다 — three의 include 조합이 소프트웨어 GL(SwiftShader)에서 검게 나오는 문제 회피
  col *= 1.15; col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);
  col = pow(col, vec3(1.0 / 2.2));
  gl_FragColor = vec4(col, 1.0);
}`;

export class OrbitView3D {
  constructor(canvas) {
    this.c = canvas; this.result = null; this.simTime = 0; this.playing = false; this.speed = 60; this.rate = 1; this.vectors = true; this.onTick = null;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    const aniso = this.renderer.capabilities.getMaxAnisotropy();
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x03050b);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000); this.camera.position.set(0, 12, 20);
    this.controls = new OrbitControls(this.camera, canvas); this.controls.enableDamping = true; this.controls.dampingFactor = 0.08; this.controls.minDistance = 8; this.controls.maxDistance = 2500;
    // 빛: 태양 방향 하나 + 약한 환경광(달·구름·펭귄용)
    this.scene.add(new THREE.AmbientLight(0x8899bb, 0.22)); const sun = new THREE.DirectionalLight(0xfff4e0, 2.6); sun.position.copy(SUN_DIR).multiplyScalar(500); this.scene.add(sun); this.sun = sun;
    // 태양 후광(멀리 있는 스프라이트)
    this.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.makeGlowTex(), color: 0xfff1c8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })); this.sunGlow.position.copy(SUN_DIR).multiplyScalar(1900); this.sunGlow.scale.set(260, 260, 1); this.scene.add(this.sunGlow);
    // 별하늘
    const sg = new THREE.BufferGeometry(); const N = 3000; const pos = new Float32Array(N * 3); const col = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const r = 2000 + Math.random() * 500, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1); pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th); const w = 0.6 + Math.random() * 0.4, tint = Math.random(); col[i * 3] = w * (tint < 0.2 ? 1.0 : 0.9); col[i * 3 + 1] = w * 0.92; col[i * 3 + 2] = w * (tint > 0.8 ? 1.0 : 0.95); } sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ vertexColors: true, size: 3, sizeAttenuation: true, transparent: true, opacity: 0.9 })));
    // 텍스처(NASA) — 처음엔 단색, 로드되면 교체
    const loader = new THREE.TextureLoader();
    const load = (url, srgb, onDone) => { const t = loader.load(url, () => { t.anisotropy = aniso; t.needsUpdate = true; onDone && onDone(t); }); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
    const big = Math.min(window.innerWidth, window.innerHeight) * (window.devicePixelRatio || 1) > 1200;
    // 지구(낮/밤 셰이더) + 구름 + 대기
    const R = P.R_EARTH * KM;
    this.earthMat = new THREE.ShaderMaterial({ uniforms: { dayMap: { value: flat('#1f6fd6') }, nightMap: { value: flat('#000000') }, sunDir: { value: SUN_DIR.clone() }, ready: { value: 0 } }, vertexShader: EARTH_VS, fragmentShader: EARTH_FS });
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), this.earthMat); this.scene.add(this.earth);
    this.texLoaded = 0; const mark = () => { this.texLoaded++; if (this.texLoaded >= 2) this.earthMat.uniforms.ready.value = 1; };
    this.earthMat.uniforms.dayMap.value = load(big ? 'assets/tex/earth-day-4k.jpg' : 'assets/tex/earth-day-2k.jpg', true, mark);
    this.earthMat.uniforms.nightMap.value = load('assets/tex/earth-night-2k.jpg', true, mark);
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.010, 96, 72), new THREE.MeshLambertMaterial({ color: 0xffffff, alphaMap: load('assets/tex/clouds-2k.jpg', false), transparent: true, opacity: 0.95, depthWrite: false })); this.scene.add(this.clouds);
    const atmoMat = new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { c: { value: new THREE.Color(0x4f9dff) }, sunDir: { value: SUN_DIR.clone() } },
      vertexShader: 'varying vec3 vN; varying vec3 vP; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vW = normalize(mat3(modelMatrix) * normal); vP = (modelViewMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * vec4(vP,1.0); }',
      fragmentShader: 'uniform vec3 c; uniform vec3 sunDir; varying vec3 vN; varying vec3 vP; varying vec3 vW; void main(){ float f = pow(0.72 - dot(vN, normalize(-vP)), 2.6); float lit = 0.25 + 0.75 * smoothstep(-0.3, 0.3, dot(vW, sunDir)); gl_FragColor = vec4(c, clamp(f, 0.0, 1.0) * 0.9 * lit); }' });
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 64, 48), atmoMat); this.scene.add(this.atmo);
    // 카르만선(대기 경계) 얇은 링
    this.atmoRing = new THREE.Mesh(new THREE.RingGeometry((P.R_EARTH + P.ATMO) * KM - 0.01, (P.R_EARTH + P.ATMO) * KM + 0.01, 128), new THREE.MeshBasicMaterial({ color: 0x5aa9ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); this.atmoRing.rotation.x = -Math.PI / 2; this.scene.add(this.atmoRing);
    // 달(LRO 사진) + 달 궤도 링 + 중력권
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(P.R_MOON * KM * 2.2, 64, 48), new THREE.MeshStandardMaterial({ map: load('assets/tex/moon-2k.jpg', true), roughness: 0.95, metalness: 0 })); this.moon.visible = false; this.scene.add(this.moon);
    this.moonRing = new THREE.Mesh(new THREE.RingGeometry(P.D_MOON * KM - 1.2, P.D_MOON * KM + 1.2, 256), new THREE.MeshBasicMaterial({ color: 0xc7d2e5, transparent: true, opacity: 0.18, side: THREE.DoubleSide })); this.moonRing.rotation.x = -Math.PI / 2; this.moonRing.visible = false; this.scene.add(this.moonRing);
    this.soi = new THREE.Mesh(new THREE.SphereGeometry(P.MOON_SOI * KM, 24, 24), new THREE.MeshBasicMaterial({ color: 0xe5e7eb, wireframe: true, transparent: true, opacity: 0.08 })); this.soi.visible = false; this.scene.add(this.soi);
    // 궤적(전체 흐림 + 지나온 빛)
    this.matAll = new LineMaterial({ color: 0x91a0bd, linewidth: 1.5, transparent: true, opacity: 0.35, worldUnits: false }); this.matDone = new LineMaterial({ color: 0xff6237, linewidth: 4, worldUnits: false });
    this.pathAll = new Line2(new LineGeometry(), this.matAll); this.pathDone = new Line2(new LineGeometry(), this.matDone); this.scene.add(this.pathAll, this.pathDone);
    // 펭귄 우주선(스프라이트) + 반짝 후광
    const tex = loader.load('assets/penguin-256.png'); tex.colorSpace = THREE.SRGBColorSpace;
    this.ship = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })); this.scene.add(this.ship);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.makeGlowTex(), color: 0xff6237, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); this.scene.add(this.glow);
    this.vArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x46d49a, 0.35, 0.2); this.gArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x5aa9ff, 0.35, 0.2); this.scene.add(this.vArrow, this.gArrow);
    this.resize(); window.addEventListener('resize', () => this.resize());
    this.last = performance.now(); this.loop();
  }
  makeGlowTex() { if (this._glow) return this._glow; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); this._glow = new THREE.CanvasTexture(c); return this._glow; }
  resize() { const r = this.c.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); const pr = this.renderer.getPixelRatio(); this.matAll.resolution.set(w * pr, h * pr); this.matDone.resolution.set(w * pr, h * pr); }
  show(result, play = true) {
    this.result = result; this.simTime = 0; this.playing = play; this.speed = Math.max(30, result.sim.t / 12);
    const pts = result.sim.pts; const arr = []; for (let i = 0; i < pts.length; i++) arr.push(pts[i][0] * KM, 0, -pts[i][1] * KM);
    this.pathAll.geometry.dispose(); this.pathAll.geometry = new LineGeometry(); this.pathAll.geometry.setPositions(arr);
    this.pathDone.geometry.dispose(); this.pathDone.geometry = new LineGeometry(); this.pathDone.geometry.setPositions(arr); this.pathDone.geometry.instanceCount = 1; this.nSeg = pts.length - 1;
    const col = { crash: 0xff6b6b, orbit: 0xff6237, escape: 0x5aa9ff, short: 0xffb454, arrive: 0x46d49a, overshoot: 0x5aa9ff, boost: 0x46d49a, slow: 0xffb454, impact: 0xff6b6b, miss: 0x91a0bd, neutral: 0x91a0bd }[result.kind] || 0xff6237;
    this.matDone.color.setHex(col); this.glow.material.color.setHex(col);
    const moonScale = result.scale === 'moon'; this.moon.visible = this.moonRing.visible = this.soi.visible = moonScale;
    // 카메라 거리: 궤도 범위에 맞춤
    let m = 0; for (const p of pts) m = Math.max(m, Math.hypot(p[0], p[1])); const ext = moonScale ? P.D_MOON * 1.15 : Math.max(P.R_EARTH * 1.6, m * 1.15);
    const d = Math.min(2500, ext * KM * (moonScale ? 2.2 : 3.4)); this.camera.position.set(d * 0.3, d * 0.5, d * 0.85); this.controls.target.set(0, 0, 0); this.controls.minDistance = Math.max(8, ext * KM * 0.3);
    const sc = Math.max(0.9, ext * KM * 0.06); this.ship.scale.set(sc, sc, 1); this.glow.scale.set(sc * 2.2, sc * 2.2, 1); const al = ext * KM * 0.14; this.arrowLen = al;
    const es = moonScale ? 3.5 : 1; this.earth.scale.setScalar(es); this.clouds.scale.setScalar(es); this.atmo.scale.setScalar(es); this.atmoRing.visible = !moonScale;
    if (!play) this.draw();
  }
  play() { this.playing = true; } pause() { this.playing = false; } toggle() { this.playing = !this.playing; return this.playing; } setRate(r) { this.rate = r; }
  stateAt(t) { const pts = this.result.sim.pts; let lo = 0, hi = pts.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid][4] <= t) lo = mid; else hi = mid; } const a = pts[lo], b = pts[hi]; const f = b[4] > a[4] ? Math.min(1, Math.max(0, (t - a[4]) / (b[4] - a[4]))) : 0; return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, vx: a[2] + (b[2] - a[2]) * f, vy: a[3] + (b[3] - a[3]) * f, idx: lo }; }
  loop() { requestAnimationFrame(() => this.loop()); const now = performance.now(); const dt = (now - this.last) / 1000; this.last = now; this.earth.rotation.y += dt * 0.04; this.clouds.rotation.y += dt * 0.055; this.moon.rotation.y += dt * 0.01; if (this.result && this.playing) { this.simTime += dt * this.speed * this.rate; const total = this.result.sim.t; if (this.simTime > total) this.simTime = (this.result.kind === 'orbit' && !this.result.sim.crashed) ? this.simTime % total : total; } this.draw(); }
  draw() {
    this.controls.update();
    if (this.result) {
      const st = this.stateAt(this.simTime); const x = st.x * KM, z = -st.y * KM;
      this.ship.position.set(x, 0.001, z); this.glow.position.copy(this.ship.position); this.glow.material.opacity = 0.35 + 0.2 * Math.sin(performance.now() / 180);
      this.pathDone.geometry.instanceCount = Math.max(1, Math.min(this.nSeg, st.idx));
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
