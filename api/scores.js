// api/scores.js — Vercel serverless function
// Uses Google Gemini 1.5 Flash (free tier) with Google Search grounding.
// Returns {content:[{type:'text',text:'...'}]} so frontend needs no changes.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      content: [{ type: 'text', text: '{"groupMatches":[],"knockoutMatches":[]}' }],
      error: 'GEMINI_API_KEY not set in Vercel environment variables'
    });
  }

  const today = new Date().toISOString().split('T')[0];
  const prompt = `Search the web for the latest FIFA World Cup 2026 group stage match results as of today (${today}).

Return ONLY a valid JSON object with no markdown, no backticks, no explanation:
{"groupMatches":[{"team1":"Mexico","team2":"South Africa","score1":2,"score2":1,"status":"FT","group":"A","date":"2026-06-11"}],"knockoutMatches":[]}

Rules:
- status must be "FT" (finished), "LIVE" (in progress), or "NS" (not started)
- Only include FT or LIVE matches. Skip NS matches entirely.
- score1 and score2 must be integers
- If no matches have been played yet return: {"groupMatches":[],"knockoutMatches":[]}
- Return ONLY the JSON. Nothing else.`;

  try {
    const model = 'gemini-1.5-flash-latest';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search_retrieval: { dynamic_retrieval_config: { mode: 'MODE_DYNAMIC' } } }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini error:', response.status, errText);
      // Return empty results instead of crashing the app
      return res.status(200).json({
        content: [{ type: 'text', text: '{"groupMatches":[],"knockoutMatches":[]}' }],
        apiError: `Gemini ${response.status}: ${errText.slice(0, 200)}`
      });
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const fullText = parts.filter(p => p.text).map(p => p.text).join('\n');

    return res.status(200).json({
      content: [{ type: 'text', text: fullText || '{"groupMatches":[],"knockoutMatches":[]}' }]
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(200).json({
      content: [{ type: 'text', text: '{"groupMatches":[],"knockoutMatches":[]}' }],
      serverError: err.message
    });
  }
}
