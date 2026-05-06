// The Rift — champion + faction data (LoL-themed reskin)
// Internal stone keys (power/space/time/mind/soul/reality) preserved for game logic;
// only display names + symbols change so balance stays identical.

const STONES = ['power', 'space', 'time', 'mind', 'soul'];

const STONE_META = {
  power:   { name: 'Crimson', color: '#ff3b3b', glow: '#ff7676', symbol: '⚔', label: 'C' }, // Noxus
  space:   { name: 'Hex',     color: '#3bbfff', glow: '#7cd5ff', symbol: '⬡', label: 'H' }, // Piltover/Hextech
  time:    { name: 'Spirit',  color: '#2fd97a', glow: '#76ffb1', symbol: '☯', label: 'I' }, // Ionia
  mind:    { name: 'Valor',   color: '#ffd87a', glow: '#fff7c8', symbol: '⚜', label: 'V' }, // Demacia
  soul:    { name: 'Shadow',  color: '#b35bff', glow: '#d99cff', symbol: '☠', label: 'S' }, // Shadow Isles
  reality: { name: 'Hexgold', color: '#ff8a3b', glow: '#ffc488', symbol: '✺', label: 'R' }  // Wild
};

function c(o) { return o; }

const CARDS = {
  1: [
    // Tier 1 — emerging champions
    c({ tier:1, hero:'Ashe',       emoji:'🏹',  bonus:'time',  prestige:0, cost:{ power:1, space:1, mind:1, soul:1 } }),
    c({ tier:1, hero:'Akali',      emoji:'🥷',  bonus:'soul',  prestige:0, cost:{ power:1, space:2, time:1, mind:1 } }),
    c({ tier:1, hero:'Caitlyn',    emoji:'🎯',  bonus:'space', prestige:0, cost:{ time:2, mind:1, soul:2 } }),
    c({ tier:1, hero:'Darius',     emoji:'🪓',  bonus:'power', prestige:0, cost:{ space:1, time:2, mind:2 } }),
    c({ tier:1, hero:'Lux',        emoji:'✨',  bonus:'mind',  prestige:0, cost:{ power:2, space:2, soul:1 } }),
    c({ tier:1, hero:'Teemo',      emoji:'🍄',  bonus:'time',  prestige:0, cost:{ power:2, mind:1 } }),
    c({ tier:1, hero:'Veigar',     emoji:'🎩',  bonus:'soul',  prestige:0, cost:{ space:3 } }),
    c({ tier:1, hero:'Annie',      emoji:'🔥',  bonus:'power', prestige:0, cost:{ time:3 } }),
    c({ tier:1, hero:'Maokai',     emoji:'🌳',  bonus:'time',  prestige:0, cost:{ mind:3 } }),
    c({ tier:1, hero:'Vi',         emoji:'👊',  bonus:'space', prestige:0, cost:{ soul:3 } }),
    c({ tier:1, hero:'Soraka',     emoji:'🌙',  bonus:'mind',  prestige:0, cost:{ power:3 } }),
    c({ tier:1, hero:'Master Yi',  emoji:'🗡️',  bonus:'power', prestige:0, cost:{ soul:2, time:1 } }),
    c({ tier:1, hero:'Shaco',      emoji:'🃏',  bonus:'soul',  prestige:0, cost:{ space:2, mind:2 } }),
    c({ tier:1, hero:'Lulu',       emoji:'🦋',  bonus:'mind',  prestige:0, cost:{ time:1, space:1, power:1 } }),
    c({ tier:1, hero:'Tristana',   emoji:'💥',  bonus:'space', prestige:0, cost:{ power:1, mind:1, time:1, soul:1 } }),
    c({ tier:1, hero:'Pyke',       emoji:'🩸',  bonus:'soul',  prestige:0, cost:{ mind:2, time:2 } }),
    c({ tier:1, hero:'Renekton',   emoji:'🐊',  bonus:'power', prestige:1, cost:{ soul:4 } }),
    c({ tier:1, hero:'Sona',       emoji:'🎵',  bonus:'time',  prestige:0, cost:{ power:2, soul:2 } }),
  ],
  2: [
    // Tier 2 — rising champions
    c({ tier:2, hero:'Yasuo',      emoji:'🌬️',  bonus:'time',  prestige:1, cost:{ space:3, mind:2, soul:2 } }),
    c({ tier:2, hero:'Ahri',       emoji:'🦊',  bonus:'mind',  prestige:1, cost:{ power:3, time:2, soul:3 } }),
    c({ tier:2, hero:'Ezreal',     emoji:'🌟',  bonus:'mind',  prestige:2, cost:{ time:5 } }),
    c({ tier:2, hero:'Riven',      emoji:'⚔️',  bonus:'soul',  prestige:2, cost:{ mind:5 } }),
    c({ tier:2, hero:'Thresh',     emoji:'⛓️',  bonus:'time',  prestige:2, cost:{ soul:5 } }),
    c({ tier:2, hero:'Garen',      emoji:'🛡️',  bonus:'power', prestige:1, cost:{ space:2, time:3, soul:2 } }),
    c({ tier:2, hero:'Lee Sin',    emoji:'👁️',  bonus:'power', prestige:2, cost:{ power:5 } }),
    c({ tier:2, hero:'Jinx',       emoji:'💣',  bonus:'space', prestige:2, cost:{ space:5 } }),
    c({ tier:2, hero:'Vayne',      emoji:'🦇',  bonus:'power', prestige:1, cost:{ power:2, time:3, mind:2 } }),
    c({ tier:2, hero:'Zed',        emoji:'🥷',  bonus:'soul',  prestige:1, cost:{ power:3, soul:2, time:2 } }),
    c({ tier:2, hero:'Yone',       emoji:'🎭',  bonus:'space', prestige:2, cost:{ space:6 } }),
    c({ tier:2, hero:'Diana',      emoji:'🌑',  bonus:'mind',  prestige:2, cost:{ mind:6 } }),
  ],
  3: [
    // Tier 3 — legendary champions
    c({ tier:3, hero:'Aatrox',       emoji:'🗡️', bonus:'power', prestige:4, cost:{ time:3, mind:3, soul:5, power:3 } }),
    c({ tier:3, hero:'Kayn',         emoji:'💀', bonus:'space', prestige:4, cost:{ power:3, time:3, mind:3, soul:5 } }),
    c({ tier:3, hero:'Aurelion Sol', emoji:'🌌', bonus:'mind',  prestige:4, cost:{ space:5, time:3, power:3, soul:3 } }),
    c({ tier:3, hero:'Zoe',          emoji:'⭐', bonus:'time',  prestige:4, cost:{ power:5, space:3, mind:3, soul:3 } }),
    c({ tier:3, hero:'Sett',         emoji:'👊', bonus:'soul',  prestige:4, cost:{ power:5, time:3, mind:3, space:3 } }),
    c({ tier:3, hero:'Viego',        emoji:'👑', bonus:'soul',  prestige:5, cost:{ soul:7, power:3 } }),
    c({ tier:3, hero:'Mordekaiser',  emoji:'⚰️', bonus:'space', prestige:5, cost:{ space:7, mind:3 } }),
    c({ tier:3, hero:'Volibear',     emoji:'⚡', bonus:'time',  prestige:5, cost:{ time:7, soul:3 } }),
    c({ tier:3, hero:'Galio',        emoji:'🗿', bonus:'mind',  prestige:5, cost:{ mind:7, time:3 } }),
    c({ tier:3, hero:'Nautilus',     emoji:'⚓', bonus:'power', prestige:5, cost:{ power:7, space:3 } }),
    c({ tier:3, hero:'Pantheon',     emoji:'🛡️', bonus:'power', prestige:3, cost:{ power:6, time:3 } }),
    c({ tier:3, hero:'Senna',        emoji:'🌫️', bonus:'soul',  prestige:3, cost:{ space:6, soul:3 } }),
  ]
};

// Factions (replaces Teams/Nobles): claimed automatically when bonus thresholds met.
const TEAMS = [
  { name:'Demacia',      emoji:'⚜',  prestige:3, req:{ power:3, time:3, mind:3 } },
  { name:'Bilgewater',   emoji:'🏴‍☠️', prestige:3, req:{ space:3, soul:3, mind:3 } },
  { name:'Piltover',     emoji:'⚙',  prestige:3, req:{ mind:4, space:4 } },
  { name:'Noxus',        emoji:'⚔',  prestige:3, req:{ power:4, soul:4 } },
  { name:'Ionia',        emoji:'☯',  prestige:3, req:{ time:4, mind:4 } },
  { name:'Shadow Isles', emoji:'☠',  prestige:3, req:{ time:4, soul:4 } },
  { name:'Targon',       emoji:'⛰',  prestige:3, req:{ soul:3, time:3, space:3 } },
];

const TOKEN_COUNT = { stone: 4, reality: 5 };

const VICTORY_PRESTIGE = 15;
const MAX_HAND = 10;
const MAX_RESERVE = 3;

if (typeof module !== 'undefined') {
  module.exports = { CARDS, TEAMS, STONES, STONE_META, TOKEN_COUNT, VICTORY_PRESTIGE, MAX_HAND, MAX_RESERVE };
}
