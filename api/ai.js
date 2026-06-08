// My Life System — AI backend (Groq proxy, Anthropic-shaped response)
const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const KEY = process.env.GROQ_API_KEY;
  if (!KEY) { res.status(500).json({ error: 'GROQ_API_KEY yok' }); return; }

  // Yeňil GET — Groq-y cagyrmayar (cak iymeyar)
  if (req.method === 'GET') {
    res.status(200).json({ ok: true, provider: 'groq', keyStartsWith: KEY.slice(0, 4), models: MODELS });
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method' }); return; }

  let body = req.body;
  if (!body || typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
  const system = body.system || '';
  const msgs = (body.messages || []).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: typeof m.content === 'string' ? m.content : (m.content || []).map(c => c.text || '').join('\n')
  }));
  const messages = system ? [{ role: 'system', content: system }, ...msgs] : msgs;
  const maxTok = body.max_tokens || 900;

  let lastErr = '';
  for (const model of MODELS) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
        body: JSON.stringify({ model, messages, max_tokens: maxTok, temperature: 0.8 })
      });
      if (r.status === 429) { lastErr = '429 ' + model; continue; }
      const data = await r.json();
      if (!r.ok) { lastErr = (data.error && data.error.message) || ('HTTP ' + r.status); continue; }
      const text = (((data.choices || [])[0] || {}).message || {}).content || '';
      res.status(200).json({ content: [{ type: 'text', text: text || '(bos jogap)' }], _model: model });
      return;
    } catch (e) { lastErr = String(e); }
  }
  res.status(503).json({ error: 'Groq elyeterli dal', detail: lastErr });
};
