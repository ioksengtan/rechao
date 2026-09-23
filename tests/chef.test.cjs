const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Kitchen, RECIPES, getChefModifiers, chopDuration } = require('../game-core.js');
const maxed = { stats: { knife: 100, heat: 100, season: 100, charm: 100, control: 100 } };

test('the default chef keeps the standard rules', () => {
  assert.deepEqual(getChefModifiers(null), { chopTime: 2, flipStart: .4, flipEnd: .85, qualityBonus: .1, patience: 1, burnTime: 8 });
  assert.deepEqual(getChefModifiers({ stats: {} }), getChefModifiers(null));
  assert.deepEqual(new Kitchen(() => .5, 'opening').mods, getChefModifiers(null));
});

test('stats are clamped and reach the documented caps', () => {
  const m = getChefModifiers(maxed);
  assert.equal(m.chopTime, 1.4); assert.equal(+m.flipStart.toFixed(2), .3); assert.equal(m.flipEnd, .9);
  assert.equal(m.qualityBonus, .2); assert.equal(m.patience, 1.2); assert.equal(m.burnTime, 12);
  assert.deepEqual(getChefModifiers({ stats: { knife: 500, heat: -20, season: 'x' } }), getChefModifiers({ stats: { knife: 100 } }));
});

test('a chef card changes service play but never a training lesson', () => {
  const g = new Kitchen(() => .5, 'opening');
  g.reset('opening', maxed);
  assert.equal(g.mods.burnTime, 12);
  g.startService();
  assert.equal(g.orders[0].total, Math.round(RECIPES.greens.patience * 1.2));
  g.reset('prep-school');
  assert.equal(g.chef, maxed, 'reset keeps the chosen chef');
  assert.deepEqual(g.mods, getChefModifiers(null));
  g.reset('opening', null);
  assert.deepEqual(g.mods, getChefModifiers(null));
});

test('knife, heat, season and control change the kitchen timings', () => {
  const g = new Kitchen(() => .5, 'opening'); g.reset('opening', maxed); g.startService(); g.orders = []; g.spawnTime = 999;
  g.held = { id: 'greens' }; g.interact('board');
  assert.equal(chopDuration(g.stations.find(s => s.id === 'board').item, g.mods), 1.4);
  g.tick(1.41, 'board'); g.interact('board'); assert.equal(g.held.id, 'choppedGreens');
  g.interact('wok'); g.action('wok');
  g.tick(RECIPES.greens.cookTime * .32); g.action('wok');
  assert.equal(g.wok.flipped, true, 'flip window opens at 30%');
  g.tick(RECIPES.greens.cookTime * .68 + .01);
  g.tick(11.9); assert.equal(g.wok.state, 'ready', 'control delays burning');
  g.addOrder('greens'); g.interact('plates'); g.interact('wok'); g.serve();
  assert.equal(g.revenue, 80 + 16 + 16, 'full speed bonus plus a 20% quality bonus');
});
