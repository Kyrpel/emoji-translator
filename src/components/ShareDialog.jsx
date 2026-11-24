import React, { useEffect, useRef, useState } from 'react';
import { Copy, Share2, Download, X, Loader2, Send } from 'lucide-react';
import { createRiddle } from '../lib/api.js';
import { getName, setName, riddleLink } from '../lib/me.js';
import { topicById } from '../data/topics.js';
import { generateShareCard, downloadShareCard } from '../lib/shareCard.js';
import RiddleText from './RiddleText.jsx';

// Send a riddle: ask once who it's from, store it, then hand out the link.
//   existingId  set when this exact riddle was already stored this visit
//   onCreated   ({ id, owner }) after it is stored
const ShareDialog = ({ text, puzzle, topic, existingId, onCreated, onClose }) => {
  const [id, setId] = useState(existingId || null);
  const [step, setStep] = useState(existingId ? 'ready' : getName() ? 'creating' : 'name');
  const [name, setNameField] = useState(getName());
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  const topicLabel = topicById(topic)?.label.toLowerCase();
  const message = `Fill in the blanks: can you guess what I said?\n${puzzle}${topicLabel ? `\nTopic: ${topicLabel}` : ''}`;
  const link = id ? riddleLink(id) : '';

  const create = async (from) => {
    setStep('creating');
    setError('');
    const res = await createRiddle({ text, puzzle, name: from || undefined, topic });
    if (!res.ok || !res.id) {
      setError(
        res.status === 429
          ? 'That’s a lot of riddles from here today. Try again tomorrow.'
          : 'The link didn’t come through. Try again.'
      );
      setStep('error');
      return;
    }
    setId(res.id);
    setStep('ready');
    onCreated({ id: res.id, owner: res.owner });
  };

  // Someone who has told us their name goes straight to the link.
  useEffect(() => {
    if (step === 'creating' && !started.current) {
      started.current = true;
      create(getName());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitName = (e) => {
    e.preventDefault();
    setName(name);
    started.current = true;
    create(name.trim());
  };

  const open = (url) => window.open(url, '_blank', 'noopener');
  const enc = encodeURIComponent;

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${message}\n${link}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'EMOJIFY riddle', text: message, url: link });
    } catch { /* closed the share sheet */ }
  };

  const card = async () =>
    downloadShareCard(await generateShareCard({ puzzle, topicLabel, link: link.replace(/^https?:\/\//, '') }));

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="share-h" onClick={(e) => e.stopPropagation()}>
        <div className="dialog__preview">
          <p className="dialog__preview-said">Can you guess what {name.trim() || 'I'} said?</p>
          <RiddleText puzzle={puzzle} className="dialog__preview-riddle" />
          {topicLabel && <p className="dialog__preview-said">Topic: {topicLabel}</p>}
        </div>

        <div className="dialog__body">
          <h2 id="share-h">{step === 'name' ? 'Who’s it from?' : 'Send it'}</h2>
          <button type="button" className="btn icon-btn dialog__close" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" />
          </button>

          {step === 'name' && (
            <form className="stack" onSubmit={submitName}>
              <div>
                <label className="field-label" htmlFor="from-name">
                  Your name, so friends know who to blame
                </label>
                <input
                  id="from-name"
                  name="name"
                  type="text"
                  autoComplete="given-name"
                  className="input"
                  maxLength={24}
                  value={name}
                  onChange={(e) => setNameField(e.target.value)}
                  placeholder="Your name"
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn--primary btn--block">
                <Send aria-hidden="true" />
                Get my link
              </button>
            </form>
          )}

          {step === 'creating' && (
            <p className="dialog__lead" role="status">
              <Loader2 className="spin keep-motion inline-icon" aria-hidden="true" /> Making your link…
            </p>
          )}

          {step === 'error' && (
            <div className="stack">
              <p className="err" role="alert">
                {error}
              </p>
              <button type="button" className="btn btn--primary btn--block" onClick={() => create(name.trim())}>
                Try again
              </button>
            </div>
          )}

          {step === 'ready' && (
            <>
              <p className="dialog__fine">They see the riddle, never your sentence. You’ll see every guess under Your riddles.</p>
              <div className="stack">
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  onClick={() => open(`https://wa.me/?text=${enc(`${message}\n${link}`)}`)}
                >
                  <Send aria-hidden="true" />
                  Send on WhatsApp
                </button>
                <button type="button" className="btn btn--block" onClick={copyLink}>
                  <Copy aria-hidden="true" />
                  {copied ? 'Copied' : 'Copy the link'}
                </button>
                {canNativeShare && (
                  <button type="button" className="btn btn--block" onClick={nativeShare}>
                    <Share2 aria-hidden="true" />
                    More ways to send
                  </button>
                )}
              </div>
              <div className="grid-2">
                <button
                  type="button"
                  className="btn"
                  onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${enc(link)}&quote=${enc(message)}`)}
                >
                  Facebook
                </button>
                <button type="button" className="btn" onClick={() => open(`https://twitter.com/intent/tweet?text=${enc(message)}&url=${enc(link)}`)}>
                  X
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => open(`https://www.reddit.com/submit?url=${enc(link)}&title=${enc(message.split('\n')[0].slice(0, 300))}`)}
                >
                  Reddit
                </button>
                <button type="button" className="btn" onClick={card}>
                  <Download aria-hidden="true" />
                  Card
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
