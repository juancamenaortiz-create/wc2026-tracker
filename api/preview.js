// api/preview.js — on-demand AI match preview (Claude Haiku + web search)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ error: 'API key not configured', text: null });

  const { team1, team2, group, city, date } = req.body || {};
  if (!team1 || !team2) return res.status(400).json({ error: 'Missing team names', text: null });

  const prompt = `You are a concise FIFA World Cup 2026 analyst. Search for the latest context and write a sharp 2–3 sentence match preview for:

${team1} vs ${team2}
${group ? `Group ${group} · ` : ''}${city} · ${date} · 2026 FIFA World Cup

Cover: the key storyline or tension between these teams, and one player per side worth watching. Be specific and current — use any recent news, form, or injuries you find. Under 70 words. Return ONLY the preview text, no title or labels.`;

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
        max_tokens: 250,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      console.error('Anthropic error:', resp.status);
      return res.status(200).json({ error: `API error ${resp.status}`, text: null });
    }

    const data = await resp.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text || '')
      .join('\n')
      .trim();

    return res.status(200).json({ text: text || null });
  } catch (err) {
    console.error('preview.js error:', err.message);
    return res.status(200).json({ error: err.message, text: null });
  }
}
