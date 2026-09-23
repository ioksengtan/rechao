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
test('spice course stays untimed, chops scallion only, retains excess, completes and resets',()=>{
 const g=new Kitchen(Math.random,'spice-school');g.tick(500);g.startService();g.addOrder();
 assert.equal(g.level.course,'spices');assert.equal(g.phase,'training');assert.equal(g.time,0);assert.equal(g.orders.length,0);
 assert.ok(!g.stations.some(s=>['wok','plates'].includes(s.type)));
 assert.deepEqual(g.stations.map(s=>s.id).sort(),['basil','board','counter','scallion','serve','trash']);
 g.interact('scallion');g.interact('serve');assert.equal(g.held.id,'scallion');assert.equal(g.served,0);
 g.interact('trash');g.interact('basil');g.interact('board');assert.equal(g.held.id,'basil');assert.match(g.events.at(-1).text,/九層塔不用切/);
 g.interact('serve');assert.equal(g.delivered.basil,1);g.held={id:'sauce'};g.interact('serve');assert.equal(g.held.id,'sauce');
 g.interact('trash');g.interact('scallion');g.interact('board');g.interact('scallion');g.interact('board');g.interact('scallion');g.interact('board');
 g.tick(3.61,'board');g.interact('board');assert.equal(g.held.id,'choppedScallion');assert.equal(g.held.count,3);
 g.paused=true;g.interact('serve');assert.equal(g.served,1);
 g.paused=false;g.interact('serve');assert.equal(g.delivered.choppedScallion,2);assert.equal(g.held.count,1);assert.equal(g.served,3);
 g.held={id:'basil',count:3};g.interact('serve');assert.equal(g.phase,'ended');assert.equal(g.delivered.basil,3);assert.equal(g.held.count,1);assert.equal(g.served,5);
 g.interact('serve');assert.equal(g.served,5);g.reset();assert.deepEqual(g.delivered,{});assert.equal(g.phase,'training');
});
