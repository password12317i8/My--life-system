module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY yok' });
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
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
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + key, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(gbody)
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error || data });
    const cand = (data.candidates || [])[0] || {};
    const parts = (cand.content || {}).parts || [];
    const text = parts.map(p => p.text || '').join('');
    res.status(200).json({ content: [{ type: 'text', text: text }] });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
