// api/scores.js — Vercel serverless function
// Calls Claude with web search, parses response server-side, returns clean JSON.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const EMPTY = { groupMatches: [], knockoutMatches: [] };

  // No matches before tournament start
  const now = new Date();
  if (now < new Date('2026-06-11T00:00:00-05:00')) return res.status(200).json(EMPTY);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not configured');
    return res.status(200).json({ ...EMPTY, _error: 'no_api_key' });
  }

  const today = now.toISOString().split('T')[0];

  const prompt = `Today is ${today}. Search for "FIFA World Cup 2026 scores results" and return all completed or live match results.

This is the 2026 FIFA World Cup hosted in USA, Canada, and Mexico. Group stage: June 11–27, 2026.

Return ONLY a valid JSON object with no markdown, no backticks, no extra text:
{"groupMatches":[{"matchId":1,"team1":"Mexico","team2":"South Africa","score1":0,"score2":2,"status":"FT","group":"A","date":"2026-06-11"}],"knockoutMatches":[]}

Rules:
- Only include COMPLETED (status "FT") or CURRENTLY LIVE (status "LIVE") matches
- Skip any match not yet started
- matchId: 1–72 for group stage matches (Mexico vs South Africa is matchId 1)
- score1, score2: integers (not null, not strings)
- If no matches completed yet: {"groupMatches":[],"knockoutMatches":[]}
- Return ONLY the JSON. Nothing else.`;

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!apiRes.ok) {
      const txt = await apiRes.text();
      console.error('Anthropic API error:', apiRes.status, txt.substring(0, 200));
      return res.status(200).json({ ...EMPTY, _error: `anthropic_${apiRes.status}` });
    }

    const data = await apiRes.json();

    // Extract all text blocks from the response (web search produces tool_use + tool_result + text)
    const content = Array.isArray(data.content) ? data.content : [];
    const fullText = content
      .filter(b => b.type === 'text')
      .map(b => b.text || '')
      .join('\n')
      .trim();

    if (!fullText) {
      console.error('No text block in response. stop_reason:', data.stop_reason,
        'block types:', content.map(b => b.type).join(', '));
      return res.status(200).json({ ...EMPTY, _error: 'no_text_block', _stop: data.stop_reason });
    }

    // Parse JSON robustly — strip markdown fences, then extract by outermost braces
    const parsed = extractJSON(fullText);

    if (!parsed || !Array.isArray(parsed.groupMatches)) {
      console.error('JSON extract failed. Text preview:', fullText.substring(0, 400));
      return res.status(200).json({ ...EMPTY, _error: 'json_parse_fail', _preview: fullText.substring(0, 200) });
    }

    return res.status(200).json({
      groupMatches:    parsed.groupMatches,
      knockoutMatches: Array.isArray(parsed.knockoutMatches) ? parsed.knockoutMatches : [],
      _updated: now.toISOString(),
    });

  } catch (err) {
    console.error('scores.js exception:', err.message);
    return res.status(200).json({ ...EMPTY, _error: err.message });
  }
}

// Extract the outermost JSON object from text that may contain markdown or surrounding prose
function extractJSON(text) {
  // Strip markdown code fences
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  // Find outermost { ... }
  const start = stripped.indexOf('{');
  const end   = stripped.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(stripped.substring(start, end + 1));
  } catch (e) {
    // Last resort: scan inward from the end to find valid JSON
    for (let i = end - 1; i > start; i--) {
      if (stripped[i] !== '}') continue;
      try { return JSON.parse(stripped.substring(start, i + 1)); } catch (_) {}
    }
    return null;
  }
}
