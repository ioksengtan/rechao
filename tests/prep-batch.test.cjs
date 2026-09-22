const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Kitchen, ITEMS, chopDuration} = require('../game-core.js');
for (const raw of ['greens','scallion','beef','chicken']) for (const n of [1,2,3]) {
 test(`${raw}: chop and transfer ${n} portions without loss`, () => {
  const g = new Kitchen(Math.random, 'friday');
  const b = g.stations.find(s => s.id === 'board');
  for(let i=0;i<n;i++){g.interact(raw);g.interact('board');}
  assert.equal(b.item.count || 1,n);
  const duration=chopDuration(b.item);
  g.tick(duration-.1,'board');assert.equal(b.item.id,raw);
  g.tick(.11,'board');assert.equal(b.item.id,ITEMS[raw].processed);
  g.interact('board');assert.equal(g.held.count || 1,n);
  g.interact('counter');g.interact('counter');g.interact('wok');
  assert.equal(g.wok.ingredients.length,n);assert.equal(g.held,null);
 });
}
test('board limits, mixing, progress reset and pause preserve ingredients',()=>{
 const g=new Kitchen();const b=g.stations.find(s=>s.id==='board');
 g.interact('greens');g.interact('board');g.tick(1,'board');
 g.interact('greens');g.interact('board');assert.equal(b.progress,0);
 g.paused=true;g.tick(10,'board');assert.equal(b.progress,0);g.paused=false;
 g.interact('scallion');g.interact('board');assert.equal(g.held.id,'scallion');assert.equal(b.item.count,2);
 g.interact('counter');g.interact('greens');g.interact('board');
 g.interact('greens');g.interact('board');assert.equal(g.held.id,'greens');assert.equal(b.item.count,3);
 g.interact('trash');g.tick(3.61,'board');
 g.interact('greens');g.interact('board');assert.equal(g.held.id,'greens');assert.equal(b.item.id,'choppedGreens');
});
test('batch overflow rejects entire transfer without losing or duplicating food',()=>{
 const g=new Kitchen();g.held={id:'choppedGreens'};g.interact('wok');
 g.held={id:'choppedGreens',count:3};g.interact('wok');
 assert.equal(g.wok.ingredients.length,1);assert.equal(g.held.count,3);
});
test('counter swaps preserve quantity, dish quality and plates; pause blocks swaps',()=>{
 const g=new Kitchen();const c=g.stations.find(s=>s.id==='counter');
 g.held={id:'choppedGreens',count:3};g.interact('counter');
 g.held={id:'riceDish',quality:true};g.interact('counter');
 assert.equal(g.held.count,3);assert.equal(c.item.quality,true);
 g.interact('counter');assert.equal(g.held.quality,true);assert.equal(c.item.count,3);
 g.paused=true;g.interact('counter');assert.equal(g.held.id,'riceDish');g.paused=false;
 g.interact('trash');g.interact('counter');assert.equal(c.item.id,'plate');assert.equal(g.held.count,3);
 g.reset();assert.equal(g.held,null);assert.equal(g.stations.find(s=>s.id==='counter').item,null);
});
