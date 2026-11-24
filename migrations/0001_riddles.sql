-- A riddle: the secret sentence stays here; friends only ever see the emojis.
CREATE TABLE riddles (
  id         TEXT PRIMARY KEY,      -- public, in the link (?r=...)
  owner_hash TEXT NOT NULL,         -- SHA-256 of the creator's secret key (kept in their browser)
  name       TEXT,                  -- who it's from, as they typed it
  topic      TEXT,                  -- a topic id from TOPICS, or NULL
  answer     TEXT NOT NULL,
  emojis     TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Every guess, so the creator sees who tried what.
CREATE TABLE guesses (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  riddle_id  TEXT NOT NULL,
  player     TEXT NOT NULL,         -- random id kept in the player's browser
  name       TEXT,
  guess      TEXT NOT NULL,
  guess_norm TEXT NOT NULL,         -- normalised guess: the same guess is judged once
  verdict    TEXT NOT NULL,         -- right | close | wrong | gaveup
  line       TEXT,                  -- the judge's reaction
  created_at INTEGER NOT NULL
);
CREATE INDEX guesses_by_riddle ON guesses (riddle_id, created_at);
CREATE INDEX guesses_by_player ON guesses (riddle_id, player);
CREATE INDEX guesses_by_norm ON guesses (riddle_id, guess_norm);
