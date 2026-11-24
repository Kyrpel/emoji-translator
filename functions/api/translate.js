import {
  json,
  readJson,
  FREE_MODES,
  PRO_MODES,
  MODE_PROMPTS,
  validateLicense,
  teaserRateLimited,
} from './_shared.js';

// AI provider: OpenRouter (one key, hundreds of models) when OPENROUTER_API_KEY
// is set, otherwise OpenAI directly. Both speak the same chat-completions
// format, so the prompts don't change.
//
// On OpenRouter, OpenRouter tries the models in order and uses the first that
// answers. The default chain is free models only: free models share an upstream
// pool and are often rate-limited, so one alone fails a lot, but a chain of
// three rarely does. Override with an AI_MODELS variable, comma-separated, at
// most 3 (OpenRouter's limit). Adding a paid model (e.g. openai/gpt-4o-mini)
// needs a key whose usage limit is above $0: with a $0 key OpenRouter rejects
// the whole request (403) as soon as any paid model is in the list.
const DEFAULT_OPENROUTER_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3.5-lightning:free',
  'google/gemma-4-31b-it:free',
];

const aiProvider = (env) => {
  if (env.OPENROUTER_API_KEY) {
    const custom = (env.AI_MODELS || '').split(',').map((m) => m.trim()).filter(Boolean);
    const models = (custom.length ? custom : DEFAULT_OPENROUTER_MODELS).slice(0, 3);
    return {
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: env.OPENROUTER_API_KEY,
      // Optional OpenRouter attribution headers (shows EMOJIFY on their dashboards).
      headers: { 'HTTP-Referer': 'https://emojify.co', 'X-Title': 'EMOJIFY' },
      body: {
        ...(models.length > 1 ? { models } : { model: models[0] }),
        // Some models "think" first; thinking tokens would eat the 60-token budget.
        reasoning: { enabled: false },
      },
    };
  }
  if (env.OPENAI_API_KEY) {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      key: env.OPENAI_API_KEY,
      headers: {},
      body: { model: env.AI_MODEL || 'gpt-4o-mini' },
    };
  }
  return null;
};

export async function onRequestPost(context) {
  const { request, env } = context;

  const ai = aiProvider(env);
  if (!ai) return json({ error: 'ai_not_configured' }, 503);

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
    const res = await fetch(ai.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ai.key}`,
        ...ai.headers,
      },
      body: JSON.stringify({
        ...ai.body,
        messages: [
          { role: 'system', content: MODE_PROMPTS[mode] },
          { role: 'user', content: text },
        ],
        max_tokens: 60,
        temperature: 0.8,
      }),
    });

    // 402 (OpenRouter: out of credit), 403 (OpenRouter: key usage limit) or
    // 429 (rate limit / OpenAI quota): surface it distinctly for ops.
    if (!res.ok) {
      const quota = res.status === 402 || res.status === 403 || res.status === 429;
      return json({ error: quota ? 'ai_quota_exceeded' : 'ai_upstream_error', upstream: res.status }, 502);
    }

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
