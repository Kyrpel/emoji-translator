import { json, readJson, OWN_KEY_PREFIX } from '../_shared.js';

const ACTIVATION_LIMIT = 3;

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await readJson(request);
  const licenseKey = typeof body?.licenseKey === 'string' ? body.licenseKey.trim() : '';
  if (!licenseKey) return json({ error: 'missing_key' }, 400);

  // Our own (Stripe-sold) keys live in KV.
  if (licenseKey.startsWith(OWN_KEY_PREFIX)) {
    if (!env.LICENSES) return json({ error: 'store_not_configured' }, 503);
    const record = await env.LICENSES.get(`key:${licenseKey}`, { type: 'json' });
    if (!record || record.status !== 'active') return json({ error: 'invalid_license' }, 400);
    const activations = record.activations || 0;
    if (activations >= ACTIVATION_LIMIT) return json({ error: 'activation_limit_reached' }, 400);
    await env.LICENSES.put(`key:${licenseKey}`, JSON.stringify({ ...record, activations: activations + 1 }));
    return json({ ok: true, instanceId: `own-${activations + 1}` });
  }

  // Everything else goes to Lemon Squeezy.
  if (!env.LEMONSQUEEZY_STORE_ID || !env.LEMONSQUEEZY_PRODUCT_ID) {
    return json({ error: 'store_not_configured' }, 503);
  }

  try {
    const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        license_key: licenseKey,
        instance_name: `web-${crypto.randomUUID().slice(0, 8)}`,
      }),
    });
    const data = await res.json();

    // Reject license keys sold by any other Lemon Squeezy store/product.
    const storeOk = String(data?.meta?.store_id) === String(env.LEMONSQUEEZY_STORE_ID);
    const productOk = String(data?.meta?.product_id) === String(env.LEMONSQUEEZY_PRODUCT_ID);

    if (!data?.activated || !storeOk || !productOk) {
      return json({ error: data?.error || 'invalid_license' }, 400);
    }

    return json({ ok: true, instanceId: data.instance?.id });
  } catch {
    return json({ error: 'activation_unavailable' }, 502);
  }
}
