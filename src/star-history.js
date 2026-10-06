import { stagesFor } from './starlife.js';
import { STAR_PHOTOS, STAR_STAGE_DETAILS } from './content.js';

const photoKey = name => name === '원시별' ? 'proto' : name.startsWith('주계열') ? 'sun' : name === '적색거성' ? 'giant' : name === '적색초거성' ? 'supergiant' : name.includes('초신성') ? 'sn' : name === '중성자별' ? 'ns' : name === '블랙홀' ? 'bh' : name === '불이 붙지 않음' ? 'brown' : 'ring';

// 진행과 복습을 분리해서 과거를 클릭해도 미래 단계가 열리거나 판정이 반복되지 않아요.
export function mountStarHistory(host, view, onSelect) {
  host.innerHTML = `<style>
    .star-detail[hidden]{display:none}
    .star-path{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:16px 0}
    .star-path button{border:1px solid #8895ad;border-radius:18px;background:transparent;color:inherit;padding:8px 12px;cursor:pointer;opacity:.5;transition:opacity .2s}
    .star-path button[aria-pressed="true"]{opacity:1;background:#e7f1ff;color:#163b6f;border-color:#5aa9ff;font-weight:700}
    .star-path button:focus-visible{outline:3px solid #5aa9ff;outline-offset:3px}
    #starHistory{margin-bottom:24px}
    .star-detail{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;border-top:1px solid #8895ad44;padding-top:16px}
    .star-detail figure{margin:0;min-width:0}.star-detail img{width:100%;height:210px;object-fit:contain;background:#050814;border-radius:12px}
    .star-detail figcaption{font-size:12px;line-height:1.6;margin-top:6px}.star-detail h3{margin:0 0 8px}.star-detail p{line-height:1.65}
    @media(max-width:600px){.star-detail{grid-template-columns:1fr}.star-detail img{height:190px}}
  </style><nav class="star-path" aria-label="지나온 별의 단계"></nav><div class="star-detail" hidden></div><button class="secondary star-resume" hidden type="button">▶ 이어서 보기</button><p class="small muted star-hint">일생을 시작하면 지나온 단계가 하나씩 나타나요.</p>`;
  const path = host.querySelector('.star-path'), detail = host.querySelector('.star-detail'), resume = host.querySelector('.star-resume'), hint = host.querySelector('.star-hint');
  let reached = -1, selected = -1, savedProgress = null, finished = false;
  function show(i) {
    const stages = stagesFor(view.m), st = stages[i], photo = STAR_PHOTOS[photoKey(st.name)];
    selected = i;
    path.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    detail.hidden = false; detail.replaceChildren();
    const text = document.createElement('div'), title = document.createElement('h3');
    title.textContent = st.name; text.append(title);
    const key = st.name.includes('아주 천천히') ? 'small' : st.name === '백색왜성' ? 'wd' : photoKey(st.name);
    const paragraphs = [...STAR_STAGE_DETAILS[key]];
    if (st.name === '백색왜성' && view.m < 0.5) paragraphs.unshift('이 별의 백색왜성 단계는 아주 먼 미래의 예측이에요. 아직 수명을 다한 적색왜성은 관측되지 않았어요.');
    for (const paragraph of paragraphs) { const description = document.createElement('p'); description.textContent = paragraph; text.append(description); }
    const figure = document.createElement('figure'), img = document.createElement('img'), caption = document.createElement('figcaption'), source = document.createElement('a');
    img.src = photo.image; img.alt = photo.caption; img.decoding = 'async';
    caption.textContent = photo.caption + ' · ' + photo.credit + ' ';
    source.href = photo.source; source.target = '_blank'; source.rel = 'noopener noreferrer'; source.textContent = '사진 출처 ↗'; caption.append(source);
    img.addEventListener('error', () => { img.hidden = true; caption.prepend('사진을 불러오지 못했어요. 출처에서 볼 수 있어요. '); }, {once:true});
    figure.append(img, caption); detail.append(text, figure); onSelect(st, i, stages.length);
  }
  path.addEventListener('click', e => {
    const button = e.target.closest('button[data-stage]'); if (!button) return;
    const i = Number(button.dataset.stage); if (i > reached) return;
    if (savedProgress === null) savedProgress = view.p;
    view.playing = false; view.parts = []; const st = stagesFor(view.m)[i]; view.p = (st.from + st.to) / 2; view.boomDone = false;
    show(i); resume.hidden = finished; hint.textContent = '지난 단계를 살펴보고 있어요. 이어서 보기를 누르면 멈춘 곳부터 계속해요.';
  });
  resume.addEventListener('click', () => {
    if (savedProgress === null || finished) return;
    view.p = savedProgress; savedProgress = null; view.parts = []; view.boomDone = false; view.playing = true; resume.hidden = true; show(reached); hint.textContent = '지나온 단계를 누르면 설명과 관측 사진을 다시 볼 수 있어요.';
  });
  return {
    reset() { reached = selected = -1; savedProgress = null; finished = false; path.replaceChildren(); detail.hidden = true; resume.hidden = true; hint.textContent = '일생을 시작하면 지나온 단계가 하나씩 나타나요.'; },
    advance(st, i) {
      const stages = stagesFor(view.m);
      for (let k = reached + 1; k <= i; k++) { if (k) { const arrow = document.createElement('span'); arrow.textContent = '→'; arrow.setAttribute('aria-hidden','true'); path.append(arrow); } const button = document.createElement('button'); button.type = 'button'; button.dataset.stage = String(k); button.textContent = stages[k].name; path.append(button); }
      reached = Math.max(reached, i); show(i); hint.textContent = '지나온 단계를 누르면 설명과 관측 사진을 다시 볼 수 있어요.';
    },
    complete() { finished = true; savedProgress = null; resume.hidden = true; },
  };
}
