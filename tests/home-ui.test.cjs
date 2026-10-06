// The home dinner played through the real UI handlers: fridge picker, step close-ups, table and results.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../game-core.js');
const { CUT, STIR, TIMING } = require('../closeup.js');
const { runtime } = require('./ui-runtime.cjs');

const hidden = (ui, id) => ui.nodes[id].classList.contains('hidden');
function open() {
  const ui = runtime();
  ui.nodes['course-tabs'].onclick({ target: { closest: () => ({ dataset: { course: 'home' } }) } });
  assert.equal(ui.game.level.id, 'home-dinner');
  ui.nodes.start.onclick(); ui.frame();
  return ui;
}
function face(ui, id) {
  const s = core.getInteractiveStations(ui.game.stations).find(s => s.id === id);
  ui.player.x = s.x * 60 + 30; ui.player.y = s.y * 60 + 100; ui.player.dx = 0; ui.player.dy = -1; ui.frame();
}
const tap = (ui, key = 'e') => { ui.press(key); ui.release(key); };
const wait = (ui, seconds) => ui.frames(Math.round(seconds * 60));
// The knife position is rendered into the stage; read it back like a player would.
const knife = ui => Number(/cu-knife" style="left:([\d.]+)%/.exec(ui.nodes['closeup-stage'].innerHTML)[1]) / 100;
function playCloseup(ui, kind, well = true) {
  assert.equal(hidden(ui, 'closeup'), false, 'close-up is open');
  if (kind === 'cut') for (const guide of CUT.guides) { if (well) for (let i = 0; i < 600 && Math.abs(knife(ui) - guide) > .012; i++) ui.frame(); tap(ui, ' '); }
  if (kind === 'stir') { for (let i = 0; i < (well ? 10 : 2); i++) { tap(ui, 'f'); ui.frames(3); } wait(ui, STIR.rest); }
  if (kind === 'timing') { tap(ui); wait(ui, TIMING.duration * (well ? (TIMING.low + TIMING.high) / 2 : .15)); tap(ui); }
  assert.match(ui.nodes['closeup-stage'].innerHTML, /cu-score/, 'the score is shown');
  wait(ui, 1.3);
  assert.equal(hidden(ui, 'closeup'), true, 'close-up closes by itself');
}
const PLACE = { cut: 'board', stir: 'counter', timing: 'wok' };
function cook(ui, choice, kinds, well = true) {
  face(ui, 'fridge'); tap(ui);
  assert.equal(hidden(ui, 'dish-picker'), false);
  ui.click('dish-options', { choice: String(choice) });
  assert.equal(hidden(ui, 'dish-picker'), true);
  for (const kind of kinds) { face(ui, PLACE[kind]); tap(ui); playCloseup(ui, kind, well); }
  face(ui, 'serve'); tap(ui);
}

test('the home course opens a calm kitchen with the roommate\'s invitation', () => {
  const ui = open();
  assert.match(ui.nodes['course-tabs'].innerHTML, /來我家吃/);
  assert.match(ui.nodes['level-description'].textContent, /想喝湯/);
  assert.match(ui.nodes['level-goals'].textContent, /三道菜/);
  assert.equal(ui.nodes.clock.textContent, '不限時');
  assert.equal(ui.nodes['order-count'].textContent, '0 / 3 道');
  for (const name of ['番茄炒蛋', '蒜炒青菜', '番茄蛋花湯']) assert.match(ui.nodes.orders.innerHTML, new RegExp(name));
  assert.match(ui.nodes['wok-status'].innerHTML, /番茄 3、雞蛋 4/);
  assert.equal(ui.game.stations.find(s => s.id === 'serve').name, '餐桌');
  face(ui, 'fridge'); assert.match(ui.nodes.interaction.textContent, /打開冰箱/);
  face(ui, 'board'); assert.match(ui.nodes.interaction.textContent, /先到冰箱/);
  tap(ui); assert.equal(hidden(ui, 'closeup'), true, 'no step without a dish');
  face(ui, 'serve'); tap(ui, 'f'); assert.equal(hidden(ui, 'overlay'), true, 'an empty table cannot be served');
});

test('a careful three-dish dinner earns three stars and is saved', () => {
  const ui = open();
  cook(ui, 4, ['cut', 'stir']);            // soup first: it holds its heat
  assert.match(ui.nodes.orders.innerHTML, /已上桌 · 熱騰騰/); assert.equal(ui.nodes['order-count'].textContent, '1 / 3 道');
  cook(ui, 0, ['cut', 'stir', 'timing']);  // tomato and egg
  cook(ui, 0, ['cut', 'timing']);          // greens last, without chili
  face(ui, 'fridge'); assert.match(ui.nodes.interaction.textContent, /開飯/);
  face(ui, 'serve'); assert.match(ui.nodes.interaction.textContent, /F 開飯/);
  tap(ui, 'f');
  assert.equal(hidden(ui, 'overlay'), false); assert.equal(hidden(ui, 'results'), false);
  assert.equal(ui.nodes.stars.textContent, '★★★');
  assert.match(ui.nodes['result-level'].textContent, /還想再來/);
  assert.match(ui.nodes['result-message'].textContent, /室友：/);
  assert.match(ui.nodes['result-stats'].innerHTML, /番茄蛋花湯 · 熱騰騰/); assert.match(ui.nodes['result-stats'].innerHTML, /最想吃這個/);
  assert.equal(hidden(ui, 'next-level'), true); assert.equal(hidden(ui, 'restart'), false);
  assert.match(ui.nodes['best-record'].textContent, /煮了 1 次/);
  assert.equal(JSON.parse(ui.records.get('hot-stir-fry-progress-v2'))['home-dinner'].stars, 3);
  ui.nodes.restart.onclick(); ui.frame();
  assert.equal(hidden(ui, 'overlay'), true); assert.equal(ui.nodes['order-count'].textContent, '0 / 3 道', 'restart starts a fresh dinner');
});

test('the picker is keyboard friendly and offers the chili and extra-tomato variants', () => {
  const ui = open();
  face(ui, 'fridge'); tap(ui);
  const html = () => ui.nodes['dish-options'].innerHTML;
  assert.match(html(), /多放番茄/); assert.match(html(), /加辣椒/);
  assert.match(html(), /data-choice="0" class="selected"/);
  ui.press('s'); assert.match(html(), /data-choice="1" class="selected"/);
  ui.press('w'); ui.press('w'); assert.match(html(), /data-choice="4" class="selected"/, 'selection wraps');
  const x = ui.player.x; ui.press('d'); ui.frames(10); ui.release('d'); assert.equal(ui.player.x, x, 'the cook stands still while choosing');
  ui.press('Escape'); assert.equal(hidden(ui, 'dish-picker'), true); assert.equal(ui.nodes['held-label'].textContent, '雙手空空');
  tap(ui); ui.press('s'); ui.press('Enter');
  assert.equal(hidden(ui, 'dish-picker'), true);
  assert.match(ui.nodes['held-label'].textContent, /番茄炒蛋的食材/);
  assert.match(ui.nodes['wok-status'].innerHTML, /冰箱<\/b><span>雞蛋 1、/, 'the extra tomato leaves none for the soup');
  tap(ui); assert.equal(hidden(ui, 'dish-picker'), true, 'one stove: the fridge stays shut while a dish is in hand');
  face(ui, 'wok'); tap(ui); assert.equal(hidden(ui, 'closeup'), true, 'steps run in order');
  assert.match(ui.nodes.interaction.textContent, /砧板/);
});

test('plated dishes cool while cooking continues, but not during a close-up or pause', () => {
  const ui = open();
  cook(ui, 2, ['cut', 'timing']);          // garlic greens: cools in 90 seconds
  const warmth = () => Number(/width:(\d+)%/.exec(ui.nodes.orders.innerHTML)[1]);
  wait(ui, 9); assert.ok(warmth() <= 91 && warmth() >= 85, `cooled to ${warmth()}%`);
  face(ui, 'fridge'); tap(ui); const before = warmth();
  wait(ui, 3); ui.press('Escape'); ui.frame(); assert.equal(warmth(), before, 'choosing a dish stops the clock');
  tap(ui); ui.click('dish-options', { choice: '0' });
  face(ui, 'board'); tap(ui); const atBoard = warmth();
  wait(ui, 1); ui.nodes.pause.onclick(); wait(ui, 2); ui.nodes.resume.onclick();
  playCloseup(ui, 'cut'); ui.frames(12);
  assert.ok(atBoard - warmth() <= 3, 'a close-up does not cool the table');
  wait(ui, 6); assert.ok(warmth() < atBoard - 4, 'back in the kitchen, it cools again');
});

test('rough technique and an early dinner still finish, with honest feedback', () => {
  const ui = open();
  cook(ui, 0, ['cut', 'stir', 'timing'], false);
  face(ui, 'serve'); assert.match(ui.nodes.interaction.textContent, /還有 2 道沒煮/);
  tap(ui, 'f');
  assert.equal(ui.nodes.stars.textContent, '★☆☆');
  assert.match(ui.nodes['result-stats'].innerHTML, /蒜炒青菜 · 沒上桌/); assert.match(ui.nodes['result-stats'].innerHTML, /今天沒有番茄蛋花湯/);
  ui.nodes['copy-stats'].onclick();
  assert.match(ui.nodes['copy-fallback'].value, /模式：來我家吃/); assert.match(ui.nodes['copy-fallback'].value, /番茄炒蛋：\d+ 分 · 手藝 \d+/);
  ui.nodes['choose-results'].onclick();
  assert.equal(hidden(ui, 'welcome'), false); assert.equal(hidden(ui, 'closeup'), true);
});
