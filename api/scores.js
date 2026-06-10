// api/scores.js — Vercel serverless function
// Uses Anthropic Claude with web search to fetch live WC 2026 scores.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const EMPTY = { content: [{ type: 'text', text: '{"groupMatches":[],"knockoutMatches":[]}' }] };

  // ── Pre-tournament guard ──────────────────────────────────────────────────
  // No matches before June 11 2026 — skip API call entirely until then.
  const now = new Date();
  const tournamentStart = new Date('2026-06-11T00:00:00-05:00');
  if (now < tournamentStart) return res.status(200).json(EMPTY);

  // ── API key check ─────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set in Vercel environment variables');
    return res.status(200).json(EMPTY);
  }

  const today = now.toISOString().split('T')[0];
  const prompt = `Search the web for the latest FIFA World Cup 2026 group stage match results as of today (${today}).

Return ONLY a valid JSON object — no markdown, no backticks, no explanation:
{"groupMatches":[{"team1":"Mexico","team2":"South Africa","score1":2,"score2":1,"status":"FT","group":"A","date":"2026-06-11"}],"knockoutMatches":[]}

Rules:
- status must be exactly "FT" (finished), "LIVE" (in progress), or "NS" (not started)
- Only include FT or LIVE matches — skip NS matches entirely
- score1 and score2 must be integers
- If no matches have been played yet return: {"groupMatches":[],"knockoutMatches":[]}
- Return ONLY the JSON object. Nothing else.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Anthropic error: ${response.status}`, errText);
      return res.status(200).json(EMPTY);
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('Scores fetch error:', err.message);
    return res.status(200).json(EMPTY);
  }
}
