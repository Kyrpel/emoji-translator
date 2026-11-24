// Cloudflare Pages Function for "/" only (static assets and /api/* never pass here).
// A riddle link gets its own link preview, so a riddle posted to WhatsApp,
// Facebook or Reddit shows who sent it and its emojis in the title:
//   "Can you guess what Maria said? My 🐱 knocked my ☕ onto my 💻"
// Riddles live in D1 (?r=id); older links carry the riddle itself (?g=base64url).
// Every other request, and any failure, serves the static page untouched.

import { topicHint } from '../src/data/topics.js';
import { checkPuzzle } from '../src/lib/riddleText.js';

const fromB64Url = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

// Old ?g= links carry their own emojis: only pictographs from them reach the preview.
const NOT_EMOJI = /[^\p{Extended_Pictographic}\p{Emoji_Component}‍️\s]/gu;

const setContent = (value) => ({
  element(el) {
    el.setAttribute('content', value);
  },
});

const findRiddle = async (env, url) => {
  const r = url.searchParams.get('r');
  if (r && /^[A-Za-z0-9]{8}$/.test(r) && env.DB) {
    const row = await env.DB.prepare('SELECT name, topic, answer, puzzle FROM riddles WHERE id = ?').bind(r).first();
    // Stored riddles were checked on the way in; check again rather than trust the row.
    return row && checkPuzzle(row.puzzle, row.answer) ? { name: row.name, topic: row.topic, puzzle: row.puzzle } : null;
  }
  const g = url.searchParams.get('g');
  if (g && g.length <= 2000) {
    const riddle = JSON.parse(fromB64Url(g));
    const emojis = typeof riddle?.e === 'string' ? riddle.e.replace(NOT_EMOJI, '').trim() : '';
    return { name: null, topic: null, puzzle: emojis };
  }
  return null;
};

export async function onRequest(context) {
  const res = await context.next();
  try {
    if (context.request.method !== 'GET') return res;
    if (!(res.headers.get('content-type') || '').includes('text/html')) return res;
    const url = new URL(context.request.url);
    const riddle = await findRiddle(context.env, url);
    const chars = [...(riddle?.puzzle || '')];
    const puzzle = chars.length > 90 ? `${chars.slice(0, 89).join('')}…` : chars.join('');
    if (!puzzle) return res;

    const title = `Can you guess what ${riddle.name || 'your friend'} said? ${puzzle}`;
    const hint = topicHint(riddle.topic, riddle.name);
    const description = `${hint ? `${hint}. ` : ''}Three tries. Tap to guess, then send one back.`;

    return new HTMLRewriter()
      .on('meta[property="og:title"]', setContent(title))
      .on('meta[name="twitter:title"]', setContent(title))
      .on('meta[property="og:description"]', setContent(description))
      .on('meta[name="twitter:description"]', setContent(description))
      .on('meta[property="og:url"]', setContent(url.href))
      .transform(res);
  } catch {
    return res;
  }
}
