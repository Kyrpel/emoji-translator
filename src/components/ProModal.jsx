import React, { useState } from 'react';
import { Sparkles, KeyRound, Check, X } from 'lucide-react';
import { activateLicense } from '../lib/api.js';
import { saveLicense } from '../lib/license.js';
import { CHECKOUT_URL, STRIPE_PAYMENT_LINK, PRO_PRICE } from '../lib/config.js';

const PERKS = [
  'Unlimited AI translations in every mode',
  'Roast, Gen Z, Flirty, Passive-aggressive and Story voices',
  'Clean share cards, no watermark',
  'Your last 200 translations, saved',
  `One payment of ${PRO_PRICE}. Yours forever.`,
];

const ProModal = ({ isDark, onClose, onActivated }) => {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = async () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setBusy(true);
    setError('');
    const res = await activateLicense(trimmed);
    setBusy(false);
    if (res.ok && res.instanceId !== undefined) {
      saveLicense({ key: trimmed, instanceId: res.instanceId });
      onActivated();
    } else {
      setError(
        res.error === 'store_not_configured'
          ? 'Checkout is not live yet. Check back soon.'
          : 'That license key didn’t work. Check the key from your purchase email.'
      );
    }
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-dialog-h"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="pro-dialog-h">Go Pro</h2>
        <button type="button" className="btn icon-btn dialog__close" onClick={onClose} aria-label="Close" autoFocus>
          <X aria-hidden="true" />
        </button>
        <p className="dialog__lead">{PRO_PRICE} once. No subscription.</p>

        <div className="dialog__body">
          <ul className="perks">
            {PERKS.map((perk) => (
              <li key={perk}>
                <Check aria-hidden="true" />
                {perk}
              </li>
            ))}
          </ul>

          <div className="stack">
            {!CHECKOUT_URL && !STRIPE_PAYMENT_LINK && (
              <p className="dialog__key">Checkout opens soon.</p>
            )}

            {CHECKOUT_URL && (
              <a
                href={`${CHECKOUT_URL}${CHECKOUT_URL.includes('?') ? '&' : '?'}embed=1`}
                className="lemonsqueezy-button btn btn--primary btn--block"
              >
                <Sparkles aria-hidden="true" />
                Get Pro for {PRO_PRICE}
              </a>
            )}

            {STRIPE_PAYMENT_LINK && (
              <a
                href={STRIPE_PAYMENT_LINK}
                className={CHECKOUT_URL ? 'btn btn--block' : 'btn btn--primary btn--block'}
              >
                {CHECKOUT_URL ? 'Or pay by card with Stripe' : `Get Pro for ${PRO_PRICE}`}
              </a>
            )}
          </div>

          <div>
            <label className="field-label" htmlFor="license-key">
              Already bought it? Paste your license key
            </label>
            <div className="riddle__row">
              <input
                id="license-key"
                name="license-key"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="License key"
                className="input"
              />
              <button
                type="button"
                onClick={handleActivate}
                disabled={busy || !key.trim()}
                aria-busy={busy}
                className="btn"
              >
                <KeyRound aria-hidden="true" />
                {busy ? 'Checking…' : 'Activate'}
              </button>
            </div>
            {error && (
              <p className="err err--below" role="status">
                {error}
              </p>
            )}
          </div>

          <p className="dialog__fine">
            {CHECKOUT_URL
              ? 'Your key arrives by email right after purchase.'
              : 'Your license key appears right after payment. Save it to use Pro on your other devices.'}{' '}
            7-day refund, no questions asked.
          </p>

          <div>
            <button type="button" onClick={onClose} className="link">
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProModal;
