// api/team.js — on-demand team profile (Claude Haiku + web search)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ error: 'No API key', data: null });

  const { team } = req.body || {};
  if (!team) return res.status(400).json({ error: 'Missing team', data: null });

  const prompt = `Search for current information about the ${team} national football team at the 2026 FIFA World Cup and return ONLY a raw JSON object — no markdown, no backticks, no explanation.

{
  "ranking": <current FIFA ranking number>,
  "confederation": "<UEFA | CONMEBOL | CONCACAF | CAF | AFC | OFC>",
  "manager": "<Full name>",
  "style": "<1 sentence: their tactical approach and playing identity>",
  "topPlayers": [
    {"name": "<player name>", "club": "<current club>", "role": "<position or role>"},
    {"name": "<player name>", "club": "<current club>", "role": "<position or role>"},
    {"name": "<player name>", "club": "<current club>", "role": "<position or role>"}
  ],
  "wcHistory": {
    "appearances": <total WC appearances including 2026>,
    "titles": <number of WC titles, 0 if none>,
    "bestFinish": "<e.g. Winners (2014) | Runners-up (1966) | Quarter-finals>",
    "notable": "<1-2 sentences on their World Cup legacy or most memorable moment>"
  },
  "strengths": "<1 sentence on their main competitive advantage at this tournament>",
  "weaknesses": "<1 sentence on their main vulnerability or concern>",
  "recentForm": "<Their 2026 WC results so far, or pre-tournament form if not yet played>"
}

Return ONLY the JSON. Be factual and specific.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 900,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) return res.status(200).json({ error: `API ${resp.status}`, data: null });

    const apiData = await resp.json();
    const text = (apiData.content || [])
      .filter(b => b.type === 'text').map(b => b.text || '').join('\n').trim();

    try {
      const clean = text.replace(/^```[\w]*\n?/m, '').replace(/```$/m, '').trim();
      return res.status(200).json({ data: JSON.parse(clean) });
    } catch(e) {
      return res.status(200).json({ error: 'Parse failed', data: null });
    }
  } catch(err) {
    return res.status(200).json({ error: err.message, data: null });
  }
}
