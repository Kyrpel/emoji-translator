import { baseEmojiMap, moodEmojis } from './baseEmojiMap.js';
import { extraEmojis } from './extraEmojis.js';
import { spicyEmojis } from './spicyEmojis.js';

// Merged dictionary. Base entries win on conflicts — they're the original
// hand-curated set; the extras only fill gaps.
export const cleanEmojiMap = { ...extraEmojis, ...baseEmojiMap };

// Everything a typed word can match exactly, cheeky words included.
export const emojiMap = { ...spicyEmojis, ...cleanEmojiMap };

export { moodEmojis };

// Minimal mode's answer when no word in the sentence is in the dictionary.
export const minimalFallback = ['✨', '🎯', '💫'];
