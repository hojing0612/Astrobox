# AstroBox — 에이전트 인수인계 문서

이 파일은 코드 작업을 이어받는 AI 에이전트(Codex·Claude 등)와 팀원을 위한 안내다. 사람이 읽는 소개는 `README.md`.

## 1. 무엇을 만드는가

초등 4~6학년 대상 **AI 우주 탐구 서비스**. 아이가 **예측 → 조건 하나 바꿔 실험 → 코드가 판정 → 코치가 되묻기 → 내 말로 설명 → 새 조건으로 전이 → 법칙 카드** 순서로 궤도역학·천문학을 배운다. 부모는 리포트에서 성장을 보고 미션 팩을 열어 준다(결제 지점).

연세대 창업 수업 팀 프로젝트(팀 0123). 팀 저장소 `hojing0612/Astrobox`. 라이브: https://astrobox-black.vercel.app

## 2. 절대 지킬 원칙

1. **판정은 코드가 한다.** 추락/궤도/이탈, 달 도착, 스윙바이 가속, 별의 운명, 퀴즈 정답은 전부 `src/physics.js`·`src/content.js`의 계산으로 결정한다. 글로 "맞았어요"를 쓰지 않는다.
2. **코치는 답을 주지 않는다.** `src/coach.js`는 되묻고 힌트 사다리(힌트1 → 힌트2 → 해설)를 연다. 해설은 아이가 실험을 한 뒤에만 열린다. 이것이 PhET 「중력과 궤도」와 다른 점(PhET는 솔루션이 없다).
3. **비용 0.** 외부 LLM API를 붙이지 않는다(팀 결정 2026-09-29). 코치는 규칙 기반이다.
4. **만 14세 미만 개인정보 없음.** 계정은 별명·유형(학생/학부모)·로그인 코드 6자 + PIN 4자리로 이용한다. 이메일·실명·전화번호를 받지 않는다.
5. **숫자는 사실.** 물리 상수·천문 값은 교과서/NASA 근사값이고, 화면에 "근사"임을 표시한다. 근사식을 바꾸면 `README.md` 검증값도 갱신한다.
6. **비밀값은 코드·채팅·문서에 쓰지 않는다.** `DATABASE_URL`, `SESSION_SECRET`은 Vercel 환경변수에만 있다. `.env*`는 `.gitignore`.
7. **"보기만 하는 페이지"는 만들지 않는다.** 모든 페이지는 예측 → 실행 → 판정 → 효과 → 수집 뼈대를 갖는다(규원 피드백 2026-09-29).

## 3. 스택과 구조 (빌드 없음)

바닐라 ES 모듈 + Three.js 0.170(importmap, jsdelivr CDN). 번들러·프레임워크 없음. Vercel 서버리스 함수(Node ESM) + Neon Postgres(`postgres` npm). UI 텍스트는 한국어, 초등학생 말투(~해요).

```
index.html            진입점(importmap, 상단 내비, 푸터 출처)
styles.css            기존 탐구 화면 스타일
portal.css            밝은 포털·계정·이용권 및 탐구 패널 공통 테마
src/portal.js         홈·검색 카탈로그·탐구방·부모 가이드·이용권·계정·도움말
src/app.js            해시 라우터: #home #explore #learning #parents #plans #help #m/<id> #lab #rocket #stars #timeline #report #account. 포털과 탐구 연결
src/physics.js        RK4 2체/지구+달 3체, classify, propagate, hohmann, moonShot, swingBy, 상수
src/missions.js       미션 m1~m4 정의(변수·선택지·run·judge·coachRules·hints·solution·transfer·lawCard)
src/rocket.js         로켓 탐구 화면: 예측·연료 변경·발사·설명 카드·리포트 연결
src/rocket-physics.js 제공 HTML의 SI 단위 발사 모형. 성공 판정은 physics.js의 classify 사용
rocket/index.html     제공 HTML의 3D 연출(Three.js 0.164.1 iframe 격리, WebGL 필요)
src/coach.js          규칙 코치(reply, ladder, askCoach)
src/render.js         2D Canvas 궤도 뷰(WebGL 없을 때 폴백)
src/render3d.js       Three.js 3D 뷰(NASA 텍스처, 낮/밤 셰이더, 펭귄 스프라이트, Line2 궤적)
src/cosmos.js         「우주 138억 년」 타임머신 장면(Canvas 2D)
src/starlife.js       「별의 생애」 별 키우기 장면(Canvas 2D)
src/content.js        별 운명·수명 근사, 이정표, 우주 달력, 퀴즈, 유명한 별, 슬라이더 눈금
src/fx.js             효과음(WebAudio)·폭죽·흔들림·펭귄 리액션
src/store.js          localStorage(astrobox.v1) + 서버 동기화(/api/sync)
src/account.js        가족 계정(코드+PIN) 로그인 상태
src/unlock.js         미션 팩 해금·부모 요청·데모 결제 클라이언트
api/_db.js _auth.js   Neon 연결·스키마 생성(astrobox.*), scrypt PIN 해시, HMAC 토큰
api/auth.js sync.js request.js pay.js   계정·동기화·부모 요청·결제(데모, PAY_PROVIDER 분기)
dev.js                로컬 서버(정적 + /api). PORT 기본 8092
assets/penguin*.png   마스코트(출처 미확인 → 외부 공개 전 확인 필요)
assets/tex/*.jpg      NASA 공개 텍스처(README 「이미지 출처」)
```

## 4. 실행·검증

```bash
npm test                         # 로켓 연료별 판정·리셋·기존 궤도 기준값 검증
node dev.js                      # http://localhost:8092  (file:// 은 모듈 때문에 안 됨)
DATABASE_URL=... SESSION_SECRET=... node dev.js   # 계정·서버 저장까지 켜려면
```

- 물리 검증값(바뀌면 안 됨): 400 km 원궤도 7.673 km/s, 탈출 10.851, 추락 문턱 7.585, 호만 달 3.084+0.829 km/s, 10바퀴 에너지 오차 1.7e-9. `node -e "import('./src/physics.js').then(P=>...)"`로 바로 확인 가능.
- 브라우저 캐시: 모듈이 캐시되면 옛 코드가 돌아간다. 확인할 때 `?v=N`을 붙이거나 `fetch(url,{cache:'reload'})` 후 새로고침.
- 3D 확인: 헤드리스 Chrome `--headless=new --window-size=1400,900 --timeout=9000 --screenshot=x.png "http://localhost:8092/?v=1#lab"`. WebGL이 없는 환경(일부 내장 브라우저)에서는 2D로 자동 폴백되는 것이 정상.
- **알려진 함정**: `ShaderMaterial`에서 `pow(x, 48.0)`을 쓰면 ANGLE(Metal·SwiftShader)에서 지구가 검게 렌더된다. `render3d.js`의 `p48()`(곱셈 전개)을 유지할 것.
- Vercel: 규원 프로젝트 `astrobox`(계정 kyuwon2)가 `npx vercel deploy --prod --yes`로 배포. 호정 Vercel은 GitHub main 자동 배포이나 env가 없어 계정·저장이 로컬 폴백으로 동작.

## 5. 작업 방식

- `main`에서 브랜치를 따고 PR을 연다(예: `feat/...`). 커밋 메시지는 한국어 요약.
- 코드 스타일: 기존 파일처럼 밀도 높은 한 줄 스타일, 세미콜론, 작은따옴표, 주석은 한국어. 새 화면은 `app.js`에 `renderX()` + 라우터 한 줄.
- 데이터(이정표·퀴즈·미션 문구)는 코드가 아니라 `content.js`/`missions.js`의 배열에 넣는다.
- 새 이미지·데이터를 넣을 때는 출처와 사용 권리를 `README.md` 「이미지 출처」에 적는다. NASA 제작물은 공개 자료(로고 금지·보증 인상 금지·출처 표기).

## 6. 지금까지 된 것 (2026-09-29 기준)

- 미션 4개(속력→고도→달 호만→스윙바이) + 해설 사다리 + 규칙 코치 + 자유 실험실
- 3D(NASA 지구·달, 낮/밤, 펭귄 우주선, 굵은 궤적) / 2D 폴백
- 가족 계정, 서버 저장, 부모 리포트, 부모 요청 → 미션 팩 해금 → 데모 결제(주문·권한 DB 기록, 청구 없음)
- 「우주 138억 년」 타임머신(장면·우주 달력·퀴즈), 「별의 생애」 별 키우기(예측·재생·판정·도감)
- 효과음·폭죽·호버·펭귄 리액션
- 로켓 발사 탐구(#rocket): 2단 연료 20~100% 예측·실험, 3D 발사/단 분리, 기존 classify로 궤도 판정, 설명 카드·부모 리포트 연결. 화면은 예측→발사→발견의 단계별 구조이며 초기 이륙 이후 자동 10배속(수동 변경 가능). 실제 나로호 제원을 재현하지 않는 근사 모형이며 세부 검증값은 README 참조.

## 7. 남은 일 (우선순위 순)

1. 아이 실물 테스트(초등 4~6) — 문구 난이도·조작 시간 측정
2. 실제 PG 연동: `api/pay.js`의 `PAY_PROVIDER` 분기에 붙인다(가맹 계정·사업자 정보 필요)
3. 미션 5+ (예: 정지궤도, 라그랑주 점) — `missions.js` 배열에 같은 형식으로 추가
4. 별의 생애·타임라인 결과를 부모 리포트 KPI에 반영(현재는 카드만)
5. 펭귄 마스코트 출처 확인 또는 자체 제작 교체
6. 모바일 실기기 3D 성능 점검(텍스처 2K/4K 자동 선택은 `render3d.js`의 `big`)

## 밝은 포털 개편 (2026-10-06)

- 주 메뉴 5개와 상단 계정/도움말, 활동 보조 메뉴, 모바일 전체 메뉴로 구분. 기존 활동 URL은 유지.
- `#explore/<category>` 분류, 검색은 현재 주제와 교집합. `#learning`은 실제 로컬 기록만 표시.
- `#account` 로그인 / `#account/signup` 가족 계정 생성. 기존 API를 유지하고 PIN 가림·필드 검증·오류 상태를 제공.
- `#plans` 이용권/이용 내역 → `#plans/checkout` 무료 데모 신청 확인 → 완료. 실제 PG는 여전히 미연동. 서버 오류 시 로그인 이용권을 로컬 해금으로 대체하지 않음.
- 비교 근거와 미확인 사이트: `docs/learning-portal-design.md`. 타사 자산·성과 수치를 사용하지 않음.
- 테스트: `npm test`(물리 4 + 포털 검색/최근 활동/무료 신청/서버 오류 4). UI 검수 기록은 위 문서에 추가.

## 학생·학부모 계정 분리 (2026-10-06)

- `#account/signup`: 학생용/학부모용 선택, 별명+PIN 가입. 로그인은 각자의 6자리 코드+PIN. 기존 코드도 유지.
- `src/account-ui.js`: 가입·로그인·기존 계정 유형 선택, `#family` 가족 연결. 학부모의 `#report`는 연결된 학생 리포트로 이동.
- `families` 테이블은 호환성을 위해 이름을 유지하되 행 하나가 개인 계정. `account_role` 기본 `legacy`. 기존 사용자는 한 번만 유형 선택. 기존 기록/주문/권한 FK를 변경하거나 병합하지 않는다.
- `api/family.js`: 12자리 임의 연결 코드(해시만 저장, 10분/1회), 반대 유형 간 연결, 목록/해제, 연결된 학부모만 학생 기록 조회·무료 요청 승인. 승인 이용권은 학생 계정에 저장. 관계는 가족의 자율 연결이며 법정대리인 신원 확인 기능은 아니다.
- 연결 시 로그인 PIN은 공유하지 않는다. 역할과 연결 여부는 매번 DB에서 확인. 리포트는 클라이언트 저장소에 병합하지 않는다.
- 기록/이용권 로컬 저장소는 로그인 코드별로 분리. 이전 로그인 세션은 원래 로컬 기록을 계정별 키로 복사해 보존. 비회원 기록은 자동 업로드하지 않는다.
- `npm test`: 물리/포털 + 실제 PostgreSQL(PGlite) 기반 가입·연결·권한·만료·해제·승인 + 클라이언트 계정 분리/동기화 경쟁 검증.
- `node tests/preview-server.mjs`: 8095 임시 메모리 DB로 UI 검수. 실제 비밀값 불필요. 종료 시 테스트 계정 소멸. 프로덕션에 테스트 서버를 사용하지 않는다.
