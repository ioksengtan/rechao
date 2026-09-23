const { test } = require('node:test');
const assert = require('node:assert/strict');
const career = require('../career.js');
const { getChefModifiers } = require('../game-core.js');
const { newRun, chooseAction, resolveEvent, settleExam, previewAction, CareerSave, ACTIONS, EVENTS, STAT_NAMES, WEEKS, MAX_CARDS, KEY } = career;
const memory = () => { const map = new Map(); return { map, getItem: k => map.get(k), setItem: (k, v) => map.set(k, v) }; };
const noEvents = () => .99;
function finishWeeks(run, action = 'knife', random = noEvents) {
  while (!run.pending || run.pending.type === 'event') {
    if (run.pending) resolveEvent(run, 0); else chooseAction(run, run.stamina < 30 ? 'rest' : action, random);
  }
}

test('every stat can be trained and stat names match chef modifiers', () => {
  const trained = new Set(Object.values(ACTIONS).flatMap(a => [a.main, a.sub]).filter(Boolean));
  assert.deepEqual([...trained].sort(), Object.keys(STAT_NAMES).sort());
  const stats = Object.fromEntries(Object.keys(STAT_NAMES).map(k => [k, 100]));
  assert.notDeepEqual(getChefModifiers({ stats }), getChefModifiers(null));
});

test('training raises a main and a sub stat, costs stamina and previews the result', () => {
  const run = newRun(() => .5);
  assert.deepEqual(previewAction(run, 'heat'), { gains: { heat: 12, control: 5 }, stamina: -25, efficiency: 1, injuryChance: 0 });
  chooseAction(run, 'heat', noEvents);
  assert.equal(run.stats.heat, 12); assert.equal(run.stats.control, 5); assert.equal(run.stamina, 75); assert.equal(run.week, 2);
  assert.deepEqual(previewAction(run, 'rest'), { gains: {}, stamina: 25, efficiency: 1, injuryChance: 0 });
});

test('low stamina reduces gains and warns about injury, which only lasts one training', () => {
  const run = newRun(); run.stamina = 20;
  const p = previewAction(run, 'knife');
  assert.equal(p.efficiency, .4); assert.equal(p.injuryChance, .3); assert.deepEqual(p.gains, { knife: 5, control: 2 }); assert.equal(p.stamina, -20);
  chooseAction(run, 'knife', () => 0); // injury roll succeeds, then an event may be drawn
  assert.equal(run.injured, 1); assert.equal(run.stamina, 0);
  if (run.pending) resolveEvent(run, 1);
  run.stamina = 100;
  assert.equal(previewAction(run, 'knife').efficiency, .5);
  chooseAction(run, 'rest', noEvents); assert.equal(run.injured, 0);
});

test('events offer two choices with trade-offs and never repeat within a run', () => {
  assert.ok(EVENTS.length >= 6);
  for (const e of EVENTS) { assert.equal(e.choices.length, 2); assert.notDeepEqual(e.choices[0], e.choices[1]); }
  const run = newRun(); const seen = [];
  for (let i = 0; i < 7; i++) { chooseAction(run, 'rest', () => 0); assert.equal(run.pending.type, 'event'); seen.push(run.pending.id); assert.equal(resolveEvent(run, 5), false); resolveEvent(run, 0); }
  assert.equal(new Set(seen).size, 7); assert.equal(run.week, WEEKS);
});

test('week eight ends with a final exam that settles exactly once', () => {
  const run = newRun(); finishWeeks(run);
  assert.equal(run.week, WEEKS); assert.equal(run.pending.type, 'exam');
  assert.equal(chooseAction(run, 'knife'), false, 'no action while the exam is pending');
  const examId = run.pending.id, before = { ...run.stats };
  assert.equal(settleExam(run, 'wrong-id', 900, 3), false);
  const result = settleExam(run, examId, 900, 3);
  assert.equal(result.title, '總舖師'); assert.equal(run.stats.heat, Math.min(100, before.heat + 6));
  assert.equal(settleExam(run, examId, 900, 3), false, 'a second settlement is ignored');
  assert.equal(run.stats.heat, Math.min(100, before.heat + 6));
});

test('a poor exam still produces a card', () => {
  const run = newRun(); finishWeeks(run, 'floor'); settleExam(run, run.pending.id, 0, 0);
  const card = career.makeCard(run, '');
  assert.equal(card.title, '見習生'); assert.match(card.nickname, /^Alex #/); assert.deepEqual(card.stats, run.stats);
});

test('the save resumes an unfinished run and never overwrites a full roster silently', () => {
  const storage = memory(); let save = new CareerSave(storage);
  save.start(); chooseAction(save.run, 'knife', noEvents); save.save();
  save = new CareerSave(storage); assert.equal(save.run.week, 2); assert.equal(save.run.stats.knife, 12);
  for (let i = 0; i < MAX_CARDS + 1; i++) {
    save.start(); finishWeeks(save.run); settleExam(save.run, save.run.pending.id, 500, 2);
    if (i < MAX_CARDS) assert.ok(save.keep('廚師 ' + i));
  }
  const newest = save.run;
  assert.equal(save.full, true); assert.equal(save.keep('第六張'), false); assert.equal(save.run, newest, 'the new card waits for a decision');
  assert.equal(save.keep('第六張', 9), false);
  const kept = save.keep('第六張', 2);
  assert.equal(save.cards[2], kept); assert.equal(save.cards.length, MAX_CARDS); assert.equal(save.run, null);
  save = new CareerSave(storage); assert.equal(save.cards[2].nickname, '第六張');
});

test('discarding a finished card keeps the roster; chef records keep a stat snapshot', () => {
  const storage = memory(), save = new CareerSave(storage);
  save.start(); finishWeeks(save.run); settleExam(save.run, save.run.pending.id, 100, 0);
  assert.equal(save.discard(), true); assert.equal(save.cards.length, 0); assert.equal(save.run, null);
  const card = { id: 'c', nickname: '阿艾', title: '二廚', stats: { knife: 50, heat: 0, season: 0, charm: 0, control: 0 } };
  save.record('rush', card, 700, 1); card.stats.knife = 99;
  const row = save.record('rush', card, 300, 0);
  assert.equal(row.revenue, 700); assert.equal(row.runs, 2); assert.equal(row.chef.stats.knife, 50);
  assert.equal(JSON.parse(storage.map.get(KEY)).records.rush.runs, 2);
});

test('corrupt or blocked storage still gives a playable career', () => {
  const broken = { getItem: () => '{bad json', setItem() { throw new Error('quota'); } };
  const save = new CareerSave(broken); assert.equal(save.run, null); assert.deepEqual(save.cards, []);
  save.start(); assert.equal(save.run.week, 1);
  assert.equal(new CareerSave(undefined).cards.length, 0);
});
