// A riddle is the creator's sentence with some words swapped for emojis:
//   "My ex still has my hoodie" → "My 💔 still has my 👕"
// The words that stay are clues; the emojis are the blanks. Shared by the page
// (to draw it) and the server (to check that a riddle only shows words from its
// own sentence, and hides enough of them).

// One emoji, built from its pieces: keycaps, pictographs, flags, skin tones, tags, joiners.
const EMOJI_RUN =
  /(?:[#*0-9]️?⃣|\p{Extended_Pictographic}|\p{Regional_Indicator}|[\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}‍️])+/gu;

// → [{ type: 'e' | 'w', text }] in order, whitespace kept inside 'w' parts.
export const tokenize = (puzzle) => {
  const s = String(puzzle || '');
  const parts = [];
  let last = 0;
  for (const m of s.matchAll(EMOJI_RUN)) {
    if (m.index > last) parts.push({ type: 'w', text: s.slice(last, m.index) });
    parts.push({ type: 'e', text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ type: 'w', text: s.slice(last) });
  return parts;
};

export const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const words = (s) => normalize(s).split(' ').filter(Boolean);

// Small words never count as clues or as blanks.
export const SMALL_WORDS = new Set(
  ('a an and are as at be been but by for from had has have he her his i im in is it its me my of on or our ' +
    'she so that the their them they this to too us was we were what when with you your just very really')
    .split(' ')
);
export const keyWords = (s) => [...new Set(words(s).filter((w) => w.length >= 3 && !SMALL_WORDS.has(w)))];

// The words a riddle shows (normalised).
export const shownWords = (puzzle) =>
  words(
    tokenize(puzzle)
      .filter((t) => t.type === 'w')
      .map((t) => t.text)
      .join(' ')
  );

// Drop any word the sentence doesn't have (an AI sometimes adds one), and tidy spacing.
export const keepOwnWords = (puzzle, answer) => {
  const own = new Set(words(answer));
  return tokenize(puzzle)
    .map((t) =>
      t.type === 'e'
        ? ` ${t.text} `
        : t.text
            .split(/\s+/)
            .filter((w) => words(w).every((x) => own.has(x)))
            .join(' ')
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Is this a fair riddle for this sentence?
//   strict: at least a third of the key words hidden, and (for 4+ words) at
//   least `minShown` of all the words still showing as clues.
export const checkPuzzle = (puzzle, answer, { strict = false, minShown = 0.3 } = {}) => {
  const parts = tokenize(puzzle);
  if (!parts.some((t) => t.type === 'e')) return false;
  const own = new Set(words(answer));
  const shown = shownWords(puzzle);
  if (!shown.every((w) => own.has(w))) return false;
  if (!strict) return true;
  const keys = keyWords(answer);
  // A blank is a few emojis, not a wall of them.
  const emojiCount = (String(puzzle).match(/\p{Extended_Pictographic}/gu) || []).length;
  if (emojiCount > 3 * Math.max(keys.length, 1) + 4) return false;
  const shownSet = new Set(shown);
  const hidden = keys.filter((w) => !shownSet.has(w)).length;
  if (keys.length && hidden / keys.length < 0.34) return false;
  const total = words(answer).length;
  if (total >= 4 && shown.length < Math.max(1, Math.ceil(total * minShown))) return false;
  return true;
};
