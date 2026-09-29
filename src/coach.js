// 규칙 기반 코치 — 비용 0. 아이가 쓴 말의 낱말과 실험 결과에 반응해 되묻는다. 답은 주지 않는다.
// 해설은 별도(solution)로, 아이가 시도한 뒤에 사다리 순서로 연다.

const has = (t, ...ws) => ws.some((w) => t.includes(w));

/** 아이의 문장에 반응하는 되묻기. 우선순위: 개념 오해 → 뭉뚱그린 말 → 결과 연결 → 미션 기본 */
export function reply({ mission, result, text, turn }) {
  const t = (text || '').trim();
  const k = result?.kind;
  if (!t) return mission.coachRules(result);
  // 뭉뚱그린 말 → 정확한 말로
  if (has(t, '힘이 약', '힘이 세', '힘 때문', '힘이 없')) return '"힘"이라고 한 걸 "속력"이나 "중력" 둘 중 하나로 바꿔서 다시 말해 볼래?';
  if (has(t, '무게', '무거', '가벼')) return '위성의 무게가 달라지면 궤도가 바뀔까? 화면에서 잠긴 조건이 뭔지 봐 봐.';
  // 흔한 오개념
  if (has(t, '멈춘', '멈추', '멈출', '느려지', '느려져')) return '우주에서 위성을 느리게 만드는 건 뭘까? 공기가 있을까?';
  if (has(t, '중력이 없', '무중력', '중력 없')) return '위성이 도는 데 중력이 없다면 어느 방향으로 갈까? 직선? 곡선?';
  if (has(t, '연료', '엔진') && k === 'orbit') return '엔진은 꺼져 있었어. 그런데도 계속 돈 이유를 연료 말고 다른 두 낱말로 말해 볼래?';
  // 결과와 연결
  if (k === 'crash' && has(t, '빨', '속력', '속도')) return '맞아, 속력이 관련 있어. 그럼 떨어지지 않으려면 속력을 어느 쪽으로 바꿔야 할까?';
  if (k === 'escape' && has(t, '빨', '속력', '속도')) return '속력이 너무 컸지. 지구가 붙잡을 수 있는 한계 속력이 있을까? 슬라이더로 찾아볼래?';
  if (k === 'orbit' && has(t, '중력') && has(t, '속', '옆')) return '좋아! 중력과 옆으로 가는 속력, 둘 다 말했어. 둘 중 하나가 없어지면 어떻게 될지 카드에 써 볼래?';
  if (k === 'orbit' && has(t, '중력')) return '중력이 당기는데 왜 안 떨어질까? 위성이 어느 방향으로 움직이고 있는지 봐 봐.';
  if (k === 'orbit' && has(t, '속', '빨')) return '속력이 있어서 안 떨어졌다면, 왜 직선으로 날아가 버리지 않았을까?';
  if (k === 'short') return '가장 높은 곳이 달까지 못 갔어. 뭘 조금 바꾸면 더 높이 갈까?';
  if (k === 'overshoot') return '달 거리는 지났는데 달을 못 만났어. 달은 가만히 있을까?';
  if (k === 'arrive' && has(t, '세게', '많이', '빨리')) return '세게 밟으니 빨리 갔지. 대신 도착해서 뭐가 더 들었는지 관찰 문장을 다시 봐.';
  // 턴에 따라 다른 기본 되묻기
  const fallback = [mission.coachRules(result), '그렇게 생각한 근거를 화면에서 하나만 짚어 볼래?', '지금 말한 걸 카드의 「다시 설명」에 그대로 써 보자.'];
  return fallback[Math.min(turn ?? 0, fallback.length - 1)];
}

/** 해설 사다리: 되묻기 → 관찰 힌트 → 개념 힌트 → 해설. 시도 전에는 잠김 */
export function ladder(mission, result, state) {
  const steps = [
    { id: 'hint1', label: '어디를 볼까?', text: mission.hints?.[0] || '화면에서 궤도의 가장 낮은 곳과 높은 곳을 찾아 봐.', unlocked: state.experiments >= 1 },
    { id: 'hint2', label: '핵심 낱말', text: mission.hints?.[1] || '속력과 중력, 두 낱말로 설명해 봐.', unlocked: state.experiments >= 2 || state.turns >= 1 },
    { id: 'solution', label: '해설 열기', text: null, unlocked: state.experiments >= 1 && state.explained },
  ];
  return steps;
}

export async function askCoach({ mission, stage, result, text, turn }) {
  return { question: reply({ mission, result, text, turn }), source: 'rules' };
}
