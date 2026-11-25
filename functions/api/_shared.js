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

// How the AI turns a sentence into a riddle: the sentence itself, with some
// words swapped for emojis (fill in the blanks). One prompt per style; every
// style is free. The page lists the same ids in src/data/styles.js.
const RIDDLE_RULE = [
  'Turn the sentence into a fill-in-the-blanks emoji riddle for a friend to guess.',
  'Keep the small words (I, my, the, a, and, at, to, is…) exactly as written. Replace most of the important words (people, things, places, actions) with emojis, but keep one or two important words as clues.',
  'Keep the original word order. Never add, change or translate words. Reply with the riddle only, on one line.',
  'Examples:',
  'I cut my own fringe at 3am → I ✂️ my own 💇 at 🌙🕒',
  'My dog ate my homework on the bus → My 🐶 ate my 📚📝 on the 🚌',
].join('\n');

const STYLE_NOTES = {
  classic: 'Use one or two emojis for each word you replace.',
  hard: 'Hard mode: replace every important word; keep only the small words.',
  roast: 'Pick emojis that lovingly roast whoever said it (clown, skull, snail energy where it fits).',
  genz: 'Pick emojis with extremely online Gen Z energy (💀😭🔥 irony).',
  flirty: 'Pick cheeky, flirty, tasteful emojis.',
  passive: 'Pick emojis that look sweet but drip with passive aggression (🙂🙃✨ energy).',
};
export const STYLE_PROMPTS = Object.fromEntries(
  Object.entries(STYLE_NOTES).map(([id, note]) => [id, `${RIDDLE_RULE}\n${note}`])
);
// Names an older cached page may still send (chaos and story were retired).
export const STYLE_ALIASES = { vibe: 'classic', literal: 'classic', story: 'classic', chaos: 'classic', minimal: 'hard' };

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
// Best-effort per-IP daily limits, one bucket per action. In-memory per
// isolate: it bounds abuse, it is not bulletproof. The AI key's own limit is
// the real backstop.
// ---------------------------------------------------------------------------
const ipBuckets = new Map();

export const clientIp = (request) =>
  request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';

export const rateLimited = (request, bucket, perDay) => {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${bucket}:${clientIp(request)}:${today}`;
  const count = (ipBuckets.get(key) || 0) + 1;
  ipBuckets.set(key, count);
  if (ipBuckets.size > 20000) ipBuckets.clear(); // crude memory bound
  return count > perDay;
};
