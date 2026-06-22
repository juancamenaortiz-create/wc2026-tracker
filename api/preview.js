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

  const prompt = `You are a FIFA World Cup 2026 tactical analyst. Search for CURRENT tournament information and return a focused pre-match preview as ONLY a raw JSON object — no markdown, no backticks, no explanation.

Match: ${team1} vs ${team2}
${group ? 'Group ' + group + ' · ' : ''}${city} · ${date} · 2026 FIFA World Cup

IMPORTANT: Do NOT repeat basic team info (rankings, WC history, general style) — the user already has that in the team profiles. Focus on what makes THIS specific matchup unique RIGHT NOW.

Return ONLY this JSON:
{
  "stakes": "<2 sentences: the exact group table situation going into this match — who is 1st/2nd/3rd, what each team specifically needs from this result, whether either is already through or at risk of elimination>",
  "form": {
    "team1": "<results in THIS tournament only, e.g. W 3-0 vs X (Brobbey 2), D 1-1 vs Y. State their top scorer if they have one.>",
    "team2": "<same format for team2>"
  },
  "tactical_battle": "<the specific tactical matchup that will decide this game — e.g. how team2 high press matches team1 ball-playing CBs, or how team1 wide forwards exploit team2 defensive width. Be concrete and specific to these teams, not generic.>",
  "key_duel": {
    "player1": "<player name from team1>",
    "player2": "<player name from team2>",
    "why": "<why this specific 1v1 or positional battle is the key to the match outcome>"
  },
  "h2h": {
    "summary": "<last 2-3 competitive meetings with scores and year, or first ever meeting if applicable>",
    "edge": "<which team has the historical edge in this matchup, or no clear pattern>"
  },
  "x_factor": "<one specific unexpected element that could swing this match — a set-piece specialist, a player returning from suspension, a tactical wrinkle the opponent won't expect, or an environmental factor>",
  "prediction": {
    "score": "<specific scoreline e.g. 2-1>",
    "reasoning": "<2 sentences explaining this prediction based on current form and the tactical analysis above — no generic statements>"
  }
}

Be specific, factual, and current. Return ONLY the JSON.\`;
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
        max_tokens: 1500,
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
