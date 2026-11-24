import React, { useState, useEffect, useRef } from 'react';
import { Copy, Share2, Shuffle, Sparkles, Lock, Download, Loader2, Sun, Moon, X } from 'lucide-react';
import Fuse from 'fuse.js';
import nlp from 'compromise';
import Sentiment from 'sentiment';
import { removeStopwords } from 'stopword';
import { aiTranslate, validateLicenseRemote, claimStripeSession, activateLicense } from './lib/api.js';
import {
  getLicense,
  saveLicense,
  clearLicense,
  touchLicense,
  licenseNeedsRevalidation,
  getAiUsesLeft,
  consumeAiUse,
} from './lib/license.js';
import { generateShareCard, downloadShareCard } from './lib/shareCard.js';
import { decodeRiddle, riddleUrl } from './lib/riddle.js';
import ProModal from './components/ProModal.jsx';
import RiddleSheet from './components/RiddleSheet.jsx';
import DailyPuzzle from './components/DailyPuzzle.jsx';
import { emojiMap, cleanEmojiMap, moodEmojis, minimalFallback } from './data/emojiMap.js';
import { PRO_PRICE } from './lib/config.js';

// AI-only personality modes (Pro). The four classic modes stay free + local.
const PRO_MODES = [
  { id: 'roast', label: 'roast', name: 'Roast' },
  { id: 'genz', label: 'gen z', name: 'Gen Z' },
  { id: 'flirty', label: 'flirty', name: 'Flirty' },
  { id: 'passive', label: 'passive-aggressive', name: 'Passive-aggressive' },
  { id: 'story', label: 'story', name: 'Story' },
];
const PRO_MODE_IDS = PRO_MODES.map((m) => m.id);

// One tap to something funny. Picked because the dictionary gets them gloriously
// wrong ("died" finds fried shrimp, "whole" finds a whale): accuracy never.
const STARTERS = [
  'My dog ate my homework again',
  'The wifi died during my exam',
  'I spent my whole paycheck on shoes',
  'I fell asleep in the meeting',
];
const RIDDLE_SAMPLE = 'My cat pushed my coffee off the table';

const HISTORY_STORAGE_KEY = 'emojify_history';
const HISTORY_CAP_PRO = 200;
const MODE_STORAGE_KEY = 'emojify_mode';

// Helper functions for intelligent emoji translation
const createSpellChecker = (emojiMap) => {
  const keys = Object.keys(emojiMap);
  return new Fuse(keys, {
    threshold: 0.4,
    includeScore: true
  });
};

const spellCorrectWord = (word, spellChecker) => {
  // An exact dictionary word is never "corrected" (this is how cheeky words,
  // which are kept out of the fuzzy index, still match when typed).
  if (Object.prototype.hasOwnProperty.call(emojiMap, word)) return word;
  const results = spellChecker.search(word);
  if (results.length > 0 && results[0].score < 0.6) {
    return results[0].item;
  }
  return word;
};

const removeStopWords = (text) => {
  const words = text.toLowerCase().split(/\s+/).map(w => w.replace(/[.,!?;:]/g, ''));
  const filtered = removeStopwords(words);
  console.log('Stop words removed:', { original: text, words, filtered, result: filtered.join(' ') });
  return filtered.join(' ');
};

const parseSentence = (text) => {
  const doc = nlp(text);
  const verbs = doc.verbs().out('array');
  const nouns = doc.nouns().out('array');
  const adjectives = doc.adjectives().out('array');

  // Split multi-word phrases into individual words
  const splitWords = (phrases) => {
    return phrases.flatMap(phrase => phrase.split(/\s+/));
  };

  const importantWords = [
    ...splitWords(verbs),
    ...splitWords(nouns),
    ...splitWords(adjectives)
  ]
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length > 2);

  return {
    verbs: splitWords(verbs),
    nouns: splitWords(nouns),
    adjectives: splitWords(adjectives),
    importantWords
  };
};

const getSentiment = (text) => {
  const sentiment = new Sentiment();
  const result = sentiment.analyze(text);
  return {
    score: result.score,
    isPositive: result.score > 0,
    isNegative: result.score < 0,
    isNeutral: result.score === 0
  };
};

// Built once at module load — the dictionary is static, so rebuilding the
// fuzzy index on every keystroke (the old behavior) was pure waste.
// Cheeky words stay out of it, so fuzzy matching never turns "class" into 🍑.
const sharedSpellChecker = createSpellChecker(cleanEmojiMap);

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

const EmojiTranslator = () => {
  const [input, setInput] = useState('');
  const [emojis, setEmojis] = useState('');
  const [mode, setMode] = useState('vibe');
  const [isDark, setIsDark] = useState(readStoredMode);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState(() => {
    if (!getLicense()) return [];
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY));
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [isPro, setIsPro] = useState(() => !!getLicense());
  const [aiUsesLeft, setAiUsesLeft] = useState(() => getAiUsesLeft());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [showProModal, setShowProModal] = useState(false);
  const [isAiResult, setIsAiResult] = useState(false);
  const [showUpsellToast, setShowUpsellToast] = useState(false);
  const [purchasedKey, setPurchasedKey] = useState('');
  const [purchasedKeyCopied, setPurchasedKeyCopied] = useState(false);

  // The empty poster shows a live example, so the first screen is never blank.
  const [demoText] = useState(() => STARTERS[Math.floor(Math.random() * STARTERS.length)]);
  const [demoEmojis, setDemoEmojis] = useState('');
  const [sampleRiddle, setSampleRiddle] = useState(null);
  // A riddle arriving from a shared link (?g=...).
  const [incomingRiddle, setIncomingRiddle] = useState(() => {
    try {
      return decodeRiddle(new URLSearchParams(window.location.search).get('g'));
    } catch {
      return null;
    }
  });
  const [shareAs, setShareAs] = useState('riddle');
  const inputRef = useRef(null);

  const translateText = async (text) => {
    if (!text.trim()) return '';

    console.log('=== Translation Start ===');
    console.log('Input:', text);
    console.log('Mode:', mode);

    const spellChecker = sharedSpellChecker;

    const cleanedText = removeStopWords(text);
    console.log('Cleaned text:', cleanedText);

    console.log('Using client-side processing...');
    const parsed = parseSentence(cleanedText);
    console.log('Parsed sentence:', {
      verbs: parsed.verbs,
      nouns: parsed.nouns,
      adjectives: parsed.adjectives,
      importantWords: parsed.importantWords
    });

    const sentiment = getSentiment(text);
    console.log('Sentiment:', sentiment);

    const correctedWords = parsed.importantWords.map(word => {
      const corrected = spellCorrectWord(word, spellChecker);
      if (corrected !== word) {
        console.log(`Spell corrected: "${word}" → "${corrected}"`);
      }
      return corrected;
    });
    console.log('Corrected words:', correctedWords);

    let result = [];
    const hasPunctuation = /[!?]/.test(text);
    const isExcited = /!/.test(text);
    const isQuestioning = /\?/.test(text);

    if (mode === 'chaos') {
      const allEmojis = Object.values(cleanEmojiMap).flat();
      const count = Math.floor(Math.random() * 8) + 5;
      for (let i = 0; i < count; i++) {
        result.push(allEmojis[Math.floor(Math.random() * allEmojis.length)]);
      }
    } else if (mode === 'minimal') {
      for (let i = 0; i < Math.min(3, correctedWords.length); i++) {
        const word = correctedWords[i];
        if (emojiMap[word]) {
          const emojis = emojiMap[word];
          result.push(emojis[Math.floor(Math.random() * emojis.length)]);
        }
      }
      if (result.length === 0) {
        result = minimalFallback.slice(0, 3);
      }
    } else if (mode === 'literal') {
      correctedWords.forEach(word => {
        if (emojiMap[word]) {
          const emojis = emojiMap[word];
          result.push(emojis[0]);
        } else {
          result.push('•');
        }
      });
    } else {
      if (sentiment.isPositive) {
        const sentimentEmoji = moodEmojis.happy[Math.floor(Math.random() * moodEmojis.happy.length)];
        console.log('Adding positive sentiment emoji:', sentimentEmoji);
        result.push(sentimentEmoji);
      } else if (sentiment.isNegative) {
        const sentimentEmoji = moodEmojis.sad[Math.floor(Math.random() * moodEmojis.sad.length)];
        console.log('Adding negative sentiment emoji:', sentimentEmoji);
        result.push(sentimentEmoji);
      }

      const importantWords = [...parsed.verbs, ...parsed.nouns]
        .map(w => w.toLowerCase().trim())
        .filter(w => w.length > 2);

      console.log('Important words for vibe mode:', importantWords);

      importantWords.forEach(word => {
        const corrected = spellCorrectWord(word, spellChecker);
        console.log(`Checking word: "${word}" (corrected: "${corrected}")`);
        if (emojiMap[corrected]) {
          const emojis = emojiMap[corrected];
          const pick = Math.random() > 0.5 ? 1 : 2;
          console.log(`Found ${pick} emoji(s) for "${corrected}":`, emojis.slice(0, pick));
          for (let i = 0; i < pick; i++) {
            result.push(emojis[Math.floor(Math.random() * emojis.length)]);
          }
        } else {
          console.log(`No emojis found for "${corrected}"`);
        }
      });

      if (result.length === 0) {
        console.log('No emojis found, using fallback mood');
        if (hasPunctuation) {
          const mood = isExcited ? moodEmojis.excited : isQuestioning ? moodEmojis.questioning : moodEmojis.neutral;
          result.push(mood[Math.floor(Math.random() * mood.length)]);
        } else {
          result.push(moodEmojis.happy[Math.floor(Math.random() * moodEmojis.happy.length)]);
        }
      }
    }

    const finalResult = result.slice(0, 12).join('');
    console.log('Final result:', finalResult);
    console.log('=== Translation End ===\n');
    return finalResult;
  };

  useEffect(() => {
    // Personality modes are AI-only: the local dictionary can't produce them,
    // and live typing must never hit the paid endpoint.
    if (PRO_MODE_IDS.includes(mode)) return;
    const updateEmojis = async () => {
      const result = await translateText(input);
      setEmojis(result);
      setIsAiResult(false);
    };
    updateEmojis();
  }, [input, mode]);

  // The example poster follows the chosen free mode (local, never the paid endpoint).
  useEffect(() => {
    if (PRO_MODE_IDS.includes(mode)) return;
    translateText(demoText).then(setDemoEmojis);
  }, [demoText, mode]);

  // The sample riddle further down the page, translated once on arrival.
  useEffect(() => {
    translateText(RIDDLE_SAMPLE).then((e) => setSampleRiddle({ t: RIDDLE_SAMPLE, e }));
  }, []);

  // Light kraft board or black wall; remembered on this device.
  useEffect(() => {
    document.documentElement.dataset.mode = isDark ? 'dark' : 'light';
    try {
      localStorage.setItem(MODE_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch { /* storage unavailable */ }
  }, [isDark]);

  // Returning from Stripe checkout: ?stripe_session=cs_... → claim key, auto-activate.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('stripe_session');
    if (!sessionId) return;
    window.history.replaceState({}, '', window.location.pathname);
    (async () => {
      const claim = await claimStripeSession(sessionId);
      if (!claim.ok || !claim.licenseKey) {
        setAiError('Payment received, but we could not verify it. Contact support with your Stripe receipt.');
        return;
      }
      setPurchasedKey(claim.licenseKey);
      const act = await activateLicense(claim.licenseKey);
      if (act.ok) {
        saveLicense({ key: claim.licenseKey, instanceId: act.instanceId });
        setIsPro(true);
      }
    })();
  }, []);

  // Re-check the license in the background once a day; downgrade if refunded/disabled.
  useEffect(() => {
    if (!licenseNeedsRevalidation()) return;
    const lic = getLicense();
    validateLicenseRemote(lic.key, lic.instanceId).then((res) => {
      if (res.ok && !res.valid) {
        clearLicense();
        setIsPro(false);
      } else {
        touchLicense();
      }
    });
  }, []);

  const closeRiddle = () => {
    setIncomingRiddle(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('g');
      window.history.replaceState({}, '', url.pathname + url.search);
    } catch { /* ignore */ }
  };

  // Shared Daily results link to /#daily; the section only exists once React has rendered.
  useEffect(() => {
    if (window.location.hash === '#daily') {
      requestAnimationFrame(() => document.getElementById('daily')?.scrollIntoView());
    }
  }, []);

  const makeYourOwn = () => {
    closeRiddle();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // Escape closes whichever dialog is on top.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (incomingRiddle) closeRiddle();
      else if (showShareModal) setShowShareModal(false);
      else if (showProModal) setShowProModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [incomingRiddle, showShareModal, showProModal]);

  const pushHistory = (entryInput, entryEmojis, pro = isPro) => {
    if (!entryInput || !entryEmojis) return;
    setHistory((prev) => {
      const next = [{ input: entryInput, emojis: entryEmojis, timestamp: Date.now() }, ...prev].slice(
        0,
        pro ? HISTORY_CAP_PRO : 5
      );
      if (pro) {
        try {
          localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
        } catch { /* storage full/private mode */ }
      }
      return next;
    });
  };

  const handleAiTranslate = async () => {
    if (!input.trim() || aiLoading) return;
    if (!isPro && aiUsesLeft <= 0) {
      setShowProModal(true);
      return;
    }
    setAiLoading(true);
    setAiError('');
    const res = await aiTranslate(input, mode);
    setAiLoading(false);
    if (res.ok && res.emojis) {
      setEmojis(res.emojis);
      setIsAiResult(true);
      if (!isPro) setAiUsesLeft(consumeAiUse());
      pushHistory(input, res.emojis);
    } else if (res.status === 402) {
      if (isPro) {
        clearLicense();
        setIsPro(false);
      }
      setShowProModal(true);
    } else if (res.status === 429) {
      setAiError('Daily free AI limit reached. Pro is unlimited.');
    } else {
      setAiError('AI is taking a nap 😴 Try again in a moment.');
    }
  };

  const handleProActivated = () => {
    setIsPro(true);
    setShowProModal(false);
    setAiError('');
  };

  // After the 3rd "moment of value" (copy/share), nudge free users toward AI — once ever.
  const maybeUpsell = () => {
    if (isPro || isAiResult) return;
    try {
      if (localStorage.getItem('emojify_upsell_shown')) return;
      const count = (parseInt(localStorage.getItem('emojify_value_moments'), 10) || 0) + 1;
      localStorage.setItem('emojify_value_moments', String(count));
      if (count >= 3) {
        localStorage.setItem('emojify_upsell_shown', '1');
        setShowUpsellToast(true);
      }
    } catch { /* storage unavailable */ }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(emojis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    maybeUpsell();
  };

  const handleShare = async () => {
    setShowShareModal(true);
    maybeUpsell();
  };

  // Free shares carry a link back to the app (the growth loop); Pro shares are clean.
  const shareText = (suffix) =>
    isPro ? `${input} → ${emojis}` : `${input} → ${emojis}\n\n${suffix}`;

  // Riddle shares hide the sentence: friends get the emojis and a link to guess.
  const riddleText = `Can you guess what I said? ${emojis}`;
  const riddleLink = () => riddleUrl(window.location.origin, { t: input, e: emojis });

  const shareToClipboard = async () => {
    await navigator.clipboard.writeText(
      shareAs === 'riddle' ? `${riddleText}\n${riddleLink()}` : shareText(`✨ Translate yours: ${window.location.origin}`)
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToFacebook = () => {
    const text = encodeURIComponent(shareAs === 'riddle' ? riddleText : shareText('✨ Try it yourself!'));
    const url = encodeURIComponent(shareAs === 'riddle' ? riddleLink() : window.location.origin);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
  };

  const shareToReddit = () => {
    const title = encodeURIComponent((shareAs === 'riddle' ? riddleText : `${input} → ${emojis}`).slice(0, 300));
    const url = encodeURIComponent(shareAs === 'riddle' ? riddleLink() : window.location.origin);
    window.open(`https://www.reddit.com/submit?url=${url}&title=${title}`, '_blank');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(shareAs === 'riddle' ? riddleText : shareText('✨ Try the Emoji Translator!'));
    const url = encodeURIComponent(shareAs === 'riddle' ? riddleLink() : window.location.origin);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(
      shareAs === 'riddle' ? `${riddleText}\n${riddleLink()}` : shareText(`✨ Translate yours: ${window.location.origin}`)
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(
          shareAs === 'riddle'
            ? { text: riddleText, url: riddleLink(), title: 'EMOJIFY riddle' }
            : { text: shareText(`✨ Try it: ${window.location.origin}`), title: 'EMOJIFY' }
        );
        setShowShareModal(false);
      } catch (err) {
        // User cancelled
      }
    }
  };

  const handleDownloadCard = async () => {
    downloadShareCard(await generateShareCard({ input, emojis, watermark: !isPro, riddle: shareAs === 'riddle' }));
  };

  const handleShuffle = async () => {
    if (PRO_MODE_IDS.includes(mode)) {
      handleAiTranslate();
      return;
    }
    const result = await translateText(input);
    setEmojis(result);
    setIsAiResult(false);
    pushHistory(input, result);
  };

  const hasInput = !!input.trim();
  const posterText = hasInput ? input : demoText;
  const posterEmojis = hasInput ? emojis : demoEmojis;
  const proMode = PRO_MODES.find((m) => m.id === mode);
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <>
      <header className="nav">
        <div className="container nav__in">
          <p className="wordmark">
            Emojify
            {isPro && <span className="tag">Pro</span>}
          </p>
          <div className="nav__actions">
            <a className="nav__link" href="#daily">
              Daily
            </a>
            {!isPro && (
              <button type="button" className="btn" onClick={() => setShowProModal(true)}>
                Go Pro
              </button>
            )}
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
        <section className="hero" aria-labelledby="hero-h">
          <div className="container hero__grid">
            <div className="hero__text">
            <div className="hero__head">
              <h1 id="hero-h">
                Fun first.
                <br />
                Accuracy never.
              </h1>
              <p className="lead">Type any sentence and get it back in emoji. Badly.</p>
            </div>

            <div className="hero__input">
              <label className="visually-hidden" htmlFor="compose">
                Your sentence
              </label>
              <textarea
                id="compose"
                ref={inputRef}
                name="sentence"
                className="compose"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type something, like “I am late for the meeting again”"
                rows={3}
                maxLength={500}
              />

              {input.trim() && (
                <div className="ai">
                  <button
                    type="button"
                    onClick={handleAiTranslate}
                    disabled={aiLoading}
                    aria-busy={aiLoading}
                    className="btn btn--primary"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="spin keep-motion" aria-hidden="true" />
                        Consulting the emoji gods…
                      </>
                    ) : !isPro && aiUsesLeft <= 0 ? (
                      <>
                        <Lock aria-hidden="true" />
                        Unlimited AI, {PRO_PRICE} once
                      </>
                    ) : (
                      <>
                        <Sparkles aria-hidden="true" />
                        AI translate
                        {!isPro && <span className="btn__note">({aiUsesLeft} free left)</span>}
                      </>
                    )}
                  </button>
                  {aiError && <p className="ai__msg" role="status">{aiError}</p>}
                  {proMode && !isAiResult && (
                    <p className="ai__msg">{proMode.name} runs on AI. Hit AI translate to hear it.</p>
                  )}
                </div>
              )}
            </div>

            <div className="hero__slips" role="group" aria-labelledby="slips-label">
              <span className="hero__slips-label" id="slips-label">
                Or try one:
              </span>
              {STARTERS.filter((s) => s !== demoText).map((s) => (
                <button key={s} type="button" className="slip" onClick={() => setInput(s)}>
                  {s}
                </button>
              ))}
            </div>
            </div>

            <div className="stage">
              <figure className="sheet sheet--fluoro poster">
                {hasInput && isAiResult && (
                  <span className="poster__status" role="status">
                    <Sparkles aria-hidden="true" /> AI translation
                  </span>
                )}
                <p className="poster__said" style={{ '--said-size': saidSizeFor(posterText) }}>
                  {posterText}
                </p>
                <p className="poster__emojis emoji">{posterEmojis}</p>
                {hasInput && emojis ? (
                  <div className="poster__foot">
                    <button type="button" className="btn" onClick={handleCopy}>
                      <Copy aria-hidden="true" />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button type="button" className="btn" onClick={handleShare}>
                      <Share2 aria-hidden="true" />
                      Share
                    </button>
                    <button type="button" className="btn" onClick={handleShuffle}>
                      <Shuffle aria-hidden="true" />
                      Shuffle
                    </button>
                  </div>
                ) : (
                  <figcaption className="poster__foot poster__note">
                    {hasInput ? 'Nothing yet. Hit AI translate.' : 'Example. Start typing and this flyer becomes yours.'}
                  </figcaption>
                )}
              </figure>

            <div className="hero__modes">
              <fieldset className="modes">
                <legend>Mode</legend>
                {['vibe', 'literal', 'chaos', 'minimal'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className="chip"
                    aria-pressed={mode === m}
                  >
                    {m}
                  </button>
                ))}
              </fieldset>

              <fieldset className="modes">
                <legend>{isPro ? 'Pro voices' : 'Pro voices, AI only'}</legend>
                {PRO_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => (isPro ? setMode(m.id) : setShowProModal(true))}
                    className="chip"
                    aria-pressed={mode === m.id}
                  >
                    {m.label}
                    {!isPro && <Lock aria-label="Pro" />}
                  </button>
                ))}
              </fieldset>
            </div>
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

        {history.length > 0 && (
          <section className="sec" aria-labelledby="history-h">
            <div className="container">
              <div className="sec__head">
                <h2 id="history-h">What did you say earlier?</h2>
                {isPro && <p className="lead">Saved on this device.</p>}
              </div>
              <ol className="ledger sheet" tabIndex={0} aria-label="Your translations">
                {history.map((item, idx) => (
                  <li key={idx}>
                    <span className="ledger__said">{item.input}</span>
                    <span className="ledger__emojis emoji">{item.emojis}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        <section className="sec" id="riddle" aria-labelledby="riddle-h">
          <div className="container split">
            <div className="split__text">
              <h2 id="riddle-h">Can your friends guess it?</h2>
              <p className="lead">
                Send any translation as a riddle. They see only the emojis, take a guess, then find out what you
                really said.
              </p>
            </div>
            <div className="sheet riddle-sheet">
              <h3>Try this one</h3>
              {sampleRiddle?.e && (
                <RiddleSheet emojis={sampleRiddle.e} answer={sampleRiddle.t} idPrefix="sample">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => inputRef.current?.focus()}
                  >
                    Make one for your friends
                  </button>
                </RiddleSheet>
              )}
            </div>
          </div>
        </section>

        <section className="sec" id="pro" aria-labelledby="pro-h">
          <div className="container">
            <div className="sec__head">
              <h2 id="pro-h">Want it to roast you properly?</h2>
              <p className="lead">Pro is one payment. No subscription, no account.</p>
            </div>
            <div className="wall">
              <div className="sheet sheet--fluoro wall__price">
                <p className="flyer">{PRO_PRICE}</p>
                <p className="flyer-sub">Once. Yours forever, refundable for 7 days.</p>
              </div>
              <div className="sheet wall__voices">
                <p className="flyer flyer--m">Five voices</p>
                <ul className="voices">
                  {PRO_MODES.map((m) => (
                    <li key={m.id}>{m.name}</li>
                  ))}
                </ul>
              </div>
              <div className="sheet wall__ai">
                <p className="flyer flyer--m">Unlimited AI</p>
                <p>In every mode, as often as you like.</p>
              </div>
              <div className="sheet wall__clean">
                <p className="flyer flyer--m">No watermark</p>
                <p>On every share card.</p>
              </div>
              <div className="wall__cta">
                {isPro ? (
                  <p className="lead">You have Pro on this device. Go roast someone.</p>
                ) : (
                  <button type="button" className="btn btn--primary btn--block" onClick={() => setShowProModal(true)}>
                    Go Pro
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="band" aria-labelledby="accuracy-h">
          <div className="container band__in">
            <h2 id="accuracy-h">Is any of this accurate?</h2>
            <p className="band__answer">Not even a little.</p>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="container foot__in">
          <p className="foot__sign">Made with chaos and vibes.</p>
          <div className="foot__meta">
            <p>Emojify, {new Date().getFullYear()}</p>
            <nav className="foot__links" aria-label="Footer">
              <a href="#daily">Today’s puzzle</a>
              <a href="#riddle">Make a riddle</a>
              <a href="#pro">Pro</a>
            </nav>
          </div>
        </div>
      </footer>

      {/* Share dialog */}
      {showShareModal && (
        <div className="backdrop" onClick={() => setShowShareModal(false)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-h"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog__preview">
              {shareAs === 'riddle' ? (
                <p className="dialog__preview-said">Can you guess what I said?</p>
              ) : (
                <p className="dialog__preview-said">{input}</p>
              )}
              <p className="dialog__preview-emojis emoji">{emojis}</p>
            </div>

            <div className="dialog__body">
              <h2 id="share-h">Share it</h2>
              <button
                type="button"
                className="btn icon-btn dialog__close"
                onClick={() => setShowShareModal(false)}
                aria-label="Close"
                autoFocus
              >
                <X aria-hidden="true" />
              </button>

              <fieldset className="seg">
                <legend>Send it as</legend>
                <input
                  type="radio"
                  name="share-as"
                  id="share-riddle"
                  value="riddle"
                  checked={shareAs === 'riddle'}
                  onChange={() => setShareAs('riddle')}
                />
                <label htmlFor="share-riddle">A riddle</label>
                <input
                  type="radio"
                  name="share-as"
                  id="share-answer"
                  value="answer"
                  checked={shareAs === 'answer'}
                  onChange={() => setShareAs('answer')}
                />
                <label htmlFor="share-answer">With the answer</label>
              </fieldset>

              <div className="grid-2">
                <button type="button" className="btn" onClick={shareToFacebook}>
                  Facebook
                </button>
                <button type="button" className="btn" onClick={shareToReddit}>
                  Reddit
                </button>
                <button type="button" className="btn" onClick={shareToWhatsApp}>
                  WhatsApp
                </button>
                <button type="button" className="btn" onClick={shareToTwitter}>
                  X
                </button>
              </div>

              <div className="stack">
                <button type="button" className="btn btn--primary btn--block" onClick={shareToClipboard}>
                  <Copy aria-hidden="true" />
                  {copied ? 'Copied' : shareAs === 'riddle' ? 'Copy riddle link' : 'Copy text'}
                </button>
                <button type="button" className="btn btn--block" onClick={handleDownloadCard}>
                  <Download aria-hidden="true" />
                  {isPro ? 'Download card' : 'Download card (watermarked)'}
                </button>
                {canNativeShare && (
                  <button type="button" className="btn btn--block" onClick={handleNativeShare}>
                    <Share2 aria-hidden="true" />
                    More options
                  </button>
                )}
              </div>

              {!isPro && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowShareModal(false);
                      setShowProModal(true);
                    }}
                    className="link"
                  >
                    Remove the watermark with Pro
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showProModal && (
        <ProModal isDark={isDark} onClose={() => setShowProModal(false)} onActivated={handleProActivated} />
      )}

      {/* A riddle someone sent */}
      {incomingRiddle && (
        <div className="backdrop" onClick={closeRiddle}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="incoming-h"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="incoming-h">Can you guess it?</h2>
            <button
              type="button"
              className="btn icon-btn dialog__close"
              onClick={closeRiddle}
              aria-label="Close"
            >
              <X aria-hidden="true" />
            </button>
            <p className="dialog__lead">Someone sent you this in emoji.</p>
            <div className="dialog__body">
              <RiddleSheet emojis={incomingRiddle.e} answer={incomingRiddle.t} idPrefix="incoming">
                <button type="button" className="btn btn--primary" onClick={makeYourOwn}>
                  Make one back
                </button>
              </RiddleSheet>
            </div>
          </div>
        </div>
      )}

      {purchasedKey && (
        <div className="backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="bought-h">
            <h2 id="bought-h">You’re Pro now</h2>
            <p className="dialog__lead">This is your license key. Save it to use Pro on your other devices.</p>
            <div className="dialog__body">
              <p className="dialog__key">{purchasedKey}</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(purchasedKey);
                  setPurchasedKeyCopied(true);
                  setTimeout(() => setPurchasedKeyCopied(false), 2000);
                }}
                className="btn btn--primary btn--block"
              >
                <Copy aria-hidden="true" />
                {purchasedKeyCopied ? 'Copied' : 'Copy key'}
              </button>
              <button type="button" onClick={() => setPurchasedKey('')} className="btn btn--block">
                Start translating
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpsellToast && (
        <div className="toast" role="status">
          <p>AI translations are way funnier. You have {aiUsesLeft} free tries.</p>
          <button
            type="button"
            onClick={() => {
              setShowUpsellToast(false);
              handleAiTranslate();
            }}
            className="btn btn--primary"
          >
            Try AI
          </button>
          <button
            type="button"
            onClick={() => setShowUpsellToast(false)}
            className="btn icon-btn"
            aria-label="Dismiss"
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
};

export default EmojiTranslator;
