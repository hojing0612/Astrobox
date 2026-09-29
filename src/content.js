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

// ---- 놀이용 추가 데이터 (2026-09-29 v1.5) — 값은 교과서·NASA 공개 자료 수준의 근사. 화면에 '근사' 표시
export const AGE = 1.38e10;
/** 아이 눈높이 이정표 (t = 빅뱅 후 경과 년). 지구 이후 사건은 '몇 년 전'을 빼서 계산 */
export const KID_EVENTS = [
  { t: 0, label: '빅뱅', emoji: '💥', desc: '시간과 공간의 시작', bubble: '앗 뜨거! 여긴 빛도 못 빠져나가요' },
  { t: 3 * 60 / 3.15e7, label: '원소 만들기 3분', emoji: '⚛️', desc: '수소·헬륨 핵이 만들어졌어요', bubble: '3분 만에 우주 재료 준비 끝!' },
  { t: 3.8e5, label: '우주가 맑아짐', emoji: '🌫️', desc: '38만 년 — 빛이 처음으로 자유롭게 퍼져요', bubble: '안개가 걷혔어요. 이 빛이 지금도 우주배경복사로 남아 있어요' },
  { t: 1.5e8, label: '최초의 별', emoji: '✨', desc: '약 1~2억 년 — 수소·헬륨만으로 된 거대한 별', bubble: '첫 별이 켜졌어요! 태양보다 수십 배 무거워요' },
  { t: 5e8, label: '은하 탄생', emoji: '🌌', desc: '별들이 모여 은하가 돼요', bubble: '별들이 소용돌이로 모여요' },
  { t: AGE - 4.6e9, label: '태양계 탄생', emoji: '☀️', desc: '46억 년 전 — 초신성이 뿌린 재료로 태양과 지구가 생겨요', bubble: '우리 집이 생겼어요. 지구는 처음엔 불덩이!' },
  { t: AGE - 3.8e9, label: '지구에 생명', emoji: '🦠', desc: '약 38억 년 전 — 아주 작은 생명', bubble: '눈에 안 보이는 아주 작은 생명이에요' },
  { t: AGE - 2.4e9, label: '산소가 많아짐', emoji: '🫧', desc: '약 24억 년 전 — 바다의 미생물이 산소를 뿜어요', bubble: '우리가 숨 쉬는 산소는 여기서 왔어요' },
  { t: AGE - 2.3e8, label: '공룡 시대', emoji: '🦕', desc: '2.3억 년 전 시작', bubble: '공룡이 1억 6천만 년이나 살았어요' },
  { t: AGE - 6.6e7, label: '공룡 멸종', emoji: '☄️', desc: '6,600만 년 전 — 소행성 충돌', bubble: '우주가 1년이면 이게 12월 30일이에요' },
  { t: AGE - 3e5, label: '사람(호모 사피엔스)', emoji: '🧑', desc: '약 30만 년 전', bubble: '사람은 마지막 12분에 나타났어요' },
  { t: AGE - 583, label: '한글 만들어짐', emoji: '📖', desc: '1443년, 세종대왕', bubble: '한글은 마지막 1.3초!' },
  { t: AGE - 10, label: '10살 어린이', emoji: '🐧', desc: '10년 전', bubble: '너는 마지막 0.02초에 태어났어' },
  { t: AGE, label: '지금', emoji: '🔭', desc: '138억 년 — 별을 올려다보는 순간', bubble: '지금이에요. 별빛은 과거에서 오는 편지예요' },
];
/** 우주 달력: 138억 년을 1년으로 압축 (칼 세이건). 반환 { month, day, h, m, s, text } */
export function cosmicCalendar(t) {
  const secYear = 365 * 86400; const sec = Math.max(0, Math.min(1, t / AGE)) * secYear; const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let d = Math.floor(sec / 86400); if (d >= 365) d = 364; let month = 0; while (d >= days[month]) { d -= days[month]; month++; }
  const rem = sec - Math.floor(sec / 86400) * 86400; const h = Math.floor(rem / 3600), m = Math.floor((rem % 3600) / 60), s = rem % 60;
  const ampm = h < 12 ? '오전' : h < 18 ? '오후' : '밤'; const hh = h % 12 === 0 ? 12 : h % 12;
  const before = (AGE - t) / (AGE / secYear); // 자정까지 남은 초
  const text = before < 60 ? `12월 31일 밤 11시 59분 · 자정 ${before < 1 ? before.toFixed(2) : before.toFixed(1)}초 전` : t >= AGE - 1e6 ? `12월 31일 밤 11시 ${m}분 ${Math.floor(s)}초` : `${month + 1}월 ${d + 1}일 ${ampm} ${hh}시 ${m}분`;
  return { month: month + 1, day: d + 1, h, m, s, text, before };
}
/** 타임라인 퀴즈 — 판정은 코드 */
export const TIME_QUIZ = [
  { q: '우주 138억 년을 1년으로 줄이면, 사람은 언제 나타났을까?', choices: ['6월쯤', '12월 초', '12월 31일 밤 11시 48분'], correct: 2, why: '30만 년 전은 1년 달력에서 마지막 12분이에요. 우주 역사 대부분엔 사람이 없었어요' },
  { q: '빅뱅 뒤 빛이 자유롭게 퍼지기까지 얼마나 걸렸을까?', choices: ['3분', '38만 년', '10억 년'], correct: 1, why: '38만 년 동안 우주는 뜨거운 안개였어요. 그때 풀려난 빛이 지금도 우주배경복사로 보여요' },
  { q: '태양은 우주 나이의 얼마쯤 살았을까?', choices: ['거의 처음부터', '3분의 1쯤', '100분의 1쯤'], correct: 1, why: '46억 년 ÷ 138억 년 ≈ 1/3. 태양보다 먼저 살다 죽은 별들이 태양의 재료를 만들었어요' },
];
/** 유명한 별 (질량은 태양 = 1, 널리 쓰이는 근사값) */
export const FAMOUS_STARS = [
  { name: '프록시마', mass: 0.12, note: '태양에서 가장 가까운 별' }, { name: '태양', mass: 1, note: '우리 별' }, { name: '시리우스', mass: 2.1, note: '밤하늘에서 가장 밝은 별' },
  { name: '폴라리스', mass: 5.4, note: '북극성' }, { name: '안타레스', mass: 12, note: '전갈자리 붉은 심장' }, { name: '베텔게우스', mass: 17, note: '오리온자리 어깨, 곧(?) 초신성' }, { name: '리겔', mass: 21, note: '오리온자리 푸른 발' }, { name: '에타 카리나', mass: 100, note: '가장 무거운 별 중 하나' },
];
export const FATE_CHOICES = [
  { id: 'none', label: '불이 안 붙는다 (갈색왜성)' }, { id: 'wd', label: '바깥층 날리고 백색왜성' }, { id: 'ns', label: '초신성 → 중성자별' }, { id: 'bh', label: '초신성 → 블랙홀' },
];
export const fateId = (m) => m < 0.08 ? 'none' : m < 8 ? 'wd' : m < 20 ? 'ns' : 'bh';
/** 슬라이더 눈금: 이정표 사이를 같은 폭으로(구간 안은 로그 보간). 로그 눈금은 뜨거운 안개 구간이 70%를 차지해 지루하다 */
const KNOTS = KID_EVENTS.map((e) => Math.max(e.t, 1e-8));
export function sliderT(s) { s = Math.max(0, Math.min(1, s)); if (s <= 0) return 0; const n = KNOTS.length - 1; const k = Math.min(n - 1, Math.floor(s * n)); const u = s * n - k; const a = Math.log(KNOTS[k]), b = Math.log(KNOTS[k + 1]); return Math.exp(a + (b - a) * u); }
export function sliderS(t) { if (t <= 1e-8) return 0; const n = KNOTS.length - 1; let k = 0; while (k < n - 1 && t >= KNOTS[k + 1]) k++; const a = Math.log(KNOTS[k]), b = Math.log(KNOTS[k + 1]); return Math.max(0, Math.min(1, (k + (Math.log(t) - a) / (b - a)) / n)); }

// 로켓 탐구 — 모형의 조건·선택지·되묻기 문구
export const ROCKET_ACTIVITY = {
  id: 'rocket', title: '로켓 발사 탐구',
  question: '2단 연료를 바꾸면 지구를 계속 돌 수 있을까요?',
  choices: [{ id: 'orbit', label: '궤도에 들어갈 거예요' }, { id: 'fail', label: '궤도에 못 들어갈 거예요' }],
  coach: '높이 올라가기만 하면 계속 돌 수 있을까요? 가장 낮은 높이(근지점)와 옆으로 움직이는 속도를 함께 살펴봐요. 다음에는 연료량을 어떻게 바꿔 볼까요?',
  note: '나로호 모양을 참고한 교육용 근사 모형이에요. 실제 나로호의 제원·발사 기록과 달라요. 목표 고도는 약 200 km이고, 가장 낮은 높이가 100 km 이상인 지구 궤도를 성공으로 판정해요. 연료를 바꾸면 출발 질량도 함께 달라져요.',
};
