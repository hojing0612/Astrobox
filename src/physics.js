// AstroBox 물리 엔진 — 2체·제한 3체(지구+달) 궤도 적분. 단위: km, s, km/s.
// 판정은 전부 이 파일의 결정적 계산으로 한다. LLM은 숫자를 만들지 않는다.

export const MU_EARTH = 398600.4418;   // km^3/s^2
export const R_EARTH = 6371.0;         // km (평균 반지름)
export const ATMO = 100.0;             // km — 카르만선. 근지점이 이 아래면 '추락'으로 판정
export const MU_MOON = 4902.8;         // km^3/s^2
export const D_MOON = 384400.0;        // km (평균 지구–달 거리)
export const R_MOON = 1737.4;          // km
export const MOON_SOI = 66100.0;       // km (달 영향권 반지름, 근사)
export const OMEGA_MOON = 2 * Math.PI / (27.321661 * 86400); // rad/s

export const circularSpeed = (r) => Math.sqrt(MU_EARTH / r);
export const escapeSpeed = (r) => Math.sqrt(2 * MU_EARTH / r);
export const period = (a) => 2 * Math.PI * Math.sqrt(a ** 3 / MU_EARTH);

/** 2체 궤도 요소 (r: 위치 벡터, v: 속도 벡터, 2D) */
export function elements(rx, ry, vx, vy, mu = MU_EARTH) {
  const r = Math.hypot(rx, ry), v = Math.hypot(vx, vy);
  const eps = v * v / 2 - mu / r;                 // 비에너지
  const h = rx * vy - ry * vx;                     // 비각운동량 (z)
  const ex = (v * v - mu / r) * rx / mu - (rx * vx + ry * vy) * vx / mu;
  const ey = (v * v - mu / r) * ry / mu - (rx * vx + ry * vy) * vy / mu;
  const e = Math.hypot(ex, ey);
  const a = eps < 0 ? -mu / (2 * eps) : Infinity;
  const p = h * h / mu;
  const rp = p / (1 + e);
  const ra = e < 1 ? p / (1 - e) : Infinity;
  return { r, v, eps, h, e, a, rp, ra, p };
}

/** 해석적 판정 (2체): 추락 / 궤도 / 이탈 */
export function classify(rx, ry, vx, vy, muScale = 1) {
  const el = elements(rx, ry, vx, vy, MU_EARTH * muScale);
  if (el.eps >= 0) return { kind: 'escape', el };
  if (el.rp < R_EARTH + ATMO) return { kind: 'crash', el };
  return { kind: 'orbit', el };
}

/** 가속도 (지구 + 선택적으로 달). moonAngle: 달의 공전 위상(rad) */
function accel(x, y, t, withMoon, muScale = 1) {
  const r3 = Math.pow(x * x + y * y, 1.5);
  const mu = MU_EARTH * muScale;
  let ax = -mu * x / r3, ay = -mu * y / r3;
  if (withMoon) {
    const th = OMEGA_MOON * t + withMoon.phase0;
    const mx = D_MOON * Math.cos(th), my = D_MOON * Math.sin(th);
    const dx = x - mx, dy = y - my;
    const d3 = Math.pow(dx * dx + dy * dy, 1.5);
    // 달의 인력 + 지구가 달에 끌려가는 간접항(지구 중심 좌표계)
    const dm3 = Math.pow(D_MOON, 3);
    ax += -MU_MOON * (dx / d3 + mx / dm3);
    ay += -MU_MOON * (dy / d3 + my / dm3);
  }
  return [ax, ay];
}

/** RK4 한 스텝 */
function rk4(s, t, dt, withMoon, muScale = 1) {
  const f = (st, tt) => { const [ax, ay] = accel(st[0], st[1], tt, withMoon, muScale); return [st[2], st[3], ax, ay]; };
  const k1 = f(s, t);
  const s2 = s.map((v, i) => v + dt / 2 * k1[i]); const k2 = f(s2, t + dt / 2);
  const s3 = s.map((v, i) => v + dt / 2 * k2[i]); const k3 = f(s3, t + dt / 2);
  const s4 = s.map((v, i) => v + dt * k3[i]);     const k4 = f(s4, t + dt);
  return s.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

/**
 * 궤적 적분. 적응 스텝(거리에 비례). 반환: 점 목록과 이벤트.
 * opts: { tMax, withMoon:{phase0}, maxPoints, stopOnCrash, stopOnMoon }
 */
export function propagate(x, y, vx, vy, opts = {}) {
  const tMax = opts.tMax ?? 6 * 3600;
  const withMoon = opts.withMoon ?? null; const muScale = opts.muScale ?? 1;
  const pts = [[x, y, vx, vy, 0]]; let s = [x, y, vx, vy]; let t = 0;
  let minR = Math.hypot(x, y), maxR = minR, minMoonD = Infinity, moonAt = null, revolutions = 0, lastAngle = Math.atan2(y, x), accum = 0;
  let crashed = false, reachedMoon = false;
  const maxPoints = opts.maxPoints ?? 4000;
  let stride = 0;
  while (t < tMax) {
    const r = Math.hypot(s[0], s[1]);
    // 스텝: 궤도 주기의 ~1/400 정도, 달 근처에선 더 촘촘히
    let dt = Math.max(1, Math.min(600, 0.0025 * 2 * Math.PI * Math.sqrt(r ** 3 / MU_EARTH)));
    if (withMoon) {
      const th = OMEGA_MOON * t + withMoon.phase0;
      const d = Math.hypot(s[0] - D_MOON * Math.cos(th), s[1] - D_MOON * Math.sin(th));
      if (d < MOON_SOI) dt = Math.min(dt, Math.max(2, 0.004 * 2 * Math.PI * Math.sqrt(d ** 3 / MU_MOON)));
      if (d < minMoonD) { minMoonD = d; moonAt = { t, x: s[0], y: s[1], vx: s[2], vy: s[3], mx: D_MOON * Math.cos(th), my: D_MOON * Math.sin(th) }; }
      if (d < R_MOON + 50) { reachedMoon = true; if (opts.stopOnMoon !== false) break; }
    }
    s = rk4(s, t, dt, withMoon, muScale); t += dt;
    const nr = Math.hypot(s[0], s[1]);
    if (nr < minR) minR = nr; if (nr > maxR) maxR = nr;
    const ang = Math.atan2(s[1], s[0]); let da = ang - lastAngle; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; accum += da; lastAngle = ang;
    revolutions = Math.abs(accum) / (2 * Math.PI);
    if (++stride % Math.max(1, Math.floor((tMax / dt) / maxPoints)) === 0) pts.push([s[0], s[1], s[2], s[3], t]);
    if (nr < R_EARTH + ATMO) { crashed = true; pts.push([s[0], s[1], s[2], s[3], t]); if (opts.stopOnCrash !== false) break; }
    if (nr > 3 * D_MOON) break; // 충분히 멀어짐
  }
  return { pts, t, minR, maxR, revolutions, crashed, reachedMoon, minMoonD, moonAt, final: s };
}

/** 미션1·2용: 고도 h에서 접선 속력 v로 출발 */
export function tangentialStart(h, v) { return { x: R_EARTH + h, y: 0, vx: 0, vy: v }; }

/** 호만 전이 Δv (r1→r2, 원궤도 기준) */
export function hohmann(r1, r2) {
  const a = (r1 + r2) / 2;
  const v1 = Math.sqrt(MU_EARTH / r1), v2 = Math.sqrt(MU_EARTH / r2);
  const vp = Math.sqrt(MU_EARTH * (2 / r1 - 1 / a)), va = Math.sqrt(MU_EARTH * (2 / r2 - 1 / a));
  return { dv1: vp - v1, dv2: v2 - va, total: vp - v1 + (v2 - va), tof: Math.PI * Math.sqrt(a ** 3 / MU_EARTH) };
}

/** 미션3 판정: 400 km 원궤도에서 Δv를 순간 가산 → 달 방향으로 비행.
 *  달의 위상은 '우주선이 달 거리에 처음 닿는 시각'에 달이 그 자리에 오도록 맞춘다(발사 창 가정). */
export function moonShot(dv, h = 400) {
  const r1 = R_EARTH + h;
  const v0 = circularSpeed(r1) + dv;
  const el = elements(r1, 0, 0, v0);
  // 1) 달 없이 예비 적분해 r = D_MOON 첫 통과 시각과 각도를 찾는다
  let phase0 = Math.PI, tCross = null;
  {
    let s = [r1, 0, 0, v0], t = 0;
    while (t < 8 * 86400) {
      const r = Math.hypot(s[0], s[1]);
      const dt = Math.max(2, Math.min(600, 0.0025 * 2 * Math.PI * Math.sqrt(r ** 3 / MU_EARTH)));
      s = rk4(s, t, dt, null); t += dt;
      const nr = Math.hypot(s[0], s[1]);
      if (nr >= D_MOON) { tCross = t; phase0 = Math.atan2(s[1], s[0]) - OMEGA_MOON * t; break; }
      if (nr < R_EARTH + ATMO || nr > 3 * D_MOON) break;
      if (el.eps < 0 && t > period(el.a)) break; // 한 바퀴 돌아도 못 닿으면 못 미침
    }
    if (tCross === null && el.eps < 0) { const tof = Math.PI * Math.sqrt(el.a ** 3 / MU_EARTH); phase0 = Math.PI - OMEGA_MOON * tof; }
  }
  const sim = propagate(r1, 0, 0, v0, { tMax: 8 * 86400, withMoon: { phase0 }, maxPoints: 6000, stopOnCrash: true });
  let kind;
  if (sim.reachedMoon || sim.minMoonD < MOON_SOI * 0.6) kind = 'arrive';        // 달 근처 도달(영향권 깊숙이 또는 충돌)
  else if (tCross === null) kind = 'short';                                   // 원지점이 달 거리에 못 미침
  else kind = 'overshoot';                                                     // 달 거리는 지났지만 달을 놓침/이탈
  // 달 기준 상대 속도(최근접 시점)와 100 km 달 궤도 진입에 필요한 제동 Δv
  let relSpeed = null, brakeDv = null;
  if (sim.moonAt) {
    const th = Math.atan2(sim.moonAt.my, sim.moonAt.mx);
    const mvx = -D_MOON * OMEGA_MOON * Math.sin(th), mvy = D_MOON * OMEGA_MOON * Math.cos(th);
    relSpeed = Math.hypot(sim.moonAt.vx - mvx, sim.moonAt.vy - mvy);
    const vcMoon = Math.sqrt(MU_MOON / (R_MOON + 100));
    brakeDv = Math.max(0, relSpeed - vcMoon);
  }
  const totalDv = kind === 'arrive' ? dv + brakeDv : null;
  return { kind, sim, el, v0, phase0, apogee: el.ra, tCross, minMoonD: sim.minMoonD, relSpeed, brakeDv, totalDv, tArrive: sim.moonAt ? sim.moonAt.t : null };
}

/** 미션1 판정 표 (UI 범례·근거용) */
export function speedThresholds(h = 400) {
  const r = R_EARTH + h;
  const vc = circularSpeed(r), ve = escapeSpeed(r);
  // 근지점이 카르만선에 닿는 접선 속력: rp = R+ATMO. 타원의 원지점이 r인 경우 v = sqrt(2 mu rp / (r (r+rp)))
  const rp = R_EARTH + ATMO;
  const vCrash = Math.sqrt(2 * MU_EARTH * rp / (r * (r + rp)));
  return { vCrash, vc, ve };
}

/** 자유 실험실: 고도 h, 속력 v, 발사각 deg(0 = 옆방향, +는 바깥쪽), 지구 질량 배수 */
export function freeStart(h, v, deg = 0) {
  const a = deg * Math.PI / 180; // 접선 방향(+y)에서 바깥(+x)으로 기울임
  return { x: R_EARTH + h, y: 0, vx: v * Math.sin(a), vy: v * Math.cos(a) };
}
