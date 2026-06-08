// My Life System — AI backend
// Gemini ilki (turkmen dili iN gowy), cak dolsa Groq-a gecyar. Berk turkmen dil talaby.

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const GROQ_MODELS = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

const TM = "MOHUM DIL TALABY: Jogaby DINE arassa, dogry, edebi turkmen dilinde yaz. Turkmen elipbiyinin harplaryny dogry ulan: a, aa(a), b, c(ch), d, e, a(ae), f, g, h, i, j, z(zh), k, l, m, n, n(ng), o, o(oe), p, r, s, s(sh), t, u, u(ue), w, y, y(yy), z. Rus, inlis ya turk sozlerini garysdyrma we terjime etme. Sozlemler grammatika we many taydan dogry, tebigy, dusnukli bolsun.";

async function tryGemini(key, system, userText, maxTok) {
  for (const model of GEMINI_MODELS) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }],
          generationConfig: { maxOutputTokens: maxTok, temperature: 0.8 }
        })
      });
      if (!r.ok) continue;
      const d = await r.json();
      const c = (((d.candidates || [])[0] || {}).content || {});
      const t = (c.parts || []).map(p => p.text || '').join('');
      if (t) return { text: t, via: 'gemini:' + model };
    } catch (e) {}
  }
  return null;
}

async function tryGroq(key, messages, maxTok) {
  for (const model of GROQ_MODELS) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model, messages, max_tokens: maxTok, temperature: 0.8 })
      });
      if (!r.ok) continue;
      const d = await r.json();
      const t = (((d.choices || [])[0] || {}).message || {}).content || '';
      if (t) return { text: t, via: 'groq:' + model };
    } catch (e) {}
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const GKEY = process.env.GEMINI_API_KEY;
  const QKEY = process.env.GROQ_API_KEY;

  if (req.method === 'GET') {
    res.status(200).json({ ok: true, gemini: !!GKEY, groq: !!QKEY });
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method' }); return; }

  let body = req.body;
  if (!body || typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
  const baseSystem = body.system || '';
  const system = TM + "\n\n" + baseSystem;
  const userMsgs = (body.messages || []).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: typeof m.content === 'string' ? m.content : (m.content || []).map(c => c.text || '').join('\n')
  }));
  const userText = userMsgs.map(m => m.content).join('\n');
  const messages = [{ role: 'system', content: system }, ...userMsgs];
  const maxTok = body.max_tokens || 900;

  let out = null;
  if (GKEY) out = await tryGemini(GKEY, system, userText, maxTok);
  if (!out && QKEY) out = await tryGroq(QKEY, messages, maxTok);

  if (out) { res.status(200).json({ content: [{ type: 'text', text: out.text }], _via: out.via }); return; }
  res.status(503).json({ error: 'AI elyeterli dal (cak dolan ya acar yok)' });
};
