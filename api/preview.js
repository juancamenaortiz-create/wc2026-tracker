// api/preview.js — on-demand AI match preview (Claude Haiku + web search)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ error: 'API key not configured', data: null });

  const { team1, team2, group, city, date } = req.body || {};
  if (!team1 || !team2) return res.status(400).json({ error: 'Missing team names', data: null });

  const prompt = `You are a FIFA World Cup 2026 analyst. Search for current information about both teams and return a structured match preview as ONLY a raw JSON object — no markdown, no backticks, no explanation.

Match: ${team1} vs ${team2}
${group ? 'Group ' + group + ' · ' : ''}${city} · ${date} · 2026 FIFA World Cup

Return ONLY this JSON structure (fill in all fields based on real research):
{
  "team1": {
    "name": "${team1}",
    "ranking": <current FIFA ranking number>,
    "role": "<e.g. The Favorites / The Underdogs / The Dark Horses>",
    "form": "<1–2 sentences: current form, manager name, recent results, tournament momentum>",
    "tactics": "<How they are expected to play — formation, pressing style, build-up approach>",
    "players": [
      {"name": "<player name>", "reason": "<why they are dangerous or important>"},
      {"name": "<player name>", "reason": "<why they are dangerous or important>"}
    ],
    "history": "<WC appearances count, best finish, and one memorable historical moment>"
  },
  "team2": {
    "name": "${team2}",
    "ranking": <current FIFA ranking number>,
    "role": "<role>",
    "form": "<1–2 sentences>",
    "tactics": "<tactical approach, especially how they plan to counter team1>",
    "players": [
      {"name": "<player name>", "reason": "<reason>"},
      {"name": "<player name>", "reason": "<reason>"}
    ],
    "history": "<WC history>"
  },
  "h2h": {
    "totalMeetings": <total competitive meetings or null if fewer than 3>,
    "winsTeam1": <wins by team1>,
    "draws": <draws>,
    "winsTeam2": <wins by team2>,
    "lastMeeting": "<e.g. Germany 2–0 France · Nov 2023 · UEFA Nations League>"
  },
  "context": "<1–2 sentences on the broader stakes: group standings implications, rivalry history, or tournament context>"
}

Rules: 2–3 players per team. FIFA rankings must be real current numbers. Be factual and specific. Return ONLY the JSON.`;

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
        max_tokens: 1200,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      console.error('Anthropic error:', resp.status);
      return res.status(200).json({ error: `API error ${resp.status}`, data: null });
    }

    const apiData = await resp.json();
    const text = (apiData.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text || '')
      .join('\n')
      .trim();

    // Try to parse as JSON
    try {
      // Strip any accidental markdown fences
      const clean = text.replace(/^```[\w]*\n?/m, '').replace(/```$/m, '').trim();
      const parsed = JSON.parse(clean);
      return res.status(200).json({ data: parsed });
    } catch(parseErr) {
      // If JSON parse fails, return as plain text fallback
      console.warn('preview.js: JSON parse failed, returning text fallback');
      return res.status(200).json({ text: text || null });
    }
  } catch (err) {
    console.error('preview.js error:', err.message);
    return res.status(200).json({ error: err.message, data: null });
  }
}
