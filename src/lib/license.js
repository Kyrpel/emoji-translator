// License + teaser state, persisted in localStorage. No accounts — the
// Lemon Squeezy license key IS the user's identity.

const LICENSE_KEY = 'emojify_license';
const TEASER_KEY = 'emojify_ai_uses';
export const TEASER_ALLOWANCE = 5;

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / storage full — degrade silently */
  }
};

export const getLicense = () => {
  const raw = safeGet(LICENSE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.key ? parsed : null;
  } catch {
    return null;
  }
};

export const saveLicense = ({ key, instanceId }) =>
  safeSet(
    LICENSE_KEY,
    JSON.stringify({ key, instanceId, status: 'active', lastValidatedAt: Date.now() })
  );

export const touchLicense = () => {
  const lic = getLicense();
  if (lic) safeSet(LICENSE_KEY, JSON.stringify({ ...lic, lastValidatedAt: Date.now() }));
};

export const clearLicense = () => {
  try {
    localStorage.removeItem(LICENSE_KEY);
  } catch {
    /* ignore */
  }
};

export const licenseNeedsRevalidation = () => {
  const lic = getLicense();
  if (!lic) return false;
  return Date.now() - (lic.lastValidatedAt || 0) > 24 * 60 * 60 * 1000;
};

// --- Teaser allowance (client-enforced; the server rate-limits per IP) ---

export const getAiUsesLeft = () => {
  const raw = safeGet(TEASER_KEY);
  if (raw === null) return TEASER_ALLOWANCE;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, n) : TEASER_ALLOWANCE;
};

export const consumeAiUse = () => {
  const left = Math.max(0, getAiUsesLeft() - 1);
  safeSet(TEASER_KEY, String(left));
  return left;
};
