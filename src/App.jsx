import React, { useState, useEffect } from 'react';
import { Copy, Share2, Shuffle, Sparkles, Lock, Download, Loader2 } from 'lucide-react';
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
import ProModal from './components/ProModal.jsx';
import { emojiMap, moodEmojis } from './data/emojiMap.js';

// AI-only personality modes (Pro). The four classic modes stay free + local.
const PRO_MODES = [
  { id: 'roast', label: 'roast', icon: '🔥' },
  { id: 'genz', label: 'gen z', icon: '💅' },
  { id: 'flirty', label: 'flirty', icon: '😏' },
  { id: 'passive', label: 'passive-aggressive', icon: '🙂' },
  { id: 'story', label: 'story', icon: '📖' },
];
const PRO_MODE_IDS = PRO_MODES.map((m) => m.id);

const HISTORY_STORAGE_KEY = 'emojify_history';
const HISTORY_CAP_PRO = 200;

// Helper functions for intelligent emoji translation
const createSpellChecker = (emojiMap) => {
  const keys = Object.keys(emojiMap);
  return new Fuse(keys, {
    threshold: 0.4,
    includeScore: true
  });
};

const spellCorrectWord = (word, spellChecker) => {
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
const sharedSpellChecker = createSpellChecker(emojiMap);

const EmojiTranslator = () => {
  const [input, setInput] = useState('');
  const [emojis, setEmojis] = useState('');
  const [mode, setMode] = useState('vibe');
  const [isDark, setIsDark] = useState(true);
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
      const allEmojis = Object.values(emojiMap).flat();
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
        result = ['✨', '🎯', '💫'].slice(0, 3);
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

  // Returning from Stripe checkout: ?stripe_session=cs_... → claim key, auto-activate.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('stripe_session');
    if (!sessionId) return;
    window.history.replaceState({}, '', window.location.pathname);
    (async () => {
      const claim = await claimStripeSession(sessionId);
      if (!claim.ok || !claim.licenseKey) {
        setAiError('Payment received but verification failed — contact support with your Stripe receipt.');
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
      setAiError('Daily free AI limit reached — Pro is unlimited ✨');
    } else {
      setAiError('AI is taking a nap 😴 — try again in a moment.');
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

  const shareToClipboard = async () => {
    await navigator.clipboard.writeText(shareText(`✨ Translate yours: ${window.location.origin}`));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToFacebook = () => {
    const text = encodeURIComponent(shareText('✨ Try it yourself!'));
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(shareText('✨ Try the Emoji Translator!'));
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(shareText(`✨ Translate yours: ${window.location.origin}`));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText(`✨ Try it: ${window.location.origin}`),
          title: '✨ Emoji Translator'
        });
        setShowShareModal(false);
      } catch (err) {
        // User cancelled
      }
    }
  };

  const handleDownloadCard = () => {
    downloadShareCard(generateShareCard({ input, emojis, watermark: !isPro }));
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

  return (
    <div className={`min-h-screen transition-colors duration-300 relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-red-900 via-red-700 to-orange-900' : 'bg-gradient-to-br from-red-100 via-orange-100 to-red-200'}`}>
      {/* Animated fire particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          >
            <span className="text-4xl opacity-20">🔥</span>
          </div>
        ))}
      </div>
      
      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        <button
          onClick={() => setIsDark(!isDark)}
          className={`fixed top-6 right-6 p-3 rounded-full transition-all duration-300 transform hover:scale-110 shadow-lg z-20 ${isDark ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-red-900 hover:from-yellow-500 hover:to-orange-600' : 'bg-gradient-to-br from-red-700 to-red-900 text-yellow-200 hover:from-red-800 hover:to-red-950'}`}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {!isPro && (
          <button
            onClick={() => setShowProModal(true)}
            className="fixed top-6 right-20 px-4 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-110 shadow-lg z-20 bg-gradient-to-r from-orange-500 to-pink-500 text-white"
          >
            ✨ Go Pro
          </button>
        )}

        <div className="text-center mb-12">
          <h1 className={`text-6xl font-black mb-2 drop-shadow-lg ${isDark ? 'text-yellow-200' : 'text-red-900'}`}>
            <span className="inline-block animate-fire">🔥</span> EMOJIFY
            {isPro && (
              <span className="align-middle ml-3 px-3 py-1 rounded-full text-lg font-black bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg">
                PRO
              </span>
            )}
          </h1>
          <h2 className={`text-4xl font-bold mb-4 ${isDark ? 'text-orange-200' : 'text-red-800'}`}>
            Emoji Translator
          </h2>
          <p className={`text-xl font-semibold ${isDark ? 'text-orange-200' : 'text-red-800'}`}>
            Turn text into emoji vibes. Fun first. Accuracy never.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type something... like 'I am late for the meeting again'"
              className={`w-full h-32 text-2xl p-6 rounded-3xl transition-all duration-300 focus:outline-none focus:ring-4 ${
                isDark 
                  ? 'bg-white/15 text-yellow-50 placeholder-yellow-200/50 focus:ring-orange-400/60 backdrop-blur-lg border-2 border-orange-500/30' 
                  : 'bg-white/90 text-red-900 placeholder-red-400 focus:ring-red-400 shadow-2xl border-2 border-red-300'
              }`}
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            {['vibe', 'literal', 'chaos', 'minimal'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-6 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-110 ${
                  mode === m
                    ? isDark
                      ? 'bg-gradient-to-r from-orange-500 via-red-500 to-red-600 text-white shadow-2xl scale-105 ring-2 ring-yellow-400'
                      : 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-2xl scale-105 ring-2 ring-red-300'
                    : isDark
                      ? 'bg-white/20 text-yellow-100 hover:bg-white/30 backdrop-blur-sm'
                      : 'bg-white/80 text-red-700 hover:bg-white shadow-lg'
                }`}
              >
                {m === 'vibe' && <Sparkles className="inline w-4 h-4 mr-2" />}
                {m}
              </button>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            {PRO_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => (isPro ? setMode(m.id) : setShowProModal(true))}
                className={`px-5 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-110 ${
                  mode === m.id
                    ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white shadow-2xl scale-105 ring-2 ring-pink-300'
                    : isDark
                      ? 'bg-white/10 text-pink-100 hover:bg-white/20 backdrop-blur-sm border border-pink-400/40'
                      : 'bg-white/70 text-purple-700 hover:bg-white shadow-lg border border-purple-200'
                }`}
              >
                {m.icon} {m.label}
                {!isPro && <Lock className="inline w-3.5 h-3.5 ml-2 -mt-0.5 opacity-70" />}
              </button>
            ))}
          </div>

          {input.trim() && (
            <div className="space-y-2">
              <button
                onClick={handleAiTranslate}
                disabled={aiLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-lg font-black transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white shadow-2xl"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Consulting the emoji gods…
                  </>
                ) : !isPro && aiUsesLeft <= 0 ? (
                  <>
                    <Lock className="w-5 h-5" />
                    Unlock unlimited AI — $4.90 once
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    AI Translate
                    {!isPro && (
                      <span className="text-sm font-bold opacity-90">· {aiUsesLeft} free left</span>
                    )}
                  </>
                )}
              </button>
              {aiError && (
                <p className={`text-center text-sm font-semibold ${isDark ? 'text-yellow-200' : 'text-red-700'}`}>
                  {aiError}
                </p>
              )}
              {PRO_MODE_IDS.includes(mode) && !isAiResult && (
                <p className={`text-center text-sm font-medium ${isDark ? 'text-orange-200/80' : 'text-red-700/80'}`}>
                  {PRO_MODES.find((m) => m.id === mode)?.icon} personality modes are AI-powered — hit the button above
                </p>
              )}
            </div>
          )}

          {emojis && (
            <div className={`p-8 rounded-3xl transition-all duration-500 transform hover:scale-[1.02] ${
              isDark 
                ? 'bg-white/15 backdrop-blur-lg border-2 border-orange-500/40 shadow-2xl shadow-red-900/50' 
                : 'bg-white/95 shadow-2xl border-2 border-red-200'
            }`}>
              {isAiResult && (
                <div className={`inline-flex items-center gap-1 mb-3 px-3 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-purple-500/30 text-purple-200' : 'bg-purple-100 text-purple-700'}`}>
                  <Sparkles className="w-3 h-3" /> AI translation
                </div>
              )}
              <div className="text-7xl mb-6 leading-relaxed break-all animate-[slideIn_0.5s_ease-out]">
                {emojis}
              </div>
              
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-110 ${
                    isDark 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg'
                  }`}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                
                <button
                  onClick={handleShare}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-110 ${
                    isDark 
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg' 
                      : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg'
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                
                <button
                  onClick={handleShuffle}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-110 ${
                    isDark 
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg' 
                      : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg'
                  }`}
                >
                  <Shuffle className="w-4 h-4" />
                  Shuffle
                </button>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className={`p-6 rounded-3xl border-2 ${isDark ? 'bg-white/10 backdrop-blur-lg border-orange-500/30' : 'bg-white/90 shadow-xl border-red-200'}`}>
              <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-yellow-200' : 'text-red-900'}`}>
                Recent Translations {isPro && <span className="text-sm font-semibold opacity-70">· saved forever ✨</span>}
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl transition-all hover:scale-[1.02] ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-white/70 hover:bg-white'}`}
                  >
                    <div className={`text-sm mb-2 font-medium ${isDark ? 'text-orange-200' : 'text-red-700'}`}>
                      {item.input}
                    </div>
                    <div className="text-3xl">{item.emojis}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`mt-12 text-center text-sm font-medium ${isDark ? 'text-orange-200/80' : 'text-red-800/80'}`}>
          Made with chaos & vibes. No accuracy guaranteed. 🎲✨🔥
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div 
            className={`max-w-md w-full rounded-3xl p-8 shadow-2xl transform transition-all ${
              isDark ? 'bg-gradient-to-br from-purple-900/90 to-indigo-900/90' : 'bg-gradient-to-br from-orange-100 to-pink-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview Card */}
            <div className={`mb-6 p-6 rounded-2xl ${isDark ? 'bg-white/10' : 'bg-white'}`}>
              <div className={`text-sm font-medium mb-3 ${isDark ? 'text-orange-300' : 'text-red-700'}`}>
                {input}
              </div>
              <div className="text-4xl mb-3">{emojis}</div>
              <div className={`text-xs ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                ✨ Emoji Translator
              </div>
            </div>

            <h3 className={`text-xl font-bold mb-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Share your translation! 🎉
            </h3>

            {/* Social Buttons */}
            <div className="space-y-3 mb-4">
              <button
                onClick={shareToFacebook}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold transition-all hover:scale-105 bg-[#1877F2] text-white"
              >
                <span className="text-xl">📘</span>
                Share to Facebook
              </button>

              <button
                onClick={shareToTwitter}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold transition-all hover:scale-105 bg-[#1DA1F2] text-white"
              >
                <span className="text-xl">🐦</span>
                Share to Twitter
              </button>

              <button
                onClick={shareToWhatsApp}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold transition-all hover:scale-105 bg-[#25D366] text-white"
              >
                <span className="text-xl">💬</span>
                Share to WhatsApp
              </button>

              <button
                onClick={shareToClipboard}
                className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold transition-all hover:scale-105 ${
                  isDark ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                } text-white`}
              >
                <Copy className="w-5 h-5" />
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>

              <button
                onClick={handleDownloadCard}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold transition-all hover:scale-105 bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              >
                <Download className="w-5 h-5" />
                Download Card {!isPro && '(with watermark)'}
              </button>
              {!isPro && (
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setShowProModal(true);
                  }}
                  className={`w-full text-center text-xs font-semibold ${isDark ? 'text-purple-300 hover:text-purple-200' : 'text-purple-600 hover:text-purple-800'}`}
                >
                  ✨ Remove watermark with Pro
                </button>
              )}

              {navigator.share && (
                <button
                  onClick={handleNativeShare}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold transition-all hover:scale-105 ${
                    isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
                  } ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  <Share2 className="w-5 h-5" />
                  More Options
                </button>
              )}
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className={`w-full py-3 rounded-xl font-medium ${
                isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showProModal && (
        <ProModal isDark={isDark} onClose={() => setShowProModal(false)} onActivated={handleProActivated} />
      )}

      {purchasedKey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`max-w-md w-full rounded-3xl p-8 shadow-2xl text-center ${
              isDark ? 'bg-gradient-to-br from-purple-900/95 to-indigo-900/95 text-white' : 'bg-gradient-to-br from-orange-100 to-pink-100 text-gray-900'
            }`}
          >
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="text-2xl font-black mb-2">You're Pro now!</h3>
            <p className={`text-sm font-medium mb-4 ${isDark ? 'text-purple-200' : 'text-gray-700'}`}>
              This is your license key — <strong>save it</strong> to unlock Pro on your other devices:
            </p>
            <div className={`p-3 rounded-xl font-mono text-sm break-all mb-4 ${isDark ? 'bg-black/30' : 'bg-white'}`}>
              {purchasedKey}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(purchasedKey);
                setPurchasedKeyCopied(true);
                setTimeout(() => setPurchasedKeyCopied(false), 2000);
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:scale-105 transition-all mb-3"
            >
              <Copy className="w-4 h-4" />
              {purchasedKeyCopied ? 'Copied!' : 'Copy key'}
            </button>
            <button
              onClick={() => setPurchasedKey('')}
              className={`w-full py-2 rounded-xl font-medium ${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Start translating ✨
            </button>
          </div>
        </div>
      )}

      {showUpsellToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md">
          <div className={`flex items-center gap-3 p-4 rounded-2xl shadow-2xl ${isDark ? 'bg-gradient-to-r from-purple-900 to-indigo-900 text-white' : 'bg-white text-gray-900 border border-purple-200'}`}>
            <span className="text-2xl">✨</span>
            <p className="flex-1 text-sm font-semibold">
              AI makes these 10× better — you have {aiUsesLeft} free tries!
            </p>
            <button
              onClick={() => {
                setShowUpsellToast(false);
                handleAiTranslate();
              }}
              className="px-4 py-2 rounded-xl font-bold text-sm bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:scale-105 transition-all"
            >
              Try AI
            </button>
            <button
              onClick={() => setShowUpsellToast(false)}
              className={`text-xl leading-none px-1 ${isDark ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0.2;
          }
          25% {
            transform: translateY(-20px) translateX(10px) rotate(5deg);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-40px) translateX(-10px) rotate(-5deg);
            opacity: 0.3;
          }
          75% {
            transform: translateY(-20px) translateX(5px) rotate(3deg);
            opacity: 0.35;
          }
        }
        @keyframes fire {
          0%, 100% {
            transform: scale(1) rotate(-2deg);
            filter: brightness(1);
          }
          25% {
            transform: scale(1.1) rotate(2deg);
            filter: brightness(1.2);
          }
          50% {
            transform: scale(1.05) rotate(-1deg);
            filter: brightness(1.1);
          }
          75% {
            transform: scale(1.15) rotate(1deg);
            filter: brightness(1.3);
          }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-fire {
          animation: fire 0.5s ease-in-out infinite;
          display: inline-block;
        }
      `}</style>
    </div>
  );
};

export default EmojiTranslator;
