import { createPortal } from './portal.js';
import { mountRocket } from './rocket.js';
// AstroBox 앱 — 해시 라우팅: #home · #m/<id> · #report · #stars · #timeline
import { MISSIONS, byId } from './missions.js';
import { OrbitView } from './render.js';
import { OrbitView3D } from './render3d.js';
import { confetti, shake, penguinReact, stars, sound } from './fx.js';
import { askCoach, ladder } from './coach.js';
import * as store from './store.js';
import * as account from './account.js';
import * as unlock from './unlock.js';
import { starFate, AGE, KID_EVENTS, cosmicCalendar, TIME_QUIZ, FAMOUS_STARS, FATE_CHOICES, fateId, sliderS, sliderT } from './content.js';
import { CosmosView } from './cosmos.js';
import { StarView } from './starlife.js';
import * as P from './physics.js';

const $ = (s, el = document) => el.querySelector(s);
let activeView = null;
function makeView(canvas) { try { if (!document.createElement('canvas').getContext('webgl2') && !document.createElement('canvas').getContext('webgl')) throw new Error('no webgl'); return activeView = new OrbitView3D(canvas); } catch (e) { console.warn('3D 실패, 2D로', e); return activeView = new OrbitView(canvas); } }
const root = $('#root');
const fmt = (n, d = 2) => Number(n).toFixed(d);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); }
function updateShell() {
  const h = location.hash.slice(1) || 'home';
  const active = h.startsWith('m/') || ['rocket','lab','stars','timeline'].includes(h) ? 'explore' : h === 'report' ? 'parents' : h.split('/')[0];
  document.querySelectorAll('.nav a').forEach(a => { const on = a.getAttribute('href') === '#' + active; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const activityNav = $('#activityNav'); activityNav.hidden = !(['rocket','lab','stars','timeline'].includes(h) || h.startsWith('m/'));
  activityNav.querySelectorAll('a').forEach(a => { const on = a.hash === '#' + h || (a.hash === '#m/m1' && h.startsWith('m/')); if(on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  $('#headerAccount').textContent = account.current() ? '가족 계정 관리' : '로그인';
  $('#headerSignup').hidden = !!account.current();
}
function setNav() { updateShell(); }
const portal = createPortal(root, toast, updateShell);
const renderHome = () => portal.renderHome();
const renderAccount = () => portal.renderAccount();
$('#menuToggle').onclick = () => { const open = $('#menuToggle').getAttribute('aria-expanded') !== 'true'; $('#menuToggle').setAttribute('aria-expanded', String(open)); $('#menuToggle').setAttribute('aria-label', open ? '전체 메뉴 닫기' : '전체 메뉴 열기'); $('#mainNav').classList.toggle('is-open', open); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#menuToggle').getAttribute('aria-expanded') === 'true') { $('#menuToggle').click(); $('#menuToggle').focus(); } });

// ---------------- MISSION
async function renderMission(id) {
  const m = byId(id); if (!m) { location.hash = '#home'; return; }
  setNav('');
  if (!unlock.isUnlocked(m.id)) { await unlock.refresh(); }
  if (root.dataset.route !== 'm/' + id) return;
  if (!unlock.isUnlocked(m.id)) { renderLocked(m); return; }
  const V = m.variable;
  const state = { choice: null, reason: '', value: V.default, result: null, judged: null, history: [], stage: 'predict', transfer: null, experiments: 0, turns: 0, explained: false };
  root.innerHTML = `
  <div class="wrap">
    <div class="steps" style="margin-bottom:14px"><span><i class="dot on" id="d1"></i>예측</span><span><i class="dot" id="d2"></i>실험</span><span><i class="dot" id="d3"></i>설명</span><span><i class="dot" id="d4"></i>새 조건</span><span class="muted" style="margin-left:auto">미션 ${m.order} · ${esc(m.concept)}</span></div>
    <div class="mission">
      <section class="panel">
        <div class="eyebrow">① 예측 · 어떻게 될까?</div>
        <h2>${esc(m.title)}</h2>
        <p class="small muted" style="margin:0 0 12px">${esc(m.intro)}</p>
        <div id="choices" role="radiogroup">${m.choices.map((c) => `<button class="choice" data-id="${c.id}" role="radio" aria-checked="false"><b>${c.id}</b>${esc(c.text)}</button>`).join('')}</div>
        <textarea class="reason" id="reason" placeholder="이유 한 줄 — 틀려도 괜찮아요"></textarea>
        <button class="primary" id="runBtn" style="margin-top:10px" disabled>이대로 실험하기 →</button>
        <div id="transferBox" class="hidden" style="margin-top:14px"></div>
      </section>
      <section class="panel">
        <div class="eyebrow">② 실험 · 조건 하나만 바꾸기</div>
        <div class="sim"><canvas id="cv"></canvas>
          <div class="hud"><b id="hudMain">${esc(V.label)} ${fmt(V.default, V.step < 0.1 ? 2 : 0)} ${V.unit}</b><span id="hudSub">${m.locked.join(' · ')}</span><span class="clock" id="clock">0분</span></div><div class="drag-hint">🖱 드래그로 돌리고 · 휠로 확대</div>
          <div class="legend" id="legend"></div>
          <div class="badge hidden" id="badge"></div>
        </div>
        <div class="controls">
          <div class="row"><b>${esc(V.label)}</b><input type="range" id="slider" min="${V.log ? 0 : V.min}" max="${V.log ? 1000 : V.max}" step="${V.log ? 1 : V.step}" value="${V.log ? logToSlider(V, V.default) : V.default}"><output id="out">${fmt(V.default, V.step < 0.1 ? 2 : 0)} ${V.unit}</output></div>
          <div class="lock">잠금 ${m.locked.map((l) => `<span>${esc(l)}</span>`).join('')} 한 번에 하나만 바꿔요</div>
          <div class="row" style="margin-top:8px;gap:8px"><button class="secondary" id="playBtn" style="padding:6px 12px">⏸ 일시정지</button><button class="secondary rate" data-r="1" style="padding:6px 10px">1×</button><button class="secondary rate" data-r="3" style="padding:6px 10px">3×</button><button class="secondary rate" data-r="10" style="padding:6px 10px">10×</button><label class="small muted" style="margin-left:auto"><input type="checkbox" id="vecs" checked> 속력·중력 화살표</label></div>
          <div class="obs" id="obs">먼저 예측을 고르고 「이대로 실험하기」를 눌러요.</div>
        </div>
      </section>
      <section class="panel coachpanel">
        <div class="eyebrow">③ 코치 · 답은 알려주지 않아요</div>
        <div class="coach-head"><img class="penguin" src="assets/penguin-128.png" alt="" width="56" height="56"><div><b>펭귄 코치</b><div class="small muted">답은 안 알려줘요. 대신 같이 생각해요</div></div></div><div class="coach" id="coach"><div class="bubble ai"><div class="who">코치</div>먼저 예측해 봐. 왜 그렇게 생각했는지도 한 줄!</div></div>
        <div style="display:flex;gap:8px;margin-top:10px"><input id="say" class="reason" style="min-height:0;padding:8px 10px" placeholder="코치에게 답하기…"><button class="secondary" id="sayBtn">보내기</button></div>
        <div class="ladder" id="ladder"></div>
        <div class="solution hidden" id="solution"></div>
        <div class="card-form"><div class="t">④ 설명 카드 · 내 말로 쓰기</div>
          <div class="r"><div class="k">처음 생각</div><div id="c1" class="muted">예측을 고르면 여기 들어가요</div></div>
          <div class="r"><div class="k">관찰</div><div id="c2" class="muted">실험하면 코드가 채워요</div></div>
          <div class="r"><div class="k">다시 설명</div><textarea id="c3" rows="2" placeholder="실험을 보고 나서, 왜 그렇게 됐는지 내 말로"></textarea></div>
          <div class="r"><div class="k">다음 확인</div><input id="c4" placeholder="다음엔 뭘 바꿔 볼까?"></div>
          <button class="ghost" id="saveCard" style="margin-top:8px;width:100%">카드 저장하고 새 조건으로 →</button>
        </div>
        <div class="next" id="nextBox"><div class="t">다음 미션 예고</div><div class="m"><div class="ic">🚀</div><div><div class="n" id="nextTitle"></div><div class="s">이번 카드의 「다음 확인」에서 이어져요</div></div></div><button class="ghost" id="askParent" style="width:100%">부모님께 요청하기</button><div class="note">가격·시간 제한 없음 · 결제는 부모님 화면에서만</div></div>
      </section>
    </div>
  </div>`;
  const next = MISSIONS.find((x) => x.order === m.order + 1); $('#nextTitle').textContent = next ? next.title : '(준비 중) 스윙바이 — 달을 스쳐 지나며 속도 얻기';
  const view = makeView($('#cv')); view.onTick = (t) => { const el = $('#clock'); if (el) el.textContent = m.id === 'm3' || m.id === 'm4' ? `${(t / 86400).toFixed(1)}일` : t < 7200 ? `${Math.round(t / 60)}분` : `${(t / 3600).toFixed(1)}시간`; };
  const legend = $('#legend'); legend.innerHTML = m.id === 'm3' ? `<span><i style="background:#ffb454"></i>못 미침</span><br><span><i style="background:#46d49a"></i>달 도착</span><br><span><i style="background:#5aa9ff"></i>지나침</span>` : `<span><i style="background:#ff6b6b"></i>떨어짐</span><br><span><i style="background:#ff6237"></i>계속 돎</span><br><span><i style="background:#5aa9ff"></i>벗어남</span>`;
  // 초기 화면: 기본값으로 그리기(판정 없이)
  view.show(m.run(V.default), false); view.simTime = 0; view.draw();
  $('#playBtn').addEventListener('click', () => { $('#playBtn').textContent = view.toggle() ? '⏸ 일시정지' : '▶ 재생'; });
  document.querySelectorAll('.rate').forEach((b) => b.addEventListener('click', () => { view.setRate(Number(b.dataset.r)); document.querySelectorAll('.rate').forEach((x) => { x.style.borderColor = x === b ? 'var(--accent)' : ''; }); }));
  $('#vecs').addEventListener('change', (e) => { view.vectors = e.target.checked; view.draw(); });
  function renderLadder() {
    const steps = ladder(m, state.result, state);
    $('#ladder').innerHTML = '<div class="t">막혔어? 순서대로 열려요</div>' + steps.map((st) => `<button class="secondary lad" data-id="${st.id}" ${st.unlocked ? '' : 'disabled'} title="${st.unlocked ? '' : (st.id === 'solution' ? '실험 1회 + 「다시 설명」을 쓰면 열려요' : '먼저 실험해 봐요')}">${st.id === 'solution' ? '📖 ' : '💡 '}${st.label}</button>`).join('');
  }
  renderLadder();
  $('#ladder').addEventListener('click', (e) => { const b = e.target.closest('.lad'); if (!b || b.disabled) return; const st = ladder(m, state.result, state).find((x) => x.id === b.dataset.id); if (st.id !== 'solution') { addBubble('ai', st.text, '힌트'); store.log('hint', { mission: m.id, id: st.id }); return; } showSolution(); });
  function showSolution() {
    const sol = m.solution(state.result); const box = $('#solution'); box.classList.remove('hidden');
    box.innerHTML = `<div class="t">📖 해설 · 시도한 뒤에만 열려요</div><div class="ans">정답 <b>${sol.answer}</b> — ${esc(sol.title)}</div><ol>${sol.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ol><div class="num">${esc(sol.numbers)}</div><div class="look">👀 ${esc(sol.look)}</div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' }); store.log('solution', { mission: m.id });
  }
  function addBubble(role, text, who) { const box = $('#coach'); const b = document.createElement('div'); b.className = 'bubble ' + (role === 'ai' ? 'ai' : 'user'); b.innerHTML = role === 'ai' ? `<div class="who">${who || '코치'}</div>${esc(text)}` : esc(text); box.appendChild(b); box.scrollTop = box.scrollHeight; return b; }
  $('#c3').addEventListener('input', (e) => { state.explained = e.target.value.trim().length >= 5; renderLadder(); });

  // 예측
  $('#choices').addEventListener('click', (e) => { const b = e.target.closest('.choice'); if (!b) return; state.choice = b.dataset.id; document.querySelectorAll('.choice').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', x === b); }); $('#c1').textContent = m.choices.find((c) => c.id === state.choice).text; $('#c1').classList.remove('muted'); $('#runBtn').disabled = false; });
  $('#reason').addEventListener('input', (e) => { state.reason = e.target.value; });

  // 슬라이더
  const slider = $('#slider'), out = $('#out');
  const valueFromSlider = () => V.log ? sliderToLog(V, Number(slider.value)) : Number(slider.value);
  slider.addEventListener('input', () => { state.value = valueFromSlider(); out.textContent = `${fmt(state.value, V.step < 0.1 ? 2 : 0)} ${V.unit}`; $('#hudMain').textContent = `${V.label} ${fmt(state.value, V.step < 0.1 ? 2 : 0)} ${V.unit}`; if (state.stage !== 'predict') runExperiment(false); });
  slider.addEventListener('change', () => { if (state.stage !== 'predict') runExperiment(true); });

  function runExperiment(logIt = true) {
    const res = m.run(state.value); state.result = res;
    view.show(res, true); $('#playBtn').textContent = '⏸ 일시정지';
    if (logIt) { state.experiments++; renderLadder(); }
    $('#obs').textContent = res.observation; $('#c2').textContent = res.observation; $('#c2').classList.remove('muted');
    const j = m.judge(state.choice, res); state.judged = j;
    const badge = $('#badge'); badge.className = 'badge ' + j.verdict; badge.textContent = `판정 · ${j.text}`; badge.classList.remove('hidden');
    if (logIt) { const sim = $('.sim'); if (j.verdict === 'supported') { const r = badge.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 70); stars(sim); penguinReact('happy'); sound.win(); } else if (res.kind === 'crash' || res.kind === 'impact') { shake(sim); penguinReact('sad'); sound.lose(); } else { penguinReact('think'); sound.pop(); } }
    if (logIt) { store.log('experiment', { mission: m.id, value: state.value, kind: res.kind }); store.log('judge', { mission: m.id, verdict: j.verdict, choice: state.choice }); }
    return res;
  }
  $('#runBtn').addEventListener('click', async () => {
    state.stage = 'experiment'; $('#d2').classList.add('on'); $('#runBtn').textContent = '다시 실험하기'; sound.launch();
    const res = runExperiment(true);
    await coach('experiment');
    $('#d3').classList.add('on'); state.stage = 'explain';
  });

  async function coach(stage, text) {
    const r = await askCoach({ mission: m, stage, result: state.result, text, turn: state.turns });
    addBubble('ai', r.question); state.history.push({ role: 'coach', text: r.question });
    store.log('coach', { mission: m.id, source: r.source });
  }
  $('#sayBtn').addEventListener('click', async () => { const t = $('#say').value.trim(); if (!t) return; $('#say').value = ''; addBubble('user', t); state.history.push({ role: 'child', text: t }); if (!state.result) runExperiment(true); await coach(state.stage, t); state.turns++; renderLadder(); });
  $('#say').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#sayBtn').click(); });

  // 카드 저장 → 전이 문제
  $('#saveCard').addEventListener('click', () => {
    if (!state.result) { toast('먼저 실험을 해 봐요'); return; }
    const c3 = $('#c3').value.trim(); if (c3.length < 5) { toast('「다시 설명」을 내 말로 한 줄 써 줘요'); $('#c3').focus(); return; }
    store.addCard({ mission: m.id, title: m.title, initial: $('#c1').textContent, observation: state.result.observation, explanation: c3, next: $('#c4').value.trim(), verdict: state.judged?.verdict, value: state.value });
    toast('카드를 저장했어요'); showTransfer();
  });
  function showTransfer() {
    state.stage = 'transfer'; $('#d4').classList.add('on');
    const T = m.transfer; const box = $('#transferBox'); box.classList.remove('hidden');
    box.innerHTML = `<div class="eyebrow">⑤ 새 조건 · 이번엔 예측만으로</div><p style="margin:0 0 10px;font-size:.92rem">${esc(T.prompt)}</p><div id="tchoices">${T.choices.map((c) => `<button class="choice" data-id="${c.id}"><b>${c.id}</b>${esc(c.text)}</button>`).join('')}</div><div id="tresult" class="obs"></div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#tchoices').addEventListener('click', (e) => { const b = e.target.closest('.choice'); if (!b) return; document.querySelectorAll('#tchoices .choice').forEach((x) => x.classList.toggle('active', x === b));
      const ok = b.dataset.id === T.correct; const res = T.run(); view.show(res, true); $('#obs').textContent = res.observation;
      $('#tresult').innerHTML = `<b style="color:${ok ? 'var(--green)' : 'var(--amber)'}">${ok ? '새 조건에서도 맞췄어요 — 개념이 옮겨 갔어요' : '새 조건에서는 달랐어요 — 왜 그런지 화면을 봐요'}</b><br>${esc(res.observation)}`;
      store.log('transfer', { mission: m.id, correct: ok, choice: b.dataset.id }); if (ok) { toast('🏅 법칙 카드 획득: ' + m.lawCard); confetti(window.innerWidth / 2, window.innerHeight / 3, 120); penguinReact('happy'); sound.win(); } }, { once: true });
  }
  $('#askParent').addEventListener('click', async () => { if (!next) { toast('마지막 미션이에요'); return; } if (unlock.isUnlocked(next.id)) { toast('이미 열려 있어요! 홈에서 시작해요'); return; } store.log('request', { mission: m.id, next: next.id }); const r = await unlock.requestNext(m.id, next.id); $('#askParent').textContent = '요청 보냄 · 부모님 확인 기다리는 중'; $('#askParent').disabled = true; toast(r.where === 'server' ? '부모님 화면으로 요청을 보냈어요' : '부모님 화면(이 기기)에 요청을 남겼어요'); });
  if (next && unlock.isUnlocked(next.id)) { $('#askParent').textContent = '다음 미션 열려 있음 → 홈에서 시작'; }
}
function logToSlider(V, v) { return Math.round(1000 * (Math.log(v) - Math.log(V.min)) / (Math.log(V.max) - Math.log(V.min))); }
function sliderToLog(V, s) { const v = Math.exp(Math.log(V.min) + (s / 1000) * (Math.log(V.max) - Math.log(V.min))); return Math.round(v / V.step) * V.step; }

// ---------------- REPORT
async function renderReport() {
  setNav('report'); if (account.current()) await store.sync(); if (root.dataset.route !== 'report') return; const s = store.summary();
  const tot = (k) => Object.values(s.byMission).reduce((a, b) => a + (b[k] || 0), 0);
  const exp = tot('experiments'), coachN = tot('coach'), judged = tot('judged'), sup = tot('supported'), tr = tot('transfer'), trOk = tot('transferOk');
  root.innerHTML = `<div class="wrap" style="max-width:760px">
    <div class="panel"><div class="eyebrow">부모 리포트 · 아이의 탐구 과정</div><h1>우주 탐구 기록</h1><p class="muted small">기록은 아이가 직접 쓴 문장과 코드의 판정 로그만 근거로 해요. 숫자는 전부 실제 활동에서 나온 값이에요. ${account.current() ? `☁️ ${esc(account.current().childName)}(${account.current().code}) 계정으로 서버에 저장됨${store.syncState.status === 'offline' ? ' — 지금은 서버 연결이 안 돼 이 기기 기록만 보여요' : ''}` : '이 브라우저에만 저장됨 — <a href="#account">가족 계정</a>을 만들면 다른 기기에서도 보여요'}</p>
    ${exp === 0 ? `<div class="empty">아직 기록이 없어요. 첫 미션을 해 보면 여기에 쌓여요.</div>` : `
    <div class="kpis"><div class="kpi"><b>${s.missions.length}</b><span>시작한 미션</span></div><div class="kpi"><b>${exp}</b><span>직접 실험</span></div><div class="kpi"><b>${s.cards.length}</b><span>설명 카드</span></div></div>
    <div class="bar"><span>예측이 맞은 실험</span><div class="track"><i style="width:${judged ? Math.round(100 * sup / judged) : 0}%"></i></div><span>${sup} / ${judged}</span></div>
    <div class="bar"><span>새 조건에서 설명</span><div class="track"><i style="width:${tr ? Math.round(100 * trOk / tr) : 0}%"></i></div><span>${trOk} / ${tr}</span></div>
    <div class="bar"><span>코치 되묻기</span><div class="track"><i style="width:${Math.min(100, coachN * 8)}%;background:#5aa9ff"></i></div><span>${coachN}회</span></div>
    <div class="bar"><span>힌트 · 해설 열람</span><div class="track"><i style="width:${Math.min(100, (tot('hints') + tot('solutions')) * 12)}%;background:#ffb454"></i></div><span>${tot('hints')} · ${tot('solutions')}</span></div>
    <h2 style="margin-top:18px">설명이 이렇게 달라졌어요</h2>
    ${s.cards.length ? s.cards.slice().reverse().map((c) => `<div class="law"><div class="m">${esc(c.title)} · ${new Date(c.t).toLocaleDateString('ko-KR')}</div><div class="r"><div class="k">처음 생각</div><div>${esc(c.initial)}</div></div><div class="r"><div class="k">관찰</div><div>${esc(c.observation)}</div></div><div class="r"><div class="k">다시 설명</div><div>${esc(c.explanation)}</div></div>${c.next ? `<div class="r"><div class="k">다음 확인</div><div>${esc(c.next)}</div></div>` : ''}</div>`).join('') : '<div class="empty">아직 카드가 없어요</div>'}
    <h2 style="margin-top:18px">미션별</h2>
    ${s.missions.map((id) => { const m = byId(id); const b = s.byMission[id]; return `<div class="bar"><span>${esc(m?.title || (id === 'rocket' ? '로켓 발사 탐구' : id))}</span><div class="track"><i style="width:${Math.min(100, b.experiments * 10)}%"></i></div><span>실험 ${b.experiments}</span></div>`; }).join('')}

    <div class="next" style="margin-top:18px"><div class="t">다음 미션</div><div class="m"><div class="ic">🚀</div><div><div class="n">${esc((MISSIONS.find((m) => !s.byMission[m.id]) || MISSIONS[0]).title)}</div><div class="s">아이 화면의 「부모님께 요청하기」에서 이어져요</div></div></div><button class="primary" onclick="location.hash='#explore'">다른 탐구 찾아보기</button></div>`}
    <div id="parentBox"></div><p class="small muted" style="margin-top:16px">기록 지우기: <button class="secondary" id="reset" style="padding:4px 10px">초기화</button></p>
    </div></div>`;
  $('#reset')?.addEventListener('click', () => { if (confirm('이 브라우저의 기록을 모두 지울까요?')) { store.reset(); renderReport(); } });
  renderParentBox();
}
async function renderParentBox() {
  const box = $('#parentBox'); if (!box) return;
  const r = await unlock.fetchRequests(); if (!box.isConnected) return; const pending = r.requests.filter((x) => x.status === 'pending'); const pk = unlock.PACKS['pack-1']; const has = unlock.isUnlocked('m2');
  box.innerHTML = `<h2 style="margin-top:18px">아이의 요청 ${pending.length ? `<span style="color:var(--accent)">· ${pending.length}건</span>` : ''}</h2>
    ${pending.length ? pending.map((q) => `<div class="law"><div class="m">${esc(byId(q.mission)?.title || q.mission)} 를 마치고 → <b>${esc(byId(q.next)?.title || q.next)}</b> 를 열어 달래요 · ${new Date(q.t).toLocaleString('ko-KR')}</div>
      <div style="display:flex;gap:8px;margin-top:8px"><button class="primary" data-approve="${q.id}" style="width:auto;padding:8px 14px">${has ? '열어주기' : '미션 팩 열고 승인'}</button><button class="secondary" data-decline="${q.id}">나중에</button></div></div>`).join('') : '<div class="empty small">아직 요청이 없어요. 아이가 미션을 마치면 「부모님께 요청하기」로 여기에 와요.</div>'}
    <div class="law" style="margin-top:12px"><div class="m">${esc(pk.title)} ${has ? '· ✅ 열림' : ''}</div><div class="r"><div class="k">포함</div><div>${pk.missions.map((id) => esc(byId(id)?.title || id)).join(' · ')} + 코치 되묻기 + 이해 기록</div></div><div class="r"><div class="k">가격</div><div>${esc(pk.note)} — 실제 청구 없음. 결제 방식은 검증 뒤 붙여요</div></div>${has ? '' : `<button class="primary" id="buyPack" style="margin-top:8px">미션 팩 열기 (무료 데모)</button>`}</div>
    <p class="small muted">${r.where === 'server' ? '☁️ 요청·권한은 가족 계정 서버에 저장돼 아이 기기에도 바로 반영돼요' : '이 기기 안에서만 동작해요 — 가족 계정으로 로그인하면 아이 기기와 연결돼요'}</p>`;
  box.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', async () => {
    if (!has) { location.hash = '#plans/checkout'; return; }
    b.disabled = true;
    try { await unlock.decide(b.dataset.approve.match(/^\d+$/) ? Number(b.dataset.approve) : b.dataset.approve, 'approve'); store.log('approve', { by: 'parent' }); if (box.isConnected) { toast('열어줬어요'); renderParentBox(); } }
    catch { if (b.isConnected) { b.disabled = false; toast('요청을 처리하지 못했어요. 다시 시도해 주세요.'); } }
  }));
  box.querySelectorAll('[data-decline]').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true;
    try { await unlock.decide(b.dataset.decline.match(/^\d+$/) ? Number(b.dataset.decline) : b.dataset.decline, 'decline'); if (box.isConnected) renderParentBox(); }
    catch { if (b.isConnected) { b.disabled = false; toast('요청을 처리하지 못했어요. 다시 시도해 주세요.'); } }
  }));
  $('#buyPack')?.addEventListener('click', () => { location.hash = '#plans/checkout'; });
}
function renderLocked(m) {
  root.innerHTML = `<div class="wrap" style="max-width:640px"><div class="panel"><div class="eyebrow">🔒 미션 ${m.order} · 미션 팩</div><h1>${esc(m.title)}</h1><p class="muted">${esc(m.intro)}</p>
    <div class="law"><div class="m">이 미션은 미션 팩에 들어 있어요</div><div class="r"><div class="k">아이</div><div>미션 1을 마치고 「부모님께 요청하기」를 눌러요</div></div><div class="r"><div class="k">부모님</div><div>이용권 페이지에서 무료 데모 미션 팩을 열어주세요. 실제 청구는 없어요.</div></div></div>
    <div style="display:flex;gap:8px;margin-top:12px"><a class="primary" style="text-decoration:none;text-align:center" href="#m/m1">미션 1로</a><a class="secondary" style="text-decoration:none;text-align:center" href="#plans">이용권 안내</a></div></div></div>`;
}

// ---------------- CONTENT: 별의 생애 — 별 키우기(예측 → 일생 빨리 감기 → 판정 → 별 도감)
const DEX_KEY = 'astrobox.dex'; const dexLoad = () => { try { return JSON.parse(localStorage.getItem(DEX_KEY)) || []; } catch { return []; } };
const FATE_EMOJI = { none: '🟤', wd: '⚪', ns: '💫', bh: '⚫' }; const FATE_NAME = { none: '갈색왜성', wd: '백색왜성', ns: '중성자별', bh: '블랙홀' };
function renderStars() {
  setNav('stars');
  root.innerHTML = `<div class="wrap"><div class="content"><section class="panel"><div class="eyebrow">놀이 · 별 키우기</div><h1>별의 무게를 정하면 운명이 정해져요</h1>
    <div class="sim" style="aspect-ratio:1.35;min-height:300px"><canvas id="sv"></canvas><div class="tag" id="stage">주계열 · 지금 태양이 있는 단계</div><div class="sub" id="ssub">슬라이더로 별의 질량을 바꿔 봐요. 크기와 색이 바뀌어요. 그다음 어떻게 끝날지 맞히고 ▶ 을 눌러요</div></div>
    <div class="row" style="margin:12px 0 4px"><b>별의 질량</b><input type="range" id="mass" min="0" max="1000" value="500"><output id="mout">1.0 태양</output></div>
    <div class="chips" id="famous">${FAMOUS_STARS.map((s) => `<button class="chip" data-m="${s.mass}" title="${esc(s.note)}">${esc(s.name)}</button>`).join('')}</div>
    <div class="row"><button class="primary" id="life" disabled>▶ 일생 빨리 감기</button></div>
    <div class="facts" id="facts"></div>
    <p class="small muted" style="margin-top:10px">근사 모형: 수명 ≈ 100억 년 × (질량)<sup>-2.5</sup>, 밝기 ≈ (질량)<sup>3.5</sup>. 경계값(0.08 · 8 · 20 태양질량)은 교과서 수준의 대략적인 값. 연출 시간은 실제 비율과 달라요.</p></section>
    <section class="panel"><div class="coach-head"><img class="penguin" src="assets/penguin-128.png" width="56" height="56" alt=""><div><b>펭귄 코치</b><div class="small muted">먼저 맞혀 봐. 판정은 코드가 해요</div></div></div>
    <div class="bubble ai" id="sbub">이 별은 어떻게 끝날까? 하나 고르고 ▶ 을 눌러 봐</div>
    <div id="choices">${FATE_CHOICES.map((c, i) => `<button class="choice" data-id="${c.id}"><b>${'ABCD'[i]}</b>${esc(c.label)}</button>`).join('')}</div>
    <div id="verdict"></div>
    <div class="law"><div class="m">별 도감 · 4가지 운명을 다 모아 봐</div><div class="dex" id="dex"></div></div>
    <div class="law"><div class="m">태양의 미래</div><div class="r"><div class="k">지금</div><div>주계열 · 46억 년 살았고 50억 년쯤 더 살아요</div></div><div class="r"><div class="k">그다음</div><div>적색거성 → 행성상 성운 → 백색왜성. 폭발하지 않아요(8 태양질량보다 가벼워서)</div></div></div></section></div></div>`;
  const view = activeView = new StarView($('#sv')); let m = 1, choice = null, busy = false;
  const dexDraw = () => { const got = dexLoad(); $('#dex').innerHTML = ['none', 'wd', 'ns', 'bh'].map((k) => `<div class="d ${got.includes(k) ? 'got' : ''}"><i>${FATE_EMOJI[k]}</i>${FATE_NAME[k]}</div>`).join(''); };
  const facts = () => { const f = starFate(m); const L = f.lifetime; const life = !L ? '핵융합이 안 켜져요' : L >= 1e12 ? `${(L / 1e12).toFixed(0)}조 년` : L >= 1e8 ? `${(L / 1e8).toFixed(L < 1e9 ? 1 : 0)}억 년` : `${(L / 1e6).toFixed(0)}백만 년`;
    const cmp = !L ? '' : L > AGE ? `우주 나이(138억 년)의 ${(L / AGE).toFixed(0)}배 — 아직 죽은 적 없음` : L > 1e9 ? `태양 수명(100억 년)의 ${(L / 1e10).toFixed(2)}배` : L > 1.6e8 ? `공룡 시대(1.6억 년)의 ${(L / 1.6e8).toFixed(1)}배` : `공룡 시대(1.6억 년)의 ${(L / 1.6e8).toFixed(2)}배 — 눈 깜짝할 새`;
    const lum = f.luminosity; const color = m < 0.5 ? '차가워서 붉게' : m < 1.5 ? '태양처럼 노랗게' : m < 6 ? '뜨거워서 하얗게' : '아주 뜨거워서 파랗게';
    $('#facts').innerHTML = `<div class="f"><b>${life}</b>수명 · ${esc(cmp)}</div><div class="f"><b>태양의 ${lum < 0.01 ? lum.toExponential(1) : lum < 100 ? lum.toFixed(1) : Math.round(lum).toLocaleString()}배</b>밝기 · ${color} 빛나요</div>`; };
  const setMass = (v) => { m = v; view.setMass(m); $('#mout').textContent = `${m < 10 ? m.toFixed(2) : m.toFixed(0)} 태양`; document.querySelectorAll('#famous .chip').forEach((c) => c.classList.toggle('on', Math.abs(Number(c.dataset.m) - m) < 1e-6)); facts(); if (!busy) { $('#stage').textContent = m < 0.08 ? '갈색왜성 후보' : '주계열 · 지금'; $('#stage').classList.remove('pop'); void $('#stage').offsetWidth; $('#stage').classList.add('pop'); } };
  const sliderToMass = () => Math.exp(Math.log(0.05) + (Number($('#mass').value) / 1000) * (Math.log(100) - Math.log(0.05)));
  $('#mass').addEventListener('input', () => { if (busy) return; setMass(sliderToMass()); });
  document.querySelectorAll('#famous .chip').forEach((c) => c.addEventListener('click', () => { if (busy) return; const v = Number(c.dataset.m); $('#mass').value = Math.round(1000 * (Math.log(v) - Math.log(0.05)) / (Math.log(100) - Math.log(0.05))); setMass(v); toast(`${c.textContent} · ${c.title}`); sound.pop(); }));
  document.querySelectorAll('#choices .choice').forEach((b) => b.addEventListener('click', () => { if (busy) return; choice = b.dataset.id; document.querySelectorAll('#choices .choice').forEach((x) => x.classList.toggle('active', x === b)); $('#life').disabled = false; $('#sbub').textContent = '좋아, 그럼 ▶ 을 눌러서 확인해 보자'; sound.pop(); }));
  view.onStage = (st, i, n) => { $('#stage').textContent = `${i + 1}/${n} ${st.name}`; $('#stage').classList.remove('pop'); void $('#stage').offsetWidth; $('#stage').classList.add('pop'); $('#ssub').textContent = st.desc; if (st.name.includes('초신성')) { sound.launch(); shake($('#sv').parentElement); } else sound.pop(); };
  view.onDone = () => { busy = false; const fid = fateId(m); const ok = fid === choice; const got = dexLoad(); if (!got.includes(fid)) { got.push(fid); try { localStorage.setItem(DEX_KEY, JSON.stringify(got)); } catch {} } dexDraw();
    $('#verdict').innerHTML = ok ? `<div class="verdict ok">🎉 맞았어요! ${m < 10 ? m.toFixed(2) : m.toFixed(0)} 태양질량 별의 끝은 <b>${FATE_NAME[fid]}</b>. 별 도감에 들어갔어요.</div>` : `<div class="verdict no">아쉽! 이 별의 끝은 <b>${FATE_NAME[fid]}</b>였어요. 기준은 질량이에요: 8 태양질량보다 가벼우면 백색왜성, 8~20이면 중성자별, 더 무거우면 블랙홀, 0.08보다 가벼우면 불이 안 붙어요. 도감에는 들어갔어요.</div>`;
    if (ok) { confetti(window.innerWidth / 2, window.innerHeight / 3, 120); sound.win(); penguinReact('happy'); } else { sound.lose(); penguinReact('sad'); }
    store.log('quiz', { page: 'stars', mass: Number(m.toFixed(2)), choice, correct: ok });
    if (ok) store.addCard({ mission: '-', title: `별 카드: ${FATE_NAME[fid]}`, initial: `내 예측: ${FATE_CHOICES.find((c) => c.id === choice)?.label}`, observation: `${m < 10 ? m.toFixed(2) : m.toFixed(0)} 태양질량 → ${starFate(m).name}`, explanation: starFate(m).desc, next: '' });
    $('#sbub').textContent = ok ? '완벽해! 다른 질량으로도 해 볼래? 도감 4칸을 다 채워 봐' : '괜찮아, 질량을 바꿔서 다시 해 보자. 8과 20이 갈림길이야'; $('#life').textContent = '▶ 다시 보기'; $('#life').disabled = false; };
  $('#life').addEventListener('click', () => { if (busy) return; if (!choice) { toast('먼저 어떻게 끝날지 골라 봐요'); return; } busy = true; $('#verdict').innerHTML = ''; $('#life').disabled = true; $('#sbub').textContent = '별이 태어났어요. 끝까지 지켜보자'; sound.launch(); view.play(); });
  dexDraw(); setMass(1);
}

// ---------------- CONTENT: 타임라인 — 펭귄 타임머신(장면 + 우주 달력 + 퀴즈)
const sOf = sliderS, tOf = sliderT;
function fmtT(t) { return t < 1 / 3.15e7 ? `${(t * 3.15e7).toExponential(0)} 초` : t < 1 ? `${Math.round(t * 3.15e7 / 60)} 분` : t < 1e6 ? `${Math.round(t).toLocaleString()} 년` : t < 1e9 ? `${(t / 1e6).toFixed(0)}백만 년` : `${(t / 1e8).toFixed(0)}억 년`; }
function renderTimeline() {
  setNav('timeline');
  root.innerHTML = `<div class="wrap"><div class="content"><section class="panel"><div class="eyebrow">놀이 · 시간 여행</div><h1>펭귄 타임머신을 타고 138억 년</h1>
    <div class="sim" style="aspect-ratio:1.35;min-height:300px"><canvas id="cv2"></canvas><div class="tag" id="era">🔭 지금</div><div class="sub" id="tsub">슬라이더를 맨 왼쪽으로 당기면 빅뱅이에요. 🚀 을 누르면 처음부터 지금까지 자동으로 여행해요</div></div>
    <div class="row" style="margin:12px 0 4px"><b>빅뱅 후</b><input type="range" id="tt" min="0" max="1000" value="1000"><output id="tout">138억 년</output></div>
    <div class="row"><button class="primary" id="go">🚀 시간 여행 출발</button></div>
    <div class="chips" id="jumps">${KID_EVENTS.map((e, i) => `<button class="chip" data-i="${i}">${e.emoji} ${esc(e.label)}</button>`).join('')}</div>
    <p class="small muted">로그 눈금: 왼쪽으로 갈수록 시간이 급격히 짧아져요. 값은 표준 우주론·교과서 근사치예요.</p></section>
    <section class="panel"><div class="eyebrow">우주 138억 년이 1년이라면</div>
    <div class="calendar"><div class="date" id="cdate">12월 31일</div><div class="time" id="ctime">밤 11시 59분 · 자정 0.00초 전</div><div class="year">하루 = 3,800만 년 · 1시간 = 160만 년 · 1초 = 440년 (칼 세이건의 우주 달력)</div></div>
    <div id="enow"></div>
    <div class="coach-head" style="margin-top:14px"><img class="penguin" src="assets/penguin-128.png" width="56" height="56" alt=""><div><b>펭귄 코치</b><div class="small muted">맞혀 봐 · 3문제</div></div></div>
    <div class="quiz" id="quiz"></div></section></div></div>`;
  const view = activeView = new CosmosView($('#cv2')); let lastEra = -1;
  const show = (t, fromPlay = false) => { const i = KID_EVENTS.reduce((a, e, k) => (e.t <= t ? k : a), 0); const e = KID_EVENTS[i]; const cal = cosmicCalendar(t);
    $('#tout').textContent = fmtT(t); $('#cdate').textContent = `${cal.month}월 ${cal.day}일`; $('#ctime').textContent = cal.text.replace(/^\d+월 \d+일 /, '');
    if (i !== lastEra) { lastEra = i; $('#era').textContent = `${e.emoji} ${e.label}`; $('#era').classList.remove('pop'); void $('#era').offsetWidth; $('#era').classList.add('pop'); $('#tsub').textContent = `${e.desc} — 펭귄: "${e.bubble}"`; $('#enow').innerHTML = `<div class="law"><div class="m">${e.emoji} ${esc(e.label)}</div><div class="r"><div class="k">언제</div><div>${esc(e.desc)}</div></div><div class="r"><div class="k">달력으로</div><div>${esc(cal.text)}</div></div></div>`; document.querySelectorAll('#jumps .chip').forEach((c) => c.classList.toggle('on', Number(c.dataset.i) === i)); if (fromPlay) sound.pop(); } };
  $('#tt').addEventListener('input', () => { view.stop(); const t = tOf(Number($('#tt').value) / 1000); view.setTime(t); show(t); });
  document.querySelectorAll('#jumps .chip').forEach((c) => c.addEventListener('click', () => { view.stop(); const e = KID_EVENTS[Number(c.dataset.i)]; $('#tt').value = Math.round(sOf(e.t) * 1000); view.setTime(e.t); lastEra = -1; show(e.t); sound.pop(); }));
  view.onTick = (t, s) => { $('#tt').value = Math.round(s * 1000); show(t, true); };
  view.onDone = () => { $('#go').textContent = '🚀 다시 출발'; $('#go').disabled = false; confetti(window.innerWidth / 3, window.innerHeight / 3, 80); sound.win(); penguinReact('happy'); };
  $('#go').addEventListener('click', () => { $('#go').disabled = true; lastEra = -1; sound.launch(); view.play(); });
  // 퀴즈
  let qi = 0, score = 0; const quiz = () => { const q = TIME_QUIZ[qi]; if (!q) { $('#quiz').innerHTML = `<div class="verdict ${score >= 2 ? 'ok' : 'no'}">퀴즈 끝! ${score}/${TIME_QUIZ.length} 맞았어요. ${score >= 2 ? '우주 달력 마스터 🏅' : '타임머신을 한 번 더 타고 다시 풀어 봐'}</div><button class="secondary" id="again">다시 풀기</button>`; $('#again').addEventListener('click', () => { qi = 0; score = 0; quiz(); }); if (score >= 2) { confetti(window.innerWidth * 0.75, window.innerHeight / 2, 100); sound.win(); } store.log('quiz', { page: 'timeline', score }); return; }
    $('#quiz').innerHTML = `<div class="score">${qi + 1} / ${TIME_QUIZ.length}</div><div class="q">${esc(q.q)}</div>${q.choices.map((c, i) => `<button class="choice" data-i="${i}"><b>${'ABC'[i]}</b>${esc(c)}</button>`).join('')}<div class="why" id="why"></div>`;
    document.querySelectorAll('#quiz .choice').forEach((b) => b.addEventListener('click', () => { const ok = Number(b.dataset.i) === q.correct; document.querySelectorAll('#quiz .choice').forEach((x) => { x.disabled = true; x.classList.toggle('active', Number(x.dataset.i) === q.correct); }); if (ok) { score++; sound.win(); penguinReact('happy'); } else { sound.lose(); shake(b); }
      $('#why').innerHTML = `${ok ? '🎉 정답! ' : '아쉽! 정답은 ' + esc(q.choices[q.correct]) + '. '}${esc(q.why)} <button class="secondary" id="nxt" style="margin-left:6px">다음 →</button>`; $('#nxt').addEventListener('click', () => { qi++; quiz(); }); }, { once: true })); };
  quiz(); show(AGE);
}

// ---------------- ROUTER
let disposeRocket = null;
function renderRocket() { setNav('rocket'); disposeRocket = mountRocket(root); }
function route() {
  if (activeView) { activeView.dispose(); activeView = null; }
  if (disposeRocket) { disposeRocket(); disposeRocket = null; }
  const h = location.hash.replace(/^#/, '') || 'home';
  updateShell(); $('#menuToggle').setAttribute('aria-expanded','false'); $('#menuToggle').setAttribute('aria-label','전체 메뉴 열기'); $('#mainNav').classList.remove('is-open');
  root.dataset.route = h;
  root.innerHTML = '<div class="route-loading" role="status">탐구를 준비하고 있어요…</div>';
  window.scrollTo({top:0,behavior:'instant'});
  const titles = {home:'탐구 홈',explore:'탐구 둘러보기',learning:'나의 탐구방',parents:'부모님 가이드',plans:'이용권',account:'가족 계정',help:'이용 안내',rocket:'로켓 발사',report:'부모 리포트',stars:'별 키우기',timeline:'우주 시간 여행',lab:'자유 실험실'};
  document.title = (titles[h.split('/')[0]] || '궤도 미션') + ' | AstroBox';
  if (h === 'root') { root.focus(); return renderHome(); }
  if (h === 'explore' || h.startsWith('explore/')) return portal.renderExplore();
  if (h === 'learning') return portal.renderLearning();
  if (h === 'parents') return portal.renderParents();
  if (h === 'help') return portal.renderHelp();
  if (h === 'plans' || h === 'plans/checkout') return portal.renderPlans(h.endsWith('/checkout'));
  if (h === 'account/signup') return portal.renderAccount('signup');
  if (h.startsWith('m/')) return renderMission(h.slice(2));
  if (h === 'rocket') return renderRocket();
  if (h === 'lab') return renderLab();
  if (h === 'account') return renderAccount();
  if (h === 'report') return renderReport();
  if (h === 'stars') return renderStars();
  if (h === 'timeline') return renderTimeline();
  renderHome();
}
document.querySelector('.skip-link').onclick = e => { e.preventDefault(); root.focus(); root.scrollIntoView({block:'start'}); };
window.addEventListener('hashchange', route); route();

// ---------------- FREE LAB
function renderLab() {
  setNav('lab');
  root.innerHTML = `<div class="wrap"><div class="mission" style="grid-template-columns:minmax(280px,.9fr) minmax(440px,1.6fr)">
    <section class="panel"><div class="eyebrow">자유 실험실 · 예측 없이 마음껏</div><h2>조건을 바꾸고, 화살표를 보고, 무슨 일이 생기는지 봐요</h2>
      <div class="row"><b>고도</b><input type="range" id="lh" min="0" max="1000" value="${logToSlider({ min: 150, max: 36000 }, 400)}"><output id="lho">400 km</output></div>
      <div class="row"><b>속력</b><input type="range" id="lv" min="1" max="12" step="0.05" value="7.67"><output id="lvo">7.67 km/s</output></div>
      <div class="row"><b>발사각</b><input type="range" id="la" min="-60" max="60" step="1" value="0"><output id="lao">0° (옆으로)</output></div>
      <div class="row"><b>지구 질량</b><input type="range" id="lm" min="0.5" max="2" step="0.1" value="1"><output id="lmo">1.0배</output></div>
      <div class="row" style="margin-top:8px;gap:8px"><button class="secondary" id="playBtn" style="padding:6px 12px">⏸ 일시정지</button><button class="secondary rate" data-r="1" style="padding:6px 10px">1×</button><button class="secondary rate" data-r="3" style="padding:6px 10px">3×</button><button class="secondary rate" data-r="10" style="padding:6px 10px">10×</button><label class="small muted" style="margin-left:auto"><input type="checkbox" id="vecs" checked> 화살표</label></div>
      <div class="obs" id="obs"></div>
      <div class="law" style="margin-top:12px"><div class="m">해 볼 것</div><div class="r"><div class="k">①</div><div>발사각을 바꿔서 원이 아닌 타원을 만들어 봐. 가장 낮은 곳이 어디까지 내려가?</div></div><div class="r"><div class="k">②</div><div>지구 질량을 2배로 하면 같은 속력으로 돌 수 있을까?</div></div><div class="r"><div class="k">③</div><div>중력 화살표와 속력 화살표가 언제 직각이고 언제 아닌지 봐.</div></div></div>
      <p class="small muted">공기 저항 없는 지구 2체 모형. 지구 질량을 바꾸면 그림의 지구 크기도 조금 바뀌어요(질량의 세제곱근).</p></section>
    <section class="panel"><div class="sim"><canvas id="cv"></canvas><div class="legend" id="legend"><span><i style="background:#46d49a"></i>속력</span><br><span><i style="background:#5aa9ff"></i>중력</span><br><span><i style="background:#ff6b6b"></i>떨어짐</span><br><span><i style="background:#ff6237"></i>돎</span><br><span><i style="background:#5aa9ff"></i>벗어남</span></div></div></section></div></div>`;
  const view = makeView($('#cv'));
  const read = () => ({ h: sliderToLog({ min: 150, max: 36000, step: 10 }, Number($('#lh').value)), v: Number($('#lv').value), a: Number($('#la').value), mu: Number($('#lm').value) });
  const run = () => { const { h, v, a, mu } = read(); $('#lho').textContent = `${Math.round(h).toLocaleString()} km`; $('#lvo').textContent = `${v.toFixed(2)} km/s`; $('#lao').textContent = `${a}° ${a === 0 ? '(옆으로)' : a > 0 ? '(바깥쪽)' : '(안쪽)'}`; $('#lmo').textContent = `${mu.toFixed(1)}배`;
    const st = P.freeStart(h, v, a); const cls = P.classify(st.x, st.y, st.vx, st.vy, mu);
    const sim = P.propagate(st.x, st.y, st.vx, st.vy, { tMax: Math.min(48 * 3600, 3 * (isFinite(cls.el.a) ? 2 * Math.PI * Math.sqrt(cls.el.a ** 3 / (P.MU_EARTH * mu)) : 12 * 3600)), muScale: mu });
    const vc = Math.sqrt(P.MU_EARTH * mu / (P.R_EARTH + h)); const ve = Math.sqrt(2 * P.MU_EARTH * mu / (P.R_EARTH + h));
    const obs = cls.kind === 'crash' ? `떨어짐 — 가장 낮은 곳이 ${Math.round(Math.max(0, cls.el.rp - P.R_EARTH)).toLocaleString()} km까지 내려가 대기에 닿아요` : cls.kind === 'orbit' ? `돎 — ${Math.round(sim.minR - P.R_EARTH).toLocaleString()} ~ ${Math.round(sim.maxR - P.R_EARTH).toLocaleString()} km 사이를 ${cls.el.e < 0.05 ? '거의 원' : '타원'}으로 (이심률 ${cls.el.e.toFixed(2)})` : `벗어남 — 탈출 속력 ${ve.toFixed(2)} km/s를 넘었어요`;
    $('#obs').innerHTML = `<b>${obs}</b><br><span class="muted small">이 고도·질량의 원궤도 속력 ${vc.toFixed(2)} · 탈출 속력 ${ve.toFixed(2)} km/s</span>`;
    view.show({ kind: cls.kind, sim, el: cls.el, scale: 'auto', muScale: mu }, true); $('#playBtn').textContent = '⏸ 일시정지'; };
  ['lh', 'lv', 'la', 'lm'].forEach((id) => $('#' + id).addEventListener('input', run));
  $('#playBtn').addEventListener('click', () => { $('#playBtn').textContent = view.toggle() ? '⏸ 일시정지' : '▶ 재생'; });
  document.querySelectorAll('.rate').forEach((b) => b.addEventListener('click', () => view.setRate(Number(b.dataset.r))));
  $('#vecs').addEventListener('change', (e) => { view.vectors = e.target.checked; view.draw(); });
  run(); store.log('lab', {});
}

// ---------------- ACCOUNT
if (account.current()) store.sync().catch(() => {});
