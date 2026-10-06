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
  question: '이 연료로 지구를 계속 돌 수 있을까요?',
  choices: [{ id: 'orbit', label: '계속 돌 거예요' }, { id: 'fail', label: '못 돌 거예요' }],
  coach: '높이 올라가기만 하면 계속 돌 수 있을까요? 가장 낮은 높이(근지점)와 옆으로 움직이는 속도를 함께 살펴봐요. 다음에는 연료량을 어떻게 바꿔 볼까요?',
  note: '나로호 모양을 참고한 교육용 근사 모형이에요. 실제 나로호의 제원·발사 기록과 달라요. 목표 고도는 약 200 km이고, 가장 낮은 높이가 100 km 이상인 지구 궤도를 성공으로 판정해요. 연료를 바꾸면 출발 질량도 함께 달라져요.',
};

// 비행 단계 안내는 계산에서 발생한 이벤트에만 반응해요.
export const ROCKET_MILESTONES = {
  count: '발사 준비! 카운트다운을 함께 세어 봐요.',
  ignition: '엔진에 불이 붙었어요!',
  liftoff: '출발! 높이와 속도가 어떻게 바뀌나요?',
  sep: '1단이 떨어졌어요! 가벼워진 로켓을 따라가요.',
  s2ign: '2단 엔진이 켜졌어요. 이제 옆으로도 빨라져요.',
  fairing: '위성을 감싸던 덮개가 열렸어요!',
  orbit: '엔진을 꺼도 지구 주위를 계속 돌아요!',
  fail: '연료를 다 썼어요. 예측과 결과를 비교해 봐요.',
  crash: '지표면에 닿았어요. 조건을 바꿔 다시 도전해요.',
};
export const ROCKET_OUTCOMES = { orbit: '지구를 계속 도는 궤도에 들어갔어요!', fail: '이번엔 궤도에 들어가지 못했어요.' };


// 별의 단계별 실제 관측 자료. 색은 관측 파장/영상 처리에 따라 달라요.
// 단계 설명: 무엇이 일어나고 왜 다음 모습으로 변하는지 차례대로 읽어요.
export const STAR_STAGE_DETAILS = {
  proto: ['우주에는 가스와 먼지가 모인 큰 구름이 있어요. 중력은 이 물질들을 서로 끌어당겨요. 한곳으로 모인 덩어리가 점점 작아지고 중심이 뜨거워지면, 아기 별인 원시별이 생겨요.', '아직은 중심에서 수소를 헬륨으로 바꾸는 핵융합이 안정적으로 일어나지 않아요. 주로 가스가 모이고 압축되면서 나온 에너지로 빛나요. 충분히 무겁고 뜨거워지면 다음 단계로 넘어가요.'],
  sun: ['별의 중심에서는 수소의 작은 원자핵들이 합쳐져 헬륨이 돼요. 이 반응을 핵융합이라고 해요. 이때 나오는 에너지가 별을 뜨겁게 하고 빛나게 해요. 나무나 기름을 태우는 불과는 다른 반응이에요.', '중력은 별을 안쪽으로 끌어당기고, 뜨거운 내부의 압력은 바깥쪽을 받쳐 줘요. 두 힘이 균형을 이루면 별은 오랫동안 비교적 안정된 크기로 지내요. 태양도 지금 이 단계에 있어요.', '무거운 별은 연료가 많아도 훨씬 빠르게 써서 수명이 짧아요. 가벼운 별은 천천히 써서 더 오래 살아요.'],
  giant: ['중심의 수소가 줄어들면, 중심은 중력 때문에 수축하고 더 뜨거워져요. 중심 둘레의 수소층에서는 핵융합이 이어져요. 내부 구조가 바뀌면서 별의 바깥층은 크게 부풀어요.', '바깥 표면은 넓어지고 온도가 낮아져 붉게 보여요. 그래서 적색거성이라고 불러요. 표면이 더 차가워져도 별 전체가 커져 밝기는 더 높아질 수 있어요. 태양도 먼 미래에 이 단계를 거쳐요.'],
  supergiant: ['무거운 별도 중심의 수소를 많이 쓰고 나면 바깥층이 크게 부풀 수 있어요. 이 거대한 별을 적색초거성이라고 해요. 베텔게우스가 실제 예예요.', '중심에서는 헬륨을 비롯한 여러 연료를 차례로 사용해 더 무거운 원소를 만들어요. 양파처럼 서로 다른 반응이 일어나는 층들이 생길 수 있어요. 결국 중심에 철이 쌓이면 핵융합으로 버틸 에너지를 얻기 어려워져요.'],
  sn: ['무거운 별의 중심이 더 이상 중력을 버틸 수 없으면 아주 빠르게 무너져요. 이 과정에서 충격파 등이 바깥층을 밀어 내며 거대한 폭발을 일으킬 수 있어요. 이것이 여기서 보는 초신성 폭발이에요.', '별이 잠깐 매우 밝아지고, 바깥층의 가스와 여러 원소가 우주로 퍼져요. 이 물질은 나중에 새로운 별과 행성의 재료가 될 수 있어요. 사진 속 게 성운은 폭발 순간이 아니라, 폭발 뒤에 퍼지고 있는 잔해예요.', '폭발 후 남은 중심핵은 질량에 따라 중성자별이나 블랙홀이 될 수 있어요. 이 화면은 대표 경로를 단순화한 모형이며, 실제 무거운 별이 모두 같은 방식으로 폭발하는 것은 아니에요.'],
  ns: ['초신성 뒤에 남은 중심핵이 매우 강하게 압축되면, 전자와 양성자가 결합해 중성자가 많이 생겨요. 이렇게 만들어진 아주 빽빽한 천체가 중성자별이에요.', '도시 정도의 작은 크기에 태양에 견줄 만큼 큰 질량이 모여 있어요. 빠르게 회전하며 빛줄기를 내보내는 경우도 있어요. 그 줄기가 지구 쪽을 지나갈 때마다 등대처럼 규칙적인 신호가 보이면 펄서라고 불러요.'],
  bh: ['남은 중심핵이 너무 무거우면, 중성자별처럼 버티지 못하고 더 무너질 수 있어요. 아주 작은 공간에 질량이 모이면 빛조차 빠져나오지 못하는 영역이 생겨요. 이것이 블랙홀이에요.', '블랙홀 자체에서 나온 빛을 찍는 것은 아니에요. 주변의 뜨거운 가스가 내는 빛이나 다른 천체의 움직임으로 그 존재를 알아내요. 사진의 밝은 고리는 주변 물질의 빛이고, 어두운 가운데는 블랙홀의 그림자예요.', '사진은 M87 은하 중심의 초대질량 블랙홀이에요. 여기서 키운 별의 최후에 생기는 블랙홀보다 훨씬 크지만, 실제로 관측한 블랙홀의 모습을 보여 주는 사례예요.'],
  ring: ['태양과 비슷한 별은 거성 단계를 거치며 바깥 가스층을 우주로 내보내요. 남은 뜨거운 중심핵의 빛이 이 가스를 빛나게 하면 행성상 성운이 보여요. 이름에 행성이 들어 있지만, 행성이 모인 것은 아니에요.', '가스가 퍼져 나가고 남은 중심핵은 백색왜성이 돼요. 사진의 고리 성운에서는 주변의 고리가 내보낸 가스이고, 가운데 작은 흰 점이 남은 백색왜성이에요.'],
  wd: ['별의 바깥층이 사라지고, 뜨겁고 빽빽한 중심핵만 남은 천체예요. 크기는 지구 정도지만 질량은 태양의 상당 부분에 해당해요. 그래서 같은 부피의 물질을 비교하면 매우 무거워요.', '새로운 핵융합으로 에너지를 계속 만들기보다는, 남아 있는 열을 내보내며 빛나요. 시간이 아주 오래 지나면 점점 식고 어두워져요. 사진 속 고리 성운의 가운데 작은 흰 점이 백색왜성이에요.'],
  brown: ['모인 가스의 질량이 너무 작으면 중심이 안정적인 수소 핵융합을 유지할 만큼 뜨거워지지 못해요. 이 모형에서는 태양 질량의 약 8%보다 가벼운 경우예요.', '이 천체를 갈색왜성이라고 불러요. 처음에는 만들어질 때 얻은 열 등으로 빛나지만 점차 식어요. 갈색왜성은 이름처럼 꼭 갈색으로 보이는 것은 아니며, 적외선 관측으로 찾기도 해요.'],
  small: ['아주 가벼운 주계열 별은 적색왜성이라고 불러요. 중심의 수소를 천천히 사용해 우주의 현재 나이보다 훨씬 오래 살 수 있어요.', '이런 별이 수명을 다한 모습은 아직 실제로 관측하지 못했어요. 이 모형에서 마지막에 나오는 백색왜성은 아주 먼 미래의 예측이에요. 태양처럼 적색거성과 행성상 성운을 거치는 경로와도 다를 수 있어요.'],
};
export const STAR_PHOTOS = {
  "proto": {
    "source": "https://science.nasa.gov/asset/webb/l1527-and-protostar-nircam-image/",
    "image": "https://assets.science.nasa.gov/content/dam/science/missions/webb/science/2022/11/STScI-01GGWD12YEES5K5163RJFYQT20.png/jcr:content/renditions/cq5dam.web.1280.1280.png",
    "caption": "원시별 L1527 · 적외선 관측",
    "credit": "NASA, ESA, CSA, STScI"
  },
  "giant": {
    "source": "https://science.nasa.gov/asset/hubble/red-giant-star-mira/",
    "image": "https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/1997/08/STScI-01EVVK9K351FBCZ25BSPPV7Y5F.tif/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
    "caption": "적색거성 미라 · 허블 관측",
    "credit": "Margarita Karovska (CfA), NASA"
  },
  "ring": {
    "source": "https://science.nasa.gov/asset/hubble/hubble-captures-a-ring/",
    "image": "https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/2013/05/STScI-01EVVCKCGPNSBA0SFGBZX5D2VR.tif/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
    "caption": "고리 성운 · 가운데 작은 점이 백색왜성이에요",
    "credit": "NASA, ESA, Hubble Heritage (STScI/AURA)-ESA/Hubble Collaboration"
  },
  "ns": {
    "source": "https://science.nasa.gov/asset/hubble/core-of-the-crab-nebula/",
    "image": "https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/2016/07/STScI-01EVVGSFPFDGVVEPD7BV4AJ9D6.tif/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
    "caption": "게 성운 중심 · 중심의 두 밝은 점 중 오른쪽이 중성자별이에요",
    "credit": "NASA, ESA; J. Hester (ASU), M. Weisskopf (NASA/MSFC)"
  },
  "sn": {
    "source": "https://www.nasa.gov/image-article/giant-mosaic-of-crab-nebula/",
    "image": "https://www.nasa.gov/wp-content/uploads/2023/03/138785main_image_feature_460_ys_full.jpg",
    "caption": "게 성운 · 폭발 순간이 아니라 초신성이 남긴 잔해예요",
    "credit": "NASA, ESA, J. Hester (ASU)"
  },
  "bh": {
    "source": "https://science.nasa.gov/resource/first-image-of-a-black-hole/",
    "image": "https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/b/blackhole_1600.jpg/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
    "caption": "M87 초대질량 블랙홀의 그림자 · 별의 최후로 생긴 블랙홀과는 크기가 다른 관측 사례예요",
    "credit": "Event Horizon Telescope Collaboration"
  },
  "sun": {
    "source": "https://science.nasa.gov/sun/",
    "image": "https://science.nasa.gov/wp-content/uploads/2023/05/pia03149-copy.jpg",
    "caption": "주계열 별의 예: 태양 · 관측 파장에 따라 색이 달라요",
    "credit": "NASA/JPL"
  },
  "supergiant": {
    "source": "https://science.nasa.gov/asset/hubble/hubble-space-telescope-captures-first-direct-image-of-a-star/",
    "image": "https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/1996/12/STScI-01EVTASFNAT35WSB0DW9XR49ZX.jpg/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
    "caption": "적색초거성 베텔게우스 · 자외선 관측과 크기 비교",
    "credit": "A. Dupree (CfA), R. Gilliland (STScI), NASA"
  },
  "brown": {
    "source": "https://science.nasa.gov/photojournal/brown-dwarfs-in-our-backyard/",
    "image": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia17/pia17992/PIA17992.jpg/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
    "caption": "갈색왜성 쌍 WISE J1049 · 적외선 관측",
    "credit": "NASA/JPL-Caltech/Gemini Observatory/AURA/NSF"
  }
};
