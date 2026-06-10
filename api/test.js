// api/test.js — diagnostic endpoint, visit in browser to verify Gemini is working
// URL: https://your-app.vercel.app/api/test

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const apiKey = process.env.GEMINI_API_KEY;
  const report = {
    "1_api_key_set":    !!apiKey,
    "2_key_preview":    apiKey ? apiKey.slice(0, 10) + '...' : 'NOT SET — add GEMINI_API_KEY in Vercel Settings → Environment Variables',
    "3_model_call":     null,
    "4_search_tool":    null,
    "5_ready_for_june11": false,
  };

  if (!apiKey) return res.status(200).json(report);

  const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  // ── Test 1: Basic model call (no search) ────────────────────────────────
  try {
    const r = await fetch(`${BASE}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK' }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });
    const d = await r.json();
    if (r.ok) {
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '(no text)';
      report['3_model_call'] = `✅ Working — model replied: "${text.trim()}"`;
    } else {
      report['3_model_call'] = `❌ Error ${r.status}: ${d.error?.message || JSON.stringify(d.error)}`;
    }
  } catch (e) {
    report['3_model_call'] = `❌ Exception: ${e.message}`;
  }

  // ── Test 2: Model + Google Search tool ──────────────────────────────────
  try {
    const r = await fetch(`${BASE}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'What is todays date? One sentence.' }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 50 },
      }),
    });
    const d = await r.json();
    if (r.ok) {
      const text = d.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || '(no text)';
      report['4_search_tool'] = `✅ Working — replied: "${text.trim().slice(0, 100)}"`;
    } else {
      report['4_search_tool'] = `❌ Error ${r.status}: ${d.error?.message || JSON.stringify(d.error)}`;
    }
  } catch (e) {
    report['4_search_tool'] = `❌ Exception: ${e.message}`;
  }

  // ── Overall verdict ──────────────────────────────────────────────────────
  report['5_ready_for_june11'] =
    report['3_model_call'].startsWith('✅') &&
    report['4_search_tool'].startsWith('✅');

  return res.status(200).json(report);
}
