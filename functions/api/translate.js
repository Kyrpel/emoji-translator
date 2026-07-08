import {
  json,
  readJson,
  FREE_MODES,
  PRO_MODES,
  MODE_PROMPTS,
  validateLicense,
  teaserRateLimited,
} from './_shared.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.OPENAI_API_KEY) return json({ error: 'ai_not_configured' }, 503);

  const body = await readJson(request);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const mode = body?.mode;

  if (!text || text.length > 500) return json({ error: 'invalid_text' }, 400);
  if (!MODE_PROMPTS[mode]) return json({ error: 'invalid_mode' }, 400);

  const license = await validateLicense(env, body?.licenseKey, body?.instanceId);

  if (!license.valid) {
    // Personality modes are Pro-only — no teaser access.
    if (PRO_MODES.includes(mode)) return json({ error: 'pro_required' }, 402);
    // Free modes get a teaser allowance, bounded per IP.
    if (!FREE_MODES.includes(mode)) return json({ error: 'pro_required' }, 402);
    if (teaserRateLimited(request)) return json({ error: 'rate_limited' }, 429);
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: MODE_PROMPTS[mode] },
          { role: 'user', content: text },
        ],
        max_tokens: 60,
        temperature: 0.8,
      }),
    });

    // 429 from OpenAI = out of credit / rate limit — surface it distinctly for ops.
    if (!res.ok) return json({ error: res.status === 429 ? 'ai_quota_exceeded' : 'ai_upstream_error', upstream: res.status }, 502);

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    // Strip any stray non-emoji text the model sneaks in.
    const emojis = raw.replace(/[a-zA-Z0-9.,;:!?'"()\-\s]+/g, '');
    if (!emojis) return json({ error: 'empty_result' }, 502);

    return json({ emojis, pro: license.valid });
  } catch {
    return json({ error: 'ai_upstream_error' }, 502);
  }
}
