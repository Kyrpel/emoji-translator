import React from 'react';

// Everyone's guesses at one riddle, one player per row, each try with the
// judge's line. The creator sees it on their riddles; players see it once done.
const TAG = { right: 'Got it', close: 'So close', wrong: 'Nope', gaveup: 'Gave up' };

const statusOf = (player) => {
  const tries = player.attempts.filter((a) => a.verdict !== 'gaveup');
  if (player.solved) {
    const n = tries.findIndex((a) => a.verdict === 'right') + 1;
    return { kind: 'solved', label: n === 1 ? 'Got it first try' : `Got it in ${n}` };
  }
  if (player.attempts.some((a) => a.verdict === 'gaveup')) return { kind: 'out', label: 'Gave up' };
  if (player.done) return { kind: 'out', label: 'Missed' };
  return { kind: 'playing', label: 'Still guessing' };
};

const Board = ({ board, empty = 'No guesses yet.' }) => {
  if (!board?.length) return <p className="board__empty">{empty}</p>;
  return (
    <ol className="board">
      {board.map((player, i) => {
        const status = statusOf(player);
        return (
          <li key={i} className="board__player">
            <p className="board__who">
              <span className="board__name">{player.name || 'Someone'}</span>
              <span className={`verdict verdict--${status.kind}`}>{status.label}</span>
            </p>
            <ol className="board__tries">
              {player.attempts.map((a, j) => (
                <li key={j}>
                  {a.verdict === 'gaveup' ? (
                    <span className="board__guess board__guess--quiet">Gave up</span>
                  ) : (
                    <>
                      <span className="board__guess">“{a.guess}”</span>
                      <span className="visually-hidden">{TAG[a.verdict]}.</span>
                      {a.line && <span className="board__line">{a.line}</span>}
                    </>
                  )}
                </li>
              ))}
            </ol>
          </li>
        );
      })}
    </ol>
  );
};

export default Board;
