const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Kitchen, RECIPES, LEVELS, cookDuration, recipeFor } = require('../game-core.js');
function put(g, id, wok = 'wok') { g.held = { id }; g.interact(wok); }
for (const key of Object.keys(RECIPES)) for (const n of [1, 2, 3]) {
  test(`${key}: ${n} portions cook, share quality and serve separately`, () => {
    const levelId = LEVELS.find(l => l.id === 'friday' && l.menu.includes(key)) ? 'friday' : LEVELS.find(l => !l.mode && l.menu.includes(key)).id;
    const g = new Kitchen(() => .5, levelId);
    g.startService(); g.orders = []; g.spawnTime = 999;
    for (let i = 0; i < n; i++) {
      if (g.orders.length < g.level.maxOrders) g.addOrder(key);
      else g.orders.push({ id: g.nextId++, table: 1, recipe: key, remaining: RECIPES[key].patience, total: RECIPES[key].patience });
    }
    for (const id of [...RECIPES[key].ingredients].reverse()) for (let i = 0; i < n; i++) put(g, id);
    assert.equal(recipeFor(g.wok.ingredients), key);
    g.action('wok');
    assert.equal(g.wok.remaining, n);
    const duration = RECIPES[key].cookTime * (1 + .4 * (n - 1));
    assert.equal(cookDuration(g.wok), duration);
    g.tick(duration * .5); g.action('wok');
    assert.equal(g.wok.flipped, true);
    g.tick(duration * .5 + .01);
    assert.equal(g.wok.state, 'ready');
    for (let i = 0; i < n; i++) {
      g.interact('plates'); g.interact('wok');
      assert.equal(g.held.id, RECIPES[key].dish);
      assert.equal(g.held.quality, true);
      if (i < n - 1) assert.equal(g.wok.remaining, n - i - 1);
      g.serve();
    }
    assert.equal(g.served, n); assert.equal(g.orders.length, 0);
    assert.equal(g.wok.state, 'empty'); assert.equal(g.flips, 1);
    assert.equal(g.plates, g.level.plateCount - n);
    g.tick(5.01); assert.equal(g.plates, g.level.plateCount);
  });
}
test('uneven ingredients block cooking; fourth portion and mixed recipes retain held item', () => {
  const g = new Kitchen();
  for (const id of ['rice', 'rice', 'egg', 'choppedScallion']) put(g, id);
  g.action('wok'); assert.equal(g.wok.state, 'loading');
  assert.match(g.missingIngredients(), /雞蛋 ×1/);
  assert.match(g.missingIngredients(), /切好的蔥 ×1/);
  put(g, 'choppedGreens'); assert.equal(g.held.id, 'choppedGreens');
  put(g, 'rice'); put(g, 'rice'); assert.equal(g.held.id, 'rice');
  g.held = null; g.tick(2.01, 'wok'); assert.equal(g.wok.state, 'empty');
});
test('cooking locks portions; plating does not reset burning and other wok stays independent', () => {
  const g = new Kitchen(() => .5, 'friday');
  for (let i = 0; i < 3; i++) put(g, 'choppedGreens');
  g.action('wok'); put(g, 'choppedGreens'); assert.equal(g.held.id, 'choppedGreens');
  g.interact('wok2'); assert.equal(g.woks.wok2.ingredients.length, 1);
  g.tick(9.1); assert.equal(g.wok.state, 'ready');
  g.tick(2); const before = g.wok.readyTime;
  g.interact('plates'); g.interact('wok');
  assert.equal(g.wok.remaining, 2); assert.equal(g.wok.readyTime, before);
  g.paused = true; g.tick(30); assert.equal(g.wok.readyTime, before);
  g.paused = false; g.tick(6); assert.equal(g.wok.state, 'burned');
  assert.equal(g.held.id, 'greensDish');
  g.interact('trash'); g.interact('wok'); assert.equal(g.held.id, 'plate');
  g.interact('plates'); g.tick(2.01, 'wok'); assert.equal(g.wok.state, 'empty');
  assert.equal(g.woks.wok2.ingredients.length, 1);
  g.reset(); assert.equal(g.wok.remaining, 0);
});
