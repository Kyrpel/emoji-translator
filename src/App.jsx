import React, { useState, useEffect } from 'react';
import { Copy, Share2, Shuffle, Sparkles } from 'lucide-react';
import Fuse from 'fuse.js';
import nlp from 'compromise';
import Sentiment from 'sentiment';
import { removeStopwords } from 'stopword';

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

const isComplexSentence = (text) => {
  const words = text.split(/\s+/).length;
  const hasMultipleClauses = /(but|however|although|because|if|when|while|since|although)/i.test(text);
  const hasQuestionWords = /(what|where|when|why|how|who|which)/i.test(text);
  
  return words > 15 || hasMultipleClauses || hasQuestionWords;
};

const translateWithAPI = async (text) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
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
  const [showShareModal, setShowShareModal] = useState(false);

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
    apple: ['🍎', '🍏'],
    banana: ['🍌'],
    orange: ['🍊', '🍋'],
    grape: ['🍇'],
    strawberry: ['🍓'],
    watermelon: ['🍉'],
    pineapple: ['🍍'],
    mango: ['🥭'],
    peach: ['🍑'],
    cherry: ['🍒'],
    lemon: ['🍋'],
    lime: ['🍋'],
    kiwi: ['🥝'],
    coconut: ['🥥'],
    avocado: ['🥑'],
    tomato: ['🍅'],
    carrot: ['🥕'],
    corn: ['🌽'],
    pepper: ['🌶️', '🫑'],
    cucumber: ['🥒'],
    lettuce: ['🥬'],
    broccoli: ['🥦'],
    mushroom: ['🍄'],
    peanuts: ['🥜'],
    bread: ['🍞', '🥖'],
    croissant: ['🥐'],
    bagel: ['🥯'],
    pretzel: ['🥨'],
    cheese: ['🧀'],
    meat: ['🥩', '🍖'],
    poultry: ['🍗', '🦃'],
    bacon: ['🥓'],
    egg: ['🥚'],
    pancakes: ['🥞'],
    waffle: ['🧇'],
    frenchfries: ['🍟'],
    hotdog: ['🌭'],
    sandwich: ['🥪'],
    taco: ['🌮'],
    burrito: ['🌯'],
    salad: ['🥗'],
    popcorn: ['🍿'],
    butter: ['🧈'],
    salt: ['🧂'],
    cooked: ['🍳', '🥘'],
    stew: ['🍲'],
    fondue: ['🫕'],
    bowl: ['🥣', '🍲'],
    chopsticks: ['🥢'],
    spoon: ['🥄', '🍴'],
    fork: ['🍴'],
    knife: ['🔪', '🍴'],
    bottle: ['🍼', '🧴'],
    cup: ['☕', '🍵'],
    tea: ['🫖', '🍵'],
    sake: ['🍶'],
    champagne: ['🍾'],
    cocktail: ['🍸', '🍹'],
    tropical: ['🍹'],
    beer2: ['🍻'],
    clink: ['🥂'],
    tumblr: ['🥃'],
    juice: ['🧃'],
    mate: ['🧉'],
    ice: ['🧊'],
    cupcake: ['🧁'],
    pie: ['🥧'],
    chocolate: ['🍫'],
    candy: ['🍬', '🍭'],
    lollipop: ['🍭'],
    custard: ['🍮'],
    honey: ['🍯'],
    child: ['🧒'],
    adult: ['🧑'],
    person: ['🧑', '👤'],
    older: ['🧓'],
    elderly: ['👴', '👵'],
    policeman: ['👮', '👮‍♂️'],
    policewoman: ['👮‍♀️'],
    detective: ['🕵️', '🕵️‍♂️'],
    guard: ['💂', '💂‍♂️'],
    construction: ['👷', '👷‍♂️'],
    prince: ['🤴'],
    princess: ['👸'],
    turban: ['👳', '👳‍♂️'],
    tuxedo: ['🤵'],
    veil: ['👰'],
    pregnant: ['🤰'],
    breast: ['🤱'],
    santa: ['🎅'],
    mrs: ['🤶'],
    superhero: ['🦸', '🦸‍♂️'],
    supervillain: ['🦹', '🦹‍♂️'],
    mage: ['🧙', '🧙‍♂️'],
    fairy: ['🧚', '🧚‍♂️'],
    vampire: ['🧛', '🧛‍♂️'],
    merperson: ['🧜', '🧜‍♂️'],
    elf: ['🧝', '🧝‍♂️'],
    genie: ['🧞', '🧞‍♂️'],
    zombie: ['🧟', '🧟‍♂️'],
    massage: ['💆', '💆‍♂️'],
    haircut: ['💇', '💇‍♂️'],
    walking: ['🚶', '🚶‍♂️'],
    standing: ['🧍', '🧍‍♂️'],
    kneeling: ['🧎', '🧎‍♂️'],
    running: ['🏃', '🏃‍♂️'],
    dancing: ['💃', '🕺'],
    suit: ['🕴️'],
    business2: ['👔'],
    handshake: ['🤝'],
    shakehands: ['🤝'],
    selfie: ['🤳'],
    flex: ['💪'],
    muscle: ['💪'],
    mechanical: ['🦾'],
    leg: ['🦿'],
    foot: ['🦶'],
    ear: ['👂'],
    nose: ['👃'],
    brain: ['🧠'],
    tooth: ['🦷'],
    bone: ['🦴'],
    eyes: ['👀'],
    eye: ['👁️'],
    tongue: ['👅'],
    mouth: ['👄'],
    loveletter: ['💌'],
    ring: ['💍'],
    gem: ['💎'],
    angry2: ['😠'],
    pouting: ['😡'],
    explode: ['🤬'],
    dizzy: ['😵', '😵‍💫'],
    speechless: ['🤐'],
    nauseated: ['🤢'],
    vomiting: ['🤮'],
    sneezing: ['🤧'],
    hot2: ['🥵'],
    cold2: ['🥶'],
    woozy: ['🥴'],
    dazed: ['😵‍💫'],
    exploding: ['🤯'],
    cowboy: ['🤠'],
    partying: ['🥳'],
    disguised: ['🥸'],
    sunglasses: ['😎'],
    nerd: ['🤓'],
    monocle: ['🧐'],
    confused: ['😕', '😟'],
    worried: ['🙁', '☹️'],
    frowning: ['😦', '😧'],
    anguished: ['😰', '😥'],
    fearful: ['😨', '😱'],
    cold3: ['😮', '😯'],
    hushed: ['😯'],
    astonished: ['😲'],
    flushed: ['😳'],
    pleading: ['🥺'],
    frowning2: ['😦'],
    anguished2: ['😧'],
    open: ['😮', '😯'],
    hushed2: ['😯'],
    astonished2: ['😲'],
    scream: ['😱'],
    confounded: ['😖'],
    persevere: ['😣'],
    sweat: ['😓'],
    sad2: ['😭'],
    tired2: ['😤'],
    steam: ['😤'],
    triumph: ['😤'],
    pout: ['😦'],
    relieved: ['😌', '😮‍💨'],
    delete: ['🗑️'],
    pensive: ['😔'],
    sleepy: ['😪'],
    drool: ['🤤'],
    unwell: ['🤒'],
    facemask: ['😷'],
    bandage: ['🤕'],
    dizzy2: ['🥴'],
    exploding2: ['🤯'],
    cowboy2: ['🤠'],
    partying2: ['🥳'],
    worried2: ['😟'],
    slightly: ['🙁'],
    openmouth: ['😮'],
    hushed3: ['😯'],
    astonished3: ['😲'],
    frowning3: ['😦'],
    anguished3: ['😧'],
    fearful2: ['😨'],
    cold4: ['😰'],
    disappointed: ['😥'],
    sweat2: ['😓'],
    sad3: ['😭'],
    monkey: ['🐵', '🐒'],
    gorilla: ['🦍'],
    orangutan: ['🦧'],
    poodle: ['🐩'],
    wolf: ['🐺'],
    fox: ['🦊'],
    raccoon: ['🦝'],
    lion: ['🦁'],
    tiger: ['🐯'],
    leopard: ['🐆'],
    horse: ['🐴', '🐎'],
    unicorn: ['🦄'],
    zebra: ['🦓'],
    deer: ['🦌'],
    bison: ['🦬'],
    ox: ['🐂'],
    waterbuffalo: ['🐃'],
    boar: ['🐗'],
    ram: ['🐏'],
    ewe: ['🐑'],
    goat: ['🐐'],
    dromedary: ['🐪'],
    camel: ['🐫'],
    llama: ['🦙'],
    giraffe: ['🦒'],
    elephant: ['🐘'],
    mammoth: ['🦣'],
    rhinoceros: ['🦏'],
    hippopotamus: ['🦛'],
    mouse: ['🐭'],
    rat: ['🐀'],
    hamster: ['🐹'],
    rabbit: ['🐰', '🐇'],
    chipmunk: ['🐿️'],
    beaver: ['🦫'],
    hedgehog: ['🦔'],
    bat: ['🦇'],
    bear: ['🐻'],
    polar: ['🐻‍❄️'],
    koala: ['🐨'],
    panda: ['🐼'],
    sloth: ['🦥'],
    otter: ['🦦'],
    skunk: ['🦨'],
    kangaroo: ['🦘'],
    badger: ['🦡'],
    feet: ['🐾'],
    turkey: ['🦃'],
    chicken: ['🐔'],
    rooster: ['🐓'],
    hatching: ['🐣'],
    hatched: ['🐤'],
    bird: ['🐦'],
    penguin: ['🐧'],
    dove: ['🕊️'],
    eagle: ['🦅'],
    duck: ['🦆'],
    swan: ['🦢'],
    owl: ['🦉'],
    dodo: ['🦤'],
    feather: ['🪶'],
    flamingo: ['🦩'],
    peacock: ['🦚'],
    parrot: ['🦜'],
    frog: ['🐸'],
    crocodile: ['🐊'],
    turtle: ['🐢'],
    lizard: ['🦎'],
    snake: ['🐍'],
    dragon: ['🐉'],
    sauropod: ['🦕'],
    trex: ['🦖'],
    spouting: ['🐳'],
    whale: ['🐋'],
    dolphin: ['🐬'],
    seal: ['🦭'],
    fish: ['🐟'],
    tropicalfish: ['🐠'],
    blowfish: ['🐡'],
    shark: ['🦈'],
    octopus: ['🐙'],
    spiral: ['🐚'],
    snail: ['🐌'],
    butterfly: ['🦋'],
    bug: ['🐛'],
    ant: ['🐜'],
    honeybee: ['🐝'],
    beetle: ['🪲'],
    ladybeetle: ['🐞'],
    cricket: ['🦗'],
    cockroach: ['🪳'],
    spider: ['🕷️'],
    spiderweb: ['🕸️'],
    scorpion: ['🦂'],
    mosquito: ['🦟'],
    fly2: ['🪰'],
    worm: ['🪱'],
    microbe: ['🦠'],
    bouquet: ['💐'],
    cherryblossom: ['🌸'],
    whiteflower: ['💮'],
    rosette: ['🏵️'],
    rose: ['🌹'],
    wilted: ['🥀'],
    hibiscus: ['🌺'],
    sunflower: ['🌻'],
    blossom: ['🌼'],
    tulip: ['🌷'],
    seedling: ['🌱'],
    potted: ['🪴'],
    evergreen: ['🌲'],
    deciduous: ['🌳'],
    palm: ['🌴'],
    cactus: ['🌵'],
    sheaf: ['🌾'],
    herb: ['🌿'],
    shamrock: ['☘️'],
    clover: ['🍀'],
    maple: ['🍁'],
    fallen: ['🍂'],
    leaves: ['🍃'],
    globe: ['🌍'],
    globeamericas: ['🌎'],
    globeasia: ['🌏'],
    globewith: ['🌐'],
    newmoon: ['🌑'],
    waxing: ['🌒'],
    firstquarter: ['🌓'],
    waning: ['🌖'],
    lastquarter: ['🌗'],
    waning2: ['🌘'],
    newmoon2: ['🌚'],
    firstquarter2: ['🌛'],
    lastquarter2: ['🌜'],
    thermometer: ['🌡️'],
    fullmoon2: ['🌝'],
    sunwith: ['🌞'],
    ringed: ['🪐'],
    glowing: ['🌟'],
    shooting: ['🌠'],
    milky: ['🌌'],
    cloud: ['☁️'],
    sunbehind: ['⛅'],
    cloudwith: ['⛈️'],
    sunbehind2: ['🌤️'],
    cloudwith2: ['🌥️'],
    sunbehind3: ['🌦️'],
    cloudwith3: ['🌧️'],
    cloudwith4: ['⛈️'],
    cloudwith5: ['🌩️'],
    cloudwith6: ['🌨️'],
    snowflake: ['❄️'],
    snowman: ['☃️'],
    tornado: ['🌪️'],
    cyclone: ['🌀'],
    rainbow2: ['🌈'],
    openumbrella: ['☔'],
    comet: ['☄️'],
    waterwave: ['🌊'],
    // Continuing from waterwave...
    celebration: ['🎊', '🥳', '🎆'],
    fireworks: ['🎆', '🎇', '✨'],
    sparkler: ['🎇', '✨'],
    confetti: ['🎊', '🎉'],
    tanabata: ['🎋'],
    bamboo: ['🎍'],
    pinedecorations: ['🎍'],
    dolls: ['🎎'],
    carp: ['🎏'],
    chime: ['🎐'],
    redenvelope: ['🧧'],
    ribbon: ['🎀', '🎁'],
    wrappedgift: ['🎁', '🎀'],
    dividers: ['🧧'],
    admission: ['🎟️'],
    tickets: ['🎫', '🎟️'],
    militarymedal: ['🎖️'],
    reminder: ['🎗️'],
    sports: ['🏅', '🥇'],
    firstplace: ['🥇', '🏆'],
    secondplace: ['🥈'],
    thirdplace: ['🥉'],
    volleyball: ['🏐'],
    rugby: ['🏉'],
    bowling: ['🎳'],
    cricket2: ['🏏'],
    fieldhockey: ['🏑'],
    icehockey: ['🏒'],
    lacrosse: ['🥍'],
    pingpong: ['🏓'],
    badminton: ['🏸'],
    boxing: ['🥊'],
    martialarts: ['🥋'],
    goalnet: ['🥅'],
    flaghole: ['⛳'],
    iceskate: ['⛸️'],
    fishing: ['🎣'],
    diving: ['🤿'],
    sled: ['🛷'],
    curling: ['🥌'],
    target: ['🎯', '🎪'],
    yoyo: ['🪀'],
    kite: ['🪁'],
    pool: ['🎱', '🎯'],
    crystal: ['🔮', '✨'],
    magicball: ['🔮'],
    nazareye: ['🧿'],
    hamsa: ['🪬'],
    videogame: ['🎮', '🕹️'],
    joystick: ['🕹️', '🎮'],
    slotmachine: ['🎰', '💰'],
    jigsaw: ['🧩', '🔍'],
    teddy: ['🧸', '🐻'],
    pinata: ['🪅'],
    nestingdolls: ['🪆'],
    spade: ['♠️'],
    clubs: ['♣️'],
    hearts: ['♥️'],
    diamonds: ['♦️'],
    joker: ['🃏'],
    mahjong: ['🀄'],
    flowerplaying: ['🎴'],
    muted: ['🔇'],
    speaker: ['🔈', '🔊'],
    lowvolume: ['🔉'],
    highvolume: ['🔊', '📢'],
    loudspeaker: ['📢', '📣'],
    megaphone: ['📣', '📢'],
    postal: ['📯'],
    saxophone: ['🎷'],
    banjo: ['🪕'],
    accordion: ['🪗'],
    harmonica: ['🪗'],
    longdrum: ['🪘'],
    headphone: ['🎧', '🎵'],
    microphone: ['🎤', '🎙️'],
    studio: ['🎙️'],
    levelslider: ['🎚️'],
    knobs: ['🎛️'],
    clapper: ['🎬'],
    filmframes: ['🎞️'],
    projector: ['📽️'],
    filmstrip: ['🎞️'],
    pray: ['🙏', '🤲'],
    openpalms: ['🤲'],
    raisedhand: ['✋', '🖐️'],
    vulcan: ['🖖'],
    ok2: ['👌'],
    pinching: ['🤌'],
    victory: ['✌️', '☮️'],
    crossed: ['🤞', '🍀'],
    loveyou: ['🤟', '❤️'],
    horns: ['🤘', '🎸'],
    callme: ['🤙'],
    backhand: ['👈'],
    backhand2: ['👉'],
    backhand3: ['👆'],
    middlefinger: ['🖕'],
    backhand4: ['👇'],
    index: ['☝️'],
    thumbup: ['👍', '👌'],
    thumbdown: ['👎'],
    raisefist: ['✊', '💪'],
    oncoming: ['👊'],
    leftfacing: ['🤛'],
    rightfacing: ['🤜'],
    clap: ['👏', '🙌'],
    raising: ['🙌', '🎉'],
    openhands: ['👐'],
    palms: ['🤲', '🙏'],
    waving: ['👋', '😊'],
    iloveyou: ['🤟'],
    writing: ['✍️', '📝'],
    nailpolish: ['💅', '✨'],
    leg2: ['🦵'],
    kick: ['🦵', '⚽'],
    footstep: ['👣', '🚶'],
    lipstick: ['💄', '💋'],
    womansclothes: ['👚'],
    tshirt: ['👕'],
    jeans: ['👖'],
    necktie: ['👔', '💼'],
    dress: ['👗', '💃'],
    bikini: ['👙', '🏖️'],
    kimono: ['👘'],
    sari: ['🥻'],
    onesie: ['🩱'],
    briefs: ['🩲'],
    shorts: ['🩳'],
    purse: ['👛', '💰'],
    handbag: ['👜', '💼'],
    clutch: ['👝'],
    backpack: ['🎒', '🏫'],
    sandal: ['👡'],
    shoe: ['👞'],
    highheels: ['👠', '💃'],
    sneaker: ['👟', '🏃'],
    hikingboot: ['🥾', '⛰️'],
    skate: ['🩰'],
    sock: ['🧦'],
    gloves: ['🧤', '❄️'],
    scarf: ['🧣', '🧥'],
    tophat: ['🎩', '🎭'],
    billedcap: ['🧢'],
    rescue: ['⛑️'],
    graduation: ['🎓', '🎉'],
    crown: ['👑', '🤴'],
    womanshat: ['👒'],
    glasses: ['👓', '🤓'],
    goggles: ['🥽'],
    labcoat: ['🥼', '🔬'],
    safety: ['🦺'],
    closedumbrella: ['🌂'],
    umbrella: ['☂️', '☔'],
    leash: ['🦮'],
    servicedog: ['🦮'],
    paw: ['🐾', '🐕'],
    birds: ['🦆', '🦢'],
    roastedchicken: ['🍗'],
    eggplant: ['🍆'],
    potato: ['🥔'],
    sweetpotato: ['🍠'],
    onion: ['🧅'],
    garlic: ['🧄'],
    flatbread: ['🫓'],
    chestnut: ['🌰'],
    peanut: ['🥜'],
    beans: ['🫘'],
    riceball: ['🍙'],
    ricecracker: ['🍘'],
    cookedrice: ['🍚'],
    curry: ['🍛'],
    ramen: ['🍜'],
    spaghetti: ['🍝'],
    roastedsweetpotato: ['🍠'],
    oden: ['🍢'],
    sushi: ['🍣'],
    friedshrimp: ['🍤'],
    fishcake: ['🍥'],
    mooncake: ['🥮'],
    dango: ['🍡'],
    dumpling: ['🥟'],
    fortunecookie: ['🥠'],
    takeoutbox: ['🥡'],
    crab: ['🦀'],
    lobster: ['🦞'],
    shrimp: ['🦐'],
    squid: ['🦑'],
    oyster: ['🦪'],
    softice: ['🍦'],
    shavedice: ['🍧'],
    icecream: ['🍨'],
    doughnut: ['🍩'],
    cookie: ['🍪'],
    birthdaycake: ['🎂', '🎉'],
    shortcake: ['🍰'],
    chocolatebar: ['🍫'],
    popcorn2: ['🍿', '🎬'],
    bento: ['🍱'],
    cracker: ['🍘'],
    cannedFood: ['🥫'],
    beverage: ['🥤', '🍹'],
    milk: ['🥛', '🍼'],
    babybottle: ['🍼', '👶'],
    hottea: ['🫖', '☕'],
    teacup: ['🍵'],
    hotbeverage: ['☕'],
    mate2: ['🧉'],
    bubbleTea: ['🧋'],
    beveragebox: ['🧃'],
    glassofmilk: ['🥛'],
    pouringlequid: ['🫗'],
    wineglass: ['🍷'],
    clinkingglasses: ['🥂', '🎉'],
    beermug: ['🍺'],
    clinkingbeer: ['🍻', '🍺'],
    whiskey: ['🥃'],
    tropicaldrink: ['🍹', '🏖️'],
    plate: ['🍽️'],
    knifefork: ['🍴'],
    amphora: ['🏺'],
    earthglobe: ['🌍', '🌎'],
    globeshowing: ['🌎'],
    map: ['🗺️', '🧭'],
    japan: ['🗾', '🇯🇵'],
    compass: ['🧭', '🗺️'],
    snowcapped: ['🏔️', '⛰️'],
    volcano: ['🌋', '🔥'],
    mountfuji: ['🗻'],
    camping: ['🏕️', '⛺'],
    tent: ['⛺', '🏕️'],
    nationalpark: ['🏞️'],
    motorway: ['🛣️'],
    railway: ['🛤️'],
    sunrise: ['🌅', '🌄'],
    sunrisemountains: ['🌄'],
    desert: ['🏜️', '🌵'],
    island: ['🏝️', '🏖️'],
    sunset: ['🌇', '🌆'],
    cityscape: ['🏙️'],
    citysunset: ['🌆'],
    bridge: ['🌉'],
    hotsprings: ['♨️'],
    carousel: ['🎠'],
    ferris: ['🎡'],
    rollercoaster: ['🎢'],
    barberpole: ['💈'],
    circustent: ['🎪', '🎭'],
    locomotive: ['🚂'],
    railwaycar: ['🚃'],
    highspeed: ['🚄', '💨'],
    bullettrain: ['🚅'],
    tram: ['🚊'],
    monorail: ['🚝'],
    mountainrailway: ['🚞'],
    tramcar: ['🚋'],
    bus: ['🚌', '🚍'],
    oncomingbus: ['🚍'],
    trolleybus: ['🚎'],
    minibus: ['🚐'],
    ambulance: ['🚑', '🏥'],
    fireengine: ['🚒', '🔥'],
    policecar: ['🚓', '👮'],
    oncomingpolice: ['🚔'],
    taxi: ['🚕', '🚖'],
    ongoingtaxi: ['🚖'],
    automobile: ['🚗'],
    oncomingautomobile: ['🚘'],
    suv: ['🚙'],
    pickup: ['🛻'],
    deliverytruck: ['🚚'],
    articulatedlorry: ['🚛'],
    tractor: ['🚜', '🌾'],
    racing: ['🏎️', '🏁'],
    motorcycle: ['🏍️', '💨'],
    motorscooter: ['🛵'],
    manual: ['🦽'],
    motorized: ['🦼'],
    autrickshaw: ['🛺'],
    bicycle: ['🚲'],
    scooter: ['🛴'],
    skateboard: ['🛹'],
    rollerSkate: ['🛼'],
    bustop: ['🚏'],
    highway: ['🛣️'],
    railwaytrack: ['🛤️'],
    oildrum: ['🛢️'],
    fuelpump: ['⛽'],
    rotating: ['🚨', '🚔'],
    horizontal: ['🚥'],
    vertical: ['🚦'],
    construction2: ['🚧', '👷'],
    anchor: ['⚓', '⛵'],
    sailboat: ['⛵'],
    canoe: ['🛶'],
    speedboat: ['🚤', '💨'],
    passenger: ['🛳️'],
    ferry: ['⛴️'],
    motor: ['🛥️'],
    ship: ['🚢', '⚓'],
    airplane2: ['✈️'],
    smallairplane: ['🛩️'],
    departingairplane: ['🛫'],
    arrivingairplane: ['🛬'],
    parachute: ['🪂'],
    seat: ['💺'],
    helicopter: ['🚁'],
    suspensionrailway: ['🚟'],
    mountaincableway: ['🚠'],
    aerialTramway: ['🚡'],
    satellite: ['🛰️', '📡'],
    flyingsaucer: ['🛸', '👽'],
    bellhop: ['🛎️'],
    luggage: ['🧳', '✈️'],
    hourglass2: ['⌛', '⏳'],
    hourglassdone: ['⏳'],
    mantelpiece: ['🕰️'],
    twelveoclock: ['🕛'],
    twelvethirty: ['🕧'],
    oneoclock: ['🕐'],
    onethirty: ['🕜'],
    twooclock: ['🕑'],
    twothirty: ['🕝'],
    threeoclock: ['🕒'],
    threethirty: ['🕞'],
    fouroclock: ['🕓'],
    fourthirty: ['🕟'],
    fiveoclock: ['🕔'],
    fivethirty: ['🕠'],
    sixoclock: ['🕕'],
    sixthirty: ['🕡'],
    sevenoclock: ['🕖'],
    seventhirty: ['🕢'],
    eightoclock: ['🕗'],
    eightthirty: ['🕣'],
    nineoclock: ['🕘'],
    ninethirty: ['🕤'],
    tenoclock: ['🕙'],
    tenthirty: ['🕥'],
    elevenoclock: ['🕚'],
    eleventhirty: ['🕦'],
    newmoonface: ['🌚'],
    firstquarterface: ['🌛'],
    lastquarterface: ['🌜'],
    fullmoonface: ['🌝'],
    sunface: ['🌞'],
    crescentmoon: ['🌙'],
    firstquartermoon: ['🌓'],
    lastquartermoon: ['🌗'],
    fullmoon: ['🌕'],
    waxinggibbous: ['🌔'],
    waninggibbous: ['🌖'],
    waxingcrescent: ['🌒'],
    waningcrescent: ['🌘'],
    newmoon3: ['🌑'],
    earth: ['🌍', '🌎', '🌏'],
    earthasia: ['🌏'],
    earthamericas: ['🌎'],
    earthafrica: ['🌍'],
    planetring: ['🪐'],
    mercury: ['☿️'],
    venus: ['♀️'],
    mars: ['♂️'],
    jupiter: ['♃'],
    saturn: ['♄'],
    uranus: ['♅'],
    neptune: ['♆'],
    dwarf: ['🪐'],
    asteroid: ['☄️'],
    starsmall: ['⭐'],
    starbig: ['🌟'],
    sparkles: ['✨', '💫'],
    lightning: ['⚡', '🌩️'],
    fire2: ['🔥'],
    droplet: ['💧'],
    wavey: ['🌊'],
    christmastree: ['🎄', '🎅'],
    sparkler2: ['🎇'],
    firework: ['🎆'],
    firecracker: ['🧨'],
    jack: ['🎃', '🎃'],
    lantern: ['🏮'],
    moonviewing: ['🎑'],
    redpaper: ['🧧'],
    wrapping: ['🎁'],
    reminder2: ['🎗️'],
    tickets2: ['🎟️'],
    ticket: ['🎫'],
    militarymedal2: ['🎖️'],
    firstplacemedal: ['🥇'],
    secondplacemedal: ['🥈'],
    thirdplacemedal: ['🥉'],
    sportsmedal: ['🏅'],
    americanfootball: ['🏈'],
    rugbyfootball: ['🏉'],
    tennisball: ['🎾'],
    flyingdisc: ['🥏'],
    eightball: ['🎱'],
    yoyo2: ['🪀'],
    kitewing: ['🪁'],
    crystallball: ['🔮'],
    magicwand: ['🪄'],
    nazar: ['🧿'],
    video: ['📹', '🎥'],
    telephone: ['☎️'],
    pager: ['📟'],
    faxmachine: ['📠'],
    battery: ['🔋', '⚡'],
    electricplug: ['🔌'],
    laptop: ['💻'],
    desktop: ['🖥️'],
    printer: ['🖨️'],
    keyboard: ['⌨️'],
    mouse2: ['🖱️'],
    trackball: ['🖲️'],
    computerdisc: ['💽'],
    floppydisk: ['💾'],
    optical: ['💿'],
    dvd: ['📀'],
    abacus: ['🧮'],
    movieCamera: ['🎥'],
    filmframe: ['🎞️'],
    projector2: ['📽️'],
    clapperboard: ['🎬'],
    television: ['📺'],
    videoCamera: ['📹'],
    videocassette: ['📼'],
    magnifying: ['🔍', '🔎'],
    magnifyingright: ['🔎'],
    candle: ['🕯️', '🔥'],
    bulb: ['💡', '🔦'],
    flashlight: ['🔦'],
    redpaperlantern: ['🏮'],
    diyalamp: ['🪔'],
    notebookdecorative: ['📔'],
    closedbook: ['📕'],
    openbook: ['📖', '📚'],
    greenbook: ['📗'],
    bluebook: ['📓'],
    orangebook: ['📙'],
    books: ['📚'],
    notebook: ['📓'],
    ledger: ['📒'],
    pageup: ['📃'],
    scroll: ['📜', '📖'],
    pagecurl: ['📄'],
    newspaper: ['📰'],
    rolled: ['🗞️'],
    bookmark: ['🔖', '📚'],
    label: ['🏷️'],
    moneybag: ['💰'],
    coin: ['🪙'],
    yen: ['💴'],
    dollar: ['💵'],
    euro: ['💶'],
    pound: ['💷'],
    moneywings: ['💸'],
    creditcard: ['💳'],
    receipt: ['🧾'],
    chart: ['💹', '📈'],
    envelope: ['✉️', '📧'],
    email: ['📧', '✉️'],
    incoming: ['📨'],
    envelopearrow: ['📩'],
    outbox: ['📤'],
    inbox: ['📥'],
    package: ['📦'],
    mailbox: ['📫'],
    mailboxflag: ['📪'],
    mailboxdown: ['📬'],
    mailboxnomail: ['📭'],
    postbox: ['📮'],
    ballotbox: ['🗳️'],
    pencil2: ['✏️'],
    blacknib: ['✒️'],
    fountainpen: ['🖋️'],
    ballpointpen: ['🖊️'],
    paintbrush: ['🖌️'],
    crayon: ['🖍️'],
    memo: ['📝'],
    briefcase: ['💼'],
    filefolder: ['📁'],
    openfolder: ['📂'],
    carddividers: ['🗂️'],
    calendar2: ['📅'],
    tearcalendar: ['📆'],
    spiralNotepad: ['🗒️'],
    spiralCalendar: ['🗓️'],
    cardindex: ['📇'],
    increasing: ['📈'],
    decreasing: ['📉'],
    barchart: ['📊'],
    clipboard: ['📋'],
    pushpin: ['📌'],
    roundpushpin: ['📍'],
    paperclip: ['📎'],
    linkedpaperclips: ['🖇️'],
    straightruler: ['📏'],
    triangular: ['📐'],
    scissors2: ['✂️'],
    cardfilebox: ['🗃️'],
    filecabinet: ['🗄️'],
    trashcan: ['🗑️'],
    locked: ['🔒'],
    unlocked: ['🔓'],
    lockpen: ['🔏'],
    closedlockkey: ['🔐'],
    keysymbol: ['🔑'],
    oldkey: ['🗝️'],
    hammer: ['🔨', '🔧'],
    axe: ['🪓'],
    pick: ['⛏️'],
    hammerandpick: ['⚒️'],
    hammerwrench: ['🛠️'],
    dagger: ['🗡️'],
    swords: ['⚔️'],
    pistol: ['🔫'],
    boomerang: ['🪃'],
    bow: ['🏹'],
    shield: ['🛡️'],
    carpentry: ['🪚'],
    wrench: ['🔧'],
    nutbolt: ['🔩'],
    gear: ['⚙️'],
    clamp: ['🗜️'],
    balancescale: ['⚖️'],
    probing: ['🦯'],
    link: ['🔗', '🌐'],
    chains: ['⛓️'],
    hookah: ['🪝'],
    toolbox: ['🧰'],
    magnet: ['🧲'],
    ladder: ['🪜'],
    alembic: ['⚗️'],
    testtube: ['🧪'],
    petridish: ['🧫'],
    dna: ['🧬'],
    microscope: ['🔬'],
    telescope: ['🔭'],
    satelliteantenna: ['📡'],
    syringe: ['💉', '💊'],
    dropofblood: ['🩸'],
    pill: ['💊'],
    adhesivebandage: ['🩹'],
    crutch: ['🩼'],
    stethoscope: ['🩺'],
    xray: ['🩻'],
    closeddoor: ['🚪'],
    elevator: ['🛗'],
    mirror: ['🪞'],
    windowopen: ['🪟'],
    bed: ['🛏️', '😴'],
    couchAndlamp: ['🛋️'],
    chair: ['🪑'],
    toilet: ['🚽'],
    plunger: ['🪠'],
    shower: ['🚿', '💦'],
    bathtub: ['🛁'],
    mousetrap: ['🪤'],
    razor: ['🪒'],
    lotionbottle: ['🧴'],
    safetypin: ['🧷'],
    broom: ['🧹'],
    basket: ['🧺'],
    rolloftissue: ['🧻'],
    bucketsoap: ['🪣'],
    toothbrush: ['🪥'],
    sponge: ['🧽'],
    fireextinguisher: ['🧯'],
    shoppingcart: ['🛒'],
    cigarette: ['🚬'],
    coffin: ['⚰️'],
    headstone: ['🪦'],
    funeralurn: ['⚱️'],
    moyai: ['🗿'],
    placard: ['🪧'],
    identificationcard: ['🪪'],
    ATM: ['🏧', '💳'],
    littersign: ['🚮'],
    potablewater: ['🚰'],
    wheelchair: ['♿'],
    mensroom: ['🚹'],
    womensroom: ['🚺'],
    restroom: ['🚻'],
    babystation: ['🚼'],
    watersymbol: ['🚾'],
    warning: ['⚠️'],
    childrenCrossing: ['🚸'],
    noentry: ['⛔'],
    prohibited: ['🚫'],
    noBicycles: ['🚳'],
    noSmoking: ['🚭'],
    noLittering: ['🚯'],
    drinking: ['🚱'],
    noPedestrians: ['🚷'],
    nophones: ['📵'],
    undereighteen: ['🔞'],
    radioactive: ['☢️'],
    biohazard: ['☣️'],
    arrowup: ['⬆️', '🔝'],
    arrowupright: ['↗️'],
    arrowright: ['➡️'],
    arrowdownright: ['↘️'],
    arrowdown: ['⬇️', '⬇'],
    arrowdownleft: ['↙️'],
    arrowleft: ['⬅️'],
    arrowupleft: ['↖️'],
    arrowupdown: ['↕️'],
    arrowleftright: ['↔️'],
    arrowrightcurve: ['↪️'],
    arrowleftcurve: ['↩️'],
    curvedarrowdown: ['⤵️'],
    curvedarrowup: ['⤴️'],
    soon: ['🔜'],
    top: ['🔝', '⬆️'],
    end: ['🔚'],
    back: ['🔙'],
    on: ['🔛'],
    place: ['🏁'],
    atom: ['⚛️'],
    om: ['🕉️'],
    stardavid: ['✡️'],
    wheelofdharma: ['☸️'],
    yinyang: ['☯️'],
    latincross: ['✝️'],
    orthodoxcross: ['☦️'],
    starandcrescent: ['☪️'],
    peace: ['☮️'],
    menorah: ['🕎'],
    dottedsixstar: ['🔯'],
    aries: ['♈'],
    taurus: ['♉'],
    gemini: ['♊'],
    cancer: ['♋'],
    leo: ['♌'],
    virgo: ['♍'],
    libra: ['♎'],
    scorpio: ['♏'],
    sagittarius: ['♐'],
    capricorn: ['♑'],
    aquarius: ['♒'],
    pisces: ['♓'],
    ophiuchus: ['⛎'],
    shuffle: ['🔀', '🎵'],
    repeat: ['🔁'],
    repeatonce: ['🔂'],
    playpause: ['▶️'],
    fastforward: ['⏩'],
    nexttrack: ['⏭️'],
    playorpause: ['⏯️'],
    reversebutton: ['◀️'],
    fastreverse: ['⏪'],
    lasttrack: ['⏮️'],
    upwardsbutton: ['🔼'],
    fastupbutton: ['⏫'],
    downwardsbutton: ['🔽'],
    fastdownbutton: ['⏬'],
    pausebutton: ['⏸️'],
    stopbutton: ['⏹️'],
    recordbutton: ['⏺️'],
    ejectbutton: ['⏏️'],
    cinema: ['🎦', '🍿'],
    dimbutton: ['🔅'],
    brightbutton: ['🔆'],
    antennabar: ['📶'],
    wireless: ['🛜'],
    vibration: ['📳'],
    offmode: ['📴'],
    female: ['♀️'],
    male: ['♂️'],
    transgender: ['⚧️'],
    multiply: ['✖️'],
    plus: ['➕'],
    minus: ['➖'],
    divide: ['➗'],
    heavy: ['🟰'],
    infinity: ['♾️'],
    bangbang: ['‼️'],
    interrobang: ['⁉️'],
    questionmark: ['❓'],
    whitequestion: ['❔'],
    whiteexclamation: ['❕'],
    exclamation: ['❗'],
    wavydash: ['〰️'],
    currencyexchange: ['💱'],
    heavydollar: ['💲'],
    medicalSymbol: ['⚕️'],
    recycle: ['♻️'],
    fleurdelis: ['⚜️'],
    trident: ['🔱'],
    namebadge: ['📛'],
    beginner: ['🔰'],
    hollowredcircle: ['⭕'],
    checkmarkbutton: ['✅'],
    checkmark: ['☑️'],
    checkmarkheavy: ['✔️'],
    cross: ['❌'],
    crossheavy: ['✖️'],
    curlyloop: ['➰'],
    doubleloop: ['➿'],
    partalt: ['〽️'],
    eightspoke: ['✳️'],
    eightpoint: ['✴️'],
    sparkle: ['❇️'],
    copyright: ['©️'],
    registered: ['®️'],
    trademark: ['™️'],
    keycap: ['#️⃣'],
    keycapstar: ['*️⃣'],
    keycapzero: ['0️⃣'],
    keycapone: ['1️⃣'],
    keycaptwo: ['2️⃣'],
    keycapthree: ['3️⃣'],
    keycapfour: ['4️⃣'],
    keycapfive: ['5️⃣'],
    keycapsix: ['6️⃣'],
    keycapseven: ['7️⃣'],
    keycapeight: ['8️⃣'],
    keycapnine: ['9️⃣'],
    keycapten: ['🔟'],
    inputlatinuppercase: ['🔠'],
    inputlatinlowercase: ['🔡'],
    inputnumbers: ['🔢'],
    inputsymbols: ['🔣'],
    inputlatinletters: ['🔤'],
    abutton: ['🅰️'],
    abblood: ['🆎'],
    bbutton: ['🅱️'],
    clbutton: ['🆑'],
    coolbutton: ['🆒'],
    freebutton: ['🆓'],
    information2: ['ℹ️'],
    idbutton: ['🆔'],
    circledm: ['Ⓜ️'],
    newbutton: ['🆕'],
    ngbutton: ['🆖'],
    obutton: ['🅾️'],
    okbutton: ['🆗'],
    pbutton: ['🅿️'],
    sosbutton: ['🆘'],
    upbutton: ['🆙'],
    vsbutton: ['🆚'],
    japaneseherebutton: ['🈁'],
    japanesefreebutton: ['🈚'],
    japanesereservedbutton: ['🈯'],
    japanesenodiscountbutton: ['🈹'],
    japanesepassingbutton: ['🈴']
  };

  const moodEmojis = {
    excited: ['🔥', '🤯', '😤', '💥'],
    questioning: ['🤔', '❓', '😵‍💫', '🧐'],
    neutral: ['😐', '😶', '🙂'],
    happy: ['😊', '✨', '🎉'],
    sad: ['😢', '💔', '😔'],
    angry: ['😠', '😡', '🤬'],
    love: ['❤️', '💕', '😍'],
    tired: ['😴', '🥱', '😪'],
    cool: ['😎', '🕶️', '💯'],
    worried: ['😰', '😥', '😨'],
    surprised: ['😲', '😮', '🤭'],
    silly: ['🤪', '😜', '🙃'],
    scared: ['😱', '😨', '👻'],
    proud: ['💪', '🏆', '👑'],
    confused: ['😵', '🤷', '😕'],
    sick: ['🤢', '🤮', '🤧'],
    hungry: ['🤤', '😋', '🍕'],
    peaceful: ['😌', '🧘', '☮️'],
    annoyed: ['🙄', '😒', '😤'],
    grateful: ['🙏', '😇', '🌸']
};
  const translateText = async (text) => {
    if (!text.trim()) return '';

    console.log('=== Translation Start ===');
    console.log('Input:', text);
    console.log('Mode:', mode);

    const spellChecker = createSpellChecker(emojiMap);

    const cleanedText = removeStopWords(text);
    console.log('Cleaned text:', cleanedText);
    
    const isComplex = isComplexSentence(cleanedText);
    console.log('Is complex sentence:', isComplex);
    
    if (isComplex && mode === 'vibe') {
      console.log('Trying API for complex sentence...');
      const apiResult = await translateWithAPI(cleanedText);
      if (apiResult) {
        console.log('API result:', apiResult);
        return apiResult;
      }
      console.log('API failed or no key, falling back to client-side');
    }

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
    setShowShareModal(true);
  };

  const shareToClipboard = async () => {
    const shareText = `${input} → ${emojis}\n\n✨ Translate yours: ${window.location.origin}`;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToFacebook = () => {
    const text = encodeURIComponent(`${input} → ${emojis}\n\n✨ Try it yourself!`);
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`${input} → ${emojis}\n\n✨ Try the Emoji Translator!`);
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`${input} → ${emojis}\n\n✨ Translate yours: ${window.location.origin}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ 
          text: `${input} → ${emojis}\n\n✨ Try it: ${window.location.origin}`,
          title: '✨ Emoji Translator'
        });
        setShowShareModal(false);
      } catch (err) {
        // User cancelled
      }
    }
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

        <div className="text-center mb-12">
          <h1 className={`text-6xl font-black mb-2 drop-shadow-lg ${isDark ? 'text-yellow-200' : 'text-red-900'}`}>
            <span className="inline-block animate-fire">🔥</span> EMOJIFY
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

          {emojis && (
            <div className={`p-8 rounded-3xl transition-all duration-500 transform hover:scale-[1.02] ${
              isDark 
                ? 'bg-white/15 backdrop-blur-lg border-2 border-orange-500/40 shadow-2xl shadow-red-900/50' 
                : 'bg-white/95 shadow-2xl border-2 border-red-200'
            }`}>
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
                Recent Translations
              </h3>
              <div className="space-y-3">
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
