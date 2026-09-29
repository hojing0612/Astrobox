// 콘텐츠 뷰 — 별의 생애(질량 → 운명), 우주 타임라인. 실험이 아니라 '보는' 자료. 값은 교과서 수준 근사이며 화면에 근사 범위를 표시한다.
export const STAR_FATES = [
  { maxMass: 0.08, name: '갈색왜성', desc: '수소 핵융합을 시작하지 못한다', lifetime: null },
  { maxMass: 0.5, name: '적색왜성 → 백색왜성', desc: '아주 천천히 타서 우주 나이보다 오래 산다', },
  { maxMass: 8, name: '적색거성 → 행성상 성운 → 백색왜성', desc: '바깥층을 날려 보내고 핵만 남는다. 태양의 미래', },
  { maxMass: 20, name: '초거성 → 초신성 → 중성자별', desc: '철 핵이 무너지며 폭발. 무거운 원소를 우주에 뿌린다', },
  { maxMass: Infinity, name: '초거성 → 초신성 → 블랙홀', desc: '핵이 너무 무거워 중성자별로도 못 버틴다', },
];
/** 주계열 수명 근사: 10^10년 × M^-2.5 (태양 질량 단위). 교과서 근사식 */
export const lifetimeYears = (m) => m < 0.08 ? null : 1e10 * Math.pow(m, -2.5);
export function starFate(m) { const f = STAR_FATES.find((x) => m < x.maxMass); const L = lifetimeYears(m); const lum = Math.pow(m, 3.5); return { ...f, mass: m, lifetime: L, luminosity: lum }; }

// 우주 타임라인 (빅뱅 후 경과 시간, 년). 출처: 표준 우주론 교과서 값(근사)
export const TIMELINE = [
  { t: 0, label: '빅뱅', desc: '시간과 공간의 시작. 138억 년 전' },
  { t: 3e-6 / 3.15e7, label: '양성자·중성자 생성', desc: '빅뱅 후 백만 분의 몇 초' },
  { t: 3 * 60 / 3.15e7, label: '가벼운 원소 핵 합성', desc: '수소·헬륨 핵이 만들어짐 (약 3분)' },
  { t: 3.8e5, label: '우주가 투명해짐 (우주배경복사)', desc: '38만 년 — 빛이 자유롭게 퍼지기 시작' },
  { t: 1.5e8, label: '최초의 별 (종족 III)', desc: '약 1~2억 년 — 수소·헬륨만으로 된 거대한 별' },
  { t: 5e8, label: '초기 은하 형성', desc: '몇억 년 — 별들이 모여 은하가 됨' },
  { t: 9.2e9, label: '태양계 탄생', desc: '46억 년 전 — 초신성이 뿌린 원소로 태양과 지구가 만들어짐' },
  { t: 1.0e10, label: '지구에 생명', desc: '약 38억 년 전' },
  { t: 1.38e10, label: '지금', desc: '138억 년 — 우리가 별을 올려다보는 순간' },
];
