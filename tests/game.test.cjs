const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Kitchen, canAdd, recipeFor } = require('../game-core.js');
const advance = (g, seconds, station) => { for(let i=0;i<Math.ceil(seconds*100);i++)g.tick(.01,station); };
function addChopped(g, item) { g.interact(item);g.interact('board');advance(g,2.01,'board');g.interact('board');g.interact('wok'); }
test('complete greens lifecycle: chop, cook, flip, plate, serve and recover plate',()=>{
  const g=new Kitchen();g.startService();addChopped(g,'greens');assert.equal(recipeFor(g.wok.ingredients),'greens');g.action('wok');advance(g,2.2);g.action('wok');assert.equal(g.flips,1);advance(g,2.9);assert.equal(g.wok.state,'ready');g.interact('plates');g.interact('wok');assert.equal(g.held.id,'greensDish');g.interact('serve');assert.equal(g.served,1);assert.ok(g.revenue>88);assert.equal(g.plates,3);assert.equal(g.held,null);advance(g,5.01);assert.equal(g.plates,4);
});
test('fried rice accepts any ingredient order but rejects raw greens and a fourth portion',()=>{
  assert.equal(canAdd([], 'greens'),false);assert.equal(canAdd(['egg','egg','egg'],'egg'),false);
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

 test('raw supplies can be returned without waste, but different or prepared ingredients stay held',()=>{
  const g=new Kitchen();g.interact('greens');g.interact('greens');assert.equal(g.held,null);assert.equal(g.wasted,0);
  g.held={id:'greens',count:3};g.interact('greens');assert.equal(g.held,null);
  g.held={id:'choppedGreens',count:2};g.interact('greens');assert.deepEqual(g.held,{id:'choppedGreens',count:2});
  g.held={id:'egg'};g.interact('greens');assert.equal(g.held.id,'egg');
 });
 test('extra island counters store and swap stacks and plates in service and lessons',()=>{
  for(const level of ['opening','prep-school','sauce-school','juice-school']){
    const g=new Kitchen(()=>.5,level);
    for(const id of ['counter2','counter3']){
      g.held={id:'choppedGreens',count:3};g.interact(id);assert.equal(g.held,null);
      g.held={id:'plate'};g.interact(id);assert.deepEqual(g.held,{id:'choppedGreens',count:3});
      g.held=null;g.interact(id);assert.equal(g.held.id,'plate');
    }
  }
 });

test('counter stacks matching ingredients to ten, preserves overflow and retrieves the complete stack',()=>{
 const g=new Kitchen();g.held={id:'choppedGreens'};g.interact('counter');g.held={id:'choppedGreens'};g.interact('counter');
 const s=g.stations.find(s=>s.id==='counter');assert.equal(s.item.count,2);assert.equal(g.held,null);
 g.held={id:'choppedGreens',count:7};g.interact('counter');assert.equal(s.item.count,9);
 g.held={id:'choppedGreens',count:3};g.interact('counter');assert.equal(s.item.count,10);assert.equal(g.held.count,2);
 g.interact('counter');assert.equal(s.item.count,10);assert.equal(g.held.count,2);
 g.interact('counter2');g.interact('counter');assert.equal(g.held.count,10);assert.equal(s.item,null);
 g.interact('wok');assert.equal(g.held.count,7);assert.equal(g.wok.ingredients.length,3);
});
test('bulk raw ingredients on counters do not bypass the three-portion chopping limit',()=>{
 const g=new Kitchen();g.held={id:'greens',count:10};g.interact('counter');g.interact('counter');g.interact('board');
 const b=g.stations.find(s=>s.id==='board');assert.equal(b.item.count,3);assert.equal(g.held.count,7);
 g.interact('board');assert.equal(b.item.count,3);assert.equal(g.held.count,7);
});
test('counter keeps dish quality and measured sources separate instead of merging',()=>{
 const g=new Kitchen();const s=g.stations.find(s=>s.id==='counter');
 for(const pair of [[{id:'greensDish',quality:1},{id:'greensDish',quality:.8}],[{id:'sauce',bottle:true},{id:'sauce',bottle:true}],[{id:'lemon',source:true},{id:'lemon',source:true}],[{id:'soyPortion'},{id:'soyPortion'}]]){
  s.item=pair[0];g.held=pair[1];g.interact('counter');assert.equal(g.held,pair[0]);assert.equal(s.item,pair[1]);
 }
});

test('all levels share the same ingredient inventory, miso is refrigerated and stools are removed',()=>{
 const c=require('../game-core.js');const reference=c.getInteractiveStations(new c.Kitchen().stations).filter(s=>s.type==='supplyGroup').map(s=>[s.id,s.members]);
 for(const level of c.LEVELS)assert.deepEqual(c.getInteractiveStations(new c.Kitchen(()=>.5,level.id).stations).filter(s=>s.type==='supplyGroup').map(s=>[s.id,s.members]),reference);
 assert.ok(reference.find(([id])=>id==='fridge')[1].includes('miso'));assert.deepEqual(c.ROOM_LAYOUT.stools,[]);
});
test('quantity pickup respects limits and keeps large batches intact',()=>{
 const g=new Kitchen();g.takeSupply('greens',10);assert.equal(g.held.count,10);g.interact('board');assert.equal(g.held.count,7);assert.equal(g.stations.find(s=>s.id==='board').item.count,3);
 g.interact('greens');assert.equal(g.held,null);for(const n of [0,11,1.5,NaN]){g.takeSupply('greens',n);assert.equal(g.held,null);}
});
