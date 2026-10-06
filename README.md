# AstroBox — AI 우주 탐구

예측하고, 조건 하나만 바꿔 실험하고, 코드가 판정하고, 코치가 되묻고, 아이가 자기 말로 설명하는 우주 탐구 서비스.

## 실행
- 정적 파일이라 서버 하나면 됩니다: `python3 -m http.server 8080` → http://localhost:8080
- ES 모듈을 쓰므로 `file://`로 직접 열면 동작하지 않습니다.
- Vercel: `main` 푸시 시 자동 배포. 코치는 브라우저 안의 규칙 엔진(API 키·비용 없음).
- 계정·서버 저장(선택): Vercel 환경변수 `DATABASE_URL`(Neon Postgres, 무료 티어)과 `SESSION_SECRET`을 넣으면 `/api/auth`·`/api/sync`가 켜집니다. 없으면 503을 돌려 주고 앱은 이 브라우저 저장만으로 동작합니다.
- 로컬 개발: `npm install` 후 `DATABASE_URL=... SESSION_SECRET=... node dev.js` (정적 + /api).

## 구조
```
index.html        앱 셸(해시 라우팅)
styles.css
src/physics.js    2체·제한 3체(지구+달) RK4 적분, 궤도 요소, 판정, 호만 전이 — 숫자는 전부 여기서
src/missions.js   미션 3개 명세(예측 선택지·변수·판정·되묻기 규칙·전이 문제·법칙 카드)
src/render.js     Canvas 라이브 시뮬레이션(재생·배속, 속력·중력 화살표, 경로, 달·영향권, 실제 축척)
src/coach.js      규칙 기반 코치(낱말 반응 되묻기) + 해설 사다리(힌트→힌트→해설, 시도 뒤에 열림)
src/store.js      localStorage 기록(실험·판정·코치·전이·카드) + 리포트 집계
src/content.js    별의 생애·우주 타임라인 데이터(근사 명시)
src/app.js        화면: 홈 · 미션 · 자유 실험실 · 부모 리포트 · 계정 · 별의 생애 · 타임라인
src/account.js    가족 계정(코드 6자리 + PIN 4자리, 이메일·실명 없음)
src/store.js      localStorage 기록 + 로그인 시 서버 병합(client_id로 중복 방지)
api/auth.js       가족 코드 생성·로그인(scrypt PIN 해시, HMAC 토큰 180일)
api/sync.js       이벤트·카드 병합 저장·조회
api/_db.js        Neon 연결 + `astrobox` 스키마 자동 생성
dev.js            로컬 개발 서버
```

## 미션
| # | 제목 | 변수 | 판정 |
|---|---|---|---|
| 1 | 엔진을 꺼도 위성이 계속 돌까? | 옆방향 속력 5~11.5 km/s (고도 400 km) | 근지점 < 카르만선 → 떨어짐 / 에너지 ≥ 0 → 벗어남 / 그 외 돎 |
| 2 | 높이 올라가면 더 빨라야 할까? | 출발 고도 150~36,000 km (속력 7.67 고정) | 같은 판정 + 원궤도 속력 비교 |
| 3 | 달까지 연료 최소로 가기 | 첫 분사 Δv 2.5~4.0 km/s | 못 미침 / 달 도착(도착 시간·상대 속력·제동 Δv·총 연료) / 지나침 |
| 4 | 달을 스쳐 지나며 속도 얻기(스윙바이) | 달 통과 시각 차이 −12~+12 h | 뒤쪽 통과 → 빨라짐 / 앞쪽 → 느려짐 / 너무 가까움 / 너무 멂 (지구 기준 에너지 변화) |

기준값(코드 계산): 400 km 원궤도 7.673 km/s · 탈출 10.851 · 추락 문턱 7.585 · 달까지 호만 Δv 3.084 + 제동 (≈5일).

## PhET 「중력과 궤도」와 다른 점
PhET는 자유 조작·벡터·경로는 있지만 목표·판정·해설이 없다. AstroBox는 미션(예측→실험→판정)과 **해설 사다리**(되묻기 → 관찰 힌트 → 개념 힌트 → 해설, 단 시도한 뒤에만 열림)로 '막혔을 때 갈 곳'을 준다. 자유 실험실은 PhET처럼 발사각·속력·고도·질량을 마음대로 바꾸되 관찰 문장을 코드가 써 준다.

## 원칙
- 판정은 코드, 코치는 되묻기만. 해설은 아이가 시도한 뒤에 연다.
- 리포트는 아이가 쓴 문장과 판정 로그만 근거. 아이 화면에 가격·타이머·반복 재촉 없음, 결제는 부모 화면에서만.
- 모형의 근사(공기 저항 없음, 별 진화 경계값 등)는 화면에 표시.

## 이미지 출처

- 지구 낮: NASA Visible Earth, Blue Marble Next Generation (2004-12, topo+bathy) — `assets/tex/earth-day-*.jpg`
- 지구 밤(도시 불빛): NASA Earth Observatory, Black Marble 2016 — `assets/tex/earth-night-2k.jpg`
- 구름: NASA Visible Earth 구름 합성 — `assets/tex/clouds-2k.jpg`
- 달: NASA SVS CGI Moon Kit, LRO LROC WAC 컬러 모자이크 — `assets/tex/moon-2k.jpg`

NASA 이미지는 공개 자료(저작권 없음)이지만 NASA 로고·보증 표현은 쓰지 않는다. 원본은 각각 5400×2700 / 3600×1800 / 2048×1024 / 2048×1024이며 웹용으로 4K·2K로 줄였다(총 2.1MB). 낮/밤 경계·도시 불빛·바다 반사는 `src/render3d.js`의 셰이더가 만든다.

## 로켓 발사 탐구 (`#rocket`)

홈의 「로켓 발사 탐구」 또는 상단 「로켓 발사」에서 시작합니다. 2단 초기 연료(20~100%, 10% 간격)를 정하고 궤도 진입 여부를 예측한 뒤 발사합니다. 카운트다운·1단 분리·2단 점화·페어링 분리·궤도 진입을 관찰하고, 결과를 자기 말로 설명해 카드를 저장합니다. 발사 횟수·예측 판정·설명 카드는 기존 localStorage와 부모 리포트에 연결되며, 로그인돼 있으면 기존 동기화 경로를 사용합니다.

- `src/rocket.js`: 탐구 화면과 저장 연동. 라우트를 벗어나면 메시지 리스너·iframe을 제거합니다.
- `rocket/index.html`: 사용자 제공 `fable-rocket.html`의 3D 장면·절차적 텍스처·Web Audio 연출. 원본 Three.js 0.164.1을 iframe 안에서 유지해 본 서비스의 0.170과 분리합니다. 외부 CDN 연결과 WebGL이 필요하며, 로드 지연 시 다시 불러오기를 안내합니다. 이 화면에는 2D 폴백이 없습니다.
- `src/rocket-physics.js`: 제공된 SI 단위 발사 모형. 최종 궤도 판정은 단위를 km로 변환해 기존 `src/physics.js`의 `classify`를 사용합니다. 지표면을 통과하는 궤도를 성공으로 판정하던 원본 조건을 보완했습니다.
- 모형은 나로호 **외형을 참고한 교육용 근사**이며 실제 나로호의 질량·추력·연료·비행 기록을 재현하지 않습니다. 연료량을 바꾸면 초기 질량도 바뀝니다. 목표 고도는 약 200km이지만 성공 기준은 근지점 100km 이상의 지구 궤도입니다. 지구 자전·바람·실제 비행 유도 등은 생략합니다.
- 원본 로켓·발사장·도장·지구·구름·불꽃 이미지는 제공 HTML의 코드로 생성하며 별도 이미지 파일을 추가하지 않았습니다. 내장 육지 마스크 역시 제공 HTML에서 가져왔으며 원본 데이터 출처·라이선스는 명시돼 있지 않습니다. NASA 실측/공식 발사 시뮬레이터로 표기하지 않습니다.

화면 흐름은 **예측 → 발사 → 발견** 3단계입니다. 모바일 첫 화면에 로켓·연료·두 예측 선택지·발사 버튼을 배치하고, 예측 이유와 근사 모형 설명은 접어 둡니다. 발사 중에는 높이·속도·연료만 기본 표시하며 전문 수치와 카메라는 「자세히」에서 엽니다. 카운트다운과 초기 이륙은 1배속, T+9초 이후에는 자동 10배속입니다. 사용자가 1/10/100배속을 직접 고르면 자동 전환을 해제합니다.

결과에서는 실제 예측과 코드 판정을 비교하고, 연료를 20%p 바꿔 다시 실험하거나 설명 카드를 따로 작성합니다. 재실험은 새 예측을 요구하며 같은 화면에서 지난 실험 결과도 비교할 수 있습니다. 카드 작성은 실험 후 선택이며 직접 쓴 설명이 있어야 저장됩니다. 리셋 시 단계·입력·배속·카메라를 초기화하고, 화면 이동 시 iframe을 제거합니다.

검증: `node --test tests/rocket.test.mjs`

고정 시간 간격 0.02초 기준: 2단 연료 100%에서 T+310.90초, 약 195.518 × 197.869km 궤도 진입. 20%에서 T+112.48초 연료 소진으로 실패. 모든 연료 눈금에서 성공 판정이 기존 `classify`와 일치하는지 검사합니다. 기존 400km 궤도 속력·탈출 속력·추락 문턱·호만 전이 기준값도 함께 확인합니다.


## 탐구 포털 (2026-10-06)

홈을 밝은 탐구 안내 화면으로 개편했습니다. 상단에서 탐구 둘러보기(`#explore`), 나의 탐구방(`#learning`), 부모님 가이드(`#parents`), 이용권(`#plans`)으로 이동하며 모바일에서는 전체 메뉴 버튼을 사용합니다. 로그인(`#account`)과 가족 계정 만들기(`#account/signup`)를 구분했습니다.

이용권은 **무료 데모**입니다. 신청 확인 뒤 이용권을 열고 이용 내역을 표시하지만 카드 결제·자동 갱신·실제 청구는 없습니다. 로그인된 계정의 신청 실패를 로컬 신청 성공으로 표시하지 않습니다. 비로그인 신청 내역은 이 브라우저에 저장합니다.

기존 로켓·궤도·별·시간 여행·리포트 주소와 물리 판정은 유지합니다. 참고 사이트별 확인 범위, 구현 범위와 검증은 [개편 기록](docs/learning-portal-design.md)을 참고하세요.

### 학생·학부모 회원가입과 가족 연결

상단 **회원가입**에서 학생용 또는 학부모용을 선택하고 별명·PIN으로 각각 가입합니다. 자동 발급된 로그인 코드 6자리와 PIN은 각자 보관합니다. 이메일·실명·전화번호는 받지 않습니다.

**가족 계정 연결**에서 한쪽이 연결 코드(12자리, 10분, 1회용)를 만들고 다른 쪽이 입력합니다. 학부모는 연결된 학생의 서버 탐구 기록과 발견 카드를 조회하고, 학생의 다음 미션 요청에 0원 데모 이용권을 열어 줄 수 있습니다. 연결은 어느 쪽에서든 해제할 수 있으며, 학생 원본 기록은 유지됩니다. 각자의 로그인 정보·이용권·기록은 합치지 않습니다. 가족 연결은 코드에 의한 자율 연결이며 보호자 신원을 별도로 확인하지는 않습니다.

기존 가족 계정은 같은 코드로 로그인하고 학생용/학부모용을 한 번 선택해 이어갑니다. 계정별 브라우저 저장소를 분리해 공동 기기에서 기록이 섞이지 않게 했습니다. 가입 전 비회원 기록은 자동으로 다른 계정에 업로드하지 않고 그대로 보관합니다. PIN 복구와 실제 카드 결제는 아직 지원하지 않습니다.

검증: `npm test`에 PostgreSQL(PGlite) 기반 가입/로그인, 가족 연결/만료/재사용 방지/해제, 다른 계정 접근 차단, 학생에게만 무료 이용권 부여, 기존 계정 전환, 로컬 기록 분리, 늦은 동기화 응답 방지 검증을 포함합니다. UI는 `node tests/preview-server.mjs`로 실제 비밀값 없이 임시 DB에서 검수할 수 있습니다.


### 별 키우기 단계별 관측 사진

NASA 공개 과학 자료를 교육용으로 원문 링크와 크레딧을 표시하여 연결합니다. NASA의 보증을 뜻하지 않습니다. 개별 협력기관 크레딧을 유지하며 로고를 사용하지 않습니다. 사진은 같은 별의 연속 촬영이 아니라 단계별 다른 천체의 관측 사례입니다. 초신성은 잔해, 블랙홀은 M87의 EHT 관측 사진이며 이를 화면에 명시합니다.

- 원시별 L1527 · 적외선 관측 — NASA, ESA, CSA, STScI — https://science.nasa.gov/asset/webb/l1527-and-protostar-nircam-image/
- 적색거성 미라 · 허블 관측 — Margarita Karovska (CfA), NASA — https://science.nasa.gov/asset/hubble/red-giant-star-mira/
- 고리 성운 · 가운데 작은 점이 백색왜성이에요 — NASA, ESA, Hubble Heritage (STScI/AURA)-ESA/Hubble Collaboration — https://science.nasa.gov/asset/hubble/hubble-captures-a-ring/
- 게 성운 중심 · 중심의 두 밝은 점 중 오른쪽이 중성자별이에요 — NASA, ESA; J. Hester (ASU), M. Weisskopf (NASA/MSFC) — https://science.nasa.gov/asset/hubble/core-of-the-crab-nebula/
- 게 성운 · 폭발 순간이 아니라 초신성이 남긴 잔해예요 — NASA, ESA, J. Hester (ASU) — https://www.nasa.gov/image-article/giant-mosaic-of-crab-nebula/
- M87 초대질량 블랙홀의 그림자 · 별의 최후로 생긴 블랙홀과는 크기가 다른 관측 사례예요 — Event Horizon Telescope Collaboration — https://science.nasa.gov/resource/first-image-of-a-black-hole/
- 주계열 별의 예: 태양 · 관측 파장에 따라 색이 달라요 — NASA/JPL — https://science.nasa.gov/sun/
- 적색초거성 베텔게우스 · 자외선 관측과 크기 비교 — A. Dupree (CfA), R. Gilliland (STScI), NASA — https://science.nasa.gov/asset/hubble/hubble-space-telescope-captures-first-direct-image-of-a-star/
- 갈색왜성 쌍 WISE J1049 · 적외선 관측 — NASA/JPL-Caltech/Gemini Observatory/AURA/NSF — https://science.nasa.gov/photojournal/brown-dwarfs-in-our-backyard/
