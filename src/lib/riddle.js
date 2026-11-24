// "Guess what I said" riddles. The whole riddle travels in the link (?g=...),
// so sharing needs no server: base64url of a tiny JSON { t: text, e: emojis }.
// It hides the answer from a glance, not from a determined decoder; it's a party game.
import { removeStopwords } from 'stopword';

const MAX_TEXT = 280;
const MAX_EMOJIS = 120;

// Only pictographs survive in the emoji half, so a crafted link can't put words
// where the riddle should be (the server-side preview applies the same filter).
const NOT_EMOJI = /[^\p{Extended_Pictographic}\p{Emoji_Component}‍️\s]/gu;
export const emojiOnly = (s) => String(s || '').replace(NOT_EMOJI, '').trim();

const toB64Url = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64Url = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export const encodeRiddle = ({ t, e }) =>
  toB64Url(JSON.stringify({ t: String(t).trim().slice(0, MAX_TEXT), e: emojiOnly(e).slice(0, MAX_EMOJIS) }));

export const decodeRiddle = (g) => {
  try {
    if (!g || g.length > 2000) return null;
    const o = JSON.parse(fromB64Url(g));
    const t = typeof o?.t === 'string' ? o.t.trim().slice(0, MAX_TEXT) : '';
    const e = emojiOnly(o?.e).slice(0, MAX_EMOJIS);
    return t && e ? { t, e } : null;
  } catch {
    return null;
  }
};

export const riddleUrl = (origin, riddle) => `${origin}/?g=${encodeRiddle(riddle)}`;

const words = (s) =>
  removeStopwords(
    String(s)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
  );

// How many of the answer's meaningful words the guess got.
export const scoreGuess = (guess, answer) => {
  const target = [...new Set(words(answer))];
  const said = new Set(words(guess));
  const hit = target.filter((w) => said.has(w)).length;
  return { hit, total: target.length };
};

export const verdictFor = ({ hit, total }) => {
  if (!total) return 'Close enough';
  if (hit === total) return 'Nailed it';
  if (hit / total >= 0.5) return 'So close';
  if (hit > 0) return 'Warm-ish';
  return 'Not even close';
};
