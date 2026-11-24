import React, { useRef, useState } from 'react';
import { scoreGuess, verdictFor } from '../lib/riddle.js';

// The guessing game: emojis, a guess, then the reveal. Surface-free on purpose:
// it sits on a sheet in the page and inside the riddle dialog.
const RiddleSheet = ({ emojis, answer, idPrefix, children }) => {
  const [guess, setGuess] = useState('');
  const [result, setResult] = useState(null);
  const fieldRef = useRef(null);

  const check = (e) => {
    e.preventDefault();
    if (!guess.trim()) {
      fieldRef.current?.focus();
      return;
    }
    setResult(scoreGuess(guess, answer));
  };

  const fieldId = `${idPrefix}-guess`;

  return (
    <div className="riddle">
      <p className="riddle__emojis emoji" role="img" aria-label={`Emoji riddle: ${emojis}`}>
        {emojis}
      </p>

      {!result ? (
        <form className="riddle__form" onSubmit={check}>
          <label className="field-label" htmlFor={fieldId}>
            Your guess
          </label>
          <div className="riddle__row">
            <input
              id={fieldId}
              ref={fieldRef}
              name="guess"
              type="text"
              autoComplete="off"
              enterKeyHint="go"
              className="input"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Type your guess"
            />
            <button type="submit" className="btn btn--primary">
              Check
            </button>
          </div>
          <div>
            <button type="button" className="link" onClick={() => setResult({ gaveUp: true })}>
              I give up, show me
            </button>
          </div>
        </form>
      ) : (
        <div className="riddle__answer" role="status">
          {!result.gaveUp && (
            <>
              <p className="riddle__verdict">{verdictFor(result)}</p>
              <p>
                You got {result.hit} of {result.total} {result.total === 1 ? 'word' : 'words'}.
              </p>
            </>
          )}
          <p className="riddle__said">The answer: “{answer}”</p>
          {children}
        </div>
      )}
    </div>
  );
};

export default RiddleSheet;
