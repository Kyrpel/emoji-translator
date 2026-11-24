import React, { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { sendGuess } from '../lib/api.js';
import { getPlayerId, getName, setName } from '../lib/me.js';
import { scoreGuess } from '../lib/riddle.js';
import { topicHint } from '../data/topics.js';
import Board from './Board.jsx';
import RiddleText from './RiddleText.jsx';

export const MAX_TRIES = 3;

const TAG = { right: 'Got it', close: 'So close', wrong: 'Nope', gaveup: 'Gave up' };

// Old ?g= links carry their answer, so they are judged right here, by word overlap.
const LOCAL_LINE = { right: 'Nailed it.', close: 'So close it hurts.', wrong: 'Not even close.' };
const localJudge = (guess, answer) => {
  const { hit, total } = scoreGuess(guess, answer);
  const verdict = total && hit === total ? 'right' : total && hit / total >= 0.5 ? 'close' : 'wrong';
  return { verdict, line: LOCAL_LINE[verdict] };
};

const errorFor = (res) =>
  res.status === 429
    ? 'Easy there: that’s a lot of guessing from one place today. Try again tomorrow.'
    : 'That guess got lost on the way. Try again.';

// The guessing game: the emojis, three tries, the judge's line after each,
// then the reveal and everyone else's guesses.
//   kind     "server" (a riddle in the database), "demo" (the home page one,
//            never stored) or "local" (an old link that carries its answer)
//   initial  what GET /api/riddle returned for this player: { state, answer, board }
//   children shown once the player is done (the "send one back" button)
const RiddlePlay = ({ riddle, kind = 'server', answer: knownAnswer = '', initial, idPrefix, children }) => {
  const [attempts, setAttempts] = useState(initial?.state?.attempts || []);
  const [done, setDone] = useState(!!initial?.state?.done);
  const [answer, setAnswer] = useState(initial?.answer || '');
  const [board, setBoard] = useState(initial?.board || null);
  const [guess, setGuess] = useState('');
  const [name, setNameField] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fieldRef = useRef(null);

  const askName = kind === 'server' && !getName() && attempts.length === 0;
  const tries = attempts.filter((a) => a.verdict !== 'gaveup').length;
  const solved = attempts.some((a) => a.verdict === 'right');
  const gaveUp = attempts.some((a) => a.verdict === 'gaveup');
  const hint = topicHint(riddle.topic, riddle.name);
  const who = riddle.name || 'They';

  const apply = (res, entry) => {
    if (res.state) {
      setAttempts(res.state.attempts);
      setDone(res.state.done);
    } else {
      const next = [...attempts, entry];
      setAttempts(next);
      const over = entry.verdict === 'right' || entry.verdict === 'gaveup' || next.filter((a) => a.verdict !== 'gaveup').length >= MAX_TRIES;
      setDone(over);
    }
    if (res.answer) setAnswer(res.answer);
    if (res.board) setBoard(res.board);
  };

  const play = async ({ giveUp = false } = {}) => {
    const text = guess.trim();
    if (!giveUp && !text) {
      fieldRef.current?.focus();
      return;
    }
    if (busy || done) return;
    setError('');

    if (kind === 'local') {
      const result = giveUp ? { verdict: 'gaveup', line: 'Gave up.' } : localJudge(text, knownAnswer);
      apply({ answer: knownAnswer }, { guess: text, ...result });
      setGuess('');
      return;
    }

    setBusy(true);
    if (askName && name.trim()) setName(name);
    const res = await sendGuess({
      id: riddle.id,
      player: kind === 'server' ? getPlayerId() : undefined,
      name: kind === 'server' ? name.trim() || getName() || undefined : undefined,
      guess: giveUp ? undefined : text,
      giveUp,
      attempt: kind === 'demo' ? tries + 1 : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(errorFor(res));
      return;
    }
    apply(res, { guess: text, verdict: res.verdict, line: res.line });
    setGuess('');
    if (!res.answer) requestAnimationFrame(() => fieldRef.current?.focus());
  };

  const submit = (e) => {
    e.preventDefault();
    play();
  };

  const fieldId = `${idPrefix}-guess`;
  const nameId = `${idPrefix}-name`;
  const others = board?.length ? board : null;

  return (
    <div className="play">
      <RiddleText puzzle={riddle.puzzle} className="play__riddle" />
      {hint && <p className="play__hint">{hint}.</p>}

      {attempts.length > 0 && (
        <ol className="tries" aria-label="Your guesses">
          {attempts.map((a, i) => (
            <li key={i} className={`try try--${a.verdict}`}>
              <span className={`verdict verdict--${a.verdict}`}>{TAG[a.verdict]}</span>
              {a.verdict !== 'gaveup' && <span className="try__guess">“{a.guess}”</span>}
              {a.verdict !== 'gaveup' && a.line && <span className="try__line">{a.line}</span>}
            </li>
          ))}
        </ol>
      )}

      {!done ? (
        <form className="play__form" onSubmit={submit}>
          {askName && (
            <div>
              <label className="field-label" htmlFor={nameId}>
                Your name <span className="field-label__note">(so {riddle.name || 'they'} can see who guessed)</span>
              </label>
              <input
                id={nameId}
                name="name"
                type="text"
                autoComplete="given-name"
                className="input"
                maxLength={24}
                value={name}
                onChange={(e) => setNameField(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}
          <label className="field-label" htmlFor={fieldId}>
            {tries === 0 ? 'Fill in the blanks: what did they say?' : `Guess ${tries + 1} of ${MAX_TRIES}`}
          </label>
          <div className="play__row">
            <input
              id={fieldId}
              ref={fieldRef}
              name="guess"
              type="text"
              autoComplete="off"
              enterKeyHint="go"
              className="input"
              maxLength={140}
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="The whole sentence"
              disabled={busy}
            />
            <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy}>
              {busy ? (
                <>
                  <Loader2 className="spin keep-motion" aria-hidden="true" />
                  Judging…
                </>
              ) : (
                'Guess'
              )}
            </button>
          </div>
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
          <div>
            <button type="button" className="link" onClick={() => play({ giveUp: true })} disabled={busy}>
              I give up, show me
            </button>
          </div>
        </form>
      ) : (
        <div className="play__done" role="status">
          <p className="play__verdict">{solved ? 'You got it' : gaveUp ? 'Here it is' : 'Out of tries'}</p>
          {answer && (
            <p className="play__answer">
              {who} said: <q>{answer}</q>
            </p>
          )}
          {children}
          {kind === 'server' && others && (
            <div className="play__board">
              <h3>How everyone did</h3>
              <Board board={others} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RiddlePlay;
