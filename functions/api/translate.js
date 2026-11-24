import { json, readJson, STYLE_PROMPTS, STYLE_ALIASES, rateLimited } from './_shared.js';
import { chat } from './_ai.js';
import { topicById } from '../../src/data/topics.js';
import { keepOwnWords, checkPuzzle } from '../../src/lib/riddleText.js';

// POST /api/translate { text, style, topic? } → { puzzle }
// Turns the creator's sentence into a fill-in-the-blanks emoji riddle: their
// own words, with most of the important ones swapped for emojis. Free for
// everyone; the per-IP limit only stops one visitor from draining the shared
// AI allowance. A riddle that adds words or hides too little is asked for
// once more, then refused, and the page falls back to its offline version.
const MAKES_PER_IP_PER_DAY = 120;
const ATTEMPTS = 2;

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await readJson(request);
  const text = typeof body?.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : '';
  const asked = body?.style || body?.mode;
  const style = STYLE_PROMPTS[asked] ? asked : STYLE_ALIASES[asked];
  const topic = topicById(body?.topic);

  if (!text || text.length > 280) return json({ error: 'invalid_text' }, 400);
  if (!style) return json({ error: 'invalid_style' }, 400);
  if (rateLimited(request, 'make', MAKES_PER_IP_PER_DAY)) return json({ error: 'rate_limited' }, 429);

  let last = { error: 'empty_result', status: 502 };
  for (let i = 0; i < ATTEMPTS; i++) {
    const res = await chat(env, {
      system: STYLE_PROMPTS[style],
      // The topic is context the guesser also gets.
      user: topic ? `(Topic, which the guesser is told: ${topic.label.toLowerCase()})\n${text}` : text,
      maxTokens: 120,
      temperature: i === 0 ? 0.9 : 0.6,
    });
    if (!res.ok) return json({ error: res.error, upstream: res.upstream }, res.status);

    const line = res.content.split('\n').map((l) => l.trim()).find(Boolean) || '';
    const puzzle = keepOwnWords(line.replace(/^(riddle|answer)\s*:\s*/i, '').replace(/^["“]|["”]$/g, ''), text).slice(0, 240);
    // Enough real words must stay to make it guessable (hard mode may keep fewer).
    if (checkPuzzle(puzzle, text, { strict: true, minShown: style === 'hard' ? 0.15 : 0.3 })) return json({ puzzle });
    last = { error: 'unfair_riddle', status: 502 };
  }
  return json({ error: last.error }, last.status);
}
