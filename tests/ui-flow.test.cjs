// Exercise the actual UI handlers with a minimal DOM/Canvas adapter.
// Visual layout is checked separately in a browser; these tests cover lifecycle wiring.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const progress = require('../progress.js');
const career = require('../career.js');
const core = require('../game-core.js');
const { runtime } = require('./ui-runtime.cjs');

test('UI selection, keyboard movement, pause, results, next level and restart work together', () => {
  const ui = runtime();
  ui.select('rush'); assert.equal(ui.game.level.id, 'rush'); assert.match(ui.nodes['recipe-list'].innerHTML, /蔥爆牛肉/);
  ui.nodes.start.onclick(); ui.frame(); assert.equal(ui.nodes.overlay.classList.contains('hidden'), true);
  const x = ui.player.x; ui.press('d'); for (let i=0;i<20;i++)ui.frame(); ui.release('d'); assert.ok(ui.player.x > x);
  ui.press('Escape'); const remaining=ui.game.time; for(let i=0;i<20;i++)ui.frame(); assert.equal(ui.game.time,remaining);
  ui.nodes.resume.onclick(); ui.nodes['open-early'].onclick(); assert.equal(ui.game.phase,'service');
  ui.game.revenue=800; ui.game.finish(); ui.frame();
  assert.equal(ui.nodes.results.classList.contains('hidden'),false); assert.equal(ui.nodes.stars.textContent,'★★☆');
  assert.match(ui.nodes['next-level'].textContent,/滿座週五夜/);
  const saved=JSON.parse(ui.records.get(progress.KEY)); assert.equal(saved.rush.runs,1); assert.equal(saved.rush.revenue,800);
  ui.frame(); assert.equal(JSON.parse(ui.records.get(progress.KEY)).rush.runs,1, 'one result written per session');
  ui.nodes['next-level'].onclick(); ui.frame(); assert.equal(ui.game.level.id,'friday'); assert.equal(ui.game.revenue,0); assert.equal(ui.game.plates,6);
  ui.game.finish(); ui.frame(); assert.equal(ui.nodes['next-level'].classList.contains('hidden'),true);
  ui.nodes.restart.onclick(); ui.frame(); assert.equal(ui.game.level.id,'friday'); assert.equal(ui.game.phase,'prep');
});

test('returning from a paused game clears input and session without recording an unfinished run', () => {
  const ui=runtime();ui.select('friday');ui.nodes.start.onclick();ui.frame();ui.press('w');ui.frame();ui.press('Escape');ui.nodes['choose-pause'].onclick();ui.frame();
  assert.equal(ui.game.phase,'prep');assert.equal(ui.nodes.pause.textContent,'暫停 Esc');assert.equal(ui.nodes.pause.disabled,true);assert.equal(ui.records.size,0);
  ui.select('opening');ui.nodes.start.onclick();const y=ui.player.y;ui.frame();assert.equal(ui.player.y,y);assert.equal(Object.keys(ui.game.woks).length,1);assert.equal(ui.game.plates,4);
});

test('origin dialogue advances, goes back, exits and replays without starting a shift', () => {
  const ui = runtime(); ui.select('friday');
  const before = JSON.stringify(ui.game);
  ui.nodes['origin-open'].onclick();
  assert.equal(ui.nodes.origin.classList.contains('hidden'), false);
  assert.equal(ui.nodes.welcome.classList.contains('hidden'), true);
  assert.match(ui.nodes['origin-text'].textContent, /Alex/);
  assert.equal(ui.nodes['origin-prev'].disabled, true);
  ui.press('ArrowRight'); assert.equal(ui.nodes['origin-progress'].textContent, '2 / 9');
  ui.press('ArrowLeft'); assert.equal(ui.nodes['origin-progress'].textContent, '1 / 9');
  ui.press('d'); for (let i=0;i<20;i++) ui.frame();
  assert.equal(JSON.stringify(ui.game), before);
  for (let i=0;i<8;i++) ui.nodes['origin-next'].onclick();
  assert.equal(ui.nodes['origin-next'].textContent, '前往選關 →');
  ui.press('Enter'); assert.equal(ui.nodes.origin.classList.contains('hidden'), true);
  assert.equal(ui.game.level.id, 'friday'); assert.equal(ui.records.size, 0);
  ui.nodes['origin-open'].onclick(); assert.equal(ui.nodes['origin-progress'].textContent, '1 / 9');
  ui.press('Escape'); assert.equal(ui.nodes.welcome.classList.contains('hidden'), false);
  ui.nodes.start.onclick(); ui.frame(); assert.equal(ui.game.level.id, 'friday');
});

test('notebook categories, training completion and next service keep separate records',()=>{
 const ui=runtime();
 assert.match(ui.nodes['level-list'].innerHTML,/備料課/);
 assert.equal(ui.nodes['course-tabs'].innerHTML.includes('籌備中'),false);
 ui.nodes['course-tabs'].onclick({target:{closest:()=>({dataset:{course:'juice'}})}});
 assert.equal(ui.nodes.start.disabled,false);assert.match(ui.nodes['level-list'].innerHTML,/果汁課/);
 ui.nodes.start.onclick();ui.frame();assert.equal(ui.game.level.id,'juice-school');assert.equal(ui.game.phase,'training');
 ui.nodes['course-tabs'].onclick({target:{closest:()=>({dataset:{course:'prep'}})}});
 ui.nodes.start.onclick();ui.frame();assert.equal(ui.nodes.clock.textContent,'不限時');
 ui.game.held={id:'choppedGreens',count:3};ui.game.interact('serve');
 ui.game.held={id:'choppedScallion',count:2};ui.game.interact('serve');ui.frame();
 assert.match(ui.nodes['result-level'].textContent,/備料課完成/);
 assert.equal(JSON.parse(ui.records.get(progress.KEY))['prep-school'].runs,1);
 ui.nodes['next-level'].onclick();ui.frame();assert.equal(ui.game.level.id,'opening');
});

const careerData = ui => JSON.parse(ui.records.get(career.KEY) || '{}');
function playWeeks(ui) {
  for (let i = 0; i < 40; i++) {
    const run = careerData(ui).run;
    if (run.pending?.type === 'exam') return run;
    if (run.pending?.type === 'event') ui.click('career-body', { career: 'choice', value: '0' });
    else if (run.pending?.type === 'quiz') { ui.click('career-body', { career: 'quiz' }); ui.game.finish(); ui.frame(); ui.nodes['next-level'].onclick(); }
    else ui.click('career-body', { career: 'action', value: run.stamina < 40 ? 'rest' : 'heat' });
  }
  throw new Error('career never reached the exam');
}

test('career loop: eight weeks, one final exam, a chef card, then service with that card', () => {
  const ui = runtime();
  ui.nodes['career-open'].onclick();
  assert.equal(ui.nodes.career.classList.contains('hidden'), false);
  assert.match(ui.nodes['career-body'].innerHTML, /還沒有主廚卡/);
  ui.click('career-body', { career: 'start' });
  assert.equal(ui.nodes['career-week'].textContent, '第 1 / 8 週');
  assert.match(ui.nodes['career-body'].innerHTML, /練火候[\s\S]*火候 \+12、控鍋 \+5、體力 -25/);
  const run = playWeeks(ui);
  assert.equal(run.week, 8);
  ui.click('career-body', { career: 'exam' });
  assert.equal(ui.game.level.id, 'opening'); assert.equal(ui.game.phase, 'prep');
  assert.deepEqual({ ...ui.game.chef.stats }, run.stats); assert.ok(ui.game.mods.flipStart < .4, 'trained heat widens the flip window');
  assert.match(ui.nodes['current-level'].textContent, /結業考/);
  ui.game.revenue = 900; ui.game.finish(); ui.frame();
  assert.equal(ui.nodes.stars.textContent, '★★★'); assert.match(ui.nodes['result-message'].textContent, /總舖師/);
  assert.equal(ui.nodes.restart.classList.contains('hidden'), true);
  assert.equal(ui.records.get(progress.KEY), undefined, 'the exam never writes a service record');
  const settled = careerData(ui).run;
  for (let i = 0; i < 5; i++) ui.frame();
  assert.deepEqual(careerData(ui).run.stats, settled.stats, 'the exam bonus is granted once');
  ui.nodes['next-level'].onclick();
  assert.equal(ui.nodes.career.classList.contains('hidden'), false);
  assert.equal(ui.nodes['career-name-field'].classList.contains('hidden'), false);
  ui.nodes['career-nickname'].value = '小艾<b>';
  ui.click('career-card-actions', { career: 'keep' });
  const saved = careerData(ui);
  assert.equal(saved.run, null); assert.equal(saved.cards[0].nickname, '小艾<b>'); assert.equal(saved.cards[0].title, '總舖師');
  ui.nodes['career-close'].onclick(); ui.select('rush');
  assert.equal(ui.nodes['chef-picker'].classList.contains('hidden'), false);
  assert.match(ui.nodes['chef-picker'].innerHTML, /小艾&lt;b&gt;/, 'nicknames are escaped');
  ui.nodes.start.onclick(); ui.frame();
  assert.equal(ui.game.chef.nickname, '小艾<b>');
  ui.game.revenue = 500; ui.game.finish(); ui.frame();
  assert.match(ui.nodes['best-record'].textContent, /主廚卡紀錄 \$500/);
  assert.equal(careerData(ui).records.rush.runs, 1); assert.equal(ui.records.get(progress.KEY), undefined);
  ui.nodes['next-level'].onclick(); ui.frame();
  assert.equal(ui.game.level.id, 'friday'); assert.equal(ui.game.chef.nickname, '小艾<b>', 'next level keeps the chosen card');
  ui.game.finish(); ui.frame(); ui.nodes['choose-results'].onclick();
  ui.click('chef-picker', { chef: '' }); ui.select('opening'); ui.nodes.start.onclick(); ui.frame();
  assert.equal(ui.game.chef, null); assert.deepEqual(ui.game.mods, core.getChefModifiers(null));
  ui.game.revenue = 200; ui.game.finish(); ui.frame();
  assert.equal(JSON.parse(ui.records.get(progress.KEY)).opening.runs, 1, 'standard Alex writes the standard record');
});

test('training lessons ignore a selected chef card', () => {
  const records = new Map();
  records.set(career.KEY, JSON.stringify({ cards: [{ id: 'c1', nickname: '阿艾', title: '二廚', stats: { knife: 100, heat: 100, season: 100, charm: 100, control: 100 } }] }));
  const ui = runtime(records);
  ui.select('opening'); ui.click('chef-picker', { chef: 'c1' });
  ui.select('prep-school'); assert.equal(ui.nodes['chef-picker'].classList.contains('hidden'), true);
  ui.nodes.start.onclick(); ui.frame();
  assert.deepEqual(ui.game.mods, core.getChefModifiers(null));
  ui.game.finish(); ui.frame();
  assert.equal(JSON.parse(records.get(progress.KEY))['prep-school'].runs, 1);
});

test('a reload resumes the current week, and a full roster needs an explicit choice', () => {
  const records = new Map(), ui = runtime(records);
  ui.nodes['career-open'].onclick(); ui.click('career-body', { career: 'start' });
  ui.click('career-body', { career: 'action', value: 'rest' });
  const week = careerData(ui).run.week;
  const again = runtime(records); again.nodes['career-open'].onclick();
  assert.equal(again.nodes['career-week'].textContent, `第 ${week} / 8 週`);
  const stats = { knife: 10, heat: 10, season: 10, charm: 10, control: 10 };
  const cards = [0, 1, 2, 3, 4].map(i => ({ id: 'c' + i, nickname: '卡' + i, title: '見習生', stats }));
  records.set(career.KEY, JSON.stringify({ cards, run: { id: 'run-new1', week: 8, stamina: 50, injured: 0, stats, usedEvents: [], log: [], pending: { type: 'card' }, result: { revenue: 100, stars: 0, bonus: 0, title: '見習生' } } }));
  const full = runtime(records); full.nodes['career-open'].onclick();
  assert.match(full.nodes['career-body'].innerHTML, /主廚卡已滿 5 張/);
  assert.match(full.nodes['career-card-actions'].innerHTML, /data-career="keep" disabled/);
  full.click('career-card-actions', { career: 'keep' });
  assert.equal(careerData(full).cards[1].nickname, '卡1'); assert.ok(careerData(full).run, 'nothing is overwritten without a slot');
  full.click('career-body', { career: 'slot', value: '1' }); full.nodes['career-nickname'].value = '新卡';
  full.click('career-card-actions', { career: 'keep' });
  assert.equal(careerData(full).cards[1].nickname, '新卡'); assert.equal(careerData(full).cards.length, 5); assert.equal(careerData(full).run, null);
});

test('discarding a card and abandoning a run both ask twice', () => {
  const records = new Map(), ui = runtime(records);
  ui.nodes['career-open'].onclick(); ui.click('career-body', { career: 'start' });
  ui.nodes['career-abandon'].onclick(); assert.ok(careerData(ui).run); assert.match(ui.nodes['career-abandon'].textContent, /再按一次/);
  ui.nodes['career-abandon'].onclick(); assert.equal(careerData(ui).run, null);
  const stats = { knife: 0, heat: 0, season: 0, charm: 0, control: 0 };
  records.set(career.KEY, JSON.stringify({ cards: [], run: { id: 'run-x', week: 8, stamina: 50, injured: 0, stats, usedEvents: [], log: [], pending: { type: 'card' }, result: { revenue: 0, stars: 0, bonus: 0, title: '見習生' } } }));
  const again = runtime(records); again.nodes['career-open'].onclick();
  again.click('career-card-actions', { career: 'discard' }); assert.ok(careerData(again).run);
  again.click('career-card-actions', { career: 'discard' }); assert.equal(careerData(again).run, null); assert.equal(careerData(again).cards.length, 0);
  again.press('Escape'); assert.equal(again.nodes.career.classList.contains('hidden'), true); assert.equal(again.nodes.welcome.classList.contains('hidden'), false);
});

function quizRun(records, week = 3) {
  const stats = { knife: 20, heat: 0, season: 0, charm: 0, control: 0 };
  records.set(career.KEY, JSON.stringify({ run: { id: 'run-q', week, stamina: 60, injured: 0, stats, usedEvents: [], log: [], pending: { type: 'quiz' } } }));
  return runtime(records);
}
function deliverAll(game) { for (const g of game.level.goals) { game.held = { id: g.id, count: g.count }; game.serve(); } }

test('a quiz is timed, applies the trainee stats and settles once without a lesson record', () => {
  const records = new Map(), ui = quizRun(records);
  ui.nodes['career-open'].onclick();
  assert.match(ui.nodes['career-body'].innerHTML, /刀工小考[\s\S]*開店前的備料課/);
  ui.click('career-body', { career: 'quiz' });
  assert.equal(ui.game.level.id, 'prep-school'); assert.equal(ui.game.mods.chopTime, core.getChefModifiers({ stats: { knife: 20 } }).chopTime);
  ui.frame(); assert.equal(ui.nodes['phase-label'].textContent, '刀工小考'); assert.equal(ui.nodes.clock.textContent, '01:30');
  ui.game.clock = 30; deliverAll(ui.game); ui.frame();
  assert.equal(ui.nodes.stars.textContent, '★★★'); assert.match(ui.nodes['result-message'].textContent, /刀工 \+6/);
  assert.equal(ui.nodes.restart.classList.contains('hidden'), true); assert.equal(ui.records.get(progress.KEY), undefined, 'no lesson record');
  for (let i = 0; i < 5; i++) ui.frame();
  const run = careerData(ui).run;
  assert.equal(run.stats.knife, 26); assert.equal(run.week, 4); assert.equal(run.pending, null);
  ui.nodes['next-level'].onclick();
  assert.equal(ui.nodes.career.classList.contains('hidden'), false); assert.equal(ui.nodes['career-week'].textContent, '第 4 / 8 週');
});

test('running out of time ends the quiz with no stars, and the run continues', () => {
  const records = new Map(), ui = quizRun(records, 6);
  ui.nodes['career-open'].onclick(); ui.click('career-body', { career: 'quiz' });
  assert.equal(ui.game.level.id, 'juice-school');
  ui.game.clock = 149.99; ui.frame();
  assert.equal(ui.nodes.results.classList.contains('hidden'), false);
  assert.equal(ui.nodes.stars.textContent, '☆☆☆'); assert.match(ui.nodes['result-message'].textContent, /時間到/);
  const run = careerData(ui).run; assert.equal(run.week, 7); assert.equal(run.stats.season, 0);
});

test('leaving a quiz early keeps it pending for another try', () => {
  const records = new Map(), ui = quizRun(records);
  ui.nodes['career-open'].onclick(); ui.click('career-body', { career: 'quiz' }); ui.frame();
  ui.press('Escape'); ui.nodes['choose-pause'].onclick();
  assert.equal(careerData(ui).run.pending.type, 'quiz');
  ui.nodes['career-open'].onclick(); assert.match(ui.nodes['career-body'].innerHTML, /data-career="quiz"/);
});

test('level cards show the chef-card record while a card is selected', () => {
  const records = new Map();
  records.set(progress.KEY, JSON.stringify({ rush: { revenue: 300, stars: 0, runs: 1 } }));
  records.set(career.KEY, JSON.stringify({ cards: [{ id: 'c1', nickname: '阿艾', title: '二廚', stats: {} }], records: { rush: { revenue: 950, stars: 3, runs: 1, chef: { nickname: '阿艾', title: '二廚', stats: {} } } } }));
  const ui = runtime(records); ui.select('rush');
  assert.match(ui.nodes['level-list'].innerHTML, /最佳營收 \$300/); assert.doesNotMatch(ui.nodes['level-list'].innerHTML, /主廚卡紀錄/);
  ui.click('chef-picker', { chef: 'c1' });
  const cards = ui.nodes['level-list'].innerHTML;
  assert.match(cards, /主廚卡紀錄 \$950（阿艾）/); assert.match(cards, /最佳 3 星/); assert.match(cards, /主廚卡紀錄 · 尚未挑戰/);
  assert.doesNotMatch(cards, /最佳營收 \$300/);
  ui.click('chef-picker', { chef: '' }); assert.match(ui.nodes['level-list'].innerHTML, /最佳營收 \$300/);
});
