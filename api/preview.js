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

  const { team1, team2, group, round, city, date, groupStandings, teamProfile } = req.body || {};

  // ── Team profile request (different prompt) ────────────────────────────────
  if (teamProfile) {
    const tpPrompt = 'You are a FIFA World Cup 2026 expert. Return a JSON profile for '
      + teamProfile + ' as ONLY a raw JSON object — no markdown, no backticks.\n\n'
      + 'Return ONLY this JSON:\n'
      + '{\n'
      + '  "ranking": <FIFA world ranking integer>,\n'
      + '  "confederation": "<e.g. UEFA, CONMEBOL, CAF>",\n'
      + '  "manager": "<current manager full name>",\n'
      + '  "style": "<1 sentence tactical identity>",\n'
      + '  "strengths": "<1 sentence key strength>",\n'
      + '  "weaknesses": "<1 sentence key weakness>",\n'
      + '  "wcHistory": { "appearances": <integer>, "titles": <integer>, "bestFinish": "<e.g. Champions, 4th place>" }\n'
      + '}\n'
      + 'Be factual and current. Return ONLY the JSON.';
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 600,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: tpPrompt }] }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const apiData = await resp.json();
      const text = (apiData.content||[]).filter(b=>b.type==='text').map(b=>b.text||'').join('').trim();
      const start = text.indexOf('{'), end = text.lastIndexOf('}');
      if (start !== -1 && end > start) {
        const parsed = JSON.parse(text.slice(start, end+1));
        return res.status(200).json({ data: parsed });
      }
      return res.status(200).json({ data: {} });
    } catch(e) {
      return res.status(200).json({ data: {} });
    }
  }

  if (!team1 || !team2) return res.status(400).json({ error: 'Missing team names', data: null });

  const roundLabel = group ? ('Group ' + group) : (round || 'Knockout Round');
  const isKnockout = !group;

  const standingsNote = groupStandings
    ? 'Current Group ' + group + ' standings (already provided — do NOT search for this):\n' + groupStandings + '\n'
    : '';

  const stakesFocus = isKnockout
    ? '"stakes": "<2 sentences: what this knockout tie means — tournament trajectory, pressure on each team, who advances>",'
    : '"stakes": "<2 sentences: group table situation — who is 1st/2nd/3rd, what each team needs from this result>",';

  const prompt = 'You are a FIFA World Cup 2026 tactical analyst. Search for CURRENT tournament information and return a focused pre-match preview as ONLY a raw JSON object — no markdown, no backticks, no explanation.\n\n'
    + 'Match: ' + team1 + ' vs ' + team2 + '\n'
    + roundLabel + ' · ' + city + ' · ' + date + ' · 2026 FIFA World Cup\n\n'
    + 'IMPORTANT: Do NOT repeat basic team info (rankings, WC history, general style) — the user already has that in team profiles.\n'
    + standingsNote
    + 'Focus your web searches ONLY on: each team\'s results and scorers so far in THIS tournament, and tactical/H2H research.\n\n'
    + 'Return ONLY this JSON:\n'
    + '{\n'
    + '  ' + stakesFocus + '\n'
    + '  "form": {\n'
    + '    "team1": "<' + team1 + '\'s results in THIS tournament only, e.g. W 3-0 vs X, D 1-1 vs Y. Include top scorer>",\n'
    + '    "team2": "<same for ' + team2 + '>"\n'
    + '  },\n'
    + '  "tactical_battle": "<the specific matchup that will decide this game — concrete, specific to these teams>",\n'
    + '  "key_duel": { "player1": "<player from ' + team1 + '>", "player2": "<player from ' + team2 + '>", "why": "<why this 1v1 is key>" },\n'
    + '  "h2h": { "summary": "<last 2-3 meetings with scores and year, or first ever meeting>", "edge": "<who has the historical edge>" },\n'
    + '  "x_factor": "<one unexpected element that could swing this match>",\n'
    + '  "prediction": { "team1_goals": <integer, goals scored by ' + team1 + '>, "team2_goals": <integer, goals scored by ' + team2 + '>, "reasoning": "<2 sentences based on form and tactical analysis>" }\n'
    + '}\n\n'
    + 'Be specific, factual, current. Return ONLY the JSON.';

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

    try {
      let jsonStr = null;
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        jsonStr = fenceMatch[1].trim();
      } else {
        const start = text.indexOf('{');
        const end   = text.lastIndexOf('}');
        if (start !== -1 && end > start) jsonStr = text.slice(start, end + 1);
      }
      if (!jsonStr) throw new SyntaxError('No JSON found in response');
      const parsed = JSON.parse(jsonStr);
      return res.status(200).json({ data: parsed });
    } catch(parseErr) {
      console.warn('preview.js: JSON parse failed:', parseErr.message);
      return res.status(200).json({ text: text || null });
    }
  } catch (err) {
    console.error('preview.js error:', err.message);
    return res.status(200).json({ error: err.message, data: null });
  }
}
