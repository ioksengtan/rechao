/* Original vector artwork: the renderer never changes simulation state. */
(function (root) {
  'use strict';
  const WIDTH = 1160, HEIGHT = 720, OFFSET = { x: 24, y: 78 };
  const P = {
    ink: '#34443e', night: '#233c40', wall: '#e2ddc5', grout: '#c5c5aa',
    steel: '#c8d8d0', steelDark: '#7f9e95', steelLight: '#edf2df',
    red: '#bc5140', redLight: '#df7150', gold: '#eac77c', cream: '#fff0cb',
    floor: '#c9c6a5', floorAlt: '#d1cdb1', wood: '#c18e55'
  };
  function createRenderer(ctx, data) {
    const { ITEMS, RECIPES, cookDuration, chopDuration } = data;
    const state = { clock: 0, effects: [], tosses: {}, gesture: null, tables: {} };
    function box(x, y, w, h, fill, radius = 0, stroke, lineWidth = 2) {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
    }
    function oval(x, y, rx, ry, fill, stroke, lineWidth = 2) {
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
    }
    function polygon(points, fill, stroke, width = 2) {
      ctx.beginPath(); ctx.moveTo(...points[0]); points.slice(1).forEach(p => ctx.lineTo(...p)); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
    }
    function line(points, color, width = 2) {
      ctx.beginPath(); ctx.moveTo(...points[0]); points.slice(1).forEach(p => ctx.lineTo(...p));
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    }
    function label(str, x, y, size = 14, color = P.ink, align = 'center', weight = 600) {
      ctx.font = `${weight} ${size}px "Microsoft JhengHei", "PingFang TC", sans-serif`;
      ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(str, x, y);
    }
    function leaf(x, y, angle, size, fill) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.beginPath(); ctx.moveTo(0, size); ctx.bezierCurveTo(-size, 2, -size * .7, -size, 0, -size);
      ctx.bezierCurveTo(size * .9, -size, size, 2, 0, size); ctx.fillStyle = fill; ctx.fill();
      line([[0, size], [0, -size * .65]], '#d3d990', 1.2);
      ctx.restore();
    }
    function plate(x, y, scale = 1) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      oval(0, 4, 27, 18, '#c6c6ac', P.ink, 1.7); oval(0, 0, 27, 18, '#fff9e4', P.ink, 1.7);
      oval(0, 0, 22, 13, null, '#729894', 1.5); oval(0, 0, 18, 10, '#eee4c7'); ctx.restore();
    }
    function dish(recipe, x, y, scale = 1, withPlate = true) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      if (withPlate) plate(0, 0);
      if (recipe === 'greens') {
        for (let i = 0; i < 8; i++) leaf(Math.sin(i * 2.1) * 13, Math.cos(i * 2.4) * 6 - 2, i * .9, 9, i % 2 ? '#60934b' : '#86b056');
        for (let i = 0; i < 3; i++) oval(i * 10 - 10, i % 2 * 4, 2.5, 1.6, '#f1dca2');
      } else if (recipe === 'rice') {
        oval(0, -1, 19, 11, '#b69042'); oval(0, -4, 18, 12, '#e9bc58', '#ad8039', 1);
        for (let i = 0; i < 24; i++) {
          const px = Math.sin(i * 12.3) * 14, py = Math.cos(i * 3.9) * 8 - 4;
          box(px, py, 3.5, 2, i % 6 === 0 ? '#739549' : i % 7 === 0 ? '#cc7550' : '#ffe4a1', 1);
        }
        box(-7, -12, 7, 4, '#fff0b8', 1); box(6, 0, 6, 4, '#ffe6a0', 1);
      } else if (recipe === 'beef') {
        for (let i = 0; i < 7; i++) { ctx.save(); ctx.translate(Math.sin(i * 2.8) * 12, Math.cos(i * 2.1) * 7 - 2); ctx.rotate(i * .6); oval(0, 0, 10, 4, '#89543f', '#624638', 1); line([[-6, -1], [4, -2]], '#bd8960', 1.5); ctx.restore(); }
        for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(-15 + i * 6, Math.sin(i * 3) * 7 - 2); ctx.rotate(i); box(-1, -5, 3, 12, i % 2 ? '#bfc681' : '#749549', 1); ctx.restore(); }
      } else if (recipe === 'chicken') {
        oval(0, 1, 20, 10, '#a36335');
        for (let i = 0; i < 6; i++) { const px = Math.sin(i * 2) * 13, py = Math.cos(i * 2) * 6 - 3; box(px - 5, py - 4, 11, 9, '#ba8045', 3, '#855435', 1); line([[px - 2, py - 2], [px + 3, py - 3]], '#e5b16a', 1.5); }
        for (let i = 0; i < 4; i++) leaf(Math.sin(i * 3) * 14, Math.cos(i * 3) * 7 - 3, i * 1.4, 6, '#4c7d4e');
      }
      ctx.restore();
    }
    function item(id, x, y, scale = 1) {
      const info = ITEMS[id]; if (!info) return;
      if (info.kind === 'dish') return dish(info.recipe, x, y, scale);
      if (info.kind === 'plate') return plate(x, y, scale);
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      if (info.kind === 'greens' || info.kind === 'scallion') {
        if (info.chopped) {
          for (let i = 0; i < 8; i++) { const px = Math.sin(i * 3.2) * 15, py = Math.cos(i * 2.1) * 8; box(px - 3, py - 3, 7, 5, i % 2 ? '#72a44e' : '#b6c678', 1, '#5d8845', .8); }
        } else {
          for (let i = -1; i <= 1; i++) { ctx.save(); ctx.rotate(i * .3); box(-2, -12, 4, 29, '#e6e3a7', 2, '#a5b777', 1); if (info.kind === 'greens') leaf(0, -12, 0, 13, i % 2 ? '#709a4f' : '#8bb261'); else { line([[0, 1], [-3, -27]], '#76a556', 4); line([[1, 0], [5, -26]], '#8db963', 3); } ctx.restore(); }
          if (info.kind === 'scallion') box(-7, 8, 14, 4, '#c78967', 1);
        }
      } else if (info.kind === 'beef' || info.kind === 'chicken') {
        const meat = info.kind === 'beef' ? '#b96e61' : '#e3b794';
        if (info.chopped) {
          for (let i = 0; i < 4; i++) { const px = i * 8 - 15, py = Math.sin(i * 3) * 4; box(px - 3, py - 5, 9, 11, meat, 3, '#996b53', 1); line([[px - 1, py - 2], [px + 3, py + 3]], '#f5d3b5', 1.4); }
        } else {
          oval(0, 1, 21, 14, '#9b6852', P.ink, 1.5); oval(0, -2, 20, 13, meat, '#f1d9b6', 2.5);
          line([[-14, -3], [-8, 2], [-2, -7], [4, -2], [12, -4]], '#f4c8ad', 2);
        }
      } else if (info.kind === 'basil') {
        for (let i = 0; i < 6; i++) leaf(Math.sin(i * 2) * 12, Math.cos(i * 2) * 8, i * 1.3, 8, i % 2 ? '#4f8655' : '#78a064');
      } else if (info.kind === 'sauce') {
        box(-11, -14, 22, 33, '#80503a', 5, P.ink, 1.5); box(-7, -21, 14, 9, '#b94535', 2, P.ink, 1.5);
        box(-10, -3, 20, 16, '#edcd8f', 1); label('醬', 0, 5, 12, '#8d4c32'); line([[-7, -9], [-7, -5]], '#dba77c', 2);
      } else if (info.kind === 'egg') {
        oval(1, 2, 13, 17, '#d4ab70', P.ink, 1.5); oval(-1, -1, 12, 16, '#f5dab0'); oval(-4, -7, 4, 6, '#fff0ce');
      } else if (info.kind === 'rice') {
        ctx.beginPath(); ctx.moveTo(-20, 0); ctx.quadraticCurveTo(-17, 21, 0, 20); ctx.quadraticCurveTo(17, 21, 20, 0); ctx.fillStyle = '#e5e9d5'; ctx.fill(); ctx.strokeStyle = '#72938b'; ctx.lineWidth = 2; ctx.stroke();
        oval(0, 0, 20, 10, '#fff5dc', '#72938b', 1.5); oval(0, -2, 17, 10, '#fff4d5');
        for (let i = 0; i < 10; i++) line([[Math.sin(i * 2) * 13, Math.cos(i * 3) * 6 - 3], [Math.sin(i * 2) * 13 + 3, Math.cos(i * 3) * 6 - 2]], '#e2d9b6', 1.5);
      }
      ctx.restore();
    }
    function badge(str, x, y, width = 90, fill = '#faf1d8', color = P.ink) {
      box(x - width / 2, y - 11, width, 22, '#3b49352b', 5);
      box(x - width / 2, y - 13, width, 22, fill, 5, '#6b785b66', 1);
      label(str, x, y - 2, 14, color);
    }
    function bar(x, y, p, color = '#90b276') {
      box(x - 34, y, 68, 8, '#354b41', 4); box(x - 32, y + 2, 64 * Math.max(0, Math.min(1, p)), 4, color, 2);
    }
    function steel(x, y) {
      oval(x + 3, y + 36, 40, 13, '#31433122');
      box(x - 29, y + 21, 7, 19, '#657d72', 2, P.ink, 1.5); box(x + 22, y + 21, 7, 19, '#657d72', 2, P.ink, 1.5);
      box(x - 33, y - 24, 66, 55, '#98aea1', 5, P.ink, 2);
      box(x - 34, y - 31, 68, 51, P.steel, 5, P.ink, 2);
      box(x - 29, y - 27, 58, 41, P.steelLight, 3);
      polygon([[x - 27, y - 25], [x + 14, y - 25], [x - 9, y + 12], [x - 27, y + 12]], '#f9f9e644');
      line([[x - 30, y + 23], [x + 29, y + 23]], '#718c7c', 2); box(x - 10, y + 25, 20, 3, '#526e61', 1);
    }
    function crate(s, x, y) {
      const cold = ['beef', 'chicken'].includes(s.supply), basket = ['greens', 'scallion', 'basil'].includes(s.supply);
      oval(x + 3, y + 31, 37, 11, '#2b40302b');
      const c = cold ? '#91b4b1' : basket ? '#6f9479' : '#c39360';
      box(x - 32, y - 22, 64, 53, c, 5, P.ink, 2); box(x - 34, y - 30, 68, 50, cold ? '#d5e3d5' : basket ? '#a3ba8e' : '#d6b180', 5, P.ink, 2);
      box(x - 27, y - 24, 54, 36, cold ? '#b7cfc8' : basket ? '#486b52' : '#a47b50', 4, '#47634f', 1);
      for (let i = 0; i < 5; i++) box(x - 25 + i * 11, y + 24, 7, 3, '#384c3c66', 1);
      if (s.supply === 'egg') { for (let i = 0; i < 4; i++) item('egg', x - 16 + i * 11, y - 7 + i % 2 * 3, .6); }
      else if (s.supply === 'rice') {
        box(x - 24, y - 18, 48, 31, '#e1e7d5', 7, P.ink, 2); oval(x, y - 15, 25, 10, '#cad9ce', P.ink, 2); oval(x, y - 16, 20, 6, '#f6edd6'); box(x - 7, y - 25, 14, 6, '#526c62', 2); box(x - 8, y + 2, 16, 7, '#7d9990', 2); oval(x + 4, y + 5, 2, 2, '#db8260');
      } else if (basket) { item(s.supply, x - 13, y - 3, .7); item(s.supply, x + 13, y - 6, .75); }
      else item(s.supply, x, y - 4, .85);
      if (cold) { box(x - 11, y + 22, 22, 6, '#e8ede0', 2); label('鮮', x, y + 25, 9, '#4d7a76'); }
    }
    function knife(x, y, rotation) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
      box(-13, -7, 26, 15, '#d5dfd6', 2, P.ink, 1.5); line([[-11, 5], [11, 5]], '#fff9dc', 2);
      box(13, -4, 14, 7, '#785941', 2, P.ink, 1.5); oval(18, -.5, 1, 1, '#d9c599'); ctx.restore();
    }
    function steam(x, y, amount = 1, gray = false) {
      for (let i = 0; i < 3; i++) {
        const t = (state.clock * .75 + i * .31) % 1;
        ctx.save(); ctx.globalAlpha = (1 - t) * .5 * amount;
        const sx = x - 16 + i * 16, sy = y - t * 35;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx - 9, sy - 9, sx + 9, sy - 17, sx + 2, sy - 25);
        ctx.lineWidth = 3 + t * 3; ctx.lineCap = 'round'; ctx.strokeStyle = gray ? '#55594e' : '#fff6d9'; ctx.stroke(); ctx.restore();
      }
    }
    function fire(x, y) {
      for (let i = 0; i < 7; i++) {
        const fx = x - 25 + i * 8, height = 12 + Math.sin(state.clock * 11 + i * 2) * 4;
        polygon([[fx - 5, y + 4], [fx, y - height], [fx + 6, y + 4]], '#e89443');
        polygon([[fx - 2, y + 4], [fx, y - height * .55], [fx + 3, y + 4]], '#ffe0a1');
        oval(fx, y + 3, 4, 2, '#85b9b9');
      }
    }
    function drawWok(s, x, y, w) {
      const hot = w.state === 'cooking' || w.state === 'ready';
      steel(x, y); box(x - 28, y - 25, 56, 42, '#748e81', 3, P.ink, 1);
      oval(x, y - 2, 25, 16, '#374d40');
      if (hot) { oval(x, y + 17, 30, 13, '#e4ac5444'); fire(x, y + 22); }
      const toss = state.tosses[s.id] || 0, arc = toss > 0 ? Math.sin((1 - toss / .65) * Math.PI) : 0;
      ctx.save(); ctx.translate(x, y - 6 - arc * 5); ctx.rotate(-arc * .14);
      box(20, -3, 22, 8, '#6b5541', 3, P.ink, 1.5); line([[26, 0], [37, 0]], '#9a7d55', 1.4);
      oval(0, 3, 29, 21, '#364a40', P.ink, 2); oval(0, -1, 29, 19, '#6a8271', P.ink, 2); oval(0, -2, 25, 15, '#283e33');
      ctx.save(); ctx.translate(arc * 6, -arc * 27);
      if (w.state === 'burned') { oval(0, -2, 21, 12, '#242d28'); for (let i = 0; i < 6; i++) oval(Math.sin(i) * 14, Math.cos(i * 3) * 8, 5, 3, '#474237'); }
      else if (w.recipe) dish(w.recipe, 0, -2, .95, false);
      else w.ingredients.forEach((id, i) => item(id, (i - (w.ingredients.length - 1) / 2) * 14, -2, .6));
      ctx.restore(); ctx.restore();
      oval(x - 19, y + 27, 4, 4, '#4e6658', P.ink, 1); line([[x - 19, y + 27], [x - 17, y + 24]], '#d9dec6', 1);
      if (w.state === 'cooking') badge(`×${w.portions || 1}`, x + 30, y + 4, 34, '#f1e2a6', '#795332');
      label(s.id === 'wok' ? '01' : '02', x + 19, y + 27, 10, '#3d5546');
      if (hot) steam(x, y - 26);
      if (w.state === 'burned') { steam(x, y - 25, .75, true); badge('焦鍋 · 清理', x, y - 56, 98, '#c3b3a0', '#654e3e'); }
      if (w.state === 'cooking') {
        const p = w.elapsed / cookDuration(w);
        bar(x, y - 47, p, '#e8bc63');
        if (p >= .4 && p <= .85 && !w.flipped) badge('F 翻炒', x, y - 65, 82, '#f5da8f', '#755735');
      }
      if (w.state === 'ready') { bar(x, y - 47, 1 - w.readyTime / 8, w.readyTime > 4 ? '#d78758' : '#c3c982'); badge(`剩 ${w.remaining || 1} 份`, x, y - 65, 90, w.readyTime > 4 ? '#f0bf91' : '#f1e2a6', '#795332'); }
      if (w.clearProgress > 0) bar(x, y - 47, w.clearProgress / 2, '#9ebcad');
    }
    function drawStation(s, game, target, chopping, active) {
      const x = s.x * 60 + 30, y = s.y * 60 + 30;
      const focused = active && target?.id === s.id;
      if (focused) { box(x - 41, y - 38, 82, 83, '#fbe3a141', 9, '#f7d985', 3); }
      if (s.type === 'supply') crate(s, x, y);
      else if (s.type === 'wok') drawWok(s, x, y, game.woks[s.id]);
      else if (s.type === 'trash') {
        oval(x + 2, y + 31, 32, 10, '#3143312b'); box(x - 23, y - 19, 46, 48, '#819a80', 7, P.ink, 2);
        for (let i = 0; i < 4; i++) line([[x - 15 + i * 10, y - 10], [x - 13 + i * 9, y + 21]], '#abc0a1', 3);
        box(x - 27, y - 26, 54, 10, '#a5b99a', 4, P.ink, 2); box(x - 8, y - 31, 16, 5, '#70846c', 2, P.ink, 1);
      } else {
        steel(x, y);
        if (s.type === 'board') {
          box(x - 28, y - 23, 56, 37, '#a97745', 4, '#785534', 1.5); box(x - 28, y - 26, 56, 35, '#d0a367', 4, '#785534', 1.5);
          for (let i = 0; i < 4; i++) line([[x - 22, y - 20 + i * 7], [x + 21, y - 22 + i * 7]], '#bd8f5722', 1.2);
          if (s.item) item(s.item.id, x - 3, y - 7, .82);
          const isCutting = chopping === s.id, phase = state.clock * 18;
          if (isCutting) { knife(x + 1, y - 10 - Math.abs(Math.sin(phase)) * 13, -.12); for (let i = 0; i < 3; i++) { const t = (state.clock * 2 + i * .33) % 1; box(x - 15 + t * 26, y - 12 - Math.sin(t * Math.PI) * 12, 3, 3, '#a5b774', 1); } }
          else knife(x + 6, y - 8, -1.2);
          if (s.progress > 0 && s.item && !ITEMS[s.item.id].chopped) bar(x, y - 45, s.progress / chopDuration(s.item));
        }
        if (s.item && (s.item.count || 1) > 1) badge(`×${s.item.count}`, x + 22, y - 23, 32, '#f1e2a6', '#795332');
        if (s.type === 'counter') { if (s.item) item(s.item.id, x, y - 6, .95); else { box(x - 19, y - 18, 37, 24, null, '#b9cabb', 1); line([[x - 12, y - 10], [x + 5, y - 10]], '#d7dfca', 1); } }
        if (s.type === 'plates') {
          if (game.plates) for (let i = Math.min(4, game.plates) - 1; i >= 0; i--) plate(x, y - 7 + i * 4, .88);
          else oval(x, y - 2, 23, 14, null, '#a8bbab', 1);
          box(x + 15, y - 32, 22, 21, '#f5dfa5', 5, '#938058', 1); label(String(game.plates), x + 26, y - 21, 13, '#68563d');
        }
        if (s.type === 'serve') {
          box(x - 29, y - 27, 58, 39, '#ae8050', 4, P.ink, 1.5); box(x - 24, y - 22, 48, 29, '#d0a36b', 3); label('上 菜', x, y - 9, 16, '#fff0ce');
          oval(x + 18, y + 12, 9, 5, '#697c68', P.ink, 1); oval(x + 18, y + 9, 7, 6, '#d8be77', '#8d794c', 1); oval(x + 18, y + 3, 2, 2, '#a4864e');
        }
      }
      const width = Math.max(72, s.name.length * 15 + 14);
      badge(s.name, x, y + 53, width, focused ? '#f3dba2' : '#e9e5cc', focused ? '#68482e' : '#4d6453');
    }
    function lantern(x, y, word) {
      line([[x, y - 27], [x, y - 17]], '#b89860', 2);
      oval(x + 2, y + 4, 18, 23, '#16323466'); oval(x, y, 18, 23, '#bf5140', '#763e34', 2);
      oval(x, y, 10, 23, null, '#dc7955', 1); line([[x - 16, y - 8], [x + 16, y - 8]], '#d98759', 1); line([[x - 16, y + 8], [x + 16, y + 8]], '#d98759', 1);
      box(x - 8, y - 25, 16, 5, '#694a37', 1); box(x - 8, y + 20, 16, 5, '#694a37', 1); line([[x, y + 25], [x, y + 38]], '#d19d5c', 3); label(word, x, y, 16, '#ffe7af');
    }
    function chair(x, y, rotation = 0) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
      oval(2, 12, 18, 10, '#2d3d302b');
      box(-14, -13, 28, 18, '#9d4437', 5, '#593f32', 1.5); box(-11, -10, 22, 12, '#c86145', 4);
      for (let i = 0; i < 3; i++) box(-7 + i * 5, -8, 2, 7, '#944a37', 1);
      box(-14, 0, 28, 22, '#bc533c', 4, '#593f32', 1.5); line([[-12, 18], [-13, 26]], '#8e4032', 3); line([[12, 18], [13, 26]], '#8e4032', 3);
      ctx.restore();
    }
    function guest(x, y, angle, color, index) {
      ctx.save(); ctx.translate(x, y + Math.sin(state.clock * 1.3 + index) * .8); ctx.rotate(angle);
      oval(0, 7, 16, 15, color, '#3d4d40', 1.5); oval(-15, 10, 5, 6, '#d2a678'); oval(15, 10, 5, 6, '#d2a678');
      oval(0, -7, 13, 14, '#dbb486', '#5b5340', 1.5); oval(0, -14, 13, 9, index % 2 ? '#535147' : '#3b453c');
      if (index % 2) line([[-9, -7], [-3, -5], [3, -5], [9, -7]], '#4e5747', 1.5);
      ctx.restore();
    }
    function dining(game) {
      box(1005, 80, 143, 612, '#bcaf87', 4, '#50604d', 2);
      for (let y = 90; y < 683; y += 43) line([[1007, y], [1145, y]], '#ac9b7477', 1);
      box(1015, 88, 123, 39, '#485f4d', 4, '#34473d', 2); label('內 用 區', 1076, 108, 17, '#f0dfb5');
      const occupied = game.phase === 'service' || game.phase === 'closing';
      for (let i = 0; i < 3; i++) {
        const x = 1077, y = 220 + i * 158;
        chair(x, y - 43); chair(x, y + 29, Math.PI); chair(x - 40, y, -Math.PI / 2);
        if (occupied) { guest(x, y - 42, 0, ['#6c8e87', '#b38e61', '#a16f5b'][i], i); guest(x, y + 42, Math.PI, ['#bf926b', '#78865b', '#799c99'][i], i + 1); }
        oval(x + 3, y + 13, 46, 30, '#4c573c33'); oval(x, y + 5, 44, 28, '#995e40', '#63543a', 2); oval(x, y, 44, 28, '#d8aa65', '#7b6140', 2); oval(x, y, 38, 23, null, '#edc787', 1.5);
        plate(x - 20, y - 10, .35); plate(x + 20, y + 10, .35);
        line([[x + 23, y - 13], [x + 33, y - 6]], '#755744', 1.5); line([[x + 26, y - 14], [x + 35, y - 7]], '#755744', 1.5);
        box(x - 4, y - 22, 8, 13, '#faf1d4', 1, '#a4966c', 1); label(String(i + 1), x, y - 15, 9, '#776a43');
        const delivery = state.tables[i + 1];
        if (delivery && state.clock >= delivery.arrivesAt) { dish(delivery.recipe, x, y, .75); steam(x, y - 8, .35); }
        else { box(x - 4, y - 3, 8, 10, '#838c69', 2); box(x - 3, y - 8, 6, 6, '#e1d2ab', 1); }
        const waiting = game.orders.filter(o => o.table === i + 1).length;
        if (waiting) badge(`${i + 1} 桌 · 等 ${waiting} 道`, x, y + 64, 112, '#e9d8ad', '#746247');
      }
      label('好菜慢慢吃', 1077, 672, 14, '#6d674c');
    }
    function scene(game) {
      box(0, 0, WIDTH, HEIGHT, P.night);
      // A fabric awning, lanterns and a painted sign frame the restaurant.
      box(10, 8, 1140, 63, '#416754', 6, '#183335', 3);
      for (let x = 15; x < 1140; x += 48) { box(x, 10, 24, 39, '#d4c9a4', 0); box(x, 42, 24, 17, '#bbae88', 5); box(x + 24, 42, 24, 17, '#375343', 5); }
      box(361, 12, 438, 58, '#314d3f66', 6); box(355, 6, 438, 57, '#efd5a0', 5, '#664b37', 3); box(363, 13, 422, 43, null, '#bc8f57', 1);
      label('巷 口 熱 炒', 521, 35, 29, '#a84a36', 'center', 800); label('現點現炒', 718, 27, 13, '#6f674c'); label('大火上桌', 718, 44, 13, '#6f674c');
      lantern(43, 61, '熱'); lantern(1117, 61, '炒');
      dining(game);
      ctx.save(); ctx.translate(OFFSET.x, OFFSET.y);
      box(20, 1, 945, 612, '#1d353322', 7); box(24, 0, 936, 575, '#d8d6bb', 5, '#384f40', 3);
      // Playable floor follows the existing collision bounds exactly.
      box(27, 37, 907, 527, P.floor);
      for (let row = 0; row < 9; row++) for (let col = 0; col < 16; col++) {
        const x = 28 + col * 57, y = 39 + row * 58;
        if (x + 55 > 934 || y + 55 > 564) continue;
        box(x, y, 55, 55, (row + col) % 2 ? P.floor : P.floorAlt, 1);
        line([[x + 3, y + 3], [x + 50, y + 3]], '#e2dec055', 1);
        oval(x + 12 + row % 3 * 5, y + 41, .8, .8, '#b4b494');
      }
      box(25, 0, 935, 38, '#c7d0bb');
      for (let x = 28; x < 950; x += 45) { box(x, 1, 43, 31, '#e3e6d1', 1, '#bbc6af', .6); }
      box(25, 31, 935, 8, '#86a291', 1); line([[25, 39], [934, 39]], '#536e5c', 2);
      // Handwritten specials, a wall clock, hooks, and dish towels.
      box(80, -2, 218, 32, '#bd9762', 2, '#785d3e', 1.5); box(85, 1, 208, 26, '#425b49', 1);
      label('今日推薦  蔥爆牛肉  三杯雞', 188, 14, 12, '#e2d8b3', 'center', 400);
      oval(348, 15, 13, 13, '#fcf1d2', '#73816a', 2); line([[348, 6], [348, 15], [355, 19]], '#6d7861', 1.5);
      for (let i = 0; i < 3; i++) { line([[411 + i * 17, 5], [411 + i * 17, 21]], '#778d7c', 2); oval(411 + i * 17, 23, 4, 5, '#c4d1b9', '#6a8172', 1); }
      box(495, 3, 27, 25, '#ece4cb', 2); line([[501, 6], [501, 26]], '#b15d45', 2); line([[514, 6], [514, 26]], '#b15d45', 2);
      // Rear extraction canopy reads as an overhead fixture, not another station.
      const hoodWidth = game.level.woks > 1 ? 226 : 108;
      box(600, 168, hoodWidth, 10, '#aebfb0', 2, '#6f8876', 1);
      polygon([[602, 175], [600 + hoodWidth - 2, 175], [609 + hoodWidth, 208], [593, 208]], '#b8c9bb', '#526e60', 2);
      box(593, 207, hoodWidth + 16, 12, '#7e9c8b', 2, '#526e60', 1.5);
      for (let x = 601; x < 600 + hoodWidth; x += 12) line([[x, 185], [x + 5, 201]], '#8aa28f', 2);
      box(600 + hoodWidth / 2 - 26, 211, 52, 3, '#f6df9d', 1);
      // A drain and anti-slip mats add texture without introducing obstacles.
      box(93, 321, 150, 11, '#94a58b', 2, '#7b9076', 1);
      for (let x = 99; x < 238; x += 10) line([[x, 324], [x, 329]], '#61795f', 2);
      box(577, 329, game.level.woks > 1 ? 223 : 111, 22, '#a6b39a88', 5);
      for (let x = 586; x < (game.level.woks > 1 ? 792 : 680); x += 12) line([[x, 335], [x, 345]], '#84957955', 2);
      box(25, 560, 934, 16, '#728d79', 2, '#4c6756', 1.5);
      box(938, 35, 22, 521, '#9caf94', 2); line([[939, 35], [939, 343]], '#5b7964', 3);
      box(934, 348, 47, 81, '#af8254', 3, '#6e6346', 2); for (let i = 0; i < 4; i++) line([[940, 358 + i * 17], [978, 358 + i * 17]], '#cbab74', 2);
      label('外場接菜 →', 911, 454, 13, '#7e7558');
      ctx.restore();
      // Pavement stays outside the kitchen boundary.
      box(0, 670, 995, 50, '#677f78'); for (let x = 0; x < 990; x += 82) { line([[x, 672], [x, 720]], '#526f68', 2); line([[x, 697], [x + 80, 697]], '#82938a', 1); }
      box(56, 678, 137, 28, '#324e42', 3, '#213e35', 2); label('營業中・歡迎光臨', 124, 692, 13, '#edcf8f');
      box(836, 683, 38, 31, '#a46644', 4, '#6b5340', 2); for (let i = 0; i < 5; i++) leaf(855 + Math.sin(i * 2) * 12, 677 + Math.cos(i * 2) * 9, i * 1.3, 13, '#5f875c');
      label('小小廚房，大大鍋氣。', 521, 694, 14, '#d3d6bc', 'center', 400);
    }
    function drawChef(player, game, chopping, active) {
      const x = player.x, y = player.y;
      const moving = active && state.walking;
      const bob = moving ? Math.sin(player.walk) * 1.6 : Math.sin(state.clock * 2) * .6;
      const back = player.dy < -.45, side = Math.abs(player.dx) > .55;
      const gesture = state.gesture, reach = chopping ? 4 + Math.sin(state.clock * 18) * 4 : gesture ? Math.sin((1 - gesture.remaining / gesture.duration) * Math.PI) * 9 : 0;
      ctx.save(); ctx.translate(x, y + bob);
      oval(2, 24 - bob, 24, 10, '#3b4c3438');
      const stride = moving ? Math.sin(player.walk) * 4 : 0;
      box(-13, 15 + stride, 11, 11, '#404c40', 4, '#2b3d33', 1.5); box(3, 15 - stride, 11, 11, '#404c40', 4, '#2b3d33', 1.5);
      line([[-10, 22 + stride], [-6, 22 + stride]], '#6a7960', 1.2); line([[6, 22 - stride], [10, 22 - stride]], '#6a7960', 1.2);
      oval(0, 0, 19, 23, '#ebe6ce', '#56654e', 1.5);
      if (back) { line([[-14, 4], [14, 4]], '#b4563d', 3); box(-4, 1, 8, 7, '#c46443', 2); }
      else { box(-13, -6, 26, 28, '#b65b3d', 6, '#924a35', 1); line([[-9, -14], [-8, -2]], '#cb7950', 4); line([[9, -14], [8, -2]], '#cb7950', 4); box(-8, 8, 16, 9, '#d18c5d', 2); label('炒', 0, 3, 11, '#f8d7a4'); }
      const handY = game.held ? 4 : 5 + (moving ? Math.sin(player.walk) * 2 : 0);
      oval(-19 + player.dx * reach, handY + player.dy * reach, 7, 8, '#e5b789', '#735b42', 1.2);
      oval(19 + player.dx * reach, handY + player.dy * reach, 7, 8, '#e5b789', '#735b42', 1.2);
      if (game.held && back) item(game.held.id, player.dx * 20, -16 - reach * .3, .78);
      box(-11, -17, 22, 7, '#a64d38', 2); polygon([[9, -13], [19, -7], [14, -1]], '#bd6545');
      oval(0, -25, 17, 18, '#e8bd91', '#786345', 1.5); oval(-15, -22, 4, 6, '#dfac7c'); oval(15, -22, 4, 6, '#dfac7c');
      if (back) oval(0, -31, 15, 11, '#494c3d');
      else {
        const shift = side ? player.dx * 5 : 0;
        line([[-9 + shift, -29], [-4 + shift, -30]], '#66523b', 1.5); line([[3 + shift, -30], [8 + shift, -29]], '#66523b', 1.5);
        oval(-6 + shift, -24, 1.8, 2.2, '#3f4734'); oval(6 + shift, -24, 1.8, 2.2, '#3f4734');
        oval(-10 + shift, -18, 3, 1.8, '#d98f6b'); oval(10 + shift, -18, 3, 1.8, '#d98f6b');
        line([[-3 + shift, -14], [1 + shift, -13], [4 + shift, -15]], '#9b6848', 1.1);
      }
      box(-17, -45, 34, 13, '#ecebd8', 4, '#6d795f', 1.5);
      oval(-12, -46, 10, 10, '#fbf6df', '#7a846a', 1.3); oval(0, -51, 12, 12, '#fbf6df', '#7a846a', 1.3); oval(12, -46, 10, 10, '#fbf6df', '#7a846a', 1.3);
      box(-16, -45, 32, 7, '#fbf6df'); line([[-14, -35], [14, -35]], '#d1d5bd', 2);
      if (game.held && !back) { oval(player.dx * 10, 12 - reach * .3, 24, 10, '#44564022'); item(game.held.id, player.dx * 10, 11 - reach * .3, .9); }
      ctx.restore();
    }
    function drawEffects() {
      for (const fx of state.effects) {
        const p = 1 - fx.remaining / fx.duration;
        ctx.save(); ctx.globalAlpha = Math.min(1, (1 - p) * 2);
        if (fx.kind === 'delivery') {
          const startX = OFFSET.x + 14 * 60 + 30, startY = OFFSET.y + 6 * 60 + 30;
          const endY = 220 + (fx.table - 1) * 158;
          dish(fx.recipe, startX + (1077 - startX) * p, startY + (endY - startY) * p - Math.sin(p * Math.PI) * 35, .85);
        } else {
          for (let i = 0; i < 7; i++) { const angle = i * Math.PI * 2 / 7; const x = OFFSET.x + fx.x + Math.cos(angle) * p * 38, y = OFFSET.y + fx.y + Math.sin(angle) * p * 22 - p * 14; box(x, y, 3, 3, fx.color, 1); }
        }
        ctx.restore();
      }
    }
    function reset() { state.clock = 0; state.effects = []; state.tosses = {}; state.gesture = null; state.tables = {}; state.walking = false; }
    function update(dt, animate) {
      if (!animate) return;
      state.clock += dt;
      for (const fx of state.effects) fx.remaining -= dt;
      state.effects = state.effects.filter(fx => fx.remaining > 0);
      for (const id of Object.keys(state.tosses)) { state.tosses[id] -= dt; if (state.tosses[id] <= 0) delete state.tosses[id]; }
      if (state.gesture) { state.gesture.remaining -= dt; if (state.gesture.remaining <= 0) state.gesture = null; }
      for (const id of Object.keys(state.tables)) { state.tables[id].remaining -= dt; if (state.tables[id].remaining <= 0) delete state.tables[id]; }
    }
    function snapshot(game) {
      const recipe = game.held && ITEMS[game.held.id].recipe;
      const order = recipe && game.orders.filter(o => o.recipe === recipe).sort((a, b) => a.remaining - b.remaining)[0];
      return { held: game.held?.id, served: game.served, recipe, table: order?.table, flips: game.flips };
    }
    function action(station, game, before) {
      if (!station) return;
      const x = station.x * 60 + 30, y = station.y * 60 + 30;
      if (game.flips > before.flips) { state.tosses[station.id] = .65; state.gesture = { remaining: .65, duration: .65 }; }
      if (game.held?.id !== before.held) { state.gesture = { remaining: .35, duration: .35 }; state.effects.push({ kind: 'spark', x, y: y - 12, color: '#f4df9f', remaining: .4, duration: .4 }); }
      if (game.served > before.served && before.table) {
        state.effects.push({ kind: 'delivery', table: before.table, recipe: before.recipe, remaining: .8, duration: .8 });
        state.tables[before.table] = { recipe: before.recipe, remaining: 9, arrivesAt: state.clock + .8 };
      }
      state.effects = state.effects.slice(-24);
    }
    function draw(game, player, target, keys, running, ended) {
      ctx.clearRect(0, 0, WIDTH, HEIGHT); scene(game);
      const active = running && !ended && !game.paused;
      const chopping = active && keys.has('f') && target?.type === 'board' && !game.held && target.item && ITEMS[target.item.id].processed ? target.id : null;
      state.walking = active && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some(k => keys.has(k));
      ctx.save(); ctx.translate(OFFSET.x, OFFSET.y);
      const sorted = [...game.stations.map(s => ({ y: s.y * 60 + 30, s })), { y: player.y, chef: true }].sort((a, b) => a.y - b.y);
      for (const obj of sorted) { if (obj.chef) drawChef(player, game, chopping, active); else drawStation(obj.s, game, target, chopping, active); }
      ctx.restore(); drawEffects();
    }
    return { draw, update, reset, snapshot, action, state };
  }
  const api = { createRenderer, WIDTH, HEIGHT, OFFSET };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HotStirFryArt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
