// Marvel Splendor — main game logic + UI rendering

(() => {
  'use strict';

  // ---------- State ----------
  const state = {
    started: false,
    difficulty: 'easy',
    animsOn: true,
    turn: 0,             // 0 = you, 1 = opponent
    supply: {},
    decks: {},           // tier -> array of cards
    board: { 1: [], 2: [], 3: [] }, // 4 face-up per tier
    teams: [],
    players: [
      makePlayer('You', '🦸'),
      makePlayer('Loki', '🦹')
    ],
    selection: { stones: [], buyTier: null, buySlot: null, buyReservedIdx: null, reserveTier: null, reserveSlot: null },
    busy: false,
    finalRound: false,
    finalRoundTriggeredBy: null,
    history: []
  };

  function makePlayer(name, avatar) {
    return {
      name, avatar,
      stones: { power:0, space:0, time:0, mind:0, soul:0, reality:0 },
      bonuses: { power:0, space:0, time:0, mind:0, soul:0 },
      cards: [],         // recruited cards
      reserved: [],      // reserved cards
      teams: [],
      prestige: 0
    };
  }

  // ---------- DOM ----------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // ---------- Init ----------
  function setupSplash() {
    $('#btn-start').addEventListener('click', startGame);
    $('#btn-rules').addEventListener('click', () => $('#rules').classList.add('active'));
    $('#btn-rules-close').addEventListener('click', () => $('#rules').classList.remove('active'));
    $('#btn-help').addEventListener('click', () => $('#rules').classList.add('active'));
    $('#btn-replay').addEventListener('click', () => {
      $('#endgame').classList.remove('active');
      $('#confetti').innerHTML = '';
      $('#splash').classList.add('active');
      $('#game').classList.remove('active');
    });
    $$('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.difficulty = btn.dataset.diff;
        const names = { easy: 'Loki', medium: 'Ultron', hard: 'Thanos' };
        const avatars = { easy: '🦹', medium: '🤖', hard: '👑' };
        state.players[1].name = names[state.difficulty];
        state.players[1].avatar = avatars[state.difficulty];
      });
    });

    $('#btn-cancel').addEventListener('click', () => { SFX.deselect(); SFX.haptics.tap(); cancelSelection(); });
    $('#btn-confirm').addEventListener('click', () => { SFX.haptics.confirm(); confirmSelection(); });
    $('#btn-reserved').addEventListener('click', () => { SFX.tap(); SFX.haptics.tap(); $('#reserved-drawer').classList.toggle('open'); });
    $('#btn-drawer-close').addEventListener('click', () => { SFX.deselect(); $('#reserved-drawer').classList.remove('open'); });
    $('#btn-menu').addEventListener('click', () => {
      if (confirm('Restart the saga?')) {
        $('#splash').classList.add('active');
        $('#game').classList.remove('active');
        $('#reserved-drawer').classList.remove('open');
      }
    });

    // Settings sheet
    const settingsSheet = $('#settings-sheet');
    $('#btn-settings').addEventListener('click', (e) => {
      e.stopPropagation();
      SFX.tap();
      settingsSheet.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!settingsSheet.contains(e.target) && e.target.id !== 'btn-settings') {
        settingsSheet.classList.remove('open');
      }
    });
    function bindSwitch(id, getVal, setVal) {
      const el = $('#' + id);
      const sync = () => el.classList.toggle('on', getVal());
      sync();
      const handler = () => {
        SFX.tap();
        setVal(!getVal());
        sync();
      };
      el.addEventListener('click', handler);
      el.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handler(); } });
    }
    bindSwitch('toggle-sfx', SFX.isSfxOn, SFX.setSfx);
    bindSwitch('toggle-haptics', SFX.isHapticsOn, SFX.setHaptics);
    bindSwitch('toggle-anims', () => state.animsOn, v => { state.animsOn = v; try { localStorage.setItem('splendor.anims', v ? '1':'0'); } catch(e){} });
    // Load anim pref
    try { const v = localStorage.getItem('splendor.anims'); if (v !== null) state.animsOn = (v === '1'); } catch (e) {}
    $('#toggle-anims').classList.toggle('on', state.animsOn);

    setupKeyboardShortcuts();
    setupTooltip();
    SFX.init();
  }

  // ---------- Keyboard shortcuts (desktop) ----------
  function setupKeyboardShortcuts() {
    const keyToStone = { '1': 'power', '2': 'space', '3': 'time', '4': 'mind', '5': 'soul' };
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in an input
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      // Ignore if a modal is up
      if ($('#rules').classList.contains('active') || $('#endgame').classList.contains('active')) {
        if (e.key === 'Escape') {
          $('#rules').classList.remove('active');
        }
        return;
      }
      // Splash: Enter starts the game
      if ($('#splash').classList.contains('active')) {
        if (e.key === 'Enter') { e.preventDefault(); startGame(); }
        return;
      }
      if (state.busy || state.turn !== 0) return;

      if (keyToStone[e.key]) {
        e.preventDefault();
        onSupplyClick(keyToStone[e.key]);
      } else if (e.key === 'Enter') {
        if (!$('#btn-confirm').disabled) {
          e.preventDefault();
          SFX.haptics.confirm();
          confirmSelection();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        SFX.deselect();
        cancelSelection();
        $('#reserved-drawer').classList.remove('open');
        $('#settings-sheet').classList.remove('open');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        SFX.tap();
        $('#reserved-drawer').classList.toggle('open');
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        $('#rules').classList.add('active');
      }
    });
  }

  // ---------- Hover tooltip (desktop) ----------
  let _tooltipEl = null;
  let _tooltipShowTimer = null;
  function setupTooltip() {
    // Only on devices with hover/fine pointer
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const board = $('#board');
    const drawer = $('#reserved-drawer');
    const teamsRow = $('#teams-row');

    const onEnter = (e) => {
      const cardEl = e.target.closest('.card[data-hero]');
      const teamEl = e.target.closest('.team');
      if (cardEl) {
        clearTimeout(_tooltipShowTimer);
        _tooltipShowTimer = setTimeout(() => showCardTooltip(cardEl), 220);
      } else if (teamEl) {
        clearTimeout(_tooltipShowTimer);
        _tooltipShowTimer = setTimeout(() => showTeamTooltip(teamEl), 220);
      }
    };
    const onLeave = (e) => {
      if (!e.target.closest('.card,.team')) return;
      clearTimeout(_tooltipShowTimer);
      hideTooltip();
    };
    const onMove = (e) => {
      if (_tooltipEl && _tooltipEl.classList.contains('visible')) {
        positionTooltip(e.clientX, e.clientY);
      }
    };

    [board, drawer, teamsRow].forEach(host => {
      host.addEventListener('mouseover', onEnter);
      host.addEventListener('mouseout', onLeave);
      host.addEventListener('mousemove', onMove);
    });
  }

  function ensureTooltipEl() {
    if (_tooltipEl) return _tooltipEl;
    _tooltipEl = document.createElement('div');
    _tooltipEl.className = 'card-tooltip';
    document.body.appendChild(_tooltipEl);
    return _tooltipEl;
  }

  function findCardByHeroName(name) {
    for (const t of [1,2,3]) {
      const c = CARDS[t].find(c => c.hero === name);
      if (c) return c;
    }
    return null;
  }

  function showCardTooltip(cardEl) {
    const heroName = cardEl.dataset.hero;
    const card = findCardByHeroName(heroName);
    if (!card) return;
    const meta = STONE_META[card.bonus];
    const me = state.players[0];
    const costHtml = STONES.filter(s => card.cost[s]).map(s => {
      const cost = card.cost[s];
      const bonus = me.bonuses[s] || 0;
      const have = me.stones[s] || 0;
      const need = Math.max(0, cost - bonus);
      const unmet = need > have;
      return `<span class="tt-pip" data-stone="${s}" style="${unmet?'opacity:.5':''}">${cost}</span>`;
    }).join('');

    const tt = ensureTooltipEl();
    tt.innerHTML = `
      <div class="tt-head">
        <span class="tt-emoji">${card.emoji}</span>
        <span>${card.hero}</span>
      </div>
      <div class="tt-row"><span>Tier</span><b>${card.tier}</b></div>
      <div class="tt-row"><span>Prestige</span><b>★ ${card.prestige}</b></div>
      <div class="tt-row"><span>Bonus</span>
        <span class="tt-bonus" style="color:${meta.color}">${meta.symbol} ${meta.name}</span>
      </div>
      <div class="tt-cost">${costHtml || '<span style="color:var(--ink-dim)">No cost</span>'}</div>
    `;
    const r = cardEl.getBoundingClientRect();
    positionTooltip(r.left + r.width/2, r.top);
    requestAnimationFrame(() => tt.classList.add('visible'));
  }

  function showTeamTooltip(teamEl) {
    const teamName = teamEl.querySelector('.team-name')?.textContent;
    const team = state.teams.find(t => t.name === teamName);
    if (!team) return;
    const me = state.players[0];
    const reqHtml = STONES.filter(s => team.req[s]).map(s => {
      const need = team.req[s];
      const have = me.bonuses[s] || 0;
      const ok = have >= need;
      return `<span class="tt-pip" data-stone="${s}" style="${ok?'box-shadow:0 0 8px currentColor':'opacity:.6'}">${have}/${need}</span>`;
    }).join('');
    const tt = ensureTooltipEl();
    tt.innerHTML = `
      <div class="tt-head">
        <span class="tt-emoji">${team.emoji}</span>
        <span>${team.name}</span>
      </div>
      <div class="tt-row"><span>Joins for</span><b>★ ${team.prestige}</b></div>
      <div class="tt-row" style="display:block; margin-top:4px; color:var(--ink-dim); font-size:11px;">
        Required hero bonuses:
      </div>
      <div class="tt-cost">${reqHtml}</div>
    `;
    const r = teamEl.getBoundingClientRect();
    positionTooltip(r.left + r.width/2, r.bottom + 8);
    requestAnimationFrame(() => tt.classList.add('visible'));
  }

  function positionTooltip(x, y) {
    if (!_tooltipEl) return;
    const tt = _tooltipEl;
    const ttRect = tt.getBoundingClientRect();
    const w = ttRect.width || 220;
    const h = ttRect.height || 140;
    let left = x - w/2;
    let top = y - h - 14;
    if (top < 8) top = y + 18;
    if (left < 8) left = 8;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    tt.style.left = left + 'px';
    tt.style.top = top + 'px';
  }

  function hideTooltip() {
    if (_tooltipEl) _tooltipEl.classList.remove('visible');
  }

  function startGame() {
    // reset state
    state.started = true;
    state.turn = 0;
    state.busy = false;
    state.finalRound = false;
    state.finalRoundTriggeredBy = null;
    state.players[0] = makePlayer(state.players[0].name, state.players[0].avatar);
    state.players[1] = makePlayer(state.players[1].name, state.players[1].avatar);
    state.selection = { stones: [], buyTier: null, buySlot: null, buyReservedIdx: null, reserveTier: null, reserveSlot: null };

    // Token supply (2-player counts)
    state.supply = { power:4, space:4, time:4, mind:4, soul:4, reality:5 };

    // Decks: shuffle copies
    state.decks = {
      1: shuffle(CARDS[1].slice()),
      2: shuffle(CARDS[2].slice()),
      3: shuffle(CARDS[3].slice())
    };

    // Deal 4 face-up per tier
    state.board = { 1: [], 2: [], 3: [] };
    for (const t of [1,2,3]) {
      for (let i = 0; i < 4; i++) state.board[t].push(state.decks[t].shift() || null);
    }

    // 3 random teams (n+1 in real splendor, with 2 players use 3)
    state.teams = shuffle(TEAMS.slice()).slice(0, 3);

    $('#splash').classList.remove('active');
    $('#endgame').classList.remove('active');
    $('#game').classList.add('active');

    renderAll();
    updateSelectionInfo();
    setActiveTurnIndicator();
    showToast('The saga begins!', 'success');
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------- Rendering ----------

  function renderAll() {
    renderSupply();
    renderBoard();
    renderTeams();
    renderPlayer(0);
    renderPlayer(1);
    renderReservedDrawer();
    setActiveTurnIndicator();
    refreshAffordability();
  }

  function renderSupply() {
    const supply = $('#supply');
    supply.innerHTML = '';
    const order = ['power','space','time','mind','soul','reality'];
    const keyHints = { power:'1', space:'2', time:'3', mind:'4', soul:'5', reality:'' };
    for (const stone of order) {
      const count = state.supply[stone] || 0;
      const tok = document.createElement('button');
      tok.className = 'supply-token';
      tok.dataset.stone = stone;
      tok.id = `supply-${stone}`;
      if (count <= 0) tok.classList.add('empty');
      tok.title = STONE_META[stone].name + (keyHints[stone] ? ` (key ${keyHints[stone]})` : '');
      const hint = keyHints[stone] ? `<span class="kbd-hint">${keyHints[stone]}</span>` : '';
      tok.innerHTML = `
        <span class="tk-symbol">${STONE_META[stone].symbol}</span>
        <span class="tk-count">${count}</span>
        ${hint}
      `;
      tok.addEventListener('click', () => onSupplyClick(stone));
      supply.appendChild(tok);
    }
  }

  function renderBoard(opts = {}) {
    const flipSet = new Set((opts.flipSlots || []).map(s => `${s.tier}:${s.slot}`));
    for (const tier of [1,2,3]) {
      const cont = $(`#tier-${tier}`);
      cont.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const card = state.board[tier][i];
        const el = card ? renderCard(card, { tier, slot: i }) : renderEmptyCard();
        if (card && state.animsOn && flipSet.has(`${tier}:${i}`)) el.classList.add('flipping-in');
        cont.appendChild(el);
      }
      const deck = $(`#deck-${tier}`);
      const remaining = state.decks[tier].length;
      deck.innerHTML = `<span class="deck-count">${remaining}</span>`;
      deck.classList.toggle('empty', remaining === 0);
      deck.onclick = () => onDeckClick(tier);
    }
  }

  function renderCard(card, ctx) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.bonus = card.bonus;
    el.dataset.hero = card.hero;
    if (ctx) {
      el.dataset.tier = ctx.tier;
      el.dataset.slot = ctx.slot;
    }
    if (ctx?.reserved) el.dataset.reserved = '1';

    const meta = STONE_META[card.bonus];
    const me = state.players[0];

    const costPips = STONES.map(stone => {
      const cost = card.cost[stone];
      if (!cost) return '';
      const bonus = me.bonuses[stone] || 0;
      const have = me.stones[stone] || 0;
      const stillNeed = Math.max(0, cost - bonus);
      const unmet = stillNeed > have;
      return `<span class="cost-pip ${unmet ? 'unmet' : ''}" data-stone="${stone}">${cost}</span>`;
    }).join('');

    el.innerHTML = `
      ${ctx?.reserved ? '<span class="reserved-badge">RESERVED</span>' : ''}
      <div class="card-top">
        <div class="card-bonus" data-stone="${card.bonus}">${meta.symbol}</div>
        <div class="card-prestige ${card.prestige === 0 ? 'zero' : ''}">${card.prestige}</div>
      </div>
      <div class="card-art">${card.emoji}</div>
      <div class="card-name">${card.hero}</div>
      <div class="card-cost">${costPips}</div>
    `;

    el.addEventListener('click', () => onCardClick(card, ctx));
    return el;
  }

  function renderEmptyCard() {
    const el = document.createElement('div');
    el.className = 'card card-empty';
    return el;
  }

  function renderTeams() {
    const row = $('#teams-row');
    row.innerHTML = '';
    if (!state.teams.length) {
      row.style.display = 'none';
      return;
    }
    row.style.display = 'flex';
    for (const team of state.teams) {
      const el = document.createElement('div');
      el.className = 'team';
      const me = state.players[0];
      const claimable = STONES.every(s => (me.bonuses[s] || 0) >= (team.req[s] || 0));
      if (claimable) el.classList.add('claimable');
      const reqHtml = STONES.filter(s => team.req[s])
        .map(s => `<span style="background:${STONE_META[s].color}">${team.req[s]}</span>`)
        .join('');
      el.innerHTML = `
        <span class="team-prestige">${team.prestige}</span>
        <div class="team-emoji">${team.emoji}</div>
        <div class="team-name">${team.name}</div>
        <div class="team-req">${reqHtml}</div>
      `;
      row.appendChild(el);
    }
  }

  function renderPlayer(idx) {
    const p = state.players[idx];
    const isYou = idx === 0;
    const prefix = isYou ? 'you' : 'opp';
    $(`#${prefix}-prestige`).textContent = p.prestige;
    $(`#${prefix}-cards`).textContent = `${p.cards.length} card${p.cards.length===1?'':'s'}`;
    $(`#${prefix}-reserved`).textContent = `${p.reserved.length} reserved`;
    if (!isYou) {
      $('#opp-name').textContent = p.name;
      $('#opp-avatar').textContent = p.avatar;
    } else {
      $('#you-reserved-count').textContent = p.reserved.length;
    }

    const cont = $(`#${prefix}-resources`);
    cont.innerHTML = '';
    const order = ['power','space','time','mind','soul','reality'];
    for (const stone of order) {
      const meta = STONE_META[stone];
      const stones = p.stones[stone] || 0;
      const bonus = stone === 'reality' ? null : (p.bonuses[stone] || 0);
      const div = document.createElement('div');
      div.className = 'resource';
      div.dataset.stone = stone;
      div.id = `res-${prefix}-${stone}`;
      div.innerHTML = `
        <span class="res-symbol">${meta.symbol}</span>
        <span class="res-counts">
          <b>${stones}</b>${bonus !== null ? `<span class="res-bonus">+${bonus}</span>` : ''}
        </span>
      `;
      cont.appendChild(div);
    }
  }

  function renderReservedDrawer() {
    const list = $('#reserved-list');
    list.innerHTML = '';
    const me = state.players[0];
    if (me.reserved.length === 0) {
      list.innerHTML = '<div class="drawer-empty">No reserved heroes yet. Reserve a card to gain a Reality (wild) stone.</div>';
      return;
    }
    me.reserved.forEach((card, i) => {
      list.appendChild(renderCard(card, { reserved: true, reservedIdx: i }));
    });
  }

  function setActiveTurnIndicator() {
    const yu = $('#panel-you'), op = $('#panel-opponent');
    yu.classList.toggle('active-turn', state.turn === 0);
    op.classList.toggle('active-turn', state.turn === 1);
  }

  function refreshAffordability() {
    if (state.turn !== 0) {
      $$('.card.affordable').forEach(c => c.classList.remove('affordable'));
      return;
    }
    const me = state.players[0];
    $$('#board .card[data-tier]').forEach(el => {
      const tier = +el.dataset.tier; const slot = +el.dataset.slot;
      const card = state.board[tier]?.[slot];
      if (!card) { el.classList.remove('affordable'); return; }
      el.classList.toggle('affordable', canAfford(me, card));
    });
    $$('#reserved-list .card').forEach((el, idx) => {
      const card = me.reserved[idx];
      if (!card) return;
      el.classList.toggle('affordable', canAfford(me, card));
    });
  }

  // ---------- Costs / affordability ----------
  function canAfford(player, card) {
    let wildNeeded = 0;
    for (const s of STONES) {
      const cost = card.cost[s] || 0;
      const bonus = player.bonuses[s] || 0;
      const have = player.stones[s] || 0;
      const need = Math.max(0, cost - bonus);
      if (need > have) wildNeeded += need - have;
    }
    return wildNeeded <= (player.stones.reality || 0);
  }

  function payForCard(player, card) {
    // Returns map of stones spent -> count, modifying player.stones
    const spent = { power:0, space:0, time:0, mind:0, soul:0, reality:0 };
    let wildNeeded = 0;
    for (const s of STONES) {
      const cost = card.cost[s] || 0;
      const bonus = player.bonuses[s] || 0;
      const need = Math.max(0, cost - bonus);
      const fromColor = Math.min(player.stones[s], need);
      player.stones[s] -= fromColor;
      spent[s] = fromColor;
      if (need - fromColor > 0) wildNeeded += need - fromColor;
    }
    if (wildNeeded > 0) {
      player.stones.reality -= wildNeeded;
      spent.reality = wildNeeded;
    }
    return spent;
  }

  // ---------- Player actions (your turn) ----------
  function onSupplyClick(stone) {
    if (state.turn !== 0 || state.busy) return;

    // If we have a buy/reserve selection, ignore (must cancel first)
    if (state.selection.buyTier !== null || state.selection.buyReservedIdx !== null || state.selection.reserveTier !== null) {
      cancelSelection();
    }

    const sel = state.selection.stones;
    if (stone === 'reality') {
      SFX.error(); SFX.haptics.error();
      showToast("Reality (wild) stones can only be gained by reserving a hero card.", 'error');
      return;
    }
    if ((state.supply[stone] || 0) === 0) {
      SFX.error(); SFX.haptics.error();
      showToast('No more of those stones in the supply.', 'error');
      return;
    }

    // Selection rules: you can pick up to 3 different OR 2 of the same.
    const counts = {};
    for (const s of sel) counts[s] = (counts[s] || 0) + 1;

    // If clicking same stone already at 1: try to make pair
    if (counts[stone]) {
      if (sel.length !== 1) {
        SFX.error(); SFX.haptics.error();
        showToast('You can take 3 different OR 2 of the same.', 'error');
        return;
      }
      if (state.supply[stone] < 4) {
        SFX.error(); SFX.haptics.error();
        showToast('Need 4+ stones in supply to take 2 of the same.', 'error');
        return;
      }
      sel.push(stone);
    } else {
      // Different stone
      if (sel.length >= 3) {
        SFX.error(); SFX.haptics.error();
        showToast('Maximum of 3 different stones.', 'error');
        return;
      }
      // If we already have a pair, cannot add more
      if (Object.values(counts).some(v => v >= 2)) {
        SFX.error(); SFX.haptics.error();
        showToast('You already chose a pair — you cannot add more.', 'error');
        return;
      }
      sel.push(stone);
    }

    // Hand-size pre-check
    const me = state.players[0];
    const totalAfter = totalStonesOf(me) + sel.length;
    if (totalAfter > MAX_HAND) {
      sel.pop();
      SFX.error(); SFX.haptics.error();
      showToast(`Cannot exceed ${MAX_HAND} stones in hand.`, 'error');
      return;
    }

    SFX.pickToken(stone); SFX.haptics.tap();
    refreshSelectionUI();
  }

  function totalStonesOf(p) {
    return STONES.concat(['reality']).reduce((s, c) => s + (p.stones[c] || 0), 0);
  }

  function onCardClick(card, ctx) {
    if (state.turn !== 0 || state.busy) return;

    // If user has stones selected, can't mix actions
    if (state.selection.stones.length > 0) cancelSelection();

    const me = state.players[0];

    // Reserved card: try to buy
    if (ctx?.reserved) {
      if (!canAfford(me, card)) {
        SFX.error(); SFX.haptics.error();
        showToast('Not enough stones to recruit this hero.', 'error');
        return;
      }
      state.selection.buyReservedIdx = ctx.reservedIdx;
      state.selection.buyTier = null; state.selection.buySlot = null;
      SFX.tap(); SFX.haptics.tap();
      refreshSelectionUI();
      return;
    }

    // Board card: long press = reserve, single tap = buy if affordable, else offer reserve
    // For simplicity on mobile: tap once selects to buy if affordable; otherwise selects to reserve.
    const affordable = canAfford(me, card);
    if (affordable) {
      // Toggle: if already selected to buy, confirm? We require explicit confirm.
      state.selection.buyTier = ctx.tier;
      state.selection.buySlot = ctx.slot;
      state.selection.reserveTier = null;
      state.selection.reserveSlot = null;
    } else {
      if (me.reserved.length >= MAX_RESERVE) {
        SFX.error(); SFX.haptics.error();
        showToast('Reserve full (3 cards max).', 'error');
        return;
      }
      state.selection.reserveTier = ctx.tier;
      state.selection.reserveSlot = ctx.slot;
      state.selection.buyTier = null;
      state.selection.buySlot = null;
    }
    SFX.tap(); SFX.haptics.tap();
    refreshSelectionUI();
  }

  function onDeckClick(tier) {
    if (state.turn !== 0 || state.busy) return;
    if (state.decks[tier].length === 0) {
      SFX.error(); SFX.haptics.error();
      showToast('Deck is empty.', 'error');
      return;
    }
    if (state.selection.stones.length > 0) cancelSelection();
    const me = state.players[0];
    if (me.reserved.length >= MAX_RESERVE) {
      SFX.error(); SFX.haptics.error();
      showToast('Reserve full (3 cards max).', 'error');
      return;
    }
    state.selection.reserveTier = tier;
    state.selection.reserveSlot = -1; // -1 = top of deck
    state.selection.buyTier = null;
    state.selection.buySlot = null;
    refreshSelectionUI();
  }

  function refreshSelectionUI() {
    // Clear all visual selections
    $$('.supply-token.selected').forEach(el => el.classList.remove('selected'));
    $$('.supply-token .selection-bubble').forEach(el => el.remove());
    $$('.card.selected').forEach(el => el.classList.remove('selected'));

    const sel = state.selection.stones;
    const counts = {};
    for (const s of sel) counts[s] = (counts[s] || 0) + 1;
    for (const s of Object.keys(counts)) {
      const el = $(`#supply-${s}`);
      if (el) {
        el.classList.add('selected');
        if (counts[s] > 1) {
          const b = document.createElement('span');
          b.className = 'selection-bubble';
          b.textContent = counts[s];
          el.appendChild(b);
        }
      }
    }

    if (state.selection.buyTier !== null) {
      const el = document.querySelector(`#tier-${state.selection.buyTier} .card[data-slot="${state.selection.buySlot}"]`);
      if (el) el.classList.add('selected');
    }
    if (state.selection.buyReservedIdx !== null) {
      const list = $$('#reserved-list .card');
      list[state.selection.buyReservedIdx]?.classList.add('selected');
    }
    if (state.selection.reserveTier !== null) {
      if (state.selection.reserveSlot === -1) {
        $(`#deck-${state.selection.reserveTier}`).classList.add('selected');
      } else {
        const el = document.querySelector(`#tier-${state.selection.reserveTier} .card[data-slot="${state.selection.reserveSlot}"]`);
        if (el) el.classList.add('selected');
      }
    }

    updateSelectionInfo();
    refreshAffordability();
  }

  function updateSelectionInfo() {
    const info = $('#selection-info');
    const btn = $('#btn-confirm');
    const cancel = $('#btn-cancel');
    const sel = state.selection;

    if (state.turn !== 0) {
      info.textContent = `${state.players[1].name} is plotting...`;
      btn.disabled = true; cancel.disabled = true;
      return;
    }

    if (sel.stones.length > 0) {
      const counts = {};
      for (const s of sel.stones) counts[s] = (counts[s] || 0) + 1;
      const valid = isValidGather(sel.stones);
      const labels = sel.stones.map(s => STONE_META[s].name).join(', ');
      info.textContent = valid.ok ? `Gather: ${labels}` : valid.msg;
      btn.disabled = !valid.ok;
      btn.textContent = 'Take Stones';
      cancel.disabled = false;
    } else if (sel.buyTier !== null || sel.buyReservedIdx !== null) {
      const card = sel.buyReservedIdx !== null
        ? state.players[0].reserved[sel.buyReservedIdx]
        : state.board[sel.buyTier][sel.buySlot];
      info.textContent = `Recruit ${card.hero} (${card.prestige}★)`;
      btn.disabled = false;
      btn.textContent = 'Recruit';
      cancel.disabled = false;
    } else if (sel.reserveTier !== null) {
      const card = sel.reserveSlot === -1 ? null : state.board[sel.reserveTier][sel.reserveSlot];
      info.textContent = card
        ? `Reserve ${card.hero} (gain Reality stone)`
        : `Reserve unknown Tier ${sel.reserveTier} card (gain Reality stone)`;
      btn.disabled = false;
      btn.textContent = 'Reserve';
      cancel.disabled = false;
    } else {
      info.textContent = 'Tap stones to gather, or tap a hero to recruit / reserve';
      btn.disabled = true;
      cancel.disabled = true;
    }
  }

  function isValidGather(stones) {
    if (stones.length === 0) return { ok: false, msg: 'Pick stones to gather.' };
    const counts = {};
    for (const s of stones) counts[s] = (counts[s] || 0) + 1;
    const distinct = Object.keys(counts).length;
    const hasPair = Object.values(counts).some(v => v >= 2);

    if (hasPair) {
      if (stones.length !== 2) return { ok: false, msg: 'Pair: take exactly 2 of the same.' };
      const stone = Object.keys(counts).find(k => counts[k] === 2);
      if (state.supply[stone] < 4) return { ok: false, msg: 'Pair requires 4+ in supply.' };
      return { ok: true };
    }
    if (distinct !== stones.length) return { ok: false, msg: 'Mixed picks not allowed.' };
    if (stones.length > 3) return { ok: false, msg: 'Max 3 stones.' };
    if (stones.length < 3) {
      // Allow taking fewer than 3 only if not enough distinct stones in supply
      const available = STONES.filter(s => (state.supply[s] || 0) > 0).length;
      if (stones.length < Math.min(3, available)) {
        return { ok: false, msg: `Pick ${Math.min(3, available)} different stones.` };
      }
    }
    return { ok: true };
  }

  function cancelSelection() {
    state.selection = { stones: [], buyTier: null, buySlot: null, buyReservedIdx: null, reserveTier: null, reserveSlot: null };
    refreshSelectionUI();
  }

  // ---------- Confirm action ----------
  async function confirmSelection() {
    if (state.busy) return;
    const sel = state.selection;
    state.busy = true;

    try {
      if (sel.stones.length > 0) {
        await actionGatherStones(0, sel.stones);
      } else if (sel.buyTier !== null) {
        await actionBuyBoardCard(0, sel.buyTier, sel.buySlot);
      } else if (sel.buyReservedIdx !== null) {
        await actionBuyReservedCard(0, sel.buyReservedIdx);
      } else if (sel.reserveTier !== null) {
        await actionReserveCard(0, sel.reserveTier, sel.reserveSlot);
      }

      state.selection = { stones: [], buyTier: null, buySlot: null, buyReservedIdx: null, reserveTier: null, reserveSlot: null };
      refreshSelectionUI();

      // Claim teams (auto)
      await claimEligibleTeams(0);

      // Check end
      if (checkEndOfGame()) {
        state.busy = false;
        return;
      }

      // Pass to AI
      state.turn = 1;
      setActiveTurnIndicator();
      updateSelectionInfo();
      await sleep(700);
      await runAITurn();
    } catch (e) {
      console.error(e);
      showToast('Action failed: ' + e.message, 'error');
    }
    state.busy = false;
  }

  // ---------- Actions ----------
  async function actionGatherStones(playerIdx, stones) {
    const player = state.players[playerIdx];
    for (const s of stones) {
      state.supply[s]--;
      player.stones[s] = (player.stones[s] || 0) + 1;
    }
    if (stones.length >= 2) SFX.shimmer();
    else if (stones.length === 1) SFX.pickToken(stones[0]);
    if (playerIdx === 0) SFX.haptics.success();
    await animateGather(playerIdx, stones);
    renderSupply();
    renderPlayer(playerIdx);
    showToast(`${player.name} gathered ${stones.map(s => STONE_META[s].symbol).join(' ')}`);
  }

  async function actionBuyBoardCard(playerIdx, tier, slot) {
    const player = state.players[playerIdx];
    const card = state.board[tier][slot];
    if (!card) throw new Error('No card here');
    const spent = payForCard(player, card);
    // Refund spent stones to supply
    for (const s of Object.keys(spent)) state.supply[s] += spent[s];

    // Card to player
    player.cards.push(card);
    player.bonuses[card.bonus] = (player.bonuses[card.bonus] || 0) + 1;
    player.prestige += card.prestige;

    // Refill from deck
    state.board[tier][slot] = state.decks[tier].shift() || null;

    SFX.recruit();
    if (playerIdx === 0) SFX.haptics.success();
    await animateBuy(playerIdx, { tier, slot }, card);
    renderSupply();
    renderBoard({ flipSlots: [{ tier, slot }] });
    renderPlayer(playerIdx);
    renderTeams();
    showToast(`${player.name} recruited ${card.hero}!`, 'success');
  }

  async function actionBuyReservedCard(playerIdx, idx) {
    const player = state.players[playerIdx];
    const card = player.reserved[idx];
    if (!card) throw new Error('No reserved card');
    const spent = payForCard(player, card);
    for (const s of Object.keys(spent)) state.supply[s] += spent[s];
    player.reserved.splice(idx, 1);
    player.cards.push(card);
    player.bonuses[card.bonus] = (player.bonuses[card.bonus] || 0) + 1;
    player.prestige += card.prestige;

    SFX.recruit();
    if (playerIdx === 0) SFX.haptics.success();
    await animateBuy(playerIdx, { reserved: true, idx }, card);
    renderSupply();
    renderPlayer(playerIdx);
    renderReservedDrawer();
    renderTeams();
    showToast(`${player.name} recruited ${card.hero}!`, 'success');
  }

  async function actionReserveCard(playerIdx, tier, slot) {
    const player = state.players[playerIdx];
    let card;
    if (slot === -1) {
      card = state.decks[tier].shift();
      if (!card) throw new Error('Deck empty');
    } else {
      card = state.board[tier][slot];
      if (!card) throw new Error('No card');
      state.board[tier][slot] = state.decks[tier].shift() || null;
    }
    player.reserved.push(card);
    // Gain reality stone if available and within hand size
    if (state.supply.reality > 0 && totalStonesOf(player) < MAX_HAND) {
      state.supply.reality--;
      player.stones.reality = (player.stones.reality || 0) + 1;
      await animateGather(playerIdx, ['reality']);
    }
    SFX.reserve();
    if (playerIdx === 0) SFX.haptics.success();
    await animateReserve(playerIdx, { tier, slot }, card);
    renderSupply();
    renderBoard(slot >= 0 ? { flipSlots: [{ tier, slot }] } : {});
    renderPlayer(playerIdx);
    renderReservedDrawer();
    showToast(`${player.name} reserved a ${slot === -1 ? 'Tier ' + tier : ''} hero`, 'success');
  }

  async function claimEligibleTeams(playerIdx) {
    const player = state.players[playerIdx];
    // In standard rules a player can claim at most one team per turn.
    let claimed = null;
    for (let i = 0; i < state.teams.length; i++) {
      const t = state.teams[i];
      if (STONES.every(s => (player.bonuses[s] || 0) >= (t.req[s] || 0))) {
        claimed = { team: t, idx: i };
        break;
      }
    }
    if (claimed) {
      player.teams.push(claimed.team);
      player.prestige += claimed.team.prestige;
      state.teams.splice(claimed.idx, 1);
      SFX.teamClaim();
      if (playerIdx === 0) SFX.haptics.victory();
      await animateTeamClaim(playerIdx, claimed.team);
      renderTeams();
      renderPlayer(playerIdx);
      showToast(`${claimed.team.name} joins ${player.name}! +${claimed.team.prestige}★`, 'success');
    }
  }

  // ---------- AI turn ----------
  async function runAITurn() {
    state.busy = true;
    const action = AI.chooseAction(state, state.difficulty);

    if (!action || action.type === 'pass') {
      showToast(`${state.players[1].name} passes`);
    } else if (action.type === 'gather') {
      // ensure legality / hand size
      const me = state.players[1];
      const stones = action.stones.slice(0, Math.max(0, MAX_HAND - totalStonesOf(me)));
      if (stones.length > 0) await actionGatherStones(1, stones);
    } else if (action.type === 'buy') {
      await actionBuyBoardCard(1, action.tier, action.slot);
    } else if (action.type === 'buy_reserved') {
      await actionBuyReservedCard(1, action.index);
    } else if (action.type === 'reserve') {
      await actionReserveCard(1, action.tier, action.slot);
    }

    await claimEligibleTeams(1);

    if (checkEndOfGame()) {
      state.busy = false;
      return;
    }

    state.turn = 0;
    setActiveTurnIndicator();
    updateSelectionInfo();
    SFX.turnChime();
    SFX.haptics.tap();
    state.busy = false;
  }

  // ---------- Win check ----------
  function checkEndOfGame() {
    // Trigger final round when someone reaches 15 prestige.
    // The other player gets one more turn to tie or surpass (only if they haven't yet played the same number of rounds).
    const p0 = state.players[0], p1 = state.players[1];
    if (!state.finalRound) {
      if (p0.prestige >= VICTORY_PRESTIGE || p1.prestige >= VICTORY_PRESTIGE) {
        state.finalRound = true;
        state.finalRoundTriggeredBy = state.turn; // current player just played
        // Game ends after the second player completes their turn parity
        // For simplicity: if turn 0 just played and reached 15, opp gets one more turn.
        // If turn 1 just played, it's now turn 0 again — the first to 15 means immediate end if turn 1 finishes after turn 0 already played.
        // With 2 players we use simple rule: end immediately at the conclusion of round (when both played same # of turns).
      }
    }
    if (state.finalRound) {
      // End if both have had equal turns. We track that by: turn 1 just completed AND finalRound was triggered earlier
      const triggeredBy = state.finalRoundTriggeredBy;
      // If trigger was by player 0 (you) and turn just played was 1 (opp), end now.
      // If trigger was by player 1 (opp) and turn just played was 1, then you get one more turn. End after turn 0 plays again.
      if (triggeredBy === 0 && state.turn === 1) {
        endGame();
        return true;
      }
      if (triggeredBy === 1) {
        // Opp just hit 15 on its turn (state.turn === 1). Now you get one more turn. End after turn 0 plays.
        // We mark a flag to know "next player-0 completion ends game"
        if (state.turn === 0) {
          // means we just finished player 0's turn, end now
          endGame();
          return true;
        }
      }
    }
    return false;
  }

  function endGame() {
    const p0 = state.players[0], p1 = state.players[1];
    // Tiebreaker: fewer recruited cards wins
    let winnerIdx;
    if (p0.prestige > p1.prestige) winnerIdx = 0;
    else if (p1.prestige > p0.prestige) winnerIdx = 1;
    else if (p0.cards.length < p1.cards.length) winnerIdx = 0;
    else if (p1.cards.length < p0.cards.length) winnerIdx = 1;
    else winnerIdx = -1;

    const title = $('#endgame-title');
    const sub = $('#endgame-sub');
    const stats = $('#endgame-stats');

    if (winnerIdx === 0) {
      title.textContent = 'VICTORY!';
      title.style.background = 'linear-gradient(180deg, #ffe27c 0%, #d99c2b 100%)';
      title.style.webkitBackgroundClip = 'text';
      title.style.backgroundClip = 'text';
      sub.textContent = `You triumphed over ${p1.name}.`;
      launchConfetti();
      SFX.victory();
      SFX.haptics.victory();
    } else if (winnerIdx === 1) {
      title.textContent = 'DEFEAT';
      title.style.background = 'linear-gradient(180deg, #ff6464 0%, #800 100%)';
      title.style.webkitBackgroundClip = 'text';
      title.style.backgroundClip = 'text';
      sub.textContent = `${p1.name} achieved cosmic dominance.`;
      SFX.defeat();
      SFX.haptics.error();
    } else {
      title.textContent = 'STALEMATE';
      sub.textContent = 'A balance of cosmic power.';
      SFX.turnChime();
    }

    stats.innerHTML = `
      <div class="row"><span>Your prestige</span><strong>★ ${p0.prestige}</strong></div>
      <div class="row"><span>Your heroes</span><strong>${p0.cards.length}</strong></div>
      <div class="row"><span>${p1.name} prestige</span><strong>★ ${p1.prestige}</strong></div>
      <div class="row"><span>${p1.name} heroes</span><strong>${p1.cards.length}</strong></div>
    `;
    $('#endgame').classList.add('active');
  }

  // ---------- Animations ----------
  function spawnParticle(stone, x, y) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.dataset.stone = stone;
    p.style.left = (x - 3) + 'px';
    p.style.top = (y - 3) + 'px';
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 18;
    p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    $('#fx-layer').appendChild(p);
    setTimeout(() => p.remove(), 700);
  }

  async function animateGather(playerIdx, stones) {
    const fxLayer = $('#fx-layer');
    const target = playerIdx === 0 ? $('#panel-you') : $('#panel-opponent');
    const targetRect = target.getBoundingClientRect();

    if (!state.animsOn) {
      // skip animation, just bump the resources
      for (const s of stones) {
        const prefix = playerIdx === 0 ? 'you' : 'opp';
        const resEl = document.getElementById(`res-${prefix}-${s}`);
        if (resEl) { resEl.classList.remove('bumped'); void resEl.offsetWidth; resEl.classList.add('bumped'); }
      }
      return;
    }

    const promises = [];
    for (let i = 0; i < stones.length; i++) {
      const stone = stones[i];
      const src = $(`#supply-${stone}`);
      if (!src) continue;
      const sRect = src.getBoundingClientRect();
      const fly = document.createElement('div');
      fly.className = 'fly-token';
      fly.dataset.stone = stone;
      fly.textContent = STONE_META[stone].symbol;
      fly.style.left = (sRect.left + sRect.width/2 - 18) + 'px';
      fly.style.top = (sRect.top + sRect.height/2 - 18) + 'px';
      fly.style.transition = 'transform .55s cubic-bezier(.4,1.6,.4,1), opacity .5s ease';
      fxLayer.appendChild(fly);

      const dx = (targetRect.left + targetRect.width/2) - (sRect.left + sRect.width/2);
      const dy = (targetRect.top + targetRect.height/2) - (sRect.top + sRect.height/2);

      promises.push(new Promise(resolve => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            fly.style.transform = `translate(${dx}px, ${dy}px) scale(0.6)`;
            fly.style.opacity = '0.2';
          }, i * 80);
          // Spawn trailing particles every ~70ms during flight
          let particleTimer = null;
          const startAt = 50 + i * 80;
          setTimeout(() => {
            particleTimer = setInterval(() => {
              const r = fly.getBoundingClientRect();
              spawnParticle(stone, r.left + r.width/2, r.top + r.height/2);
            }, 60);
          }, startAt);
          setTimeout(() => {
            if (particleTimer) clearInterval(particleTimer);
            fly.remove();
            // bump the resource
            const prefix = playerIdx === 0 ? 'you' : 'opp';
            const resEl = document.getElementById(`res-${prefix}-${stone}`);
            if (resEl) {
              resEl.classList.remove('bumped');
              void resEl.offsetWidth;
              resEl.classList.add('bumped');
            }
            resolve();
          }, 600 + i * 80);
        });
      }));
    }
    await Promise.all(promises);
  }

  async function animateBuy(playerIdx, src, card) {
    // Briefly flash card on board into the player area
    const fxLayer = $('#fx-layer');
    let srcEl;
    if (src.reserved) {
      // From drawer or just bonus area
      srcEl = $(`#${playerIdx === 0 ? 'panel-you' : 'panel-opponent'}`);
    } else {
      srcEl = document.querySelector(`#tier-${src.tier} .card[data-slot="${src.slot}"]`);
    }
    if (!srcEl) return;
    const sRect = srcEl.getBoundingClientRect();
    const target = playerIdx === 0 ? $(`#res-you-${card.bonus}`) : $(`#res-opp-${card.bonus}`);
    if (!target) return;
    const tRect = target.getBoundingClientRect();
    const burstColor = STONE_META[card.bonus]?.color || '#ffd400';

    if (!state.animsOn) {
      // skip flight; just fire a brief burst
      fireHeroBurst(sRect.left + sRect.width/2, sRect.top + sRect.height/2, burstColor);
      target.classList.remove('bumped'); void target.offsetWidth; target.classList.add('bumped');
      return;
    }

    // Hero entrance burst at the card's origin position
    fireHeroBurst(sRect.left + sRect.width/2, sRect.top + sRect.height/2, burstColor);

    const ghost = document.createElement('div');
    ghost.className = 'fly-card';
    ghost.style.width = sRect.width + 'px';
    ghost.style.height = sRect.height + 'px';
    ghost.style.left = sRect.left + 'px';
    ghost.style.top = sRect.top + 'px';
    ghost.style.transition = 'transform .65s cubic-bezier(.4,1.4,.4,1), opacity .6s ease';
    ghost.textContent = card.emoji;
    fxLayer.appendChild(ghost);

    const dx = (tRect.left + tRect.width/2) - (sRect.left + sRect.width/2);
    const dy = (tRect.top + tRect.height/2) - (sRect.top + sRect.height/2);
    const scale = Math.min(tRect.width / sRect.width, 0.4);

    await new Promise(r => requestAnimationFrame(() => {
      ghost.style.transform = `translate(${dx}px, ${dy}px) rotateY(360deg) scale(${scale})`;
      ghost.style.opacity = '0.0';
      setTimeout(() => { ghost.remove(); r(); }, 700);
    }));
    target.classList.remove('bumped');
    void target.offsetWidth;
    target.classList.add('bumped');
  }

  function fireHeroBurst(x, y, color) {
    const fxLayer = $('#fx-layer');
    const burst = document.createElement('div');
    burst.className = 'hero-burst';
    burst.style.left = x + 'px';
    burst.style.top = y + 'px';
    burst.style.setProperty('--burst-color', color);
    fxLayer.appendChild(burst);
    const ring = document.createElement('div');
    ring.className = 'hero-burst-ring';
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
    ring.style.setProperty('--burst-color', color);
    fxLayer.appendChild(ring);
    setTimeout(() => { burst.remove(); ring.remove(); }, 1000);
  }

  async function animateReserve(playerIdx, src, card) {
    const fxLayer = $('#fx-layer');
    let srcEl;
    if (src.slot === -1) srcEl = $(`#deck-${src.tier}`);
    else srcEl = document.querySelector(`#tier-${src.tier} .card[data-slot="${src.slot}"]`);
    if (!srcEl) return;
    const sRect = srcEl.getBoundingClientRect();
    const target = playerIdx === 0 ? $('#btn-reserved') : $('#panel-opponent');
    if (!target) return;
    const tRect = target.getBoundingClientRect();

    const ghost = document.createElement('div');
    ghost.className = 'fly-card';
    ghost.style.width = sRect.width + 'px';
    ghost.style.height = sRect.height + 'px';
    ghost.style.left = sRect.left + 'px';
    ghost.style.top = sRect.top + 'px';
    ghost.style.transition = 'transform .55s cubic-bezier(.4,1.4,.4,1), opacity .5s ease';
    ghost.textContent = src.slot === -1 ? '?' : (card?.emoji || '?');
    fxLayer.appendChild(ghost);

    const dx = (tRect.left + tRect.width/2) - (sRect.left + sRect.width/2);
    const dy = (tRect.top + tRect.height/2) - (sRect.top + sRect.height/2);
    await new Promise(r => requestAnimationFrame(() => {
      ghost.style.transform = `translate(${dx}px, ${dy}px) scale(0.4) rotate(15deg)`;
      ghost.style.opacity = '0';
      setTimeout(() => { ghost.remove(); r(); }, 600);
    }));
  }

  async function animateTeamClaim(playerIdx, team) {
    // Find the team element by matching name -- since teams render before claim, find by text
    const teamEls = $$('.team');
    for (const el of teamEls) {
      if (el.querySelector('.team-name')?.textContent === team.name) {
        el.style.transition = 'transform .5s ease, opacity .5s ease, box-shadow .5s ease';
        el.style.transform = 'scale(1.4)';
        el.style.boxShadow = '0 0 40px rgba(255,212,0,0.95)';
        await sleep(450);
        el.style.opacity = '0';
        el.style.transform = 'scale(0.5)';
        await sleep(300);
        break;
      }
    }
  }

  function launchConfetti() {
    const c = $('#confetti');
    c.innerHTML = '';
    const colors = ['#ed1d24','#ffd400','#3b9bff','#2fd97a','#b35bff','#ff8a3b'];
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetto';
      piece.style.left = Math.random()*100 + 'vw';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = (1.6 + Math.random()*1.4) + 's';
      piece.style.animationDelay = (Math.random()*0.8) + 's';
      piece.style.transform = `rotate(${Math.random()*360}deg)`;
      c.appendChild(piece);
    }
    setTimeout(() => { c.innerHTML = ''; }, 4500);
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function showToast(msg, kind='') {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show ' + kind;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ---------- Boot ----------
  document.addEventListener('DOMContentLoaded', setupSplash);

})();
