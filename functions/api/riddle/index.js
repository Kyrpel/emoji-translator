// GET  /api/riddle?id=...&player=...
//      → the riddle without its answer, plus this player's attempts so far.
//        Once the player has finished it, also the answer and everyone's guesses.
// POST /api/riddle { text, puzzle, name?, topic? }
//      → { id, owner }. Only the creator's browser keeps `owner`; it unlocks the results.

import { json, readJson, rateLimited } from '../_shared.js';
import { topicById } from '../../../src/data/topics.js';
import { checkPuzzle } from '../../../src/lib/riddleText.js';
import {
  DEMO,
  MAX_ANSWER,
  newId,
  sha256,
  cleanName,
  cleanText,
  isPlayerId,
  loadRiddle,
  publicRiddle,
  playerState,
  loadBoard,
} from '../_riddle.js';

const CREATES_PER_IP_PER_DAY = 60;

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const riddle = await loadRiddle(env, url.searchParams.get('id'));
  if (!riddle) return json({ error: 'not_found' }, 404);

  const out = { riddle: publicRiddle(riddle) };
  const player = url.searchParams.get('player');
  if (riddle.id !== DEMO.id && isPlayerId(player)) {
    const { results } = await env.DB.prepare(
      'SELECT guess, verdict, line FROM guesses WHERE riddle_id = ? AND player = ? ORDER BY created_at ASC, id ASC'
    )
      .bind(riddle.id, player)
      .all();
    out.state = playerState(results || []);
    if (out.state.done) {
      out.answer = riddle.answer;
      out.board = await loadBoard(env, riddle.id);
    }
  }
  return json(out);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return json({ error: 'store_not_configured' }, 503);

  const body = await readJson(request);
  const text = cleanText(body?.text, MAX_ANSWER);
  const puzzle = cleanText(body?.puzzle, 240);
  const name = cleanName(body?.name);
  const topic = topicById(body?.topic) ? body.topic : null;

  if (!text) return json({ error: 'invalid_text' }, 400);
  // A riddle may only show words from its own sentence, and needs at least one emoji.
  if (!puzzle || !checkPuzzle(puzzle, text)) return json({ error: 'invalid_puzzle' }, 400);
  if (rateLimited(request, 'create', CREATES_PER_IP_PER_DAY)) return json({ error: 'rate_limited' }, 429);

  const owner = newId(32);
  const ownerHash = await sha256(owner);
  for (let i = 0; i < 3; i++) {
    const id = newId();
    try {
      await env.DB.prepare(
        'INSERT INTO riddles (id, owner_hash, name, topic, answer, puzzle, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(id, ownerHash, name, topic, text, puzzle, Date.now())
        .run();
      return json({ id, owner });
    } catch (err) {
      // An id collision: try another. Anything else is a real failure.
      if (!String(err?.message || '').includes('UNIQUE')) return json({ error: 'store_failed' }, 500);
    }
  }
  return json({ error: 'store_failed' }, 500);
}
