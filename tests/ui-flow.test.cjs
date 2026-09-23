// Exercise the actual UI handlers with a minimal DOM/Canvas adapter.
// Visual layout is checked separately in a browser; these tests cover lifecycle wiring.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../game-core.js');
const movement = require('../movement.js');
const progress = require('../progress.js');
const art = require('../art.js');

function runtime() {
  const nodes = {}, events = {}, records = new Map();
  let frame, now = 0, game, player;
  const context2d = new Proxy({}, { get: (target, key) => target[key] || (() => {}), set: (target, key, value) => (target[key] = value, true) });
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const match of html.matchAll(/id="([^"]+)"/g)) {
    const classes = new Set();
    nodes[match[1]] = { textContent: '', innerHTML: '', disabled: false, focus() {}, getContext: () => context2d, querySelector: () => ({ focus() {} }),
      classList: { add: key => classes.add(key), remove: key => classes.delete(key), contains: key => classes.has(key), toggle(key, force) { const on = force ?? !classes.has(key); if (on) classes.add(key); else classes.delete(key); return on; } } };
  }
  const scope = {
    document: { getElementById: id => { assert.ok(nodes[id], `DOM node exists: ${id}`); return nodes[id]; }, addEventListener: (name, cb) => events[name] = cb },
    addEventListener: (name, cb) => events[name] = cb,
    requestAnimationFrame: cb => frame = cb,
    performance: { now: () => now },
    localStorage: { getItem: key => records.get(key), setItem: (key, value) => records.set(key, value) },
    HotStirFry: { ...core, Kitchen: class extends core.Kitchen { constructor() { super(); game = this; } } },
    HotStirFryMovement: { ...movement, createPlayer() { player = movement.createPlayer(); return player; } },
    HotStirFryProgress: progress,
    HotStirFryArt: art,
  };
  scope.window = scope;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8'), scope, { filename: 'game.js' });
  return {
    nodes, records, events, get game() { return game; }, get player() { return player; },
    frame() { now += 1000 / 60; frame(now); },
    select(level) { nodes['level-list'].onclick({ target: { closest: () => ({ dataset: { level } }) } }); },
    press(key) { events.keydown({ key, repeat: false, preventDefault() {} }); },
    release(key) { events.keyup({ key }); }
  };
}

test('UI selection, keyboard movement, pause, results, next level and restart work together', () => {
  const ui = runtime();
  ui.select('rush'); assert.equal(ui.game.level.id, 'rush'); assert.match(ui.nodes['recipe-list'].innerHTML, /蔥爆牛肉/);
  ui.nodes.start.onclick(); ui.frame(); assert.equal(ui.nodes.overlay.classList.contains('hidden'), true);
  const x = ui.player.x; ui.press('d'); for (let i=0;i<20;i++)ui.frame(); ui.release('d'); assert.ok(ui.player.x > x);
  ui.press('Escape'); const remaining=ui.game.time; for(let i=0;i<20;i++)ui.frame(); assert.equal(ui.game.time,remaining);
  ui.nodes.resume.onclick(); ui.nodes['open-early'].onclick(); assert.equal(ui.game.phase,'service');
  ui.game.revenue=800; ui.game.finish(); ui.frame();
  assert.equal(ui.nodes.results.classList.contains('hidden'),false); assert.equal(ui.nodes.stars.textContent,'★★☆');
  assert.match(ui.nodes['next-level'].textContent,/滿座週五夜/);
  const saved=JSON.parse(ui.records.get(progress.KEY)); assert.equal(saved.rush.runs,1); assert.equal(saved.rush.revenue,800);
  ui.frame(); assert.equal(JSON.parse(ui.records.get(progress.KEY)).rush.runs,1, 'one result written per session');
  ui.nodes['next-level'].onclick(); ui.frame(); assert.equal(ui.game.level.id,'friday'); assert.equal(ui.game.revenue,0); assert.equal(ui.game.plates,6);
  ui.game.finish(); ui.frame(); assert.equal(ui.nodes['next-level'].classList.contains('hidden'),true);
  ui.nodes.restart.onclick(); ui.frame(); assert.equal(ui.game.level.id,'friday'); assert.equal(ui.game.phase,'prep');
});

test('returning from a paused game clears input and session without recording an unfinished run', () => {
  const ui=runtime();ui.select('friday');ui.nodes.start.onclick();ui.frame();ui.press('w');ui.frame();ui.press('Escape');ui.nodes['choose-pause'].onclick();ui.frame();
  assert.equal(ui.game.phase,'prep');assert.equal(ui.nodes.pause.textContent,'暫停 Esc');assert.equal(ui.nodes.pause.disabled,true);assert.equal(ui.records.size,0);
  ui.select('opening');ui.nodes.start.onclick();const y=ui.player.y;ui.frame();assert.equal(ui.player.y,y);assert.equal(Object.keys(ui.game.woks).length,1);assert.equal(ui.game.plates,4);
});

test('origin dialogue advances, goes back, exits and replays without starting a shift', () => {
  const ui = runtime(); ui.select('friday');
  const before = JSON.stringify(ui.game);
  ui.nodes['origin-open'].onclick();
  assert.equal(ui.nodes.origin.classList.contains('hidden'), false);
  assert.equal(ui.nodes.welcome.classList.contains('hidden'), true);
  assert.match(ui.nodes['origin-text'].textContent, /Alex/);
  assert.equal(ui.nodes['origin-prev'].disabled, true);
  ui.press('ArrowRight'); assert.equal(ui.nodes['origin-progress'].textContent, '2 / 9');
  ui.press('ArrowLeft'); assert.equal(ui.nodes['origin-progress'].textContent, '1 / 9');
  ui.press('d'); for (let i=0;i<20;i++) ui.frame();
  assert.equal(JSON.stringify(ui.game), before);
  for (let i=0;i<8;i++) ui.nodes['origin-next'].onclick();
  assert.equal(ui.nodes['origin-next'].textContent, '前往選關 →');
  ui.press('Enter'); assert.equal(ui.nodes.origin.classList.contains('hidden'), true);
  assert.equal(ui.game.level.id, 'friday'); assert.equal(ui.records.size, 0);
  ui.nodes['origin-open'].onclick(); assert.equal(ui.nodes['origin-progress'].textContent, '1 / 9');
  ui.press('Escape'); assert.equal(ui.nodes.welcome.classList.contains('hidden'), false);
  ui.nodes.start.onclick(); ui.frame(); assert.equal(ui.game.level.id, 'friday');
});

test('notebook categories, training completion and next service keep separate records',()=>{
 const ui=runtime();
 assert.match(ui.nodes['level-list'].innerHTML,/備料課/);
 assert.equal(ui.nodes['course-tabs'].innerHTML.includes('籌備中'),false);
 ui.nodes['course-tabs'].onclick({target:{closest:()=>({dataset:{course:'juice'}})}});
 assert.equal(ui.nodes.start.disabled,false);assert.match(ui.nodes['level-list'].innerHTML,/果汁課/);
 ui.nodes.start.onclick();ui.frame();assert.equal(ui.game.level.id,'juice-school');assert.equal(ui.game.phase,'training');
 ui.nodes['course-tabs'].onclick({target:{closest:()=>({dataset:{course:'prep'}})}});
 ui.nodes.start.onclick();ui.frame();assert.equal(ui.nodes.clock.textContent,'不限時');
 ui.game.held={id:'choppedGreens',count:3};ui.game.interact('serve');
 ui.game.held={id:'choppedScallion',count:2};ui.game.interact('serve');ui.frame();
 assert.match(ui.nodes['result-level'].textContent,/備料課完成/);
 assert.equal(JSON.parse(ui.records.get(progress.KEY))['prep-school'].runs,1);
 ui.nodes['next-level'].onclick();ui.frame();assert.equal(ui.game.level.id,'opening');
});
