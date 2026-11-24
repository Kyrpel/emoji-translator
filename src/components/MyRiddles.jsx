import React, { useEffect, useRef, useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { riddleLink } from '../lib/me.js';
import Board from './Board.jsx';
import RiddleText from './RiddleText.jsx';

// The creator's side: every riddle they sent from this device, who played,
// who got it, and every guess. New guesses since their last look are counted
// in `newCounts`; onSeen fires once the section has been on screen a moment.
const MyRiddles = ({ riddles, results, newCounts, focusId, onSeen, onRefresh }) => {
  const sectionRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let timer;
    const io = new IntersectionObserver(([entry]) => {
      clearTimeout(timer);
      if (entry.isIntersecting) timer = setTimeout(onSeen, 1500);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [onSeen]);

  const copy = async (id) => {
    await navigator.clipboard.writeText(riddleLink(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section className="sec" id="mine" aria-labelledby="mine-h" ref={sectionRef}>
      <div className="container">
        <div className="sec__head sec__head--row">
          <div>
            <h2 id="mine-h">Your riddles</h2>
            <p className="lead">Who played, who got it, and every wrong guess.</p>
          </div>
          <button type="button" className="btn" onClick={onRefresh}>
            <RefreshCw aria-hidden="true" />
            Check for guesses
          </button>
        </div>
        <ol className="mine">
          {riddles.map((r) => {
            const res = results[r.id];
            const fresh = newCounts[r.id] || 0;
            return (
              <li key={r.id} id={`mine-${r.id}`} className={`sheet mine__item${focusId === r.id ? ' mine__item--focus' : ''}`}>
                <div className="mine__head">
                  <RiddleText puzzle={r.puzzle} className="mine__riddle" />
                  <p className="mine__said">
                    You said: <q>{r.text}</q>
                  </p>
                  <p className="mine__stats">
                    {res ? (
                      <>
                        {res.players} played · {res.solved} got it
                      </>
                    ) : (
                      'Checking…'
                    )}
                    {fresh > 0 && <span className="tag-new">{fresh} new</span>}
                  </p>
                  <div>
                    <button type="button" className="btn" onClick={() => copy(r.id)}>
                      <Copy aria-hidden="true" />
                      {copiedId === r.id ? 'Copied' : 'Copy link'}
                    </button>
                  </div>
                </div>
                {res && (
                  <div className="mine__board">
                    <Board board={res.board} empty="No guesses yet. Send it to someone who thinks they know you." />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

export default MyRiddles;
