// Patient-facing AI assistant (Vercel serverless function).
// Needs ANTHROPIC_API_KEY in the Vercel project's environment variables.
// Without it the app falls back to its built-in rule-based guidance.
const SPECS = ['gp', 'cardio', 'derm', 'ortho', 'peds', 'gyn', 'ent', 'neuro', 'gastro', 'psych', 'ophth', 'uro'];

const SYSTEM = `You are the patient assistant of a hospital app. You help people decide where to get care, book the right specialty, and answer practical questions (preparing for visits, what to bring, how the app works).

Rules:
- You never diagnose and never prescribe or give drug doses beyond "as per the label".
- If anything could be an emergency (chest pain, stroke signs, severe breathing trouble, heavy bleeding, loss of consciousness, suicidal thoughts, anaphylaxis, a baby under 3 months with fever), set level 1 and tell them to call the emergency number now.
- When unsure between two levels, choose the more urgent one.
- Ask at most one short follow-up question per reply. Keep replies under 90 words, plain language, warm and calm.
- Never claim to see their records or real appointment availability.

Reply ONLY with JSON: {"text": string, "level": 1|2|3|4|null, "spec": one of ${JSON.stringify(SPECS)} or null}
level: 1 emergency now, 2 urgent within hours, 3 see a doctor in 1-3 days, 4 self-care, null if not a symptom question.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'Assistant not configured' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length) return res.status(400).json({ error: 'No message' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ASSISTANT_MODEL || 'claude-sonnet-5-5',
        max_tokens: 400,
        system: SYSTEM,
        messages
      })
    });
    if (!r.ok) return res.status(502).json({ error: 'Upstream ' + r.status });
    const j = await r.json();
    const raw = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    let out;
    try { out = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); }
    catch { out = { text: raw, level: null, spec: null }; }
    const level = [1, 2, 3, 4].includes(out.level) ? out.level : null;
    const spec = SPECS.includes(out.spec) ? out.spec : null;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ text: String(out.text || '').slice(0, 1500), level, spec });
  } catch (e) {
    return res.status(502).json({ error: 'Assistant unavailable' });
  }
};
