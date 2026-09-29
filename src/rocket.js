import * as store from './store.js';
import { ROCKET_ACTIVITY as activity } from './content.js';
import { confetti, sound } from './fx.js';

// 별도 문서로 원본 3D 장면과 스타일을 격리하고, 탐구 기록은 기존 저장소에 연결해요.
export function mountRocket(root) {
  root.innerHTML = `<div class="wrap rocket-wrap"><section class="panel rocket-intro"><div class="eyebrow">예측 → 발사 → 관찰 → 설명 카드</div><h1>${activity.title}</h1><p>${activity.question}</p><p class="small muted">${activity.note}</p></section>
    <div class="rocket-layout"><section class="panel rocket-study">
      <fieldset id="rocketSetup"><legend>① 조건 하나를 바꾸고 예측해요</legend>
        <label for="rocketFuel">2단에 싣는 연료 <output id="rocketFuelOut">100%</output></label>
        <input id="rocketFuel" type="range" min="20" max="100" step="10" value="100">
        <p class="small muted">1단 연료·엔진·비행 방향 조절 방식은 같아요.</p>
        <div class="rocket-choices">${activity.choices.map(c => `<label class="choice"><input type="radio" name="rocketPrediction" value="${c.id}"> ${c.label}</label>`).join('')}</div>
        <label for="rocketReason">왜 그렇게 생각했나요? (선택)</label><textarea id="rocketReason" class="reason" maxlength="500" placeholder="내 생각을 한 줄 적어요"></textarea>
      </fieldset>
      <button id="rocketLaunch" class="primary" disabled>3D 장면 준비 중…</button>
      <p id="rocketStatus" role="status" aria-live="polite" class="small muted">지구와 로켓을 만들고 있어요.</p>
      <button id="rocketRetry" class="secondary hidden">장면 다시 불러오기</button>
      <section id="rocketResult" class="hidden"><h2>③ 결과를 설명해요</h2><p id="rocketVerdict" class="verdict"></p><p id="rocketObservation"></p><p class="bubble ai">${activity.coach}</p>
        <label for="rocketExplain">실험을 보고 새롭게 알게 된 점</label><textarea id="rocketExplain" class="reason" maxlength="1000" placeholder="예측과 결과를 비교해 내 말로 적어요"></textarea>
        <label for="rocketNext">다음에 바꿔 볼 연료량과 예상 결과</label><input id="rocketNext" class="reason" maxlength="500" placeholder="연료를 …%로 바꾸면 …">
        <button id="rocketSave" class="primary" disabled>발사 탐구 카드 수집하기</button><p id="rocketSaved" role="status"></p>
      </section><button id="rocketReset" class="secondary" disabled>조건 바꿔 다시 실험하기</button><a href="#report">부모 리포트에서 기록 보기 →</a>
    </section><section class="rocket-stage"><h2 class="small">② 발사부터 궤도까지 관찰해요</h2><iframe id="rocketFrame" title="로켓 발사 3D 시뮬레이션" allow="autoplay; fullscreen" allowfullscreen></iframe><p class="small muted">장면 안에서 1·10·100배속과 카메라를 바꿀 수 있어요. 3D를 표시하려면 WebGL이 필요해요.</p></section></div></div>`;
  const $ = id => root.querySelector('#' + id), frame = $('rocketFrame');
  let ready = false, running = false, trial = null, result = null, saved = false;
  const post = (type, data = {}) => frame.contentWindow?.postMessage({ channel: 'astrobox-rocket', type, ...data }, location.origin);
  const choice = () => root.querySelector('input[name="rocketPrediction"]:checked')?.value;
  function arm() {
    if (running || result) return;
    $('rocketFuelOut').textContent = $('rocketFuel').value + '%';
    $('rocketLaunch').disabled = !ready || !choice();
    $('rocketLaunch').textContent = ready ? (choice() ? '🚀 이 조건으로 발사하기' : '먼저 예측을 골라요') : '3D 장면 준비 중…';
    if (ready && choice()) post('arm', { fuel: Number($('rocketFuel').value) });
  }
  $('rocketSetup').addEventListener('change', arm); $('rocketFuel').addEventListener('input', arm);
  $('rocketLaunch').onclick = () => { if (ready && choice() && !running && !result) { post('arm', { fuel: Number($('rocketFuel').value) }); post('launch'); } };
  $('rocketReset').onclick = () => post('reset');
  $('rocketRetry').onclick = () => location.reload();
  $('rocketExplain').oninput = () => { $('rocketSave').disabled = !result || saved || $('rocketExplain').value.trim().length < 5; };
  $('rocketSave').onclick = () => {
    const explanation = $('rocketExplain').value.trim(); if (!result || saved || explanation.length < 5) return;
    store.addCard({ mission: activity.id, title: `${activity.title} · 2단 연료 ${trial.fuel}%`, initial: `${activity.choices.find(c => c.id === trial.choice).label}${trial.reason ? ' — ' + trial.reason : ''}`, observation: result.observation, explanation, next: $('rocketNext').value.trim(), verdict: result.verdict, value: trial.fuel });
    saved = true; $('rocketSave').disabled = true; $('rocketSaved').textContent = '🏅 발사 탐구 카드를 모았어요! 부모 리포트에도 남았어요.'; confetti(window.innerWidth / 2, window.innerHeight / 3, 80); sound.win();
  };
  const waitTimer = setTimeout(() => { if (!ready) { $('rocketStatus').textContent = '3D 준비가 지연되고 있어요. 인터넷 연결과 브라우저의 WebGL 지원을 확인하고 다시 불러와 주세요.'; $('rocketRetry').classList.remove('hidden'); } }, 30000);
  function receive(e) {
    if (e.origin !== location.origin || e.source !== frame.contentWindow || e.data?.channel !== 'astrobox-rocket') return;
    const d = e.data;
    if (d.type === 'ready') { clearTimeout(waitTimer); ready = true; $('rocketRetry').classList.add('hidden'); $('rocketStatus').textContent = '준비됐어요. 연료량을 정하고 결과를 예측해요.'; $('rocketReset').disabled = false; arm(); }
    if (d.type === 'started' && !running && !result && choice()) {
      running = true; trial = { fuel: Number($('rocketFuel').value), choice: choice(), reason: $('rocketReason').value.trim() };
      $('rocketSetup').disabled = true; $('rocketLaunch').disabled = true; $('rocketStatus').textContent = '비행 중이에요. 단 분리와 가장 낮은 궤도 높이를 관찰해요.';
      store.log('experiment', { mission: activity.id, value: trial.fuel, choice: trial.choice });
      if (window.innerWidth <= 900) root.querySelector('.rocket-stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (d.type === 'result' && running && !result && ['ORBIT', 'FAIL', 'CRASH'].includes(d.phase) && [d.altitude, d.perigee, d.apogee, d.time].every(Number.isFinite)) {
      running = false; const kind = d.phase === 'ORBIT' ? 'orbit' : 'fail', verdict = kind === trial.choice ? 'supported' : 'refuted';
      const observation = `2단 연료 ${trial.fuel}% · ${kind === 'orbit' ? '궤도 진입' : '궤도 진입 실패'} · 판정 시 고도 ${d.altitude.toFixed(1)} km · 근지점 ${d.perigee.toFixed(1)} km / 원지점 ${d.apogee.toFixed(1)} km (근사)${d.perigee < 0 ? ' — 근지점이 지표면 아래라 지구와 부딪히는 경로예요.' : ''}`;
      result = { verdict, observation }; store.log('judge', { mission: activity.id, verdict, choice: trial.choice, value: trial.fuel, kind });
      $('rocketResult').classList.remove('hidden'); $('rocketVerdict').textContent = verdict === 'supported' ? '예측과 계산 결과가 같아요!' : '예측과 다른 결과예요. 어떤 점이 달랐나요?'; $('rocketVerdict').className = 'verdict ' + (verdict === 'supported' ? 'ok' : 'no'); $('rocketObservation').textContent = observation; $('rocketStatus').textContent = '실험이 끝났어요. 내 말로 설명하고 카드를 모아요.';
      if (window.innerWidth <= 900) $('rocketResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (verdict === 'supported') { confetti(window.innerWidth / 2, window.innerHeight / 3, 60); sound.win(); }
    }
    if (d.type === 'reset') {
      running = false; trial = null; result = null; saved = false; $('rocketSetup').disabled = false;
      root.querySelectorAll('input[name="rocketPrediction"]').forEach(el => el.checked = false);
      for (const id of ['rocketReason', 'rocketExplain', 'rocketNext']) $(id).value = '';
      $('rocketResult').classList.add('hidden'); $('rocketSave').disabled = true; $('rocketSaved').textContent = ''; $('rocketStatus').textContent = '연료량을 바꾸고 다시 예측해요.'; arm();
    }
  }
  window.addEventListener('message', receive); frame.src = 'rocket/index.html';
  // 다른 화면으로 가면 iframe과 함께 WebGL·사운드를 종료해요.
  return () => { clearTimeout(waitTimer); window.removeEventListener('message', receive); frame.remove(); };
}
