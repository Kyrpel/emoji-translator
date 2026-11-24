// Calls to the serverless functions. Same-origin, so no CORS setup needed.
// Every call resolves (never throws): { ok, status, ...data }.

const call = async (path, options) => {
  try {
    const res = await fetch(path, options);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, ...data };
  } catch {
    return { ok: false, status: 0, error: 'network' };
  }
};

const post = (path, body) =>
  call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// The AI turns a sentence into a fill-in-the-blanks riddle → { puzzle }
export const makeRiddle = (text, style, topic) => post('/api/translate', { text, style, topic });

// Store a riddle → { id, owner }
export const createRiddle = ({ text, puzzle, name, topic }) => post('/api/riddle', { text, puzzle, name, topic });

// → { riddle, state?, answer?, board? }
export const fetchRiddle = (id, player) =>
  call(`/api/riddle?id=${encodeURIComponent(id)}&player=${encodeURIComponent(player || '')}`);

// → { verdict, line, state?, answer?, board? }
export const sendGuess = (body) => post('/api/riddle/guess', body);

// The creator's results → { results: [{ id, players, solved, guesses, board }] }
export const fetchResults = (items) => post('/api/riddle/results', { items });
