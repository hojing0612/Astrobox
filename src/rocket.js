import * as store from './store.js';
import { ROCKET_ACTIVITY as activity, ROCKET_MILESTONES, ROCKET_OUTCOMES } from './content.js';
import { confetti, sound } from './fx.js';

// 예측 → 관찰 → 결과. 현재 단계의 행동만 보여 주고 3D 장면은 계속 유지해요.
export function mountRocket(root) {
  root.innerHTML = `<div class="wrap rocket-wrap" data-phase="prepare">
    <header class="rocket-heading"><h1>🚀 ${activity.title}</h1><ol class="rocket-steps" aria-label="탐구 순서"><li data-step="prepare" aria-current="step">1 예측</li><li data-step="flight">2 발사</li><li data-step="result">3 발견</li></ol></header>
    <div class="rocket-layout">
      <section class="rocket-stage" aria-label="로켓 관찰"><iframe id="rocketFrame" title="로켓 발사 3D 시뮬레이션" allow="autoplay; fullscreen" allowfullscreen></iframe></section>
      <section class="panel rocket-study" aria-label="지금 할 일">
        <div id="rocketPrepare"><fieldset id="rocketSetup"><legend>${activity.question}</legend>
          <label class="rocket-fuel-label" for="rocketFuel">2단 연료 <output id="rocketFuelOut">100%</output></label><input id="rocketFuel" type="range" min="20" max="100" step="10" value="100">
          <div class="rocket-choices">${activity.choices.map(c => `<label class="choice"><input type="radio" name="rocketPrediction" value="${c.id}"> ${c.label}</label>`).join('')}</div>
          </fieldset><button id="rocketLaunch" class="primary" disabled>3D 장면 준비 중…</button>
          <details class="rocket-optional" id="rocketReasonBox"><summary>내 예측의 이유도 적을래요 (선택)</summary><label class="small" for="rocketReason">왜 그렇게 생각했나요?</label><textarea id="rocketReason" class="reason" maxlength="500" placeholder="틀려도 괜찮아요"></textarea></details>
        </div>
        <div id="rocketFlight" hidden><div class="eyebrow">지금은 관찰할 시간</div><h2 id="rocketFlightTitle" tabindex="-1">로켓을 따라가요!</h2><p id="rocketMoment" class="rocket-moment" role="status" aria-live="polite">${ROCKET_MILESTONES.count}</p><div class="rocket-speed" role="group" aria-label="관찰 속도"><span>빠르게 보기</span><button class="secondary" data-rocket-speed="1" aria-pressed="false">1×</button><button class="secondary" data-rocket-speed="10" aria-pressed="true">10×</button><button class="secondary" data-rocket-speed="100" aria-pressed="false">100×</button></div><p class="small muted" id="rocketSpeedNote">발사 장면은 천천히, 상승하면 10배속으로 봐요.</p><button id="rocketReset" class="rocket-text-button">멈추고 처음부터</button></div>
        <section id="rocketResult" hidden><div class="eyebrow">이번 실험에서 발견했어요</div><h2 id="rocketOutcome" tabindex="-1"></h2><p id="rocketPrediction" class="small muted"></p><p id="rocketVerdict" class="rocket-feedback"></p><p id="rocketComparison" class="small" hidden></p>
          <button id="rocketNextTrial" class="primary"></button><button id="rocketWriteCard" class="secondary">내 발견을 카드로 남기기</button>
          <details class="rocket-optional"><summary>결과 숫자와 관찰 힌트 보기</summary><p id="rocketObservation" class="small"></p><p class="small">${activity.coach}</p></details>
        </section>
        <section id="rocketCard" hidden><div class="eyebrow">내 말로 남기는 발견 카드</div><h2 id="rocketCardTitle" tabindex="-1">무엇을 발견했나요?</h2><label for="rocketExplain">내 예측과 실제 결과를 비교해 봐요</label><textarea id="rocketExplain" class="reason" maxlength="1000" placeholder="처음에는 …라고 생각했는데, 발사해 보니 …"></textarea><details class="rocket-optional"><summary>다음 실험 계획도 적기 (선택)</summary><label for="rocketNext">다음에 바꿔 볼 연료와 예상 결과</label><input id="rocketNext" class="reason" maxlength="500" placeholder="연료를 …%로 바꾸면 …"></details><button id="rocketSave" class="primary" disabled>🏅 발견 카드 모으기</button><p id="rocketSaved" role="status"></p><button id="rocketBackResult" class="rocket-text-button">결과로 돌아가기</button></section>
        <p id="rocketStatus" role="status" aria-live="polite" class="small muted">지구와 로켓을 만들고 있어요.</p><button id="rocketRetry" class="secondary" hidden>장면 다시 불러오기</button>
      </section>
    </div>
    <footer class="rocket-footnote"><details><summary>교육용 근사 모형 · 자세히 보기</summary><p>${activity.note}</p><p>1단 연료·엔진·비행 방향 조절 방식은 같아요. 3D 화면에는 인터넷 연결과 WebGL이 필요해요.</p></details><a href="#report">내 기록 보기 →</a></footer>
  </div>`;
  const $ = id => root.querySelector('#' + id), frame = $('rocketFrame'), shell = root.querySelector('.rocket-wrap');
  let ready = false, running = false, trial = null, result = null, saved = false, phase = 'prepare', lastResult = null, nextFuel = null;
  const post = (type, data = {}) => frame.contentWindow?.postMessage({ channel: 'astrobox-rocket', type, ...data }, location.origin);
  const choice = () => root.querySelector('input[name="rocketPrediction"]:checked')?.value;
  const moveFocus = id => { $(id).focus({ preventScroll: true }); if (window.innerWidth <= 900) $(id).scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  function showPhase(next) {
    phase = next; shell.dataset.phase = next;
    for (const [id, name] of [['rocketPrepare', 'prepare'], ['rocketFlight', 'flight'], ['rocketResult', 'result'], ['rocketCard', 'card']]) $(id).hidden = next !== name;
    root.querySelectorAll('[data-step]').forEach(el => { if (el.dataset.step === (next === 'card' ? 'result' : next)) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); });
    $('rocketStatus').hidden = next !== 'prepare';
  }
  function arm() {
    if (phase !== 'prepare') return;
    $('rocketFuelOut').textContent = $('rocketFuel').value + '%'; $('rocketLaunch').disabled = !ready || !choice();
    $('rocketLaunch').textContent = ready ? (choice() ? '🚀 발사!' : '예측을 고르면 발사할 수 있어요') : '3D 장면 준비 중…';
    if (ready && choice()) post('arm', { fuel: Number($('rocketFuel').value) });
  }
  $('rocketSetup').addEventListener('change', arm); $('rocketFuel').addEventListener('input', arm);
  $('rocketLaunch').onclick = () => { if (ready && choice() && phase === 'prepare') { post('arm', { fuel: Number($('rocketFuel').value) }); post('launch'); } };
  $('rocketReset').onclick = () => post('reset');
  $('rocketNextTrial').onclick = () => { if (!result) return; nextFuel = trial.fuel >= 60 ? trial.fuel - 20 : trial.fuel + 20; post('reset'); };
  $('rocketWriteCard').onclick = () => { if (!result) return; showPhase('card'); moveFocus('rocketCardTitle'); };
  $('rocketBackResult').onclick = () => { showPhase('result'); moveFocus('rocketOutcome'); };
  $('rocketRetry').onclick = () => location.reload();
  root.querySelectorAll('[data-rocket-speed]').forEach(b => b.onclick = () => post('speed', { speed: Number(b.dataset.rocketSpeed) }));
  $('rocketExplain').oninput = () => { $('rocketSave').disabled = !result || saved || $('rocketExplain').value.trim().length < 5; };
  $('rocketSave').onclick = () => {
    const explanation = $('rocketExplain').value.trim(); if (!result || saved || explanation.length < 5) return;
    store.addCard({ mission: activity.id, title: `${activity.title} · 2단 연료 ${trial.fuel}%`, initial: `${activity.choices.find(c => c.id === trial.choice).label}${trial.reason ? ' — ' + trial.reason : ''}`, observation: result.observation, explanation, next: $('rocketNext').value.trim(), verdict: result.verdict, value: trial.fuel });
    saved = true; $('rocketSave').disabled = true; $('rocketSaved').textContent = '🏅 발견 카드를 모았어요! 내 기록에서도 볼 수 있어요.'; $('rocketWriteCard').textContent = '모은 발견 카드 보기'; confetti(window.innerWidth / 2, window.innerHeight / 3, 80); sound.win();
  };
  const waitTimer = setTimeout(() => { if (!ready) { $('rocketStatus').textContent = '준비가 늦어지고 있어요. 인터넷 연결을 확인하고 다시 불러와 주세요.'; $('rocketRetry').hidden = false; } }, 30000);
  function receive(e) {
    if (e.origin !== location.origin || e.source !== frame.contentWindow || e.data?.channel !== 'astrobox-rocket') return;
    const d = e.data;
    if (d.type === 'ready') { clearTimeout(waitTimer); ready = true; $('rocketRetry').hidden = true; $('rocketStatus').textContent = '연료를 정하고, 어떻게 될지 골라 봐요.'; arm(); }
    if (d.type === 'started' && phase === 'prepare' && choice()) {
      running = true; trial = { fuel: Number($('rocketFuel').value), choice: choice(), reason: $('rocketReason').value.trim() };
      $('rocketSetup').disabled = true; $('rocketLaunch').disabled = true; $('rocketMoment').textContent = ROCKET_MILESTONES.count; showPhase('flight');
      store.log('experiment', { mission: activity.id, value: trial.fuel, choice: trial.choice });
      if (window.innerWidth <= 900) root.querySelector('.rocket-heading').scrollIntoView({ block: 'start', behavior: 'smooth' });
      $('rocketFlightTitle').focus({ preventScroll: true });
    }
    if (d.type === 'milestone' && running && Object.hasOwn(ROCKET_MILESTONES, d.event)) $('rocketMoment').textContent = ROCKET_MILESTONES[d.event];
    if (d.type === 'speed' && [1, 10, 100].includes(d.speed)) { root.querySelectorAll('[data-rocket-speed]').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.rocketSpeed) === d.speed)); $('rocketSpeedNote').textContent = d.guided ? '발사 장면은 천천히, 상승하면 10배속으로 봐요.' : `지금 ${d.speed}배속으로 관찰하고 있어요.`; }
    if (d.type === 'result' && running && !result && ['ORBIT', 'FAIL', 'CRASH'].includes(d.phase) && [d.altitude, d.perigee, d.apogee, d.time].every(Number.isFinite)) {
      running = false; const kind = d.phase === 'ORBIT' ? 'orbit' : 'fail', verdict = kind === trial.choice ? 'supported' : 'refuted';
      const observation = `2단 연료 ${trial.fuel}% · ${kind === 'orbit' ? '궤도 진입' : '궤도 진입 실패'} · 판정 시 높이 ${d.altitude.toFixed(1)} km · 가장 낮은 궤도 높이 ${d.perigee.toFixed(1)} km / 가장 높은 궤도 높이 ${d.apogee.toFixed(1)} km (근사)${d.perigee < 0 ? ' — 가장 낮은 높이가 지표면 아래라 지구와 부딪히는 경로예요.' : ''}`;
      result = { verdict, observation, kind, fuel: trial.fuel }; store.log('judge', { mission: activity.id, verdict, choice: trial.choice, value: trial.fuel, kind });
      $('rocketOutcome').textContent = ROCKET_OUTCOMES[kind]; $('rocketPrediction').textContent = `내 예측: ${activity.choices.find(c => c.id === trial.choice).label} · 연료 ${trial.fuel}%`;
      $('rocketVerdict').textContent = verdict === 'supported' ? '예측과 같네요! 연료를 바꿔도 같을까요?' : '예측과 달랐네요! 어떤 조건을 바꿔 볼까요?'; $('rocketObservation').textContent = observation;
      $('rocketComparison').hidden = !lastResult;
      if (lastResult) $('rocketComparison').textContent = `지난번 ${lastResult.fuel}% → ${lastResult.kind === 'orbit' ? '궤도 진입' : '진입 못 함'} / 이번 ${trial.fuel}% → ${kind === 'orbit' ? '궤도 진입' : '진입 못 함'}`;
      $('rocketNextTrial').textContent = `연료를 ${trial.fuel >= 60 ? trial.fuel - 20 : trial.fuel + 20}%로 ${trial.fuel >= 60 ? '줄여' : '늘려'} 다시 해볼까요?`;
      showPhase('result'); moveFocus('rocketOutcome');
      if (verdict === 'supported') { confetti(window.innerWidth / 2, window.innerHeight / 3, 60); sound.win(); }
    }
    if (d.type === 'reset') {
      if (result) lastResult = result; running = false; trial = null; result = null; saved = false; $('rocketSetup').disabled = false;
      if (nextFuel !== null) { $('rocketFuel').value = nextFuel; nextFuel = null; }
      root.querySelectorAll('input[name="rocketPrediction"]').forEach(el => el.checked = false);
      for (const id of ['rocketReason', 'rocketExplain', 'rocketNext']) $(id).value = '';
      root.querySelectorAll('details').forEach(el => el.open = false);
      $('rocketSave').disabled = true; $('rocketSaved').textContent = ''; $('rocketWriteCard').textContent = '내 발견을 카드로 남기기'; $('rocketStatus').textContent = '이번에는 어떻게 될까요? 다시 예측해요.';
      showPhase('prepare'); arm(); $('rocketFuel').focus({ preventScroll: true });
      if (window.innerWidth <= 900) root.querySelector('.rocket-heading').scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }
  window.addEventListener('message', receive); frame.src = 'rocket/index.html';
  return () => { clearTimeout(waitTimer); window.removeEventListener('message', receive); frame.remove(); };
}
