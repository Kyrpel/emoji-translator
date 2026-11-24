// Cloudflare Pages Function for "/" only (static assets and /api/* never pass here).
// A riddle link (/?g=...) gets its own link preview, so a riddle posted to
// Facebook, Reddit or WhatsApp shows its emojis in the title:
//   "Can you guess what this says? 🐱☕📱"
// Every other request, and any failure, serves the static page untouched.

const fromB64Url = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

// Same filter as src/lib/riddle.js: only pictographs reach the preview.
const NOT_EMOJI = /[^\p{Extended_Pictographic}\p{Emoji_Component}‍️\s]/gu;

const setContent = (value) => ({
  element(el) {
    el.setAttribute('content', value);
  },
});

export async function onRequest(context) {
  const res = await context.next();
  try {
    if (context.request.method !== 'GET') return res;
    const url = new URL(context.request.url);
    const g = url.searchParams.get('g');
    if (!g || g.length > 2000) return res;
    if (!(res.headers.get('content-type') || '').includes('text/html')) return res;

    const riddle = JSON.parse(fromB64Url(g));
    const emojis = typeof riddle?.e === 'string' ? riddle.e.replace(NOT_EMOJI, '').trim().slice(0, 60) : '';
    if (!emojis) return res;

    const title = `Can you guess what this says? ${emojis}`;
    const description = 'Someone sent you an emoji riddle. Tap to guess, then make one back on EMOJIFY.';

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
