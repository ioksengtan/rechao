// Exercise the actual UI handlers with a minimal DOM/Canvas adapter.
// Visual layout is checked separately in a browser; these tests cover lifecycle wiring.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const progress = require('../progress.js');
const { runtime } = require('./ui-runtime.cjs');

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
