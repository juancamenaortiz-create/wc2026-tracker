// api/scores.js — Vercel serverless function
// Node 20 runtime. Calls Claude with web search to get live WC 2026 scores.

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are a FIFA World Cup 2026 live scores assistant.

Search the web RIGHT NOW for the latest FIFA World Cup 2026 match results, scores, and live games as of today (${today}).

Then respond with ONLY a valid JSON object (no markdown, no explanation, no preamble) in exactly this format:

{
  "groupMatches": [
    {
      "matchId": 1,
      "team1": "Mexico",
      "team2": "South Africa",
      "score1": 2,
      "score2": 1,
      "status": "FT",
      "group": "A",
      "date": "2026-06-11"
    }
  ],
  "knockoutMatches": [
    {
      "matchId": 73,
      "team1": "Argentina",
      "team2": "Brazil",
      "score1": 1,
      "score2": 0,
      "status": "FT",
      "round": "R32",
      "date": "2026-06-28"
    }
  ]
}

Rules:
- status must be exactly one of: "FT" (full time / final), "LIVE" (currently playing), "NS" (not started / scheduled)
- Only include matches that have been PLAYED (FT) or are currently LIVE. Skip NS matches entirely.
- For LIVE matches include the current score.
- matchId for group matches: 1–72 (use the official match numbers).
- matchId for knockout matches: 73–104.
- score1 and score2 must be integers (not null, not strings).
- team1 is the home/first team, team2 is the away/second team.
- If no matches have been played yet, return: {"groupMatches":[],"knockoutMatches":[]}
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
        max_tokens: 4096,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
          }
        ],
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return res.status(502).json({ error: 'Upstream API error', detail: errText });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
