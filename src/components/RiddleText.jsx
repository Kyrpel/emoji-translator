import React from 'react';
import { tokenize } from '../lib/riddleText.js';

// A riddle as it reads: the clue words in type, each blank as its emojis.
const RiddleText = ({ puzzle, className = '' }) => (
  <p className={`rt ${className}`} aria-label={`Riddle: ${puzzle}`}>
    {tokenize(puzzle).map((part, i) =>
      part.type === 'e' ? (
        <span key={i} className="rt__e emoji" aria-hidden="true">
          {part.text}
        </span>
      ) : (
        <span key={i} className="rt__w" aria-hidden="true">
          {part.text}
        </span>
      )
    )}
  </p>
);

export default RiddleText;
