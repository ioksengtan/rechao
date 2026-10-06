/* Original watercolor kitchen. Ink weight, washes and furniture silhouettes only — never changes simulation state. */
(function (root) {
  'use strict';
  const WIDTH = 1160, HEIGHT = 900, OFFSET = { x: 24, y: 78 };
  const P = {
    ink: '#49483e', inkSoft: '#797668', paper: '#faf8f2', cream: '#fbf7f0',
    sage: '#a5a895', sageDeep: '#7f8471', sageLite: '#d4d4c4', sagePanel: '#b9bcaa',
    stone: '#f4efe6', vein: '#ddd4c4', wood: '#e7d3b2', woodDeep: '#c4a078',
    woodLine: '#b08960', brass: '#c4a15a', brassDeep: '#8d6b34', terra: '#a85c48',
    iron: '#3c4740', steel: '#d7e0d8', floor: '#f3e6cc', shadow: 'rgba(74, 62, 46, 0.16)'
  };
  const FONT = '"Microsoft JhengHei","PingFang TC","WenQuanYi Micro Hei",sans-serif';
  // A single camera maps simulation positions, furniture and effects into the room.
  // Simulation coordinates and keyboard/touch directions remain unchanged.
  function project(x, y, height = 0) {
    const scale = .78 + .18 * y / 600;
    return { x: 580 + (x - 480) * scale, y: 270 + y * .95 - height * scale, scale };
  }
  function rnd(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function wob(x, y, amp) {
    return [x + (rnd(x * 0.17 + y * 0.03) - 0.5) * amp * 2, y + (rnd(y * 0.13 + x * 0.05 + 9) - 0.5) * amp * 2];
  }
  function linear(ctx, x0, y0, x1, y1, stops, fallback) {
    try {
      if (typeof ctx.createLinearGradient !== 'function') return fallback;
      const g = ctx.createLinearGradient(x0, y0, x1 + 0.01, y1 + 0.01);
      if (!g || typeof g.addColorStop !== 'function') return fallback;
      for (const [t, c] of stops) g.addColorStop(t, c);
      return g;
    } catch (e) { return fallback; }
  }
  function radial(ctx, x, y, r0, r1, stops, fallback) {
    try {
      if (typeof ctx.createRadialGradient !== 'function') return fallback;
      const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.5, r1));
      if (!g || typeof g.addColorStop !== 'function') return fallback;
      for (const [t, c] of stops) g.addColorStop(t, c);
      return g;
    } catch (e) { return fallback; }
  }
  function trace(ctx, pts, close) {
    const path = close ? pts.concat([pts[0]]) : pts;
    ctx.beginPath();
    ctx.moveTo(path[0][0], path[0][1]);
    if (path.length < 3) {
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
    } else {
      for (let i = 1; i < path.length - 1; i++) {
        const mx = (path[i][0] + path[i + 1][0]) / 2, my = (path[i][1] + path[i + 1][1]) / 2;
        ctx.quadraticCurveTo(path[i][0], path[i][1], mx, my);
      }
      ctx.lineTo(path[path.length - 1][0], path[path.length - 1][1]);
    }
    if (close) ctx.closePath();
  }
  function ink(ctx, pts, weight, close, color) {
    if (!pts || pts.length < 2) return;
    const path = close ? pts.concat([pts[0]]) : pts;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    trace(ctx, path, false);
    ctx.strokeStyle = color || P.ink;
    ctx.lineWidth = weight;
    ctx.stroke();
    ctx.strokeStyle = '#2c342c';
    for (let i = 0; i < path.length - 1; i += 1) {
      const t = rnd(path[i][0] * 0.21 + path[i][1] * 0.07 + i * 1.7);
      if (t < 0.72) continue;
      ctx.beginPath();
      ctx.moveTo(path[i][0], path[i][1]);
      ctx.lineTo(path[i + 1][0], path[i + 1][1]);
      ctx.lineWidth = weight * (1.05 + t * 0.7);
      ctx.stroke();
    }
  }
  function rectPts(x, y, w, h, amp, rad) {
    const r = Math.max(0, Math.min(rad || 0, w / 2, h / 2));
    const pts = [];
    const edge = (x0, y0, x1, y1, n) => {
      for (let i = 0; i <= n; i++) pts.push(wob(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, amp));
    };
    const corner = (cx, cy, a0, a1) => {
      const n = r > 1 ? 3 : 0;
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * (n ? i / n : 0);
        pts.push(wob(cx + Math.cos(a) * r, cy + Math.sin(a) * r, amp));
      }
    };
    const nEdge = Math.max(1, Math.round((w + h) / 90));
    edge(x + r, y, x + w - r, y, nEdge);
    if (r > 0) corner(x + w - r, y + r, -Math.PI / 2, 0);
    edge(x + w, y + r, x + w, y + h - r, nEdge);
    if (r > 0) corner(x + w - r, y + h - r, 0, Math.PI / 2);
    edge(x + w - r, y + h, x + r, y + h, nEdge);
    if (r > 0) corner(x + r, y + h - r, Math.PI / 2, Math.PI);
    edge(x, y + h - r, x, y + r, nEdge);
    if (r > 0) corner(x + r, y + r, Math.PI, Math.PI * 1.5);
    return pts;
  }
  function ovalPts(x, y, rx, ry, amp) {
    const n = Math.max(12, Math.round((rx + ry) / 2.2));
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(wob(x + Math.cos(a) * rx, y + Math.sin(a) * ry, amp));
    }
    return pts;
  }
  function centroid(pts) {
    let x = 0, y = 0;
    for (const p of pts) { x += p[0]; y += p[1]; }
    return [x / pts.length, y / pts.length];
  }
  function paint(ctx, pts, o) {
    if (!pts || pts.length < 3) return;
    const color = o.color;
    if (o.bleed !== false) {
      const c = centroid(pts);
      const big = pts.map(p => [c[0] + (p[0] - c[0]) * 1.045, c[1] + (p[1] - c[1]) * 1.045]);
      ctx.save(); ctx.globalAlpha = o.bleedAlpha || 0.14;
      trace(ctx, big, true); ctx.fillStyle = o.bleedColor || color; ctx.fill(); ctx.restore();
    }
    trace(ctx, pts, true);
    ctx.fillStyle = o.grad ? linear(ctx, o.x0, o.y0, o.x1, o.y1, o.grad, color) : color;
    ctx.fill();
    if (o.pools && o.pools.length) {
      ctx.save();
      trace(ctx, pts, true); ctx.clip();
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.2;
      for (const p of o.pools) {
        ctx.beginPath();
        ctx.ellipse(p[0], p[1], Math.max(0, p[2]), Math.max(0, p[3]), 0, 0, Math.PI * 2);
        ctx.fillStyle = p[4] || '#6d6254'; ctx.fill();
      }
      ctx.restore();
    }
    if (o.inside) {
      ctx.save(); trace(ctx, pts, true); ctx.clip(); o.inside(); ctx.restore();
    }
    if (o.weight) ink(ctx, pts, o.weight, true, o.inkColor);
  }
  function blob(ctx, x, y, w, h, o) {
    if (w < 1 || h < 1) return;
    paint(ctx, rectPts(x, y, w, h, o.amp == null ? 0.85 : o.amp, o.rad == null ? 3 : o.rad), Object.assign({ x0: x, y0: y, x1: x + w, y1: y + h }, o));
  }
  function oval(ctx, x, y, rx, ry, o) {
    if (rx < 0.5 || ry < 0.5) return;
    paint(ctx, ovalPts(x, y, rx, ry, o.amp == null ? 0.55 : o.amp), o);
  }
  function ell(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2);
  }
  function shadow(ctx, x, y, rx, ry, alpha) {
    ctx.save(); ctx.globalAlpha = alpha || 0.16;
    ell(ctx, x, y, Math.max(0, rx), Math.max(0, ry));
    ctx.fillStyle = '#5c5144'; ctx.fill(); ctx.restore();
  }
  function hair(ctx, pts, color, width, alpha) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 0.55 : alpha;
    ink(ctx, pts, width || 0.7, false, color || P.inkSoft); ctx.restore();
  }
  function label(ctx, str, x, y, size, color, align, weight) {
    ctx.font = `${weight || 600} ${size}px ${FONT}`;
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color || P.ink; ctx.fillText(str, x, y);
  }
  function paperGrain(ctx) {
    ctx.save();
    for (let i = 0; i < 640; i++) {
      const x = rnd(i * 1.7) * WIDTH, y = rnd(i * 2.3 + 5) * HEIGHT;
      ctx.globalAlpha = 0.025 + rnd(i + 8) * 0.04;
      ctx.fillStyle = i % 4 === 0 ? '#fffaf2' : '#6a5e50';
      ctx.fillRect(x, y, rnd(i + 2) > 0.86 ? 1.8 : 1, 1);
    }
    ctx.restore();
  }
  function createRenderer(ctx, data) {
    const { getInteractiveStations, ROOM_LAYOUT, ITEMS, menuOffer, cookDuration, chopDuration, MIX_TIME, juiceMeasureLines, sauceMeasureLine } = data;
    const state = { clock: 0, effects: [], tosses: {}, gesture: null, tables: {}, shake: null, seen: null };
    const REACTIONS = ['好吃！', '讚啦！', '好香喔！', '再來一盤！', '老闆，厲害！', '鍋氣十足！'];
    const HURRY = ['老闆，我的菜呢～', '還要等很久嗎？', '肚子好餓喔……'];
    const at = s => ({ x: s.x * 60 + 30, y: s.y * 60 + 30 });
    const stationElevation = s => s.type === 'trash' ? 0 : s.x >= 5 && s.x <= 11 && s.y >= 5 ? 74 : 70;
    function leaf(x, y, angle, size, fill) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      const pts = [[0, size * .9], [-size * .72, size * .1], [-size * .28, -size * .72], [0, -size], [size * .42, -size * .62], [size * .78, size * .05]];
      paint(ctx, pts.map(p => wob(p[0], p[1], 0.35)), { color: fill, weight: 0.7, amp: 0, bleedAlpha: 0.1, pools: [[0, 0, size * .4, size * .55, '#3f5a38']] });
      hair(ctx, [[0, size * .7], [0, -size * .7]], '#d5e2c4', 0.6, 0.8);
      ctx.restore();
    }
    function plate(x, y, scale) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale || 1, scale || 1);
      shadow(ctx, 1, 7, 26, 10, 0.12);
      oval(ctx, 0, 1, 27, 17, { color: '#e4d9c6', weight: 1.15, amp: 0.4, grad: [[0, '#f7f1e6'], [1, '#d9cdb8']], x0: -20, y0: -10, x1: 20, y1: 14 });
      oval(ctx, 0, 0, 21, 12, { color: '#fbf7f0', weight: 0.7, amp: 0.3, inkColor: '#8d9c90' });
      ctx.save(); ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.ellipse(-6, -4, 8, 4, -0.5, Math.PI, Math.PI * 1.7);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
      ctx.restore();
    }
    function dish(recipe, x, y, scale, withPlate) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale || 1, scale || 1);
      if (withPlate !== false) plate(0, 0);
      if (recipe === 'greens') {
        for (let i = 0; i < 7; i++) leaf((rnd(i + 3) - 0.5) * 22, (rnd(i + 9) - 0.5) * 12 - 1, rnd(i) * 3, 8 + rnd(i + 2) * 3, i % 2 ? '#5e7c56' : '#8aaa78');
        for (let i = 0; i < 3; i++) oval(ctx, i * 8 - 8, i % 2 * 3, 2.2, 1.4, { color: '#f0e0b4', weight: 0.4, amp: 0.2 });
      } else if (recipe === 'rice') {
        oval(ctx, 0, 1, 18, 11, { color: '#e2c48a', weight: 0.8, grad: [[0, '#f0ddb0'], [1, '#c49a58']], x0: -16, y0: -8, x1: 14, y1: 10, pools: [[4, 3, 8, 5, '#a07840']] });
        for (let i = 0; i < 16; i++) {
          const px = Math.sin(i * 2.4) * 12, py = Math.cos(i * 1.7) * 6 - 1;
          hair(ctx, [[px, py], [px + 2.4, py - 0.6]], i % 5 === 0 ? '#6d8f58' : '#f7edd4', 0.9, 0.8);
        }
      } else if (recipe === 'beef') {
        for (let i = 0; i < 5; i++) {
          ctx.save(); ctx.translate(Math.sin(i * 1.7) * 11, Math.cos(i * 1.3) * 6); ctx.rotate(-0.6 + i * 0.35);
          blob(ctx, -8, -3, 16, 7, { color: i % 2 ? '#8d5a42' : '#a56b4e', rad: 3, amp: 0.35, weight: 0.6, pools: [[0, 0, 5, 2, '#5c382c']] });
          hair(ctx, [[-5, -1], [5, 0]], '#e4c2a4', 0.7, 0.7);
          ctx.restore();
        }
        for (let i = 0; i < 4; i++) leaf(-12 + i * 7, Math.sin(i) * 5, i, 6, '#7d9a68');
      } else if (recipe === 'onionEgg') {
        oval(ctx, -1, 1, 16, 11, { color: '#f7f1e4', weight: 0.8, amp: 0.45, pools: [[4, 2, 7, 4, '#e6d3b0']] });
        oval(ctx, 3, -1, 7, 5.5, { color: '#e2b15a', weight: 0.7, grad: [[0, '#f3d48a'], [1, '#c48a34']], x0: -2, y0: -4, x1: 8, y1: 4 });
        for (let i = 0; i < 5; i++) leaf(-10 + i * 5, Math.sin(i * 1.4) * 4, -0.4 + i * 0.3, 6, i % 2 ? '#6d9454' : '#c5d4a0');
      } else if (recipe === 'chicken') {
        for (let i = 0; i < 5; i++) {
          ctx.save(); ctx.translate(Math.sin(i * 2.1) * 12, Math.cos(i * 1.6) * 6); ctx.rotate(i * 0.4);
          blob(ctx, -7, -5, 14, 10, { color: '#c48952', rad: 4, amp: 0.4, weight: 0.65, grad: [[0, '#e2b278'], [1, '#a56a38']], x0: -7, y0: -5, x1: 7, y1: 6, pools: [[2, 2, 4, 3, '#7a4a28']] });
          ctx.restore();
        }
        for (let i = 0; i < 4; i++) leaf(Math.sin(i * 2) * 13, Math.cos(i) * 6, i, 6, '#4f7354');
      }
      ctx.restore();
    }
    function item(id, x, y, scale) {
      const info = ITEMS[id]; if (!info) return;
      if (info.kind === 'dish') return dish(info.recipe, x, y, scale);
      if (info.kind === 'plate') return plate(x, y, scale);
      ctx.save(); ctx.translate(x, y); ctx.scale(scale || 1, scale || 1);
      if (info.kind === 'greens' || info.kind === 'scallion') {
        if (info.chopped) {
          for (let i = 0; i < 7; i++) leaf((rnd(i + 4) - 0.5) * 26, (rnd(i + 11) - 0.5) * 14, rnd(i + 2) * 3, 5 + rnd(i) * 2, i % 2 ? '#6d8f58' : '#b7c99a');
        } else if (info.kind === 'greens') {
          for (let i = -1; i <= 1; i++) { ctx.save(); ctx.rotate(i * 0.35); leaf(0, -2, -0.2, 16, i ? '#5e7c56' : '#8aaa78'); ctx.restore(); }
          blob(ctx, -3, 6, 6, 16, { color: '#d7c89a', rad: 2, amp: 0.3, weight: 0.6 });
        } else {
          hair(ctx, [[0, 14], [-2, -6], [-8, -20]], '#7da05a', 2.2, 0.95);
          hair(ctx, [[1, 12], [3, -8], [6, -22]], '#a8c484', 1.6, 0.9);
          blob(ctx, -4, 8, 10, 8, { color: '#f3efe4', rad: 2, amp: 0.25, weight: 0.55, inkColor: '#c4b49a' });
        }
      } else if (info.kind === 'beef' || info.kind === 'chicken') {
        const meat = info.kind === 'beef' ? '#c48474' : '#f0d0b4';
        const deep = info.kind === 'beef' ? '#8d5348' : '#d2a888';
        if (info.chopped) {
          for (let i = 0; i < 4; i++) {
            ctx.save(); ctx.translate(i * 8 - 12, Math.sin(i * 2) * 3); ctx.rotate(i * 0.4);
            blob(ctx, -5, -4, 12, 9, { color: meat, rad: 3, amp: 0.3, weight: 0.55, pools: [[0, 1, 4, 2, deep]] });
            ctx.restore();
          }
        } else {
          const pts = [[-18, -4], [-8, -12], [8, -10], [18, -2], [16, 10], [0, 14], [-16, 8]].map(p => wob(p[0], p[1], 0.6));
          paint(ctx, pts, { color: meat, weight: 1.05, grad: [[0, '#f6e4d4'], [1, deep]], x0: -16, y0: -10, x1: 16, y1: 12, pools: [[6, 4, 8, 5, deep]] });
          hair(ctx, [[-10, -2], [0, 2], [10, -1]], '#fff1e4', 0.8, 0.55);
        }
      } else if (info.kind === 'basil') {
        for (let i = 0; i < 5; i++) leaf(Math.sin(i * 1.8) * 10, Math.cos(i * 1.4) * 7, i * 0.8, 8, i % 2 ? '#3f6848' : '#6e9460');
      } else if (info.kind === 'sauce' || info.kind === 'soy') {
        const soy = info.kind === 'soy';
        if (info.portion) {
          oval(ctx, 0, 4, 14, 8, { color: soy ? '#3e2c24' : '#7a4c38', weight: 0.9 });
          oval(ctx, 0, 1, 12, 6, { color: soy ? '#f0e2c4' : '#f0d2a0', weight: 0.6 });
          label(ctx, soy ? '1' : '2', 0, 1, 11, soy ? '#3e2c24' : '#6a3c28');
        } else bottle(0, 2, soy ? '#4a342c' : '#8d5a40', soy ? '#f3e6c8' : '#f0d2a4', soy ? '油' : '醬', soy ? '#3e2c24' : '#6a3c28');
      } else if (info.kind === 'mixedSauce') {
        oval(ctx,0,4,20,11,{color:'#f3ebd9',weight:1});
        oval(ctx,0,0,17,7,{color:'#b35d3e',weight:.7});
      } else if (info.kind === 'lemon') {
        oval(ctx, 0, 0, 14, 14, { color: '#e6c25e', weight: 1, grad: [[0, '#f6e29a'], [1, '#c9a044']], x0: -10, y0: -10, x1: 10, y1: 12, pools: [[4, 4, 6, 5, '#b08830']] });
        oval(ctx, 0, 0, 9, 9, { color: '#f7efd0', weight: 0.45, amp: 0.25 });
        for (let i = 0; i < 6; i++) hair(ctx, [[0, 0], [Math.cos(i) * 8, Math.sin(i) * 8]], '#d7b45a', 0.6, 0.7);
      } else if (info.kind === 'syrup') bottle(0, 2, '#e2b15e', '#f6e2b0', '糖', '#7a4e24');
      else if (info.kind === 'ice') {
        [[-14, -2, 11], [-2, -10, 12], [8, -3, 10]].forEach((c, i) => blob(ctx, c[0], c[1], c[2], c[2], {
          color: i === 1 ? '#d5e6e4' : '#e7f2f0', rad: 2, amp: 0.3, weight: 0.7, inkColor: '#6e8e96',
          grad: [[0, '#f7fffe'], [1, '#b7d0cc']], x0: c[0], y0: c[1], x1: c[0] + c[2], y1: c[1] + c[2]
        }));
      } else if (info.kind === 'plum') {
        [[-6, 0, '#7a3048'], [6, -2, '#9a4864'], [0, 6, '#5c2838']].forEach(p => oval(ctx, p[0], p[1], 7, 8, { color: p[2], weight: 0.7, amp: 0.35, pools: [[p[0], p[1] + 2, 3, 3, '#3a1824']] }));
      } else if (info.kind === 'juice') {
        const fill = info.drink === 'plum' ? '#8d4e64' : '#e4c56a';
        const glass = [[-11, -16], [11, -16], [8, 16], [-8, 16]].map(p => wob(p[0], p[1], 0.4));
        paint(ctx, glass, { color: 'rgba(247,244,236,0.92)', weight: 0.9, inkColor: '#6d7c74' });
        paint(ctx, [[-8, 2], [8, 2], [6, 14], [-6, 14]].map(p => wob(p[0], p[1], 0.3)), { color: fill, weight: 0, bleed: false });
        blob(ctx, -6, -20, 12, 5, { color: '#d7ece6', rad: 2, amp: 0.2, weight: 0.6, inkColor: '#6d7c74' });
        hair(ctx, [[-4, -8], [-2, 8]], '#ffffff', 1, 0.35);
      } else if (info.kind === 'egg') {
        oval(ctx, 0, 1, 12, 16, { color: '#f6e2bc', weight: 0.9, grad: [[0, '#fff6e4'], [1, '#e2c088']], x0: -8, y0: -12, x1: 8, y1: 14, pools: [[3, 4, 5, 6, '#d2ae78']] });
        oval(ctx, -3, -6, 3, 4, { color: '#fff8ea', weight: 0, amp: 0.2, bleedAlpha: 0.05 });
      } else if (info.kind === 'rice') {
        const bowl = [[-18, -2], [-14, 16], [14, 16], [18, -2]].map(p => wob(p[0], p[1], 0.45));
        paint(ctx, bowl, { color: '#e7eee4', weight: 1, inkColor: '#6e8c84', grad: [[0, '#f7faf4'], [1, '#c5d6cc']], x0: -16, y0: -2, x1: 16, y1: 16 });
        oval(ctx, 0, -2, 17, 9, { color: '#fbf3e0', weight: 0.7, inkColor: '#6e8c84', pools: [[2, 0, 8, 4, '#e6d3a8']] });
        for (let i = 0; i < 8; i++) hair(ctx, [[Math.sin(i * 2) * 11, Math.cos(i) * 4 - 2], [Math.sin(i * 2) * 11 + 3, Math.cos(i) * 4 - 3]], '#eadcba', 0.8, 0.8);
      }
      ctx.restore();
    }
    function bottle(x, y, glass, liquid, word, wordColor) {
      const body = [[-5, -20], [5, -20], [6, -14], [3, -10], [11, -6], [12, 16], [-12, 16], [-11, -6], [-3, -10], [-6, -14]].map(p => wob(x + p[0], y + p[1], 0.35));
      paint(ctx, body, { color: glass, weight: 1, grad: [[0, liquid], [0.45, glass], [1, glass]], x0: x - 10, y0: y - 16, x1: x + 10, y1: y + 16, pools: [[x + 4, y + 8, 5, 6, '#4a3428']] });
      blob(ctx, x - 8, y - 2, 16, 12, { color: liquid, rad: 1, amp: 0.25, weight: 0, bleed: false });
      label(ctx, word, x, y + 4, 11, wordColor);
      hair(ctx, [[x - 6, y - 12], [x - 5, y + 6]], '#fffaf2', 1.1, 0.4);
    }
    function badge(str, x, y, width, fill, color) {
      width = Math.max(width, str.length * 19 + 16);
      shadow(ctx, x + 1, y + 2, width * 0.42, 8, 0.1);
      blob(ctx, x - width / 2, y - 16, width, 30, {
        color: fill || P.cream, rad: 3, amp: 0.28, weight: 0.95,
        grad: [[0, '#fffaf2'], [1, fill || '#efe6d4']], x0: x - width / 2, y0: y - 12, x1: x, y1: y + 10
      });
      label(ctx, str, x, y - 1, 19, color || P.ink);
    }
    function measureBadge(text, x, y) {
      const width = Math.min(540, Math.max(96, text.length * 15 + 20));
      const cx = Math.max(width / 2 + 8, Math.min(x, 952 - width / 2));
      badge(text, cx, y, width, '#e5f0e6', '#24382e');
    }
    function bar(x, y, p, color) {
      blob(ctx, x - 34, y, 68, 7, { color: '#3e4c42', rad: 3, amp: 0.2, weight: 0.6 });
      const w = 64 * Math.max(0, Math.min(1, p));
      if (w > 1) blob(ctx, x - 32, y + 1.5, w, 4, { color: color || '#c4a15a', rad: 2, amp: 0.15, weight: 0, bleed: false });
    }
    function knob(x, y) {
      ell(ctx, x, y, 2.3, 2.3); ctx.fillStyle = P.brass; ctx.fill();
      ell(ctx, x, y, 2.3, 2.3); ctx.strokeStyle = P.brassDeep; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = '#f6e7c0'; ctx.fillRect(x - 0.4, y - 0.8, 0.8, 0.8);
    }
    function shaker(x, y, w, h, seed) {
      const lite = rnd(seed) > 0.55;
      blob(ctx, x, y, w, h, {
        color: lite ? '#c0c2ae' : '#aeb29e', rad: 1, amp: 0.3, weight: .75,
        grad: [[0, '#d6d6c5'], [0.45, lite ? '#bec1ae' : '#aeb29e'], [1, '#8d927e']], x0: x, y0: y, x1: x + w, y1: y + h,
        pools: [[x + w * 0.72, y + h * 0.78, w * 0.22, h * 0.22, '#6d8470']], bleedAlpha: 0.08
      });
      const m = 4.5;
      if (w > 16 && h > 14) {
        blob(ctx, x + m, y + 3.5, w - m * 2, h - 9, { color: '#b6baa5', rad: .5, amp: 0.2, weight: 0.6, bleedAlpha: 0.04, inkColor: '#737965' });
        knob(x + w / 2, y + h * 0.72);
      }
    }
    function stoneTop(x, y, w, h) {
      blob(ctx, x, y, w, h, {
        color: '#f7f3ec', rad: 2, amp: 0.45, weight: 0.95,
        grad: [[0, '#fffdf8'], [0.55, '#f6f1e8'], [1, '#e7dccb']], x0: x, y0: y, x1: x + w, y1: y + h,
        pools: [[x + w * 0.28, y + h * 0.55, w * 0.16, h * 0.28, '#d5cbb8']], bleedAlpha: 0.08
      });
      for (let i = 0; i < 3; i++) {
        const yy = y + 5 + rnd(x + i * 5) * Math.max(4, h - 10);
        hair(ctx, [[x + 8, yy], [x + w * 0.45, yy + (i % 2 ? 1.2 : -0.8)], [x + w - 10, yy - 0.6]], '#d5cbb8', 0.7, 0.8);
      }
      ctx.beginPath(); ctx.moveTo(x + 1, y + h - 1.2); ctx.lineTo(x + w - 1, y + h - 1.2);
      ctx.strokeStyle = '#8a7d68'; ctx.lineWidth = 1.35; ctx.stroke();
    }
    function cabinetRun(x, y, w) {
      const topH = 30, frontH = 26;
      shadow(ctx, x + w / 2, y + topH + frontH + 7, w * 0.46, 7, 0.13);
      stoneTop(x, y, w, topH);
      blob(ctx, x + 1, y + topH, w - 2, frontH, { color: '#6d7f70', rad: 1, amp: 0.25, weight: 0.4, bleed: false });
      const doorW = 44, gap = 6;
      const n = Math.max(1, Math.floor((w - 10) / (doorW + gap)));
      const span = n * doorW + (n - 1) * gap;
      let dx = x + (w - span) / 2;
      for (let i = 0; i < n; i++) {
        shaker(dx, y + topH + 2, doorW, frontH - 7, x + i * 13);
        dx += doorW + gap;
      }
      blob(ctx, x + 6, y + topH + frontH - 5, w - 12, 4, { color: '#5c6b5e', rad: 1, amp: 0.2, weight: 0.45 });
    }
    function basket(x, y, rx, ry) {
      shadow(ctx, x + 2, y + ry * 0.7, rx, ry * 0.45, 0.14);
      oval(ctx, x, y, rx, ry, {
        color: '#d7c09a', weight: 1.05, amp: 0.45,
        grad: [[0, '#f0e2c8'], [1, '#c4a67c']], x0: x - rx, y0: y - ry, x1: x + rx, y1: y + ry,
        pools: [[x + rx * 0.3, y + ry * 0.3, rx * 0.4, ry * 0.3, '#a88858']]
      });
      ctx.save();
      ell(ctx, x, y, rx * 0.92, ry * 0.88); ctx.clip();
      for (let i = -3; i <= 3; i++) hair(ctx, [[x - rx, y + i * ry * 0.28], [x + rx, y + i * ry * 0.28 + 1]], '#a88860', 0.7, 0.55);
      for (let i = -4; i <= 4; i++) hair(ctx, [[x + i * rx * 0.22, y - ry], [x + i * rx * 0.22 + 1, y + ry]], '#a88860', 0.6, 0.4);
      ctx.restore();
      ink(ctx, ovalPts(x, y, rx * 0.72, ry * 0.62, 0.3), 0.55, true, '#b08960');
    }
    function tray(x, y) {
      shadow(ctx, x + 2, y + 16, 24, 8, 0.12);
      blob(ctx, x - 22, y - 14, 44, 30, {
        color: P.steel, rad: 4, amp: 0.4, weight: 0.9, inkColor: '#7e9086',
        grad: [[0, '#f4f7f2'], [1, '#b7c6be']], x0: x - 22, y0: y - 14, x1: x + 10, y1: y + 16
      });
      for (let i = 0; i < 4; i++) hair(ctx, [[x - 16, y - 8 + i * 6], [x + 16, y - 9 + i * 6]], '#ffffff', 0.6, 0.35);
    }
    function carton(x, y) {
      blob(ctx, x - 20, y - 12, 40, 26, { color: '#e7dcc8', rad: 3, amp: 0.4, weight: 0.8, inkColor: '#a89880', pools: [[x + 8, y + 4, 10, 6, '#c4b49a']] });
      for (let i = 0; i < 4; i++) {
        oval(ctx, x - 14 + i * 9, y - 1 + (i % 2) * 2, 4.2, 5.2, { color: '#f6e6c4', weight: 0.45, amp: 0.2, grad: [[0, '#fff8ea'], [1, '#e2c898']], x0: x - 18, y0: y - 6, x1: x, y1: y + 6 });
      }
    }
    function ricePot(x, y) {
      shadow(ctx, x + 1, y + 16, 20, 6, 0.12);
      oval(ctx, x, y + 12, 18, 5, { color: '#c4a078', weight: 0.5, amp: 0.25 });
      oval(ctx, x, y + 2, 16, 14, { color: '#f7f3ea', weight: 1.05, grad: [[0, '#fffaf4'], [1, '#e2d4c0']], x0: x - 14, y0: y - 10, x1: x + 8, y1: y + 14, pools: [[x + 6, y + 6, 6, 5, '#cbb8a0']] });
      oval(ctx, x, y - 8, 14, 6, { color: '#fbf7f0', weight: 0.8 });
      oval(ctx, x, y - 12, 3, 2.4, { color: '#d7c4a4', weight: 0.5 });
      hair(ctx, [[x - 8, y + 2], [x + 2, y + 6]], '#e7d8c4', 0.5, 0.6);
    }
    function supply(s, x, y) {
      const onRun = s.builtIn || s.y === 1;
      const cy = onRun ? y - 18 : y - 8;
      if (!onRun) {
        shadow(ctx, x, y + 18, 28, 8, 0.12);
        shaker(x - 24, y + 2, 48, 22, x + y);
        stoneTop(x - 26, y - 16, 52, 20);
      }
      const basketKind = ['greens', 'scallion', 'basil', 'lemon', 'plum'].includes(s.supply);
      const cold = ['beef', 'chicken', 'ice'].includes(s.supply);
      if (s.supply === 'egg') carton(x, cy);
      else if (s.supply === 'rice') ricePot(x, cy);
      else if (s.supply === 'sauce' || s.supply === 'soy' || s.supply === 'syrup') item(s.supply, x, cy - 2, 0.95);
      else if (basketKind) { basket(x, cy, 20, 12); item(s.supply, x - 6, cy - 2, 0.55); item(s.supply, x + 7, cy - 1, 0.5); }
      else if (cold) { tray(x, cy); item(s.supply, x, cy - 1, 0.62); }
      else item(s.supply, x, cy, 0.8);
    }
    function knife(x, y, rotation) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
      blob(ctx, -4, -3, 28, 7, { color: '#e7eee6', rad: 1, amp: 0.25, weight: 0.7, inkColor: '#8a9a90', grad: [[0, '#ffffff'], [1, '#c5d0c8']], x0: -4, y0: -3, x1: 20, y1: 4 });
      blob(ctx, -16, -3.5, 14, 8, { color: '#8d6a48', rad: 2, amp: 0.25, weight: 0.7 });
      knob(-12, 0); knob(-7, 0);
      ctx.restore();
    }
    function steam(x, y, amount, gray) {
      for (let i = 0; i < 3; i++) {
        const t = (state.clock * 0.75 + i * 0.31) % 1;
        ctx.save(); ctx.globalAlpha = (1 - t) * 0.55 * (amount || 1);
        const sx = x - 14 + i * 14, sy = y - t * 32;
        ink(ctx, [[sx, sy], [sx - 6, sy - 10], [sx + 4, sy - 18], [sx + 1, sy - 26]], 1.1 + t, false, gray ? '#5c6056' : '#f7f1e2');
        ctx.restore();
      }
    }
    function fire(x, y) {
      for (let i = 0; i < 6; i++) {
        const fx = x - 20 + i * 8, h = 12 + Math.sin(state.clock * 11 + i * 2) * 4;
        const pts = [[fx - 4, y + 2], [fx - 1, y - h * 0.45], [fx, y - h], [fx + 2, y - h * 0.4], [fx + 5, y + 2]].map(p => wob(p[0], p[1], 0.35));
        paint(ctx, pts, { color: i % 2 ? '#e28a3c' : '#f0b25a', weight: 0.55, bleedAlpha: 0.2, bleedColor: '#f6d7a0', pools: [[fx, y - h * 0.3, 3, 4, '#c4622c']] });
        paint(ctx, [[fx - 1.5, y + 1], [fx, y - h * 0.45], [fx + 2, y + 1]].map(p => wob(p[0], p[1], 0.2)), { color: '#f8ecc4', weight: 0, bleed: false });
      }
    }
    function drawWok(s, x, y, w, mods) {
      const hot = w.state === 'cooking' || w.state === 'ready';
      if (!s.builtIn) {
      shadow(ctx, x + 2, y + 28, 36, 9, 0.16);
      blob(ctx, x - 30, y + 1, 60, 33, { color: '#b7bab0', rad: 1, amp: .25, weight: .8,
        grad: [[0,'#e4e3d7'],[.5,'#c7c8bb'],[1,'#969c90']] });
      blob(ctx, x - 23, y + 14, 46, 15, { color: '#565c53', rad: 1, amp: .2, weight: .7 });
      hair(ctx, [[x-18,y+18],[x+18,y+18]], '#afb3a4', 1, .7);
      hair(ctx, [[x-20,y+12],[x+20,y+12]], '#605f52', 1.6, .8);
      stoneTop(x - 34, y - 18, 68, 22);
      blob(ctx, x - 28, y - 14, 56, 16, {
        color: '#c5d2cb', rad: 2, amp: 0.3, weight: 0.6, inkColor: '#7e9086',
        grad: [[0, '#f7faf6'], [1, '#aebdb4']], x0: x - 28, y0: y - 14, x1: x + 20, y1: y
      });
      ink(ctx, ovalPts(x, y - 6, 16, 8, 0.25), 0.7, true, '#6e8076');
      ink(ctx, ovalPts(x, y - 6, 8, 4, 0.2), 0.45, true, '#8aa098');
      }
      if (hot) fire(x, y + 5);
      const toss = state.tosses[s.id] || 0, arcLift = toss > 0 ? Math.sin((1 - toss / 0.65) * Math.PI) : 0;
      ctx.save(); ctx.translate(x, y - 10 - arcLift * 5); ctx.rotate(-arcLift * 0.12);
      blob(ctx, 16, -2, 20, 6, { color: '#a8845c', rad: 2, amp: 0.25, weight: 0.7, pools: [[24, 0, 6, 2, '#6d5434']] });
      hair(ctx, [[18, 0], [32, -1]], '#e6d2b0', 0.6, 0.5);
      oval(ctx, 0, 4, 26, 15, { color: '#2f3a34', weight: 1.35, amp: 0.4 });
      oval(ctx, 0, 1, 24, 13, {
        color: '#4c5c52', weight: 0.9, amp: 0.35,
        grad: [[0, '#8a9a90'], [0.4, '#5a6c62'], [1, '#2c3832']], x0: -20, y0: -10, x1: 18, y1: 12,
        pools: [[8, 4, 8, 5, '#1e2824']]
      });
      ctx.save(); ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.ellipse(-6, -2, 10, 5, -0.4, Math.PI * 1.05, Math.PI * 1.8);
      ctx.strokeStyle = '#dfe6df'; ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(arcLift * 6, -arcLift * 26);
      if (w.state === 'burned') {
        oval(ctx, 0, 0, 18, 10, { color: '#2a302c', weight: 0.5, amp: 0.3 });
        for (let i = 0; i < 5; i++) oval(ctx, Math.sin(i) * 10, Math.cos(i * 2) * 5, 4, 2.4, { color: '#4a453c', weight: 0, amp: 0.2 });
      } else if (w.recipe) dish(w.recipe, 0, 0, 0.78, false);
      else w.ingredients.forEach((id, i) => item(id, (i - (w.ingredients.length - 1) / 2) * 13, 0, 0.52));
      ctx.restore(); ctx.restore();
      if (!s.builtIn) for (const dx of [-21,-7,7,21]) knob(x + dx, y + 7);
      if (hot) steam(x, y - 28);
      if (w.state === 'burned') { steam(x, y - 26, 0.75, true); badge('焦鍋 · 清理', x, y - 52, 98, '#f0ddd2', '#6d3e32'); }
      if (w.state === 'cooking') {
        badge(`×${w.portions || 1}`, x + 30, y - 2, 34, '#f6e6c0', '#6d5434');
        const p = w.elapsed / cookDuration(w);
        bar(x, y - 44, p, '#e2b15e');
        if (p >= mods.flipStart && p <= mods.flipEnd && !w.flipped) badge('F 翻炒', x, y - 62, 82, '#f8e7b4', '#5c4328');
      }
      if (w.state === 'ready') {
        bar(x, y - 44, 1 - w.readyTime / mods.burnTime, w.readyTime > mods.burnTime / 2 ? '#d78758' : '#c5c98a');
        badge(`剩 ${w.remaining || 1} 份`, x, y - 62, 90, w.readyTime > mods.burnTime / 2 ? '#f3d2b4' : '#f6e6c0', '#6d5434');
      }
      if (w.clearProgress > 0) bar(x, y - 44, w.clearProgress / 2, '#a8bfae');
    }
    function focusMark(x, y) {
      ctx.save(); ctx.globalAlpha = 0.55;
      ell(ctx, x, y + 8, 40, 24); ctx.fillStyle = '#f4e2c0'; ctx.fill(); ctx.restore();
      const ticks = [[x - 36, y - 28, 1, 0, 0, 1], [x + 36, y - 28, -1, 0, 0, 1], [x - 36, y + 30, 1, 0, 0, -1], [x + 36, y + 30, -1, 0, 0, -1]];
      for (const t of ticks) ink(ctx, [[t[0], t[1]], [t[0] + t[2] * 12, t[1]], [t[0], t[1]], [t[0] + t[4] * 10, t[1] + t[5] * 10]], 1.3, false, P.brassDeep);
    }
    function drawStation(s, game, target, chopping, active) {
      const x = s.x * 60 + 30, y = s.y * 60 + 30;
      const focused = active && target?.id === s.id;
      if (focused) focusMark(x, y);
      if(s.type==='supplyGroup') {
        if(s.id==='seasoning') {
          oval(ctx,x,y,45,17,{color:'#c7af85',weight:1});
          for(const [i,id] of s.members.slice(0,5).entries()){const source=game.stations.find(st=>st.id===id);item(source.supply,x-30+i*15,y-13,.52);}
        } else if(s.id==='pantry') {
          basket(x,y,30,15);
          for(const [i,id] of s.members.slice(0,3).entries()){const source=game.stations.find(st=>st.id===id);item(source.supply,x-17+i*17,y-8,.48);}
        }
      } else if (s.type === 'supply') { if (s.x < 13) supply(s, x, y); }
      else if (s.type === 'wok') drawWok(s, x, y, game.woks[s.id], game.mods);
      else if (s.type === 'trash') {
        shadow(ctx, x + 2, y + 22, 22, 7, 0.14);
        const pail = [[-16, -8], [16, -8], [13, 20], [-13, 20]].map(p => wob(x + p[0], y + p[1], 0.45));
        paint(ctx, pail, { color: '#d5ddd8', weight: 1.1, inkColor: '#6e7e76', grad: [[0, '#f4f7f4'], [1, '#aeb8b2']], x0: x - 16, y0: y - 8, x1: x + 12, y1: y + 20, pools: [[x + 6, y + 10, 7, 6, '#7a8880']] });
        hair(ctx, [[x - 14, y + 2], [x + 14, y + 2]], '#8a9890', 1.3, 0.7);
        hair(ctx, [[x - 13, y + 12], [x + 13, y + 12]], '#8a9890', 1.1, 0.6);
        ink(ctx, ovalPts(x, y - 10, 16, 6, 0.3), 0.9, true, '#6e7e76');
        ink(ctx, [[x - 14, y - 16], [x - 10, y - 22], [x + 10, y - 22], [x + 14, y - 16]], 0.8, false, '#6e7e76');
      } else if (s.type === 'board') {
        if (!s.builtIn) { shaker(x - 30, y + 4, 60, 30, x + y); stoneTop(x - 34, y - 18, 68, 24); }
        shadow(ctx, x + 2, y + 16, 30, 8, 0.14);
        blob(ctx, x - 30, y - 6, 60, 10, { color: '#b4895c', rad: 2, amp: 0.3, weight: 0.5 });
        blob(ctx, x - 32, y - 22, 64, 28, {
          color: '#e6c898', rad: 3, amp: 0.55, weight: 1.15, inkColor: '#8d6844',
          grad: [[0, '#f6e2c4'], [1, '#d2ae78']], x0: x - 32, y0: y - 22, x1: x + 20, y1: y + 6,
          pools: [[x + 12, y - 4, 14, 6, '#b88858']],
          inside() {
            for (let i = 0; i < 5; i++) hair(ctx, [[x - 24, y - 16 + i * 5], [x + 24, y - 18 + i * 5]], '#c49a68', 0.7, 0.55);
          }
        });
        ink(ctx, rectPts(x - 24, y - 16, 48, 16, 0.3, 6), 0.55, true, '#c4a078');
        if (s.item) item(s.item.id, x, y - 10, 0.78);
        const cutting = chopping === s.id;
        if (cutting) {
          knife(x + 2, y - 16 - Math.abs(Math.sin(state.clock * 18)) * 12, -0.15);
          for (let i = 0; i < 3; i++) {
            const t = (state.clock * 2 + i * 0.33) % 1;
            leaf(x - 14 + t * 24, y - 18 - Math.sin(t * Math.PI) * 10, t * 2, 4, '#a5b774');
          }
        } else knife(x + 18, y - 8, -0.9);
        if (s.progress > 0 && s.item && !ITEMS[s.item.id].chopped) bar(x, y - 42, s.progress / chopDuration(s.item, game.mods));
        if (s.item && (s.item.count || 1) > 1) badge(`×${s.item.count}`, x + 22, y - 24, 32, '#f6e6c0', '#6d5434');
      } else if (s.type === 'counter') {
        if (s.builtIn) blob(ctx,x-28,y-24,56,32,{color:'#e5ddc5',rad:4,amp:.3,weight:.8,inkColor:'#a49c81'});
        if (!s.builtIn) {
        shadow(ctx, x + 2, y + 20, 30, 8, 0.13);
        shaker(x - 26, y - 2, 24, 22, x);
        shaker(x + 2, y - 2, 24, 22, x + 4);
        stoneTop(x - 30, y - 22, 60, 22);
        }
        if (s.spoons > 0) {
          const soy = s.sauceId === 'soy';
          oval(ctx, x, y - 12, 14, 8, { color: soy ? '#3e2c24' : '#7a4c38', weight: 0.8 });
          oval(ctx, x, y - 15, 12, 6, { color: soy ? '#f0e2c4' : '#f0d2a0', weight: 0.55 });
          measureBadge(sauceMeasureLine ? sauceMeasureLine(s) : `${s.spoons} 大匙`, x, y - 52);
        } else if (s.item) item(s.item.id, x, y - 16, 0.9);
        if (s.item && (s.item.count || 1) > 1 && !(s.spoons > 0)) badge(`×${s.item.count}`, x + 22, y - 26, 32, '#f6e6c0', '#6d5434');
      } else if (s.type === 'sauceMix') {
        oval(ctx,x,y,28,16,{color:'#f3ebd9',weight:1});
        oval(ctx,x,y-5,24,11,{color:s.item||Object.keys(s.mix).length?'#b35d3e':'#ded8c9',weight:.7});
        if(s.item) item(s.item.id,x,y-14,.8);
        if(s.progress>0)bar(x,y-35,s.progress/MIX_TIME);
      } else if (s.type === 'plates') {
        shadow(ctx, x, y + 18, 26, 7, 0.12);
        blob(ctx, x - 28, y + 4, 56, 8, { color: '#c4a078', rad: 2, amp: 0.3, weight: 0.7 });
        blob(ctx, x - 26, y - 4, 6, 14, { color: '#d7be96', rad: 1, amp: 0.2, weight: 0.5 });
        blob(ctx, x + 20, y - 4, 6, 14, { color: '#d7be96', rad: 1, amp: 0.2, weight: 0.5 });
        if (game.plates) for (let i = Math.min(4, game.plates) - 1; i >= 0; i--) plate(x, y - 8 + i * 3, 0.72);
        else ink(ctx, ovalPts(x, y - 6, 16, 8, 0.3), 0.7, true, '#b7c4b4');
        badge(String(game.plates), x + 24, y - 22, 26, '#f6e6c0', '#6d5434');
      } else if (s.type === 'serve') {
        shadow(ctx, x + 2, y + 18, 32, 8, 0.14);
        blob(ctx, x - 32, y - 8, 64, 26, {
          color: '#e2c49a', rad: 2, amp: 0.45, weight: 1.05, inkColor: '#8d6844',
          grad: [[0, '#f3ddb8'], [1, '#c49a62']], x0: x - 32, y0: y - 8, x1: x + 20, y1: y + 18,
          inside() { for (let i = 0; i < 4; i++) hair(ctx, [[x - 26, y - 2 + i * 5], [x + 26, y - 4 + i * 5]], '#c4a078', 0.6, 0.5); }
        });
        blob(ctx, x - 16, y - 24, 32, 18, { color: P.sage, rad: 2, amp: 0.35, weight: 0.8, pools: [[x + 6, y - 14, 8, 5, '#5d7360']] });
        label(ctx, '上菜', x, y - 15, 13, P.cream);
        oval(ctx, x + 20, y + 8, 7, 4, { color: '#d7be78', weight: 0.6 });
        oval(ctx, x + 20, y + 4, 2, 2.2, { color: P.brass, weight: 0.4 });
      } else if (s.type === 'juice') {
        if (!s.builtIn) {
        shadow(ctx, x + 1, y + 16, 28, 8, 0.12);
        shaker(x - 26, y, 22, 20, x);
        shaker(x - 2, y, 26, 20, x + 6);
        stoneTop(x - 28, y - 20, 56, 22);
        }
        const glass = [[x - 8, y - 18], [x + 8, y - 18], [x + 6, y - 2], [x - 6, y - 2]].map(p => wob(p[0], p[1], 0.3));
        paint(ctx, glass, { color: 'rgba(247,250,248,0.9)', weight: 0.7, inkColor: '#7e9086' });
        if (s.item) item(s.item.id, x, y - 12, 0.62);
        else if (s.ingredients?.length) s.ingredients.forEach((id, i) => item(id, x - 14 + i * 12, y - 12, 0.32));
        else if (s.mix) ['lemon', 'plum', 'syrup', 'ice'].filter(id => s.mix[id] > 0).forEach((id, i, list) => item(id, x + (i - (list.length - 1) / 2) * 12, y - 12, 0.3));
        if (s.progress > 0 && !s.item) bar(x, y - 44, s.progress / MIX_TIME, '#7ec8c0');
        if (s.mix && juiceMeasureLines && ['lemon', 'plum', 'syrup', 'ice'].some(id => s.mix[id] > 0)) juiceMeasureLines(s.mix).forEach((line, i, list) => measureBadge(line, x, y - 66 - (list.length - 1 - i) * 26));
      }
      if (focused) badge(s.name, x, y + 48, Math.max(76, s.name.length * 14 + 14), '#fffaf0', '#60513b');
      else label(ctx, s.name, x, y + (s.builtIn ? 24 : 45), 22, '#393b32', 'center', 700);
    }
    function lantern(x, y, word) {
      shadow(ctx, x + 3, y + 18, 16, 8, 0.12);
      hair(ctx, [[x, y - 28], [x, y - 16]], P.brassDeep, 1.1, 0.9);
      oval(ctx, x, y, 16, 22, {
        color: '#c46a52', weight: 1.15, amp: 0.5,
        grad: [[0, '#f0b098'], [0.5, '#c4624c'], [1, '#8d4034']], x0: x - 10, y0: y - 16, x1: x + 12, y1: y + 18,
        pools: [[x + 6, y + 8, 6, 8, '#6d3028']]
      });
      for (let i = -1; i <= 1; i++) hair(ctx, [[x + i * 6, y - 16], [x + i * 6, y + 16]], '#f0c2a8', 0.5, 0.45);
      blob(ctx, x - 7, y - 24, 14, 5, { color: '#6d4c38', rad: 1, amp: 0.2, weight: 0.6 });
      blob(ctx, x - 7, y + 18, 14, 4, { color: '#6d4c38', rad: 1, amp: 0.2, weight: 0.5 });
      hair(ctx, [[x, y + 22], [x - 2, y + 32], [x + 1, y + 36]], P.brass, 0.8, 0.8);
      label(ctx, word, x, y, 15, '#f8e7c0');
    }
    function stool(x,y) {
      shadow(ctx,x+1,y+53,23,7,.12);
      for(const [dx,dy] of [[-15,-2],[15,-2],[-16,6],[16,6]]) {
        hair(ctx,[[x+dx,y+dy],[x+dx*1.3,y+53]],'#8b7654',3,.9);
        hair(ctx,[[x+dx+1,y+dy],[x+dx*1.3+1,y+52]],'#d8bd8e',1,.8);
      }
      hair(ctx,[[x-20,y+35],[x+20,y+35]],'#9d8259',2,.85);
      oval(ctx,x,y,24,15,{color:'#d8bc8d',weight:.9,amp:.35,grad:[[0,'#eddbb8'],[1,'#bfa074']],x0:x-20,y0:y-10,x1:x+18,y1:y+12});
      ctx.save();ell(ctx,x,y,21,12);ctx.clip();
      for(let i=-5;i<=5;i++) {
        hair(ctx,[[x-23,y+i*3],[x+23,y+i*3]],'#997d54',.55,.6);
        hair(ctx,[[x+i*4,y-15],[x+i*4,y+15]],'#efe0bc',.65,.8);
      }
      ctx.restore();
    }
    function guest(x, y, angle, color, index) {
      ctx.save(); ctx.translate(x, y + Math.sin(state.clock * 1.3 + index) * 0.7); ctx.rotate(angle);
      shadow(ctx, 1, 12, 14, 5, 0.1);
      oval(ctx, 0, 6, 14, 12, { color: color, weight: 0.9, amp: 0.4, pools: [[4, 8, 6, 4, '#5c5348']] });
      hair(ctx, [[-6, 2], [0, 8], [6, 2]], '#f7f1e6', 0.7, 0.45);
      oval(ctx, -12, 8, 4, 5, { color: '#e2c0a4', weight: 0.45, amp: 0.2 });
      oval(ctx, 12, 8, 4, 5, { color: '#e2c0a4', weight: 0.45, amp: 0.2 });
      oval(ctx, 0, -8, 11, 12, { color: '#f0d0b4', weight: 0.9, amp: 0.35, grad: [[0, '#f8e0cc'], [1, '#e0b898']], x0: -8, y0: -16, x1: 8, y1: 2, pools: [[0, 0, 6, 4, '#d2a888']] });
      oval(ctx, 0, -16, 12, 7, { color: index % 2 ? '#4a463e' : '#2f3832', weight: 0.7, amp: 0.3 });
      if (index % 3 === 0) hair(ctx, [[-8, -18], [-2, -22], [4, -20], [9, -16]], '#2a302c', 0.8, 0.8);
      hair(ctx, [[-4, -8], [-2, -9]], P.ink, 0.8, 0.9);
      hair(ctx, [[2, -9], [5, -8]], P.ink, 0.8, 0.9);
      hair(ctx, [[-2, -4], [2, -3]], '#a86858', 0.6, 0.7);
      ctx.restore();
    }
    function rug(x, y, w, h) {
      blob(ctx, x, y, w, h, {
        color: '#e6d7bf', rad: 2, amp: 0.4, weight: 0.6, inkColor: '#b7a48a',
        grad: [[0, '#f3e8d6'], [1, '#d7c4a6']], x0: x, y0: y, x1: x + w, y1: y + h
      });
      for (let i = 0; i < 5; i++) hair(ctx, [[x + 4, y + 8 + i * (h / 6)], [x + w - 4, y + 10 + i * (h / 6)]], i % 2 ? '#c4b49a' : '#8fa898', 1.2, 0.45);
      for (let i = 0; i < 8; i++) hair(ctx, [[x + 3 + (i % 2) * 2, y + h - 2], [x + 3 + (i % 2) * 2, y + h + 4]], '#c4b49a', 0.5, 0.6);
    }
    function plant(x, y, scale) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale || 1, scale || 1);
      shadow(ctx, 2, 16, 16, 5, 0.12);
      blob(ctx, -12, 2, 24, 16, { color: '#c4785c', rad: 2, amp: 0.35, weight: 0.8, grad: [[0, '#e2a090'], [1, '#a85c48']], x0: -12, y0: 2, x1: 8, y1: 18, pools: [[4, 10, 6, 4, '#7a3c30']] });
      oval(ctx, 0, 2, 11, 4, { color: '#5c4634', weight: 0.4, amp: 0.2 });
      for (let i = 0; i < 6; i++) leaf(Math.sin(i * 1.4) * 8, -8 + Math.cos(i) * 4, i * 0.7, 11 + (i % 3), i % 2 ? '#5e7c56' : '#8aaa78');
      ctx.restore();
    }
    function frame(x, y, w, h) {
      blob(ctx, x, y, w, h, { color: '#d7be96', rad: 1, amp: 0.25, weight: 0.7, inkColor: '#8d6844' });
      blob(ctx, x + 3, y + 3, w - 6, h - 6, { color: '#f7f3ea', rad: 1, amp: 0.2, weight: 0.4 });
      leaf(x + w * 0.4, y + h * 0.55, -0.4, h * 0.28, '#6e9460');
      leaf(x + w * 0.62, y + h * 0.5, 0.5, h * 0.22, '#8aaa78');
    }
    function floorBoards(x, y, w, h, salt) {
      const boardW = 28;
      const tones = ['#eee3d0', '#eadfc9', '#eee1cd', '#e9dcc5', '#efe4d2', '#eadfc9'];
      ctx.save();
      let col = 0;
      for (let xx = x; xx < x + w - 1; xx += boardW) {
        const bw = Math.min(boardW, x + w - xx);
        let yy = y - ((col * 53 + salt * 17) % 62);
        let seg = 0;
        while (yy < y + h) {
          const len = 92 + rnd(salt + col * 9 + seg * 3) * 68;
          const y0 = Math.max(y, yy), y1 = Math.min(y + h, yy + len);
          if (y1 - y0 > 3 && bw > 2) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = tones[(col + seg) % tones.length];
            ctx.fillRect(xx + 1.2, y0 + 0.6, Math.max(1, bw - 2.4), Math.max(1, y1 - y0 - 1));
            ctx.strokeStyle = '#b98956'; ctx.lineWidth = 0.85; ctx.globalAlpha = 0.55;
            for (let g = 0; g < 3; g++) {
              const gx = xx + 4 + g * (bw * 0.28);
              ctx.beginPath(); ctx.moveTo(gx, y0 + 4); ctx.lineTo(gx + (rnd(gx + seg) - 0.5) * 1.6, y1 - 4); ctx.stroke();
            }
            if (rnd(col * 4 + seg + salt) > 0.84) {
              const kx = xx + bw * 0.55, ky = (y0 + y1) / 2;
              ctx.globalAlpha = 1;
              ell(ctx, kx, ky, 3.5, 2.3); ctx.fillStyle = '#d7b48a'; ctx.fill();
              ell(ctx, kx, ky, 1.5, 1); ctx.fillStyle = '#8d6438'; ctx.fill();
              ctx.strokeStyle = '#8d6438'; ctx.lineWidth = 0.7; ell(ctx, kx, ky, 3.5, 2.3); ctx.stroke();
            }
            if (y0 > y + 2) {
              ctx.globalAlpha = 1; ctx.strokeStyle = '#8d6840'; ctx.lineWidth = .55;
              ctx.beginPath(); ctx.moveTo(xx + 1, y0); ctx.lineTo(xx + bw - 1, y0); ctx.stroke();
            }
          }
          yy += len; seg++;
        }
        ctx.globalAlpha = 1; ctx.strokeStyle = '#8d6840'; ctx.lineWidth = .55;
        ctx.beginPath(); ctx.moveTo(xx + 0.5, y + 1); ctx.lineTo(xx + 0.5, y + h - 1); ctx.stroke();
        col++;
      }
      ctx.restore();
    }
    function tiles(x, y, w, h) {
      const tw = 26, th = 11;
      let row = 0;
      for (let yy = y; yy < y + h - 4; yy += th + 2) {
        const shift = row % 2 ? tw * 0.5 : 0;
        let col = 0;
        for (let xx = x - shift; xx < x + w; xx += tw + 2) {
          const x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + tw);
          if (x1 - x0 < 6) { col++; continue; }
          const tone = rnd(xx + yy) > 0.75 ? '#fbf7f0' : rnd(xx * 0.3 + yy) > 0.5 ? '#f3eee6' : '#e7e0d4';
          blob(ctx, x0, yy, x1 - x0, th, { color: tone, rad: 0.5, amp: 0.22, weight: 0.35, inkColor: '#cfc6b6', bleedAlpha: 0.05 });
          col++;
        }
        row++;
      }
    }
    function awning() {
      blob(ctx, 8, 6, 1144, 14, { color: '#6f8774', rad: 2, amp: 0.3, weight: 0.8, inkColor: '#3e4c42' });
      const bays = 22, bw = 1128 / bays;
      for (let i = 0; i < bays; i++) {
        const x0 = 16 + i * bw;
        const sag = 8 + rnd(i + 2) * 5;
        const cream = i % 2 === 0;
        const pts = [[x0, 16], [x0 + bw, 16], [x0 + bw, 36 + sag * 0.3]];
        for (let k = 4; k >= 0; k--) {
          const t = k / 4;
          pts.push([x0 + bw * t, 40 + Math.sin(t * Math.PI) * (12 + sag * 0.3)]);
        }
        paint(ctx, pts.map(p => wob(p[0], p[1], 0.4)), {
          color: cream ? '#f7f1e4' : '#7f9a86', weight: 0.85,
          grad: cream ? [[0, '#fffaf2'], [1, '#e6dcc8']] : [[0, '#c5d4c4'], [1, '#5f7a68']],
          x0: x0, y0: 16, x1: x0, y1: 58,
          pools: [[x0 + bw * 0.5, 42, bw * 0.2, 8, cream ? '#d9cbb4' : '#4e6454']],
          inkColor: '#3e4c42'
        });
      }
    }
    function shopSign() {
      blob(ctx, 348, 8, 460, 54, {
        color: P.cream, rad: 3, amp: 0.45, weight: 1.25,
        grad: [[0, '#fffaf4'], [1, '#efe4d2']], x0: 348, y0: 8, x1: 700, y1: 62,
        pools: [[700, 40, 80, 16, '#e2d4c0']]
      });
      ink(ctx, rectPts(356, 15, 444, 40, 0.3, 2), 0.55, true, P.brass);
      leaf(430, 48, -0.8, 6, '#7f9a86');
      hair(ctx, [[448, 50], [520, 48], [600, 50]], P.brassDeep, 0.7, 0.7);
      leaf(628, 48, 0.6, 6, '#7f9a86');
      label(ctx, '巷 口 熱 炒', 530, 32, 26, '#8d4638', 'center', 700);
      label(ctx, '現點現炒', 742, 26, 12, P.inkSoft);
      label(ctx, '大火上桌', 742, 42, 12, P.inkSoft);
    }
    // Straight architectural edges keep the room readable beneath the loose washes.
    function polygon(points, fill, stroke = '#827b68', weight = .75) {
      ctx.beginPath(); ctx.moveTo(...points[0]);
      for (const point of points.slice(1)) ctx.lineTo(...point);
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      // Pigment gathers unevenly inside large architectural surfaces.
      const xs=points.map(p=>p[0]), ys=points.map(p=>p[1]);
      const x0=Math.min(...xs), y0=Math.min(...ys), w=Math.max(...xs)-x0, h=Math.max(...ys)-y0;
      if (w*h > 2200 && !fill.startsWith('rgba')) {
        ctx.save(); ctx.clip();
        const wash=linear(ctx,x0,y0,x0+w*.8,y0+h,[[0,'rgba(255,253,235,.20)'],[.55,'rgba(174,155,121,.02)'],[1,'rgba(75,70,49,.10)']],fill);
        ctx.fillStyle=wash; ctx.fillRect(x0,y0,w,h);
        for(let i=0;i<Math.min(150,w*h/100);i++) {
          const xx=x0+rnd(i*3+x0)*w, yy=y0+rnd(i*7+y0)*h;
          ctx.globalAlpha=.035; ctx.fillStyle=i%2?'#fdf9e9':'#81795e';
          ctx.beginPath(); ctx.ellipse(xx,yy,2+rnd(i+5)*10,1+rnd(i+8)*4,0,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
      }
      if (weight) {
        ctx.beginPath(); ctx.moveTo(...points[0]);
        for (const point of points.slice(1)) ctx.lineTo(...point);
        ctx.closePath(); ctx.strokeStyle=stroke; ctx.lineWidth=weight; ctx.stroke();
      }
    }
    function roomPoint(x, y, z = 0) { const p = project(x, y, z); return [p.x, p.y]; }
    function plane(points, fill, stroke, weight) { polygon(points.map(p => roomPoint(...p)), fill, stroke, weight); }
    function roomLine(points, color = '#a59a85', weight = .6, alpha = .6) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath();
      const p = points.map(p => roomPoint(...p)); ctx.moveTo(...p[0]);
      for (const point of p.slice(1)) ctx.lineTo(...point);
      ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.stroke(); ctx.restore();
    }
    function cabinetBox(r, height = 70, fill = '#aeb19d') {
      const {x,y,w,h}=r;
      plane([[x,y+h,0],[x+w,y+h,0],[x+w,y+h,height],[x,y+h,height]],fill,'#777864',.8);
      plane([[x+w,y,0],[x+w,y+h,0],[x+w,y+h,height],[x+w,y,height]],'#989f88','#747b67',.8);
      for(let xx=x;xx<x+w-10;xx+=75) {
        const right=Math.min(x+w-5,xx+70);
        plane([[xx+5,y+h,7],[right,y+h,7],[right,y+h,height-7],[xx+5,y+h,height-7]],'#b9bca7','#787d68',.65);
        plane([[xx+12,y+h+.1,15],[right-7,y+h+.1,15],[right-7,y+h+.1,height-18],[xx+12,y+h+.1,height-18]],'#aeb49c','#898e79',.55);
        roomLine([[xx+14,y+h+1,height-10],[right-9,y+h+1,height-10]],'#8f7851',2,.8);
      }
      for(let yy=y;yy<y+h-15;yy+=80) {
        const end=Math.min(y+h-5,yy+74);
        plane([[x+w,yy+5,8],[x+w,end,8],[x+w,end,height-8],[x+w,yy+5,height-8]],'#a7ae97','#737b65',.55);
        plane([[x+w+.1,yy+12,16],[x+w+.1,end-7,16],[x+w+.1,end-7,height-19],[x+w+.1,yy+12,height-19]],'#b2b7a0','#828b73',.45);
      }
      plane([[x-4,y-3,height],[x+w+4,y-3,height],[x+w+4,y+h+4,height],[x-4,y+h+4,height]],'#f4f0e6','#7c7666',.9);
      plane([[x-4,y+h+4,height],[x+w+4,y+h+4,height],[x+w+4,y+h+4,height-4],[x-4,y+h+4,height-4]],'#d2ccbd','#8e8777',.55);
      for(let i=0;i<9;i++) {
        const xx=x+8+rnd(i+x)*Math.max(1,w-55), yy=y+8+rnd(i+y)*Math.max(1,h-25);
        roomLine([[xx,yy,height+.1],[xx+15,yy+4,height+.1],[Math.min(x+w-5,xx+40),yy+2,height+.1]],'#c7c0b1',.5,.45);
      }
    }
    function island() { cabinetBox(ROOM_LAYOUT.island,74); }
    function room() {
      ctx.fillStyle=P.paper; ctx.fillRect(0,0,WIDTH,HEIGHT);
      label(ctx,'巷 口 熱 炒',580,39,25,'#48473e','center',500);
      label(ctx,'ALEX’S KITCHEN  /  料理日常',580,67,10,'#898371','center',400);
      hair(ctx,[[210,88],[515,88]],'#a69c85',.6,.65); hair(ctx,[[645,88],[950,88]],'#a69c85',.6,.65);
      leaf(538,88,-.6,6,'#9da18a'); leaf(621,88,.6,6,'#9da18a');
      plane([[0,0,0],[960,0,0],[960,0,165],[0,0,165]],'#eeeade');
      plane([[0,0,0],[0,600,0],[0,600,165],[0,0,165]],'#e5e0d2');
      plane([[960,0,0],[960,600,0],[960,600,165],[960,0,165]],'#f1eee4');
      plane([[0,0,0],[960,0,0],[960,600,0],[0,600,0]],'#e9d8bc');
      const tones=['#eadbc3','#e7d5b9','#efdfc7','#e9d8bd','#ebdcc4'];
      for(let row=0;row<25;row++) {
        const y=row*24;
        plane([[0,y,0],[960,y,0],[960,y+24,0],[0,y+24,0]],tones[row%tones.length],'#bfae93',.35);
        for(let x=(row%3)*105+70;x<960;x+=310) roomLine([[x,y,0],[x,y+24,0]],'#aa9678',.45,.55);
        for(let k=0;k<6;k++) {
          const x=rnd(row*7+k)*880, yy=y+5+rnd(row+k+9)*14;
          roomLine([[x,yy,0],[x+35,yy+.6,0],[Math.min(960,x+95),yy,0]],'#b9a180',.45,.22);
        }
      }
      plane([[0,220,0],[230,270,0],[420,520,0],[0,475,0]],'rgba(255,253,236,.24)','',0);
      for(const x of [0,960]) {
        roomLine([[x,0,0],[x,600,0]],'#8c816c',1,.8);
        roomLine([[x,0,8],[x,600,8]],'#b7ae9c',3,.6);
      }
      // The right-hand opening and runner match the reference room's circulation.
      plane([[960,300,6],[960,505,6],[960,505,168],[960,300,168]],'#e1e1d5','#7a7a69',1);
      for(const yy of [305,405,500]) roomLine([[960,yy,9],[960,yy,167]],'#fffaf0',5,1);
      for(const z of [12,90,165]) roomLine([[960,305,z],[960,500,z]],'#fffaf0',4,1);
      plane([[775,320,0],[875,320,0],[875,552,0],[775,552,0]],'#cabd9f','#9f8f70',.7);
      for(let y=325;y<552;y+=6) roomLine([[779,y,0],[871,y,0]],'#968b70',.45,.33);
      for(let x=780;x<875;x+=7) roomLine([[x,324,0],[x,549,0]],'#eee3ca',.45,.6);
      // Full-height left window over the sink.
      plane([[0,255,65],[0,462,65],[0,462,218],[0,255,218]],'#fbf8ed','#747465',1);
      plane([[0,265,76],[0,452,76],[0,452,208],[0,265,208]],'#dce0ce','#9ca088',.65);
      for(let y=275;y<450;y+=25) roomLine([[0,y,80],[0,y+16,182]],'#96a085',1,.4);
      roomLine([[0,357,71],[0,357,213]],'#fcfaf2',5,1);
      roomLine([[0,261,145],[0,457,145]],'#fcfaf2',4,1);
      roomLine([[0,250,65],[0,467,65]],'#918775',4,.8);
      // Backsplash, cupboards either side of a central chimney hood.
      for(let z=70;z<127;z+=14) for(let x=40;x<760;x+=34)
        plane([[x,12,z],[x+33,12,z],[x+33,12,z+13],[x,12,z+13]],'#f7f3e9','#d3ccba',.35);
      for(const [x,w] of [[48,325],[625,125]]) {
        plane([[x,10,126],[x+w,10,126],[x+w,10,218],[x,10,218]],'#a9ad99');
        plane([[x,10,218],[x+w,10,218],[x+w,35,218],[x,35,218]],'#d0d0bf');
        const count=Math.max(1,Math.round(w/100)), dw=w/count;
        for(let i=0;i<count;i++) {
          const xx=x+i*dw;
          plane([[xx+3,35,129],[xx+dw-3,35,129],[xx+dw-3,35,214],[xx+3,35,214]],'#b8bba7','#727662',.9);
          plane([[xx+11,35,138],[xx+dw-11,35,138],[xx+dw-11,35,205],[xx+11,35,205]],'#aeb29d','#7e826f',.6);
          const handle=project(xx+dw-17,36,147); knob(handle.x,handle.y);
        }
      }
      cabinetBox(ROOM_LAYOUT.back);
      cabinetBox({x:45,y:130,w:95,h:65});
      // Open dry-storage rack occupies the former sink run.
      for(const z of [8,38,70]) {
        plane([[45,205,z],[140,205,z],[140,550,z],[45,550,z]],'#c8b18b','#7c6e55',.9);
      }
      for(const y of [205,315,425,550]) {
        plane([[45,y,0],[140,y,0],[140,y,70],[45,y,70]],'#c0a580','#75684f',.7);
      }
      // Dark open cubbies and exposed shelf edges facing the aisle.
      plane([[141,205,4],[141,550,4],[141,550,68],[141,205,68]],'#655e4c','#776c55',.5);
      for(const z of [8,38,70]) plane([[142,205,z],[142,550,z],[142,550,z+4],[142,205,z+4]],'#dac29a','#827154',.8);
      for(const y of [205,315,425,545]) plane([[143,y,0],[143,y+5,0],[143,y+5,74],[143,y,74]],'#d0b88e','#827154',.6);
      for(const y of [254,366,476]) {
        const p=project(130,y,22);basket(p.x,p.y,16,10);
      }
      // Central oven and hood; the functional pans are drawn above this built-in range.
      plane([[403,131,0],[607,131,0],[607,131,70],[403,131,70]],'#bfc2b9','#686d63',.8);
      plane([[418,132,9],[592,132,9],[592,132,45],[418,132,45]],'#4c524a','#6e7267',.9);
      plane([[429,133,16],[581,133,16],[581,133,36],[429,133,36]],'#74796b','#9ca18e',.4);
      roomLine([[425,134,49],[585,134,49]],'#62675d',3,.95);
      for(let x=428;x<598;x+=40) { const h=project(x,134,59); knob(h.x,h.y); }
      plane([[418,10,143],[593,10,143],[568,10,181],[444,10,181]],'#efeee4','#8d8a78',.8);
      plane([[444,10,181],[568,10,181],[568,10,241],[444,10,241]],'#f6f3e9','#8d8a78',.8);
      plane([[418,10,143],[593,10,143],[604,58,138],[408,58,138]],'#c7b395','#8d7a5c',.9);
      roomLine([[414,58,137],[600,58,137]],'#9c8560',4,.8);
      // Tall refrigerator on the back right, with brushed-metal double doors.
      const f=ROOM_LAYOUT.fridge, front=f.y+f.h, rear=f.y;
      plane([[f.x,rear,0],[f.x,rear,240],[f.x,front,240],[f.x,front,0]],'#b9bbae','#767b6d',.9);
      plane([[f.x,rear,240],[f.x+f.w,rear,240],[f.x+f.w,front,240],[f.x,front,240]],'#c7cabb','#858b79',.7);
      plane([[f.x,front,0],[f.x+f.w,front,0],[f.x+f.w,front,240],[f.x,front,240]],'#c6c9bd','#6d7466',1);
      for(const [z,h] of [[8,70],[83,150]]) {
        plane([[f.x+5,front+1,z],[f.x+f.w-5,front+1,z],[f.x+f.w-5,front+1,z+h],[f.x+5,front+1,z+h]],'#d6d7cd','#919686',.65);
        roomLine([[f.x+f.w/2,front+2,z+3],[f.x+f.w/2,front+2,z+h-3]],'#8c9282',.8,.8);
        for(const x of [f.x+f.w/2-10,f.x+f.w/2+10]) roomLine([[x,front+3,z+h*.3],[x,front+3,z+h*.75]],'#727b6d',2.2,.9);
      }
      // Sink shifted to the right-hand rear counter, beside the wall-aligned fridge.
      for(const x of [639,696]) {
        plane([[x,53,71],[x+50,53,71],[x+50,119,71],[x,119,71]],'#c4c7bc','#757d6e',.8);
        plane([[x+5,60,70],[x+45,60,70],[x+45,112,70],[x+5,112,70]],'#9fa99f','#6e7c70',.6);
        const drain=project(x+25,89,71);oval(ctx,drain.x,drain.y,3,2,{color:'#778177',weight:.5});
      }
      const tap=project(693,56,72);
      ctx.save();ctx.strokeStyle='#9e895d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(tap.x,tap.y);ctx.bezierCurveTo(tap.x-14,tap.y-42,tap.x+15,tap.y-44,tap.x+13,tap.y-16);ctx.stroke();ctx.restore();
      const olive=project(956,574); plant(olive.x-3,olive.y-4,1.8);
      plane([[0,600,0],[960,600,0],[960,600,-9],[0,600,-9]],'#cabca3','#8e826c',.8);
      roomLine([[0,600,165],[0,0,165],[960,0,165],[960,600,165]],'#5e5c50',1,.8);
      ctx.save();
      for(let i=0;i<11000;i++) {ctx.globalAlpha=.025+rnd(i+43)*.025;ctx.fillStyle=i%3?'#7e735e':'#fffdf1';ctx.fillRect(rnd(i*1.7)*WIDTH,rnd(i*2.3+5)*HEIGHT,.5+rnd(i)*1.2,.5+rnd(i+3));}
      ctx.restore();
      label(ctx,'手 作 料 理  ·  慢 慢 練 成 好 手 藝',580,875,11,'#938a76','center',400);
    }
    // Static layers (the room, the paper grain) are painted once to an offscreen canvas and
    // stamped each frame; without a document they repaint directly.
    const layers = {};
    function layer(name, paint) {
      const doc = ctx.canvas?.ownerDocument;
      if (!layers[name] && doc?.createElement) {
        const canvas = doc.createElement('canvas'); canvas.width=WIDTH; canvas.height=HEIGHT;
        const cached = canvas.getContext('2d');
        if (cached) { const original=ctx; ctx=cached; try { paint(cached); layers[name]=canvas; } finally { ctx=original; } }
      }
      if (layers[name]) ctx.drawImage(layers[name],0,0); else paint(ctx);
    }
    function scene(game) {
      layer('room', room);

    }

    function drawChef(player, game, chopping, active) {
      const moving = active && state.walking;
      const bob = moving ? Math.sin(player.walk) * 1.5 : Math.sin(state.clock * 2) * 0.5;
      const back = player.dy < -0.45, side = Math.abs(player.dx) > 0.55;
      const gesture = state.gesture;
      const reach = chopping ? 4 + Math.sin(state.clock * 18) * 4 : gesture ? Math.sin((1 - gesture.remaining / gesture.duration) * Math.PI) * 9 : 0;
      const stride = moving ? Math.sin(player.walk) * 3.5 : 0;
      ctx.save(); ctx.translate(player.x, player.y + bob);
      shadow(ctx, 1, 22, 18, 6, 0.18);
      blob(ctx, -12, 12 + stride, 10, 10, { color: '#3a4038', rad: 2, amp: 0.25, weight: 0.6 });
      blob(ctx, 2, 12 - stride, 10, 10, { color: '#3a4038', rad: 2, amp: 0.25, weight: 0.6 });
      blob(ctx, -11, 4, 22, 14, { color: '#4e5a4c', rad: 3, amp: 0.3, weight: 0.7, pools: [[2, 10, 6, 3, '#2e382c']] });
      hair(ctx, [[0, 6], [0, 16]], '#c5d0c0', 0.6, 0.4);
      blob(ctx, -15, -12, 30, 22, {
        color: '#f7f3ea', rad: 4, amp: 0.4, weight: 1.2,
        grad: [[0, '#fffaf4'], [1, '#e4ddd0']], x0: -14, y0: -12, x1: 10, y1: 10,
        pools: [[6, 2, 8, 6, '#d2cbb8']]
      });
      hair(ctx, [[0, -8], [0, 8]], '#cfc6b6', 0.7, 0.7);
      if (!back) {
        blob(ctx, -11, -8, 22, 18, { color: P.terra, rad: 3, amp: 0.35, weight: 0.8, grad: [[0, '#d48978'], [1, '#8d4638']], x0: -10, y0: -8, x1: 8, y1: 10, pools: [[4, 4, 6, 5, '#6d3428']] });
        hair(ctx, [[-8, -2], [-2, 4], [6, 0]], '#f0c2b4', 0.6, 0.35);
        label(ctx, '炒', 0, 0, 10, '#f6f1e4');
      } else {
        hair(ctx, [[-10, -2], [10, -2]], P.terra, 1.4, 0.9);
        blob(ctx, -3, -4, 6, 6, { color: '#8d4638', rad: 1, amp: 0.2, weight: 0.4 });
      }
      const hx = player.dx * reach, hy = player.dy * reach;
      oval(ctx, -16 + hx, 2 + hy, 5, 6, { color: '#f0c8a8', weight: 0.55, amp: 0.25 });
      oval(ctx, 16 + hx, 2 + hy, 5, 6, { color: '#f0c8a8', weight: 0.55, amp: 0.25 });
      if (game.held && back) item(game.held.id, player.dx * 18, -18 - reach * 0.2, 0.72);
      oval(ctx, 0, -24, 13, 14, {
        color: '#f3d2b6', weight: 0.95, amp: 0.35,
        grad: [[0, '#fbe4d2'], [1, '#e2b898']], x0: -10, y0: -34, x1: 8, y1: -10,
        pools: [[0, -18, 7, 5, '#d2a888']]
      });
      oval(ctx, -12, -24, 3.5, 5, { color: '#e8c0a4', weight: 0.4, amp: 0.15 });
      oval(ctx, 12, -24, 3.5, 5, { color: '#e8c0a4', weight: 0.4, amp: 0.15 });
      if (!back) {
        const shift = side ? player.dx * 4 : 0;
        hair(ctx, [[-7 + shift, -28], [-3 + shift, -29]], '#5c4638', 0.8, 0.9);
        hair(ctx, [[3 + shift, -29], [7 + shift, -28]], '#5c4638', 0.8, 0.9);
        oval(ctx, -4 + shift, -24, 1.5, 1.8, { color: '#2f382e', weight: 0, amp: 0.1, bleed: false });
        oval(ctx, 4 + shift, -24, 1.5, 1.8, { color: '#2f382e', weight: 0, amp: 0.1, bleed: false });
        ctx.fillStyle = '#fff'; ctx.fillRect(-4.6 + shift, -24.6, 0.7, 0.7); ctx.fillRect(3.5 + shift, -24.6, 0.7, 0.7);
        hair(ctx, [[-2 + shift, -16], [2 + shift, -15]], '#a86858', 0.7, 0.75);
        ctx.save(); ctx.globalAlpha = 0.35; ell(ctx, -7 + shift, -20, 3, 1.6); ell(ctx, 7 + shift, -20, 3, 1.6); ctx.fillStyle = '#e09080'; ctx.fill(); ctx.restore();
      }
      blob(ctx, -16, -40, 32, 8, { color: '#f7f3ea', rad: 2, amp: 0.3, weight: 0.7, inkColor: '#8a9484' });
      oval(ctx, -10, -44, 8, 7, { color: '#fbf7f0', weight: 0.65, amp: 0.3, inkColor: '#8a9484' });
      oval(ctx, 0, -48, 9, 8, { color: '#fffaf4', weight: 0.7, amp: 0.3, inkColor: '#8a9484', pools: [[2, -46, 4, 3, '#e6e0d2']] });
      oval(ctx, 10, -44, 8, 7, { color: '#fbf7f0', weight: 0.65, amp: 0.3, inkColor: '#8a9484' });
      hair(ctx, [[-8, -42], [-2, -52]], '#e7e0d4', 0.5, 0.5);
      hair(ctx, [[2, -50], [8, -42]], '#e7e0d4', 0.5, 0.5);
      if (game.held && !back) {
        shadow(ctx, player.dx * 8, 14, 16, 5, 0.1);
        item(game.held.id, player.dx * 8, 10 - reach * 0.25, 0.82);
      }
      ctx.restore();
    }
    function bubble(text, x, y, urgent) {
      const width = Math.min(148, text.length * 13 + 18);
      blob(ctx, x - width / 2, y - 14, width, 26, {
        color: urgent ? '#f6d8c8' : '#fffaf2', rad: 6, amp: 0.3, weight: 0.9,
        inkColor: urgent ? '#a85c48' : '#5e6758'
      });
      paint(ctx, [[x - 5, y + 11], [x + 5, y + 11], [x, y + 18]].map(p => wob(p[0], p[1], 0.2)), { color: urgent ? '#f6d8c8' : '#fffaf2', weight: 0.6, bleed: false, inkColor: urgent ? '#a85c48' : '#5e6758' });
      label(ctx, text, x, y - 1, 12, urgent ? '#8d3c28' : '#3e4c42');
    }
    function drawEffects() {
      for (const fx of state.effects) {
        const p = 1 - fx.remaining / fx.duration;
        const anchor = project(fx.x || 0, fx.y || 0, fx.height ?? 70);
        if (fx.kind === 'bubble') continue;
        ctx.save(); ctx.globalAlpha = Math.min(1, (1 - p) * 2);
        if (fx.kind === 'flame') {
          for (let i = 0; i < 8; i++) {
            const angle = -Math.PI / 2 + (i - 3.5) * 0.3, reach = p * (32 + (i % 3) * 8);
            const x = anchor.x + Math.cos(angle) * reach, y = anchor.y - 12 - 8 + Math.sin(angle) * reach;
            oval(ctx, x, y, 4 * (1 - p) + 1.5, 7 * (1 - p) + 1.5, { color: i % 2 ? '#f0a04a' : '#f8e2a8', weight: 0.4, amp: 0.2, bleedAlpha: 0.15 });
          }
        } else if (fx.kind === 'smoke') {
          for (let i = 0; i < 4; i++) oval(ctx, anchor.x + (i - 1.5) * 10 + Math.sin(p * 5 + i) * 4, anchor.y - 12 - 18 - p * (36 + i * 6), 8 + p * 10, 6 + p * 7, { color: 'rgba(70,74,66,0.35)', weight: 0.4, amp: 0.4, inkColor: '#5c6058' });
        } else if (fx.kind === 'float') {
          ctx.font = `700 18px ${FONT}`; ctx.lineWidth = 3; ctx.strokeStyle = '#f6f1e6';
          ctx.lineJoin = 'round'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const x = anchor.x, y = anchor.y - 12 - 28 - p * 34;
          ctx.strokeText(fx.text, x, y); ctx.fillStyle = fx.color; ctx.fillText(fx.text, x, y);
        } else if (fx.kind === 'delivery') {
          const start = project(fx.x, fx.y, fx.height ?? 70);
          ctx.globalAlpha *= 1-p;
          const dx=start.x, dy=start.y-p*30;
          if (ITEMS[fx.recipe]?.kind === 'juice') item(fx.recipe,dx,dy,.8);
          else dish(fx.recipe,dx,dy,.8);
        } else {
          for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI * 2 / 6;
            oval(ctx, anchor.x + Math.cos(angle) * p * 34, anchor.y - 12 + Math.sin(angle) * p * 18 - p * 12, 1.6, 1.6, { color: fx.color, weight: 0, amp: 0.1, bleed: false });
          }
        }
        ctx.restore();
      }
    }
    function reset() { state.clock = 0; state.effects = []; state.tosses = {}; state.gesture = null; state.tables = {}; state.walking = false; state.shake = null; state.seen = null; }
    function shake(strength, duration) { if (!state.shake || state.shake.strength * state.shake.remaining / state.shake.duration < strength) state.shake = { strength, duration, remaining: duration }; }
    function say(table, text, duration, delay, urgent) {
      state.effects = state.effects.filter(fx => !(fx.kind === 'bubble' && fx.table === table));
      state.effects.push({ kind: 'bubble', table, text, urgent: !!urgent, delay: delay || 0, remaining: duration + (delay || 0), duration: duration + (delay || 0) });
    }
    function observe(game) {
      const woks = Object.fromEntries(Object.entries(game.woks).map(([id, w]) => [id, w.state]));
      const orders = game.orders.map(o => o.id), urgent = game.orders.filter(o => o.remaining < 20).map(o => o.id);
      const seen = state.seen || { woks: {}, orders: [], urgent: [] };
      for (const [id, now] of Object.entries(woks)) {
        if (seen.woks[id] === now) continue;
        const station = game.stations.find(st => st.id === id); if (!station) continue;
        const { x, y } = at(station);
        if (now === 'cooking') { state.effects.push({ kind: 'flame', x, y, remaining: .5, duration: .5 }); shake(2, .18); }
        if (now === 'burned') { state.effects.push({ kind: 'smoke', x, y, remaining: 1.2, duration: 1.2 }, { kind: 'float', text: '燒焦了！', color: '#c46848', x, y, remaining: 1.1, duration: 1.1 }); shake(5, .35); }
      }
      for (const o of game.orders) {
        if (!seen.orders.includes(o.id)) { const offer = menuOffer(o.recipe); say(o.table, `老闆！${offer.name}${offer.kind === 'drink' ? '一杯' : '一份'}！`, 2.6); }
        else if (urgent.includes(o.id) && !seen.urgent.includes(o.id)) say(o.table, HURRY[o.id % HURRY.length], 2.4, 0, true);
      }
      state.seen = { woks, orders, urgent };
      state.effects = state.effects.slice(-32);
    }
    function update(dt, animate) {
      if (!animate) return;
      state.clock += dt;
      for (const fx of state.effects) fx.remaining -= dt;
      state.effects = state.effects.filter(fx => fx.remaining > 0);
      for (const id of Object.keys(state.tosses)) { state.tosses[id] -= dt; if (state.tosses[id] <= 0) delete state.tosses[id]; }
      if (state.gesture) { state.gesture.remaining -= dt; if (state.gesture.remaining <= 0) state.gesture = null; }
      for (const id of Object.keys(state.tables)) { state.tables[id].remaining -= dt; if (state.tables[id].remaining <= 0) delete state.tables[id]; }
      if (state.shake) { state.shake.remaining -= dt; if (state.shake.remaining <= 0) state.shake = null; }
    }
    function snapshot(game) {
      const held = game.held && ITEMS[game.held.id];
      const recipe = held && (held.recipe || (held.kind === 'juice' ? game.held.id : undefined));
      const order = recipe && game.orders.filter(o => o.recipe === recipe).sort((a, b) => a.remaining - b.remaining)[0];
      return { held: game.held?.id, served: game.served, recipe, table: order?.table, flips: game.flips, revenue: game.revenue };
    }
    function action(station, game, before) {
      if (!station) return;
      const x = station.x * 60 + 30, y = station.y * 60 + 30, height = stationElevation(station);
      if (game.flips > before.flips) {
        state.tosses[station.id] = .65; state.gesture = { remaining: .65, duration: .65 };
        state.effects.push({ kind: 'flame', height, x, y, remaining: .55, duration: .55 }, { kind: 'float', height, text: '翻炒漂亮！', color: '#c4a15a', x, y: y - 20, remaining: .9, duration: .9 });
        shake(3, .2);
      }
      if (game.held?.id !== before.held) { state.gesture = { remaining: .35, duration: .35 }; state.effects.push({ kind: 'spark', height, x, y: y - 12, color: '#e2c27a', remaining: .4, duration: .4 }); }
      if (game.served > before.served && before.table) {
        state.effects.push({ kind: 'delivery', height, x, y, table: before.table, recipe: before.recipe, remaining: .8, duration: .8 });
        state.tables[before.table] = { recipe: before.recipe, remaining: 9, arrivesAt: state.clock + .8 };
        if (game.revenue > before.revenue) state.effects.push({ kind: 'float', height, text: `+$${game.revenue - before.revenue}`, color: '#a85c48', x, y, remaining: 1.1, duration: 1.1 });
        say(before.table, REACTIONS[game.served % REACTIONS.length], 2.2, .8);
      }
      state.effects = state.effects.slice(-24);
    }
    function draw(game, player, target, keys, running, ended) {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      const sh = state.shake, amount = sh ? sh.strength * sh.remaining / sh.duration : 0;
      ctx.save(); ctx.translate(Math.sin(state.clock * 97) * amount, Math.cos(state.clock * 83) * amount);
      scene(game);
      const active = running && !ended && !game.paused;
      const chopping = active && keys.has('f') && target?.type === 'board' && !game.held && target.item && ITEMS[target.item.id].processed ? target.id : null;
      state.walking = active && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some(k => keys.has(k));
      const sorted = [...getInteractiveStations(game.stations).map(s=>({y:s.y*60+30,s})),{y:player.y,chef:true},
        {y:ROOM_LAYOUT.island.y+5,island:true},...ROOM_LAYOUT.stools.map(r=>({y:r.y+18,stool:r}))].sort((a,b)=>a.y-b.y);
      for(const obj of sorted) {
        if(obj.island) { island(); continue; }
        if(obj.stool) {const r=obj.stool,p=project(r.x+r.w/2,r.y+18);ctx.save();ctx.translate(p.x,p.y-53*p.scale);ctx.scale(p.scale,p.scale);stool(0,0);ctx.restore();continue;}
        const pos=obj.chef?player:at(obj.s);
        const builtIn=!obj.chef&&!['trash','serve'].includes(obj.s.type);
        const height=obj.chef?0:stationElevation(obj.s);
        const p=project(pos.x,pos.y,height), scale=p.scale*(obj.chef?2:1.2);
        ctx.save();ctx.translate(p.x,p.y-(obj.chef?22*scale:0));ctx.scale(scale,scale);ctx.translate(-pos.x,-pos.y);
        if(obj.chef) drawChef(player,game,chopping,active);
        else drawStation({...obj.s,builtIn},game,target,chopping,active);
        ctx.restore();
      }
      drawEffects(); layer('grain', paperGrain); ctx.restore();
    }
    return { draw, update, reset, snapshot, action, observe, state, layers };
  }
  const api = { createRenderer, WIDTH, HEIGHT, OFFSET, project };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HotStirFryArt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
