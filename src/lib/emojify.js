// The offline riddle maker: instant, gloriously wrong ("died" finds fried
// shrimp). It rewrites the flyer as you type, and stands in whenever the AI
// can't be reached.
import Fuse from 'fuse.js';
import { removeStopwords } from 'stopword';
import { emojiMap, cleanEmojiMap } from '../data/emojiMap.js';

// Built once: the dictionary is static. Cheeky words stay out of the fuzzy
// index, so fuzzy matching never turns "class" into 🍑.
const spellChecker = new Fuse(Object.keys(cleanEmojiMap), { threshold: 0.4, includeScore: true });

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// An exact dictionary word is never "corrected" (this is how cheeky words,
// which are kept out of the fuzzy index, still match when typed).
const spellCorrect = (word) => {
  if (Object.prototype.hasOwnProperty.call(emojiMap, word)) return word;
  const results = spellChecker.search(word);
  return results.length > 0 && results[0].score < 0.6 ? results[0].item : word;
};

// A fill-in-the-blanks riddle from the dictionary: small words stay, most of
// the important ones become emojis, and about one in three stays as a clue.
//   "My ex still has my hoodie" → "My 💔 still has my hoodie"
//   hard    hide every important word
//   flavor  emojis for the style's tone (🤡💀 for roast…), added after some blanks
// A word the dictionary doesn't know becomes ❓.
export const localRiddle = (text, { hard = false, flavor = null } = {}) => {
  const items = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const word = raw.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
      const small = !word || word.length <= 2 || removeStopwords([word]).length === 0;
      const options = small ? null : emojiMap[spellCorrect(word)] || null;
      return { raw, word, small, options };
    });
  if (!items.length) return '';

  const content = items.filter((i) => !i.small);
  const hide = new Set();
  if (hard) {
    content.forEach((i) => hide.add(i));
  } else {
    // Hide what the dictionary can draw, then more (longest first) until about two thirds are hidden…
    content.filter((i) => i.options).forEach((i) => hide.add(i));
    const want = Math.ceil(content.length * 0.6);
    for (const i of [...content].sort((a, b) => b.word.length - a.word.length)) {
      if (hide.size >= want) break;
      hide.add(i);
    }
    // …and keep about one in three as a clue.
    const clues = content.length >= 3 ? Math.max(1, Math.floor(content.length / 3)) : 0;
    for (const i of content.filter((c) => !c.options).concat(content.filter((c) => c.options))) {
      if (content.length - hide.size >= clues) break;
      hide.delete(i);
    }
  }
  // A riddle needs at least one blank.
  if (!hide.size) hide.add([...items].sort((a, b) => b.word.length - a.word.length)[0]);

  let blanks = 0;
  return items
    .map((i) => {
      if (!hide.has(i)) return i.raw;
      const emoji = i.options ? pick(i.options) : '❓';
      blanks += 1;
      // Every other blank gets a touch of the style's tone.
      return flavor && blanks % 2 === 1 ? emoji + pick(flavor) : emoji;
    })
    .join(' ');
};
