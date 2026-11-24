import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Share2, Loader2 } from 'lucide-react';
import { MAX_GUESSES, todayKey, loadDay, saveDay, currentStreak, resultText } from '../lib/daily.js';

const RESULT_LABEL = { wrong: 'Nope', close: 'Close', solved: 'Solved' };

// EMOJIFY Daily: one movie or song a day, told in emoji, five guesses.
const DailyPuzzle = () => {
  const date = useMemo(todayKey, []);
  const [puzzle, setPuzzle] = useState(null);
  const [status, setStatus] = useState('loading');
  const [day, setDay] = useState(() => loadDay(date));
  const [guess, setGuess] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fieldRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/daily?date=${date}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((p) => {
        if (!alive) return;
        setPuzzle(p);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [date]);

  const left = MAX_GUESSES - day.guesses.length;
  const streak = currentStreak(date);

  const submit = async (e) => {
    e.preventDefault();
    const text = guess.trim();
    if (!text) {
      fieldRef.current?.focus();
      return;
    }
    if (busy || day.done || status !== 'ready') return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, guess: text, attempt: day.guesses.length + 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      const result = data.correct ? 'solved' : data.partial ? 'close' : 'wrong';
      const guesses = [...day.guesses, { text, result }];
      const next = {
        guesses,
        hints: { ...day.hints, ...(data.hints || {}) },
        done: data.correct || guesses.length >= MAX_GUESSES,
        won: !!data.correct,
        answer: data.answer || day.answer,
        number: puzzle.number,
      };
      setDay(next);
      saveDay(date, next);
      setGuess('');
      if (!next.done) requestAnimationFrame(() => fieldRef.current?.focus());
    } catch {
      setError('That guess did not reach the puzzle server. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const text = resultText({
      number: day.number || puzzle?.number,
      category: puzzle?.category,
      guesses: day.guesses,
      won: day.won,
      streak,
      origin: window.location.origin,
    });
    try {
      if (window.matchMedia?.('(pointer: coarse)').matches && navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: nothing more to do */ }
  };

  const shareTo = (url) => window.open(url, '_blank');
  const resultForX = () =>
    encodeURIComponent(
      resultText({ number: day.number || puzzle?.number, category: puzzle?.category, guesses: day.guesses, won: day.won, streak, origin: window.location.origin })
    );

  return (
    <div className="sheet daily">
      <div className="daily__puzzle">
        {status === 'ready' && (
          <>
            <p className="daily__meta">
              Puzzle {puzzle.number}. A {puzzle.category}, {puzzle.words} {puzzle.words === 1 ? 'word' : 'words'}.
            </p>
            <p className="daily__emojis emoji" role="img" aria-label={`Today’s puzzle: ${puzzle.emojis}`}>
              {puzzle.emojis}
            </p>
          </>
        )}
        {status === 'loading' && <p className="daily__meta">Fetching today’s puzzle…</p>}
        {status === 'error' && (
          <p className="daily__meta">Today’s puzzle didn’t load. Refresh the page to try again.</p>
        )}
      </div>

      <div className="daily__play">
        {day.guesses.length > 0 && (
          <ol className="daily__guesses" aria-label="Your guesses">
            {day.guesses.map((g, i) => (
              <li key={i} className={`daily__guess daily__guess--${g.result}`}>
                <span className="daily__guess-text">{g.text}</span>
                <span className="daily__tag">{RESULT_LABEL[g.result]}</span>
              </li>
            ))}
          </ol>
        )}

        {!day.done && (day.hints.letters || day.hints.clue) && (
          <dl className="daily__hints">
            {day.hints.letters && (
              <div>
                <dt>First letters</dt>
                <dd className="daily__pattern">{day.hints.more || day.hints.letters}</dd>
              </div>
            )}
            {day.hints.clue && (
              <div>
                <dt>Clue</dt>
                <dd>{day.hints.clue}</dd>
              </div>
            )}
          </dl>
        )}

        {!day.done ? (
          <form className="daily__form" onSubmit={submit}>
            <label className="field-label" htmlFor="daily-guess">
              {day.guesses.length === 0 ? 'Name the ' + (puzzle?.category || 'movie or song') : `Guess ${day.guesses.length + 1} of ${MAX_GUESSES}`}
            </label>
            <div className="riddle__row">
              <input
                id="daily-guess"
                ref={fieldRef}
                name="daily-guess"
                type="text"
                autoComplete="off"
                enterKeyHint="go"
                className="input"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder={puzzle?.category === 'song' ? 'Song title' : 'Movie title'}
                disabled={status !== 'ready'}
              />
              <button type="submit" className="btn btn--primary" disabled={status !== 'ready'} aria-busy={busy}>
                {busy && <Loader2 className="spin keep-motion" aria-hidden="true" />}
                Guess
              </button>
            </div>
            <p className="daily__left" role="status">
              {error || `${left} ${left === 1 ? 'guess' : 'guesses'} left. Each miss unlocks a hint.`}
            </p>
          </form>
        ) : (
          <div className="daily__result" role="status">
            <p className="daily__verdict">{day.won ? `Solved in ${day.guesses.length}` : 'Missed it'}</p>
            <p className="daily__answer">It was “{day.answer}”.</p>
            {day.won && streak > 0 && (
              <p>
                Streak: {streak} {streak === 1 ? 'day' : 'days'}.
              </p>
            )}
            <div className="daily__share">
              <button type="button" className="btn btn--primary" onClick={share}>
                {copied ? <Copy aria-hidden="true" /> : <Share2 aria-hidden="true" />}
                {copied ? 'Copied, now paste it' : 'Share my result'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => shareTo(`https://twitter.com/intent/tweet?text=${resultForX()}`)}
              >
                Post on X
              </button>
            </div>
            <p className="daily__left">A new puzzle drops at midnight.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyPuzzle;
