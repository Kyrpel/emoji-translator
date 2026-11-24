// EMOJIFY Daily: one puzzle a day, the same for everyone. Server-only: the
// answers never ship in the page bundle (this file is imported by daily.js and
// has no route of its own).
//
// Puzzle #1 is DAILY_EPOCH; after the last puzzle the list starts over, so add
// more at the end to keep it fresh. Changing DAILY_EPOCH renumbers every day:
// set it to your launch date once, then leave it.
//
// With the epoch below, #28 (Home Alone) lands on 20 December and the two
// Christmas songs on 24 and 25 December 2026.
//
// Titles only, never lyrics or artwork. Keep them clean: everyone sees the same one.

export const DAILY_EPOCH = '2026-11-23';

export const PUZZLES = [
  { category: 'movie', emojis: '🦁👑', answer: 'The Lion King', clue: 'Disney, 1994' },
  { category: 'song', emojis: '👥🪨🫵', answer: 'We Will Rock You', clue: 'Queen, 1977' },
  { category: 'movie', emojis: '🚢🧊💔', answer: 'Titanic', clue: 'James Cameron, 1997' },
  { category: 'song', emojis: '☔💃', answer: 'Umbrella', clue: 'Rihanna, 2007' },
  { category: 'movie', emojis: '🦖🏝️🧬', answer: 'Jurassic Park', clue: 'Steven Spielberg, 1993' },
  { category: 'song', emojis: '💃👑', answer: 'Dancing Queen', clue: 'ABBA, 1976' },
  { category: 'movie', emojis: '🐠🔍', answer: 'Finding Nemo', clue: 'Pixar, 2003' },
  { category: 'song', emojis: '👁️🐯', answer: 'Eye of the Tiger', clue: 'Survivor, 1982' },
  { category: 'movie', emojis: '🔙🔜🚗⚡', answer: 'Back to the Future', clue: '1985, a DeLorean' },
  { category: 'song', emojis: '🏨🌴', answer: 'Hotel California', clue: 'Eagles, 1976' },
  {
    category: 'movie', emojis: '🧹⚡👓', answer: 'Harry Potter', clue: '2001, a school for wizards',
    aliases: ["Harry Potter and the Philosopher's Stone", "Harry Potter and the Sorcerer's Stone"],
  },
  { category: 'song', emojis: '🔷🫵', answer: 'Shape of You', clue: 'Ed Sheeran, 2017' },
  { category: 'movie', emojis: '🧸🤠🚀', answer: 'Toy Story', clue: 'Pixar, 1995' },
  { category: 'song', emojis: '🐢🐢🇵🇷', answer: 'Despacito', clue: 'Luis Fonsi, 2017' },
  { category: 'movie', emojis: '🦈🏖️😱', answer: 'Jaws', clue: 'Steven Spielberg, 1975' },
  { category: 'song', emojis: '🧊🧊👶', answer: 'Ice Ice Baby', clue: 'Vanilla Ice, 1990' },
  { category: 'movie', emojis: '⭐⚔️', answer: 'Star Wars', clue: 'George Lucas, 1977' },
  { category: 'song', emojis: '🚀👨', answer: 'Rocket Man', clue: 'Elton John, 1972' },
  { category: 'movie', emojis: '🧊👸❄️', answer: 'Frozen', clue: 'Disney, 2013' },
  { category: 'song', emojis: '🟣🌧️', answer: 'Purple Rain', clue: 'Prince, 1984' },
  { category: 'movie', emojis: '🏃‍♂️🍫🍤', answer: 'Forrest Gump', clue: 'Tom Hanks, 1994' },
  { category: 'song', emojis: '👱‍♀️🎀👧', answer: 'Barbie Girl', clue: 'Aqua, 1997' },
  { category: 'movie', emojis: '🕶️💊🐇', answer: 'The Matrix', clue: 'Keanu Reeves, 1999' },
  { category: 'song', emojis: '⬆️🏙️🕺', answer: 'Uptown Funk', clue: 'Mark Ronson and Bruno Mars, 2014' },
  { category: 'movie', emojis: '🏠🎈👴', answer: 'Up', clue: 'Pixar, 2009' },
  { category: 'song', emojis: '🤪❤️', answer: 'Crazy in Love', clue: 'Beyoncé, 2003' },
  { category: 'movie', emojis: '🐀👨‍🍳🇫🇷', answer: 'Ratatouille', clue: 'Pixar, 2007' },
  { category: 'movie', emojis: '🏠🧒🎄🪤', answer: 'Home Alone', clue: '1990, a kid and two burglars' },
  { category: 'song', emojis: '😈🧍‍♂️', answer: 'Bad Guy', clue: 'Billie Eilish, 2019' },
  {
    category: 'movie', emojis: '👽📞🏠', answer: 'E.T.', clue: 'Steven Spielberg, 1982',
    aliases: ['ET', 'E.T. the Extra-Terrestrial', 'ET the Extra Terrestrial', 'The Extra Terrestrial'],
  },
  { category: 'song', emojis: '🚶☀️', answer: 'Walking on Sunshine', clue: 'Katrina and the Waves, 1985' },
  { category: 'song', emojis: '🎄🙏🫵', answer: 'All I Want for Christmas Is You', clue: 'Mariah Carey, 1994' },
  { category: 'song', emojis: '🔔🎄🪨', answer: 'Jingle Bell Rock', clue: 'Bobby Helms, 1957' },
  { category: 'movie', emojis: '👻🚫🎒', answer: 'Ghostbusters', clue: '1984, who you gonna call?', aliases: ['Ghost Busters'] },
  { category: 'song', emojis: '1️⃣👩💍', answer: 'Single Ladies', clue: 'Beyoncé, 2008', aliases: ['Single Ladies (Put a Ring on It)'] },
  { category: 'movie', emojis: '🕷️🧑', answer: 'Spider-Man', clue: 'Sam Raimi, 2002', aliases: ['Spiderman'] },
  { category: 'song', emojis: '🪽🧑➡️🌙', answer: 'Fly Me to the Moon', clue: 'Frank Sinatra, 1964' },
  { category: 'movie', emojis: '🌪️👠🦁', answer: 'The Wizard of Oz', clue: '1939, a yellow brick road' },
  { category: 'song', emojis: '🛣️➡️🔥😈', answer: 'Highway to Hell', clue: 'AC/DC, 1979' },
  { category: 'movie', emojis: '🐼🥋', answer: 'Kung Fu Panda', clue: 'DreamWorks, 2008' },
  { category: 'song', emojis: '👩🌌💎', answer: 'Lucy in the Sky with Diamonds', clue: 'The Beatles, 1967' },
  { category: 'movie', emojis: '🏴‍☠️🏝️🌊', answer: 'Pirates of the Caribbean', clue: 'Johnny Depp, 2003' },
  { category: 'song', emojis: '🤕💔', answer: 'Achy Breaky Heart', clue: 'Billy Ray Cyrus, 1992' },
  { category: 'movie', emojis: '🧜‍♀️🦀', answer: 'The Little Mermaid', clue: 'Disney, 1989' },
  { category: 'song', emojis: '🐕🎸', answer: 'Hound Dog', clue: 'Elvis Presley, 1956' },
  { category: 'movie', emojis: '🐝🎬', answer: 'Bee Movie', clue: 'DreamWorks, 2007' },
  { category: 'song', emojis: '⬆️🌈', answer: 'Over the Rainbow', clue: 'Judy Garland, 1939', aliases: ['Somewhere Over the Rainbow'] },
  { category: 'movie', emojis: '🚀🌽🕳️⏳', answer: 'Interstellar', clue: 'Christopher Nolan, 2014' },
  { category: 'song', emojis: '🧱🧱🧱🏫', answer: 'Another Brick in the Wall', clue: 'Pink Floyd, 1979' },
  { category: 'movie', emojis: '💀🎸🇲🇽', answer: 'Coco', clue: 'Pixar, 2017' },
  {
    category: 'song', emojis: '🏠🛣️🏔️', answer: 'Take Me Home, Country Roads', clue: 'John Denver, 1971',
    aliases: ['Country Roads'],
  },
  { category: 'movie', emojis: '🕴️🕴️👽🕶️', answer: 'Men in Black', clue: 'Will Smith, 1997', aliases: ['MIB'] },
  { category: 'song', emojis: '⬇️🌊', answer: 'Under the Sea', clue: 'The Little Mermaid, 1989' },
  { category: 'movie', emojis: '🌹👸🐃', answer: 'Beauty and the Beast', clue: 'Disney, 1991' },
  { category: 'song', emojis: '👧👧🙏🥳', answer: 'Girls Just Want to Have Fun', clue: 'Cyndi Lauper, 1983' },
  {
    category: 'movie', emojis: '🍫🏭🎫', answer: 'Charlie and the Chocolate Factory', clue: 'Roald Dahl, filmed 1971 and 2005',
    aliases: ['Willy Wonka and the Chocolate Factory', 'Willy Wonka'],
  },
  { category: 'song', emojis: '✨✨🤏⭐', answer: 'Twinkle Twinkle Little Star', clue: 'A nursery rhyme' },
  { category: 'movie', emojis: '😈👗👠', answer: 'The Devil Wears Prada', clue: 'Meryl Streep, 2006' },
  { category: 'song', emojis: '👶👶👶', answer: 'Baby', clue: 'Justin Bieber, 2010' },
  { category: 'movie', emojis: '🌊🛶🐓', answer: 'Moana', clue: 'Disney, 2016' },
];
