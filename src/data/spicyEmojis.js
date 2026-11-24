// Cheeky words: PG-13 swearing and toilet humour, the kind people screenshot.
// EXACT MATCH ONLY: these keys are left out of the fuzzy spelling index, so an
// innocent word never lands here ("class" stays a classroom, never 🍑; "shirt"
// never becomes 💩). Chaos mode skips them too: they appear only when typed.
//
// The line: no slurs, nothing sexually explicit. Facebook groups remove that,
// and payment providers (Stripe, Lemon Squeezy) restrict adult content.
// The Daily puzzle never uses this file.

export const spicyEmojis = {
  // toilet
  poop: ['💩'],
  shit: ['💩', '😤'],
  shitty: ['💩', '👎'],
  crap: ['💩'],
  crappy: ['💩', '👎'],
  bullshit: ['🐂💩', '🧢'],
  fart: ['💨', '😷'],
  farted: ['💨', '🤭'],

  // the peach department
  ass: ['🍑'],
  butt: ['🍑'],
  booty: ['🍑', '💃'],
  thicc: ['🍑', '🔥'],
  badass: ['😎', '🍑', '🔥'],
  dumbass: ['🤡', '🍑'],
  smartass: ['🤓', '🍑'],
  jackass: ['🫏'],
  asshole: ['😤', '🍑', '🤬'],

  // swearing
  damn: ['😤', '🙄', '😳'],
  dammit: ['😤', '🤦'],
  hell: ['🔥', '😈'],
  fuck: ['🤬'],
  fucking: ['🤬'],
  fucked: ['🤬', '😵'],
  wtf: ['🤨', '🤬', '😳'],
  stfu: ['🤐', '🤫'],
  fml: ['😩', '🤦', '💀'],
  lmfao: ['🤣', '💀'],
  pissed: ['😡', '🤬'],
  sucks: ['👎', '😩'],

  // flirty, not explicit
  sexy: ['😏', '🔥'],
  naked: ['🙈', '🫣'],
};
