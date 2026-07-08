// Renders a shareable PNG card of a translation on a canvas.
// Free users get a small watermark — that watermark is the growth loop.

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

export const generateShareCard = ({ input, emojis, watermark }) => {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#7f1d1d');
  bg.addColorStop(0.5, '#b91c1c');
  bg.addColorStop(1, '#7c2d12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  // Title
  ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#fef3c7';
  ctx.fillText('🔥 EMOJIFY', W / 2, 130);

  // Input text (quoted, wrapped)
  ctx.font = '600 44px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 237, 213, 0.9)';
  const textLines = wrapByWidth(ctx, `“${input}”`.split(' '), W - 160, ' ').slice(0, 4);
  let y = 280;
  for (const line of textLines) {
    ctx.fillText(line, W / 2, y);
    y += 60;
  }

  // Arrow
  ctx.font = '64px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#fdba74';
  ctx.fillText('↓', W / 2, y + 40);
  y += 140;

  // Emojis (wrapped, grapheme-aware enough via Array.from)
  ctx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillStyle = '#ffffff';
  const emojiLines = wrapByWidth(ctx, Array.from(emojis), W - 200).slice(0, 4);
  for (const line of emojiLines) {
    ctx.fillText(line, W / 2, y);
    y += 130;
  }

  if (watermark) {
    ctx.font = '600 36px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(254, 243, 199, 0.75)';
    ctx.fillText(`✨ ${window.location.host || 'emojify'} — translate yours`, W / 2, H - 70);
  }

  return canvas.toDataURL('image/png');
};

export const downloadShareCard = (dataUrl) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'emojify-card.png';
  a.click();
};
