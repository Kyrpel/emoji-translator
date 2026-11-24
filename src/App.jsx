import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send, Shuffle, Sparkles, Loader2, Sun, Moon, X } from 'lucide-react';
import { localRiddle } from './lib/emojify.js';
import { makeRiddle, fetchRiddle, fetchResults } from './lib/api.js';
import { getPlayerId, getMyRiddles, addMyRiddle, markSeen } from './lib/me.js';
import { decodeRiddle } from './lib/riddle.js';
import { TOPICS, topicById } from './data/topics.js';
import { STYLES, styleById } from './data/styles.js';
import RiddlePlay from './components/RiddlePlay.jsx';
import RiddleText from './components/RiddleText.jsx';
import ShareDialog from './components/ShareDialog.jsx';
import MyRiddles from './components/MyRiddles.jsx';
import DailyPuzzle from './components/DailyPuzzle.jsx';

// The home page riddle. Same puzzle as DEMO in functions/api/_riddle.js, which holds its answer.
const DEMO = { id: 'demo', name: null, topic: null, puzzle: 'My 🐱 knocked my ☕ onto my 💻' };
// What the flyer shows before you type.
const EXAMPLE = { text: 'I cut my own fringe at 3am', puzzle: 'I ✂️ my own 💇 at 🌙🕒', topic: 'decision' };

const MODE_STORAGE_KEY = 'emojify_mode';
const BASE_TITLE = typeof document !== 'undefined' ? document.title : 'EMOJIFY';

const readStoredMode = () => {
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    if (saved) return saved === 'dark';
  } catch { /* storage unavailable */ }
  return document.documentElement.dataset.mode === 'dark';
};

// Poster type shrinks as the sentence grows, so a long one still fits the flyer.
const saidSizeFor = (text) =>
  text.length <= 32
    ? 'clamp(2.75rem, 2.5vw + 1.75rem, 4.5rem)'
    : text.length <= 80
      ? 'clamp(2.25rem, 1.5vw + 1.5rem, 3.25rem)'
      : 'clamp(1.75rem, 0.75vw + 1.25rem, 2.25rem)';

// A riddle arriving from a link: ?r=id (stored riddles) or ?g=... (older links
// that carry the riddle, answer included).
const readIncoming = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('r');
    if (r && /^[A-Za-z0-9]{8}$/.test(r)) return { kind: 'server', id: r };
    const legacy = decodeRiddle(params.get('g'));
    if (legacy) {
      return { kind: 'local', riddle: { id: 'legacy', name: null, topic: null, puzzle: legacy.e }, answer: legacy.t };
    }
  } catch { /* a broken link just opens the home page */ }
  return null;
};

const clearRiddleParams = () => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('r');
    url.searchParams.delete('g');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch { /* ignore */ }
};

const EmojiRiddles = () => {
  const [input, setInput] = useState('');
  const [topic, setTopic] = useState(null);
  const [style, setStyle] = useState('classic');
  const [isDark, setIsDark] = useState(readStoredMode);
  const [draft, setDraft] = useState('');
  const [ai, setAi] = useState(null); // { text, style, puzzle }: the AI's riddle for that text
  const [making, setMaking] = useState(false);
  const [makeNote, setMakeNote] = useState('');
  const [sharing, setSharing] = useState(null); // { text, puzzle, topic, key }
  const [created, setCreated] = useState({}); // "text|puzzle|topic" → riddle id, this visit
  const [myRiddles, setMyRiddles] = useState(getMyRiddles);
  const [results, setResults] = useState({});
  // A creator opening their own link sees how everyone did instead of a game they can't play.
  const [arrival] = useState(() => {
    const found = readIncoming();
    if (found?.kind === 'server' && getMyRiddles().some((r) => r.id === found.id)) {
      clearRiddleParams();
      return { incoming: null, focusId: found.id };
    }
    return { incoming: found, focusId: null };
  });
  const [incoming, setIncoming] = useState(arrival.incoming);
  const [incomingData, setIncomingData] = useState(() =>
    arrival.incoming?.kind === 'server' ? { status: 'loading' } : null
  );
  const [focusId] = useState(arrival.focusId);
  const inputRef = useRef(null);
  const lastFetch = useRef(0);

  const hasInput = !!input.trim();
  const showingAi = !!ai && ai.text === input && ai.style === style;
  const puzzle = showingAi ? ai.puzzle : draft;
  const topicObj = topicById(topic);

  // The flyer rewrites itself as you type, from the dictionary (instant, offline).
  useEffect(() => {
    setDraft(localRiddle(input, styleById(style).local));
  }, [input, style]);

  // Light kraft board or black wall; remembered on this device.
  useEffect(() => {
    document.documentElement.dataset.mode = isDark ? 'dark' : 'light';
    try {
      localStorage.setItem(MODE_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch { /* storage unavailable */ }
  }, [isDark]);

  // Shared Daily results link to /#daily; the section only exists once React has rendered.
  useEffect(() => {
    if (window.location.hash === '#daily') {
      requestAnimationFrame(() => document.getElementById('daily')?.scrollIntoView());
    }
  }, []);

  // ---------- making a riddle ----------

  const make = async (styleId = style) => {
    const text = input.trim();
    if (!text || making) return;
    setMaking(true);
    setMakeNote('');
    const res = await makeRiddle(text, styleId, topic);
    setMaking(false);
    if (res.ok && res.puzzle) {
      setAi({ text: input, style: styleId, puzzle: res.puzzle });
    } else {
      setMakeNote(
        res.status === 429
          ? 'That’s a lot of riddles from here today. The flyer’s homemade version still works: send it.'
          : 'The AI is busy, so this one’s homemade. You can still send it, or try again in a moment.'
      );
    }
  };

  // Switching style re-asks the AI only when it already wrote this one.
  const chooseStyle = (id) => {
    setStyle(id);
    if (ai && ai.text === input && hasInput) make(id);
  };

  const shuffle = () => {
    if (showingAi) make();
    else setDraft(localRiddle(input, styleById(style).local));
  };

  const openShare = () => {
    const text = input.trim();
    setSharing({ text, puzzle, topic, key: `${text}|${puzzle}|${topic || ''}` });
  };

  const onCreated = ({ id, owner }) => {
    const { key, text, puzzle: sent, topic: about } = sharing;
    setCreated((c) => ({ ...c, [key]: id }));
    setMyRiddles(addMyRiddle({ id, owner, text, puzzle: sent, topic: about }));
    setResults((r) => ({ ...r, [id]: { id, players: 0, solved: 0, guesses: 0, board: [] } }));
  };

  const focusComposer = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 300);
  };

  // ---------- your riddles ----------

  const refreshResults = useCallback(async () => {
    const list = getMyRiddles();
    if (!list.length) return;
    lastFetch.current = Date.now();
    const res = await fetchResults(list.map(({ id, owner }) => ({ id, owner })));
    if (res.ok && Array.isArray(res.results)) {
      setResults(Object.fromEntries(res.results.map((r) => [r.id, r])));
      setMyRiddles(getMyRiddles()); // picks up what was marked seen
    }
  }, []);

  // On arrival, and whenever they come back to the tab.
  useEffect(() => {
    refreshResults();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch.current > 15_000) refreshResults();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshResults]);

  const newCounts = useMemo(
    () =>
      Object.fromEntries(
        myRiddles.map((r) => [r.id, results[r.id] ? Math.max(0, results[r.id].guesses - (r.seen || 0)) : 0])
      ),
    [myRiddles, results]
  );
  const totalNew = Object.values(newCounts).reduce((a, b) => a + b, 0);

  useEffect(() => {
    document.title = totalNew ? `(${totalNew}) ${BASE_TITLE}` : BASE_TITLE;
  }, [totalNew]);

  // Seen once the section has been on screen; the badges stay until the next check.
  const onSeen = useCallback(() => {
    const counts = {};
    for (const r of myRiddles) if (results[r.id]) counts[r.id] = results[r.id].guesses;
    if (Object.keys(counts).length) markSeen(counts);
  }, [myRiddles, results]);

  // ---------- a riddle someone sent ----------

  useEffect(() => {
    if (focusId) setTimeout(() => document.getElementById(`mine-${focusId}`)?.scrollIntoView({ block: 'start' }), 100);
  }, [focusId]);

  useEffect(() => {
    if (incoming?.kind !== 'server') return;
    let alive = true;
    fetchRiddle(incoming.id, getPlayerId()).then((res) => {
      if (!alive) return;
      if (res.ok && res.riddle) setIncomingData({ ...res, status: 'ready' });
      else setIncomingData({ status: res.status === 404 ? 'missing' : 'error' });
    });
    return () => {
      alive = false;
    };
  }, [incoming]);

  const closeIncoming = () => {
    setIncoming(null);
    setIncomingData(null);
    clearRiddleParams();
  };

  const sendOneBack = () => {
    closeIncoming();
    focusComposer();
  };

  // Escape closes whichever dialog is on top.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (incoming) closeIncoming();
      else if (sharing) setSharing(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const posterText = hasInput ? input : EXAMPLE.text;
  const posterPuzzle = hasInput ? puzzle : EXAMPLE.puzzle;
  const posterTopic = topicById(hasInput ? topic : EXAMPLE.topic);
  const fromName = incoming?.kind === 'server' ? incomingData?.riddle?.name : null;
  const playRiddle = incoming?.kind === 'local' ? incoming.riddle : incomingData?.riddle;

  return (
    <>
      <header className="nav">
        <div className="container nav__in">
          <p className="wordmark">Emojify</p>
          <div className="nav__actions">
            {myRiddles.length > 0 && (
              <a className="nav__link" href="#mine">
                Your riddles
                {totalNew > 0 && (
                  <span className="nav__badge">
                    {totalNew}
                    <span className="visually-hidden"> new {totalNew === 1 ? 'guess' : 'guesses'}</span>
                  </span>
                )}
              </a>
            )}
            <a className="nav__link" href="#daily">
              Daily
            </a>
            <button
              type="button"
              className="btn icon-btn"
              onClick={() => setIsDark(!isDark)}
              aria-label={isDark ? 'Switch to the kraft board' : 'Switch to the black wall'}
              aria-pressed={isDark}
            >
              {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="make" aria-labelledby="hero-h">
          <div className="container hero__grid">
            <div className="hero__text">
              <div className="hero__head">
                <h1 id="hero-h">
                  Say it in emoji.
                  <br />
                  See if they get it.
                </h1>
                <p className="lead">
                  Type something true. It comes back with the key words swapped for emojis, and your friends get three
                  tries to fill in the blanks.
                </p>
              </div>

              <div className="hero__slips" role="group" aria-labelledby="topics-label">
                <span className="hero__slips-label" id="topics-label">
                  Pick a topic:
                </span>
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="slip"
                    aria-pressed={topic === t.id}
                    onClick={() => {
                      setTopic(topic === t.id ? null : t.id);
                      inputRef.current?.focus({ preventScroll: true });
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="hero__input">
                <label className="visually-hidden" htmlFor="compose">
                  What you want to say
                </label>
                <textarea
                  id="compose"
                  ref={inputRef}
                  name="sentence"
                  className="compose"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Type something, like “${topicObj ? topicObj.placeholder : EXAMPLE.text}”`}
                  rows={3}
                  maxLength={280}
                />

                {hasInput && (
                  <div className="ai">
                    {!showingAi && (
                      <button
                        type="button"
                        onClick={() => make()}
                        disabled={making}
                        aria-busy={making}
                        className="btn btn--primary"
                      >
                        {making ? (
                          <>
                            <Loader2 className="spin keep-motion" aria-hidden="true" />
                            Thinking in emoji…
                          </>
                        ) : (
                          <>
                            <Sparkles aria-hidden="true" />
                            Turn it into a riddle
                          </>
                        )}
                      </button>
                    )}
                    {showingAi && !making && (
                      <p className="ai__msg">Riddle ready. Send it, or shuffle for another one.</p>
                    )}
                    {makeNote && (
                      <p className="ai__msg" role="status">
                        {makeNote}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="stage">
              <figure className="sheet sheet--fluoro poster">
                <div className="poster__tags">
                  <span className="poster__status" role="status">
                    {!hasInput ? (
                      'Example'
                    ) : making ? (
                      'Thinking…'
                    ) : showingAi ? (
                      <>
                        <Sparkles aria-hidden="true" /> Riddle ready
                      </>
                    ) : (
                      'Rough draft'
                    )}
                  </span>
                  {posterTopic && <span className="poster__topic">Topic: {posterTopic.label.toLowerCase()}</span>}
                </div>
                <p className="poster__said" style={{ '--said-size': saidSizeFor(posterText) }}>
                  {posterText}
                </p>
                <RiddleText puzzle={posterPuzzle} className="poster__riddle" />
                {hasInput && puzzle ? (
                  <div className="poster__foot">
                    <button type="button" className="btn btn--ink" onClick={openShare} disabled={making}>
                      <Send aria-hidden="true" />
                      Send to a friend
                    </button>
                    <button type="button" className="btn" onClick={shuffle} disabled={making}>
                      <Shuffle aria-hidden="true" />
                      Shuffle
                    </button>
                  </div>
                ) : (
                  <figcaption className="poster__foot poster__note">
                    {hasInput
                      ? 'Nothing yet. Turn it into a riddle.'
                      : 'Example. Start typing and this flyer becomes yours.'}
                  </figcaption>
                )}
              </figure>

              <div className="hero__modes">
                <fieldset className="modes">
                  <legend>Style</legend>
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => chooseStyle(s.id)}
                      className="chip"
                      aria-pressed={style === s.id}
                      disabled={making}
                    >
                      {s.label}
                    </button>
                  ))}
                </fieldset>
              </div>
            </div>
          </div>
        </section>

        {myRiddles.length > 0 && (
          <MyRiddles
            riddles={myRiddles}
            results={results}
            newCounts={newCounts}
            focusId={focusId}
            onSeen={onSeen}
            onRefresh={refreshResults}
          />
        )}

        <section className="sec" id="riddle" aria-labelledby="riddle-h">
          <div className="container split">
            <div className="split__text">
              <h2 id="riddle-h">Can you guess this one?</h2>
              <p className="lead">
                Three tries. The judge is an AI with opinions, and it will tell you exactly what it thinks of your
                guess.
              </p>
            </div>
            <div className="sheet riddle-sheet">
              <RiddlePlay riddle={DEMO} kind="demo" idPrefix="demo">
                <button type="button" className="btn btn--primary" onClick={focusComposer}>
                  <Send aria-hidden="true" />
                  Now make one for your friends
                </button>
              </RiddlePlay>
            </div>
          </div>
        </section>

        <section className="daily-band" id="daily" aria-labelledby="daily-h">
          <div className="container">
            <div className="sec__head">
              <h2 id="daily-h">Can you solve today’s?</h2>
              <p className="lead">
                One movie or song a day, told in emoji. Five guesses, the same puzzle for everyone, a new one at
                midnight.
              </p>
            </div>
            <DailyPuzzle />
          </div>
        </section>

        <section className="band" aria-labelledby="accuracy-h">
          <div className="container band__in">
            <h2 id="accuracy-h">Will your friends get it?</h2>
            <p className="band__answer">Probably not.</p>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="container foot__in">
          <p className="foot__sign">Made with chaos and vibes.</p>
          <div className="foot__meta">
            <p>Emojify, {new Date().getFullYear()}</p>
            <nav className="foot__links" aria-label="Footer">
              <a href="#make">Make a riddle</a>
              {myRiddles.length > 0 && <a href="#mine">Your riddles</a>}
              <a href="#daily">Today’s puzzle</a>
            </nav>
          </div>
        </div>
      </footer>

      {sharing && (
        <ShareDialog
          text={sharing.text}
          puzzle={sharing.puzzle}
          topic={sharing.topic}
          existingId={created[sharing.key]}
          onCreated={onCreated}
          onClose={() => setSharing(null)}
        />
      )}

      {incoming && (
        <div className="backdrop" onClick={closeIncoming}>
          <div
            className="dialog dialog--play"
            role="dialog"
            aria-modal="true"
            aria-labelledby="incoming-h"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="incoming-h">Can you guess what {fromName || 'your friend'} said?</h2>
            <button type="button" className="btn icon-btn dialog__close" onClick={closeIncoming} aria-label="Close">
              <X aria-hidden="true" />
            </button>

            {incoming.kind === 'server' && incomingData?.status === 'loading' && (
              <p className="dialog__lead" role="status">
                <Loader2 className="spin keep-motion inline-icon" aria-hidden="true" /> Fetching the riddle…
              </p>
            )}

            {incoming.kind === 'server' && ['missing', 'error'].includes(incomingData?.status) && (
              <div className="dialog__body">
                <p className="dialog__lead">
                  {incomingData.status === 'missing'
                    ? 'This riddle has vanished. Make your own instead.'
                    : 'The riddle didn’t load. Check your connection and open the link again.'}
                </p>
                <button type="button" className="btn btn--primary btn--block" onClick={sendOneBack}>
                  Make my own
                </button>
              </div>
            )}

            {playRiddle && (incoming.kind === 'local' || incomingData?.status === 'ready') && (
              <div className="dialog__body">
                <RiddlePlay
                  riddle={playRiddle}
                  kind={incoming.kind}
                  answer={incoming.answer}
                  initial={incomingData}
                  idPrefix="incoming"
                >
                  <button type="button" className="btn btn--primary btn--block" onClick={sendOneBack}>
                    <Send aria-hidden="true" />
                    {fromName ? `Your turn: send one back to ${fromName}` : 'Your turn: send one back'}
                  </button>
                </RiddlePlay>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default EmojiRiddles;
