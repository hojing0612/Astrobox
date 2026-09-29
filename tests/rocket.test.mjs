import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim, ROCKET } from '../src/rocket-physics.js';
import { classify, speedThresholds, hohmann, R_EARTH, D_MOON } from '../src/physics.js';
function fly(scale) { const s = new Sim(); s.fuelScale = scale; s.reset(); s.launch(); while (!['ORBIT', 'FAIL', 'CRASH'].includes(s.phase) && s.t < 1200) s.step(.02); return s; }
test('기본 연료는 궤도 진입하며 단 분리와 페어링 분리를 거쳐요', () => {
  const s = fly(1); assert.equal(s.phase, 'ORBIT'); assert.ok(Math.abs(s.stats.rp / 1000 - 195.518) < .1); assert.ok(Math.abs(s.stats.ra / 1000 - 197.869) < .1);
  assert.deepEqual(s.events.filter(e => ['sep', 's2ign', 'fairing', 'orbit'].includes(e.type)).map(e => e.type), ['sep', 's2ign', 'fairing', 'orbit']);
});
test('모든 연료 눈금의 성공은 기존 궤도 판정과 일치해요', () => {
  for (let fuel = 20; fuel <= 100; fuel += 10) { const s = fly(fuel / 100); assert.ok(['ORBIT', 'FAIL', 'CRASH'].includes(s.phase)); if (s.phase === 'ORBIT') assert.equal(classify(s.x / 1000, s.y / 1000, s.vx / 1000, s.vy / 1000).kind, 'orbit', `fuel=${fuel}`); assert.equal(s.thrust, 0); }
});
test('연료 부족은 실패로 기록하고 리셋은 설정 연료를 복구해요', () => {
  const s = fly(.2); assert.equal(s.phase, 'FAIL'); assert.equal(s.fuel2, 0); s.reset(); assert.equal(s.phase, 'PRELAUNCH'); assert.equal(s.fuel2, ROCKET.s2.fuel * .2); assert.equal(s.bodies.length, 0); assert.equal(s.events.length, 0);
});
test('기존 400km 궤도·호만 전이 기준값을 유지해요', () => {
  const th = speedThresholds(400); assert.ok(Math.abs(th.vc - 7.673) < .001); assert.ok(Math.abs(th.ve - 10.851) < .001); assert.ok(Math.abs(th.vCrash - 7.585) < .001); const h = hohmann(R_EARTH + 400, D_MOON); assert.ok(Math.abs(h.dv1 - 3.084) < .001); assert.ok(Math.abs(h.dv2 - .829) < .001);
});
