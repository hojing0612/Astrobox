// Vercel 서버리스 — Anthropic API로 되묻기 한 문장을 만든다. 키가 없으면 501을 돌려 클라이언트가 규칙 기반으로 넘어간다.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(501).json({ error: 'no key' });
  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { missionTitle, concept, stage, kind, observation, choice, reason, explanation, history = [] } = body || {};
  const system = `너는 초등 4~6학년 아이의 우주 실험 코치다. 규칙: (1) 절대 정답이나 설명을 알려주지 않는다. (2) 한 문장, 40자 안팎, 반말, 아이가 방금 한 말과 관찰 결과에 맞춰 되묻는다. (3) 숫자를 새로 만들지 않는다 — 주어진 관찰 문장의 숫자만 쓴다. (4) 아이가 '힘'처럼 뭉뚱그린 말을 쓰면 '속력'이나 '중력'으로 바꿔 말해 보게 유도한다. (5) 칭찬은 짧게, 질문이 중심. (6) 출력은 질문 한 문장만.`;
  const user = `미션: ${missionTitle} (개념: ${concept})\n단계: ${stage}\n실험 결과 종류: ${kind}\n관찰(코드가 계산): ${observation}\n아이의 예측 선택: ${choice ?? '-'}\n아이가 쓴 이유: ${reason ?? '-'}\n아이의 설명: ${explanation ?? '-'}\n이전 대화: ${history.map((h) => `${h.role}: ${h.text}`).join(' / ') || '-'}\n\n되물을 질문 한 문장:`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.COACH_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 120, system, messages: [{ role: 'user', content: user }] }) });
    if (!r.ok) return res.status(502).json({ error: 'upstream ' + r.status });
    const data = await r.json();
    const text = (data.content || []).map((c) => c.text || '').join('').trim().split('\n')[0];
    return res.status(200).json({ question: text });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
