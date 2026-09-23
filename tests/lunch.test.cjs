const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Kitchen, LEVELS, RECIPES, STATIONS, getStations, starCount } = require('../game-core.js');
const { Progress } = require('../progress.js');
const { createPlayer, blocked, findTarget } = require('../movement.js');
const { runtime } = require('./ui-runtime.cjs');

const lunch = () => LEVELS.find(l => l.id === 'lunch');

test('lunch is a short greens-and-rice service night', () => {
  const level = lunch();
  const opening = LEVELS.find(l => l.id === 'opening');
  assert.equal(level.course, 'service');
  assert.equal(level.mode, undefined);
  assert.equal(level.name, '午休小局');
  assert.equal(level.subtitle, '通勤一局，十分鐘內打烊');
  assert.deepEqual(level.menu, ['greens', 'rice']);
  assert.deepEqual(level.firstOrders, ['greens', 'rice']);
  assert.equal(level.woks, 1);
  assert.equal(level.prepTime, 10);
  assert.equal(level.serviceTime, 90);
  assert.equal(level.closingTime, 30);
  assert.equal(level.maxOrders, 2);
  assert.equal(level.orderInterval, 14);
  assert.equal(level.plateCount, 4);
  assert.deepEqual(level.stars, [80, 200, 450]);
  assert.equal(opening.serviceTime, 180);
  assert.deepEqual(opening.stars, [160, 450, 900]);
  assert.equal(LEVELS.find(l => l.id === 'rush').serviceTime, 180);
  assert.equal(LEVELS.find(l => l.id === 'friday').serviceTime, 180);
  assert.deepEqual(LEVELS.filter(l => l.mode === 'training').map(l => l.id), ['prep-school', 'spice-school', 'sauce-school', 'juice-school']);
});

test('lunch star thresholds stay fair for a 90 second greens-and-rice service', () => {
  const level = lunch();
  const opening = LEVELS.find(l => l.id === 'opening');
  assert.equal(starCount(0, level), 0);
  assert.equal(starCount(level.stars[0] - 1, level), 0);
  assert.equal(starCount(RECIPES.greens.price, level), 1, 'one plain greens plate is the first star');
  assert.equal(starCount(RECIPES.rice.price, level), 1, 'one rice plate is not yet two stars');
  assert.equal(starCount(RECIPES.greens.price + RECIPES.rice.price, level), 2, 'the opening pair at menu price is two stars');
  assert.equal(starCount(level.stars[2] - 1, level), 2);
  assert.equal(starCount(level.stars[2], level), 3);
  assert.equal(level.stars[0], opening.stars[0] / 2);
  assert.ok(level.stars[1] < opening.stars[1] / 2, 'two stars sits under half of opening so both plates clear it without a perfect flip');
  assert.equal(level.stars[2], opening.stars[2] / 2);
  assert.ok(level.stars.every((score, i) => i === 0 || score > level.stars[i - 1] + 1));
});

test('lunch reset clears a previous night and only opens greens and rice stations', () => {
  const g = new Kitchen(() => .5, 'friday');
  g.interact('egg'); g.interact('wok2'); g.revenue = 900; g.startService();
  g.reset('lunch');
  assert.equal(g.level.id, 'lunch');
  assert.equal(g.phase, 'prep');
  assert.equal(g.time, 10);
  assert.equal(g.plates, 4);
  assert.equal(g.revenue, 0);
  assert.equal(g.held, null);
  assert.equal(g.orders.length, 0);
  assert.equal(g.spawnTime, 14);
  assert.deepEqual(Object.keys(g.woks), ['wok']);
  assert.equal(g.wok.state, 'empty');
  assert.equal(g.stations.some(s => s.id === 'wok2' || s.id === 'board2'), false);
  assert.ok(STATIONS.filter(s => s.training).every(s => !g.stations.some(station => station.id === s.id)));
  assert.deepEqual(g.stations.map(s => s.id), ['greens', 'egg', 'scallion', 'rice', 'board', 'counter', 'wok', 'plates', 'serve', 'trash']);
  g.held = { id: 'soy' }; g.serve(); assert.equal(g.served, 0); assert.equal(g.held.id, 'soy');
  g.held = { id: 'lemonJuice' }; g.serve(); assert.equal(g.served, 0); assert.equal(g.held.id, 'lemonJuice');
  g.held = null;
  g.startService();
  assert.equal(g.phase, 'service');
  assert.equal(g.time, 90);
  assert.deepEqual(g.orders.map(o => o.recipe), ['greens', 'rice']);
  g.time = .01; g.tick(.02);
  assert.equal(g.phase, 'closing');
  assert.equal(g.time, 30);
  assert.equal(g.orders.length, 2, 'closing does not add another order');
});

test('every lunch workstation is reachable and the best score is stored', () => {
  const stations = getStations(lunch());
  const start = createPlayer();
  assert.equal(blocked(start.x, start.y, stations), false);
  const queue = [[start.x, start.y]], seen = new Set([`${start.x},${start.y}`]), reachable = new Set();
  for (let index = 0; index < queue.length; index++) {
    const [x, y] = queue[index];
    for (const s of stations) {
      const dx = s.x * 60 + 30 - x, dy = s.y * 60 + 30 - y, len = Math.hypot(dx, dy);
      if (len < 93) { const t = findTarget({ x, y, dx: dx / len, dy: dy / len }, stations); if (t) reachable.add(t.id); }
    }
    for (const [dx, dy] of [[15, 0], [-15, 0], [0, 15], [0, -15]]) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (!seen.has(key) && !blocked(nx, ny, stations)) { seen.add(key); queue.push([nx, ny]); }
    }
  }
  assert.deepEqual([...reachable].sort(), stations.map(s => s.id).sort());

  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  let progress = new Progress(storage);
  assert.deepEqual(progress.records.lunch, { revenue: 0, stars: 0, runs: 0 });
  progress.record('lunch', 450, 3);
  progress.record('lunch', 80, 1);
  progress = new Progress(storage);
  assert.deepEqual(progress.records.lunch, { revenue: 450, stars: 3, runs: 2 });
});

test('lunch is listed under service without changing the other nights or lesson labels', () => {
  const ui = runtime();
  ui.select('prep-school');
  assert.match(ui.nodes['shift-title'].textContent, /NIGHT 04/);
  ui.click('course-tabs', { course: 'service' });
  const cards = ui.nodes['level-list'].innerHTML;
  assert.match(cards, /第一晚開張/);
  assert.match(cards, /晚餐尖峰/);
  assert.match(cards, /滿座週五夜/);
  assert.match(cards, /午休小局/);
  assert.match(cards, /通勤一局，十分鐘內打烊/);
  ui.select('friday');
  assert.match(ui.nodes['shift-title'].textContent, /NIGHT 03/);
  ui.select('lunch');
  assert.equal(ui.game.level.id, 'lunch');
  assert.match(ui.nodes['shift-title'].textContent, /午休小局 \/ NIGHT 04/);
  assert.match(ui.nodes['level-goals'].textContent, /1 星 \$80/);
  assert.match(ui.nodes['level-goals'].textContent, /2 星 \$200/);
  assert.match(ui.nodes['level-goals'].textContent, /3 星 \$450/);
  assert.match(ui.nodes['level-timing'].textContent, /10 秒備料 · 1\.5 分鐘營業 · 最多 30 秒收尾/);
  assert.match(ui.nodes['recipe-list'].innerHTML, /清炒青菜/);
  assert.match(ui.nodes['recipe-list'].innerHTML, /黃金蛋炒飯/);
  assert.doesNotMatch(ui.nodes['recipe-list'].innerHTML, /蔥爆牛肉|三杯雞|果汁|醬油/);
  ui.nodes.start.onclick();
  assert.equal(ui.game.phase, 'prep');
  assert.equal(ui.game.time, 10);
  assert.equal(Object.keys(ui.game.woks).length, 1);
  ui.frame();
  assert.equal(ui.game.phase, 'prep');
  assert.ok(ui.game.time < 10 && ui.game.time > 9);
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  assert.match(readme, /Current version: 0\.11\.0/);
  assert.match(readme, /午休小局/);
  assert.match(readme, /\$80／\$200／\$450/);
});
