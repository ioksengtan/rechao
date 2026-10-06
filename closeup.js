/* Step close-ups for the home dinner: cut, stir and timing. One button each, scored 0–100. No DOM access. */
(function (root) {
  'use strict';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  // Cut: a knife sweeps back and forth; press on each guide line.
  const CUT = { guides: [.25, .5, .75], speed: .55, perfect: .03, miss: .16, limit: 30 };
  // Stir: press to whisk, stop when the bowl looks right. Resting ends the step.
  const STIR = { low: 8, high: 12, max: 20, rest: 1.2, perPress: 14, limit: 20 };
  // Timing: press to light the stove, press again inside the green zone to take the pan off.
  const TIMING = { duration: 6, low: .62, high: .8, raw: 25, burnt: 10 };
  const KINDS = ['cut', 'stir', 'timing'];
  const grade = score => score >= 85 ? '漂亮！' : score >= 60 ? '還不錯' : '有點可惜';

  class Closeup {
    constructor(kind, label = '') {
      this.kind = KINDS.includes(kind) ? kind : 'timing';
      this.label = label; this.time = 0; this.done = false; this.score = null; this.note = '';
      this.marker = 0; this.cuts = [];           // cut
      this.presses = 0; this.idle = 0;           // stir
      this.started = false; this.heat = 0;       // timing
    }
    finish(score, note) { this.done = true; this.score = clamp(Math.round(score), 0, 100); this.note = note || grade(this.score); return this.score; }
    get hint() {
      if (this.done) return this.note;
      if (this.kind === 'cut') return `刀子走到線上時按下 · 還要切 ${CUT.guides.length - this.cuts.length} 刀`;
      if (this.kind === 'stir') return this.presses ? '連按攪拌，覺得剛好就停手' : '連按攪拌，攪到綠色範圍就停手';
      return this.started ? '到綠色範圍再按一次起鍋' : '按一下開火';
    }
    press() {
      if (this.done) return false;
      if (this.kind === 'cut') {
        const open = CUT.guides.filter(g => !this.cuts.some(c => c.guide === g));
        const guide = open.reduce((best, g) => Math.abs(g - this.marker) < Math.abs(best - this.marker) ? g : best);
        const off = Math.abs(guide - this.marker);
        this.cuts.push({ at: this.marker, guide, score: Math.round(clamp((CUT.miss - off) / (CUT.miss - CUT.perfect), 0, 1) * 100) });
        if (this.cuts.length === CUT.guides.length) this.finish(this.cuts.reduce((sum, c) => sum + c.score, 0) / this.cuts.length);
      } else if (this.kind === 'stir') {
        this.presses++; this.idle = 0;
        if (this.presses >= STIR.max) this.settleStir();
      } else if (!this.started) this.started = true;
      else this.settleTiming();
      return true;
    }
    settleStir() {
      const p = this.presses, off = p < STIR.low ? STIR.low - p : p > STIR.high ? p - STIR.high : 0;
      return this.finish(100 - off * STIR.perPress, off ? (p < STIR.low ? '還沒攪勻' : '攪過頭了') : '');
    }
    settleTiming() {
      const h = this.heat;
      if (h >= 1) return this.finish(TIMING.burnt, '有點焦了');
      if (h < TIMING.low) return this.finish(TIMING.raw + (100 - TIMING.raw) * h / TIMING.low, h < TIMING.low * .8 ? '還沒熟透' : '');
      if (h <= TIMING.high) return this.finish(100);
      return this.finish(100 - (100 - TIMING.burnt) * (h - TIMING.high) / (1 - TIMING.high), '炒過頭了');
    }
    update(dt) {
      if (this.done || !Number.isFinite(dt) || dt <= 0) return;
      this.time += dt;
      if (this.kind === 'cut') {
        const phase = (this.time * CUT.speed) % 2;
        this.marker = phase <= 1 ? phase : 2 - phase;
        if (this.time >= CUT.limit) this.finish(this.cuts.reduce((sum, c) => sum + c.score, 0) / CUT.guides.length, '沒切完');
      } else if (this.kind === 'stir') {
        if (this.presses) { this.idle += dt; if (this.idle >= STIR.rest) this.settleStir(); }
        else if (this.time >= STIR.limit) this.finish(0, '沒有攪拌');
      } else if (this.started) {
        this.heat = clamp(this.heat + dt / TIMING.duration, 0, 1);
        if (this.heat >= 1) this.settleTiming();
      }
    }
    // Everything a renderer needs, as 0–1 positions.
    view() {
      const base = { kind: this.kind, label: this.label, hint: this.hint, done: this.done, score: this.score };
      if (this.kind === 'cut') return { ...base, marker: this.marker, guides: [...CUT.guides], cuts: this.cuts.map(c => c.at) };
      if (this.kind === 'stir') return { ...base, fill: this.presses / STIR.max, low: STIR.low / STIR.max, high: STIR.high / STIR.max, presses: this.presses };
      return { ...base, fill: this.heat, low: TIMING.low, high: TIMING.high, started: this.started };
    }
  }
  const api = { CUT, STIR, TIMING, KINDS, grade, Closeup };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HotStirFryCloseup = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
