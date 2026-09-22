const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Kitchen}=require('../game-core.js');
test('prep course stays untimed, validates food, retains excess, completes and resets',()=>{
 const g=new Kitchen(Math.random,'prep-school');g.tick(500);g.startService();g.addOrder();
 assert.equal(g.phase,'training');assert.equal(g.time,0);assert.equal(g.orders.length,0);
 assert.ok(!g.stations.some(s=>['wok','plates'].includes(s.type)));
 g.interact('greens');g.interact('serve');assert.equal(g.held.id,'greens');
 g.interact('board');g.interact('greens');g.interact('board');g.interact('greens');g.interact('board');g.tick(3.61,'board');g.interact('board');g.interact('serve');assert.equal(g.delivered.choppedGreens,3);
 g.held={id:'choppedGreens'};g.interact('serve');assert.equal(g.held.id,'choppedGreens');
 g.held={id:'choppedScallion',count:3};g.paused=true;g.interact('serve');assert.equal(g.served,3);
 g.paused=false;g.interact('serve');assert.equal(g.phase,'ended');assert.equal(g.held.count,1);assert.equal(g.served,5);
 g.interact('serve');assert.equal(g.served,5);g.reset();assert.deepEqual(g.delivered,{});
});
