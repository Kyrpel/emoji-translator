import { json, readJson, validateLicense } from '../_shared.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await readJson(request);
  const licenseKey = typeof body?.licenseKey === 'string' ? body.licenseKey.trim() : '';
  if (!licenseKey) return json({ error: 'missing_key' }, 400);

  const result = await validateLicense(env, licenseKey, body?.instanceId);
  return json({ valid: result.valid, reason: result.reason });
}
