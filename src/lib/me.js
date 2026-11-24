// Who you are on this device, with no account: a random player id, the name
// you typed once, and the riddles you made (with the secret key that unlocks
// each one's results). All in localStorage.

const PLAYER_KEY = 'emojify_player';
const NAME_KEY = 'emojify_name';
const RIDDLES_KEY = 'emojify_my_riddles';
const MAX_KEPT = 50;

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch { /* private mode: the game still plays, it just won't remember */ }
};

let sessionPlayer = null;
export const getPlayerId = () => {
  let id = read(PLAYER_KEY);
  if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
    id = sessionPlayer || crypto.randomUUID();
    sessionPlayer = id;
    write(PLAYER_KEY, id);
  }
  return id;
};

export const getName = () => (read(NAME_KEY) || '').slice(0, 24);
export const setName = (name) => write(NAME_KEY, String(name || '').trim().slice(0, 24));

// [{ id, owner, text, puzzle, topic, createdAt, seen }] newest first.
// `seen` is how many guesses the creator has already looked at.
export const getMyRiddles = () => {
  try {
    const list = JSON.parse(read(RIDDLES_KEY));
    return Array.isArray(list) ? list.filter((r) => r && r.id && r.owner) : [];
  } catch {
    return [];
  }
};

const saveMyRiddles = (list) => write(RIDDLES_KEY, JSON.stringify(list.slice(0, MAX_KEPT)));

export const addMyRiddle = (riddle) => {
  const list = [{ ...riddle, createdAt: Date.now(), seen: 0 }, ...getMyRiddles().filter((r) => r.id !== riddle.id)];
  saveMyRiddles(list);
  return list;
};

export const markSeen = (counts) => {
  const list = getMyRiddles().map((r) => (counts[r.id] !== undefined ? { ...r, seen: counts[r.id] } : r));
  saveMyRiddles(list);
  return list;
};

export const riddleLink = (id) => `${window.location.origin}/?r=${id}`;
