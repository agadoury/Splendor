// Simple but reasonable AI opponent for The Rift.
// Difficulty levels affect lookahead and risk-taking.

const AI = (() => {

  // --- Helpers ---
  function totalStones(player) {
    return STONES.concat(['reality']).reduce((s, c) => s + (player.stones[c] || 0), 0);
  }

  function effectiveCost(player, card) {
    // Returns { stoneNeeded: {color:n}, wildNeeded: n, canAfford: bool }
    const need = {};
    let wildNeeded = 0;
    for (const color of STONES) {
      const cost = card.cost[color] || 0;
      const bonus = player.bonuses[color] || 0;
      const have = player.stones[color] || 0;
      const stillNeed = Math.max(0, cost - bonus);
      if (stillNeed <= have) {
        need[color] = stillNeed;
      } else {
        need[color] = have;
        wildNeeded += stillNeed - have;
      }
    }
    const canAfford = wildNeeded <= (player.stones.reality || 0);
    return { need, wildNeeded, canAfford };
  }

  function cardScore(card, player, opponent, difficulty) {
    // Higher = better for AI to want this card.
    let score = card.prestige * 10 + 1;

    // Add bonus value based on shortage in costs we see on board cards / teams.
    // Simple heuristic: bonuses we don't have yet are worth more.
    const cur = player.bonuses[card.bonus] || 0;
    score += Math.max(0, 4 - cur) * 1.5;

    // Tier weighting -- prefer to grow toward tier 3
    score += card.tier * 1.2;

    // Big bonus for cards we can afford right now
    const ec = effectiveCost(player, card);
    if (ec.canAfford) score += 8;

    // Penalize expensive cards we cannot afford with current trajectory
    const totalCost = STONES.reduce((s,c) => s + (card.cost[c] || 0), 0);
    score -= totalCost * 0.4;

    // Endgame: heavily prefer prestige cards we can afford
    if (difficulty !== 'easy' && player.prestige >= 10) {
      score += card.prestige * 4;
    }

    return score;
  }

  function teamProgressScore(player, teams) {
    // Score for how close we are to claiming any team — incentivizes useful bonuses.
    let best = 0;
    for (const t of teams) {
      let progress = 0; let total = 0;
      for (const color of STONES) {
        const r = t.req[color] || 0;
        if (r > 0) {
          total += r;
          progress += Math.min(r, player.bonuses[color] || 0);
        }
      }
      if (total > 0) best = Math.max(best, progress / total);
    }
    return best;
  }

  // --- Action generators ---

  function legalGather3Combos(supply) {
    const available = STONES.filter(s => (supply[s] || 0) > 0);
    const combos = [];
    for (let i = 0; i < available.length; i++)
      for (let j = i + 1; j < available.length; j++)
        for (let k = j + 1; k < available.length; k++)
          combos.push([available[i], available[j], available[k]]);
    // also handle 1-2 if board has fewer than 3 colors available
    if (combos.length === 0) {
      if (available.length === 2) combos.push(available.slice());
      else if (available.length === 1) combos.push(available.slice());
    }
    return combos;
  }

  function legalGather2(supply) {
    return STONES.filter(s => (supply[s] || 0) >= 4);
  }

  function gatherUtility(player, opponent, gather, supply, teams) {
    // Score based on what these stones unlock.
    const sim = clone(player);
    for (const s of gather) sim.stones[s] = (sim.stones[s] || 0) + 1;

    // Bias toward stones we need for the best affordable card.
    let need = {};
    for (const color of STONES) need[color] = 0;
    // Scan visible cards via global bridge (set by Game)
    const cards = AI._visibleCards || [];
    for (const card of cards) {
      const ec = effectiveCost(player, card);
      // accumulate weighted need
      const w = card.prestige + 2;
      for (const c of STONES) {
        const cost = card.cost[c] || 0;
        const bonus = player.bonuses[c] || 0;
        const have = player.stones[c] || 0;
        const lack = Math.max(0, cost - bonus - have);
        need[c] += lack * w;
      }
    }
    let score = 0;
    for (const s of gather) score += need[s] || 0;
    // Penalize over-hoard
    if (totalStones(sim) > 9) score -= 6;
    if (totalStones(sim) > 10) score -= 100; // illegal
    // Slight encouragement for diversity
    const distinct = new Set(gather).size;
    score += distinct * 0.5;
    return score;
  }

  function clone(p) {
    return {
      stones: { ...p.stones },
      bonuses: { ...p.bonuses },
      cards: p.cards ? p.cards.slice() : [],
      reserved: p.reserved ? p.reserved.slice() : [],
      prestige: p.prestige
    };
  }

  // --- Decision ---

  function chooseAction(state, difficulty) {
    const me = state.players[1];
    const opp = state.players[0];
    AI._visibleCards = [
      ...state.board[1], ...state.board[2], ...state.board[3]
    ].filter(Boolean);

    const teams = state.teams;

    // 1) Buy best card we can afford (prefer high score)
    const buyOptions = [];
    for (const tier of [1,2,3]) {
      for (let i = 0; i < state.board[tier].length; i++) {
        const card = state.board[tier][i];
        if (!card) continue;
        const ec = effectiveCost(me, card);
        if (ec.canAfford) {
          buyOptions.push({
            type:'buy', tier, slot:i, card,
            score: cardScore(card, me, opp, difficulty)
          });
        }
      }
    }
    for (let i = 0; i < me.reserved.length; i++) {
      const card = me.reserved[i];
      const ec = effectiveCost(me, card);
      if (ec.canAfford) {
        buyOptions.push({
          type:'buy_reserved', index:i, card,
          score: cardScore(card, me, opp, difficulty) + 2
        });
      }
    }
    if (buyOptions.length) {
      buyOptions.sort((a,b) => b.score - a.score);
      // Easy AI sometimes makes worse decisions
      if (difficulty === 'easy' && Math.random() < 0.25 && buyOptions.length > 1) {
        return buyOptions[1];
      }
      return buyOptions[0];
    }

    // 2) Otherwise gather stones — pick best gather.
    // If hand is near the cap, we should avoid gathering and instead consider reserving/buying small.
    const handTotal = totalStones(me);
    const gather3 = handTotal >= MAX_HAND ? [] : legalGather3Combos(state.supply);
    const gather2 = handTotal >= MAX_HAND - 1 ? [] : legalGather2(state.supply);
    const gatherOptions = [];
    for (const combo of gather3) {
      gatherOptions.push({
        type:'gather', stones: combo,
        score: gatherUtility(me, opp, combo, state.supply, teams) + (combo.length === 3 ? 1 : 0)
      });
    }
    for (const s of gather2) {
      const combo = [s, s];
      gatherOptions.push({
        type:'gather', stones: combo,
        score: gatherUtility(me, opp, combo, state.supply, teams) + 0.5
      });
    }
    // Reserve a high-tier card for later if no good gathers
    const reserveOptions = [];
    if (me.reserved.length < MAX_RESERVE && (state.supply.reality > 0 || totalStones(me) < MAX_HAND)) {
      for (const tier of [3,2,1]) {
        for (let i = 0; i < state.board[tier].length; i++) {
          const card = state.board[tier][i];
          if (!card) continue;
          // Reserve cards we want but cannot afford yet
          const ec = effectiveCost(me, card);
          if (!ec.canAfford && card.prestige >= 2) {
            reserveOptions.push({
              type:'reserve', tier, slot:i, card,
              score: card.prestige * 3 + (tier === 3 ? 4 : 0)
            });
          }
        }
      }
    }

    const all = [...gatherOptions, ...reserveOptions].sort((a,b) => b.score - a.score);

    // Hard AI: more strategic, prefer reserves of T3 cards opponent could buy
    if (difficulty === 'hard') {
      // Try to deny opponent: if any t3 card is affordable to opp on next turn, reserve it
      for (const tier of [3]) {
        for (let i = 0; i < state.board[tier].length; i++) {
          const card = state.board[tier][i];
          if (!card) continue;
          const oppEc = effectiveCost(opp, card);
          if (oppEc.canAfford && me.reserved.length < MAX_RESERVE) {
            return { type:'reserve', tier, slot:i, card };
          }
        }
      }
    }

    if (all.length === 0) {
      // Fallback: take any single stone, or pass via reality wild
      const any = STONES.find(s => state.supply[s] > 0);
      if (any) return { type:'gather', stones: [any] };
      return { type:'pass' };
    }
    if (difficulty === 'easy' && Math.random() < 0.3 && all.length > 1) return all[1];
    return all[0];
  }

  return { chooseAction };
})();
