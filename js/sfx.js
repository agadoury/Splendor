// The Rift — sound effects & haptics
// All sounds are synthesized with Web Audio API so we ship zero binary assets.

const SFX = (() => {
  let ctx = null;
  let master = null;
  let enabled = loadPref('sfx', true);
  let hapticsEnabled = loadPref('haptics', true);

  function loadPref(key, def) {
    try { const v = localStorage.getItem('splendor.' + key); return v === null ? def : v === '1'; }
    catch (e) { return def; }
  }
  function savePref(key, val) {
    try { localStorage.setItem('splendor.' + key, val ? '1' : '0'); } catch (e) {}
  }

  function ensure() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // Helper: schedule a tone with attack/decay envelope
  function tone(freq, dur, type='sine', vol=0.3, when=0, slideTo=null) {
    if (!enabled || !ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol=0.2, when=0, filterFreq=2000) {
    if (!enabled || !ctx) return;
    const t0 = ctx.currentTime + when;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = filterFreq; filt.Q.value = 1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(gain).connect(master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  // ---- Public sound effects ----

  // Crystalline "ting" for picking up a stone
  function pickToken(stone='power') {
    ensure(); resume();
    const freqs = {
      power: 740, space: 880, time: 660, mind: 980, soul: 580, reality: 1100
    };
    const f = freqs[stone] || 800;
    tone(f, 0.18, 'triangle', 0.22);
    tone(f * 2, 0.12, 'sine', 0.10, 0.01);
  }

  // Crystalline shimmer when multiple tokens are gathered
  function shimmer() {
    ensure(); resume();
    const base = 600;
    for (let i = 0; i < 4; i++) {
      tone(base * (1 + i * 0.25), 0.4 - i * 0.05, 'triangle', 0.15 - i * 0.025, i * 0.04);
    }
  }

  // Powerful card recruit
  function recruit() {
    ensure(); resume();
    tone(220, 0.2, 'sawtooth', 0.18, 0, 440);
    tone(330, 0.5, 'triangle', 0.18, 0.05, 660);
    tone(660, 0.4, 'sine', 0.15, 0.1, 1320);
    noise(0.18, 0.08, 0, 1200);
  }

  // Reserve = small magical "swoop"
  function reserve() {
    ensure(); resume();
    tone(440, 0.25, 'triangle', 0.18, 0, 880);
    tone(660, 0.18, 'sine', 0.10, 0.05);
  }

  // Team claim = triumphant flourish
  function teamClaim() {
    ensure(); resume();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C-E-G-C major
    notes.forEach((n, i) => {
      tone(n, 0.5 - i * 0.05, 'triangle', 0.2, i * 0.08);
      tone(n * 2, 0.4, 'sine', 0.08, i * 0.08);
    });
  }

  // UI selection blip
  function tap() {
    ensure(); resume();
    tone(880, 0.05, 'square', 0.06);
  }
  function deselect() {
    ensure(); resume();
    tone(660, 0.05, 'square', 0.06);
  }
  function error() {
    ensure(); resume();
    tone(220, 0.12, 'square', 0.15, 0, 110);
  }

  // Big victory fanfare
  function victory() {
    ensure(); resume();
    const melody = [
      [523.25, 0],   // C5
      [659.25, 0.12],// E5
      [783.99, 0.24],// G5
      [1046.5, 0.36],// C6
      [783.99, 0.5], // G5
      [1046.5, 0.62],// C6
      [1318.5, 0.75] // E6 hold
    ];
    for (const [f, t] of melody) {
      tone(f, 0.25, 'triangle', 0.22, t);
      tone(f * 2, 0.2, 'sine', 0.08, t);
    }
    tone(130.81, 0.9, 'sawtooth', 0.18, 0);  // bass C3
    tone(196.0,  0.9, 'sawtooth', 0.14, 0);  // G3
  }

  function defeat() {
    ensure(); resume();
    tone(440, 0.4, 'sawtooth', 0.18, 0, 220);
    tone(330, 0.4, 'sawtooth', 0.16, 0.1, 165);
    tone(220, 0.6, 'triangle', 0.20, 0.2, 110);
  }

  function turnChime() {
    ensure(); resume();
    tone(987.77, 0.12, 'sine', 0.14);
    tone(1318.5, 0.18, 'sine', 0.10, 0.05);
  }

  // ---- Haptics ----
  function buzz(pattern) {
    if (!hapticsEnabled) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }
  const haptics = {
    tap:     () => buzz(8),
    confirm: () => buzz([12, 30, 12]),
    success: () => buzz([15, 40, 30, 40, 15]),
    error:   () => buzz([60, 40, 60]),
    victory: () => buzz([10, 30, 10, 30, 10, 30, 60]),
  };

  // ---- Ambient cosmic hum (soft drone) ----
  let ambient = null;
  function startAmbient() {
    if (!enabled || !ctx || ambient) return;
    ensure(); resume();
    const a = {};
    a.gain = ctx.createGain();
    a.gain.gain.value = 0;
    a.gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2.0);
    a.gain.connect(master);

    // Two detuned low oscillators + a slow LFO on filter for movement
    a.osc1 = ctx.createOscillator(); a.osc1.type = 'sawtooth'; a.osc1.frequency.value = 55;
    a.osc2 = ctx.createOscillator(); a.osc2.type = 'sine';     a.osc2.frequency.value = 82;
    a.osc3 = ctx.createOscillator(); a.osc3.type = 'sine';     a.osc3.frequency.value = 110;
    a.filter = ctx.createBiquadFilter(); a.filter.type = 'lowpass'; a.filter.frequency.value = 280; a.filter.Q.value = 4;

    // LFO on filter cutoff for breathing
    a.lfo = ctx.createOscillator(); a.lfo.frequency.value = 0.07; a.lfo.type = 'sine';
    a.lfoGain = ctx.createGain(); a.lfoGain.gain.value = 80;
    a.lfo.connect(a.lfoGain).connect(a.filter.frequency);

    [a.osc1, a.osc2, a.osc3].forEach(o => o.connect(a.filter));
    a.filter.connect(a.gain);

    a.osc1.start(); a.osc2.start(); a.osc3.start(); a.lfo.start();
    ambient = a;
  }
  function stopAmbient() {
    if (!ambient || !ctx) return;
    const a = ambient;
    const t = ctx.currentTime;
    a.gain.gain.cancelScheduledValues(t);
    a.gain.gain.setValueAtTime(a.gain.gain.value, t);
    a.gain.gain.linearRampToValueAtTime(0, t + 0.5);
    setTimeout(() => {
      try { a.osc1.stop(); a.osc2.stop(); a.osc3.stop(); a.lfo.stop(); } catch(e){}
    }, 600);
    ambient = null;
  }

  // ---- Settings ----
  function setSfx(v) {
    enabled = v; savePref('sfx', v);
    if (v) { ensure(); resume(); turnChime(); }
    else { stopAmbient(); }
  }
  function setHaptics(v) { hapticsEnabled = v; savePref('haptics', v); if (v) buzz(20); }
  function isSfxOn() { return enabled; }
  function isHapticsOn() { return hapticsEnabled; }

  // Initialize on first user interaction (browsers require gesture)
  function init() {
    const handler = () => { ensure(); resume(); document.removeEventListener('pointerdown', handler); };
    document.addEventListener('pointerdown', handler, { once: true });
  }

  return {
    init, pickToken, shimmer, recruit, reserve, teamClaim, tap, deselect, error,
    victory, defeat, turnChime,
    startAmbient, stopAmbient,
    haptics,
    setSfx, setHaptics, isSfxOn, isHapticsOn
  };
})();
