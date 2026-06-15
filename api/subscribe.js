// api/subscribe.js — stores / removes Web Push subscriptions in Upstash Redis
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'DELETE')
    return res.status(405).json({ error: 'Method not allowed' });

  const { subscription, action } = req.body || {};
  if (!subscription?.endpoint)
    return res.status(400).json({ error: 'Missing subscription endpoint' });

  // Use last 40 chars of base64-encoded endpoint as a stable Redis field key
  const key = Buffer.from(subscription.endpoint)
    .toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(-40);

  try {
    if (action === 'unsubscribe' || req.method === 'DELETE') {
      await redis.hdel('wc2026:subs', key);
      return res.status(200).json({ ok: true, action: 'removed' });
    }
    // Store the full subscription object
    await redis.hset('wc2026:subs', { [key]: JSON.stringify(subscription) });
    return res.status(200).json({ ok: true, action: 'stored' });
  } catch(err) {
    console.error('subscribe.js redis error:', err.message);
    return res.status(500).json({ error: 'Storage failed' });
  }
}
