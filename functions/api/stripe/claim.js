import { json, readJson, generateOwnKey } from '../_shared.js';

// Called by the app after Stripe redirects back with ?stripe_session=cs_...
// Verifies the Checkout Session against Stripe's API (server-side, unguessable
// session id = proof of purchase) and mints a license key in KV. Idempotent:
// the same session always returns the same key, so refresh/re-claim is safe.
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.STRIPE_SECRET_KEY || !env.LICENSES) return json({ error: 'stripe_not_configured' }, 503);

  const body = await readJson(request);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId.startsWith('cs_') || sessionId.length > 200) {
    return json({ error: 'invalid_session' }, 400);
  }

  const existing = await env.LICENSES.get(`session:${sessionId}`);
  if (existing) return json({ licenseKey: existing });

  let session;
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
    );
    if (!res.ok) return json({ error: 'invalid_session' }, 400);
    session = await res.json();
  } catch {
    return json({ error: 'stripe_unavailable' }, 502);
  }

  if (session.payment_status !== 'paid') return json({ error: 'not_paid' }, 402);

  const licenseKey = generateOwnKey();
  await env.LICENSES.put(
    `key:${licenseKey}`,
    JSON.stringify({
      status: 'active',
      activations: 0,
      email: session.customer_details?.email || null,
      sessionId,
      createdAt: Date.now(),
    })
  );
  await env.LICENSES.put(`session:${sessionId}`, licenseKey);

  return json({ licenseKey });
}
