import { json, readJson } from '../_shared.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.LEMONSQUEEZY_STORE_ID || !env.LEMONSQUEEZY_PRODUCT_ID) {
    return json({ error: 'store_not_configured' }, 503);
  }

  const body = await readJson(request);
  const licenseKey = typeof body?.licenseKey === 'string' ? body.licenseKey.trim() : '';
  if (!licenseKey) return json({ error: 'missing_key' }, 400);

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
