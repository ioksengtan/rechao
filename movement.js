(function (root) {
  'use strict';
  const createPlayer = () => ({ x: 480, y: 420, dx: 0, dy: -1, walk: 0 });
  function blocked(x, y, stations) {
    if (x < 45 || x > 915 || y < 56 || y > 551) return true;
    return stations.some(s => Math.abs(x - (s.x * 60 + 30)) < 45 && Math.abs(y - (s.y * 60 + 30)) < 42);
  }
  function findTarget(player, stations) {
    let target = null, nearest = Infinity;
    for (const s of stations) {
      const dx = s.x * 60 + 30 - player.x, dy = s.y * 60 + 30 - player.y, distance = Math.hypot(dx, dy);
      const facing = (dx * player.dx + dy * player.dy) / distance;
      if (distance < 93 && facing > .3 && distance < nearest) { target = s; nearest = distance; }
    }
    return target;
  }
  function movePlayer(player, keys, stations, dt) {
    let x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    let y = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    if ((x || y) && Number.isFinite(dt) && dt > 0) {
      const length = Math.hypot(x, y); x /= length; y /= length; player.dx = x; player.dy = y;
      player.walk += dt * 12;
      // Small movement steps prevent tunnelling through stations on slow frames.
      let remaining = dt;
      while (remaining > 1e-8) {
        const step = Math.min(remaining, 1 / 60);
        if (!blocked(player.x + x * 225 * step, player.y, stations)) player.x += x * 225 * step;
        if (!blocked(player.x, player.y + y * 225 * step, stations)) player.y += y * 225 * step;
        remaining -= step;
      }
    }
    return findTarget(player, stations);
  }
  const api = { createPlayer, blocked, findTarget, movePlayer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HotStirFryMovement = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
