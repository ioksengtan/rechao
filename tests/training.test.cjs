const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Kitchen, MIX_TIME}=require('../game-core.js');
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
test('sauce course measures spoons, rejects over-pour, delivers portions and resets',()=>{
 const g=new Kitchen(Math.random,'sauce-school');g.tick(500);g.startService();g.addOrder();
 assert.equal(g.level.course,'sauces');assert.equal(g.level.measure,'sauce');assert.equal(g.phase,'training');assert.equal(g.time,0);assert.equal(g.orders.length,0);
 assert.ok(!g.stations.some(s=>['wok','plates','board'].includes(s.type)));
 assert.deepEqual(g.stations.map(s=>s.id).sort(),['counter','sauce','serve','soy','trash']);
 assert.equal(g.stations.find(s=>s.id==='counter').name,'量杯區');
 const friday=new Kitchen(Math.random,'friday');assert.equal(friday.stations.some(s=>s.supply==='soy'),false);
 const cup=()=>g.stations.find(s=>s.id==='counter');
 g.interact('sauce');assert.equal(g.held.bottle,true);g.interact('serve');assert.equal(g.held.id,'sauce');assert.equal(g.delivered.saucePortion,undefined);
 g.interact('counter');g.interact('counter');assert.equal(cup().spoons,2);assert.equal(g.held.bottle,true);
 g.interact('counter');assert.equal(g.held.id,'saucePortion');assert.equal(cup().spoons,0);
 g.interact('serve');assert.equal(g.delivered.saucePortion,1);assert.equal(g.served,1);
 g.interact('soy');g.action('counter');assert.equal(cup().spoons,1);assert.match(g.events.at(-1).text,/剛好 1 大匙/);
 g.action('counter');assert.equal(cup().spoons,2);assert.match(g.events.at(-1).text,/超過/);
 g.interact('counter');assert.equal(g.held.bottle,true);assert.equal(cup().spoons,3);
 g.interact('soy');assert.equal(g.held,null);g.interact('counter');assert.equal(g.held,null);assert.match(g.events.at(-1).text,/太多了/);
 g.interact('trash');assert.equal(cup().spoons,0);assert.match(g.events.at(-1).text,/量杯倒掉/);
 g.interact('soy');g.interact('counter');g.interact('counter');assert.equal(g.held.id,'soyPortion');
 g.held={id:'basil'};g.interact('serve');assert.equal(g.held.id,'basil');g.interact('trash');
 g.stations.push({id:'board',type:'board',item:null,progress:0,x:4,y:4,name:'切料砧板'});
 g.held={id:'soy',bottle:true};g.interact('board');assert.equal(g.held.id,'soy');assert.match(g.events.at(-1).text,/醬料不用切/);
 g.held={id:'sauce',bottle:true};g.interact('board');assert.equal(g.held.id,'sauce');assert.match(g.events.at(-1).text,/醬料不用切/);
 g.held={id:'saucePortion',count:3};g.paused=true;g.interact('serve');assert.equal(g.served,1);
 g.paused=false;g.interact('serve');assert.equal(g.delivered.saucePortion,2);assert.equal(g.held.count,2);assert.equal(g.served,2);
 g.held={id:'soyPortion',count:4};g.interact('serve');assert.equal(g.phase,'ended');assert.equal(g.delivered.soyPortion,3);assert.equal(g.held.count,1);assert.equal(g.served,5);
 g.interact('serve');assert.equal(g.served,5);g.reset();assert.deepEqual(g.delivered,{});assert.equal(g.stations.some(s=>s.type==='board'),false);assert.equal(g.stations.find(s=>s.id==='counter').spoons,0);
});
function pour(g,id,times){
 if(!(g.held?.source&&g.held.id===id)){
  if(g.held?.source)g.interact(g.held.id);
  assert.equal(g.held,null);g.interact(id);
 }
 for(let i=0;i<times;i++)g.interact('juice-bar');
}
test('juice course measures slices, cc and cubes, rejects overshoot, accepts cups and resets',()=>{
 const g=new Kitchen(Math.random,'juice-school');g.tick(500);g.startService();g.addOrder();
 assert.equal(g.level.course,'juice');assert.equal(g.level.measure,'juice');assert.equal(g.phase,'training');assert.equal(g.time,0);assert.equal(g.orders.length,0);
 assert.ok(!g.stations.some(s=>['wok','plates','board'].includes(s.type)));
 assert.deepEqual(g.stations.map(s=>s.id).sort(),['counter','ice','juice-bar','lemon','plum','serve','syrup','trash']);
 const friday=new Kitchen(Math.random,'friday');assert.equal(friday.stations.some(s=>['lemon','syrup','ice','plum','juice-bar'].includes(s.id)),false);
 friday.held={id:'lemon'};friday.interact('wok');assert.equal(friday.held.id,'lemon');
 const bar=()=>g.stations.find(s=>s.id==='juice-bar');
 pour(g,'lemon',1);g.interact('lemon');assert.equal(g.held,null);
 g.interact('plum');g.interact('juice-bar');assert.equal(g.held.id,'plum');assert.equal(bar().mix.plum,0);assert.match(g.events.at(-1).text,/一次只調一種/);
 g.interact('trash');g.interact('juice-bar');assert.equal(bar().mix.lemon,0);assert.equal(g.held,null);
 pour(g,'lemon',3);assert.equal(bar().mix.lemon,3);assert.match(g.events.at(-1).text,/超過/);
 g.interact('lemon');assert.equal(g.held,null);
 g.tick(MIX_TIME+.2,'juice-bar');assert.equal(bar().item,null);
 g.interact('juice-bar');assert.equal(bar().mix.lemon,2);assert.match(g.events.at(-1).text,/倒回/);
 g.interact('trash');assert.deepEqual(bar().mix,{lemon:0,plum:0,syrup:0,ice:0});
 pour(g,'lemon',2);pour(g,'syrup',5);pour(g,'ice',3);g.interact('ice');
 assert.equal(bar().mix.syrup,25);
 g.tick(MIX_TIME-.1,'juice-bar');assert.equal(bar().item,null);g.tick(.1);assert.equal(bar().item,null);
 g.paused=true;g.tick(MIX_TIME,'juice-bar');assert.equal(bar().item,null);g.paused=false;
 g.tick(.11,'juice-bar');assert.equal(bar().item.id,'lemonJuice');assert.equal(bar().mix.lemon,0);
 g.interact('lemon');g.interact('juice-bar');assert.equal(g.held.id,'lemon');assert.equal(bar().mix.lemon,0);g.interact('trash');
 g.interact('juice-bar');g.interact('counter');g.interact('counter');g.interact('serve');assert.equal(g.delivered.lemonJuice,1);assert.equal(g.served,1);
 pour(g,'plum',2);pour(g,'syrup',5);pour(g,'ice',3);g.interact('ice');
 g.tick(MIX_TIME+.01,'juice-bar');g.interact('juice-bar');assert.equal(g.held.id,'plumJuice');
 g.paused=true;g.interact('serve');assert.equal(g.served,1);g.paused=false;g.interact('serve');assert.equal(g.delivered.plumJuice,1);assert.equal(g.served,2);
 g.held={id:'sauce'};g.interact('serve');assert.equal(g.held.id,'sauce');g.interact('trash');
 g.held={id:'lemonJuice',count:3};g.interact('serve');assert.equal(g.phase,'ended');assert.equal(g.delivered.lemonJuice,2);assert.equal(g.held.count,2);assert.equal(g.served,3);
 g.interact('serve');assert.equal(g.served,3);g.reset();assert.deepEqual(g.delivered,{});assert.equal(g.phase,'training');assert.deepEqual(g.stations.find(s=>s.id==='juice-bar').mix,{lemon:0,plum:0,syrup:0,ice:0});
});
test('afternoon service still mixes one of each and fries one soy unit',()=>{
 const g=new Kitchen(Math.random,'afternoon');g.startService();
 for (const id of ['lemon','syrup','ice']) { g.interact(id); g.interact('juice-bar'); assert.equal(g.held,null); }
 const bar=g.stations.find(s=>s.id==='juice-bar');
 assert.deepEqual(bar.ingredients,['lemon','syrup','ice']);assert.equal(bar.mix,undefined);
 g.tick(MIX_TIME+.01,'juice-bar');assert.equal(bar.item.id,'lemonJuice');
 g.interact('soy');assert.equal(g.held.bottle,undefined);assert.equal(g.held.id,'soy');
 g.interact('wok');assert.equal(g.held,null);assert.deepEqual(g.wok.ingredients,['soy']);
});
