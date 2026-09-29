// AI 코치 — 답을 주지 않고 되묻는다. 서버(/api/coach)가 있으면 LLM, 없으면 규칙 기반.
export async function askCoach({ mission, stage, result, choice, reason, explanation, history }) {
  const fallback = mission.coachRules(result);
  try {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch('/api/coach', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({ missionTitle: mission.title, concept: mission.concept, stage, kind: result.kind, observation: result.observation, choice, reason, explanation, history: (history || []).slice(-6) }) });
    clearTimeout(to);
    if (!res.ok) throw new Error('coach ' + res.status);
    const data = await res.json();
    if (data && typeof data.question === 'string' && data.question.trim()) return { question: data.question.trim(), source: 'llm' };
    throw new Error('empty');
  } catch (e) {
    return { question: fallback, source: 'rules' };
  }
}
