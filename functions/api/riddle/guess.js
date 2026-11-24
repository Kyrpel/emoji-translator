// POST /api/riddle/guess { id, player, name?, guess?, giveUp?, attempt? }
//   → { verdict, line, state, answer?, board? }
// Three tries per player. The answer (and everyone's guesses) come back only
// when this player is done: solved, out of tries, or given up.
// The demo riddle keeps no records: its player's browser sends `attempt`.

import { json, readJson, rateLimited } from '../_shared.js';
import {
  DEMO,
  MAX_TRIES,
  MAX_GUESS,
  cleanName,
  cleanText,
  normalize,
  isPlayerId,
  loadRiddle,
  playerState,
  loadBoard,
  judge,
} from '../_riddle.js';

const GUESSES_PER_IP_PER_DAY = 400;

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await readJson(request);
  const riddle = await loadRiddle(env, body?.id);
  if (!riddle) return json({ error: 'not_found' }, 404);

  const giveUp = body?.giveUp === true;
  const guess = cleanText(body?.guess, MAX_GUESS);
  if (!giveUp && !guess) return json({ error: 'invalid_guess' }, 400);
  if (rateLimited(request, 'guess', GUESSES_PER_IP_PER_DAY)) return json({ error: 'rate_limited' }, 429);

  // ---- the demo: judged, never stored ----
  if (riddle.id === DEMO.id) {
    const attempt = Math.min(Math.max(parseInt(body?.attempt, 10) || 1, 1), MAX_TRIES);
    if (giveUp) return json({ verdict: 'gaveup', line: 'Gave up.', answer: DEMO.answer });
    const result = await judge(env, riddle, guess);
    const done = result.verdict === 'right' || attempt >= MAX_TRIES;
    return json({ ...result, ...(done ? { answer: DEMO.answer } : {}) });
  }

  const player = body?.player;
  if (!isPlayerId(player)) return json({ error: 'invalid_player' }, 400);
  const name = cleanName(body?.name);

  const mine = async () => {
    const { results } = await env.DB.prepare(
      'SELECT guess, verdict, line FROM guesses WHERE riddle_id = ? AND player = ? ORDER BY created_at ASC, id ASC'
    )
      .bind(riddle.id, player)
      .all();
    return playerState(results || []);
  };
  const finish = async (state, extra = {}) =>
    json({
      ...extra,
      state,
      ...(state.done ? { answer: riddle.answer, board: await loadBoard(env, riddle.id) } : {}),
    });

  const before = await mine();
  if (before.done) return finish(before, { already: true });

  const result = giveUp ? { verdict: 'gaveup', line: 'Gave up.' } : await judge(env, riddle, guess);
  await env.DB.prepare(
    'INSERT INTO guesses (riddle_id, player, name, guess, guess_norm, verdict, line, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(
      riddle.id,
      player,
      name,
      giveUp ? '' : guess,
      giveUp ? '' : normalize(guess),
      result.verdict,
      result.line,
      Date.now()
    )
    .run();

  return finish(await mine(), result);
}
