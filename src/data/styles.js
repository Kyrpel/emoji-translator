// How the emojis in a riddle are picked. Every style is free. The AI prompt for
// each id lives in functions/api/_shared.js (STYLE_PROMPTS).
//   label    on the chip
//   about    one line under the chips, saying what this style does
//   example  the home page example ("I cut my own fringe at 3am") in this style
//   hard     the offline maker hides every important word
//   flavor   emojis the offline maker adds for the style's tone
//   more     tucked behind "more styles"
export const STYLES = [
  {
    id: 'classic',
    label: 'easy',
    about: 'Easy: a clear emoji for each hidden word, with a few words left as clues.',
    example: 'I ✂️ my own 💇 at 🌙🕒',
  },
  {
    id: 'hard',
    label: 'hard',
    about: 'Hard: every important word hidden. Only the little words are left.',
    example: 'I ✂️ my 🫵 💇 at 🌚🕒',
    hard: true,
  },
  {
    id: 'roast',
    label: 'roast',
    about: 'Roast: the emojis tease whoever said it.',
    example: 'I ✂️🤡 my own 💇💀 at 🌙🕒',
    flavor: ['🤡', '💀', '🐌', '🗑️'],
  },
  {
    id: 'genz',
    label: 'gen z',
    about: 'Gen Z: maximum irony, minimum chill.',
    example: 'I ✂️💀 my own 💇😭 at 🌙🕒',
    flavor: ['💀', '😭', '🔥', '✋'],
    more: true,
  },
  {
    id: 'flirty',
    label: 'flirty',
    about: 'Flirty: cheeky emojis, never rude.',
    example: 'I ✂️😏 my own 💇💋 at 🌙🕒',
    flavor: ['😏', '💋', '😘', '🔥'],
    more: true,
  },
  {
    id: 'passive',
    label: 'passive-aggressive',
    about: 'Passive-aggressive: sweet on the surface.',
    example: 'I ✂️🙂 my own 💇✨ at 🌙🕒🙃',
    flavor: ['🙂', '🙃', '✨', '💅'],
    more: true,
  },
];

export const styleById = (id) => STYLES.find((s) => s.id === id) || STYLES[0];
