module.exports = async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY yok' });
  const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash-lite', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  const call = async (model, body) => {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body)
    });
    return { r, d: await r.json() };
  };
  try {
    if (req.method === 'GET') {
      const out = [];
      for (const m of MODELS) {
        try { const { r } = await call(m, { contents: [{ role: 'user', parts: [{ text: 'hi' }] }] }); out.push(m + ' = ' + r.status); }
        catch (e) { out.push(m + ' = ERR'); }
      }
      return res.status(200).json({ keyStartsWith: key.slice(0, 4), results: out });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
    b = b || {};
    const contents = (b.messages || []).map(m => ({ role: (m.role === 'assistant' || m.role === 'ai') ? 'model' : 'user', parts: [{ text: String(m.content || '') }] }));
    const body = { contents };
    if (b.system) body.systemInstruction = { parts: [{ text: b.system }] };
    let last;
    for (const m of MODELS) {
      const { r, d } = await call(m, body);
      if (r.ok) {
        const text = (((d.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || '').join('') || '';
        return res.status(200).json({ content: [{ type: 'text', text }] });
      }
      last = d.error || d;
    }
    res.status(429).json({ error: last });
  } catch (e) { res.status(500).json({ error: String(e) }); }
};
