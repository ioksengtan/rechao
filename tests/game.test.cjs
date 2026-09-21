const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Kitchen, canAdd, recipeFor } = require('../game-core.js');
const advance = (g, seconds, station) => { for(let i=0;i<Math.ceil(seconds*100);i++)g.tick(.01,station); };
function addChopped(g, item) { g.interact(item);g.interact('board');advance(g,2.01,'board');g.interact('board');g.interact('wok'); }
test('complete greens lifecycle: chop, cook, flip, plate, serve and recover plate',()=>{
  const g=new Kitchen();g.startService();addChopped(g,'greens');assert.equal(recipeFor(g.wok.ingredients),'greens');g.action('wok');advance(g,2.2);g.action('wok');assert.equal(g.flips,1);advance(g,2.9);assert.equal(g.wok.state,'ready');g.interact('plates');g.interact('wok');assert.equal(g.held.id,'greensDish');g.interact('serve');assert.equal(g.served,1);assert.ok(g.revenue>88);assert.equal(g.plates,3);assert.equal(g.held,null);advance(g,5.01);assert.equal(g.plates,4);
});
test('fried rice accepts any ingredient order but rejects raw greens and duplicate ingredients',()=>{
  assert.equal(canAdd([], 'greens'),false);assert.equal(canAdd(['egg'],'egg'),false);
  const g=new Kitchen();g.interact('egg');g.interact('wok');g.interact('rice');g.interact('wok');addChopped(g,'scallion');g.action('wok');advance(g,7.01);assert.equal(g.wok.state,'ready');g.interact('plates');g.interact('wok');assert.equal(g.held.id,'riceDish');
});
test('invalid delivery preserves held dish; matching selects most urgent order exactly once',()=>{
  const g=new Kitchen();g.held={id:'riceDish'};g.serve();assert.equal(g.held.id,'riceDish');assert.equal(g.revenue,0);g.addOrder('rice');g.addOrder('rice');g.orders[1].remaining=10;g.serve();assert.equal(g.orders[0].id,1);assert.equal(g.served,1);g.serve();assert.equal(g.served,1);
});
test('pausing freezes order, cooking, session and plate return clocks',()=>{
  const g=new Kitchen();g.startService();g.returns=[4];addChopped(g,'greens');g.action('wok');g.paused=true;const before=JSON.stringify(g);g.tick(30,'board');assert.equal(JSON.stringify(g),before);
});
test('burned food cannot be plated, cleaning restores usable empty wok',()=>{
  const g=new Kitchen();addChopped(g,'greens');g.action('wok');advance(g,13.1);assert.equal(g.wok.state,'burned');g.interact('plates');g.interact('wok');assert.equal(g.held.id,'plate');g.interact('plates');advance(g,2.01,'wok');assert.equal(g.wok.state,'empty');assert.equal(g.burned,1);
});
test('discarding a plated dish retains the plate',()=>{
  const g=new Kitchen();g.plates--;g.held={id:'greensDish'};g.interact('trash');assert.equal(g.held.id,'plate');g.interact('plates');assert.equal(g.plates,4);
});
test('closing never generates new orders, finishes once and reset clears previous session',()=>{
  const g=new Kitchen();g.startService();g.time=.01;g.tick(.02);assert.equal(g.phase,'closing');const id=g.nextId;advance(g,10);assert.equal(g.nextId,id);g.time=.01;g.tick(.02);assert.equal(g.phase,'ended');const failures=g.expired;g.finish();g.tick(100);assert.equal(g.expired,failures);g.reset();assert.equal(g.phase,'prep');assert.equal(g.plates,4);assert.equal(g.orders.length,0);assert.equal(g.revenue,0);assert.equal(g.expired,0);
});
test('partial chopping persists when stepping away, held objects prevent chopping',()=>{
  const g=new Kitchen();g.interact('greens');g.interact('board');advance(g,.75,'board');const b=g.stations.find(s=>s.id==='board');const p=b.progress;advance(g,1);assert.equal(b.progress,p);g.interact('egg');advance(g,2,'board');assert.equal(b.progress,p);
});
test('incomplete recipe can be cleared without trapping the station',()=>{
  const g=new Kitchen();g.interact('egg');g.interact('wok');g.action('wok');advance(g,2.01,'wok');assert.equal(g.wok.state,'empty');assert.equal(g.wasted,1);
});
