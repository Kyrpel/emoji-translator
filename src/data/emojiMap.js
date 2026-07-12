import { baseEmojiMap, moodEmojis } from './baseEmojiMap.js';
import { extraEmojis } from './extraEmojis.js';

// Merged dictionary. Base entries win on conflicts — they're the original
// hand-curated set; the extras only fill gaps.
export const emojiMap = { ...extraEmojis, ...baseEmojiMap };

export { moodEmojis };
