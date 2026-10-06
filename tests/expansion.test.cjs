const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Kitchen, LEVELS, RECIPES, ITEMS, getStations, starCount, menuOffer } = require('../game-core.js');
const { Progress, KEY } = require('../progress.js');
const { createPlayer, blocked, findTarget, movePlayer } = require('../movement.js');

function ingredient(g, raw, wok = 'wok', board = 'board') {
  g.interact(raw);
  assert.equal(g.held?.id, raw, 'ingredient exists in this level');
  if (ITEMS[raw].processed) { g.interact(board); g.tick(2.01, board); g.interact(board); }
  g.interact(wok);
  assert.equal(g.held, null, 'ingredient accepted by selected wok');
}

for (const [key, raw] of [['beef', ['beef', 'scallion']], ['chicken', ['chicken', 'basil', 'sauce']]]) {
  test(`${key}: prepare every ingredient, cook, flip, plate and serve`, () => {
    const g = new Kitchen(() => .5, 'friday'); g.startService();
    raw.forEach(id => ingredient(g, id, 'wok2', 'board2'));
    g.action('wok2'); g.tick(RECIPES[key].cookTime * .5); g.action('wok2');
    g.tick(RECIPES[key].cookTime * .5 + .01);
    assert.equal(g.woks.wok2.state, 'ready');
    assert.equal(g.wok.state, 'empty');
    g.interact('plates'); g.interact('wok2'); assert.equal(g.held.id, RECIPES[key].dish);
    g.interact('serve'); assert.equal(g.served, 1); assert.ok(g.revenue > RECIPES[key].price);
    assert.equal(g.woks.wok2.state, 'empty'); assert.equal(g.flips, 1);
    g.tick(5.01); assert.equal(g.plates, g.level.plateCount);
  });
}

test('two woks cook, flip, burn and clean independently', () => {
  const g = new Kitchen(() => .5, 'friday');
  ingredient(g, 'greens'); ingredient(g, 'chicken', 'wok2'); ingredient(g, 'basil', 'wok2'); ingredient(g, 'sauce', 'wok2');
  g.action('wok'); g.action('wok2'); g.tick(2.2); g.action('wok');
  assert.equal(g.wok.flipped, true); assert.equal(g.woks.wok2.flipped, false);
  g.tick(2.9); assert.equal(g.wok.state, 'ready'); assert.equal(g.woks.wok2.state, 'cooking');
  g.tick(8.1); assert.equal(g.wok.state, 'burned'); assert.equal(g.woks.wok2.state, 'ready');
  g.tick(2.01, 'wok'); assert.equal(g.wok.state, 'empty'); assert.equal(g.woks.wok2.state, 'ready');
  g.interact('plates'); g.interact('wok2'); assert.equal(g.held.id, 'chickenDish'); assert.equal(g.held.quality, false);
  assert.equal(g.burned, 1);
});

test('paused dual-wok session cannot cook, serve, take items or start service', () => {
  const g = new Kitchen(() => .5, 'friday'); ingredient(g, 'greens', 'wok2'); g.action('wok2');
  g.paused = true; const before = JSON.stringify(g); g.tick(100); g.action('wok2'); g.interact('plates'); g.serve(); g.startService();
  assert.equal(JSON.stringify(g), before);
});

test('chopped scallions offer both rice and beef recipes in the later levels', () => {
  const g = new Kitchen(() => .5, 'rush'); ingredient(g, 'scallion');
  assert.match(g.missingIngredients(), /黃金蛋炒飯/); assert.match(g.missingIngredients(), /蔥爆牛肉/);
  ingredient(g, 'beef'); g.action('wok'); assert.equal(g.wok.recipe, 'beef');
});

test('levels restrict supplies, menus, order limits and provide all recipes fairly', () => {
  for (const level of LEVELS) {
    const g = new Kitchen(() => .5, level.id);
    assert.equal(Object.keys(g.woks).length, level.woks);
    if (level.mode === 'training') { g.addOrder(); assert.equal(g.orders.length, 0); assert.ok(!g.stations.some(s => s.type === 'wok' || s.type === 'plates')); continue; }
    assert.deepEqual(g.stations.filter(s=>s.type==='supply').map(s=>s.id),getStations(LEVELS[0]).filter(s=>s.type==='supply').map(s=>s.id));
    const recipes = new Set();
    for (let i=0; i<level.menu.length; i++) { g.addOrder(); recipes.add(g.orders[0].recipe); g.orders = []; }
    assert.deepEqual([...recipes].sort(), [...level.menu].sort());
    for (let i=0;i<10;i++)g.addOrder(); assert.equal(g.orders.length, level.maxOrders);
    g.orders=[]; g.addOrder('not-a-recipe'); assert.equal(g.orders.length,0);
    if (!level.menu.includes('chicken')) { g.addOrder('chicken'); assert.equal(g.orders.length,0); }
  }
});

test('reset into another level clears both woks, plates, board progress and orders', () => {
  const g=new Kitchen(() => .5,'friday');ingredient(g,'egg','wok2');g.interact('chicken');g.interact('board2');g.tick(1,'board2');g.revenue=1000;g.returns=[3];
  g.reset('opening');assert.equal(Object.keys(g.woks).length,1);assert.equal(g.wok.state,'empty');assert.equal(g.plates,4);assert.equal(g.returns.length,0);assert.equal(g.revenue,0);assert.equal(g.held,null);assert.equal(g.stations.some(s=>s.id==='board2'),false);
});

test('service boundary does not create a last-instant order; ended sessions freeze', () => {
  const g=new Kitchen(() => .5,'rush');g.startService();g.orders=[];g.time=.01;g.spawnTime=.01;g.tick(.02);
  assert.equal(g.phase,'ended');assert.equal(g.nextId,3);const before=JSON.stringify(g);g.tick(300);g.interact('egg');g.action('wok');g.addOrder();assert.equal(JSON.stringify(g),before);
});

test('star thresholds are level specific and exact', () => {
  for(const level of LEVELS){assert.equal(starCount(0,level),0);level.stars.forEach((score,i)=>{assert.equal(starCount(score-1,level),i);assert.equal(starCount(score,level),i+1);});}
});

test('progress persists per level, keeps best scores and tolerates old or malformed storage', () => {
  const data=new Map([['hot-stir-fry-best','300']]);const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  let p=new Progress(storage);assert.equal(p.records.opening.revenue,300);assert.equal(p.records['prep-school'].runs,0);assert.equal(p.records['spice-school'].runs,0);assert.equal(p.records['sauce-school'].runs,0);assert.equal(p.records['juice-school'].runs,0);p.record('rush',800,2);p.record('rush',100,0);
  p=new Progress(storage);assert.deepEqual(p.records.rush,{revenue:800,stars:2,runs:2});assert.equal(p.records.friday.revenue,0);
  data.set(KEY,'{broken');p=new Progress(storage);assert.equal(p.records.rush.runs,0);
  data.set(KEY,JSON.stringify({friday:{revenue:-4,stars:99,runs:'oops'}}));p=new Progress(storage);assert.deepEqual(p.records.friday,{revenue:0,stars:3,runs:0});
  p=new Progress({getItem(){throw Error('denied');},setItem(){throw Error('denied');}});assert.doesNotThrow(()=>p.record('friday',1700,3));assert.equal(p.records.friday.revenue,1700);
});

test('every workstation has a reachable interaction spot in every level', () => {
  for(const level of LEVELS){
    for(const stations of [require('../game-core.js').getInteractiveStations(getStations(level))]) { const start=createPlayer();assert.equal(blocked(start.x,start.y,stations),false);
    const queue=[[start.x,start.y]],seen=new Set([`${start.x},${start.y}`]),reachable=new Set();
    for(let index=0;index<queue.length;index++){
      const [x,y]=queue[index];
      for(const s of stations){const dx=s.x*60+30-x,dy=s.y*60+30-y,len=Math.hypot(dx,dy);if(len<93){const t=findTarget({x,y,dx:dx/len,dy:dy/len},stations);if(t)reachable.add(t.id);}}
      for(const [dx,dy]of[[15,0],[-15,0],[0,15],[0,-15]]){const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(!seen.has(key)&&!blocked(nx,ny,stations)){seen.add(key);queue.push([nx,ny]);}}
    }
    assert.deepEqual([...reachable].sort(),stations.map(s=>s.id).sort(),level.id); }
  }
});

test('movement normalizes diagonals, faces stations and cannot cross a stove on a slow frame', () => {
  const start=createPlayer(),straight=createPlayer(),diagonal=createPlayer();movePlayer(straight,new Set(['d']),[],.2);movePlayer(diagonal,new Set(['d','s']),[],.2);
  assert.ok(Math.abs(Math.hypot(diagonal.x-start.x,diagonal.y-start.y)-(straight.x-start.x))<.001);
  const stations=getStations(LEVELS[2]),p={x:450,y:240,dx:0,dy:-1,walk:0};movePlayer(p,new Set(['w']),stations,1);
  assert.ok(p.y>=142);assert.equal(findTarget(p,stations).id,'wok');
});

 test('fixed furniture blocks walking through the island, sink, fridge and stools even in lessons', () => {
  const stations=getStations(LEVELS.find(l=>l.id==='prep-school'));
  for(const [x,y] of [[510,370],[90,420],[900,80]]) assert.ok(blocked(x,y,stations));
  const p={x:240,y:400,dx:1,dy:0,walk:0}; movePlayer(p,new Set(['d']),stations,2);
  assert.ok(p.x<=333,'a slow frame cannot cross the island');
  assert.equal(blocked(240,400,stations),false,'left island aisle is open');
  assert.equal(blocked(720,400,stations),false,'right island aisle is open');
});
