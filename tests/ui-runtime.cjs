// Minimal DOM/Canvas adapter shared by UI lifecycle tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../game-core.js');
const movement = require('../movement.js');
const progress = require('../progress.js');
const art = require('../art.js');

function classListFor(classes) {
  return {
    add: key => classes.add(key),
    remove: key => classes.delete(key),
    contains: key => classes.has(key),
    toggle(key, force) {
      const on = force ?? !classes.has(key);
      if (on) classes.add(key); else classes.delete(key);
      return on;
    }
  };
}

function runtime(options = {}) {
  const nodes = {}, events = {}, records = new Map();
  let frame, now = 0, game, player;
  const context2d = new Proxy({}, { get: (target, key) => target[key] || (() => {}), set: (target, key, value) => (target[key] = value, true) });
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const match of html.matchAll(/id="([^"]+)"/g)) {
    const classes = new Set();
    const listeners = {};
    const attrs = {};
    nodes[match[1]] = {
      id: match[1], textContent: '', innerHTML: '', disabled: false, hidden: false, dataset: {}, attrs, listeners,
      focus() {}, getContext: () => context2d, querySelector: () => ({ focus() {} }),
      classList: classListFor(classes),
      addEventListener(name, cb) { (listeners[name] ||= []).push(cb); },
      removeEventListener() {},
      setPointerCapture() {}, releasePointerCapture() {},
      setAttribute(name, value) { attrs[name] = String(value); },
      getAttribute(name) { return attrs[name]; }
    };
  }
  const bodyClasses = new Set();
  const body = { classList: classListFor(bodyClasses) };
  const scope = {
    document: {
      body,
      hidden: false,
      activeElement: null,
      getElementById: id => { assert.ok(nodes[id], `DOM node exists: ${id}`); return nodes[id]; },
      addEventListener: (name, cb) => { events[name] = cb; },
      elementFromPoint() { return null; }
    },
    navigator: { maxTouchPoints: options.touch ? 1 : 0 },
    matchMedia: query => ({ matches: !!(options.coarse && /pointer:\s*coarse/.test(query)) || !!(options.narrow && /max-width:\s*820px/.test(query)) }),
    addEventListener: (name, cb) => { events[name] = cb; },
    requestAnimationFrame: cb => { frame = cb; },
    performance: { now: () => now },
    localStorage: { getItem: key => records.get(key), setItem: (key, value) => records.set(key, value) },
    HotStirFry: { ...core, Kitchen: class extends core.Kitchen { constructor() { super(); game = this; } } },
    HotStirFryMovement: { ...movement, createPlayer() { player = movement.createPlayer(); return player; } },
    HotStirFryProgress: progress,
    HotStirFryArt: art,
  };
  scope.window = scope;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8'), scope, { filename: 'game.js' });
  const api = {
    nodes, records, events, body, get game() { return game; }, get player() { return player; },
    frame() { now += 1000 / 60; frame(now); },
    frames(count) { for (let i = 0; i < count; i++) api.frame(); },
    select(level) { nodes['level-list'].onclick({ target: { closest: () => ({ dataset: { level } }) } }); },
    press(key) { events.keydown({ key, repeat: false, preventDefault() {} }); },
    release(key) { events.keyup({ key }); },
    pointer(id, type, pointerId = 1) {
      const button = nodes[id];
      const event = {
        pointerId, pointerType: 'touch', button: 0, clientX: 0, clientY: 0,
        target: { closest: sel => sel === 'button' ? button : null },
        preventDefault() { this.defaultPrevented = true; },
        defaultPrevented: false
      };
      for (const cb of nodes['touch-controls'].listeners[type] || []) cb(event);
      return event;
    }
  };
  return api;
}

module.exports = { runtime };
