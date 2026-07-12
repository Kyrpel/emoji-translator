// Shared helpers for Cloudflare Pages Functions (web-standard Request/Response —
// portable to Vercel Edge or any WinterCG runtime with minimal changes).

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

// Modes available to free users during the teaser allowance.
export const FREE_MODES = ['vibe', 'literal', 'chaos', 'minimal'];
// Pro-only personality modes — always require a valid license.
export const PRO_MODES = ['roast', 'genz', 'flirty', 'passive', 'story'];

export const MODE_PROMPTS = {
  vibe: 'You are an emoji translator. Capture the emotion and feeling of the sentence in 8-12 emojis. Return ONLY emojis, no text.',
  literal: 'You are an emoji translator. Translate the sentence roughly one emoji per meaningful word, in the original word order. Return ONLY emojis, no text.',
  chaos: 'You are a chaotic emoji translator. Produce a wild, fun, loosely-related mix of 8-15 emojis for the sentence. Be unpredictable. Return ONLY emojis, no text.',
  minimal: 'You are an emoji translator. Distill the sentence into EXACTLY 3 emojis that capture its essence. Return ONLY emojis, no text.',
  roast: 'You are a savage roast comedian who speaks only in emoji. Mock the sentence (lovingly but brutally) with 6-10 emojis. Think clown, skull, snail, chart-going-down energy where fitting. Return ONLY emojis, no text.',
  genz: 'You are extremely online Gen Z. Translate the sentence into 6-12 emojis with maximum Gen Z energy (💀✋😭🔥-style irony, never literal). Return ONLY emojis, no text.',
  flirty: 'You are a playful flirt who speaks only in emoji. Translate the sentence into 6-10 charming, cheeky, flirty emojis. Keep it tasteful. Return ONLY emojis, no text.',
  passive: 'You are passive-aggressive politeness incarnate. Translate the sentence into 6-10 emojis that look sweet but drip with passive aggression (🙂🙃✨ energy). Return ONLY emojis, no text.',
  story: 'You are an emoji storyteller. Retell the sentence as a mini narrative of 12-20 emojis in chronological order, like a tiny movie. Return ONLY emojis, no text.',
};

// ---------------------------------------------------------------------------
// License validation, with in-memory cache. Two kinds of keys:
//  - "EMJ-…"  → sold via Stripe, minted by us, stored in Cloudflare KV (env.LICENSES)
//  - anything else → Lemon Squeezy license API
// Cache lives per warm isolate; a cold start just costs one extra lookup.
// ---------------------------------------------------------------------------
const licenseCache = new Map();
const LICENSE_TTL_MS = 6 * 60 * 60 * 1000; // 6 h

export const OWN_KEY_PREFIX = 'EMJ-';
export const generateOwnKey = () => OWN_KEY_PREFIX + crypto.randomUUID().toUpperCase();

const validateOwnKey = async (env, licenseKey) => {
  if (!env.LICENSES) return { valid: false, reason: 'store_not_configured' };
  try {
    const record = await env.LICENSES.get(`key:${licenseKey}`, { type: 'json' });
    return record && record.status === 'active'
      ? { valid: true }
      : { valid: false, reason: 'invalid_license' };
  } catch {
    return { valid: false, reason: 'validation_unavailable' };
  }
};

const validateLemonSqueezyKey = async (env, licenseKey, instanceId) => {
  if (!env.LEMONSQUEEZY_STORE_ID || !env.LEMONSQUEEZY_PRODUCT_ID) {
    return { valid: false, reason: 'store_not_configured' };
  }
  try {
    const body = new URLSearchParams({ license_key: licenseKey });
    if (instanceId) body.set('instance_id', instanceId);
    const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json();
    // Reject keys sold by any other store/product on Lemon Squeezy.
    const storeOk = String(data?.meta?.store_id) === String(env.LEMONSQUEEZY_STORE_ID);
    const productOk = String(data?.meta?.product_id) === String(env.LEMONSQUEEZY_PRODUCT_ID);
    const statusOk = data?.license_key?.status === 'active';
    return data?.valid && storeOk && productOk && statusOk
      ? { valid: true }
      : { valid: false, reason: data?.error || 'invalid_license' };
  } catch {
    return { valid: false, reason: 'validation_unavailable' };
  }
};

export const validateLicense = async (env, licenseKey, instanceId) => {
  if (!licenseKey) return { valid: false, reason: 'missing_key' };

  const cacheKey = `${licenseKey}:${instanceId || ''}`;
  const cached = licenseCache.get(cacheKey);
  if (cached && Date.now() - cached.at < LICENSE_TTL_MS) return cached.result;

  const result = licenseKey.startsWith(OWN_KEY_PREFIX)
    ? await validateOwnKey(env, licenseKey)
    : await validateLemonSqueezyKey(env, licenseKey, instanceId);

  licenseCache.set(cacheKey, { at: Date.now(), result });
  return result;
};

// ---------------------------------------------------------------------------
// Best-effort per-IP rate limit for unlicensed (teaser) traffic.
// In-memory per isolate — bounds abuse, not bulletproof; the OpenAI dashboard
// hard spend cap is the real backstop.
// ---------------------------------------------------------------------------
const ipBuckets = new Map();
const TEASER_LIMIT_PER_DAY = 30;

export const teaserRateLimited = (request) => {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  const key = `${ip}:${today}`;
  const count = (ipBuckets.get(key) || 0) + 1;
  ipBuckets.set(key, count);
  if (ipBuckets.size > 10000) ipBuckets.clear(); // crude memory bound
  return count > TEASER_LIMIT_PER_DAY;
};
