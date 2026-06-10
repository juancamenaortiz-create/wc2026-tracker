// api/scores.js — Vercel serverless function
// Uses Google Gemini 2.0 Flash (free tier) with Google Search grounding.
// Returns data in the same {content:[{type:'text',text:'...'}]} shape as before
// so the frontend (app.js) needs no changes.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const today = new Date().toISOString().split('T')[0];
  const prompt = `Search the web for the latest FIFA World Cup 2026 group stage match results as of today (${today}).

Return ONLY a valid JSON object with no markdown, no backticks, no explanation:
{"groupMatches":[{"team1":"Mexico","team2":"South Africa","score1":2,"score2":1,"status":"FT","group":"A","date":"2026-06-11"}],"knockoutMatches":[]}

Rules:
- status must be exactly "FT" (finished), "LIVE" (in progress), or "NS" (not started)
- Only include FT or LIVE matches. Skip NS matches entirely.
- score1 and score2 must be integers, not null or strings
- team1 is the first/home team, team2 is the second/away team
- If no matches have been played yet return: {"groupMatches":[],"knockoutMatches":[]}
- Return ONLY the JSON object. Nothing else.`;

  try {
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
      console.error('Gemini API error:', response.status, errText);
      return res.status(502).json({ error: 'Upstream API error', detail: errText });
    }

    const data = await response.json();

    // Extract text from Gemini response parts
    const parts = data.candidates?.[0]?.content?.parts || [];
    const fullText = parts.filter(p => p.text).map(p => p.text).join('\n');

    // Return in the same shape as the Anthropic API so the frontend works unchanged
    return res.status(200).json({
      content: [{ type: 'text', text: fullText }]
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
