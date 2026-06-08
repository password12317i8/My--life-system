module.exports = async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const callGemini = async (gbody) => {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(gbody)
    });
    const data = await r.json();
    return { ok: r.ok, status: r.status, data };
  };
  try {
    if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY yok' });
    if (req.method === 'GET') {
      const t = await callGemini({ contents: [{ role: 'user', parts: [{ text: 'Salam diy' }] }] });
      return res.status(200).json({ test: true, model: model, keyStartsWith: key.slice(0, 4), geminiStatus: t.status, ok: t.ok, geminiResponse: t.data });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
    b = b || {};
    const sys = b.system || '';
    const contents = (b.messages || []).map(m => ({
      role: (m.role === 'assistant' || m.role === 'ai') ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }]
    }));
    const gbody = { contents, generationConfig: { maxOutputTokens: b.max_tokens || 900 } };
    if (sys) gbody.systemInstruction = { parts: [{ text: sys }] };
    const t = await callGemini(gbody);
    if (!t.ok) return res.status(t.status).json({ error: t.data.error || t.data });
    const cand = (t.data.candidates || [])[0] || {};
    const parts = (cand.content || {}).parts || [];
    const text = parts.map(p => p.text || '').join('');
    res.status(200).json({ content: [{ type: 'text', text: text }] });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
