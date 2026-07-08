import React, { useState } from 'react';
import { Sparkles, KeyRound, Check } from 'lucide-react';
import { activateLicense } from '../lib/api.js';
import { saveLicense } from '../lib/license.js';
import { CHECKOUT_URL, PRO_PRICE } from '../lib/config.js';

const PERKS = [
  'Unlimited AI translations in every mode',
  'Roast 🔥, Gen Z 💅, Flirty 😏, Passive-Aggressive 🙂 & Story 📖 modes',
  'Clean share cards — no watermark',
  'Unlimited saved history',
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
          ? 'Checkout is not live yet — check back soon!'
          : 'That license key didn’t work. Check the key from your purchase email.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`max-w-md w-full rounded-3xl p-8 shadow-2xl transform transition-all ${
          isDark ? 'bg-gradient-to-br from-purple-900/95 to-indigo-900/95' : 'bg-gradient-to-br from-orange-100 to-pink-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-2xl font-black mb-1 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Go Pro <Sparkles className="inline w-5 h-5 -mt-1" />
        </h3>
        <p className={`text-center mb-5 font-semibold ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>
          {PRO_PRICE} once — no subscription
        </p>

        <ul className="space-y-2 mb-6">
          {PERKS.map((perk) => (
            <li key={perk} className={`flex items-start gap-2 text-sm font-medium ${isDark ? 'text-purple-100' : 'text-gray-800'}`}>
              <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
              {perk}
            </li>
          ))}
        </ul>

        {CHECKOUT_URL ? (
          <a
            href={`${CHECKOUT_URL}${CHECKOUT_URL.includes('?') ? '&' : '?'}embed=1`}
            className="lemonsqueezy-button w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all hover:scale-105 bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg"
          >
            <Sparkles className="w-5 h-5" />
            Get Pro — {PRO_PRICE}
          </a>
        ) : (
          <div className={`w-full text-center px-6 py-4 rounded-xl font-bold ${isDark ? 'bg-white/10 text-purple-200' : 'bg-white/70 text-gray-500'}`}>
            Checkout opening soon ✨
          </div>
        )}

        <div className={`my-5 flex items-center gap-3 text-xs font-medium ${isDark ? 'text-purple-300' : 'text-gray-500'}`}>
          <div className={`flex-1 h-px ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
          already purchased?
          <div className={`flex-1 h-px ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Paste your license key"
            className={`flex-1 min-w-0 px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 ${
              isDark
                ? 'bg-white/10 text-white placeholder-purple-300/60 focus:ring-purple-400'
                : 'bg-white text-gray-900 placeholder-gray-400 focus:ring-pink-400 shadow'
            }`}
          />
          <button
            onClick={handleActivate}
            disabled={busy || !key.trim()}
            className={`flex items-center gap-1 px-4 py-3 rounded-xl font-bold transition-all disabled:opacity-50 ${
              isDark ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white text-purple-700 hover:bg-purple-50 shadow'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            {busy ? '…' : 'Activate'}
          </button>
        </div>

        {error && (
          <p className={`mt-3 text-sm font-medium text-center ${isDark ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
        )}

        <p className={`mt-4 text-xs text-center ${isDark ? 'text-purple-300/80' : 'text-gray-500'}`}>
          Your key arrives by email right after purchase. 7-day refund, no questions asked.
        </p>

        <button
          onClick={onClose}
          className={`w-full mt-4 py-2 rounded-xl font-medium ${
            isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};

export default ProModal;
