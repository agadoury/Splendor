// Marvel Splendor card data
// Stones: power (red), space (blue), time (green), mind (yellow), soul (purple)
// Bonus is the permanent stone the card gives when recruited.
// Cost is what must be paid to recruit it. Reality stones (wild) substitute any.

const STONES = ['power', 'space', 'time', 'mind', 'soul'];

const STONE_META = {
  power:   { name: 'Power',   color: '#ff3b3b', glow: '#ff7676', symbol: '⚡', label: 'P' },
  space:   { name: 'Space',   color: '#3b9bff', glow: '#7cc1ff', symbol: '✦', label: 'S' },
  time:    { name: 'Time',    color: '#2fd97a', glow: '#76ffb1', symbol: '◷', label: 'T' },
  mind:    { name: 'Mind',    color: '#ffcd3b', glow: '#ffe27c', symbol: '◈', label: 'M' },
  soul:    { name: 'Soul',    color: '#b35bff', glow: '#d99cff', symbol: '❂', label: 'O' },
  reality: { name: 'Reality', color: '#ff8a3b', glow: '#ffc488', symbol: '✺', label: 'R' }
};

// Helper to make a card concisely.
// c({tier, hero, emoji, bonus, prestige, cost: {stone: n,...}})
function c(o) { return o; }

const CARDS = {
  1: [
    // Tier 1 — recruits, sidekicks, agents
    c({ tier:1, hero:'Hawkeye',        emoji:'🏹', bonus:'time',  prestige:0, cost:{ power:1, space:1, mind:1, soul:1 } }),
    c({ tier:1, hero:'Black Widow',    emoji:'🕷️', bonus:'soul',  prestige:0, cost:{ power:1, space:2, time:1, mind:1 } }),
    c({ tier:1, hero:'Falcon',         emoji:'🦅', bonus:'space', prestige:0, cost:{ time:2, mind:1, soul:2 } }),
    c({ tier:1, hero:'War Machine',    emoji:'🤖', bonus:'power', prestige:0, cost:{ space:1, time:2, mind:2 } }),
    c({ tier:1, hero:'Wasp',           emoji:'🐝', bonus:'mind',  prestige:0, cost:{ power:2, space:2, soul:1 } }),
    c({ tier:1, hero:'Ant-Man',        emoji:'🐜', bonus:'time',  prestige:0, cost:{ power:2, mind:1 } }),
    c({ tier:1, hero:'Star-Lord',      emoji:'🎧', bonus:'soul',  prestige:0, cost:{ space:3 } }),
    c({ tier:1, hero:'Rocket',         emoji:'🦝', bonus:'power', prestige:0, cost:{ time:3 } }),
    c({ tier:1, hero:'Groot',          emoji:'🌳', bonus:'time',  prestige:0, cost:{ mind:3 } }),
    c({ tier:1, hero:'Gamora',         emoji:'⚔️', bonus:'space', prestige:0, cost:{ soul:3 } }),
    c({ tier:1, hero:'Mantis',         emoji:'🦋', bonus:'mind',  prestige:0, cost:{ power:3 } }),
    c({ tier:1, hero:'Drax',           emoji:'🗡️', bonus:'power', prestige:0, cost:{ soul:2, time:1 } }),
    c({ tier:1, hero:'Nebula',         emoji:'🌑', bonus:'soul',  prestige:0, cost:{ space:2, mind:2 } }),
    c({ tier:1, hero:'Shuri',          emoji:'🔬', bonus:'mind',  prestige:0, cost:{ time:1, space:1, power:1 } }),
    c({ tier:1, hero:'Okoye',          emoji:'🛡️', bonus:'space', prestige:0, cost:{ power:1, mind:1, time:1, soul:1 } }),
    c({ tier:1, hero:'Wong',           emoji:'📕', bonus:'soul',  prestige:0, cost:{ mind:2, time:2 } }),
    c({ tier:1, hero:'Valkyrie',       emoji:'🐎', bonus:'power', prestige:1, cost:{ soul:4 } }),
    c({ tier:1, hero:'Mockingbird',    emoji:'🎯', bonus:'time',  prestige:0, cost:{ power:2, soul:2 } }),
  ],
  2: [
    // Tier 2 — heroes coming into their power
    c({ tier:2, hero:'Spider-Man',     emoji:'🕸️', bonus:'time',  prestige:1, cost:{ space:3, mind:2, soul:2 } }),
    c({ tier:2, hero:'Black Panther',  emoji:'🐆', bonus:'mind',  prestige:1, cost:{ power:3, time:2, soul:3 } }),
    c({ tier:2, hero:'Vision',         emoji:'💎', bonus:'mind',  prestige:2, cost:{ time:5 } }),
    c({ tier:2, hero:'Scarlet Witch',  emoji:'🔮', bonus:'soul',  prestige:2, cost:{ mind:5 } }),
    c({ tier:2, hero:'Doctor Strange', emoji:'🌀', bonus:'time',  prestige:2, cost:{ soul:5 } }),
    c({ tier:2, hero:'Captain America',emoji:'🛡️', bonus:'power', prestige:1, cost:{ space:2, time:3, soul:2 } }),
    c({ tier:2, hero:'Thor',           emoji:'⚒️', bonus:'power', prestige:2, cost:{ power:5 } }),
    c({ tier:2, hero:'Iron Man',       emoji:'🛠️', bonus:'space', prestige:2, cost:{ space:5 } }),
    c({ tier:2, hero:'Hulk',           emoji:'💪', bonus:'power', prestige:1, cost:{ power:2, time:3, mind:2 } }),
    c({ tier:2, hero:'Winter Soldier', emoji:'🦾', bonus:'soul',  prestige:1, cost:{ power:3, soul:2, time:2 } }),
    c({ tier:2, hero:'Hulkbuster',     emoji:'🤖', bonus:'space', prestige:2, cost:{ space:6 } }),
    c({ tier:2, hero:'Captain Marvel', emoji:'🌟', bonus:'mind',  prestige:2, cost:{ mind:6 } }),
  ],
  3: [
    // Tier 3 — legends and cosmic forces
    c({ tier:3, hero:'Thor Stormbreaker', emoji:'🌩️', bonus:'power', prestige:4, cost:{ time:3, mind:3, soul:5, power:3 } }),
    c({ tier:3, hero:'Iron Man Mk85',     emoji:'🦾', bonus:'space', prestige:4, cost:{ power:3, time:3, mind:3, soul:5 } }),
    c({ tier:3, hero:'Captain Marvel ★',  emoji:'☄️', bonus:'mind',  prestige:4, cost:{ space:5, time:3, power:3, soul:3 } }),
    c({ tier:3, hero:'Doctor Strange ★',  emoji:'🌌', bonus:'time',  prestige:4, cost:{ power:5, space:3, mind:3, soul:3 } }),
    c({ tier:3, hero:'Phoenix',           emoji:'🔥', bonus:'soul',  prestige:4, cost:{ power:5, time:3, mind:3, space:3 } }),
    c({ tier:3, hero:'Thanos',            emoji:'👑', bonus:'soul',  prestige:5, cost:{ soul:7, power:3 } }),
    c({ tier:3, hero:'Galactus',          emoji:'🪐', bonus:'space', prestige:5, cost:{ space:7, mind:3 } }),
    c({ tier:3, hero:'Eternity',          emoji:'♾️', bonus:'time',  prestige:5, cost:{ time:7, soul:3 } }),
    c({ tier:3, hero:'The Living Tribunal', emoji:'⚖️', bonus:'mind', prestige:5, cost:{ mind:7, time:3 } }),
    c({ tier:3, hero:'The One Above All', emoji:'✨', bonus:'power', prestige:5, cost:{ power:7, space:3 } }),
    c({ tier:3, hero:'Avengers Assemble', emoji:'🛡️', bonus:'power', prestige:3, cost:{ power:6, time:3 } }),
    c({ tier:3, hero:'Guardians',         emoji:'🚀', bonus:'soul',  prestige:3, cost:{ space:6, soul:3 } }),
  ]
};

// Teams (Nobles): met when player has the required permanent stones (card bonuses).
const TEAMS = [
  { name:'Avengers',           emoji:'🛡️', prestige:3, req:{ power:3, time:3, mind:3 } },
  { name:'Guardians',          emoji:'🚀', prestige:3, req:{ space:3, soul:3, mind:3 } },
  { name:'Wakanda',            emoji:'🐆', prestige:3, req:{ mind:4, space:4 } },
  { name:'Defenders',          emoji:'👊', prestige:3, req:{ power:4, soul:4 } },
  { name:'X-Men',              emoji:'❌', prestige:3, req:{ time:4, mind:4 } },
  { name:'Illuminati',         emoji:'👁️', prestige:3, req:{ time:4, soul:4 } },
  { name:'Sorcerers Supreme',  emoji:'🌀', prestige:3, req:{ soul:3, time:3, space:3 } },
];

// Token counts for 2-player game
const TOKEN_COUNT = { stone: 4, reality: 5 };

const VICTORY_PRESTIGE = 15;
const MAX_HAND = 10;
const MAX_RESERVE = 3;

if (typeof module !== 'undefined') {
  module.exports = { CARDS, TEAMS, STONES, STONE_META, TOKEN_COUNT, VICTORY_PRESTIGE, MAX_HAND, MAX_RESERVE };
}
