import { getLicense } from './license.js';

// Calls the serverless AI proxy. Same-origin, so no CORS setup needed.
export const aiTranslate = async (text, mode) => {
  const license = getLicense();
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        mode,
        licenseKey: license?.key,
        instanceId: license?.instanceId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, emojis: data.emojis, error: data.error };
  } catch {
    return { ok: false, status: 0, error: 'network' };
  }
};

export const activateLicense = async (licenseKey) => {
  try {
    const res = await fetch('/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, instanceId: data.instanceId, error: data.error };
  } catch {
    return { ok: false, error: 'network' };
  }
};

export const claimStripeSession = async (sessionId) => {
  try {
    const res = await fetch('/api/stripe/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, licenseKey: data.licenseKey, error: data.error };
  } catch {
    return { ok: false, error: 'network' };
  }
};

export const validateLicenseRemote = async (licenseKey, instanceId) => {
  try {
    const res = await fetch('/api/license/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey, instanceId }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, valid: !!data.valid, error: data.error };
  } catch {
    // Network failure: don't punish the user — keep current state.
    return { ok: false, valid: true, error: 'network' };
  }
};
