const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../game-core.js');
const { createRenderer } = require('../art.js');
const { createPlayer } = require('../movement.js');
const { createAudio, TYPES } = require('../audio.js');

function context() {
  let depth = 0;
  const ctx = new Proxy({ save() { depth++; }, restore() { depth--; assert.ok(depth >= 0); } }, { get: (t, k) => k in t ? t[k] : () => {} });
  return { ctx, balanced: () => assert.equal(depth, 0) };
}
const kinds = r => r.state.effects.map(fx => fx.kind);

test('the observer reacts to fire, burning and customers without touching the game', () => {
  const c = context(), r = createRenderer(c.ctx, core), g = new core.Kitchen(() => .5, 'rush');
  r.observe(g); assert.equal(r.state.effects.length, 0, 'a quiet prep phase shows nothing');
  g.startService();
  r.observe(g);
  const calls = r.state.effects.filter(fx => fx.kind === 'bubble');
  assert.equal(calls.length, 2); assert.match(calls.map(b => b.text).join(), /蔥爆牛肉一份/);
  r.observe(g); assert.equal(r.state.effects.filter(fx => fx.kind === 'bubble').length, 2, 'each order calls out once');
  g.wok.state = 'cooking'; r.observe(g);
  assert.ok(kinds(r).includes('flame')); assert.ok(r.state.shake);
  g.wok.state = 'burned'; r.observe(g);
  assert.ok(kinds(r).includes('smoke')); assert.ok(r.state.effects.some(fx => fx.text === '燒焦了！'));
  g.orders[0].remaining = 10; r.observe(g);
  assert.ok(r.state.effects.some(fx => fx.kind === 'bubble' && fx.urgent && fx.table === g.orders[0].table));
  r.draw(g, createPlayer(), null, new Set(), true, false); c.balanced();
});

test('observing and drawing never change the kitchen', () => {
  const c = context(), r = createRenderer(c.ctx, core), g = new core.Kitchen(() => .5, 'friday');
  r.observe(g); g.startService(); g.woks.wok.state = 'burned';
  const before = JSON.stringify(g);
  r.observe(g); r.update(.3, true); r.draw(g, createPlayer(), null, new Set(), true, false);
  assert.equal(JSON.stringify(g), before); c.balanced();
});

test('flips and serves pop feedback; the table reacts after the dish arrives', () => {
  const c = context(), r = createRenderer(c.ctx, core), g = new core.Kitchen(() => .5, 'opening');
  const wok = g.stations.find(s => s.id === 'wok'), serve = g.stations.find(s => s.id === 'serve');
  g.wok.ingredients = ['choppedGreens']; g.wok.state = 'loading'; g.action('wok'); g.tick(2.2);
  let before = r.snapshot(g); g.action('wok'); r.action(wok, g, before);
  assert.ok(r.state.effects.some(fx => fx.text === '翻炒漂亮！')); assert.ok(r.state.shake);
  g.startService(); g.held = { id: 'greensDish' }; before = r.snapshot(g); g.serve(); r.action(serve, g, before);
  const money = r.state.effects.find(fx => fx.kind === 'float' && fx.text.startsWith('+$'));
  assert.equal(money.text, `+$${g.revenue}`);
  const reaction = r.state.effects.find(fx => fx.kind === 'bubble' && fx.delay > 0);
  assert.ok(reaction, 'the reaction waits for the delivery');
  const frozen = JSON.stringify(r.state); r.update(1, false); assert.equal(JSON.stringify(r.state), frozen, 'pause freezes effects');
  r.draw(g, createPlayer(), serve, new Set(), true, false); r.update(5, true);
  assert.equal(r.state.effects.length, 0); assert.equal(r.state.shake, null);
  r.observe(g); r.reset(); assert.equal(r.state.seen, null); c.balanced();
});

test('audio is silent and safe without Web Audio', () => {
  const sfx = createAudio({});
  sfx.resume(); for (const type of TYPES) sfx.play(type); sfx.ambience(2, true); sfx.muted = true;
  assert.equal(sfx.muted, true);
});

test('every sound builds a Web Audio graph; mute silences effects and ambience', () => {
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime(v) { this.value = v; } });
  let created = 0;
  const node = () => { created++; return { connect: n => n, start() {}, stop() {}, frequency: param(), gain: param(), Q: param() }; };
  class FakeContext {
    constructor() { this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    createGain() { return node(); } createOscillator() { return node(); } createBiquadFilter() { return node(); } createBufferSource() { return node(); }
    createBuffer(c, length) { return { getChannelData: () => new Float32Array(length) }; }
    resume() { return Promise.resolve(); }
  }
  const sfx = createAudio({ AudioContext: FakeContext });
  sfx.play('serve'); assert.equal(created, 0, 'nothing plays before a user gesture resumes audio');
  sfx.resume();
  for (const type of TYPES) { const n = created; sfx.play(type); assert.ok(created > n, type); }
  sfx.ambience(1, true); const loops = created; sfx.ambience(2, false); assert.equal(created, loops, 'ambience loops are created once');
  sfx.muted = true; const muted = created; sfx.play('fire'); assert.equal(created, muted);
});
