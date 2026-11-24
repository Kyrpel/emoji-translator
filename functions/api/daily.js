// EMOJIFY Daily API.
//   GET  /api/daily?date=YYYY-MM-DD  → today's emojis, category and word count (never the answer)
//   POST /api/daily { date, guess, attempt } → { correct, partial, hints, answer? }
//
// The date is the player's local date, so the puzzle turns over at their midnight;
// it is accepted only within a day of the server's UTC date (time zones span
// UTC-12 to UTC+14). Answers are checked here, never in the browser. The answer
// comes back only on a solve or on the last miss.
//
// Not cheat-proof: the client reports which attempt it is on. That is fine while
// the reward is bragging rights; a prize would need per-player server state.

import { json, readJson } from './_shared.js';
import { PUZZLES, DAILY_EPOCH } from './_daily-puzzles.js';

const DAY_MS = 86_400_000;
export const MAX_GUESSES = 5;

const parseDate = (s) =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)))
    : NaN;

const puzzleFor = (date) => {
  const t = parseDate(date);
  if (Number.isNaN(t)) return null;
  const todayUtc = Math.floor(Date.now() / DAY_MS) * DAY_MS;
  if (Math.abs(t - todayUtc) > DAY_MS) return null;
  const number = Math.round((t - parseDate(DAILY_EPOCH)) / DAY_MS) + 1;
  if (number < 1) return null;
  return { number, puzzle: PUZZLES[(number - 1) % PUZZLES.length] };
};

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const bare = (s) => norm(s).replace(/^(the|a|an) /, '');
const squash = (s) => bare(s).replace(/ /g, '');

const levenshtein = (a, b) => {
  if (a === b) return 0;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
};

// Exact after normalising ("the", punctuation, spacing: "spiderman" = "Spider-Man"),
// with one typo allowed per eight letters on longer titles.
const isCorrect = (guess, puzzle) => {
  const g = squash(guess);
  if (!g) return false;
  return [puzzle.answer, ...(puzzle.aliases || [])].some((a) => {
    const t = squash(a);
    return g === t || (t.length >= 8 && levenshtein(g, t) <= Math.floor(t.length / 8));
  });
};

const SMALL = new Set(['the', 'and', 'for', 'you', 'with', 'into', 'from', 'are', 'was', 'all', 'is', 'of', 'to', 'in', 'on', 'a', 'an', 'me', 'my', 'it']);
const keyWords = (s) => norm(s).split(' ').filter((w) => w.length >= 3 && !SMALL.has(w));

// A wrong guess that shares a real word with the answer counts as close (🟨).
const isPartial = (guess, puzzle) => {
  const said = new Set(keyWords(guess));
  return [puzzle.answer, ...(puzzle.aliases || [])].some((a) => keyWords(a).some((w) => said.has(w)));
};

// "The Lion King" → "T__ L___ K___" (reveal = 1), "TH_ LI__ KI__" (reveal = 2)
const pattern = (answer, reveal) =>
  answer
    .split(' ')
    .map((word) => {
      let shown = 0;
      return [...word]
        .map((ch) => {
          if (!/[\p{L}\p{N}]/u.test(ch)) return ch;
          shown += 1;
          return shown <= reveal ? ch.toUpperCase() : '_';
        })
        .join('');
    })
    .join('  ');

const hintsAfter = (wrongs, puzzle) => {
  const hints = {};
  if (wrongs >= 1) hints.letters = pattern(puzzle.answer, 1);
  if (wrongs >= 2) hints.clue = puzzle.clue;
  if (wrongs >= 3) hints.more = pattern(puzzle.answer, 2);
  return hints;
};

export async function onRequestGet({ request }) {
  const date = new URL(request.url).searchParams.get('date');
  const found = puzzleFor(date);
  if (!found) return json({ error: 'no_puzzle_for_date' }, 404);
  const { number, puzzle } = found;
  return new Response(
    JSON.stringify({
      number,
      date,
      emojis: puzzle.emojis,
      category: puzzle.category,
      words: puzzle.answer.split(' ').length,
      maxGuesses: MAX_GUESSES,
    }),
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } }
  );
}

export async function onRequestPost({ request }) {
  const body = await readJson(request);
  const found = puzzleFor(body?.date);
  if (!found) return json({ error: 'no_puzzle_for_date' }, 404);
  const guess = typeof body?.guess === 'string' ? body.guess.slice(0, 120) : '';
  const attempt = Number(body?.attempt);
  if (!guess.trim() || !Number.isInteger(attempt) || attempt < 1 || attempt > MAX_GUESSES) {
    return json({ error: 'invalid_guess' }, 400);
  }

  const { puzzle } = found;
  const correct = isCorrect(guess, puzzle);
  const wrongs = correct ? attempt - 1 : attempt;
  return json({
    correct,
    partial: !correct && isPartial(guess, puzzle),
    hints: hintsAfter(wrongs, puzzle),
    ...(correct || attempt >= MAX_GUESSES ? { answer: puzzle.answer } : {}),
  });
}
