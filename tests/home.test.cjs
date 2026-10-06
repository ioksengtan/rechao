const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Dinner, DISHES, FRIENDS, INGREDIENTS, warmthLabel } = require('../home.js');

// Cook one dish with the same quality on every step.
function cook(dinner, id, quality = 100, amounts, options) {
  assert.ok(dinner.begin(id, amounts, options), `begin ${id}`);
  for (const step of DISHES[id].steps) dinner.scoreStep(step.id, quality);
  return dinner.plate();
}
const dish = (result, id) => result.dishes.find(d => d.id === id);

test('the fridge holds exactly enough for the menu, and every ingredient has a name', () => {
  for (const friend of Object.values(FRIENDS)) {
    const need = {};
    for (const id of friend.menu) for (const [item, n] of Object.entries(DISHES[id].needs)) need[item] = (need[item] || 0) + n;
    for (const [item, n] of Object.entries(need)) assert.equal(friend.fridge[item], n, item);
    for (const item of Object.keys(friend.fridge)) assert.ok(INGREDIENTS[item], item);
  }
  for (const d of Object.values(DISHES)) {
    assert.ok(d.steps.length >= 2); assert.ok(d.cool > 0);
    for (const step of d.steps) assert.ok(['cut', 'stir', 'timing'].includes(step.kind));
  }
});

test('a careful dinner served hot earns the top rating', () => {
  const d = new Dinner();
  cook(d, 'tomatoEggSoup'); cook(d, 'tomatoEgg'); cook(d, 'garlicGreens');
  const r = d.serve();
  assert.equal(r.stars, 3); assert.equal(r.rating, '還想再來'); assert.equal(r.total, 100);
  assert.deepEqual(r.dishes.map(x => x.id), ['tomatoEgg', 'garlicGreens', 'tomatoEggSoup'], 'results follow the menu order');
  assert.equal(dish(r, 'tomatoEggSoup').liked, true); assert.match(dish(r, 'tomatoEggSoup').line, /最想吃/);
  assert.deepEqual(d.fridge, { tomato: 0, egg: 0, scallion: 0, greens: 0, garlic: 0, chili: 1 });
  assert.equal(d.serve(), false, 'a dinner is served once');
});

test('one stove: dishes are cooked one at a time, steps run in order', () => {
  const d = new Dinner();
  assert.equal(d.begin('noSuchDish'), false);
  assert.ok(d.begin('tomatoEgg'));
  assert.equal(d.begin('garlicGreens'), false, 'the stove is busy');
  assert.equal(d.plate(), false, 'steps are not finished');
  assert.equal(d.scoreStep('cook', 90), false, 'steps cannot be skipped');
  assert.equal(d.nextStep.id, 'cutTomato');
  assert.equal(d.scoreStep('cutTomato', 250).id, 'whisk'); assert.equal(d.active.scores.cutTomato, 100, 'quality is clamped');
  d.scoreStep('whisk', -5); assert.equal(d.active.scores.whisk, 0);
  assert.equal(d.scoreStep('cook', 80), 'ready');
  assert.equal(d.serve(), false, 'cannot serve with a dish still on the stove');
  assert.ok(d.plate()); assert.equal(d.begin('tomatoEgg'), false, 'each dish is cooked once');
  assert.deepEqual(d.remaining, ['garlicGreens', 'tomatoEggSoup']);
});

test('plated dishes cool at their own pace, but never during a pause', () => {
  const d = new Dinner();
  cook(d, 'garlicGreens'); cook(d, 'tomatoEggSoup');
  d.tick(45);
  const greens = d.table.find(x => x.id === 'garlicGreens'), soup = d.table.find(x => x.id === 'tomatoEggSoup');
  assert.equal(greens.warmth, .5); assert.equal(warmthLabel(greens.warmth), '溫的');
  assert.equal(warmthLabel(soup.warmth), '熱騰騰', 'soup holds its heat');
  d.paused = true; d.tick(500); assert.equal(greens.warmth, .5);
  d.paused = false; d.tick(NaN); d.tick(-3); assert.equal(greens.warmth, .5);
  d.tick(1000); assert.equal(greens.warmth, 0); assert.equal(warmthLabel(0), '涼了');
  assert.ok(d.begin('tomatoEgg')); d.tick(60); assert.equal(d.active.warmth, undefined, 'a dish on the stove does not cool');
});

test('cooking order matters: greens first go cold, greens last stay hot', () => {
  const run = order => {
    const d = new Dinner();
    order.forEach((id, i) => { if (i) d.tick(60); cook(d, id); });
    return d.serve();
  };
  const early = run(['garlicGreens', 'tomatoEgg', 'tomatoEggSoup']), late = run(['tomatoEggSoup', 'tomatoEgg', 'garlicGreens']);
  assert.equal(dish(early, 'garlicGreens').warmth, '涼了'); assert.match(dish(early, 'garlicGreens').line, /涼了/);
  assert.equal(dish(late, 'garlicGreens').warmth, '熱騰騰');
  assert.ok(late.total > early.total);
  assert.equal(dish(late, 'tomatoEggSoup').warmth, '熱騰騰', 'soup made first is still hot');
});

test('using extra tomato helps one dish and leaves the soup short', () => {
  const d = new Dinner();
  assert.deepEqual(d.plan('tomatoEgg', { tomato: 9 }).used, { tomato: 3, egg: 3, scallion: 1 }, 'amounts are capped at the dish maximum');
  assert.equal(d.fridge.tomato, 3, 'planning takes nothing');
  cook(d, 'tomatoEgg', 80, { tomato: 3 }); cook(d, 'tomatoEggSoup', 80); cook(d, 'garlicGreens', 80);
  const r = d.serve(), egg = dish(r, 'tomatoEgg'), soup = dish(r, 'tomatoEggSoup');
  assert.deepEqual(egg.extra, ['tomato']); assert.deepEqual(soup.short, ['tomato']);
  assert.match(soup.line, /少了番茄/);
  const plain = new Dinner(); cook(plain, 'tomatoEgg', 80); cook(plain, 'tomatoEggSoup', 80); cook(plain, 'garlicGreens', 80);
  const base = plain.serve();
  assert.equal(egg.score - dish(base, 'tomatoEgg').score, 5); assert.equal(dish(base, 'tomatoEggSoup').score - soup.score, 20);
  assert.ok(base.total > r.total, 'the trade is not worth it');
});

test('the roommate dislikes spicy food and loves soup', () => {
  const d = new Dinner();
  cook(d, 'garlicGreens', 100, undefined, ['chili']);
  assert.equal(d.fridge.chili, 0); assert.ok(d.table[0].tags.includes('spicy'));
  cook(d, 'tomatoEgg'); cook(d, 'tomatoEggSoup');
  const r = d.serve(), greens = dish(r, 'garlicGreens');
  assert.equal(greens.disliked, true); assert.equal(greens.score, 80); assert.match(greens.line, /辣/);
  assert.equal(dish(r, 'tomatoEggSoup').liked, true);
  assert.equal(new Dinner().plan('tomatoEgg', {}, ['chili']).tags.includes('spicy'), false, 'only dishes that offer chili can take it');
});

test('poor technique lowers a dish without blocking the dinner; missing dishes count as zero', () => {
  const d = new Dinner();
  cook(d, 'tomatoEgg', 20);
  const r = d.serve();
  assert.equal(r.dishes.length, 3); assert.equal(dish(r, 'garlicGreens').missing, true); assert.match(dish(r, 'garlicGreens').line, /沒有蒜炒青菜/);
  assert.equal(dish(r, 'tomatoEgg').score, Math.round(20 * .7 + 100 * .3));
  assert.equal(r.stars, 1); assert.equal(r.rating, '普通');
  assert.equal(new Dinner().serve(), false, 'an empty table cannot be served');
});

test('an unknown friend falls back to the roommate; the clock counts live kitchen time', () => {
  const d = new Dinner('nobody');
  assert.equal(d.friendId, 'roommate'); assert.match(d.friend.invite, /喝湯/);
  cook(d, 'tomatoEgg'); d.tick(12.4); d.paused = true; d.tick(30); d.paused = false; d.tick(3);
  assert.equal(d.serve().seconds, 15);
  d.tick(100); assert.equal(d.clock, 15.4, 'time stops after serving');
});
