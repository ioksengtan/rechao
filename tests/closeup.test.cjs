const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Closeup, CUT, STIR, TIMING, grade } = require('../closeup.js');

// Advance in small steps until the knife is within `slack` of a position.
function sweepTo(c, position, slack = .004) {
  for (let i = 0; i < 5000 && Math.abs(c.marker - position) > slack; i++) c.update(.005);
  assert.ok(Math.abs(c.marker - position) <= slack, `knife reaches ${position}`);
}
const run = (c, seconds, step = .05) => { for (let t = 0; t < seconds - 1e-9; t += step) c.update(step); };

test('cut: pressing on each guide line scores full marks', () => {
  const c = new Closeup('cut', '切番茄');
  for (const guide of CUT.guides) { assert.equal(c.done, false); sweepTo(c, guide); assert.equal(c.press(), true); }
  assert.equal(c.done, true); assert.equal(c.score, 100); assert.equal(c.note, '漂亮！');
  assert.equal(c.press(), false, 'a finished step ignores input');
  assert.deepEqual(c.view().guides, CUT.guides); assert.equal(c.view().cuts.length, 3);
});

test('cut: sloppy cuts score lower, and each guide is used once', () => {
  const c = new Closeup('cut');
  sweepTo(c, .25); c.press(); c.press(); c.press();
  assert.equal(c.done, true);
  assert.deepEqual(c.cuts.map(x => x.guide), [.25, .5, .75]);
  assert.deepEqual(c.cuts.map(x => x.score), [100, 0, 0]);
  assert.equal(c.score, 33); assert.equal(c.note, '有點可惜');
  const near = new Closeup('cut'); sweepTo(near, .25 + (CUT.perfect + CUT.miss) / 2); near.press();
  assert.ok(near.cuts[0].score > 30 && near.cuts[0].score < 70, 'a near miss earns partial credit');
});

test('cut: the knife sweeps back and forth and the step times out', () => {
  const c = new Closeup('cut');
  let max = 0, min = 1, turned = false, prev = 0;
  for (let i = 0; i < 1000; i++) { c.update(.01); max = Math.max(max, c.marker); if (c.marker < prev) turned = true; if (turned) min = Math.min(min, c.marker); prev = c.marker; }
  assert.ok(max > .97 && min < .03 && turned);
  sweepTo(c, .5); c.press(); run(c, CUT.limit);
  assert.equal(c.done, true); assert.equal(c.score, 33); assert.equal(c.note, '沒切完');
});

test('stir: stopping inside the range is perfect; too few or too many loses points', () => {
  const stir = presses => { const c = new Closeup('stir'); for (let i = 0; i < presses; i++) { c.press(); c.update(.1); } run(c, STIR.rest); return c; };
  for (const n of [STIR.low, 10, STIR.high]) assert.equal(stir(n).score, 100, `${n} presses`);
  const few = stir(5), many = stir(15);
  assert.equal(few.score, 100 - 3 * STIR.perPress); assert.equal(few.note, '還沒攪勻');
  assert.equal(many.score, 100 - 3 * STIR.perPress); assert.equal(many.note, '攪過頭了');
  assert.equal(stir(1).score, 2);
});

test('stir: resting ends the step, pressing keeps it going, and it cannot run forever', () => {
  const c = new Closeup('stir');
  run(c, 5); assert.equal(c.done, false, 'waits for the first press');
  c.press(); run(c, STIR.rest - .2); assert.equal(c.done, false);
  c.press(); run(c, STIR.rest - .2); assert.equal(c.done, false, 'each press resets the rest timer');
  run(c, .3); assert.equal(c.done, true);
  const forever = new Closeup('stir'); for (let i = 0; i < 50; i++) forever.press();
  assert.equal(forever.presses, STIR.max); assert.equal(forever.done, true); assert.equal(forever.score, 0);
  const idle = new Closeup('stir'); run(idle, STIR.limit); assert.equal(idle.score, 0); assert.equal(idle.note, '沒有攪拌');
});

test('timing: the pan heats only after lighting, and the green zone is perfect', () => {
  const c = new Closeup('timing', '看熟度起鍋');
  run(c, 3); assert.equal(c.heat, 0); assert.match(c.hint, /開火/);
  c.press(); assert.equal(c.done, false); assert.match(c.hint, /起鍋/);
  run(c, TIMING.duration * (TIMING.low + TIMING.high) / 2);
  c.press(); assert.equal(c.score, 100); assert.equal(c.view().started, true);
});

test('timing: too early is undercooked, too late is overdone, and waiting burns it', () => {
  const stopAt = fraction => { const c = new Closeup('timing'); c.press(); run(c, TIMING.duration * fraction, .01); c.press(); return c; };
  const early = stopAt(.2), close = stopAt(.58), late = stopAt(.9);
  assert.ok(early.score < 55); assert.equal(early.note, '還沒熟透');
  assert.ok(close.score > 85 && close.score < 100);
  assert.ok(late.score < 60 && late.score > TIMING.burnt); assert.equal(late.note, '炒過頭了');
  const burnt = new Closeup('timing'); burnt.press(); run(burnt, TIMING.duration + 1);
  assert.equal(burnt.done, true); assert.equal(burnt.score, TIMING.burnt); assert.equal(burnt.note, '有點焦了');
});

test('views expose 0–1 positions; odd input is ignored', () => {
  for (const kind of ['cut', 'stir', 'timing']) {
    const c = new Closeup(kind); c.update(NaN); c.update(-1); assert.equal(c.time, 0);
    const v = c.view(); assert.equal(v.kind, kind); assert.equal(v.done, false); assert.ok(v.hint.length > 0);
  }
  const stir = new Closeup('stir'); stir.press(); stir.press();
  assert.equal(stir.view().fill, 2 / STIR.max); assert.ok(stir.view().low < stir.view().high);
  assert.equal(new Closeup('nonsense').kind, 'timing');
  assert.deepEqual([grade(85), grade(60), grade(59)], ['漂亮！', '還不錯', '有點可惜']);
});
