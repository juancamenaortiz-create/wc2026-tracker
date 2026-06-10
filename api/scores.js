// api/scores.js — Vercel serverless function
// Uses Google Gemini 2.0 Flash (free tier) with built-in Google Search.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // ── GET request = browser diagnostic test ────────────────────────────────
  // Visit https://your-app.vercel.app/api/scores in a browser to run the test
  if (req.method === 'GET') {
    const apiKey = process.env.GEMINI_API_KEY;
    const report = {
      "1_api_key_set":      !!apiKey,
      "2_key_preview":      apiKey ? apiKey.slice(0, 10) + '...' : 'NOT SET — add GEMINI_API_KEY in Vercel Settings → Environment Variables',
      "3_model_call":       null,
      "4_search_tool":      null,
      "5_ready_for_june11": false,
    };

    if (!apiKey) return res.status(200).json(report);

    const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    // Test 1: basic model (no search)
    try {
      const r = await fetch(`${BASE}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK' }] }], generationConfig: { maxOutputTokens: 10 } }),
      });
      const d = await r.json();
      report['3_model_call'] = r.ok
        ? `✅ Working — replied: "${d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}"`
        : `❌ Error ${r.status}: ${d.error?.message || JSON.stringify(d.error)}`;
    } catch (e) { report['3_model_call'] = `❌ Exception: ${e.message}`; }

    // Test 2: model + Google Search
    try {
      const r = await fetch(`${BASE}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'What is todays date? One sentence.' }] }], tools: [{ google_search: {} }], generationConfig: { maxOutputTokens: 50 } }),
      });
      const d = await r.json();
      const text = d.candidates?.[0]?.content?.parts?.find(p => p.text)?.text?.trim().slice(0, 120);
      report['4_search_tool'] = r.ok
        ? `✅ Working — replied: "${text}"`
        : `❌ Error ${r.status}: ${d.error?.message || JSON.stringify(d.error)}`;
    } catch (e) { report['4_search_tool'] = `❌ Exception: ${e.message}`; }

    report['5_ready_for_june11'] =
      typeof report['3_model_call'] === 'string' && report['3_model_call'].startsWith('✅') &&
      typeof report['4_search_tool'] === 'string' && report['4_search_tool'].startsWith('✅');

    return res.status(200).json(report);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const EMPTY = { content: [{ type: 'text', text: '{"groupMatches":[],"knockoutMatches":[]}' }] };

  // ── Pre-tournament guard ──────────────────────────────────────────────────
  // No matches exist before June 11 2026 — skip the API call entirely.
  const today = new Date();
  const tournamentStart = new Date('2026-06-11T00:00:00-05:00'); // CT midnight
  if (today < tournamentStart) {
    return res.status(200).json(EMPTY);
  }

  // ── API key check ─────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set');
    return res.status(200).json(EMPTY);
  }

  const todayStr = today.toISOString().split('T')[0];
  const prompt = `Search the web for the latest FIFA World Cup 2026 group stage match results as of today (${todayStr}).

Return ONLY a valid JSON object — no markdown, no backticks, no explanation:
{"groupMatches":[{"team1":"Mexico","team2":"South Africa","score1":2,"score2":1,"status":"FT","group":"A","date":"2026-06-11"}],"knockoutMatches":[]}

Rules:
- status must be exactly "FT" (finished), "LIVE" (in progress), or "NS" (not started)
- Only include FT or LIVE matches — skip NS matches entirely
- score1 and score2 must be integers
- If no matches have been played yet return: {"groupMatches":[],"knockoutMatches":[]}
- Return ONLY the JSON object. Nothing else.`;

  try {
    // gemini-2.0-flash uses the simple {"google_search":{}} syntax
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini error: ${response.status}`, errText);
      return res.status(200).json(EMPTY);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const fullText = parts.filter(p => p.text).map(p => p.text).join('\n');

    return res.status(200).json({
      content: [{ type: 'text', text: fullText || '{"groupMatches":[],"knockoutMatches":[]}' }]
    });

  } catch (err) {
    console.error('Scores fetch error:', err.message);
    return res.status(200).json(EMPTY);
  }
}
