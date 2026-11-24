// The dictionary translator: instant, offline, gloriously wrong ("died" finds
// fried shrimp). It rewrites the flyer as you type, and stands in when the AI
// can't be reached. Modes: vibe, literal, chaos, minimal.
import Fuse from 'fuse.js';
import nlp from 'compromise';
import Sentiment from 'sentiment';
import { removeStopwords } from 'stopword';
import { emojiMap, cleanEmojiMap, moodEmojis, minimalFallback } from '../data/emojiMap.js';

// Built once: the dictionary is static. Cheeky words stay out of the fuzzy
// index, so fuzzy matching never turns "class" into 🍑.
const spellChecker = new Fuse(Object.keys(cleanEmojiMap), { threshold: 0.4, includeScore: true });
const sentiment = new Sentiment();
const ALL_EMOJIS = Object.values(cleanEmojiMap).flat();

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// An exact dictionary word is never "corrected" (this is how cheeky words,
// which are kept out of the fuzzy index, still match when typed).
const spellCorrect = (word) => {
  if (Object.prototype.hasOwnProperty.call(emojiMap, word)) return word;
  const results = spellChecker.search(word);
  return results.length > 0 && results[0].score < 0.6 ? results[0].item : word;
};

const splitWords = (phrases) => phrases.flatMap((phrase) => phrase.split(/\s+/));

// A fill-in-the-blanks riddle from the dictionary: small words stay, most of
// the important ones become emojis, and about one in three stays as a clue.
//   "My ex still has my hoodie" → "My 💔 still has my hoodie"
// Modes: vibe (one emoji a word), literal (two), minimal (hide every important
// word), chaos (random emojis). A word the dictionary doesn't know becomes ❓.
export const localRiddle = (text, mode = 'vibe') => {
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
  if (mode === 'minimal') {
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

  const out = items.map((i) => {
    if (!hide.has(i)) return i.raw;
    if (mode === 'chaos') return pick(ALL_EMOJIS) + (Math.random() > 0.5 ? pick(ALL_EMOJIS) : '');
    if (!i.options) return '❓';
    if (mode === 'literal') return i.options.slice(0, 2).join('');
    return pick(i.options);
  });
  return out.join(' ');
};

export const localEmojify = (text, mode = 'vibe') => {
  if (!text.trim()) return '';

  const cleaned = removeStopwords(text.toLowerCase().split(/\s+/).map((w) => w.replace(/[.,!?;:]/g, ''))).join(' ');
  const doc = nlp(cleaned);
  const verbs = splitWords(doc.verbs().out('array'));
  const nouns = splitWords(doc.nouns().out('array'));
  const adjectives = splitWords(doc.adjectives().out('array'));
  const important = [...verbs, ...nouns, ...adjectives].map((w) => w.toLowerCase().trim()).filter((w) => w.length > 2);
  const corrected = important.map(spellCorrect);

  let result = [];

  if (mode === 'chaos') {
    const count = Math.floor(Math.random() * 8) + 5;
    for (let i = 0; i < count; i++) result.push(pick(ALL_EMOJIS));
  } else if (mode === 'minimal') {
    for (const word of corrected.slice(0, 3)) if (emojiMap[word]) result.push(pick(emojiMap[word]));
    if (result.length === 0) result = minimalFallback.slice(0, 3);
  } else if (mode === 'literal') {
    for (const word of corrected) result.push(emojiMap[word] ? emojiMap[word][0] : '•');
  } else {
    const mood = sentiment.analyze(text).score;
    if (mood > 0) result.push(pick(moodEmojis.happy));
    else if (mood < 0) result.push(pick(moodEmojis.sad));

    const words = [...verbs, ...nouns].map((w) => w.toLowerCase().trim()).filter((w) => w.length > 2);
    for (const word of words) {
      const found = emojiMap[spellCorrect(word)];
      if (!found) continue;
      const count = Math.random() > 0.5 ? 1 : 2;
      for (let i = 0; i < count; i++) result.push(pick(found));
    }

    if (result.length === 0) {
      const moodSet = /!/.test(text) ? moodEmojis.excited : /\?/.test(text) ? moodEmojis.questioning : moodEmojis.happy;
      result.push(pick(moodSet));
    }
  }

  return result.slice(0, 12).join('');
};
