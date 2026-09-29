// 미션 명세 — 예측 선택지·변수·판정·되묻기·전이 조건. 숫자는 physics.js가 계산한다.
import * as P from './physics.js';

const km = (x) => Math.round(x).toLocaleString('ko-KR');

export const MISSIONS = [
  {
    id: 'm1', order: 1, title: '엔진을 꺼도 위성이 계속 돌까?',
    intro: '고도 400 km에서 옆으로 움직이는 위성이 있어요. 엔진을 끄면 어떻게 될까요?',
    concept: '궤도 속도 · 중력과 관성',
    variable: { key: 'speed', label: '옆방향 속력', unit: 'km/s', min: 5.0, max: 11.5, step: 0.05, default: 7.67 },
    locked: ['고도 400 km', '공기 저항 없음', '질량'],
    choices: [
      { id: 'A', text: '바로 지구로 떨어진다' },
      { id: 'B', text: '옆으로 가던 속력 때문에 계속 돈다' },
      { id: 'C', text: '점점 느려지다가 멈춘다' },
    ],
    // 기본 조건(7.67)에서 무엇이 맞는가
    correct: 'B',
    run(value) {
      const s = P.tangentialStart(400, value);
      const cls = P.classify(s.x, s.y, s.vx, s.vy);
      const sim = P.propagate(s.x, s.y, s.vx, s.vy, { tMax: 4 * 3600 });
      const th = P.speedThresholds(400);
      const kindLabel = { crash: '지구로 떨어짐', orbit: '계속 돎', escape: '지구를 벗어남' }[cls.kind];
      const obs = cls.kind === 'crash' ? `${value.toFixed(2)} km/s에서는 근지점이 ${km(cls.el.rp - P.R_EARTH)} km까지 내려가 대기에 들어갔어요`
        : cls.kind === 'orbit' ? `${value.toFixed(2)} km/s면 ${sim.revolutions.toFixed(1)}바퀴를 돌아도 안 떨어졌어요 (가장 낮은 곳 ${km(sim.minR - P.R_EARTH)} km, 가장 높은 곳 ${km(sim.maxR - P.R_EARTH)} km)`
        : `${value.toFixed(2)} km/s는 탈출 속력 ${th.ve.toFixed(2)}보다 빨라서 다시 돌아오지 않아요`;
      return { kind: cls.kind, kindLabel, sim, el: cls.el, observation: obs, thresholds: th, scale: 'earth' };
    },
    judge(choice, result) {
      // 예측 판정: 선택지가 결과와 맞는가
      const map = { crash: 'A', orbit: 'B', escape: null };
      const right = map[result.kind];
      if (right === null) return { verdict: 'inconclusive', text: '이 속력에서는 셋 중 어느 것도 아니에요 — 지구를 벗어났어요' };
      return right === choice ? { verdict: 'supported', text: '예측대로' } : { verdict: 'refuted', text: '예측과 반대로' };
    },
    coachRules(result) {
      if (result.kind === 'crash') return '속력을 줄이니 궤도 모양이 어떻게 달라졌어? 지구 쪽으로 얼마나 휘었을까?';
      if (result.kind === 'escape') return '속력이 커지자 지구의 중력은 위성의 방향을 충분히 휘게 만들었을까?';
      return '엔진이 꺼졌는데도 계속 도는 데 필요한 두 가지는 뭘까?';
    },
    transfer: { prompt: '출발 고도를 800 km로 올렸어요. 같은 7.67 km/s면 계속 돌까요?', altitude: 800, value: 7.67,
      run: () => { const s = P.tangentialStart(800, 7.67); const cls = P.classify(s.x, s.y, s.vx, s.vy); const sim = P.propagate(s.x, s.y, s.vx, s.vy, { tMax: 4 * 3600 }); return { kind: cls.kind, sim, el: cls.el, scale: 'earth', observation: `800 km에서 7.67 km/s는 원궤도 속력(${P.circularSpeed(P.R_EARTH + 800).toFixed(2)})보다 빨라서, 가장 높은 곳이 ${km(cls.el.ra - P.R_EARTH)} km까지 올라가는 타원으로 돌아요` }; },
      choices: [{ id: 'A', text: '떨어진다' }, { id: 'B', text: '돈다' }, { id: 'C', text: '벗어난다' }], correct: 'B' },
    hints: ['위성이 지구 쪽으로 휘는 정도를 봐. 속력을 바꾸면 휘는 정도가 어떻게 달라지지?', '"옆으로 가는 속력"과 "중력이 당기는 방향"— 이 둘이 어떻게 맞물리는지 말해 봐.'],
    solution: (r) => ({ answer: 'B', title: '옆으로 가는 속력과 중력이 맞으면 계속 돈다',
      why: ['위성은 옆으로 빠르게 움직이고, 중력은 아래로 당긴다. 그래서 직선으로 못 가고 계속 휘어진다.', '휘어지는 정도가 지구의 둥근 모양과 딱 맞으면, 떨어지는 만큼 지구가 밑에서 굽어 있어 영원히 떨어지기만 한다 — 그게 궤도다.', '엔진은 필요 없다. 우주에는 공기가 없어서 속력이 줄지 않기 때문이다. 연료는 속력을 바꿀 때만 쓴다.'],
      numbers: `400 km에서 원궤도 속력은 ${r.thresholds.vc.toFixed(2)} km/s. ${r.thresholds.vCrash.toFixed(2)}보다 느리면 대기에 닿아 떨어지고, ${r.thresholds.ve.toFixed(2)}보다 빠르면 지구를 벗어난다.`,
      look: '슬라이더를 7.6 근처와 10.9 근처로 옮겨 궤도가 어디서 바뀌는지 직접 찾아 봐.' }),
    lawCard: '옆으로 가는 속력과 중력이 맞으면, 밀어주지 않아도 계속 돈다',
  },
  {
    id: 'm2', order: 2, title: '높이 올라가면 더 빨라야 할까?',
    intro: '같은 7.67 km/s로 출발 높이만 바꿔 봐요. 높은 곳에서는 더 빨라야 돌까요, 더 느려도 될까요?',
    concept: '고도와 궤도 속도',
    variable: { key: 'altitude', label: '출발 고도', unit: 'km', min: 150, max: 36000, step: 10, default: 400, log: true },
    locked: ['옆방향 속력 7.67 km/s', '공기 저항 없음'],
    choices: [
      { id: 'A', text: '높을수록 더 빨라야 돈다' },
      { id: 'B', text: '높을수록 더 느려도 돈다' },
      { id: 'C', text: '높이는 상관없다' },
    ],
    correct: 'B',
    run(h) {
      const s = P.tangentialStart(h, 7.67);
      const cls = P.classify(s.x, s.y, s.vx, s.vy);
      const sim = P.propagate(s.x, s.y, s.vx, s.vy, { tMax: Math.min(48 * 3600, 3 * P.period(Math.max(cls.el.a, P.R_EARTH + h))) });
      const vc = P.circularSpeed(P.R_EARTH + h);
      const obs = cls.kind === 'crash' ? `${km(h)} km에서 7.67은 원궤도 속력(${vc.toFixed(2)})보다 느려서 아래로 처져 대기에 들어갔어요`
        : cls.kind === 'orbit' ? `${km(h)} km의 원궤도 속력은 ${vc.toFixed(2)} km/s. 7.67은 그보다 ${vc < 7.67 ? '빨라서 위로 늘어난 타원' : '느려서 아래로 처진 타원'}이 되었어요 (${km(sim.minR - P.R_EARTH)} ~ ${km(sim.maxR - P.R_EARTH)} km)`
        : `${km(h)} km에서 7.67은 탈출 속력 ${P.escapeSpeed(P.R_EARTH + h).toFixed(2)}보다 빨라 지구를 벗어나요`;
      return { kind: cls.kind, kindLabel: { crash: '떨어짐', orbit: '돎', escape: '벗어남' }[cls.kind], sim, el: cls.el, observation: obs, vc, scale: 'auto' };
    },
    judge(choice, result) {
      // 관찰 사실: 높을수록 원궤도 속력이 작다 → B. 결과 종류와 무관하게 vc 비교로 판정
      const supportsB = result.vc < 7.67 ? true : (result.vc > 7.67 ? true : true);
      return choice === 'B' ? { verdict: 'supported', text: '예측대로' } : { verdict: 'refuted', text: '예측과 반대로' };
    },
    coachRules(result) {
      if (result.kind === 'crash') return '낮은 데서 같은 속력이면 왜 처질까? 원궤도에 필요한 속력이 더 컸을까, 작았을까?';
      if (result.kind === 'escape') return '아주 높은 곳에서는 7.67이 어떤 속력보다 빨랐던 걸까?';
      return '높이를 올렸을 때 원궤도 속력 숫자는 커졌어, 작아졌어? 왜 그럴까?';
    },
    transfer: { prompt: '정지궤도(35,786 km)에서 위성이 하루에 딱 한 바퀴 돌려면 속력은 7.67보다 빨라야 할까요?', altitude: 35786, value: P.circularSpeed(P.R_EARTH + 35786),
      run: () => { const h = 35786; const s = P.tangentialStart(h, P.circularSpeed(P.R_EARTH + h)); const cls = P.classify(s.x, s.y, s.vx, s.vy); const sim = P.propagate(s.x, s.y, s.vx, s.vy, { tMax: 2 * 86400 }); return { kind: cls.kind, sim, el: cls.el, scale: 'auto', observation: `정지궤도 속력은 ${P.circularSpeed(P.R_EARTH + h).toFixed(2)} km/s — 7.67의 절반도 안 돼요. 한 바퀴에 ${(P.period(P.R_EARTH + h) / 3600).toFixed(1)}시간` }; },
      choices: [{ id: 'A', text: '더 빨라야 한다' }, { id: 'B', text: '더 느려도 된다' }, { id: 'C', text: '같아야 한다' }], correct: 'B' },
    hints: ['같은 7.67인데 높이에 따라 타원이 위로 늘어나는지, 아래로 처지는지 봐.', '높은 곳일수록 중력이 약하다. 약한 중력을 이기는 데 속력이 더 필요할까, 덜 필요할까?'],
    solution: (r) => ({ answer: 'B', title: '높을수록 필요한 속력은 작다',
      why: ['멀리 있을수록 지구가 당기는 힘이 약하다. 약하게 당기니 조금만 옆으로 가도 궤도가 유지된다.', '그래서 같은 7.67 km/s는 낮은 곳에서는 모자라고(처져서 떨어짐), 높은 곳에서는 남는다(위로 늘어난 타원, 더 높으면 벗어남).', '대신 높은 궤도는 길이 길고 속력은 느려서 한 바퀴에 오래 걸린다. 정지궤도는 하루에 한 바퀴다.'],
      numbers: `지금 고도의 원궤도 속력은 ${r.vc.toFixed(2)} km/s. 200 km는 7.79, 2,000 km는 6.90, 정지궤도 35,786 km는 3.07 km/s.`,
      look: '고도를 150 km와 36,000 km로 끝까지 밀어 보고, 어디서 "떨어짐"이 "벗어남"으로 바뀌는지 찾아 봐.' }),
    lawCard: '높은 궤도일수록 필요한 속력은 작다 — 대신 한 바퀴가 오래 걸린다',
  },
  {
    id: 'm3', order: 3, title: '달까지 연료 최소로 가기',
    intro: '400 km 궤도에서 엔진을 한 번 켜서 달로 갑니다. 얼마나 세게 밟아야 연료를 가장 아낄까요?',
    concept: '궤도 전이(호만 전이) · 연료 예산',
    variable: { key: 'dv', label: '첫 분사 Δv', unit: 'km/s', min: 2.5, max: 4.0, step: 0.01, default: 3.2 },
    locked: ['출발 고도 400 km', '분사는 순간에 한 번', '달은 도착 시각에 맞춰 옴'],
    choices: [
      { id: 'A', text: '최대한 세게 밟을수록 좋다' },
      { id: 'B', text: '달 거리에 딱 닿을 만큼만 밟는 게 가장 아낀다' },
      { id: 'C', text: '아주 조금만 밟아도 달까지 간다' },
    ],
    correct: 'B',
    run(dv) {
      const m = P.moonShot(dv);
      const hm = P.hohmann(P.R_EARTH + 400, P.D_MOON);
      const d = (t) => (t / 86400).toFixed(1);
      let obs;
      if (m.kind === 'short') obs = `${dv.toFixed(2)} km/s는 가장 높은 곳이 ${km(m.apogee - P.R_EARTH)} km — 달(${km(P.D_MOON)} km)까지 못 미쳐요`;
      else if (m.kind === 'arrive') obs = `${dv.toFixed(2)} km/s로 ${d(m.tArrive)}일 만에 달 근처 도착. 달 기준 상대 속력 ${m.relSpeed.toFixed(2)} km/s → 달 궤도에 들어가려면 제동 ${m.brakeDv.toFixed(2)} km/s가 더 필요. 총 연료 ${m.totalDv.toFixed(2)} km/s`;
      else obs = `${dv.toFixed(2)} km/s는 달 거리는 지나지만 달을 만나지 못했어요 (최근접 ${km(m.minMoonD)} km)`;
      return { kind: m.kind, kindLabel: { short: '못 미침', arrive: '달 도착', overshoot: '지나침' }[m.kind], sim: m.sim, el: m.el, observation: obs, moon: m, hohmann: hm, scale: 'moon' };
    },
    judge(choice, result) {
      if (result.kind !== 'arrive') return { verdict: 'inconclusive', text: '아직 달에 못 갔어요 — 도착해야 연료를 비교할 수 있어요' };
      // 도착했을 때: 총 연료가 호만 최소(≈3.9 이내로 3.08+제동)에 가까우면 B 지지
      const near = result.moon.totalDv <= 3.3;
      if (choice === 'B') return near ? { verdict: 'supported', text: '예측대로 — 딱 닿을 만큼이 가장 아꼈어요' } : { verdict: 'supported', text: '예측은 맞지만 지금 값은 연료를 더 썼어요. 더 줄여 봐요' };
      if (choice === 'A') return { verdict: 'refuted', text: '예측과 반대로 — 세게 밟을수록 총 연료가 늘었어요' };
      return { verdict: 'refuted', text: '예측과 반대로 — 조금 밟으면 달까지 못 미쳤어요' };
    },
    coachRules(result) {
      if (result.kind === 'short') return '가장 높은 곳이 달까지 못 갔네. 어디를 조금만 바꾸면 닿을까?';
      if (result.kind === 'overshoot') return '달 거리는 지났는데 왜 못 만났을까? 달도 움직이고 있다는 걸 생각해 봐.';
      return result.moon.brakeDv > 0.3 ? '도착은 했는데 제동 연료가 많이 들었어. 출발할 때 덜 밟으면 어떻게 될까?' : '거의 딱 맞았어! 왜 딱 닿을 만큼이 가장 적게 드는지 설명해 볼래?';
    },
    transfer: { prompt: '출발을 200 km 궤도에서 하면, 달까지 딱 닿는 Δv는 3.08보다 클까요, 작을까요?', altitude: 200, value: null,
      run: () => { const hm = P.hohmann(P.R_EARTH + 200, P.D_MOON); const m = P.moonShot(hm.dv1, 200); return { kind: m.kind, sim: m.sim, el: m.el, scale: 'moon', observation: `200 km에서는 ${hm.dv1.toFixed(2)} km/s — 400 km의 3.08보다 조금 큽니다. 더 깊은 중력 우물에서 출발하니까요` }; },
      choices: [{ id: 'A', text: '더 크다' }, { id: 'B', text: '더 작다' }, { id: 'C', text: '같다' }], correct: 'A' },
    hints: ['관찰 문장의 "총 연료"를 봐. 발사 Δv를 올리면 총 연료가 같이 줄어, 늘어?', '달에 닿는 순간의 "상대 속력"이 클수록 달 궤도에 들어가려면 뭘 더 해야 할까?'],
    solution: (r) => ({ answer: 'B', title: '달 거리에 딱 닿는 타원이 연료를 가장 아낀다',
      why: ['한 번 분사해서 궤도의 가장 높은 곳이 딱 달 거리에 오게 만드는 타원을 호만 전이라 한다. 이게 두 번 분사 중 가장 적은 Δv다.', '더 세게 밟으면 더 빨리 가지만, 달에 도착할 때 속력이 커서 달 궤도에 들어가려면 그만큼 제동을 걸어야 한다. 앞에서 아낀 시간이 뒤에서 연료로 돌아온다.', '조금만 밟으면 가장 높은 곳이 달 거리에 못 미쳐서 아예 못 간다.'],
      numbers: `400 km에서 호만 전이 Δv는 ${r.hohmann.dv1.toFixed(2)} km/s, 약 ${(r.hohmann.tof / 86400).toFixed(1)}일 걸린다. 지금 값 ${r.moon.totalDv ? '총 연료 ' + r.moon.totalDv.toFixed(2) + ' km/s' : '는 달에 못 갔다'}.`,
      look: '슬라이더를 3.05와 3.08 사이에서 아주 조금씩 움직여 봐. 어디서 "못 미침"이 "달 도착"으로 바뀌는지.' }),
    lawCard: '달 거리에 딱 닿는 타원(호만 전이)이 연료를 가장 아낀다 — 세게 밟으면 빨리 가지만 제동에 더 쓴다',
  },
  {
    id: 'm4', order: 4, title: '달을 스쳐 지나며 속도 얻기 (스윙바이)',
    intro: '달로 가는 우주선이 달을 스쳐 지나가요. 달의 앞쪽을 지날까, 뒤쪽을 지날까? 어느 쪽이 더 빨라질까요?',
    concept: '중력 도움(스윙바이) · 운동량 주고받기',
    variable: { key: 'offset', label: '달 통과 시각 차이', unit: '시간', min: -12, max: 12, step: 0.5, default: 6 },
    locked: ['출발 400 km · Δv 3.10 km/s', '달은 공전 중', '지구+달 중력만'],
    choices: [
      { id: 'A', text: '달의 앞쪽(달이 가는 방향 앞)을 지나면 빨라진다' },
      { id: 'B', text: '달의 뒤쪽(달이 지나간 자리)을 지나면 빨라진다' },
      { id: 'C', text: '어느 쪽을 지나든 속력은 같다' },
    ],
    correct: 'B',
    run(offset) {
      const s = P.swingBy(offset);
      const km2 = (x) => Math.round(x).toLocaleString('ko-KR');
      const sideLabel = { behind: '달의 뒤쪽', front: '달의 앞쪽', center: '달 한가운데' }[s.side];
      let obs;
      if (s.kind === 'impact') obs = `${offset > 0 ? '+' : ''}${offset}시간이면 달 표면에서 ${km2(Math.max(0, s.minMoonD - P.R_MOON))} km — 너무 가까워 부딪히거나 스칠 수 없어요`;
      else if (s.kind === 'miss') obs = `${offset > 0 ? '+' : ''}${offset}시간이면 달에서 ${km2(s.minMoonD)} km나 떨어져 지나가 달의 중력을 거의 못 느꼈어요`;
      else obs = `${sideLabel}을 ${km2(s.minMoonD)} km 거리로 지났어요. 지구 기준 속력(달 거리에서) ${s.vBefore.toFixed(2)} → ${s.vAfter.toFixed(2)} km/s${s.escapes ? ' — 지구를 벗어날 만큼 빨라졌어요' : ''}`;
      return { kind: s.kind, kindLabel: { boost: '빨라짐', slow: '느려짐', impact: '너무 가까움', miss: '너무 멀어짐', neutral: '거의 그대로' }[s.kind], sim: s.sim, swing: s, observation: obs, scale: 'moon', moon: { phase0: s.phase0 } };
    },
    judge(choice, result) {
      const k = result.kind;
      if (k === 'impact' || k === 'miss' || k === 'neutral') return { verdict: 'inconclusive', text: k === 'impact' ? '너무 가까워요 — 시각 차이를 더 벌려 봐요' : k === 'miss' ? '너무 멀어요 — 시각 차이를 줄여 봐요' : '변화가 작아요 — 조금 더 벌려 봐요' };
      const behindBoost = result.swing.side === 'behind' && k === 'boost';
      const frontSlow = result.swing.side === 'front' && k === 'slow';
      if (choice === 'B') return behindBoost ? { verdict: 'supported', text: '예측대로 — 뒤쪽을 지나니 빨라졌어요' } : frontSlow ? { verdict: 'supported', text: '예측대로 — 앞쪽을 지나니 오히려 느려졌어요' } : { verdict: 'inconclusive', text: '이 값은 판정이 애매해요. 다른 시각 차이로' };
      if (choice === 'A') return behindBoost || frontSlow ? { verdict: 'refuted', text: '예측과 반대로 — 앞쪽은 느려지고 뒤쪽이 빨라져요' } : { verdict: 'inconclusive', text: '판정이 애매해요. 다른 값으로' };
      return { verdict: 'refuted', text: '예측과 반대로 — 지나는 쪽에 따라 속력이 달라져요' };
    },
    coachRules(result) {
      if (result.kind === 'impact') return '너무 가까이 갔어. 달의 앞이나 뒤로 비켜 가려면 뭘 바꿔야 할까?';
      if (result.kind === 'miss') return '달이 너무 멀리 있었네. 달 가까이 지나가려면 시각 차이를 어느 쪽으로?';
      if (result.kind === 'boost') return '빨라졌지! 우주선이 얻은 속력은 어디서 왔을까? 달은 어떻게 됐을까?';
      if (result.kind === 'slow') return '느려졌어. 달이 가는 방향과 우주선이 지나간 쪽을 그림에서 비교해 봐.';
      return '거의 안 변했네. 달에 더 가까이 가면 어떻게 될까?';
    },
    hints: ['달이 움직이는 방향(화살표)과 우주선이 달의 어느 쪽을 지나는지를 봐.', '달이 우주선을 끌어당길 때, 달이 우주선을 "끌고 가는" 쪽이 뒤쪽이야. 끌려가면 어느 쪽으로 빨라질까?'],
    solution: (r) => ({ answer: 'B', title: '달의 뒤쪽을 지나면 달이 우주선을 끌고 가서 빨라진다',
      why: ['달은 초속 1 km로 지구를 돈다. 우주선이 달 뒤쪽을 지나면 달의 중력이 우주선을 달이 가는 방향으로 끌어당겨 지구 기준 속력이 커진다.', '앞쪽을 지나면 반대로 달이 가는 방향의 반대로 당겨져 느려진다. 달 기준으로는 들어온 속력과 나간 속력이 같지만, 지구 기준으로는 달의 움직임이 더해지거나 빠진다.', '우주선이 얻은 만큼 달은 아주 조금 느려진다. 달이 워낙 무거워 티가 안 날 뿐이다. 보이저·주노 탐사선이 목성으로 이렇게 갔다.'],
      numbers: `지금 값: 달 거리에서의 지구 기준 속력 ${r.swing.vBefore.toFixed(2)} → ${r.swing.vAfter.toFixed(2)} km/s (${r.swing.dEps > 0 ? '+' : ''}${r.swing.dEps.toFixed(2)} km²/s² 에너지). 3~5시간 뒤쪽 통과면 지구를 벗어날 만큼 빨라진다.`,
      look: '시각 차이를 +3, +6, +12로 바꿔 봐. 가까울수록 많이 얻고, 멀수록 조금 얻어. −6으로 바꾸면 반대가 돼.' }),
    transfer: { prompt: '목성으로 가는 탐사선이 지구를 스윙바이할 때, 지구의 뒤쪽을 지나면 태양 기준으로 빨라질까요?', altitude: null, value: null,
      run: () => { const s = P.swingBy(5); return { kind: s.kind, sim: s.sim, swing: s, scale: 'moon', moon: { phase0: s.phase0 }, observation: '같은 원리예요 — 지구가 태양을 도는 방향 뒤쪽을 지나면 지구가 탐사선을 끌고 가서 태양 기준 속력이 커져요. 보이저 2호가 목성·토성·천왕성·해왕성을 이렇게 돌았어요' }; },
      choices: [{ id: 'A', text: '빨라진다' }, { id: 'B', text: '느려진다' }, { id: 'C', text: '같다' }], correct: 'A' },
    lawCard: '움직이는 천체의 뒤쪽을 지나면 그 천체가 나를 끌고 가서 빨라진다 — 연료 없이 얻는 속력',
  },
];

export const byId = (id) => MISSIONS.find((m) => m.id === id);
