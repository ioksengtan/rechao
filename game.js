/* Single-player input, UI and presentation hooks. No runtime dependencies. */
(() => {
  'use strict';
  const { Kitchen, ITEMS, RECIPES, LEVELS, starCount, portionsFor, cookDuration } = window.HotStirFry;
  const { createPlayer, movePlayer } = window.HotStirFryMovement;
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const game = new Kitchen();
  const art = window.HotStirFryArt.createRenderer(ctx, window.HotStirFry);
  const keys = new Set();
  let player = createPlayer(), running = false, target = null;
  let last = performance.now(), hudTimer = 0, toastUntil = 0, muted = false, audio = null, ended = false;
  let storage;
  try { storage = localStorage; } catch (_) { /* Scores remain session-only when browser storage is blocked. */ }
  const progress = new window.HotStirFryProgress.Progress(storage);
  let selectedLevel = LEVELS[0].id;
  function sound(type) {
    if (muted || !audio) return;
    const tones = { tap:[320], done:[523,659], order:[660,880], serve:[523,659,784], bad:[220,160], fire:[140,190] }[type] || [320];
    tones.forEach((hz, i) => { const o = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime + i * .09; o.type = 'sine'; o.frequency.value = hz; gain.gain.setValueAtTime(.045, t); gain.gain.exponentialRampToValueAtTime(.001, t + .15); o.connect(gain); gain.connect(audio.destination); o.start(t); o.stop(t + .16); });
  }
  function showToast(text, tone) { $('toast').textContent = text; $('toast').classList.add('show'); toastUntil = performance.now() + 3200; sound(tone); }
  function drainEvents() { const events = game.events.splice(0); if (events.length) { const e = events[events.length - 1]; showToast(e.text, e.sound); } }
  function renderLevelSelect() {
    $('level-list').innerHTML = LEVELS.map((level, i) => {
      const record = progress.records[level.id];
      return `<button class="level-card ${selectedLevel === level.id ? 'selected' : ''}" data-level="${level.id}" aria-pressed="${selectedLevel === level.id}"><span class="night-number">NIGHT 0${i+1}</span><strong>${level.name}</strong><span>${level.subtitle}</span><small>${level.menu.length} 道菜 · ${level.woks} 口炒鍋</small><span class="level-stars" aria-label="最佳 ${record.stars} 星">${'★'.repeat(record.stars)}${'☆'.repeat(3-record.stars)}</span><small>${record.runs || record.revenue ? '最佳營收 $'+record.revenue : '尚未完成 · 歡迎挑戰'}</small></button>`;
    }).join('');
    const level = LEVELS.find(l => l.id === selectedLevel);
    $('level-description').textContent = level.description;
    $('level-goals').textContent = level.stars.map((goal, i) => `${i+1} 星 $${goal}`).join('　／　');
    $('level-timing').textContent = `${level.prepTime} 秒備料 · ${level.serviceTime/60} 分鐘營業 · 最多 ${level.closingTime} 秒收尾 · 單人鍵盤操作`;
    $('start').textContent = `開始「${level.name}」 →`;
  }
  function renderMenu() {
    $('menu-count').textContent = `${game.level.menu.length} 道拿手菜`;
    $('recipe-list').innerHTML = game.level.menu.map(key => {
      const r = RECIPES[key];
      return `<div class="recipe"><img class="dish-art" src="assets/${key}.svg" alt="${r.name}" width="64" height="52"><div><strong>${r.name} <em>$${r.price}</em></strong><p>${r.ingredients.map(i => ITEMS[i].name).join(' ＋ ')}</p><small>每份各需上述材料 · 最多 3 份<br>炒 1／2／3 份：${[1,1.4,1.8].map(n => +(r.cookTime*n).toFixed(1)).join("／")} 秒</small></div></div>`;
    }).join('');
    $('current-level').textContent = '單人料理遊戲 · ' + game.level.name;
    $('kitchen-title').textContent = game.level.name + ' · 今晚，你是總舖師';
    $('shift-title').textContent = `${game.level.name} / NIGHT 0${LEVELS.indexOf(game.level)+1}`;
  }
  function showSelection() {
    running = false; ended = false; keys.clear(); target = null; game.reset(selectedLevel); art.reset();
    player = createPlayer();
    $('paused').classList.add('hidden'); $('results').classList.add('hidden'); $('welcome').classList.remove('hidden'); $('overlay').classList.remove('hidden'); $('pause').disabled = true; $('pause').textContent = '暫停 Esc';
    $('toast').textContent = ''; $('toast').classList.remove('show'); toastUntil = 0;
    renderLevelSelect(); renderMenu(); updateHUD(); $('start').focus();
  }
  $('level-list').onclick = event => {
    const button = event.target.closest('[data-level]');
    if (!button || !LEVELS.some(l => l.id === button.dataset.level)) return;
    selectedLevel = button.dataset.level; game.reset(selectedLevel); art.reset(); renderLevelSelect(); renderMenu(); updateHUD();
    $('level-list').querySelector(`[data-level="${selectedLevel}"]`).focus();
  };
  function start() {
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume().catch(() => {}); } catch (_) { /* Audio is optional. */ }
    game.reset(selectedLevel); art.reset(); player = createPlayer(); keys.clear(); running = true; ended = false; target = null;
    $('overlay').classList.add('hidden'); $('pause').disabled = false; $('pause').textContent = '暫停 Esc'; last = performance.now();
    canvas.focus(); renderMenu();
    showToast(game.level.woks === 1 ? '先去左上方青菜箱按 E 拿菜，再到砧板備料。' : `${game.level.name}：兩口鍋各自計時，先備好料再開火。`, 'done'); updateHUD();
  }
  function pause(force) {
    if (!running || ended) return;
    game.paused = typeof force === 'boolean' ? force : !game.paused; keys.clear();
    $('overlay').classList.toggle('hidden', !game.paused); $('welcome').classList.add('hidden'); $('results').classList.add('hidden'); $('paused').classList.remove('hidden');
    $('pause').textContent = game.paused ? '繼續 Esc' : '暫停 Esc';
    if (game.paused) $('resume').focus(); else canvas.focus();
  }
  $('start').onclick = start; $('restart').onclick = start; $('restart-pause').onclick = start;
  $('pause').onclick = () => pause(); $('resume').onclick = () => pause(false);
  $('choose-pause').onclick = showSelection; $('choose-results').onclick = showSelection;
  $('next-level').onclick = () => { const next = LEVELS[LEVELS.indexOf(game.level)+1]; if (next) { selectedLevel = next.id; start(); } };
  $('open-early').onclick = () => { if (running && !game.paused) { game.startService(); drainEvents(); updateHUD(); } };
  $('sound').onclick = () => { muted = !muted; $('sound').textContent = '音效 ' + (muted ? '關' : '開'); };
  addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (running && !game.paused && !ended && ['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) e.preventDefault();
    if (key === 'escape' && !e.repeat) { pause(); return; }
    if (!running || game.paused || ended) return;
    keys.add(key);
    if (!e.repeat && target && (key === 'e' || key === 'f')) {
      const before = art.snapshot(game);
      if (key === 'e') game.interact(target.id); else game.action(target.id);
      art.action(target, game, before); drainEvents(); updateHUD();
    }
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => pause(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });
  function move(dt) {
    target = movePlayer(player, keys, game.stations, dt);
  }
  function prompt() {
    if (!target || !running || ended) return '';
    const s = target;
    if (s.type === 'supply') return `E 取${ITEMS[s.supply].name}`;
    if (s.type === 'board') return s.item ? (ITEMS[s.item.id].chopped ? 'E 拿起切好的食材' : '空手按住 F 切料 · E 拿起') : 'E 放上需要切的蔬菜／肉類';
    if (s.type === 'counter') return s.item ? 'E 拿起物品' : 'E 暫放物品';
    if (s.type === 'plates') return `E ${game.held?.id === 'plate' ? '放回' : '拿取'}餐盤 · 剩 ${game.plates} 個`;
    if (s.type === 'serve') return 'E 上菜 · 自動送至正確桌次';
    if (s.type === 'trash') return 'E 丟棄食材／清空餐盤';
    const w = game.woks[s.id];
    if (w.state === 'empty') return 'E 加入食材';
    if (w.state === 'loading') return HotStirFry.recipeFor(w.ingredients, game.level.menu) ? `F 炒 ${portionsFor(w.ingredients)} 份 · E 加料（最多 3 份）` : game.missingIngredients(s.id) + ' · E 加料／空手按住 F 清空';
    if (w.state === 'ready') return `剩 ${w.remaining} 份 · 拿空盤按 E 盛 1 份！`;
    if (w.state === 'burned') return '空手按住 F 清理燒焦炒鍋';
    return w.flipped ? '翻炒完成，等待起鍋' : 'F 翻炒 · 在進度 40%～85% 時操作';
  }
  function updateHUD() {
    const labels = { prep:'備料時間', service:'營業中', closing:'最後出菜', ended:'今晚打烊' };
    $('phase-label').textContent = labels[game.phase]; const time = Math.ceil(Math.max(0, game.time)); $('clock').textContent = `${String(Math.floor(time/60)).padStart(2,'0')}:${String(time%60).padStart(2,'0')}`;
    $('revenue').textContent = game.revenue.toLocaleString(); $('served').innerHTML = `${game.served} <span class="unit">道</span>`; $('satisfaction').innerHTML = `${game.satisfaction}<span class="unit">%</span>`;
    $('held-label').textContent = game.held ? '手上拿著：' + ITEMS[game.held.id].name : '雙手空空';
    $('phase-note').textContent = { prep:'先切點青菜，讓第一道菜快點上桌。', service:'大火快炒，慢慢也能熟能生巧。', closing:'不接新單了，把最後幾道菜送上桌。', ended:'謝謝招待，明天見！' }[game.phase];
    $('open-early').classList.toggle('hidden', game.phase !== 'prep');
    $('order-count').textContent = `${game.orders.length} / ${game.level.maxOrders}`;
    $('orders').innerHTML = game.orders.map(o => { const r = RECIPES[o.recipe]; return `<article class="order ${o.remaining < 20 ? 'urgent' : ''}"><div class="order-head"><span>第 ${o.table} 桌 · #${String(o.id).padStart(2,'0')}</span><b>$${r.price}</b></div><h3>${r.name}</h3><p>${r.ingredients.map(i => ITEMS[i].name).join(' ＋ ')}</p><div class="order-bottom"><span>${o.remaining < 20 ? '客人等得有點急了' : '客人耐心'}</span><span>${Math.ceil(o.remaining)} 秒</span></div><div class="progress-track"><i style="width:${Math.max(0,o.remaining/o.total*100)}%"></i></div></article>`; }).join('') || `<div class="empty-orders">${game.phase === 'prep' ? '客人還沒到<br>先準備一些切好的食材吧。' : '目前沒有待做的菜<br>趁現在整理一下廚房。'}</div>`;
    const woks = Object.values(game.woks);
    $('tip').textContent = woks.some(w => w.state === 'ready') ? '餐盤架在炒爐下方。拿空盤，回到完成的鍋按 E 盛裝，再送到右側出餐口。' : woks.some(w => w.state === 'cooking') ? '每口鍋獨立計時。看下方鍋況，在 40%～85% 進度回來按 F 翻炒，品質獎勵 +10%。' : '青菜、蔥、牛肉和雞肉要先切。雞蛋、白飯、九層塔與三杯醬可直接下鍋。';
    $('wok-status').innerHTML = Object.entries(game.woks).map(([id, w], i) => {
      const dish = w.recipe ? RECIPES[w.recipe].name : '';
      let state = '空鍋 · 等待食材';
      if (w.state === 'loading') state = HotStirFry.recipeFor(w.ingredients, game.level.menu) ? `${game.missingIngredients(id)} · F 開火` : game.missingIngredients(id);
      if (w.state === 'cooking') { const p = w.elapsed/cookDuration(w); state = `${dish} ×${w.portions} · ${Math.ceil(cookDuration(w)-w.elapsed)} 秒${w.flipped ? ' · 已翻炒' : p >= .4 && p <= .85 ? ' · F 翻炒！' : ''}`; }
      if (w.state === 'ready') state = `${dish} · 剩 ${w.remaining} 份 · ${Math.ceil(8-w.readyTime)} 秒內盛裝！`;
      if (w.state === 'burned') state = '燒焦 · 空手按住 F 清鍋';
      return `<div class="wok-chip ${w.state}"><b>${i+1} 號鍋</b><span>${state}</span></div>`;
    }).join('');
  }
  function finish() {
    ended = true; keys.clear(); $('pause').disabled = true;
    const stars = starCount(game.revenue, game.level);
    const record = progress.record(game.level.id, game.revenue, stars);
    $('stars').textContent = '★'.repeat(stars) + '☆'.repeat(3-stars);
    $('result-level').textContent = game.level.name + ' · 營業結算';
    $('result-message').textContent = stars >= 2 ? '巷口飄著鍋氣，客人帶著笑意回家。' : stars === 1 ? '成功站穩腳步，下一晚再挑戰更高營收。' : `辛苦了！再挑戰一次，營收達 $${game.level.stars[0]} 就能拿到第一顆星。`;
    $('result-stats').innerHTML = [['今晚收入', '$'+game.revenue],['成功上菜',game.served+' 道'],['逾時訂單',game.expired+' 道'],['客人滿意度',game.satisfaction+'%'],['成功翻炒',game.flips+' 次'],['燒焦 / 丟棄',game.burned+' / '+game.wasted+' 次']].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
    $('best-record').textContent = `本關最佳 $${record.revenue} · 最佳 ${record.stars} 星 · 完成 ${record.runs} 次`;
    const next = LEVELS[LEVELS.indexOf(game.level)+1];
    $('next-level').classList.toggle('hidden', !next);
    if (next) $('next-level').textContent = `挑戰「${next.name}」 →`;
    $('welcome').classList.add('hidden'); $('paused').classList.add('hidden'); $('results').classList.remove('hidden'); $('overlay').classList.remove('hidden'); sound('serve'); updateHUD(); (next ? $('next-level') : $('restart')).focus();
  }
  function draw() {
    art.draw(game, player, target, keys, running, ended);
    $('interaction').textContent = prompt();
  }
  function frame(now){
    const dt=Math.min((now-last)/1000,.25);last=now;
    if(running&&!game.paused&&!ended){move(dt);game.tick(dt,keys.has('f')&&target?target.id:null);drainEvents();if(game.phase==='ended')finish();hudTimer+=dt;if(hudTimer>.15){updateHUD();hudTimer=0;}}
    art.update(dt, !game.paused && !ended);
    if(now>toastUntil)$('toast').classList.remove('show');draw();requestAnimationFrame(frame);
  }
  canvas.tabIndex = 0;
  canvas.width = window.HotStirFryArt.WIDTH; canvas.height = window.HotStirFryArt.HEIGHT;
  renderLevelSelect();renderMenu();updateHUD();requestAnimationFrame(frame);
})();
