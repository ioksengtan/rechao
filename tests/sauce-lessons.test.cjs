const {test}=require('node:test');const assert=require('node:assert/strict');const core=require('../game-core.js');
for(const [id,recipe] of Object.entries(core.SAUCE_RECIPES))test(id+' lesson: raw ingredients, chopping, mixing, storing and delivery',()=>{
 const g=new core.Kitchen(()=>.5,id+'-school'), bowl=g.stations.find(s=>s.type==='sauceMix');
 assert.equal(g.level.course,'sauces');assert.ok(g.stations.some(s=>s.supply==='miso'));
 for(const [ingredient,n] of Object.entries(recipe.parts)){
  const source=Object.keys(core.ITEMS).find(k=>core.ITEMS[k].processed===ingredient)||ingredient;
  for(let i=0;i<n;i++){g.interact(source);if(source!==ingredient){g.interact('board');g.tick(2.1,'board');g.interact('board');}g.interact('sauce-bowl');}
 }
 assert.ok(core.sauceMixReady(g.level,bowl));g.tick(1,'sauce-bowl');assert.equal(bowl.item,null);g.paused=true;g.tick(3,'sauce-bowl');assert.equal(bowl.item,null);g.paused=false;g.tick(1.1,'sauce-bowl');
 g.interact('sauce-bowl');assert.equal(g.held.id,id);g.interact('counter2');g.interact('counter2');g.interact('serve');assert.equal(g.phase,'ended');assert.equal(g.served,1);
 g.reset();assert.deepEqual(g.stations.find(s=>s.type==='sauceMix').mix,{});
});
test('incomplete, wrong, raw and excessive ingredients cannot become sauce; trash resets bowl',()=>{
 const g=new core.Kitchen(()=>.5,'fiveFlavor-school'),b=g.stations.find(s=>s.type==='sauceMix');
 g.interact('scallion');g.interact('sauce-bowl');assert.equal(g.held.id,'scallion');g.interact('scallion');
 g.interact('ketchup');g.interact('serve');assert.equal(g.served,0);g.interact('sauce-bowl');g.tick(3,'sauce-bowl');assert.equal(b.item,null);
 for(let i=0;i<3;i++){g.interact('ketchup');g.interact('sauce-bowl');}g.tick(3,'sauce-bowl');assert.equal(b.item,null);g.interact('trash');assert.deepEqual(b.mix,{});
});

test('new sauce lessons save completion and retain it after reload',()=>{
 const {Progress}=require('../progress.js');const saved=new Map();const storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 const p=new Progress(storage);for(const id of Object.keys(core.SAUCE_RECIPES)){p.record(id+'-school',0,3);assert.equal(new Progress(storage).records[id+'-school'].stars,3);}
});
