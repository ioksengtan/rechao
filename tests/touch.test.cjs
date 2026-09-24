const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runtime } = require('./ui-runtime.cjs');

function face(ui, id) {
  const station = ui.game.stations.find(s => s.id === id);
  ui.player.x = station.x * 60 + 30;
  ui.player.y = station.y * 60 + 30 + 70;
  ui.player.dx = 0;
  ui.player.dy = -1;
  ui.frame();
  return station;
}

function tap(ui, id, pointerId = 1) {
  ui.pointer(id, 'pointerdown', pointerId);
  ui.pointer(id, 'pointerup', pointerId);
}

test('page ships touch controls beside the keyboard and career mode', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.equal(require('../package.json').version, '0.14.0');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /id="touch-controls"/);
  assert.match(html, /id="career-open"/);
  assert.match(html, /id="touch-f"/);
  assert.match(html, /v=0\.14\.0/);
  assert.match(html, /鍵盤與觸控/);
  assert.match(css, /career-modal/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(readme, /0\.14\.0/);
  assert.match(readme, /成長模式/);
  assert.match(readme, /觸控/);
  assert.doesNotMatch(readme, /需要實體鍵盤/);
  assert.doesNotMatch(readme, /尚未包含觸控/);
});

test('desktop keeps keyboard hints until a touch pointer arrives', () => {
  const ui = runtime();
  assert.equal(ui.nodes['touch-controls'].hidden, true);
  assert.equal(ui.body.classList.contains('touch-active'), false);
  assert.equal(ui.nodes.pause.textContent, '暫停 Esc');
  ui.events.pointerdown({ pointerType: 'mouse', button: 0 });
  assert.equal(ui.nodes['touch-controls'].hidden, true);
  ui.events.pointerdown({ pointerType: 'touch', button: 0 });
  assert.equal(ui.nodes['touch-controls'].hidden, false);
  assert.equal(ui.nodes.pause.textContent, '暫停');
  assert.match(ui.nodes['origin-foot'].textContent, /按鈕/);
  ui.select('opening');
  assert.match(ui.nodes['level-timing'].textContent, /鍵盤或觸控/);
});

test('a narrow viewport shows touch controls and still walks with the keyboard', () => {
  const ui = runtime({ narrow: true });
  assert.equal(ui.body.classList.contains('touch-active'), true);
  ui.nodes.start.onclick();
  ui.frame();
  const x = ui.player.x;
  ui.press('d');
  ui.frames(20);
  ui.release('d');
  assert.ok(ui.player.x > x);
  ui.press('Escape');
  assert.equal(ui.nodes.pause.textContent, '繼續');
  assert.equal(ui.body.classList.contains('playing'), false);
});

test('direction pad moves, E taps once, and holding F chops, mixes, cooks and clears', () => {
  const ui = runtime({ touch: true });
  ui.nodes.start.onclick();
  ui.frame();
  const x = ui.player.x, y = ui.player.y;
  ui.pointer('touch-right', 'pointerdown', 1);
  ui.pointer('touch-up', 'pointerdown', 2);
  ui.frames(18);
  assert.ok(ui.player.x > x);
  assert.ok(ui.player.y < y);
  ui.pointer('touch-right', 'pointerup', 1);
  ui.pointer('touch-up', 'pointerup', 2);
  const stopped = ui.player.x;
  ui.frames(8);
  assert.equal(ui.player.x, stopped);

  face(ui, 'greens');
  const down = ui.pointer('touch-e', 'pointerdown');
  assert.equal(down.defaultPrevented, true);
  assert.equal(ui.game.held.id, 'greens');
  const toast = ui.nodes.toast.textContent;
  assert.match(toast, /青菜/);
  ui.frames(12);
  assert.equal(ui.nodes.toast.textContent, toast, 'holding E does not repeat the tap');
  assert.equal(ui.game.held.id, 'greens');
  ui.pointer('touch-e', 'pointerup');

  face(ui, 'board');
  tap(ui, 'touch-e');
  const board = ui.game.stations.find(s => s.id === 'board');
  assert.equal(board.item.id, 'greens');
  ui.pointer('touch-f', 'pointerdown');
  assert.equal(ui.nodes['touch-f'].classList.contains('held'), true);
  ui.frames(30);
  assert.ok(board.progress > 0);
  assert.equal(board.item.id, 'greens');
  ui.pointer('touch-f', 'pointerup');
  const paused = board.progress;
  ui.frames(20);
  assert.equal(board.progress, paused);
  ui.pointer('touch-f', 'pointerdown');
  ui.frames(130);
  ui.pointer('touch-f', 'pointerup');
  assert.equal(board.item.id, 'choppedGreens');

  ui.nodes['course-tabs'].onclick({ target: { closest: () => ({ dataset: { course: 'juice' } }) } });
  ui.nodes.start.onclick();
  ui.frame();
  const pour = (id, times) => {
    if (ui.game.held?.source && ui.game.held.id !== id) { face(ui, ui.game.held.id); tap(ui, 'touch-e'); }
    if (!ui.game.held) { face(ui, id); tap(ui, 'touch-e'); }
    face(ui, 'juice-bar');
    for (let i = 0; i < times; i++) tap(ui, 'touch-e');
  };
  pour('lemon', 2); pour('syrup', 6); pour('ice', 3);
  const juicer = ui.game.stations.find(s => s.id === 'juice-bar');
  assert.equal(juicer.mix.lemon, 2);
  assert.equal(juicer.mix.syrup, 30);
  assert.equal(juicer.mix.ice, 3);
  face(ui, 'counter'); tap(ui, 'touch-e');
  face(ui, 'juice-bar');
  ui.pointer('touch-f', 'pointerdown');
  ui.frames(140);
  ui.pointer('touch-f', 'pointerup');
  assert.equal(juicer.item.id, 'lemonJuice');

  ui.select('opening');
  ui.nodes.start.onclick();
  ui.frame();
  face(ui, 'greens'); tap(ui, 'touch-e');
  face(ui, 'board'); tap(ui, 'touch-e');
  face(ui, 'board');
  ui.pointer('touch-f', 'pointerdown');
  ui.frames(140);
  ui.pointer('touch-f', 'pointerup');
  tap(ui, 'touch-e');
  face(ui, 'wok'); tap(ui, 'touch-e');
  assert.equal(ui.game.wok.state, 'loading');
  tap(ui, 'touch-f');
  assert.equal(ui.game.wok.state, 'cooking');
  assert.equal(ui.game.flips, 0);
  ui.game.wok.state = 'burned';
  ui.game.held = null;
  face(ui, 'wok');
  ui.pointer('touch-f', 'pointerdown');
  ui.frames(20);
  ui.pointer('touch-f', 'pointerup');
  ui.frame();
  assert.equal(ui.game.wok.clearProgress, 0);
  assert.equal(ui.game.wok.state, 'burned');
  ui.pointer('touch-f', 'pointerdown');
  ui.frames(140);
  assert.equal(ui.game.wok.state, 'empty');
  ui.pointer('touch-f', 'pointerup');
});

test('keyboard and touch holds share one channel without cancelling each other', () => {
  const ui = runtime({ touch: true });
  ui.select('opening');
  ui.nodes.start.onclick();
  ui.frame();
  ui.press('d');
  ui.pointer('touch-right', 'pointerdown');
  ui.pointer('touch-right', 'pointerup');
  const x = ui.player.x;
  ui.frames(12);
  assert.ok(ui.player.x > x, 'releasing the pad leaves the keyboard key down');
  ui.release('d');
  const stopped = ui.player.x;
  ui.frames(8);
  assert.equal(ui.player.x, stopped);

  face(ui, 'greens'); tap(ui, 'touch-e');
  face(ui, 'board'); tap(ui, 'touch-e');
  const board = ui.game.stations.find(s => s.id === 'board');
  face(ui, 'board');
  ui.press('f');
  ui.pointer('touch-f', 'pointerdown');
  ui.release('f');
  const paused = board.progress;
  ui.frames(24);
  assert.ok(board.progress > paused, 'the on-screen hold keeps chopping after the key is released');
  ui.pointer('touch-f', 'pointerup');
  const chopPaused = board.progress;
  ui.frames(12);
  assert.equal(board.progress, chopPaused);

  ui.game.held = null;
  ui.game.wok.ingredients = ['choppedGreens'];
  ui.game.wok.state = 'loading';
  face(ui, 'wok');
  ui.press('f');
  ui.pointer('touch-f', 'pointerdown');
  assert.equal(ui.game.wok.state, 'cooking');
  assert.equal(ui.game.flips, 0, 'a second F source does not repeat the tap');
  ui.release('f');
  ui.pointer('touch-f', 'pointerup');
});
