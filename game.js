/* Single-player input, UI and presentation hooks. No runtime dependencies. */
(() => {
  'use strict';
  const { Kitchen, ITEMS, RECIPES, LEVELS, starCount, portionsFor, cookDuration, flipWindowText } = window.HotStirFry;
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
  let selectedLevel = 'prep-school', selectedCourse = 'prep';
  const courses = [['prep','備料'],['spices','辛香料'],['sauces','調醬'],['juice','果汁'],['service','熱炒營業']];
  const courseFor = level => level.course;
  const goalText = level => level.goals.map(g => `${ITEMS[g.id].name} ${g.count} 份`).join('、');
  const nextLevel = () => game.level.mode === 'training' ? LEVELS[0] : LEVELS.filter(l => !l.mode)[LEVELS.filter(l => !l.mode).indexOf(game.level)+1];
  game.reset(selectedLevel);
  const originLines = [
    ['抵達台灣的第一週', '艾 Alex · 旅人', '艾', '我叫 Alex。這次來台灣，我想試試一邊打工、一邊生活，看看旅行指南以外的日常。'],
    ['夜裡，巷口傳來炒鍋聲', '艾 Alex · 旅人', '艾', '有天晚上，我跟著香味走進一間熱炒店。圓桌、紅椅子，還有一盤盤冒著熱氣的菜……我一下就喜歡上這裡了。'],
    ['一盤三杯雞，讓人多留了一會兒', '艾 Alex · 旅人', '艾', '九層塔的香氣好特別！老闆，這道菜是怎麼做的？為什麼叫三杯雞？'],
    ['老闆把火轉小，笑著回頭', '阿明 · 熱炒店老闆', '明', '你對料理有興趣喔？我們正好有打工體驗的機會。想學的話，可以從備料開始，我慢慢教你。'],
    ['隔天傍晚，店門還沒開', '艾 Alex · 旅人', '艾', '真的可以嗎？我的中文還在學，炒菜也不太熟練。不過，我想親手做做看，了解這些我喜歡的味道。'],
    ['第一件工作：繫好圍裙', '阿明 · 熱炒店老闆', '明', '不懂就問，不用急。先認識食材，再練切菜和火候。青菜、蛋炒飯，都是很好的開始。'],
    ['砧板旁，擺著今天的食材', '艾 Alex · 旅人', '艾', '原來一盤菜上桌之前，有這麼多準備。我想記住的不只是配方，還有大家怎麼一起把這間店照顧好。'],
    ['門口的燈亮了', '阿明 · 熱炒店老闆', '明', '準備好了嗎？今晚你先顧這口鍋。看清楚點菜單，切好料再下鍋，別忘了回來翻炒！'],
    ['我的第一晚，即將開張', '艾 Alex · 旅人', '艾', '好！就從這間巷口熱炒店開始，用雙手認識台灣料理。今晚，請多多指教！']
  ];
  let originIndex = 0, originOpen = false;
  function renderOrigin() {
    const [scene, speaker, portrait, line] = originLines[originIndex];
    $('origin-scene-label').textContent = scene; $('origin-speaker').textContent = speaker;
    $('origin-portrait').innerHTML = portraitHtml(portrait === '艾' ? 'alex' : 'aming'); $('origin-text').textContent = line;
    $('origin-progress').textContent = `${originIndex + 1} / ${originLines.length}`;
    $('origin-prev').disabled = originIndex === 0;
    $('origin-next').textContent = originIndex === originLines.length - 1 ? '前往選關 →' : '下一句 →';
  }
  function closeOrigin() {
    originOpen = false; $('origin').classList.add('hidden'); $('welcome').classList.remove('hidden'); $('origin-open').focus();
  }
  function nextOrigin() { if (originIndex < originLines.length - 1) { originIndex++; renderOrigin(); } else closeOrigin(); }
  $('origin-open').onclick = () => {
    if (running) return;
    originOpen = true; originIndex = 0; keys.clear();
    $('welcome').classList.add('hidden'); $('origin').classList.remove('hidden'); renderOrigin(); $('origin-next').focus();
  };
  $('origin-close').onclick = closeOrigin;
  $('origin-next').onclick = nextOrigin;
  $('origin-prev').onclick = () => { if (originIndex > 0) { originIndex--; renderOrigin(); } };
  function portraitHtml(who) { return who === 'guest' ? '<span>客</span>' : `<img src="assets/portrait-${who === 'alex' ? 'alex' : 'aming'}.svg" alt="" width="180" height="210">`; }
  // Career mode: weekly choices build a chef card that service levels can use.
  const Career = window.HotStirFryCareer, careerSave = new Career.CareerSave(storage);
  let session = { kind: 'standard', level: selectedLevel, chef: null }, selectedChef = null;
  let careerOpen = false, careerNote = '', careerSlot = -1, confirmArmed = '';
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const signed = v => (v > 0 ? '+' : '') + v;
  const effectLine = (stats = {}, stamina = 0) => [...Object.entries(stats).filter(([, v]) => v).map(([k, v]) => `${Career.STAT_NAMES[k]} ${signed(v)}`), stamina ? `體力 ${signed(stamina)}` : ''].filter(Boolean).join('、') || '沒有數值變化';
  const meter = (label, value, hint = '') => `<div class="stat-row"${hint ? ` title="${hint}"` : ''}><span>${label}</span><div class="meter"><i style="width:${value}%"></i></div><b>${value}</b></div>`;
  const statBars = stats => Object.keys(Career.STAT_NAMES).map(k => meter(Career.STAT_NAMES[k], stats[k], Career.STAT_EFFECTS[k])).join('');
  function modifierLine(stats) {
    const m = HotStirFry.getChefModifiers({ stats });
    return `切料 ${+m.chopTime.toFixed(2)} 秒 · 翻炒 ${flipWindowText(m)} · 品質 +${Math.round(m.qualityBonus * 100)}% · 耐心 ×${+m.patience.toFixed(2)} · ${+m.burnTime.toFixed(1)} 秒後燒焦`;
  }
  const cardHtml = card => `<div class="chef-card"><div class="chef-card-head"><strong>${esc(card.nickname)}</strong><span>${esc(card.title)}</span></div><div class="stat-bars">${statBars(card.stats)}</div><small>${modifierLine(card.stats)}</small></div>`;
  function renderCareer() {
    const run = careerSave.run, pending = run?.pending?.type;
    $('career-status').classList.toggle('hidden', !run || pending === 'card');
    $('career-name-field').classList.toggle('hidden', pending !== 'card');
    $('career-abandon').classList.toggle('hidden', !run || pending === 'card');
    $('career-abandon').textContent = confirmArmed === 'abandon' ? '確定放棄這一輪？再按一次' : '放棄這一輪';
    $('career-message').textContent = careerNote;
    $('career-card-actions').innerHTML = '';
    $('career-week').textContent = !run ? `${Career.WEEKS} 週打工 · 結業得到主廚卡` : pending === 'card' ? '結業' : `第 ${run.week} / ${Career.WEEKS} 週`;
    if (run) $('career-stats').innerHTML = `<div class="stat-bars">${meter('體力', run.stamina, '體力低於 50 時訓練效果會下降')}${statBars(run.stats)}</div>${run.injured ? '<small class="career-warn">受傷中：下次訓練效果減半。</small>' : ''}`;
    if (!run) {
      $('career-body').innerHTML = `<div class="career-intro"><p>在阿明的熱炒店打工 ${Career.WEEKS} 週。每週選一件事練習，遇到事件時做出選擇；第 ${Career.WEEKS} 週通過結業考，就能得到一張主廚卡，帶進熱炒營業。</p><button class="primary" data-career="start">開始新的一輪 →</button></div>`
        + `<h3 class="career-heading">我的主廚卡（${careerSave.cards.length} / ${Career.MAX_CARDS}）</h3>`
        + (careerSave.cards.length ? `<div class="chef-cards">${careerSave.cards.map(cardHtml).join('')}</div>` : '<p class="career-empty">還沒有主廚卡。</p>');
    } else if (pending === 'event') {
      const e = Career.eventById(run.pending.id);
      $('career-body').innerHTML = `<div class="origin-scene career-scene"><span class="origin-lantern">事</span><div><strong>第 ${run.week} 週 · 事件</strong><p>${e.scene}</p></div></div>`
        + `<div class="origin-dialogue"><div class="origin-portrait" aria-hidden="true">${portraitHtml(e.speaker)}</div><div class="origin-lines"><p>${e.text}</p></div></div>`
        + `<div class="career-choices">${e.choices.map((c, i) => `<button class="career-option" data-career="choice" data-value="${i}"><strong>${c.label}</strong><span>${effectLine(c.stats, c.stamina)}</span></button>`).join('')}</div>`;
    } else if (pending === 'exam') {
      $('career-body').innerHTML = `<div class="career-exam"><h3>結業考 · ${LEVELS.find(l => l.id === Career.EXAM_LEVEL).name}</h3><p>用目前的能力上場營業。星數決定稱號與全能力加成：0～1 星見習生（+0／+2）、2 星二廚（+4）、3 星總舖師（+6）。考差也一定拿得到主廚卡；結業考成績不列入營業紀錄。</p><small>${modifierLine(run.stats)}</small><button class="primary" data-career="exam">開始結業考 →</button></div>`;
    } else if (pending === 'card') {
      const r = run.result, preview = Career.makeCard(run, $('career-nickname').value), full = careerSave.full;
      $('career-nickname').placeholder = Career.makeCard(run, '').nickname;
      $('career-body').innerHTML = `<div class="career-result"><span class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</span><p>結業考營收 $${r.revenue} · 稱號「${r.title}」 · 全能力 +${r.bonus}</p></div>${cardHtml(preview)}`
        + (full ? `<p class="career-warn">主廚卡已滿 ${Career.MAX_CARDS} 張。選一張替換，或放棄這張新卡。</p><div class="career-slots">${careerSave.cards.map((c, i) => `<button class="career-option ${careerSlot === i ? 'selected' : ''}" aria-pressed="${careerSlot === i}" data-career="slot" data-value="${i}"><strong>${esc(c.nickname)}</strong><span>${esc(c.title)}</span></button>`).join('')}</div>` : '');
      $('career-card-actions').innerHTML = `<button class="primary" data-career="keep"${full && careerSlot < 0 ? ' disabled' : ''}>${full ? '替換並保留新卡' : '保留主廚卡'} →</button><button class="secondary" data-career="discard">${confirmArmed === 'discard' ? '確定放棄這張卡？再按一次' : '放棄這張卡'}</button>`;
    } else {
      $('career-body').innerHTML = `<div class="career-actions">${Object.entries(Career.ACTIONS).map(([id, a]) => {
        const p = Career.previewAction(run, id), idle = id === 'rest' && !p.stamina, warn = [p.efficiency < 1 ? `效果 ×${+p.efficiency.toFixed(2)}` : '', p.injuryChance ? `受傷機率 ${Math.round(p.injuryChance * 100)}%` : ''].filter(Boolean).join(' · ');
        return `<button class="career-option" data-career="action" data-value="${id}"><strong>${a.name}</strong><span>${idle ? '體力已滿，休息沒有效果' : effectLine(p.gains, p.stamina)}</span>${warn ? `<small>${warn}</small>` : ''}</button>`;
      }).join('')}</div>${run.week === Career.WEEKS ? '<p class="career-note">這是最後一週，行動後就是結業考。</p>' : ''}`;
    }
  }
  function careerClick(event) {
    const button = event.target.closest('[data-career]');
    if (!button || button.disabled) return;
    const act = button.dataset.career, value = button.dataset.value, run = careerSave.run;
    if (act === 'exam') { if (run?.pending?.type === 'exam') startExam(); return; }
    if (act === 'discard' && confirmArmed !== 'discard') { confirmArmed = 'discard'; renderCareer(); return; }
    confirmArmed = ''; careerNote = '';
    if (act === 'start' && !run) { careerSave.start(); careerNote = '第一週開始！先挑一件事練習吧。'; }
    else if (act === 'action' && run) {
      const r = Career.chooseAction(run, value);
      if (r) { careerNote = `${Career.ACTIONS[value].name}：${effectLine(r.preview.gains, r.preview.stamina)}。${r.hurt ? 'Alex 不小心受傷了，下次訓練效果減半。' : ''}`; careerSave.save(); }
    } else if (act === 'choice' && run) { const c = Career.resolveEvent(run, Number(value)); if (c) { careerNote = c.result; careerSave.save(); } }
    else if (act === 'slot') careerSlot = Number(value);
    else if (act === 'keep') {
      const card = careerSave.keep($('career-nickname').value, careerSlot);
      if (card) { careerNote = `「${card.nickname}」加入主廚卡！到熱炒營業選關時可以選擇上場。`; careerSlot = -1; selectedChef = card.id; $('career-nickname').value = ''; }
    } else if (act === 'discard') { careerSave.discard(); careerSlot = -1; careerNote = '已放棄這張卡，主廚卡沒有變動。'; }
    renderCareer(); $('career-body').querySelector('button')?.focus();
  }
  $('career-body').onclick = careerClick; $('career-card-actions').onclick = careerClick;
  $('career-nickname').oninput = () => { if (careerSave.run?.pending?.type === 'card') renderCareer(); };
  function openCareer() {
    if (running && !ended) return;
    careerOpen = true; keys.clear(); careerNote = ''; confirmArmed = '';
    ['welcome', 'results', 'paused'].forEach(id => $(id).classList.add('hidden'));
    $('overlay').classList.remove('hidden'); $('career').classList.remove('hidden'); renderCareer(); $('career-body').querySelector('button')?.focus();
  }
  function closeCareer() {
    careerOpen = false; confirmArmed = ''; careerNote = '';
    $('career').classList.add('hidden'); $('welcome').classList.remove('hidden'); renderLevelSelect(); $('career-open').focus();
  }
  function startExam() {
    const run = careerSave.run;
    careerOpen = false; $('career').classList.add('hidden');
    beginShift({ kind: 'exam', level: Career.EXAM_LEVEL, examId: run.pending.id, chef: { nickname: 'Alex · 結業考', stats: { ...run.stats } } });
  }
  $('career-open').onclick = openCareer; $('career-close').onclick = closeCareer;
  $('career-abandon').onclick = () => {
    if (!careerSave.run) return;
    if (confirmArmed !== 'abandon') { confirmArmed = 'abandon'; renderCareer(); return; }
    careerSave.abandon(); confirmArmed = ''; careerNote = '已放棄這一輪。'; renderCareer();
  };
  $('chef-picker').onclick = event => {
    const button = event.target.closest('[data-chef]');
    if (!button) return;
    selectedChef = button.dataset.chef || null; renderLevelSelect();
  };
  function sound(type) {
    if (muted || !audio) return;
    const tones = { tap:[320], done:[523,659], order:[660,880], serve:[523,659,784], bad:[220,160], fire:[140,190] }[type] || [320];
    tones.forEach((hz, i) => { const o = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime + i * .09; o.type = 'sine'; o.frequency.value = hz; gain.gain.setValueAtTime(.045, t); gain.gain.exponentialRampToValueAtTime(.001, t + .15); o.connect(gain); gain.connect(audio.destination); o.start(t); o.stop(t + .16); });
  }
  function showToast(text, tone) { $('toast').textContent = text; $('toast').classList.add('show'); toastUntil = performance.now() + 3200; sound(tone); }
  function drainEvents() { const events = game.events.splice(0); if (events.length) { const e = events[events.length - 1]; showToast(e.text, e.sound); } }
  function renderLevelSelect() {
    const available = LEVELS.filter(l => courseFor(l) === selectedCourse);
    $('course-tabs').innerHTML = courses.map(([id,label]) => `<button data-course="${id}" aria-pressed="${selectedCourse === id}" class="${selectedCourse === id ? 'selected' : ''}">${label}${LEVELS.some(l => courseFor(l) === id) ? '' : ' · 籌備中'}</button>`).join('');
    $('course-note').textContent = available.length ? (progress.records['prep-school'].runs ? '已完成備料課，可以挑戰熱炒營業；所有課程皆可自由選擇。' : '推薦第一課：備料 → 開店前的備料課。所有已開放課程皆可自由選擇。') : '師傅正在準備這門課，敬請期待。可以先選備料或熱炒營業。';
    $('start').disabled = !available.length;
    $('welcome-steps').classList.toggle('hidden', selectedCourse !== 'service');
    if (selectedChef && !careerSave.card(selectedChef)) selectedChef = null;
    const picking = selectedCourse === 'service' && careerSave.cards.length > 0;
    $('chef-picker').classList.toggle('hidden', !picking);
    $('chef-picker').innerHTML = picking ? '<span class="chef-picker-label">上場主廚</span>' + [{ id: '', nickname: '標準 Alex', title: '標準紀錄' }, ...careerSave.cards].map(c => `<button data-chef="${c.id}" class="${(selectedChef || '') === c.id ? 'selected' : ''}" aria-pressed="${(selectedChef || '') === c.id}">${esc(c.nickname)}<small>${esc(c.title)}</small></button>`).join('') + (selectedChef ? '<p>主廚卡成績另外記錄，不影響標準紀錄。</p>' : '') : '';
    $('level-list').innerHTML = available.map((level, i) => {
      const record = progress.records[level.id];
      return `<button class="level-card ${selectedLevel === level.id ? 'selected' : ''}" data-level="${level.id}" aria-pressed="${selectedLevel === level.id}"><span class="night-number">${level.mode === 'training' ? 'LESSON' : 'NIGHT'} 0${i+1}</span><strong>${level.name}</strong><span>${level.subtitle}</span><small>${level.mode === 'training' ? level.card : level.menu.length + ' 道菜 · ' + level.woks + ' 口炒鍋'}</small><span class="level-stars" aria-label="最佳 ${record.stars} 星">${'★'.repeat(record.stars)}${'☆'.repeat(3-record.stars)}</span><small>${record.runs || record.revenue ? (level.mode === 'training' ? '已完成 ' + record.runs + ' 次' : '最佳營收 $'+record.revenue) : '尚未完成 · 歡迎挑戰'}</small></button>`;
    }).join('');
    if (!available.length) {
      $('level-description').textContent = '籌備中'; $('level-goals').textContent = ''; $('level-timing').textContent = ''; $('start').textContent = '尚未開放'; return;
    }
    const level = LEVELS.find(l => l.id === selectedLevel);
    $('level-description').textContent = level.description;
    $('level-goals').textContent = level.stars.map((goal, i) => `${i+1} 星 $${goal}`).join('　／　');
    $('level-timing').textContent = `${level.prepTime} 秒備料 · ${level.serviceTime/60} 分鐘營業 · 最多 ${level.closingTime} 秒收尾 · 單人鍵盤操作`;
    $('start').textContent = `開始「${level.name}」 →`;
    if (level.mode === 'training') { $('level-goals').textContent = '目標：' + goalText(level); $('level-timing').textContent = level.timing; }

  }
  function renderMenu() {
    $('revenue-metric').classList.toggle('hidden', game.level.mode === 'training');
    $('satisfaction-metric').classList.toggle('hidden', game.level.mode === 'training');
    $('served-title').textContent = game.level.mode === 'training' ? '已驗收' : '已上菜';
    $('menu-count').textContent = `${game.level.menu.length} 道拿手菜`;
    $('recipe-list').innerHTML = game.level.menu.map(key => {
      const r = RECIPES[key];
      return `<div class="recipe"><img class="dish-art" src="assets/${key}.svg" alt="${r.name}" width="64" height="52"><div><strong>${r.name} <em>$${r.price}</em></strong><p>${r.ingredients.map(i => ITEMS[i].name).join(' ＋ ')}</p><small>每份各需上述材料 · 最多 3 份<br>炒 1／2／3 份：${[1,1.4,1.8].map(n => +(r.cookTime*n).toFixed(1)).join("／")} 秒</small></div></div>`;
    }).join('');
    $('current-level').textContent = '單人料理遊戲 · ' + game.level.name + (game.chef && game.level.mode !== 'training' ? ' · 主廚 ' + game.chef.nickname : '');
    $('kitchen-title').textContent = game.level.name + ' · 今晚，你是總舖師';
    $('orders-title').textContent = game.level.mode === 'training' ? game.level.ordersTitle : '點菜單';
    $('orders-subtitle').textContent = game.level.mode === 'training' ? game.level.ordersSubtitle : '熱騰騰上桌，客人就開心。';
    $('menu-title').textContent = game.level.mode === 'training' ? '師傅示範' : '今晚菜單';
    if (game.level.mode === 'training') { $('menu-count').textContent = game.level.stepLabel; $('recipe-list').innerHTML = `<p class="intro">${game.level.steps}</p>`; }
    $('shift-title').textContent = `${game.level.name} / NIGHT 0${LEVELS.indexOf(game.level)+1}`;
  }
  $('course-tabs').onclick = event => {
    const button = event.target.closest('[data-course]');
    if (!button || !courses.some(c => c[0] === button.dataset.course)) return;
    selectedCourse = button.dataset.course;
    const first = LEVELS.find(l => courseFor(l) === selectedCourse);
    if (first) { selectedLevel = first.id; game.reset(selectedLevel); art.reset(); renderMenu(); updateHUD(); }
    renderLevelSelect(); $('course-tabs').querySelector(`[data-course="${selectedCourse}"]`).focus();
  };
  function showSelection() {
    selectedCourse = courseFor(game.level);

    running = false; ended = false; keys.clear(); target = null; game.reset(selectedLevel, null); art.reset(); careerOpen = false; $('career').classList.add('hidden');
    player = createPlayer();
    $('paused').classList.add('hidden'); $('results').classList.add('hidden'); $('welcome').classList.remove('hidden'); $('overlay').classList.remove('hidden'); $('pause').disabled = true; $('pause').textContent = '暫停 Esc';
    $('toast').textContent = ''; $('toast').classList.remove('show'); toastUntil = 0;
    renderLevelSelect(); renderMenu(); updateHUD(); $('start').focus();
  }
  $('level-list').onclick = event => {
    const button = event.target.closest('[data-level]');
    if (!button || !LEVELS.some(l => l.id === button.dataset.level)) return;
    selectedLevel = button.dataset.level; selectedCourse = courseFor(LEVELS.find(l => l.id === selectedLevel)); game.reset(selectedLevel); art.reset(); renderLevelSelect(); renderMenu(); updateHUD();
    $('level-list').querySelector(`[data-level="${selectedLevel}"]`).focus();
  };
  function start() {
    if (!LEVELS.some(l => courseFor(l) === selectedCourse)) return;
    const card = LEVELS.find(l => l.id === selectedLevel).mode === 'training' ? null : careerSave.card(selectedChef);
    beginShift(card ? { kind: 'chef', level: selectedLevel, chef: card } : { kind: 'standard', level: selectedLevel, chef: null });
  }
  function beginShift(next) {
    session = next; selectedLevel = next.level; selectedCourse = courseFor(LEVELS.find(l => l.id === next.level));
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume().catch(() => {}); } catch (_) { /* Audio is optional. */ }
    game.reset(selectedLevel, session.chef); art.reset(); player = createPlayer(); keys.clear(); running = true; ended = false; target = null;
    $('overlay').classList.add('hidden'); $('pause').disabled = false; $('pause').textContent = '暫停 Esc'; last = performance.now();
    canvas.focus(); renderMenu();
    showToast(game.level.mode === 'training' ? game.level.toast : game.level.woks === 1 ? '先去左上方青菜箱按 E 拿菜，再到砧板備料。' : `${game.level.name}：兩口鍋各自計時，先備好料再開火。`, 'done'); updateHUD();
  }
  function pause(force) {
    if (!running || ended) return;
    game.paused = typeof force === 'boolean' ? force : !game.paused; keys.clear();
    $('overlay').classList.toggle('hidden', !game.paused); $('welcome').classList.add('hidden'); $('results').classList.add('hidden'); $('paused').classList.remove('hidden');
    $('pause').textContent = game.paused ? '繼續 Esc' : '暫停 Esc';
    if (game.paused) $('resume').focus(); else canvas.focus();
  }
  $('start').onclick = start; $('restart').onclick = () => beginShift(session); $('restart-pause').onclick = () => beginShift(session);
  $('pause').onclick = () => pause(); $('resume').onclick = () => pause(false);
  $('choose-pause').onclick = showSelection; $('choose-results').onclick = showSelection;
  $('next-level').onclick = () => {
    if (session.kind === 'exam') { showSelection(); openCareer(); return; }
    const next = nextLevel(); if (next) beginShift({ ...session, level: next.id });
  };
  $('open-early').onclick = () => { if (running && !game.paused) { game.startService(); drainEvents(); updateHUD(); } };
  $('sound').onclick = () => { muted = !muted; $('sound').textContent = '音效 ' + (muted ? '關' : '開'); };
  addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (careerOpen) { if (key === 'escape' && !e.repeat) { e.preventDefault(); closeCareer(); } return; }
    if (originOpen) {
      if (['escape', 'enter', ' ', 'arrowright', 'arrowleft'].includes(key)) {
        if (['enter', ' '].includes(key) && ['origin-close', 'origin-prev'].includes(document.activeElement?.id)) return;
        e.preventDefault(); if (e.repeat) return;
        if (key === 'escape') closeOrigin();
        else if (key === 'arrowleft') $('origin-prev').onclick();
        else if (key === 'enter' || key === ' ') {
          if (['origin-close', 'origin-prev'].includes(document.activeElement?.id)) return;
          nextOrigin();
        } else nextOrigin();
      }
      return;
    }
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
    if (s.type === 'board') return s.item ? (ITEMS[s.item.id].chopped ? `E 拿起 ${s.item.count || 1} 份切好的食材` : `共 ${s.item.count || 1}/3 份 · E 加同種食材／空手拿起 · 按住 F 切料`) : 'E 放上需要切的蔬菜／肉類';
    if (s.type === 'counter') return s.item ? (game.held ? 'E 交換手上與檯上物品' : `E 拿起${ITEMS[s.item.id].name} ×${s.item.count || 1}`) : 'E 暫放物品';
    if (s.type === 'plates') return `E ${game.held?.id === 'plate' ? '放回' : '拿取'}餐盤 · 剩 ${game.plates} 個`;
    if (s.type === 'serve') return game.level.mode === 'training' ? 'E 交給師傅驗收 · 不需要餐盤' : 'E 上菜 · 自動送至正確桌次';
    if (s.type === 'trash') return 'E 丟棄食材／清空餐盤';
    if (s.type === 'juice') return s.item ? `E 拿起${ITEMS[s.item.id].name}` : s.ingredients.length === 3 ? '空手按住 F 調配約 2 秒 · E 拿回材料' : s.ingredients.length ? `已放 ${s.ingredients.length} 項 · E 加料或拿回上一項` : 'E 放入檸檬片或脆梅、糖漿、冰塊';
    const w = game.woks[s.id];
    if (w.state === 'empty') return 'E 加入食材';
    if (w.state === 'loading') return HotStirFry.recipeFor(w.ingredients, game.level.menu) ? `F 炒 ${portionsFor(w.ingredients)} 份 · E 加料（最多 3 份）` : game.missingIngredients(s.id) + ' · E 加料／空手按住 F 清空';
    if (w.state === 'ready') return `剩 ${w.remaining} 份 · 拿空盤按 E 盛 1 份！`;
    if (w.state === 'burned') return '空手按住 F 清理燒焦炒鍋';
    return w.flipped ? '翻炒完成，等待起鍋' : `F 翻炒 · 在進度 ${flipWindowText(game.mods)} 時操作`;
  }
  function updateHUD() {
    const labels = { prep:'備料時間', service:'營業中', closing:'最後出菜', ended:'今晚打烊' };
    $('phase-label').textContent = labels[game.phase]; const time = Math.ceil(Math.max(0, game.time)); $('clock').textContent = `${String(Math.floor(time/60)).padStart(2,'0')}:${String(time%60).padStart(2,'0')}`;
    $('revenue').textContent = game.revenue.toLocaleString(); $('served').innerHTML = `${game.served} <span class="unit">道</span>`; $('satisfaction').innerHTML = `${game.satisfaction}<span class="unit">%</span>`;
    $('held-label').textContent = game.held ? '手上拿著：' + ITEMS[game.held.id].name + ` ×${game.held.count || 1}` : '雙手空空';
    $('phase-note').textContent = { prep:'先切點青菜，讓第一道菜快點上桌。', service:'大火快炒，慢慢也能熟能生巧。', closing:'不接新單了，把最後幾道菜送上桌。', ended:'謝謝招待，明天見！' }[game.phase];
    $('open-early').classList.toggle('hidden', game.phase !== 'prep');
    $('order-count').textContent = `${game.orders.length} / ${game.level.maxOrders}`;
    $('orders').innerHTML = game.orders.map(o => { const r = RECIPES[o.recipe]; return `<article class="order ${o.remaining < 20 ? 'urgent' : ''}"><div class="order-head"><span>第 ${o.table} 桌 · #${String(o.id).padStart(2,'0')}</span><b>$${r.price}</b></div><h3>${r.name}</h3><p>${r.ingredients.map(i => ITEMS[i].name).join(' ＋ ')}</p><div class="order-bottom"><span>${o.remaining < 20 ? '客人等得有點急了' : '客人耐心'}</span><span>${Math.ceil(o.remaining)} 秒</span></div><div class="progress-track"><i style="width:${Math.max(0,o.remaining/o.total*100)}%"></i></div></article>`; }).join('') || `<div class="empty-orders">${game.phase === 'prep' ? '客人還沒到<br>先準備一些切好的食材吧。' : '目前沒有待做的菜<br>趁現在整理一下廚房。'}</div>`;
    const woks = Object.values(game.woks);
    $('tip').textContent = woks.some(w => w.state === 'ready') ? '餐盤架在炒爐下方。拿空盤，回到完成的鍋按 E 盛裝，再送到右側出餐口。' : woks.some(w => w.state === 'cooking') ? `每口鍋獨立計時。看下方鍋況，在 ${flipWindowText(game.mods)} 進度回來按 F 翻炒，品質獎勵 +${Math.round(game.mods.qualityBonus * 100)}%。` : '青菜、蔥、牛肉和雞肉要先切。雞蛋、白飯、九層塔與三杯醬可直接下鍋。';
    $('wok-status').innerHTML = Object.entries(game.woks).map(([id, w], i) => {
      const dish = w.recipe ? RECIPES[w.recipe].name : '';
      let state = '空鍋 · 等待食材';
      if (w.state === 'loading') state = HotStirFry.recipeFor(w.ingredients, game.level.menu) ? `${game.missingIngredients(id)} · F 開火` : game.missingIngredients(id);
      if (w.state === 'cooking') { const p = w.elapsed/cookDuration(w); state = `${dish} ×${w.portions} · ${Math.ceil(cookDuration(w)-w.elapsed)} 秒${w.flipped ? ' · 已翻炒' : p >= game.mods.flipStart && p <= game.mods.flipEnd ? ' · F 翻炒！' : ''}`; }
      if (w.state === 'ready') state = `${dish} · 剩 ${w.remaining} 份 · ${Math.ceil(game.mods.burnTime-w.readyTime)} 秒內盛裝！`;
      if (w.state === 'burned') state = '燒焦 · 空手按住 F 清鍋';
      return `<div class="wok-chip ${w.state}"><b>${i+1} 號鍋</b><span>${state}</span></div>`;
    }).join('');
    if (game.level.mode === 'training') {
      const total = game.level.goals.reduce((sum, goal) => sum + goal.count, 0);
      $('served').innerHTML = `${game.served} <span class="unit">份</span>`;
      $('phase-label').textContent = game.level.phaseLabel; $('clock').textContent = '不限時';
      $('phase-note').textContent = game.level.phaseNote;
      $('order-count').textContent = `${game.served} / ${total} 份`;
      $('orders').innerHTML = game.level.goals.map(g => `<article class="order"><h3>${ITEMS[g.id].name}</h3><p>已驗收 ${game.delivered[g.id] || 0} / ${g.count} 份</p></article>`).join('');
      $('tip').textContent = game.level.tip;
    }
  }
  function finish() {
    ended = true; keys.clear(); $('pause').disabled = true;
    const stars = game.level.mode === 'training' ? 3 : starCount(game.revenue, game.level);
    const record = session.kind === 'standard' ? progress.record(game.level.id, game.revenue, stars) : null;
    $('stars').textContent = '★'.repeat(stars) + '☆'.repeat(3-stars);
    $('result-level').textContent = game.level.name + ' · 營業結算';
    $('result-message').textContent = stars >= 2 ? '巷口飄著鍋氣，客人帶著笑意回家。' : stars === 1 ? '成功站穩腳步，下一晚再挑戰更高營收。' : `辛苦了！再挑戰一次，營收達 $${game.level.stars[0]} 就能拿到第一顆星。`;
    $('result-stats').innerHTML = [['今晚收入', '$'+game.revenue],['成功上菜',game.served+' 道'],['逾時訂單',game.expired+' 道'],['客人滿意度',game.satisfaction+'%'],['成功翻炒',game.flips+' 次'],['燒焦 / 丟棄',game.burned+' / '+game.wasted+' 次']].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
    if (record) $('best-record').textContent = `本關最佳 $${record.revenue} · 最佳 ${record.stars} 星 · 完成 ${record.runs} 次`;
    if (game.level.mode === 'training') {
      $('result-level').textContent = game.level.resultTitle; $('result-message').textContent = game.level.resultMessage;
      $('result-stats').innerHTML = `<p>${goalText(game.level)}，驗收完成。</p>`;
      $('best-record').textContent = `已完成 ${record.runs} 次 · 三星結業`;
    }
    if (session.kind === 'chef') {
      const row = careerSave.record(game.level.id, session.chef, game.revenue, stars);
      $('best-record').textContent = `主廚卡紀錄 $${row.revenue} · 最佳 ${row.stars} 星 · 完成 ${row.runs} 次（${row.chef.nickname}）· 標準紀錄不變`;
    }
    const next = session.kind === 'exam' ? null : nextLevel();
    $('next-level').classList.toggle('hidden', !next && session.kind !== 'exam');
    $('restart').classList.toggle('hidden', session.kind === 'exam');
    if (next) $('next-level').textContent = `挑戰「${next.name}」 →`;
    if (session.kind === 'exam') {
      const result = Career.settleExam(careerSave.run, session.examId, game.revenue, stars);
      careerSave.save();
      $('result-level').textContent = '結業考 · 營業結算';
      $('result-message').textContent = result ? `結業稱號「${result.title}」，全能力 +${result.bonus}。去看看你的主廚卡吧！` : '這場結業考已經結算過了。';
      $('best-record').textContent = '結業考成績不列入營業紀錄。';
      $('next-level').textContent = '查看主廚卡 →';
    }
    $('welcome').classList.add('hidden'); $('paused').classList.add('hidden'); $('results').classList.remove('hidden'); $('overlay').classList.remove('hidden'); sound('serve'); updateHUD(); (next || session.kind === 'exam' ? $('next-level') : $('restart')).focus();
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
