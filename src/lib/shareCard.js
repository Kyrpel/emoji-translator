// Renders a shareable 1080x1080 PNG: a riddle pasted up as a fluorescent flyer
// on the board, in the page's own tokens (kraft or black wall). The sentence
// never appears, so a group can guess in the comments; the riddle's own link
// sits under the flyer, so anyone who sees the card can play it.

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const wrapByWidth = (ctx, units, maxWidth, joiner = '') => {
  const lines = [];
  let line = '';
  for (const unit of units) {
    const candidate = line ? line + joiner + unit : unit;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = unit;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
};

// Grapheme-aware split, so a family or a flag emoji never breaks in half.
const graphemes = (s) =>
  typeof Intl !== 'undefined' && Intl.Segmenter
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), (g) => g.segment)
    : Array.from(s);

export const generateShareCard = async ({ puzzle, topicLabel = '', link = '' }) => {
  const W = 1080;
  const H = 1080;
  const display = token('--font-display');
  const body = token('--font-body');
  const emojiFont = token('--font-emoji');

  // The page already uses both faces, but make sure the canvas can see them.
  try {
    await Promise.all([document.fonts.load(`400 80px ${display}`), document.fonts.load(`500 32px ${body}`)]);
  } catch { /* fall back to the stack */ }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // The board
  ctx.fillStyle = token('--color-paper');
  ctx.fillRect(0, 0, W, H);

  // The flyer, a little off square, on a paper shadow
  const sheet = { x: 110, y: 120, w: 860, h: 760 };
  ctx.save();
  ctx.translate(W / 2, sheet.y + sheet.h / 2);
  ctx.rotate((-1.6 * Math.PI) / 180);
  ctx.translate(-W / 2, -(sheet.y + sheet.h / 2));
  ctx.shadowColor = token('--color-shadow');
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = token('--color-accent');
  ctx.fillRect(sheet.x, sheet.y, sheet.w, sheet.h);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const ink = token('--color-accent-ink');
  const left = sheet.x + 64;
  const maxWidth = sheet.w - 128;
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // The question in poster capitals, then the topic if there is one
  const size = 120;
  ctx.font = `400 ${size}px ${display}`;
  let y = sheet.y + 64 + size * 0.9;
  for (const line of wrapByWidth(ctx, ['FILL', 'IN', 'THE', 'BLANKS'], maxWidth, ' ')) {
    ctx.fillText(line, left, y);
    y += size * 1.02;
  }
  if (topicLabel) {
    ctx.font = `500 44px ${body}`;
    ctx.fillText(`Topic: ${topicLabel}`, left, y + 8);
    y += 56;
  }

  // The riddle: clue words and emoji blanks on the same lines, as large as fits.
  // A unit wider than a line (a long run of emojis) is broken between emojis.
  const room = sheet.y + sheet.h - 56 - (y + 32);
  const units = (ctx) =>
    puzzle
      .split(/\s+/)
      .filter(Boolean)
      .flatMap((u) => (ctx.measureText(u).width > maxWidth ? graphemes(u) : [u]));
  let lines = [];
  let riddleSize = 96;
  for (riddleSize of [96, 84, 72, 62, 54, 46, 40]) {
    ctx.font = `500 ${riddleSize}px ${body}, ${emojiFont}`;
    lines = wrapByWidth(ctx, units(ctx), maxWidth, ' ');
    if (lines.length * riddleSize * 1.25 <= room) break;
  }
  y += 32 + riddleSize;
  for (const line of lines.slice(0, Math.max(1, Math.floor(room / (riddleSize * 1.25))))) {
    ctx.fillText(line, left, y);
    y += riddleSize * 1.25;
  }
  ctx.restore();

  // Wordmark and the way to play
  ctx.fillStyle = token('--color-ink');
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `400 64px ${display}`;
  ctx.fillText('EMOJIFY', 110, H - 64);
  ctx.textAlign = 'right';
  ctx.font = `500 36px ${body}`;
  ctx.fillText(`Guess at ${link || window.location.host || 'emojify.co'}`, W - 110, H - 72);

  return canvas.toDataURL('image/png');
};

// On a phone, hand the picture to the share sheet (Facebook, WhatsApp, Stories);
// everywhere else, download it.
export const downloadShareCard = async (dataUrl) => {
  try {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    if (coarse && navigator.canShare) {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'emojify-card.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') return; // user closed the share sheet
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'emojify-card.png';
  a.click();
};
