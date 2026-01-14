import React, { useState, useEffect } from 'react';
import { Copy, Share2, Shuffle, Sparkles } from 'lucide-react';
import Fuse from 'fuse.js';
import nlp from 'compromise';
import Sentiment from 'sentiment';

// Helper functions for intelligent emoji translation
const createSpellChecker = (emojiMap) => {
  const keys = Object.keys(emojiMap);
  return new Fuse(keys, {
    threshold: 0.4, // 40% similarity threshold
    includeScore: true
  });
};

const spellCorrectWord = (word, spellChecker) => {
  const results = spellChecker.search(word);
  if (results.length > 0 && results[0].score < 0.6) {
    return results[0].item; // Return corrected word if similarity is good enough
  }
  return word; // Return original if no good match
};

const parseSentence = (text) => {
  const doc = nlp(text);
  const verbs = doc.verbs().out('array');
  const nouns = doc.nouns().out('array');
  const adjectives = doc.adjectives().out('array');
  
  // Get important words (verbs and nouns are most important)
  const importantWords = [...verbs, ...nouns, ...adjectives]
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length > 2);
  
  return {
    verbs,
    nouns,
    adjectives,
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

const isComplexSentence = (text) => {
  const words = text.split(/\s+/).length;
  const hasMultipleClauses = /(but|however|although|because|if|when|while|since|although)/i.test(text);
  const hasQuestionWords = /(what|where|when|why|how|who|which)/i.test(text);
  
  // Consider complex if: long sentence, multiple clauses, or question words
  return words > 15 || hasMultipleClauses || hasQuestionWords;
};

const translateWithAPI = async (text) => {
  // Check if API key is set (optional - can be added to env)
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    // Fallback to client-side if no API key
    return null;
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an emoji translator. Extract 3-5 most relevant emojis for the given sentence. Return ONLY emojis, no text, no explanation.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 20,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const emojis = data.choices[0]?.message?.content?.trim();
    return emojis || null;
  } catch (error) {
    console.error('API error:', error);
    return null;
  }
};

const EmojiTranslator = () => {
  const [input, setInput] = useState('');
  const [emojis, setEmojis] = useState('');
  const [mode, setMode] = useState('vibe');
  const [isDark, setIsDark] = useState(true);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);

  const emojiMap = {
    late: ['⏰', '🚨', '⏳'],
    meeting: ['💼', '📅', '🧑‍💼', '📞'],
    run: ['🏃‍♂️', '🏃‍♀️', '💨'],
    angry: ['😡', '🔥', '💢'],
    happy: ['😄', '✨', '😊', '🎉'],
    sad: ['😢', '💔', '😔'],
    money: ['💰', '💸', '💵'],
    love: ['❤️', '💕', '😍'],
    work: ['💼', '💻', '📊'],
    food: ['🍕', '🍔', '🍜', '🍱'],
    coffee: ['☕', '🥤'],
    sleep: ['😴', '🛌', '💤'],
    party: ['🎉', '🎊', '🥳'],
    car: ['🚗', '🚙', '🏎️'],
    home: ['🏠', '🏡', '🏘️'],
    phone: ['📱', '☎️', '📞'],
    computer: ['💻', '🖥️', '⌨️'],
    book: ['📚', '📖', '📕'],
    music: ['🎵', '🎶', '🎸'],
    fire: ['🔥', '🌋', '💥'],
    water: ['💧', '🌊', '💦'],
    sun: ['☀️', '🌞', '🌅'],
    moon: ['🌙', '🌛', '🌜'],
    star: ['⭐', '✨', '🌟'],
    dog: ['🐕', '🐶', '🦴'],
    cat: ['🐱', '🐈', '😺'],
    good: ['👍', '✅', '😊'],
    bad: ['👎', '❌', '😞'],
    yes: ['✅', '👍', '💯'],
    no: ['❌', '👎', '🚫'],
    go: ['➡️', '🚀', '🏃'],
    stop: ['🛑', '✋', '⛔'],
    wait: ['⏸️', '⏳', '🤔'],
    think: ['🤔', '💭', '🧠'],
    laugh: ['😂', '🤣', '😆'],
    cry: ['😭', '😢', '💧'],
    wow: ['😮', '🤯', '😲'],
    cool: ['😎', '🆒', '❄️'],
    hot: ['🔥', '🥵', '☀️'],
    cold: ['❄️', '🥶', '🧊'],
    fast: ['⚡', '💨', '🚀'],
    slow: ['🐌', '⏳', '🐢'],
    big: ['🔷', '📏', '👀'],
    small: ['🔹', '🤏', '✨'],
    new: ['🆕', '✨', '🎁'],
    old: ['👴', '📜', '🕰️'],
    day: ['☀️', '🌞', '🌅'],
    night: ['🌙', '🌃', '⭐'],
    morning: ['🌅', '☕', '🌄'],
    afternoon: ['☀️', '🌤️'],
    evening: ['🌆', '🌇'],
    time: ['⏰', '⏳', '🕐'],
    again: ['🔄', '🔁', '♻️'],
    help: ['🆘', '🙏', '💪'],
    thanks: ['🙏', '💖', '😊'],
    sorry: ['🙏', '😔', '💔'],
    please: ['🙏', '✨'],
    maybe: ['🤷', '🎲', '❓'],
    sure: ['💯', '✅', '👌'],
    ok: ['👌', '👍', '✅'],
    great: ['🎉', '🌟', '💪'],
    awesome: ['🤩', '🔥', '💯'],
    perfect: ['💯', '✨', '👌'],
    beautiful: ['😍', '✨', '🌸'],
    ugly: ['🤢', '😬'],
    sick: ['🤒', '🤧', '💊'],
    tired: ['😴', '💤', '🥱'],
    energy: ['⚡', '💪', '🔋'],
    power: ['💪', '⚡', '🔋'],
    win: ['🏆', '🎉', '💯'],
    lose: ['😔', '💔', '😢'],
    game: ['🎮', '🕹️', '🎯'],
    play: ['🎮', '⚽', '🎲'],
    watch: ['👀', '📺', '🎬'],
    listen: ['👂', '🎵', '🔊'],
    eat: ['🍽️', '😋', '🍴'],
    drink: ['🥤', '☕', '🍺'],
    read: ['📖', '👓', '📚'],
    write: ['✍️', '📝', '🖊️'],
    talk: ['💬', '🗣️', '☎️'],
    walk: ['🚶', '🚶‍♀️', '👣'],
    fly: ['✈️', '🛫', '🦅'],
    drive: ['🚗', '🏎️', '🚙'],
    rain: ['🌧️', '☔', '💧'],
    snow: ['❄️', '⛄', '🌨️'],
    wind: ['💨', '🌬️', '🍃'],
    storm: ['⛈️', '🌩️', '⚡'],
    friend: ['👯', '🤝', '💛'],
    family: ['👨‍👩‍👧‍👦', '❤️', '🏠'],
    boss: ['👔', '💼', '😤'],
    people: ['👥', '👫', '👬'],
    man: ['👨', '🧔', '🕺'],
    woman: ['👩', '💃', '🙋‍♀️'],
    boy: ['👦', '🧒'],
    girl: ['👧', '🧒'],
    baby: ['👶', '🍼'],
    pizza: ['🍕'],
    burger: ['🍔'],
    beer: ['🍺', '🍻'],
    wine: ['🍷', '🍾'],
    cake: ['🎂', '🍰'],
    gift: ['🎁', '🎀'],
    birthday: ['🎂', '🎉', '🎈'],
    christmas: ['🎄', '🎅', '🎁'],
    halloween: ['🎃', '👻', '🦇'],
    heart: ['❤️', '💖', '💕'],
    kiss: ['😘', '💋', '😚'],
    hug: ['🤗', '💝'],
    smile: ['😊', '😃', '☺️'],
    dream: ['💭', '✨', '🌙'],
    hope: ['🙏', '🌟', '✨'],
    wish: ['🌠', '✨', '🙏'],
    magic: ['✨', '🪄', '🎩'],
    rainbow: ['🌈', '✨'],
    flowers: ['🌸', '🌺', '🌻'],
    tree: ['🌲', '🌳', '🎄'],
    mountain: ['⛰️', '🏔️'],
    ocean: ['🌊', '🏖️'],
    beach: ['🏖️', '🌊', '☀️'],
    city: ['🏙️', '🌃', '🏢'],
    country: ['🏞️', '🌾'],
    world: ['🌍', '🌎', '🌏'],
    space: ['🚀', '🌌', '🛸'],
    alien: ['👽', '🛸'],
    robot: ['🤖', '🦾'],
    rocket: ['🚀', '🛸'],
    airplane: ['✈️', '🛫'],
    train: ['🚂', '🚆'],
    bike: ['🚲', '🚴'],
    boat: ['⛵', '🚤', '🛥️'],
    key: ['🔑', '🗝️'],
    lock: ['🔒', '🔐'],
    door: ['🚪'],
    window: ['🪟'],
    light: ['💡', '🔦'],
    camera: ['📷', '📸'],
    picture: ['🖼️', '📷'],
    movie: ['🎬', '🎥', '🍿'],
    tv: ['📺', '📻'],
    radio: ['📻', '📡'],
    clock: ['🕐', '⏰', '⏱️'],
    alarm: ['⏰', '🔔'],
    bell: ['🔔', '🛎️'],
    balloon: ['🎈', '🎊'],
    flag: ['🚩', '🏁', '🏴'],
    medal: ['🏅', '🥇', '🥈'],
    trophy: ['🏆', '🥇'],
    ball: ['⚽', '🏀', '⚾'],
    dice: ['🎲'],
    cards: ['🃏', '🎴'],
    puzzle: ['🧩'],
    art: ['🎨', '🖼️'],
    paint: ['🎨', '🖌️'],
    brush: ['🖌️', '🖍️'],
    pen: ['🖊️', '✒️'],
    pencil: ['✏️', '📝'],
    paper: ['📄', '📃'],
    scissors: ['✂️'],
    glue: ['📎'],
    tape: ['📼'],
    box: ['📦', '📫'],
    bag: ['👜', '🎒', '💼'],
    wallet: ['👛', '💳'],
    credit: ['💳', '💰'],
    bank: ['🏦', '💰'],
    shop: ['🛒', '🛍️', '🏬'],
    buy: ['🛒', '💳', '💰'],
    sell: ['💰', '💵', '🤝'],
    deal: ['🤝', '💼'],
    business: ['💼', '📊', '💰'],
    office: ['🏢', '💼', '📊'],
    doctor: ['👨‍⚕️', '💊', '🏥'],
    hospital: ['🏥', '⚕️'],
    medicine: ['💊', '💉'],
    police: ['👮', '🚓', '🚨'],
    school: ['🏫', '📚', '🎓'],
    student: ['🧑‍🎓', '📚'],
    teacher: ['👨‍🏫', '📚'],
    learn: ['📚', '🧠', '💡'],
    study: ['📚', '📖', '✍️'],
    test: ['📝', '✅', '❌'],
    exam: ['📝', '😰', '📚'],
    grade: ['💯', 'A+', '📊'],
    science: ['🔬', '🧪', '⚗️'],
    math: ['🔢', '➕', '📐'],
    history: ['📜', '🏛️'],
    geography: ['🗺️', '🌍'],
    language: ['💬', '📖', '🗣️'],
    english: ['🇬🇧', '🇺🇸', '💬'],
    spanish: ['🇪🇸', '🇲🇽', '💬'],
    french: ['🇫🇷', '💬'],
    german: ['🇩🇪', '💬'],
    chinese: ['🇨🇳', '💬'],
    japanese: ['🇯🇵', '💬'],
    korean: ['🇰🇷', '💬'],
    russian: ['🇷🇺', '💬'],
    italian: ['🇮🇹', '💬'],
    gym: ['💪', '🏋️', '🏃'],
    exercise: ['💪', '🏃', '🤸'],
    fitness: ['💪', '🏋️', '🥇'],
    sport: ['⚽', '🏀', '🏈'],
    soccer: ['⚽', '🥅'],
    basketball: ['🏀', '🏀'],
    football: ['🏈', '🏈'],
    baseball: ['⚾', '⚾'],
    tennis: ['🎾', '🎾'],
    golf: ['⛳', '🏌️'],
    swim: ['🏊', '🏊‍♀️', '🌊'],
    dance: ['💃', '🕺', '🎶'],
    sing: ['🎤', '🎵', '🎶'],
    drum: ['🥁'],
    guitar: ['🎸'],
    piano: ['🎹'],
    violin: ['🎻'],
    trumpet: ['🎺'],
    DJ: ['🎧', '🎛️', '🎚️'],
    // Extended emotions and feelings
    excited: ['🤩', '😆', '🎉', '💥', '🙌'],
    nervous: ['😰', '😬', '🥴', '😅', '💦'],
    confused: ['😕', '🤨', '😵', '🤷', '❓'],
    scared: ['😱', '😨', '😰', '👻', '🙀'],
    surprised: ['😲', '😮', '🤯', '‼️', '❗'],
    bored: ['😑', '😐', '🥱', '😴', '💤'],
    proud: ['😌', '🥹', '🎖️', '👏', '💪'],
    shy: ['😳', '☺️', '🙈', '😊', '💕'],
    jealous: ['😒', '🤨', '💔', '😠', '👿'],
    guilty: ['😔', '😞', '🙇', '💔', '😢'],
    embarrassed: ['😳', '🙈', '😅', '🫣', '😬'],
    lonely: ['😔', '💔', '🥺', '😢', '🌧️'],
    grateful: ['🙏', '😊', '💗', '✨', '🥰'],
    relaxed: ['😌', '🧘', '☮️', '🍃', '💆'],
    stressed: ['😫', '😩', '😤', '💢', '🤯'],
    frustrated: ['😤', '😠', '💢', '🤬', '😡'],
    anxious: ['😰', '😨', '😟', '💭', '🌀'],
    depressed: ['😞', '😔', '💔', '🌧️', '🖤'],
    hopeful: ['🤞', '🌟', '🌈', '✨', '🙏'],
    disappointed: ['😞', '😔', '💔', '😢', '😕'],
    overwhelmed: ['😵', '🤯', '😩', '🌀', '💫'],
    motivated: ['💪', '🔥', '⚡', '🚀', '👊'],
    inspired: ['💡', '✨', '🌟', '🎨', '💭'],
    content: ['😊', '😌', '☺️', '🙂', '😇'],
    annoyed: ['😒', '🙄', '😑', '💢', '😤'],
    furious: ['😡', '🤬', '💢', '🔥', '👿'],
    terrified: ['😱', '😨', '🙀', '💀', '👻'],
    ecstatic: ['🤩', '😍', '🥳', '🎉', '💯'],
    melancholic: ['😔', '🌧️', '🖤', '💭', '🍂'],
    nostalgic: ['🥲', '💭', '📷', '🕰️', '🌅'],
    
    // Extended nature and weather
    sunny: ['☀️', '🌞', '🌤️', '😎', '🌅'],
    cloudy: ['☁️', '🌥️', '⛅', '🌤️', '🌫️'],
    rainy: ['🌧️', '☔', '💧', '🌦️', '⛈️'],
    snowy: ['❄️', '⛄', '🌨️', '☃️', '🏔️'],
    foggy: ['🌫️', '💭', '👀', '🌁', '🚶'],
    windy: ['💨', '🌬️', '🍃', '🪁', '🌀'],
    stormy: ['⛈️', '🌩️', '⚡', '🌪️', '💨'],
    thunder: ['⚡', '🌩️', '💥', '🔊', '😱'],
    lightning: ['⚡', '🌩️', '💥', '🔆', '✨'],
    tornado: ['🌪️', '💨', '🌀', '😱', '🏃'],
    hurricane: ['🌀', '🌊', '💨', '🌩️', '😱'],
    earthquake: ['🌍', '💥', '🏚️', '😱', '🌋'],
    volcano: ['🌋', '🔥', '💥', '🏔️', '😱'],
    tsunami: ['🌊', '💥', '😱', '🚨', '🏃'],
    flood: ['🌊', '💧', '🏠', '🚨', '☔'],
    drought: ['🏜️', '☀️', '💀', '🌵', '🥵'],
    heatwave: ['🥵', '☀️', '🔥', '💦', '😓'],
    blizzard: ['❄️', '💨', '🌨️', '🥶', '☃️'],
    avalanche: ['❄️', '⛰️', '💥', '😱', '🏃'],
    sandstorm: ['🏜️', '💨', '🌪️', '😷', '🐪'],
    meteor: ['☄️', '💥', '✨', '🌌', '🌠'],
    comet: ['☄️', '✨', '🌌', '⭐', '🔭'],
    eclipse: ['🌑', '🌞', '🌙', '🔭', '😲'],
    aurora: ['🌌', '💚', '💜', '✨', '🌃'],
    shooting_star: ['🌠', '✨', '💫', '🙏', '🌌'],
    full_moon: ['🌕', '🌙', '🐺', '🌃', '✨'],
    new_moon: ['🌑', '🌙', '🌃', '✨', '🔮'],
    crescent_moon: ['🌙', '🌛', '🌜', '⭐', '🌃'],
    sunrise: ['🌅', '☀️', '🌄', '🌞', '☕'],
    sunset: ['🌇', '🌆', '🌅', '🌞', '📸'],
    dawn: ['🌄', '🌅', '🐓', '☕', '🌞'],
    dusk: ['🌆', '🌇', '🌙', '🌃', '🍷'],
    twilight: ['🌆', '🌇', '🌃', '✨', '🌙'],
    
    // Extended animals
    animals: ['🦁', '🐘', '🦒', '🐯', '🐻'],
    pets: ['🐕', '🐈', '🐇', '🐹', '🐦'],
    wild: ['🦁', '🐯', '🐺', '🦊', '🐻'],
    farm: ['🐄', '🐖', '🐓', '🐑', '🐴'],
    birds: ['🐦', '🦅', '🦆', '🦉', '🦜'],
    fish: ['🐠', '🐟', '🐡', '🦈', '🐙'],
    insects: ['🐝', '🦋', '🐛', '🐜', '🦗'],
    reptiles: ['🐍', '🦎', '🐢', '🐊', '🦖'],
    mammals: ['🐘', '🦒', '🦏', '🦛', '🐪'],
    marine: ['🐋', '🐬', '🦈', '🐙', '🦑'],
    lion: ['🦁', '👑', '🌍', '💪', '🔥'],
    tiger: ['🐯', '🐅', '💪', '😼', '🌴'],
    bear: ['🐻', '🧸', '🍯', '🏔️', '💪'],
    panda: ['🐼', '🎋', '😊', '🇨🇳', '💚'],
    koala: ['🐨', '🌿', '😴', '🇦🇺', '💤'],
    monkey: ['🐵', '🐒', '🍌', '🌴', '😜'],
    gorilla: ['🦍', '💪', '🌴', '🍌', '👊'],
    elephant: ['🐘', '💪', '🌍', '🐾', '🌿'],
    giraffe: ['🦒', '🌿', '🌍', '👀', '💛'],
    zebra: ['🦓', '🌍', '🏃', '⚫', '⚪'],
    rhino: ['🦏', '💪', '🌍', '🐾', '👃'],
    hippo: ['🦛', '🌊', '😃', '🌍', '💦'],
    crocodile: ['🐊', '🦷', '🌊', '😬', '💚'],
    snake: ['🐍', '🌿', '😬', '💉', '🐾'],
    lizard: ['🦎', '🌿', '👀', '💚', '☀️'],
    turtle: ['🐢', '🌊', '🐚', '💚', '🏖️'],
    frog: ['🐸', '🌿', '💚', '🌧️', '👀'],
    dolphin: ['🐬', '🌊', '😊', '🏖️', '💙'],
    whale: ['🐋', '🌊', '💙', '💦', '🐟'],
    shark: ['🦈', '🌊', '😬', '🦷', '😱'],
    octopus: ['🐙', '🌊', '💜', '🧠', '🐙'],
    squid: ['🦑', '🌊', '🔴', '💜', '🌃'],
    crab: ['🦀', '🌊', '🏖️', '🔴', '👐'],
    lobster: ['🦞', '🌊', '🍽️', '🔴', '😋'],
    shrimp: ['🦐', '🌊', '🍤', '🔴', '😋'],
    jellyfish: ['🪼', '🌊', '💜', '✨', '😮'],
    starfish: ['⭐', '🌊', '🏖️', '🟠', '😊'],
    penguin: ['🐧', '❄️', '🐟', '🇦🇶', '😊'],
    owl: ['🦉', '🌙', '🌲', '👀', '🧙'],
    eagle: ['🦅', '⛰️', '🦅', '💪', '🇺🇸'],
    parrot: ['🦜', '🌴', '🌈', '🗣️', '😜'],
    flamingo: ['🦩', '💕', '🌴', '💃', '✨'],
    peacock: ['🦚', '🌈', '✨', '👑', '😍'],
    swan: ['🦢', '💕', '🌊', '⚪', '✨'],
    duck: ['🦆', '🌊', '😊', '🍞', '🏞️'],
    chicken: ['🐔', '🥚', '🐓', '🌾', '🍗'],
    rooster: ['🐓', '🌅', '🔊', '🌾', '⏰'],
    turkey: ['🦃', '🍂', '🇺🇸', '🍗', '🎃'],
    butterfly: ['🦋', '🌸', '🌈', '✨', '😊'],
    bee: ['🐝', '🍯', '🌻', '💛', '🏭'],
    ladybug: ['🐞', '🌿', '🔴', '⚫', '😊'],
    spider: ['🕷️', '🕸️', '😱', '🖤', '🏚️'],
    ant: ['🐜', '💪', '🏭', '🍰', '👥'],
    mosquito: ['🦟', '😤', '💉', '🩸', '😠'],
    fly: ['🪰', '😤', '🗑️', '💨', '😠'],
    beetle: ['🪲', '🌿', '🐛', '🟤', '🔬'],
    caterpillar: ['🐛', '🌿', '🦋', '💚', '🍃'],
    worm: ['🪱', '🌱', '🌍', '🟤', '🐛'],
    snail: ['🐌', '🐚', '🌿', '💚', '⏰'],
    slug: ['🐌', '🌿', '💧', '🟤', '🐛'],
    scorpion: ['🦂', '🏜️', '😬', '💉', '⚠️'],
    mosquito_net: ['🦟', '🚫', '🛏️', '😌', '💤'],
    unicorn: ['🦄', '🌈', '✨', '💕', '🧚'],
    dragon: ['🐉', '🔥', '⚔️', '👑', '💰'],
    dinosaur: ['🦖', '🦕', '💀', '⏰', '🌋'],
    
    // Extended food and drinks
    breakfast: ['🍳', '🥓', '🥐', '☕', '🥣'],
    lunch: ['🥪', '🥗', '🍱', '🥤', '🍕'],
    dinner: ['🍝', '🥩', '🍷', '🥗', '🍰'],
    snack: ['🍿', '🍪', '🍫', '🥨', '🍩'],
    dessert: ['🍰', '🍦', '🍪', '🍩', '🧁'],
    appetizer: ['🥗', '🍤', '🧀', '🥖', '🫒'],
    italian: ['🍕', '🍝', '🍷', '🧀', '🇮🇹'],
    mexican: ['🌮', '🌯', '🫔', '🌶️', '🇲🇽'],
    asian: ['🍜', '🍱', '🥢', '🍵', '🥟'],
    american: ['🍔', '🍟', '🌭', '🥤', '🇺🇸'],
    french: ['🥐', '🧀', '🍷', '🥖', '🇫🇷'],
    japanese: ['🍣', '🍱', '🍜', '🍵', '🇯🇵'],
    indian: ['🍛', '🫓', '🌶️', '🫖', '🇮🇳'],
    thai: ['🍜', '🌶️', '🥥', '🍚', '🇹🇭'],
    greek: ['🫒', '🧀', '🥗', '🍷', '🇬🇷'],
    sushi: ['🍣', '🍱', '🥢', '🍵', '😋'],
    ramen: ['🍜', '🥢', '🔥', '🍵', '😋'],
    taco: ['🌮', '🌶️', '🥑', '🧀', '😋'],
    burrito: ['🌯', '🌶️', '🥑', '🧀', '😋'],
    sandwich: ['🥪', '🥖', '🧀', '🥬', '😋'],
    salad: ['🥗', '🥬', '🍅', '🫒', '😋'],
    soup: ['🍲', '🥣', '🥄', '🔥', '😋'],
    steak: ['🥩', '🔥', '🍽️', '🍷', '😋'],
    chicken: ['🍗', '🍖', '🔥', '🍴', '😋'],
    seafood: ['🦞', '🦐', '🐟', '🌊', '😋'],
    vegetables: ['🥦', '🥕', '🌽', '🥬', '🍅'],
    fruits: ['🍎', '🍌', '🍊', '🍇', '🍓'],
    bread: ['🍞', '🥖', '🥐', '🥯', '🫓'],
    cheese: ['🧀', '🧈', '🥛', '🍕', '😋'],
    eggs: ['🥚', '🍳', '🥓', '🍞', '☕'],
    bacon: ['🥓', '🍳', '🔥', '😋', '🐖'],
    sausage: ['🌭', '🥓', '🔥', '😋', '🍽️'],
    rice: ['🍚', '🍛', '🥢', '🍱', '😋'],
    pasta: ['🍝', '🍕', '🧀', '🍷', '😋'],
    noodles: ['🍜', '🥢', '🔥', '🍵', '😋'],
    potatoes: ['🥔', '🍟', '🔥', '🧈', '😋'],
    fries: ['🍟', '🧂', '🍔', '🥤', '😋'],
    chips: ['🥔', '🧂', '🥤', '😋', '📺'],
    popcorn: ['🍿', '🎬', '🥤', '🎥', '😋'],
    nuts: ['🥜', '🌰', '🔩', '💪', '😋'],
    candy: ['🍬', '🍭', '🍫', '🍰', '😋'],
    chocolate: ['🍫', '🍪', '🍰', '😋', '❤️'],
    cookies: ['🍪', '🥛', '🍫', '😋', '🎅'],
    donuts: ['🍩', '☕', '😋', '🍰', '💕'],
    cupcake: ['🧁', '🎂', '🎉', '😋', '💕'],
    pie: ['🥧', '🍎', '😋', '🍴', '🎃'],
    pancakes: ['🥞', '🍯', '🧈', '☕', '😋'],
    waffles: ['🧇', '🍯', '🧈', '☕', '😋'],
    honey: ['🍯', '🐝', '🥞', '🍞', '😋'],
    jam: ['🍓', '🍞', '🧈', '😋', '🥐'],
    peanut_butter: ['🥜', '🍞', '🍯', '😋', '🥪'],
    apple: ['🍎', '🍏', '🥧', '🍂', '😋'],
    banana: ['🍌', '🐒', '😋', '🥤', '💛'],
    orange: ['🍊', '🧃', '☀️', '😋', '🟠'],
    lemon: ['🍋', '💛', '😋', '🍹', '🌞'],
    lime: ['🍋', '💚', '🍹', '😋', '🌴'],
    grape: ['🍇', '🍷', '💜', '😋', '🍾'],
    strawberry: ['🍓', '❤️', '😋', '🍰', '🥛'],
    cherry: ['🍒', '❤️', '😋', '🍰', '🎰'],
    watermelon: ['🍉', '🌊', '😋', '☀️', '💚'],
    peach: ['🍑', '🍂', '😋', '💕', '🌸'],
    pear: ['🍐', '💚', '😋', '🍂', '🌳'],
    pineapple: ['🍍', '🌴', '😋', '🍹', '💛'],
    coconut: ['🥥', '🌴', '🏖️', '😋', '🥤'],
    kiwi: ['🥝', '💚', '😋', '🌿', '🇳🇿'],
    mango: ['🥭', '🌴', '😋', '🧡', '☀️'],
    avocado: ['🥑', '💚', '😋', '🥗', '🌮'],
    tomato: ['🍅', '🔴', '😋', '🥗', '🍝'],
    eggplant: ['🍆', '💜', '😋', '🥘', '🌱'],
    carrot: ['🥕', '🐰', '😋', '🥗', '🧡'],
    corn: ['🌽', '💛', '😋', '🧈', '🌾'],
    broccoli: ['🥦', '💚', '😋', '🥗', '💪'],
    lettuce: ['🥬', '💚', '😋', '🥗', '🌱'],
    cucumber: ['🥒', '💚', '😋', '🥗', '🌱'],
    pepper: ['🌶️', '🔥', '😋', '🥵', '🔴'],
    onion: ['🧅', '😢', '😋', '🍔', '🥗'],
    garlic: ['🧄', '😋', '🍝', '💪', '🧛'],
    mushroom: ['🍄', '🌲', '😋', '🍝', '🍕'],
    ice_cream: ['🍦', '🍨', '😋', '☀️', '💕'],
    gelato: ['🍨', '😋', '🇮🇹', '☀️', '💕'],
    sorbet: ['🍧', '😋', '☀️', '💕', '🍋'],
    smoothie: ['🥤', '🍓', '😋', '💪', '🌈'],
    milkshake: ['🥤', '🍦', '😋', '🍔', '💕'],
    juice: ['🧃', '🍊', '😋', '💪', '☀️'],
    soda: ['🥤', '🥤', '😋', '🍔', '🍕'],
    tea: ['🍵', '☕', '😌', '🫖', '🍃'],
    green_tea: ['🍵', '💚', '😌', '🇯🇵', '🍃'],
    chai: ['🫖', '☕', '😌', '🇮🇳', '✨'],
    matcha: ['🍵', '💚', '🇯🇵', '😋', '✨'],
    latte: ['☕', '🥛', '😌', '❤️', '☕'],
    cappuccino: ['☕', '🥛', '😌', '🇮🇹', '☕'],
    espresso: ['☕', '⚡', '😤', '🇮🇹', '💪'],
    mocha: ['☕', '🍫', '😋', '😌', '❤️'],
    hot_chocolate: ['☕', '🍫', '😋', '❄️', '💕'],
    cocktail: ['🍸', '🍹', '🥃', '🎉', '🌃'],
    margarita: ['🍹', '🍋', '🧂', '🌮', '🎉'],
    mojito: ['🍹', '🍋', '🌿', '💚', '☀️'],
    martini: ['🍸', '🫒', '🎩', '🌃', '💎'],
    champagne: ['🍾', '🥂', '🎉', '💍', '✨'],
    whiskey: ['🥃', '🥶', '🔥', '🥃', '🌃'],
    vodka: ['🥃', '🧊', '🍸', '❄️', '🌃'],
    rum: ['🥃', '🌴', '🏴‍☠️', '🌊', '🍹'],
    tequila: ['🥃', '🌵', '🇲🇽', '🧂', '🍋'],
    sake: ['🍶', '🇯🇵', '🍱', '😌', '🌸'],
    
    // Extended activities and hobbies
    reading: ['📚', '📖', '👓', '☕', '🛋️'],
    writing: ['✍️', '📝', '📖', '✨', '💭'],
    drawing: ['✏️', '🎨', '🖍️', '🖼️', '✨'],
    painting: ['🎨', '🖌️', '🖼️', '✨', '🌈'],
    photography: ['📷', '📸', '🌅', '✨', '🎬'],
    videography: ['🎥', '🎬', '📹', '🎞️', '✨'],
    cooking: ['👨‍🍳', '🍳', '😋', '🔥', '🍽️'],
    baking: ['👨‍🍳', '🍰', '🥐', '🔥', '😋'],
    gardening: ['🌱', '🌻', '🌿', '💚', '☀️'],
    hiking: ['🥾', '⛰️', '🌲', '🎒', '😊'],
    camping: ['⛺', '🔥', '🌲', '🌌', '🎒'],
    fishing: ['🎣', '🐟', '🌊', '🛶', '😌'],
    hunting: ['🦌', '🏹', '🌲', '🎯', '🥾'],
    skiing: ['⛷️', '❄️', '🏔️', '😊', '🎿'],
    snowboarding: ['🏂', '❄️', '🏔️', '😎', '🎿'],
    surfing: ['🏄', '🌊', '☀️', '😎', '🏖️'],
    diving: ['🤿', '🌊', '🐠', '😊', '🏖️'],
    sailing: ['⛵', '🌊', '☀️', '🧭', '😊'],
    kayaking: ['🛶', '🌊', '💪', '🏞️', '😊'],
    climbing: ['🧗', '⛰️', '🪢', '💪', '😤'],
    yoga: ['🧘', '☮️', '😌', '🕉️', '💆'],
    meditation: ['🧘', '☮️', '😌', '🕉️', '💭'],
    pilates: ['🧘', '💪', '😌', '🏋️', '💚'],
    running: ['🏃', '👟', '💪', '💦', '⏱️'],
    jogging: ['🏃', '👟', '😊', '🌳', '☀️'],
    cycling: ['🚴', '🚲', '💪', '💨', '🌳'],
    skateboarding: ['🛹', '😎', '🏙️', '🤙', '💯'],
    rollerblading: ['⛸️', '😊', '💨', '🌳', '☀️'],
    ice_skating: ['⛸️', '❄️', '😊', '🎵', '✨'],
    bowling: ['🎳', '🎯', '👟', '🎉', '😊'],
    billiards: ['🎱', '🎯', '🎱', '🍺', '😎'],
    darts: ['🎯', '🍺', '🎉', '👏', '😊'],
    archery: ['🏹', '🎯', '🌲', '💪', '😤'],
    shooting: ['🎯', '🔫', '💪', '👁️', '🎯'],
    boxing: ['🥊', '💪', '😤', '🥇', '💦'],
    wrestling: ['🤼', '💪', '😤', '🥇', '👊'],
    martial_arts: ['🥋', '💪', '😤', '🥇', '👊'],
    karate: ['🥋', '🥋', '💪', '😤', '👊'],
    judo: ['🥋', '🤼', '💪', '😤', '🥇'],
    taekwondo: ['🥋', '🦵', '💪', '😤', '🇰🇷'],
    chess: ['♟️', '👑', '🧠', '🤔', '😎'],
    checkers: ['⚫', '⚪', '🤔', '🎯', '😊'],
    poker: ['🃏', '💰', '😎', '🎰', '🍸'],
    gambling: ['🎰', '💰', '🎲', '🃏', '😬'],
    lottery: ['🎫', '💰', '🤞', '💸', '🤑'],
    knitting: ['🧶', '🧵', '✨', '😌', '🧣'],
    sewing: ['🪡', '🧵', '👗', '✨', '😊'],
    crafting: ['✂️', '🎨', '✨', '😊', '🎁'],
    woodworking: ['🪓', '🪵', '🔨', '😊', '🏡'],
    metalworking: ['🔨', '⚒️', '🔥', '💪', '⚙️'],
    pottery: ['🏺', '🎨', '✨', '😊', '💧'],
    sculpture: ['🗿', '🎨', '✨', '😊', '🔨'],
    origami: ['📄', '🦢', '🇯🇵', '✨', '😊'],
    calligraphy: ['🖋️', '✒️', '✨', '😌', '🎨'],
    collecting: ['💎', '📦', '🏆', '😊', '✨'],
    stamps: ['✉️', '📮', '🏛️', '🔍', '😊'],
    coins: ['🪙', '💰', '🏛️', '🔍', '😊'],
    vinyl: ['💿', '🎵', '🎶', '📻', '😊'],
    comics: ['📚', '💥', '🦸', '😊', '🎨'],
    action_figures: ['🦸', '🎮', '📦', '😊', '✨'],
    lego: ['🧱', '🏗️', '😊', '🎨', '✨'],
    puzzles: ['🧩', '🤔', '🧠', '😊', '✨'],
    board_games: ['🎲', '🎯', '😊', '🍕', '🎉'],
    card_games: ['🃏', '🎴', '😊', '🎯', '🎉'],
    video_games: ['🎮', '🕹️', '😊', '🏆', '💯'],
    streaming: ['📺', '🎮', '💻', '😊', '💬'],
    podcasting: ['🎙️', '🎧', '💬', '😊', '✨'],
    blogging: ['💻', '✍️', '📝', '😊', '🌐'],
    vlogging: ['📹', '🎬', '😊', '🌐', '✨'],
    coding: ['💻', '⌨️', '🧠', '😊', '⚙️'],
    programming: ['💻', '⌨️', '🧠', '☕', '🐛'],
    hacking: ['💻', '🔓', '🧠', '🌃', '⚡'],
    robotics: ['🤖', '🔧', '⚙️', '🧠', '✨'],
    electronics: ['⚡', '🔌', '⚙️', '🧠', '🔧'],
    astronomy: ['🔭', '⭐', '🌌', '🪐', '🚀'],
    astrology: ['♈', '♉', '♊', '✨', '🔮'],
    magic: ['🪄', '🎩', '✨', '🐰', '🎭'],
    juggling: ['🤹', '⚽', '🎯', '😊', '🎪'],
    circus: ['🎪', '🎭', '🤡', '🎉', '🎠'],
    theatre: ['🎭', '🎬', '🎤', '👏', '✨'],
    acting: ['🎭', '🎬', '🎤', '😊', '🌟'],
    standup: ['🎤', '😂', '🎭', '👏', '🍺'],
    improv: ['🎭', '😂', '🎤', '🤔', '👏'],
    
    // Extended technology
    internet: ['🌐', '💻', '📱', '🔗', '✨'],
    wifi: ['📶', '🌐', '💻', '📱', '⚡'],
    bluetooth: ['📲', '🎧', '🔗', '⚡', '✨'],
    smartphone: ['📱', '📲', '💬', '📸', '✨'],
    tablet: ['📱', '💻', '✨', '📚', '🎨'],
    laptop: ['💻', '⌨️', '🖱️', '☕', '💼'],
    desktop: ['🖥️', '⌨️', '🖱️', '💼', '🎮'],
    monitor: ['🖥️', '👁️', '🎮', '💻', '✨'],
    keyboard: ['⌨️', '💻', '✍️', '⚡', '🎮'],
    mouse: ['🖱️', '💻', '👆', '🎮', '⚡'],
    printer: ['🖨️', '📄', '💼', '😤', '🔧'],
    scanner: ['🖨️', '📄', '📸', '💼', '✨'],
    webcam: ['📹', '💻', '👀', '💬', '✨'],
    microphone: ['🎤', '🔊', '🎵', '📹', '✨'],
    speakers: ['🔊', '🎵', '🎶', '💥', '🎧'],
    headphones: ['🎧', '🎵', '🎶', '😊', '🔇'],
    earbuds: ['🎧', '🎵', '📱', '😊', '✨'],
    charger: ['🔌', '⚡', '📱', '🔋', '💪'],
    battery: ['🔋', '⚡', '📱', '💪', '🔌'],
    power_bank: ['🔋', '📱', '⚡', '💪', '🎒'],
    cable: ['🔌', '⚡', '🔗', '💻', '📱'],
    usb: ['💾', '🔌', '💻', '📱', '⚡'],
    hard_drive: ['💾', '💻', '📦', '⚙️', '🔒'],
    ssd: ['💾', '⚡', '💻', '🚀', '💪'],
    ram: ['💾', '⚡', '💻', '🧠', '💪'],
    processor: ['⚙️', '💻', '🧠', '⚡', '🔥'],
    graphics_card: ['🎮', '💻', '🖼️', '⚡', '🔥'],
    motherboard: ['⚙️', '💻', '🧠', '🔧', '⚡'],
    server: ['🖥️', '⚙️', '🌐', '💼', '🔧'],
    cloud: ['☁️', '💾', '🌐', '💻', '⚡'],
    database: ['💾', '📊', '🗄️', '💻', '🔒'],
    algorithm: ['⚙️', '🧠', '💻', '🔢', '✨'],
    AI: ['🤖', '🧠', '⚡', '💻', '✨'],
    machine_learning: ['🤖', '🧠', '📊', '💻', '⚡'],
    neural_network: ['🧠', '🕸️', '⚡', '🤖', '💻'],
    blockchain: ['🔗', '⛓️', '💰', '💻', '🔒'],
    cryptocurrency: ['💰', '₿', '💎', '📈', '🚀'],
    bitcoin: ['₿', '💰', '📈', '🚀', '💎'],
    ethereum: ['Ξ', '💎', '📈', '🚀', '💰'],
    nft: ['🖼️', '💎', '💰', '🎨', '🚀'],
    metaverse: ['🥽', '🌐', '🎮', '✨', '🚀'],
    VR: ['🥽', '🎮', '🌐', '✨', '🤯'],
    AR: ['📱', '👓', '✨', '🌐', '🤯'],
    drone: ['🚁', '📹', '✨', '🌍', '🎮'],
    printing_3d: ['🖨️', '🏗️', '⚙️', '✨', '🧱'],
    cybersecurity: ['🔒', '🛡️', '💻', '🔐', '🚨'],
    firewall: ['🔥', '🧱', '🛡️', '💻', '🔒'],
    antivirus: ['🛡️', '💻', '🐛', '🚫', '🔒'],
    vpn: ['🔒', '🌐', '🛡️', '💻', '🚀'],
    encryption: ['🔒', '🔐', '🔑', '💻', '🛡️'],
    password: ['🔑', '🔒', '💻', '🔐', '🧠'],
    two_factor: ['🔐', '📱', '🔑', '🛡️', '✅'],
    backup: ['💾', '📦', '🔒', '💻', '✅'],
    update: ['⬆️', '💻', '⚙️', '🔄', '✨'],
    download: ['⬇️', '💾', '💻', '📱', '⚡'],
    upload: ['⬆️', '☁️', '💻', '📱', '⚡'],
    sync: ['🔄', '💻', '📱', '☁️', '⚡'],
    share: ['🔗', '💬', '📱', '✨', '👥'],
    like: ['👍', '❤️', '😊', '✨', '💯'],
    comment: ['💬', '🗣️', '✍️', '😊', '📱'],
    subscribe: ['🔔', '✅', '📺', '💻', '✨'],
    notification: ['🔔', '📱', '💻', '✨', '⚡'],
    message: ['💬', '✉️', '📱', '😊', '💕'],
    email: ['✉️', '📧', '💻', '📱', '💼'],
    chat: ['💬', '🗨️', '📱', '😊', '⚡'],
    video_call: ['📹', '💻', '📱', '👋', '😊'],
    voice_call: ['📞', '☎️', '📱', '🗣️', '👋'],
    conference: ['💼', '📹', '👥', '💻', '📊'],
    presentation: ['📊', '💼', '🖥️', '🎤', '👔'],
    spreadsheet: ['📊', '💻', '🔢', '📈', '💼'],
    document: ['📄', '💻', '✍️', '📝', '💼'],
    pdf: ['📄', '📋', '💻', '📱', '🔒'],
    zip: ['📦', '🗜️', '💻', '📁', '⚡'],
    folder: ['📁', '📂', '💻', '📄', '🗂️'],
    file: ['📄', '💾', '💻', '📁', '✨'],
    trash: ['🗑️', '❌', '💻', '🚫', '😤'],
    delete: ['❌', '🗑️', '🚫', '💻', '😤'],
    cut: ['✂️', '💻', '📄', '📋', '✨'],
    copy: ['📋', '💻', '📄', '🔄', '✨'],
    paste: ['📋', '💻', '📄', '✅', '✨'],
    undo: ['↩️', '🔙', '💻', '⌨️', '🔄'],
    redo: ['↪️', '🔜', '💻', '⌨️', '🔄'],
    save: ['💾', '✅', '💻', '📄', '🔒'],
    print: ['🖨️', '📄', '💻', '💼', '✨'],
    scan: ['📸', '📄', '💻', '🔍', '✨'],
    search: ['🔍', '🔎', '💻', '🌐', '⚡'],
    find: ['🔍', '👁️', '💻', '📄', '✨'],
    replace: ['🔄', '✏️', '💻', '📄', '✨'],
    
    // Extended places and buildings
    restaurant: ['🍽️', '🍴', '😋', '🍷', '👨‍🍳'],
    cafe: ['☕', '🥐', '📚', '💻', '😊'],
    bar: ['🍺', '🍷', '🍸', '🎉', '🌃'],
    pub: ['🍺', '🍻', '🎯', '⚽', '😊'],
    club: ['🎉', '🎶', '💃', '🕺', '🌃'],
    disco: ['🪩', '🎶', '💃', '🕺', '✨'],
    concert: ['🎤', '🎸', '🎶', '🎉', '👏'],
    festival: ['🎪', '🎉', '🎶', '🎭', '🎠'],
    carnival: ['🎡', '🎪', '🎠', '🍭', '🎉'],
    fair: ['🎡', '🎠', '🍿', '🎯', '🎉'],
    zoo: ['🦁', '🐘', '🦒', '🐼', '🎫'],
    aquarium: ['🐠', '🐟', '🦈', '🐙', '🌊'],
    museum: ['🏛️', '🎨', '🖼️', '🦴', '🎫'],
    gallery: ['🖼️', '🎨', '✨', '🏛️', '👨‍🎨'],
    library: ['📚', '📖', '🤫', '🏛️', '✨'],
    bookstore: ['📚', '📖', '🛒', '☕', '😊'],
    cinema: ['🎬', '🍿', '🎥', '🎞️', '🎫'],
    theater: ['🎭', '🎬', '🎤', '🎟️', '👏'],
    stadium: ['🏟️', '⚽', '🏈', '🎉', '📣'],
    arena: ['🏟️', '🏀', '🏒', '🎤', '🎉'],
    gym: ['🏋️', '💪', '🏃', '🤸', '💦'],
    spa: ['💆', '🧖', '💅', '🌺', '😌'],
    salon: ['💇', '💅', '✨', '👗', '😊'],
    barbershop: ['💈', '✂️', '🪒', '👨', '😊'],
    hotel: ['🏨', '🛏️', '🧳', '🗝️', '✨'],
    motel: ['🏨', '🚗', '🛏️', '🌃', '💤'],
    hostel: ['🏠', '🛏️', '👥', '🎒', '😊'],
    resort: ['🏖️', '🏨', '🌴', '☀️', '😎'],
    airport: ['✈️', '🛫', '🧳', '🛃', '🌍'],
    station: ['🚂', '🚆', '🚇', '🎫', '🧳'],
    bus_stop: ['🚌', '⏰', '🚏', '👥', '⏳'],
    subway: ['🚇', '🚉', '🎫', '👥', '⏱️'],
    parking: ['🅿️', '🚗', '🏢', '💰', '⏰'],
    gas_station: ['⛽', '🚗', '💰', '☕', '🚽'],
    garage: ['🚗', '🔧', '⚙️', '🏠'],
    hotel: ['🏨', '🛏️', '🧳', '🗝️', '✨'],
    motel: ['🏨', '🚗', '🛏️', '🌃', '💤'],
    hostel: ['🏠', '🛏️', '👥', '🎒', '😊'],
    resort: ['🏖️', '🏨', '🌴', '☀️', '😎']
  };

  const moodEmojis = {
    excited: ['🔥', '🤯', '😤', '💥'],
    questioning: ['🤔', '❓', '😵‍💫', '🧐'],
    neutral: ['😐', '😶', '🙂'],
    happy: ['😊', '✨', '🎉'],
    sad: ['😢', '💔', '😔'],

  };

  const translateText = async (text) => {
    if (!text.trim()) return '';

    console.log('=== Translation Start ===');
    console.log('Input:', text);
    console.log('Mode:', mode);

    // Initialize spell checker once
    const spellChecker = createSpellChecker(emojiMap);

    // Check if sentence is complex - use API for complex sentences
    const isComplex = isComplexSentence(text);
    console.log('Is complex sentence:', isComplex);
    
    if (isComplex && mode === 'vibe') {
      console.log('Trying API for complex sentence...');
      const apiResult = await translateWithAPI(text);
      if (apiResult) {
        console.log('API result:', apiResult);
        return apiResult;
      }
      console.log('API failed or no key, falling back to client-side');
    }

    // Client-side processing for simple sentences or when API unavailable
    console.log('Using client-side processing...');
    const parsed = parseSentence(text);
    console.log('Parsed sentence:', {
      verbs: parsed.verbs,
      nouns: parsed.nouns,
      adjectives: parsed.adjectives,
      importantWords: parsed.importantWords
    });
    
    const sentiment = getSentiment(text);
    console.log('Sentiment:', sentiment);
    
    // Spell correct important words
    const correctedWords = parsed.importantWords.map(word => {
      const corrected = spellCorrectWord(word, spellChecker);
      if (corrected !== word) {
        console.log(`Spell corrected: "${word}" → "${corrected}"`);
      }
      return corrected;
    });
    console.log('Corrected words:', correctedWords);

    // Get emojis for corrected words
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
      // Use important words (nouns/verbs) for minimal mode
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
      // Vibe mode - use intelligent processing
      // Add sentiment emoji first if positive/negative
      if (sentiment.isPositive) {
        const sentimentEmoji = moodEmojis.happy[Math.floor(Math.random() * moodEmojis.happy.length)];
        console.log('Adding positive sentiment emoji:', sentimentEmoji);
        result.push(sentimentEmoji);
      } else if (sentiment.isNegative) {
        const sentimentEmoji = moodEmojis.sad[Math.floor(Math.random() * moodEmojis.sad.length)];
        console.log('Adding negative sentiment emoji:', sentimentEmoji);
        result.push(sentimentEmoji);
      }

      // Add emojis for important words (prioritize verbs and nouns)
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

      // Fallback for punctuation-based mood if no words matched
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
    const updateEmojis = async () => {
      const result = await translateText(input);
      setEmojis(result);
    };
    updateEmojis();
  }, [input, mode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(emojis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareText = `${input} → ${emojis}`;
    const appUrl = window.location.href;
    const fullText = `${shareText}\n\nTranslate your own: ${appUrl}`;
    
    // Try native share first (mobile) - includes the link!
    if (navigator.share) {
      try {
        await navigator.share({ 
          text: fullText,
          title: '✨ Emoji Translator'
        });
        return;
      } catch (err) {
        // User cancelled, fall through
      }
    }
    
    // Desktop fallback: Twitter with link
    const tweetText = `${shareText}\n\n✨ Translate yours: ${appUrl}`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(tweetUrl, '_blank', 'width=550,height=420');
  };

  const handleShuffle = async () => {
    const result = await translateText(input);
    setEmojis(result);
    if (input && result) {
      const newEntry = { input, emojis: result, timestamp: Date.now() };
      setHistory(prev => [newEntry, ...prev.slice(0, 4)]);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'}`}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <button
          onClick={() => setIsDark(!isDark)}
          className={`fixed top-6 right-6 p-3 rounded-full transition-all duration-300 ${isDark ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-yellow-400'}`}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        <div className="text-center mb-12">
          <h1 className={`text-6xl font-black mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ✨ Emoji Translator
          </h1>
          <p className={`text-xl ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
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
                  ? 'bg-white/10 text-white placeholder-white/40 focus:ring-purple-500/50 backdrop-blur-lg' 
                  : 'bg-white text-gray-900 placeholder-gray-400 focus:ring-purple-400 shadow-xl'
              }`}
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            {['vibe', 'literal', 'chaos', 'minimal'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-6 py-3 rounded-full font-bold transition-all duration-300 ${
                  mode === m
                    ? isDark 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105' 
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                    : isDark
                      ? 'bg-white/10 text-white/70 hover:bg-white/20'
                      : 'bg-white text-gray-600 hover:bg-gray-100 shadow'
                }`}
              >
                {m === 'vibe' && <Sparkles className="inline w-4 h-4 mr-2" />}
                {m}
              </button>
            ))}
          </div>

          {emojis && (
            <div className={`p-8 rounded-3xl transition-all duration-500 ${
              isDark 
                ? 'bg-white/10 backdrop-blur-lg' 
                : 'bg-white shadow-2xl'
            }`}>
              <div className="text-7xl mb-6 leading-relaxed break-all animate-[slideIn_0.5s_ease-out]">
                {emojis}
              </div>
              
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 ${
                    isDark 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                  }`}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                
                <button
                  onClick={handleShare}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 ${
                    isDark 
                      ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                
                <button
                  onClick={handleShuffle}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 ${
                    isDark 
                      ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg'
                  }`}
                >
                  <Shuffle className="w-4 h-4" />
                  Shuffle
                </button>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className={`p-6 rounded-3xl ${isDark ? 'bg-white/5 backdrop-blur-lg' : 'bg-white shadow-xl'}`}>
              <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Recent Translations
              </h3>
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
                  >
                    <div className={`text-sm mb-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                      {item.input}
                    </div>
                    <div className="text-3xl">{item.emojis}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`mt-12 text-center text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
          Made with chaos & vibes. No accuracy guaranteed. 🎲✨
        </div>
      </div>

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
      `}</style>
    </div>
  );
};

export default EmojiTranslator;