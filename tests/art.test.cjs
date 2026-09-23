const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../game-core.js');
const { createRenderer, WIDTH, HEIGHT, OFFSET } = require('../art.js');
const { createPlayer } = require('../movement.js');

function context() {
  let depth = 0, primitives = 0;
  const ctx = new Proxy({
    save() { depth++; }, restore() { depth--; assert.ok(depth >= 0, 'balanced canvas restore'); },
    ellipse(x,y,rx,ry) { [x,y,rx,ry].forEach(n=>assert.ok(Number.isFinite(n))); assert.ok(rx >= 0 && ry >= 0); primitives++; },
    roundRect(x,y,w,h) { [x,y,w,h].forEach(n=>assert.ok(Number.isFinite(n))); assert.ok(w >= 0 && h >= 0); primitives++; },
  }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  return { ctx, check() { assert.equal(depth,0); assert.ok(primitives>0); } };
}

test('renderer covers every dish, held item, station and wok state without altering gameplay', () => {
  const c=context(), renderer=createRenderer(c.ctx,core), game=new core.Kitchen(()=>.5,'friday'), player=createPlayer();
  game.startService();const stove=game.stations.find(s=>s.id==='wok');
  assert.ok(OFFSET.x+960<=WIDTH);assert.ok(OFFSET.y+600<=HEIGHT);
  for(const [index,id]of Object.keys(core.ITEMS).entries()){
    game.held={id};player.dx=Math.sin(index);player.dy=Math.cos(index);
    for(const state of ['empty','loading','cooking','ready','burned']){
      game.wok.state=state;game.wok.ingredients=['choppedChicken','basil','sauce'];game.wok.recipe='chicken';game.wok.elapsed=5;
      const before=JSON.stringify(game);renderer.draw(game,player,stove,new Set(['d']),true,false);assert.equal(JSON.stringify(game),before);
    }
  }
  game.held=null;const board=game.stations.find(s=>s.id==='board');board.item={id:'beef'};
  renderer.draw(game,player,board,new Set(['f']),true,false);
  const juice=new core.Kitchen(()=>.5,'juice-school'), bar=juice.stations.find(s=>s.id==='juice-bar');
  bar.ingredients=['lemon','syrup','ice'];bar.progress=1;renderer.draw(juice,player,bar,new Set(['f']),true,false);
  bar.item={id:'plumJuice'};bar.ingredients=[];renderer.draw(juice,player,bar,new Set(),true,false);c.check();
});

test('successful flips and deliveries animate, invalid actions do not; pause freezes and reset clears effects', () => {
  const c=context(), renderer=createRenderer(c.ctx,core), game=new core.Kitchen(()=>.5,'friday');
  const wok=game.stations.find(s=>s.id==='wok'),serve=game.stations.find(s=>s.id==='serve');
  let before=renderer.snapshot(game);renderer.action(wok,game,before);assert.equal(renderer.state.effects.length,0);
  game.wok.ingredients=['choppedGreens'];game.wok.state='loading';game.action('wok');game.tick(2.2);
  before=renderer.snapshot(game);game.action('wok');renderer.action(wok,game,before);assert.equal(renderer.state.tosses.wok,.65);
  const frozen=JSON.stringify(renderer.state);renderer.update(3,false);assert.equal(JSON.stringify(renderer.state),frozen);
  renderer.update(1,true);assert.equal(renderer.state.tosses.wok,undefined);
  game.startService();game.held={id:'greensDish'};before=renderer.snapshot(game);game.serve();renderer.action(serve,game,before);
  assert.ok(renderer.state.effects.some(fx=>fx.kind==='delivery'));assert.equal(renderer.state.tables[3].recipe,'greens');
  renderer.draw(game,createPlayer(),serve,new Set(),true,false);renderer.update(10,true);assert.equal(renderer.state.effects.length,0);assert.equal(Object.keys(renderer.state.tables).length,0);
  renderer.reset();assert.equal(renderer.state.clock,0);assert.equal(renderer.state.gesture,null);c.check();
});
