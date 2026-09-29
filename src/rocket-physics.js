import { classify } from './physics.js';
// 제공받은 로켓 데모의 SI 단위 물리 모형. 나로호의 실제 제원을 재현하지 않는 교육용 근사예요.
const C = {
  GM: 3.986004418e14, R: 6371000, g0: 9.80665, rho0: 1.225, H: 8500,
  targetAlt: 200e3, fairingAlt: 110e3, padHeight: 4,
};
const ROCKET = {
  payload: 4000, fairing: 1500,
  s1: { dry: 20000, fuel: 116000, thrust: 6.0e6, isp: 290, cd: 0.45, area: 6.6, length: 22 },
  s2: { dry: 4500,  fuel: 90000,  thrust: 1.4e6, isp: 440, cd: 0.45, area: 6.6, length: 11 },
  radius: 1.45,
  // 유도 프로그램 (NASA/표준 중력 턴)
  verticalUntil: 10,   // 수직 상승 [s]
  kickEnd: 20,         // 피치 킥 종료 [s]
  kickAngle: 14,       // 피치 킥 각 [deg] — 이후 받음각 0으로 속도벡터 추종
  slewRate: 2.0,       // 2단 피치 변화율 한계 [deg/s]
  maxPitch: 95,        // 수평 아래 5°까지만 허용 [deg]
  gain: 0.1, s2IgnitionDelay: 2.0,
};
const PHASE_NAMES = { PRELAUNCH: '발사 대기', COUNTDOWN: '카운트다운', IGNITION: '엔진 점화', S1_BURN: '1단 연소', SEP: '1단 분리', S2_COAST: '2단 점화 대기', S2_BURN: '2단 연소', ORBIT: '궤도 비행', FAIL: '궤도 진입 실패', CRASH: '충돌' };

function airDensity(h) { return h < 0 ? C.rho0 : C.rho0 * Math.exp(-h / C.H); }
function airTemp(h) {
  if (h < 11000) return 288.15 - 0.0065 * h; if (h < 20000) return 216.65; if (h < 32000) return 216.65 + 0.001 * (h - 20000);
  if (h < 47000) return 228.65 + 0.0028 * (h - 32000); if (h < 51000) return 270.65; if (h < 71000) return 270.65 - 0.0028 * (h - 51000);
  if (h < 86000) return 214.65 - 0.002 * (h - 71000); return 186.9;
}
function speedOfSound(h) { return Math.sqrt(1.4 * 287.05 * airTemp(h)); }

class Body { // 분리된 단·페어링의 탄도 비행
  constructor(x, y, vx, vy, mass, cd, area, spin) { Object.assign(this, { x, y, vx, vy, mass, cd, area, spin, angle: 0, age: 0, dead: false, z: 0, vz: 0, q: 0, alt: 0, vr: 0 }); }
  step(dt) {
    const r = Math.hypot(this.x, this.y), h = r - C.R, g = C.GM / (r * r);
    const v = Math.hypot(this.vx, this.vy), rho = airDensity(h);
    let ax = -g * this.x / r, ay = -g * this.y / r;
    if (v > 0) { const fd = 0.5 * rho * v * v * this.cd * this.area / this.mass; ax -= fd * this.vx / v; ay -= fd * this.vy / v; }
    this.vx += ax * dt; this.vy += ay * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
    this.angle += this.spin * dt; this.age += dt; this.q = 0.5 * rho * v * v; this.alt = h; this.vr = (this.vx * this.x + this.vy * this.y) / r;
    if (h < 0) this.dead = true;
  }
}

class Sim {
  constructor() { this.fuelScale = 1; this.reset(); }
  reset() {
    this.t = -6; this.phase = 'PRELAUNCH';
    this.x = 0; this.y = C.R + C.padHeight; this.vx = 0; this.vy = 0;
    this.stage = 1; this.fuel1 = ROCKET.s1.fuel; this.fuel2 = ROCKET.s2.fuel * this.fuelScale; this.fairingOn = true;
    this.thrust = 0; this.pitch = 0; this.dirx = 0; this.diry = 1; this.accel = 0; this.q = 0; this.mach = 0; this.maxQ = 0; this.gamma = Math.PI / 2;
    this.sepTime = null; this.secoTime = null; this.av = null; this.hold = false; this.prevPitch = null;
    this.bodies = []; this.events = []; this.trail = []; this.trailTimer = 0;
    this.stats = { rp: NaN, ra: NaN, period: NaN }; this.released = false;
  }
  get alt() { return Math.hypot(this.x, this.y) - C.R; }
  get speed() { return Math.hypot(this.vx, this.vy); }
  get downrange() { return C.R * Math.atan2(Math.abs(this.x), this.y); }
  get mass() { let m = ROCKET.payload + (this.fairingOn ? ROCKET.fairing : 0) + ROCKET.s2.dry + this.fuel2; if (this.stage === 1) m += ROCKET.s1.dry + this.fuel1; return m; }
  get fuelFrac() { return this.stage === 1 ? this.fuel1 / ROCKET.s1.fuel : this.fuel2 / ROCKET.s2.fuel; }
  emit(type, text) { this.events.push({ type, text, t: this.t }); }
  launch() { if (this.phase === 'PRELAUNCH') { this.t = -6; this.phase = 'COUNTDOWN'; this.emit('count', '카운트다운 시작'); } }

  step(dt) {
    if (this.phase === 'PRELAUNCH') return;
    this.t += dt;
    if (this.t < 0) { if (this.t >= -3 && this.phase === 'COUNTDOWN') { this.phase = 'IGNITION'; this.thrust = ROCKET.s1.thrust; this.emit('ignition', '1단 엔진 점화 · 추력 상승'); } return; }
    if (!this.released) { this.released = true; this.phase = 'S1_BURN'; this.emit('liftoff', '리프트오프! 발사대 이탈'); }
    if (this.phase === 'FAIL' || this.phase === 'CRASH') { for (const b of this.bodies) b.step(dt); return; }

    const r = Math.hypot(this.x, this.y), h = r - C.R;
    const ux = this.x / r, uy = this.y / r, tx = -uy, ty = ux;
    const vr = this.vx * ux + this.vy * uy, vt = this.vx * tx + this.vy * ty;
    const g = C.GM / (r * r), rho = airDensity(h), v = this.speed;
    let mass = this.mass, thrust = 0, isp, cd, area;
    if (this.stage === 1) { thrust = this.fuel1 > 0 ? ROCKET.s1.thrust : 0; isp = ROCKET.s1.isp; cd = ROCKET.s1.cd; area = ROCKET.s1.area; }
    else { thrust = (this.phase === 'S2_BURN' && this.fuel2 > 0) ? ROCKET.s2.thrust : 0; isp = ROCKET.s2.isp; cd = ROCKET.s2.cd; area = ROCKET.s2.area; }

    // ---- 유도: 피치각(수직 기준) ----
    let pitch;
    const D2R = Math.PI / 180;
    if (this.stage === 1) {
      if (this.t < ROCKET.verticalUntil) pitch = 0;
      else if (this.t < ROCKET.kickEnd) pitch = ROCKET.kickAngle * D2R * (this.t - ROCKET.verticalUntil) / (ROCKET.kickEnd - ROCKET.verticalUntil);
      else pitch = v > 1 ? Math.atan2(vt, vr) : 0; // 중력 턴: 받음각 0 (속도벡터 추종)
      this.prevPitch = pitch;
    } else if (this.phase === 'S2_BURN' || this.phase === 'S2_COAST') {
      const aT = ROCKET.s2.thrust / mass;
      if (this.av === null) this.av = Math.max(0.5, vr * vr / (2 * Math.max(1000, C.targetAlt - h)));
      const geff = g - vt * vt / r;
      let vrDes = h < C.targetAlt ? Math.sqrt(2 * this.av * (C.targetAlt - h)) : 0;
      if (this.hold) vrDes = 0;
      const aRad = geff + (vrDes - vr) * ROCKET.gain;
      const s = Math.max(-0.6, Math.min(1, aRad / aT));
      pitch = Math.min(ROCKET.maxPitch * D2R, Math.acos(s));
      const maxD = ROCKET.slewRate * D2R * dt; // 피치 변화율 제한
      if (this.prevPitch !== null) pitch = Math.max(this.prevPitch - maxD, Math.min(this.prevPitch + maxD, pitch));
      this.prevPitch = pitch;
    } else pitch = this.pitch;
    if (this.phase === 'ORBIT' && v > 1) { this.dirx = this.vx / v; this.diry = this.vy / v; }
    else { this.dirx = ux * Math.cos(pitch) + tx * Math.sin(pitch); this.diry = uy * Math.cos(pitch) + ty * Math.sin(pitch); }
    this.pitch = pitch; this.gamma = v > 1 ? Math.atan2(vr, vt) : Math.PI / 2;

    // ---- 힘 ----
    let ax = -g * ux, ay = -g * uy;
    if (thrust > 0) { ax += thrust / mass * this.dirx; ay += thrust / mass * this.diry; }
    if (v > 0 && rho > 1e-12) { const fd = 0.5 * rho * v * v * cd * area / mass; ax -= fd * this.vx / v; ay -= fd * this.vy / v; }
    this.accel = Math.hypot(ax + g * ux, ay + g * uy);
    this.vx += ax * dt; this.vy += ay * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    this.thrust = thrust;
    this.q = 0.5 * rho * v * v; if (this.q > this.maxQ) this.maxQ = this.q;
    this.mach = h < 90000 ? v / speedOfSound(h) : NaN;
    if (thrust > 0) { const mdot = thrust / (isp * C.g0); if (this.stage === 1) this.fuel1 = Math.max(0, this.fuel1 - mdot * dt); else this.fuel2 = Math.max(0, this.fuel2 - mdot * dt); }

    // ---- 궤도 요소 ----
    const r2 = Math.hypot(this.x, this.y), v2 = this.vx * this.vx + this.vy * this.vy;
    const eps = v2 / 2 - C.GM / r2, a = -C.GM / (2 * eps);
    const hh = this.x * this.vy - this.y * this.vx;
    const e = Math.sqrt(Math.max(0, 1 + 2 * eps * hh * hh / (C.GM * C.GM)));
    const rp = a * (1 - e), ra = a * (1 + e);
    this.stats.rp = eps < 0 ? rp - C.R : NaN; this.stats.ra = eps < 0 ? ra - C.R : NaN;
    this.stats.period = eps < 0 ? 2 * Math.PI * Math.sqrt(a * a * a / C.GM) : NaN;
    this.stats.a = a; this.stats.e = e; this.stats.eps = eps;

    // ---- 단계 전환 ----
    if (this.stage === 1 && this.fuel1 <= 0) {
      this.stage = 2; this.phase = 'SEP'; this.sepTime = this.t;
      const b = new Body(this.x - this.dirx * 2, this.y - this.diry * 2, this.vx - this.dirx * 3, this.vy - this.diry * 3, ROCKET.s1.dry, 1.1, 8, 0.35);
      b.kind = 's1'; this.bodies.push(b);
      this.x += this.dirx * ROCKET.s1.length; this.y += this.diry * ROCKET.s1.length;
      this.emit('meco', '1단 연소 종료 (MECO)'); this.emit('sep', '1단 분리 · 1단 낙하 시작');
    }
    if (this.phase === 'SEP' && this.t > this.sepTime + 0.6) this.phase = 'S2_COAST';
    if (this.phase === 'S2_COAST' && this.t > this.sepTime + ROCKET.s2IgnitionDelay) { this.phase = 'S2_BURN'; this.emit('s2ign', '2단 엔진 점화'); }
    if (this.fairingOn && this.stage === 2 && h > C.fairingAlt) {
      this.fairingOn = false;
      for (const side of [-1, 1]) {
        const b = new Body(this.x + this.dirx * ROCKET.s2.length * 0.5, this.y + this.diry * ROCKET.s2.length * 0.5, this.vx - this.dirx * 1.5, this.vy - this.diry * 1.5, 750, 1.0, 6, side * 0.5);
        b.kind = 'fairing'; b.side = side; b.vz = side * 4; this.bodies.push(b);
      }
      this.emit('fairing', '페어링 분리 (고도 110 km)');
    }
    if (this.phase === 'S2_BURN') {
      if (ra - C.R > C.targetAlt - 2000) this.hold = true;
      if (a - C.R >= h && h > C.targetAlt - 40000 && classify(this.x / 1000, this.y / 1000, this.vx / 1000, this.vy / 1000).kind === 'orbit') {
        this.phase = 'ORBIT'; this.thrust = 0; this.secoTime = this.t;
        this.emit('seco', '2단 연소 종료 (SECO)');
        this.emit('orbit', `궤도 진입 성공 · ${(this.stats.rp / 1000).toFixed(0)} × ${(this.stats.ra / 1000).toFixed(0)} km`);
      } else if (this.fuel2 <= 0) { this.phase = 'FAIL'; this.thrust = 0; this.emit('fail', '연료 소진 · 궤도 진입 실패'); }
    }
    if (h < 0 && this.t > 5) { this.phase = 'CRASH'; this.thrust = 0; this.emit('crash', '지표면 충돌'); }

    for (const b of this.bodies) { if (!b.dead) { b.step(dt); if (b.dead && b.kind === 's1') this.emit('s1down', '1단 해상 낙하'); } }
    this.bodies = this.bodies.filter(b => !b.dead && b.age < 900);
    this.trailTimer += dt;
    if (this.trailTimer > 1.0) { this.trailTimer = 0; this.trail.push(this.x, this.y); if (this.trail.length > 6000) this.trail.splice(0, 2); }
  }
}


export { C, ROCKET, PHASE_NAMES, airDensity, airTemp, speedOfSound, Body, Sim };
