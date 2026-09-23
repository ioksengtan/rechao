/* Synthesized kitchen sounds: no audio files, and silent when Web Audio is unavailable. */
(function (root) {
  'use strict';
  const TYPES = ['tap', 'chop', 'fire', 'flip', 'done', 'order', 'serve', 'bad'];
  function createAudio(win = root) {
    let ctx = null, master = null, noise = null, sizzle = null, crowd = null, muted = false;
    function init() {
      if (ctx) return ctx;
      const AudioContext = win.AudioContext || win.webkitAudioContext;
      if (!AudioContext) return null;
      try {
        ctx = new AudioContext();
        master = ctx.createGain(); master.gain.value = .8; master.connect(ctx.destination);
        noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      } catch (_) { ctx = null; }
      return ctx;
    }
    function tone(freq, start, length, volume, type = 'sine', end = freq) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, start); if (end !== freq) o.frequency.exponentialRampToValueAtTime(end, start + length);
      g.gain.setValueAtTime(volume, start); g.gain.exponentialRampToValueAtTime(.0001, start + length);
      o.connect(g); g.connect(master); o.start(start); o.stop(start + length + .02);
    }
    function hiss(start, length, volume, filterType, from, to = from, q = 1) {
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noise; f.type = filterType; f.Q.value = q;
      f.frequency.setValueAtTime(from, start); if (to !== from) f.frequency.exponentialRampToValueAtTime(to, start + length);
      g.gain.setValueAtTime(.0001, start); g.gain.exponentialRampToValueAtTime(volume, start + Math.min(.03, length / 3)); g.gain.exponentialRampToValueAtTime(.0001, start + length);
      src.connect(f); f.connect(g); g.connect(master); src.start(start, Math.random() * .5); src.stop(start + length + .02);
    }
    const bell = (freq, start, volume = .05, length = .5) => { tone(freq, start, length, volume, 'sine'); tone(freq * 2.76, start, length * .5, volume * .35, 'sine'); tone(freq * 5.4, start, length * .25, volume * .15, 'sine'); };
    const SOUNDS = {
      tap: t => tone(330, t, .08, .04, 'triangle'),
      chop: t => { hiss(t, .05, .09, 'bandpass', 2600, 2600, 2); tone(170, t, .06, .07, 'sine', 110); },
      fire: t => { hiss(t, .55, .12, 'lowpass', 250, 2200); tone(90, t, .4, .05, 'sine', 60); },
      flip: t => { hiss(t, .25, .08, 'bandpass', 700, 2400, 1.5); [520, 1330, 2130].forEach((f, i) => tone(f, t + .06, .35 - i * .08, .035, 'sine')); hiss(t + .08, .3, .05, 'highpass', 3500); },
      done: t => { bell(784, t, .045, .35); bell(1047, t + .1, .045, .45); },
      order: t => bell(1319, t, .04, .6),
      serve: t => { bell(1047, t, .05, .4); bell(1319, t + .08, .05, .4); bell(1568, t + .16, .05, .7); },
      bad: t => { tone(150, t, .28, .06, 'sawtooth', 90); tone(110, t + .16, .3, .05, 'sawtooth', 70); }
    };
    function loop(filters, volume) {
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = noise; src.loop = true; g.gain.value = 0;
      let node = src;
      for (const [type, freq, q = 1] of filters) { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; node.connect(f); node = f; }
      node.connect(g); g.connect(master); src.start();
      return { gain: g, volume };
    }
    function level(channel, amount) {
      if (!channel) return;
      channel.gain.gain.setTargetAtTime(muted ? 0 : channel.volume * amount, ctx.currentTime, .25);
    }
    return {
      TYPES,
      resume() { if (!init()) return; ctx.resume?.().catch?.(() => {}); },
      play(type) {
        if (muted || !ctx || !SOUNDS[type]) return;
        try { SOUNDS[type](ctx.currentTime + .005); } catch (_) { /* Sound is optional. */ }
      },
      // Sizzle follows how many woks are cooking; the crowd murmurs while customers are seated.
      ambience(cooking, open) {
        if (!ctx) return;
        try {
          sizzle ||= loop([['highpass', 2800], ['peaking', 6000, 1]], .05);
          crowd ||= loop([['lowpass', 520], ['bandpass', 300, .6]], .09);
          level(sizzle, Math.min(1, cooking * .6)); level(crowd, open ? 1 : 0);
        } catch (_) { /* Ambience is optional. */ }
      },
      get muted() { return muted; },
      set muted(value) { muted = !!value; if (ctx) { level(sizzle, 0); level(crowd, 0); } }
    };
  }
  const api = { createAudio, TYPES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HotStirFryAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
