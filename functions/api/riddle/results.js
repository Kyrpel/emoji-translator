// POST /api/riddle/results { items: [{ id, owner }] }
//   → { results: [{ id, players, solved, guesses, board }] }
// The creator's view of their riddles. `owner` is the secret key their browser
// got when the riddle was made; a riddle with a wrong key is left out.

import { json, readJson } from '../_shared.js';
import { isRiddleId, sha256, boardFrom } from '../_riddle.js';

const MAX_ITEMS = 50;
const marks = (list) => list.map(() => '?').join(',');

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return json({ error: 'store_not_configured' }, 503);

  const body = await readJson(request);
  const items = (Array.isArray(body?.items) ? body.items : [])
    .filter((it) => isRiddleId(it?.id) && typeof it?.owner === 'string' && it.owner.length <= 64)
    .slice(0, MAX_ITEMS);
  if (!items.length) return json({ results: [] });

  const ids = items.map((it) => it.id);
  const { results: riddles } = await env.DB.prepare(`SELECT id, owner_hash FROM riddles WHERE id IN (${marks(ids)})`)
    .bind(...ids)
    .all();
  const hashes = new Map((riddles || []).map((r) => [r.id, r.owner_hash]));

  const allowed = [];
  for (const it of items) {
    const hash = hashes.get(it.id);
    if (hash && hash === (await sha256(it.owner))) allowed.push(it.id);
  }
  if (!allowed.length) return json({ results: [] });

  const { results: rows } = await env.DB.prepare(
    `SELECT riddle_id, player, name, guess, verdict, line, created_at FROM guesses
     WHERE riddle_id IN (${marks(allowed)}) ORDER BY created_at ASC, id ASC LIMIT 5000`
  )
    .bind(...allowed)
    .all();

  const byRiddle = new Map(allowed.map((id) => [id, []]));
  for (const r of rows || []) byRiddle.get(r.riddle_id)?.push(r);

  return json({
    results: allowed.map((id) => {
      const list = byRiddle.get(id);
      const board = boardFrom(list);
      return {
        id,
        players: board.length,
        solved: board.filter((p) => p.solved).length,
        guesses: list.length,
        board,
      };
    }),
  });
}
