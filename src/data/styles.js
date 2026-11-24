// How a riddle is written. Every style is free. The AI prompt for each id lives
// in functions/api/_shared.js (STYLE_PROMPTS); `local` is the dictionary mode
// the flyer uses while you type, and when the AI can't be reached.
export const STYLES = [
  { id: 'classic', label: 'classic', local: 'vibe' },
  { id: 'hard', label: 'hard mode', local: 'minimal' },
  { id: 'story', label: 'story', local: 'literal' },
  { id: 'chaos', label: 'chaos', local: 'chaos' },
  { id: 'roast', label: 'roast', local: 'vibe' },
  { id: 'genz', label: 'gen z', local: 'vibe' },
  { id: 'flirty', label: 'flirty', local: 'vibe' },
  { id: 'passive', label: 'passive-aggressive', local: 'vibe' },
];

export const styleById = (id) => STYLES.find((s) => s.id === id) || STYLES[0];
