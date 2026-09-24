const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Kitchen, LEVELS, RECIPES, DRINKS, ITEMS, STATIONS, getStations, starCount, canAdd, recipeFor, menuOffer } = require('../game-core.js');
const { Progress } = require('../progress.js');
const { createRenderer } = require('../art.js');
const { runtime } = require('./ui-runtime.cjs');

const afternoon = () => LEVELS.find(l => l.id === 'afternoon');
const OLD_NIGHTS = ['opening', 'rush', 'friday', 'lunch'];

function chopInto(g, raw) {
  g.interact(raw);
  g.interact('board');
  g.tick(2.01, 'board');
  g.interact('board');
  g.interact('wok');
  assert.equal(g.held, null);
}

function mix(g, ids) {
  for (const id of ids) {
    g.interact(id);
    g.interact('juice-bar');
    assert.equal(g.held, null, id + ' accepted by the juice bar');
  }
  g.tick(2.01, 'juice-bar');
  g.interact('juice-bar');
}

test('afternoon is a short service night for greens, onion egg and both juices', () => {
  const level = afternoon();
  assert.equal(level.course, 'service');
  assert.equal(level.mode, undefined);
  assert.equal(level.name, '午後來一杯');
  assert.equal(level.subtitle, '飲料上桌，蔥花蛋也要');
  assert.match(level.description, /果汁和醬油/);
  assert.deepEqual(level.menu, ['greens', 'onionEgg', 'lemonJuice', 'plumJuice']);
  assert.deepEqual(level.firstOrders, ['onionEgg', 'lemonJuice']);
  assert.equal(level.woks, 1);
  assert.equal(level.prepTime, 12);
  assert.equal(level.serviceTime, 100);
  assert.equal(level.closingTime, 30);
  assert.equal(level.maxOrders, 2);
  assert.equal(level.orderInterval, 15);
  assert.equal(level.plateCount, 4);
  assert.deepEqual(level.stars, [100, 280, 520]);
  assert.equal(RECIPES.onionEgg.name, '蔥花蛋');
  assert.deepEqual(RECIPES.onionEgg.ingredients, ['choppedScallion', 'egg', 'soy']);
  assert.equal(RECIPES.onionEgg.cookTime, 6);
  assert.equal(RECIPES.onionEgg.price, 100);
  assert.equal(RECIPES.onionEgg.patience, 85);
  assert.equal(RECIPES.onionEgg.dish, 'onionEggDish');
  assert.equal(ITEMS.onionEggDish.kind, 'dish');
  assert.equal(DRINKS.lemonJuice.price, 70);
  assert.equal(DRINKS.plumJuice.price, 70);
  assert.equal(DRINKS.lemonJuice.patience, 70);
  assert.equal(DRINKS.plumJuice.patience, 70);
  assert.deepEqual(DRINKS.lemonJuice.ingredients, ['lemon', 'syrup', 'ice']);
  assert.deepEqual(DRINKS.plumJuice.ingredients, ['plum', 'syrup', 'ice']);
  for (const id of OLD_NIGHTS) {
    const night = LEVELS.find(l => l.id === id);
    assert.ok(!night.menu.some(key => DRINKS[key] || key === 'onionEgg'), id);
  }
  assert.equal(starCount(99, level), 0);
  assert.equal(starCount(100, level), 1);
  assert.equal(starCount(279, level), 1);
  assert.equal(starCount(280, level), 2);
  assert.equal(starCount(519, level), 2);
  assert.equal(starCount(520, level), 3);
});

test('onion egg cooks from scallion, egg and soy, then plates and serves', () => {
  const g = new Kitchen(() => .5, 'afternoon');
  g.startService();
  g.orders = [];
  g.spawnTime = 999;
  g.addOrder('onionEgg');
  assert.equal(g.orders[0].total, 85);
  chopInto(g, 'scallion');
  g.interact('egg'); g.interact('wok');
  g.interact('soy'); g.interact('wok');
  assert.equal(recipeFor(g.wok.ingredients, g.level.menu), 'onionEgg');
  g.action('wok');
  g.tick(3); g.action('wok');
  assert.equal(g.wok.flipped, true);
  g.tick(3.01);
  assert.equal(g.wok.state, 'ready');
  g.interact('plates'); g.interact('wok');
  assert.equal(g.held.id, 'onionEggDish');
  assert.equal(g.held.quality, true);
  assert.equal(g.plates, 3);
  const order = g.orders[0];
  const expected = 100 + Math.round(100 * .2 * order.remaining / order.total) + 10;
  g.interact('serve');
  assert.equal(g.served, 1);
  assert.equal(g.orders.length, 0);
  assert.equal(g.revenue, expected);
  assert.ok(expected > 100 && expected < 130, 'patience has ticked, and the flip bonus is still included');
  assert.equal(g.held, null);
  g.tick(5.01);
  assert.equal(g.plates, 4);
});

test('service drinks mix at the juice bar and pay patience without a plate or flip bonus', () => {
  const g = new Kitchen(() => .5, 'afternoon');
  g.startService();
  g.orders = [];
  g.spawnTime = 999;
  assert.equal(g.plates, 4);
  g.addOrder('lemonJuice');
  mix(g, ['lemon', 'syrup', 'ice']);
  assert.equal(g.held.id, 'lemonJuice');
  assert.equal(g.plates, 4);
  g.held.quality = true;
  g.serve();
  assert.equal(g.served, 1);
  assert.equal(g.revenue, 84);
  assert.equal(g.held, null);
  assert.equal(g.plates, 4);
  g.tick(6);
  assert.equal(g.plates, 4, 'a drink does not send a plate to the washer');
  g.addOrder('plumJuice');
  g.held = { id: 'lemonJuice', quality: true };
  g.serve();
  assert.equal(g.served, 1);
  assert.equal(g.held.id, 'lemonJuice');
  assert.equal(g.revenue, 84);
  g.interact('trash');
  assert.equal(g.held, null);
  mix(g, ['plum', 'syrup', 'ice']);
  assert.equal(g.held.id, 'plumJuice');
  g.serve();
  assert.equal(g.served, 2);
  assert.equal(g.revenue, 168);
  assert.equal(g.orders.length, 0);
});

test('juice ids are not wok recipes, and greens still plate on the afternoon night', () => {
  const menu = afternoon().menu;
  assert.equal(recipeFor(['lemon', 'syrup', 'ice'], menu), undefined);
  assert.equal(recipeFor(['choppedScallion', 'egg', 'soy'], menu), 'onionEgg');
  assert.equal(canAdd([], 'lemon', menu), false);
  assert.equal(canAdd([], 'lemonJuice', menu), false);
  assert.equal(canAdd([], 'soy', menu), true);
  assert.equal(canAdd(['choppedScallion', 'egg'], 'soy', menu), true);
  const g = new Kitchen(() => .5, 'afternoon');
  g.held = { id: 'lemon' }; g.interact('wok');
  assert.equal(g.held.id, 'lemon');
  assert.equal(g.wok.ingredients.length, 0);
  g.held = { id: 'lemonJuice' }; g.interact('wok');
  assert.equal(g.held.id, 'lemonJuice');
  g.held = null;
  g.startService();
  g.orders = [];
  g.spawnTime = 999;
  g.addOrder('greens');
  chopInto(g, 'greens');
  g.action('wok');
  g.tick(5.01);
  g.interact('plates'); g.interact('wok');
  assert.equal(g.held.id, 'greensDish');
  g.serve();
  assert.equal(g.served, 1);
  assert.ok(g.revenue >= 80);
});

test('opening night still hides soy and juice gear; afternoon places both board and juice bar', () => {
  const trainingIds = ['soy', 'lemon', 'syrup', 'ice', 'plum', 'juice-bar'];
  for (const id of OLD_NIGHTS) {
    const stations = getStations(LEVELS.find(l => l.id === id));
    assert.ok(trainingIds.every(stationId => !stations.some(s => s.id === stationId)), id);
  }
  const lesson = getStations(LEVELS.find(l => l.id === 'juice-school'));
  assert.deepEqual(lesson.find(s => s.id === 'lemon'), expectStation(lesson, 'lemon', 1, 1));
  assert.equal(lesson.find(s => s.id === 'juice-bar').x, 4);
  assert.equal(lesson.find(s => s.id === 'juice-bar').y, 4);
  assert.equal(lesson.find(s => s.id === 'serve').name, '驗收檯');
  assert.ok(!lesson.some(s => s.id === 'board'));

  const g = new Kitchen(() => .5, 'afternoon');
  assert.equal(g.stations.find(s => s.id === 'serve').name, '出餐口');
  assert.equal(g.stations.find(s => s.id === 'board').x, 4);
  assert.equal(g.stations.find(s => s.id === 'board').y, 4);
  assert.equal(g.stations.find(s => s.id === 'juice-bar').x, 4);
  assert.equal(g.stations.find(s => s.id === 'juice-bar').y, 6);
  assert.deepEqual(g.stations.find(s => s.id === 'juice-bar').ingredients, []);
  assert.deepEqual(
    ['lemon', 'syrup', 'ice', 'plum'].map(id => [id, g.stations.find(s => s.id === id).x, g.stations.find(s => s.id === id).y]),
    [['lemon', 7, 1], ['syrup', 9, 1], ['ice', 11, 1], ['plum', 13, 1]]
  );
  assert.equal(g.stations.find(s => s.id === 'soy').x, 12);
  assert.equal(g.stations.find(s => s.id === 'soy').y, 3);
  const stations = g.stations;
  for (let i = 0; i < stations.length; i++) for (let j = i + 1; j < stations.length; j++) {
    const a = stations[i], b = stations[j];
    const overlaps = Math.abs(a.x - b.x) * 60 < 90 && Math.abs(a.y - b.y) * 60 < 84;
    assert.equal(overlaps, false, `${a.id} overlaps ${b.id}`);
  }
  assert.ok(STATIONS.filter(s => s.training && s.id !== 'soy' && !['lemon', 'syrup', 'ice', 'plum', 'juice-bar'].includes(s.id)).length === 0);
});

function expectStation(stations, id, x, y) {
  const station = stations.find(s => s.id === id);
  assert.equal(station.x, x);
  assert.equal(station.y, y);
  return station;
}

test('afternoon orders, stars and best score are stored, and guests call the drink by name', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  let progress = new Progress(storage);
  assert.deepEqual(progress.records.afternoon, { revenue: 0, stars: 0, runs: 0 });
  progress.record('afternoon', 520, 3);
  progress = new Progress(storage);
  assert.deepEqual(progress.records.afternoon, { revenue: 520, stars: 3, runs: 1 });

  const renderer = createRenderer({ save() {}, restore() {} }, require('../game-core.js'));
  const g = new Kitchen(() => .5, 'afternoon');
  g.startService();
  renderer.observe(g);
  const shouts = renderer.state.effects.filter(fx => fx.kind === 'bubble').map(fx => fx.text).join(' ');
  assert.match(shouts, /蔥花蛋一份/);
  assert.match(shouts, /冰檸檬汁一杯/);
  assert.equal(menuOffer('lemonJuice').kind, 'drink');
  assert.equal(menuOffer('onionEgg').kind, 'dish');
});

test('the service course lists 午後來一杯 without putting juice on the older nights', () => {
  const ui = runtime();
  ui.click('course-tabs', { course: 'service' });
  const cards = ui.nodes['level-list'].innerHTML;
  assert.match(cards, /午後來一杯/);
  assert.match(cards, /飲料上桌，蔥花蛋也要/);
  assert.match(cards, /2 道菜 · 2 杯飲料 · 1 口炒鍋/);
  ui.select('lunch');
  assert.doesNotMatch(ui.nodes['recipe-list'].innerHTML, /冰檸檬汁|蔥花蛋|醬油/);
  ui.select('afternoon');
  assert.match(ui.nodes['shift-title'].textContent, /午後來一杯 \/ NIGHT 05/);
  assert.match(ui.nodes['level-timing'].textContent, /12 秒備料 · 1 分 40 秒營業 · 最多 30 秒收尾/);
  assert.match(ui.nodes['level-goals'].textContent, /1 星 \$100/);
  assert.match(ui.nodes['level-goals'].textContent, /2 星 \$280/);
  assert.match(ui.nodes['level-goals'].textContent, /3 星 \$520/);
  const recipes = ui.nodes['recipe-list'].innerHTML;
  assert.match(recipes, /蔥花蛋/);
  assert.match(recipes, /冰檸檬汁/);
  assert.match(recipes, /冰梅子汁/);
  assert.match(recipes, /清炒青菜/);
  assert.match(recipes, /不用餐盤/);
  assert.match(recipes, /assets\/lemonJuice\.svg/);
  assert.match(recipes, /assets\/onionEgg\.svg/);
  assert.doesNotMatch(recipes, /冰檸檬汁[\s\S]*炒 1／2／3 份/);
  ui.nodes.start.onclick();
  ui.game.startService();
  ui.frames(12);
  assert.match(ui.nodes.orders.innerHTML, /蔥花蛋/);
  assert.match(ui.nodes.orders.innerHTML, /冰檸檬汁/);
  assert.match(ui.nodes.orders.innerHTML, /醬油/);
  assert.match(ui.nodes.orders.innerHTML, /檸檬片/);
  assert.ok(ui.game.stations.some(s => s.id === 'soy' && s.name === '醬油'));
  assert.ok(ui.game.stations.some(s => s.id === 'juice-bar' && s.name === '果汁調配台'));
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  assert.match(readme, /午後來一杯/);
  assert.match(readme, /果汁與醬油/);
  assert.match(readme, /第一晚開張、晚餐尖峰、滿座週五夜、午休小局/);
});
