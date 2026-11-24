// EMOJIFY Daily, browser side: today's local date, saved progress, streaks and
// the spoiler-free result people paste into groups. Answers are checked by
// /api/daily; nothing here knows them.

const KEY = 'emojify_daily_v1';
export const MAX_GUESSES = 5;

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => dateKey(new Date());

const readAll = () => {
  try {
    const o = JSON.parse(localStorage.getItem(KEY));
    return o && typeof o === 'object' && o.days && typeof o.days === 'object' ? o : { days: {} };
  } catch {
    return { days: {} };
  }
};

export const emptyDay = () => ({ guesses: [], hints: {}, done: false, won: false, answer: '', number: null });

export const loadDay = (date) => ({ ...emptyDay(), ...(readAll().days[date] || {}) });

export const saveDay = (date, day) => {
  const all = readAll();
  all.days[date] = day;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* private mode: the game still plays, it just won't remember */ }
};

// Consecutive solved days, ending today (if solved) or yesterday (if today is still open).
export const currentStreak = (today) => {
  const { days } = readAll();
  const t = days[today];
  if (t?.done && !t.won) return 0;
  const d = new Date(`${today}T12:00:00`);
  if (!t?.won) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days[dateKey(d)]?.won) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
};

const SQUARE = { solved: '🟩', close: '🟨', wrong: '🟥' };

// e.g.
//   EMOJIFY Daily #12 🎬
//   🟥🟨🟩 3/5
//   🔥 4-day streak
//   https://emojify.co/#daily
export const resultText = ({ number, category, guesses, won, streak, origin }) => {
  const squares = guesses.map((g) => SQUARE[g.result] || '🟥').join('');
  const score = won ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  return [
    `EMOJIFY Daily #${number} ${category === 'song' ? '🎵' : '🎬'}`,
    `${squares} ${score}`,
    won && streak > 1 ? `🔥 ${streak}-day streak` : null,
    `${origin}/#daily`,
  ]
    .filter(Boolean)
    .join('\n');
};
