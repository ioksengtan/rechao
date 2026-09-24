(function (root) {
  'use strict';
  const ITEMS = {
    greens: { name: '青菜', kind: 'greens', processed: 'choppedGreens' }, choppedGreens: { name: '切好的青菜', kind: 'greens', chopped: true },
    scallion: { name: '蔥', kind: 'scallion', processed: 'choppedScallion' }, choppedScallion: { name: '切好的蔥', kind: 'scallion', chopped: true },
    beef: { name: '牛肉', kind: 'beef', processed: 'choppedBeef' }, choppedBeef: { name: '牛肉片', kind: 'beef', chopped: true },
    chicken: { name: '雞肉', kind: 'chicken', processed: 'choppedChicken' }, choppedChicken: { name: '雞肉塊', kind: 'chicken', chopped: true },
    basil: { name: '九層塔', kind: 'basil', boardMessage: '九層塔不用切，直接交給師傅。' },
    sauce: { name: '三杯醬', kind: 'sauce', boardMessage: '醬料不用切。' }, soy: { name: '醬油', kind: 'soy', boardMessage: '醬料不用切。' },
    egg: { name: '雞蛋', kind: 'egg' }, rice: { name: '白飯', kind: 'rice' }, plate: { name: '乾淨餐盤', kind: 'plate' },
    lemon: { name: '檸檬片', kind: 'lemon' }, syrup: { name: '糖漿', kind: 'syrup' }, ice: { name: '冰塊', kind: 'ice' }, plum: { name: '脆梅', kind: 'plum' },
    lemonJuice: { name: '冰檸檬汁', kind: 'juice', drink: 'lemon' }, plumJuice: { name: '冰梅子汁', kind: 'juice', drink: 'plum' },
    saucePortion: { name: '三杯醬', kind: 'sauce', portion: true, spoons: 2, cc: 30, boardMessage: '醬料不用切。' },
    soyPortion: { name: '醬油', kind: 'soy', portion: true, spoons: 1, cc: 15, boardMessage: '醬料不用切。' },
    greensDish: { name: '清炒青菜', kind: 'dish', recipe: 'greens' }, riceDish: { name: '黃金蛋炒飯', kind: 'dish', recipe: 'rice' },
    beefDish: { name: '蔥爆牛肉', kind: 'dish', recipe: 'beef' }, chickenDish: { name: '三杯雞', kind: 'dish', recipe: 'chicken' },
    onionEggDish: { name: '蔥花蛋', kind: 'dish', recipe: 'onionEgg' }
  };
  const RECIPES = {
    greens: { name: '清炒青菜', ingredients: ['choppedGreens'], cookTime: 5, price: 80, patience: 75, dish: 'greensDish' },
    rice: { name: '黃金蛋炒飯', ingredients: ['choppedScallion', 'egg', 'rice'], cookTime: 7, price: 120, patience: 90, dish: 'riceDish' },
    beef: { name: '蔥爆牛肉', ingredients: ['choppedBeef', 'choppedScallion'], cookTime: 8, price: 180, patience: 105, dish: 'beefDish' },
    chicken: { name: '三杯雞', ingredients: ['choppedChicken', 'basil', 'sauce'], cookTime: 10, price: 220, patience: 120, dish: 'chickenDish' },
    onionEgg: { name: '蔥花蛋', ingredients: ['choppedScallion', 'egg', 'soy'], cookTime: 6, price: 100, patience: 85, dish: 'onionEggDish' }
  };
  const LEVELS = [
    { id: 'opening', course: 'service', name: '第一晚開張', subtitle: '先學一手好菜', description: '兩道經典、一口炒鍋。從切料到上菜，找到自己的節奏。', menu: ['greens', 'rice'], woks: 1, prepTime: 20, serviceTime: 180, closingTime: 45, maxOrders: 2, orderInterval: 18, plateCount: 4, stars: [160, 450, 900], firstOrders: ['greens', 'rice'] },
    { id: 'rush', course: 'service', name: '晚餐尖峰', subtitle: '雙鍋開火的考驗', description: '加入蔥爆牛肉與第二口炒鍋。備好料，再輪流照顧兩鍋。', menu: ['greens', 'rice', 'beef'], woks: 2, prepTime: 25, serviceTime: 180, closingTime: 45, maxOrders: 3, orderInterval: 16, plateCount: 5, stars: [320, 800, 1350], firstOrders: ['beef', 'greens'] },
    { id: 'friday', course: 'service', name: '滿座週五夜', subtitle: '今晚，四道拿手菜', description: '三杯雞壓軸登場！三張訂單同時催菜，安排好每一鍋的火候。', menu: ['greens', 'rice', 'beef', 'chicken'], woks: 2, prepTime: 30, serviceTime: 180, closingTime: 45, maxOrders: 3, orderInterval: 14, plateCount: 6, stars: [450, 1050, 1700], firstOrders: ['chicken', 'beef', 'greens'] }
  ];
  function lesson(spec) {
    return Object.assign({
      mode: 'training', menu: [], woks: 0, prepTime: 0, serviceTime: 0, closingTime: 0, maxOrders: 0, orderInterval: 0, plateCount: 0, stars: [], firstOrders: [],
      stepLabel: '3 個步驟', ordersSubtitle: '交到右側驗收檯，不需要盤子。'
    }, spec);
  }
  LEVELS.push(lesson({
    id: 'prep-school', course: 'prep', name: '開店前的備料課', subtitle: '認識砧板與批次切料', description: '阿明：慢慢來！拿取食材，放上砧板，空手按住 F 切好，再送到右側驗收檯。',
    menu: ['greens', 'rice'], stations: ['greens', 'scallion', 'board', 'counter', 'serve', 'trash'], goals: [{ id: 'choppedGreens', count: 3 }, { id: 'choppedScallion', count: 2 }],
    card: '不限時 · 切料與批次處理', timing: '不限時 · 無客人催單 · 完成清單即可過關',
    toast: '阿明：先 E 拿青菜，放砧板後空手按住 F。切好送到右側驗收檯！',
    steps: '① E 拿青菜或蔥，E 放上砧板。可重複加入同種食材，最多 3 份。<br>② 空手按住 F 切好，再按 E 整批拿起。<br>③ 到右側驗收檯按 E 交付。備料檯可以暫存或交換物品。',
    tip: '同種食材可一起切，最多 3 份。按 E 交付時只收需要的份數，多的留在手上。',
    phaseLabel: '備料練習', phaseNote: '阿明：不趕時間，先認識食材與砧板。', ordersTitle: '備料清單', ordersSubtitle: '切好後交到右側驗收檯，不需要盤子。',
    resultTitle: '備料課完成', resultMessage: '阿明：食材都備好了！接下來可以挑戰第一晚開張。',
    reject: '阿明：請交切好的青菜或蔥，生食材要先到砧板處理。'
  }));
  LEVELS.push(lesson({
    id: 'spice-school', course: 'spices', name: '香氣提味課', subtitle: '哪種香料要切，哪種不用', description: '阿明：蔥要切碎才香，九層塔整把交就好。切錯了沒關係，丟掉再拿。',
    stations: ['scallion', 'basil', 'board', 'counter', 'serve', 'trash'], goals: [{ id: 'choppedScallion', count: 2 }, { id: 'basil', count: 3 }],
    card: '不限時 · 切蔥、九層塔直接交', timing: '不限時 · 無客人催單 · 完成清單即可過關',
    toast: '阿明：蔥放砧板按住 F；九層塔不用切，直接交給師傅！',
    steps: '① 蔥放到砧板，空手按住 F 切好，最多 3 份。<br>② 九層塔不用切，直接拿到驗收檯。<br>③ 九層塔放上砧板會被退回。備料檯可以暫存或交換。',
    tip: '九層塔不用切，直接交給師傅。生蔥要先切好才算數。',
    phaseLabel: '香氣練習', phaseNote: '阿明：先分辨哪種香氣要切、哪種可以直接交。', ordersTitle: '香氣清單',
    resultTitle: '香氣提味課完成', resultMessage: '阿明：香氣都備好了！接下來可以挑戰第一晚開張。',
    reject: '阿明：請交切好的蔥或九層塔。生蔥要先切，九層塔不用切。'
  }));
  LEVELS.push(lesson({
    id: 'sauce-school', course: 'sauces', name: '醬料入味課', subtitle: '量好大匙再交付', description: '阿明：三杯醬量 2 大匙，醬油量 1 大匙。瓶子不要放砧板，也不能直接交。',
    stations: ['sauce', 'soy', 'counter', 'serve', 'trash'], goals: [{ id: 'saucePortion', count: 2 }, { id: 'soyPortion', count: 3 }],
    measure: 'sauce',
    card: '不限時 · 量匙後交付', timing: '不限時 · 無客人催單 · 完成清單即可過關',
    toast: '阿明：先拿瓶子，在量杯區一匙一匙量，量好再交到驗收檯！',
    steps: '① E 拿三杯醬或醬油瓶子。<br>② 到量杯區按 E 或 F，一次加 1 大匙。三杯醬 2 大匙（約 30 cc），醬油 1 大匙（約 15 cc）。<br>③ 匙數剛好再按 E 拿起那一份，交到驗收檯。再按 F 會超量；超量不能拿，到廚餘桶倒掉，不會自動改成剛好。',
    tip: '三杯醬交 2 份，每份 2 大匙。醬油交 3 份，每份 1 大匙。瓶子不能直接交。',
    phaseLabel: '醬料練習', phaseNote: '阿明：先量準大匙，再交給師傅。', ordersTitle: '醬料清單', ordersSubtitle: '量好後交到右側驗收檯，不需要盤子。',
    resultTitle: '醬料入味課完成', resultMessage: '阿明：醬料都量好了！接下來可以挑戰第一晚開張。',
    reject: '阿明：請交量好的三杯醬或醬油。瓶子要先在量杯區量過。'
  }));
  LEVELS.push(lesson({
    id: 'juice-school', course: 'juice', name: '開店前的果汁課', subtitle: '照片數、cc、塊數調一杯', description: '阿明：檸檬汁是檸檬 2 片、糖漿 30 cc、冰塊 3 塊。梅子汁是脆梅 2 顆、糖漿 25 cc、冰塊 3 塊。',
    stations: ['lemon', 'syrup', 'ice', 'plum', 'juice-bar', 'counter', 'serve', 'trash'], goals: [{ id: 'lemonJuice', count: 2 }, { id: 'plumJuice', count: 1 }],
    measure: 'juice',
    card: '不限時 · 細量後調配', timing: '不限時 · 無客人催單 · 完成清單即可過關',
    toast: '阿明：拿著材料在果汁台按 E 一點一點倒，份量到了放下來按住 F！',
    steps: '① 冰檸檬汁：檸檬 2 片、糖漿 30 cc、冰塊 3 塊。冰梅子汁：脆梅 2 顆、糖漿 25 cc、冰塊 3 塊。糖漿可以 ±5 cc。<br>② 一次一杯。E 拿材料，在果汁台每按一次 E：片、顆、塊 +1，糖漿 +5 cc。下方會顯示進度。<br>③ 份量到了，放下材料，空手按住 F 約兩秒，再把杯子交到驗收檯。倒太多不能調，空手 E 倒回，或到廚餘桶清空。',
    tip: '冰檸檬汁 2 杯、冰梅子汁 1 杯。糖漿每次倒 5 cc。片數和冰塊要剛好。',
    phaseLabel: '果汁練習', phaseNote: '阿明：照片數、cc、塊數調好再交，不趕時間。', ordersTitle: '果汁清單', ordersSubtitle: '調好後交到右側驗收檯，不需要餐盤。',
    resultTitle: '果汁課完成', resultMessage: '阿明：飲料都準備好了！接下來可以挑戰第一晚開張。',
    reject: '阿明：請交調好的冰檸檬汁或冰梅子汁。'
  }));
  LEVELS.push({ id: 'lunch', course: 'service', name: '午休小局', subtitle: '通勤一局，十分鐘內打烊', description: '菜單跟第一晚一樣，但時間更短。適合手機上快速打一局。', menu: ['greens', 'rice'], woks: 1, prepTime: 10, serviceTime: 90, closingTime: 30, maxOrders: 2, orderInterval: 14, plateCount: 4, stars: [80, 200, 450], firstOrders: ['greens', 'rice'] });
  LEVELS.push({ id: 'afternoon', course: 'service', name: '午後來一杯', subtitle: '飲料上桌，蔥花蛋也要', description: '練習把果汁和醬油炒菜一起出。青菜救急，蔥花蛋要用醬油，兩種冰飲在果汁調配台調。', menu: ['greens', 'onionEgg', 'lemonJuice', 'plumJuice'], woks: 1, prepTime: 12, serviceTime: 100, closingTime: 30, maxOrders: 2, orderInterval: 15, plateCount: 4, stars: [100, 280, 520], firstOrders: ['onionEgg', 'lemonJuice'] });
  const STATIONS = [
    { id: 'greens', type: 'supply', supply: 'greens', x: 1, y: 1, name: '青菜箱' },
    { id: 'egg', type: 'supply', supply: 'egg', x: 3, y: 1, name: '雞蛋箱' },
    { id: 'scallion', type: 'supply', supply: 'scallion', x: 5, y: 1, name: '青蔥箱' },
    { id: 'rice', type: 'supply', supply: 'rice', x: 7, y: 1, name: '飯鍋' },
    { id: 'beef', type: 'supply', supply: 'beef', x: 9, y: 1, name: '牛肉箱' },
    { id: 'chicken', type: 'supply', supply: 'chicken', x: 11, y: 1, name: '雞肉箱' },
    { id: 'basil', type: 'supply', supply: 'basil', x: 13, y: 1, name: '九層塔' },
    { id: 'sauce', type: 'supply', supply: 'sauce', x: 14, y: 3, name: '三杯醬' },
    { id: 'soy', type: 'supply', supply: 'soy', x: 12, y: 3, name: '醬油', training: true },
    { id: 'lemon', type: 'supply', supply: 'lemon', x: 1, y: 1, name: '檸檬片', training: true },
    { id: 'syrup', type: 'supply', supply: 'syrup', x: 3, y: 1, name: '糖漿', training: true },
    { id: 'ice', type: 'supply', supply: 'ice', x: 5, y: 1, name: '冰塊', training: true },
    { id: 'plum', type: 'supply', supply: 'plum', x: 9, y: 1, name: '脆梅', training: true },
    { id: 'juice-bar', type: 'juice', x: 4, y: 4, name: '果汁調配台', training: true },
    { id: 'board', type: 'board', x: 4, y: 4, name: '切料砧板' },
    { id: 'board2', type: 'board', x: 4, y: 6, name: '第二砧板', advanced: true },
    { id: 'counter', type: 'counter', x: 7, y: 4, name: '備料檯' },
    { id: 'counter2', type: 'counter', x: 1, y: 4, name: '備料檯 2', advanced: true },
    { id: 'wok', type: 'wok', x: 10, y: 4, name: '一號炒爐' },
    { id: 'wok2', type: 'wok', x: 12, y: 4, name: '二號炒爐', advanced: true },
    { id: 'plates', type: 'plates', x: 10, y: 7, name: '餐盤架' },
    { id: 'serve', type: 'serve', x: 14, y: 6, name: '出餐口' },
    { id: 'trash', type: 'trash', x: 7, y: 8, name: '廚餘桶' }
  ];
  const portionsFor = ingredients => Math.max(0, ...ingredients.map(id => ingredients.filter(i => i === id).length));
  const wokMenu = menu => menu.filter(key => RECIPES[key]);
  function recipeFor(ingredients, menu = Object.keys(RECIPES)) {
    const n = portionsFor(ingredients);
    return n >= 1 && n <= 3 ? wokMenu(menu).find(key => ingredients.length === RECIPES[key].ingredients.length * n && RECIPES[key].ingredients.every(id => ingredients.filter(i => i === id).length === n)) : undefined;
  }
  function canAdd(ingredients, id, menu = Object.keys(RECIPES)) {
    const proposed = [...ingredients, id];
    return portionsFor(proposed) <= 3 && wokMenu(menu).some(key => proposed.every(i => RECIPES[key].ingredients.includes(i)));
  }
  const cookDuration = w => RECIPES[w.recipe].cookTime * (1 + .4 * ((w.portions || 1) - 1));
  // Chef stats run 0–100; one conversion keeps the kitchen, HUD and art in agreement.
  const CHEF_STATS = ['knife', 'heat', 'season', 'charm', 'control'];
  function getChefModifiers(chef) {
    const stat = key => Math.min(100, Math.max(0, Number(chef?.stats?.[key]) || 0)) / 100;
    return {
      chopTime: 2 * (1 - .3 * stat('knife')),
      flipStart: .4 - .1 * stat('heat'), flipEnd: .85 + .05 * stat('heat'),
      qualityBonus: .1 + .1 * stat('season'),
      patience: 1 + .2 * stat('charm'),
      burnTime: 8 + 4 * stat('control')
    };
  }
  const BASE_MODIFIERS = getChefModifiers(null);
  const chopDuration = (item, mods = BASE_MODIFIERS) => mods.chopTime * (1 + .4 * ((item?.count || 1) - 1));
  const MIX_TIME = 2;
  const flipWindowText = mods => `${Math.round(mods.flipStart * 100)}%～${Math.round(mods.flipEnd * 100)}%`;
  const JUICE_RECIPES = { lemonJuice: ['lemon', 'syrup', 'ice'], plumJuice: ['plum', 'syrup', 'ice'] };
  const DRINKS = {
    lemonJuice: { name: '冰檸檬汁', ingredients: JUICE_RECIPES.lemonJuice, price: 70, patience: 70 },
    plumJuice: { name: '冰梅子汁', ingredients: JUICE_RECIPES.plumJuice, price: 70, patience: 70 }
  };
  function menuOffer(key) {
    if (RECIPES[key]) return { key, kind: 'dish', ...RECIPES[key] };
    const drink = DRINKS[key];
    return drink ? { key, kind: 'drink', name: drink.name, ingredients: drink.ingredients, price: drink.price, patience: drink.patience } : null;
  }
  const juiceRecipe = ingredients => Object.keys(JUICE_RECIPES).find(key => ingredients.length === JUICE_RECIPES[key].length && JUICE_RECIPES[key].every(id => ingredients.includes(id)));
  const juicePossible = ingredients => ingredients.length <= 3 && new Set(ingredients).size === ingredients.length && Object.values(JUICE_RECIPES).some(recipe => ingredients.every(id => recipe.includes(id)));
  // Training juice pours in 5 cc steps so the ±5 cc syrup band is one pour either way.
  // Service nights keep the coarse one-of-each recipe above and never read these targets.
  const SYRUP_STEP_CC = 5, SYRUP_TOLERANCE_CC = 5;
  const JUICE_PARTS = ['lemon', 'plum', 'syrup', 'ice'];
  const TRAINING_JUICE = {
    lemonJuice: { lemon: 2, syrup: 30, ice: 3 },
    plumJuice: { plum: 2, syrup: 25, ice: 3 }
  };
  const JUICE_PART_LABEL = { lemon: ['檸檬', '片'], plum: ['脆梅', '顆'], syrup: ['糖漿', 'cc'], ice: ['冰塊', '塊'] };
  const SAUCE_SPOONS = { sauce: 2, soy: 1 };
  const SAUCE_CC = { sauce: 30, soy: 15 };
  const emptyJuiceMix = () => ({ lemon: 0, plum: 0, syrup: 0, ice: 0 });
  const juiceTolerance = id => id === 'syrup' ? SYRUP_TOLERANCE_CC : 0;
  function measuredJuiceMatch(mix) {
    if (!mix) return null;
    return Object.keys(TRAINING_JUICE).find(key => JUICE_PARTS.every(id => Math.abs((mix[id] || 0) - (TRAINING_JUICE[key][id] || 0)) <= juiceTolerance(id))) || null;
  }
  function juiceStillPossible(mix, key) {
    const target = TRAINING_JUICE[key];
    if ((mix.lemon || 0) > 0 && key === 'plumJuice') return false;
    if ((mix.plum || 0) > 0 && key === 'lemonJuice') return false;
    return JUICE_PARTS.every(id => (mix[id] || 0) <= (target[id] || 0) + juiceTolerance(id));
  }
  function juiceOvershot(mix) {
    if (!mix || !JUICE_PARTS.some(id => (mix[id] || 0) > 0)) return false;
    return !measuredJuiceMatch(mix) && !Object.keys(TRAINING_JUICE).some(key => juiceStillPossible(mix, key));
  }
  function juiceMeasureLines(mix) {
    const safe = mix || emptyJuiceMix();
    const matched = measuredJuiceMatch(safe);
    const viable = Object.keys(TRAINING_JUICE).filter(key => juiceStillPossible(safe, key));
    const keys = matched ? [matched] : viable.length ? viable : Object.keys(TRAINING_JUICE);
    return keys.map(key => {
      const bits = Object.entries(TRAINING_JUICE[key]).map(([id, want]) => `${JUICE_PART_LABEL[id][0]} ${safe[id] || 0}／${want} ${JUICE_PART_LABEL[id][1]}`);
      const over = !matched && !viable.includes(key);
      return `${DRINKS[key].name}　${bits.join(' · ')}${over ? ' · 超過' : ''}`;
    });
  }
  function juiceTargetText(key) {
    const target = TRAINING_JUICE[key];
    if (!target) return '';
    return Object.entries(target).map(([id, want]) => `${JUICE_PART_LABEL[id][0]} ${want} ${JUICE_PART_LABEL[id][1]}`).join(' · ');
  }
  function sauceMeasureLine(cup) {
    if (!cup?.spoons || !cup.sauceId) return '量杯區　三杯醬 0／2 大匙（約 30 cc） · 醬油 0／1 大匙（約 15 cc）';
    const name = ITEMS[cup.sauceId].name, target = SAUCE_SPOONS[cup.sauceId];
    return `${name}　${cup.spoons}／${target} 大匙（約 ${SAUCE_CC[cup.sauceId]} cc）`;
  }
  const emptyWok = () => ({ state: 'empty', ingredients: [], portions: 0, remaining: 0, elapsed: 0, recipe: null, flipped: false, readyTime: 0, clearProgress: 0 });
  // Lesson juice crates share the top row, and that lesson's juice bar stands where the cutting board is.
  // A service night that needs both keeps the board at (4, 4) and moves juice gear onto spots this menu leaves empty.
  const SERVICE_JUICE_LAYOUT = {
    lemon: { x: 7, y: 1 }, syrup: { x: 9, y: 1 }, ice: { x: 11, y: 1 }, plum: { x: 13, y: 1 }, 'juice-bar': { x: 4, y: 6 }
  };
  function getStations(level) {
    if (level.mode === 'training') return STATIONS.filter(s => level.stations.includes(s.id)).map(s => ({
      ...s,
      name: s.id === 'serve' ? '驗收檯' : level.measure === 'sauce' && s.id === 'counter' ? '量杯區' : s.name,
      item: null, progress: 0,
      ...(s.type === 'juice' ? (level.measure === 'juice' ? { ingredients: [], mix: emptyJuiceMix(), pours: [] } : { ingredients: [] }) : {}),
      ...(level.measure === 'sauce' && s.id === 'counter' ? { spoons: 0, sauceId: null } : {})
    }));
    const ingredients = new Set(level.menu.flatMap(key => menuOffer(key)?.ingredients || []));
    const needsJuice = level.menu.some(key => DRINKS[key]);
    return STATIONS.filter(s => {
      if (s.advanced && !(level.woks > 1)) return false;
      if (s.type === 'juice') return needsJuice;
      if (s.type === 'supply') return ingredients.has(s.supply) || ingredients.has(ITEMS[s.supply].processed);
      return !s.training;
    }).map(s => ({ ...s, ...(needsJuice && SERVICE_JUICE_LAYOUT[s.id] || {}), item: null, progress: 0, ...(s.type === 'juice' ? { ingredients: [] } : {}) }));
  }
  function starCount(revenue, level) { return level.stars.filter(threshold => revenue >= threshold).length; }
  class Kitchen {
    constructor(random = Math.random, levelId = 'opening') { this.random = random; this.reset(levelId); }
    reset(levelId = this.level?.id || 'opening', chef = this.chef ?? null) {
      this.level = LEVELS.find(l => l.id === levelId) || LEVELS[0];
      // Lessons use standard rules unless a career quiz or exam brings the trainee's stats.
      this.chef = chef; this.mods = getChefModifiers(this.level.mode === 'training' && !chef?.exam ? null : chef); this.clock = 0;
      this.phase = this.level.mode === 'training' ? 'training' : 'prep'; this.delivered = {}; this.time = this.level.prepTime; this.paused = false; this.held = null;
      this.stations = getStations(this.level);
      this.woks = Object.fromEntries(this.stations.filter(s => s.type === 'wok').map(s => [s.id, emptyWok()]));
      this.orders = []; this.nextId = 1; this.spawnTime = this.level.orderInterval; this.spawnIndex = 0; this.plates = this.level.plateCount; this.returns = [];
      this.orderBag = [];
      this.revenue = 0; this.served = 0; this.expired = 0; this.burned = 0; this.wasted = 0; this.flips = 0; this.events = [];
    }
    get wok() { return this.woks.wok; }
    get satisfaction() { return Math.max(0, 100 - this.expired * 12); }
    message(text, sound = 'tap') { this.events.push({ text, sound }); if (this.events.length > 50) this.events.shift(); }
    startService() { if (this.phase !== 'prep' || this.paused) return; this.phase = 'service'; this.time = this.level.serviceTime; this.level.firstOrders.forEach(key => this.addOrder(key)); this.message('開店啦！第一批客人來了。', 'order'); }
    addOrder(recipe) {
      if (this.level.mode === 'training') return;
      if (this.phase === 'closing' || this.phase === 'ended' || this.orders.length >= this.level.maxOrders) return;
      if (recipe && !this.level.menu.includes(recipe)) return;
      if (!recipe && !this.orderBag.length) {
        this.orderBag = [...this.level.menu];
        for (let i = this.orderBag.length - 1; i > 0; i--) { const j = Math.min(i, Math.max(0, Math.floor(this.random() * (i + 1)))); [this.orderBag[i], this.orderBag[j]] = [this.orderBag[j], this.orderBag[i]]; }
      }
      const key = recipe || this.orderBag.pop(), offer = menuOffer(key);
      if (!offer) return;
      const patience = Math.round(offer.patience * this.mods.patience);
      this.orders.push({ id: this.nextId++, table: this.spawnIndex++ % 3 + 1, recipe: key, remaining: patience, total: patience });
    }
    interact(id) {
      if (this.paused || this.phase === 'ended') return;
      const s = this.stations.find(s => s.id === id); if (!s) return;
      if (s.type === 'supply') {
        if (this.held?.bottle && this.held.id === s.supply) { this.held = null; this.message('瓶子放回去了。'); return; }
        if (this.held?.source && this.held.id === s.supply) { this.held = null; this.message(ITEMS[s.supply].name + '放回去了。'); return; }
        if (this.held) return this.message('先把手上的東西放下。');
        const held = { id: s.supply };
        if (this.level.measure === 'juice' && JUICE_PARTS.includes(s.supply)) held.source = true;
        if (this.level.measure === 'sauce' && SAUCE_SPOONS[s.supply]) held.bottle = true;
        this.held = held;
        this.message(held.bottle ? '拿到了' + ITEMS[s.supply].name + '瓶子，到量杯區量。' : held.source ? '拿到了' + ITEMS[s.supply].name + '，到果汁台按 E 倒。' : '拿到了' + ITEMS[s.supply].name);
      } else if (s.type === 'counter' && this.level.measure === 'sauce') this.interactMeasure(s);
      else if (s.type === 'board' || s.type === 'counter') {
        if (!this.held && s.item) { this.held = s.item; s.item = null; s.progress = 0; this.message('拿起' + ITEMS[this.held.id].name); }
        else if (this.held && !s.item) {
          if (s.type === 'board' && !ITEMS[this.held.id].processed && !ITEMS[this.held.id].chopped) return this.message(this.level.mode === 'training' && ITEMS[this.held.id].boardMessage || '砧板只放需要切的蔬菜或肉類，其他物品可放備料檯。');
          s.item = this.held; this.held = null; s.progress = 0; this.message(s.type === 'board' ? '放上砧板，空手按住 F 切料。' : '放到備料檯了。');
        } else if (this.held && s.item && s.type === 'counter') {
          [this.held, s.item] = [s.item, this.held];
          this.message('已交換手上與備料檯的物品。');
        } else if (this.held && s.item && s.type === 'board' && this.held.id === s.item.id && ITEMS[s.item.id].processed) {
          const count = (s.item.count || 1) + (this.held.count || 1);
          if (count > 3) return this.message('砧板最多放 3 份同一種食材。');
          s.item.count = count; this.held = null; s.progress = 0;
          this.message(`砧板共 ${count} 份，空手按住 F 一起切；加料後重新計時。`);
        } else this.message(s.item ? '這裡已經有東西了。' : '手上有食材時，按 E 放上來。');
      } else if (s.type === 'plates') {
        if (this.held?.id === 'plate') { this.plates++; this.held = null; this.message('餐盤放回架上。'); }
        else if (this.held) this.message('先把手上的東西放下。');
        else if (this.plates) { this.plates--; this.held = { id: 'plate' }; this.message('拿好餐盤，到炒爐按 E 盛裝。'); }
        else this.message('餐盤還在回收中，稍等一下。');
      } else if (s.type === 'wok') this.interactWok(s.id);
      else if (s.type === 'serve') this.serve();
      else if (s.type === 'juice') this.interactJuice(s);
      else if (s.type === 'trash') {
        if (!this.held) {
          if (this.clearTrainingMeasure()) return;
          return this.message('沒有需要丟棄的東西。');
        }
        if (this.held.id === 'plate') return this.message('餐盤可以放回餐盤架。');
        const dish = ITEMS[this.held.id].kind === 'dish'; this.held = dish ? { id: 'plate' } : null; this.wasted++; this.message('已清理，繼續加油。');
      }
    }
    interactWok(id = 'wok') {
      const w = this.woks[id];
      if (!w || this.paused || this.phase === 'ended') return;
      if (w.state === 'ready') {
        if (this.held?.id !== 'plate') return this.message('拿一個乾淨餐盤，再按 E 盛裝。');
        this.held = { id: RECIPES[w.recipe].dish, quality: w.flipped }; w.remaining--; if (w.remaining <= 0) this.clearWok(id); this.message('起鍋！送到右側出餐口吧。', 'done'); return;
      }
      if (w.state === 'burned') return this.message('空手按住 F 兩秒，清理燒焦的鍋。');
      if (w.state === 'cooking') return this.message('正在炒製，留意翻炒提示。');
      if (!this.held) return this.message(w.ingredients.length ? '材料備齊後按 F 開火；不需要的材料可按住 F 清空。' : '把切好的食材放進鍋裡。');
      if (!canAdd(w.ingredients, this.held.id, this.level.menu)) return this.message('同鍋最多 3 份同一道菜；食材須符合配方，蔬菜和肉要先切好。');
      const proposed = [...w.ingredients];
      for (let i = 0; i < (this.held.count || 1); i++) {
        if (!canAdd(proposed, this.held.id, this.level.menu)) return this.message('整批下鍋會超過 3 份，請放到另一口鍋或備料檯。');
        proposed.push(this.held.id);
      }
      w.ingredients = proposed; this.held = null; w.state = 'loading'; w.clearProgress = 0;
      this.message(recipeFor(w.ingredients, this.level.menu) ? `材料齊了，共 ${portionsFor(w.ingredients)} 份！F 開火，或繼續加料至 3 份。` : '已下料，可做：' + this.missingIngredients(id));
    }
    missingIngredients(id = 'wok') {
      const w = this.woks[id]; if (!w) return '';
      const n = portionsFor(w.ingredients);
      return this.level.menu.map(key => RECIPES[key]).filter(r => r && w.ingredients.every(i => r.ingredients.includes(i))).map(r => {
        const missing = r.ingredients.map(id => ({ id, count: n - w.ingredients.filter(i => i === id).length })).filter(i => i.count > 0);
        return `${r.name} ×${n}（${missing.length ? '缺' + missing.map(i => ITEMS[i.id].name + ' ×' + i.count).join('、') : '材料齊了'}）`;
      }).join(' 或 ');
    }
    clearWok(id = 'wok') { if (this.woks[id]) this.woks[id] = emptyWok(); }
    clearTrainingMeasure() {
      if (this.level.measure === 'sauce') {
        const cup = this.stations.find(st => st.id === 'counter');
        if (cup?.spoons > 0) { cup.spoons = 0; cup.sauceId = null; this.wasted++; this.message('量杯倒掉了，重新量。'); return true; }
      }
      if (this.level.measure === 'juice') {
        const bar = this.stations.find(st => st.type === 'juice');
        if (bar && JUICE_PARTS.some(id => (bar.mix?.[id] || 0) > 0)) {
          bar.mix = emptyJuiceMix(); bar.pours = []; bar.progress = 0; this.wasted++;
          this.message('果汁台清掉了，重新調。'); return true;
        }
      }
      return false;
    }
    addSpoon(s, id) {
      if (s.spoons > 0 && s.sauceId && s.sauceId !== id) return this.message('量杯裡是另一種醬，先到廚餘桶倒掉。');
      s.sauceId = id; s.spoons += 1;
      const target = SAUCE_SPOONS[id], name = ITEMS[id].name;
      if (s.spoons > target) this.message(`${name} ${s.spoons}／${target} 大匙，超過了，不能拿起來交付。到廚餘桶倒掉重來。`);
      else if (s.spoons === target) this.message(`${name}剛好 ${target} 大匙。按 E 拿起這一份；再按 F 會超量。`);
      else this.message(`${name} ${s.spoons}／${target} 大匙。`);
    }
    takePortion(s) {
      const portionId = s.sauceId === 'sauce' ? 'saucePortion' : 'soyPortion';
      this.held = { id: portionId }; s.spoons = 0; s.sauceId = null;
      this.message(`拿到量好的${ITEMS[portionId].name} ${ITEMS[portionId].spoons} 大匙，送到驗收檯。`, 'done');
    }
    interactMeasure(s) {
      if (this.held?.bottle) {
        if (s.spoons > 0 && s.sauceId && s.sauceId !== this.held.id) return this.message('量杯裡是另一種醬，先到廚餘桶倒掉。');
        if (s.sauceId === this.held.id && s.spoons === SAUCE_SPOONS[s.sauceId]) return this.takePortion(s);
        return this.addSpoon(s, this.held.id);
      }
      if (!this.held) {
        if (s.spoons > 0 && s.spoons === SAUCE_SPOONS[s.sauceId]) return this.takePortion(s);
        if (s.spoons > (SAUCE_SPOONS[s.sauceId] || 0)) return this.message(`現在是 ${s.spoons}／${SAUCE_SPOONS[s.sauceId]} 大匙，太多了。到廚餘桶倒掉，不會自動改成剛好。`);
        if (s.spoons > 0) return this.message(`現在是 ${s.spoons}／${SAUCE_SPOONS[s.sauceId]} 大匙，再加 ${SAUCE_SPOONS[s.sauceId] - s.spoons} 大匙。`);
        return this.message('先拿三杯醬或醬油，在這裡按 E 或 F 加 1 大匙。');
      }
      if (ITEMS[this.held.id].portion) return this.message('先把量好的醬交到驗收檯。');
      return this.message('量杯區只能量三杯醬和醬油。');
    }
    actionMeasure(s) {
      if (!s) return;
      if (!this.held?.bottle) return this.message('先拿三杯醬或醬油，再按 F 加 1 大匙。');
      if (s.spoons > 0 && s.sauceId && s.sauceId !== this.held.id) return this.message('量杯裡是另一種醬，先到廚餘桶倒掉。');
      this.addSpoon(s, this.held.id);
    }
    interactJuice(s) {
      if (this.level.measure === 'juice') return this.interactMeasuredJuice(s);
      if (s.item) {
        if (this.held) return this.message('先把手上的東西放下。');
        this.held = s.item; s.item = null; this.message('拿到了' + ITEMS[this.held.id].name); return;
      }
      if (this.held) {
        if ((this.held.count || 1) !== 1) return this.message('果汁台一次只放一份材料。');
        const next = [...s.ingredients, this.held.id];
        if (!juicePossible(next)) return this.message('這個組合調不出果汁，拿到廚餘桶清掉吧。');
        s.ingredients.push(this.held.id); const added = this.held.id; this.held = null; s.progress = 0;
        this.message(juiceRecipe(s.ingredients) ? '材料齊了，空手按住 F 調配。' : '加入了' + ITEMS[added].name + '。'); return;
      }
      if (!s.ingredients.length) return this.message('放入檸檬片或脆梅、糖漿和冰塊，一次一杯。');
      const id = s.ingredients.pop(); s.progress = 0; this.held = { id };
      this.message('拿回' + ITEMS[id].name + '，不需要就丟進廚餘桶。');
    }
    interactMeasuredJuice(s) {
      if (s.item) {
        if (this.held) return this.message('先把手上的東西放下。');
        this.held = s.item; s.item = null; this.message('拿到了' + ITEMS[this.held.id].name); return;
      }
      if (this.held?.source && JUICE_PARTS.includes(this.held.id)) {
        const id = this.held.id;
        if ((id === 'lemon' && s.mix.plum > 0) || (id === 'plum' && s.mix.lemon > 0)) return this.message('一次只調一種果汁。先倒回，或到廚餘桶清空。');
        const step = id === 'syrup' ? SYRUP_STEP_CC : 1;
        s.mix[id] += step; s.pours.push(id); s.progress = 0;
        const unit = id === 'syrup' ? `${step} cc` : id === 'ice' ? '1 塊' : id === 'plum' ? '1 顆' : '1 片';
        const matched = measuredJuiceMatch(s.mix);
        if (matched) this.message(`倒入${unit}。${ITEMS[matched].name}份量到了，放下材料後按住 F 約兩秒。`);
        else if (juiceOvershot(s.mix)) this.message(`倒入${unit}，超過了，不能調配。空手按 E 倒回上一步，或到廚餘桶清空。`);
        else this.message('倒入' + unit + '。');
        return;
      }
      if (this.held) return this.message('果汁台只能倒檸檬片、脆梅、糖漿或冰塊。');
      if (!s.pours.length) return this.message('先拿材料，在果汁台按 E 倒。片、顆、塊各 +1，糖漿每次 +5 cc。');
      const id = s.pours.pop();
      s.mix[id] -= id === 'syrup' ? SYRUP_STEP_CC : 1; s.progress = 0;
      this.message('倒回了上一步。不對的話也可以到廚餘桶整杯倒掉。');
    }
    action(id) {
      if (this.paused || this.phase === 'ended') return;
      if (this.level.measure === 'sauce' && id === 'counter') return this.actionMeasure(this.stations.find(st => st.id === 'counter'));
      if (!this.woks[id]) return;
      const w = this.woks[id];
      if (w.state === 'loading') {
        const recipe = recipeFor(w.ingredients, this.level.menu);
        if (!recipe) return this.message('可做：' + this.missingIngredients(id) + '。按住 F 可清空。');
        w.portions = portionsFor(w.ingredients); w.remaining = w.portions; w.recipe = recipe; w.state = 'cooking'; w.elapsed = 0; w.clearProgress = 0; this.message('開火！可以先去準備下一道菜。', 'fire');
      } else if (w.state === 'cooking') {
        const progress = w.elapsed / cookDuration(w);
        if (progress >= this.mods.flipStart && progress <= this.mods.flipEnd && !w.flipped) { w.flipped = true; this.flips++; this.message(`翻炒漂亮！品質獎勵 +${Math.round(this.mods.qualityBonus * 100)}%`, 'flip'); }
        else this.message(w.flipped ? '已完成翻炒，等起鍋吧。' : `等進度到 ${flipWindowText(this.mods)} 時再翻炒。`);
      }
    }
    serve() {
      if (this.paused || this.phase === 'ended') return;
      if (this.level.mode === 'training') {
        const goal = this.level.goals.find(g => g.id === this.held?.id);
        if (!goal) return this.message(this.level.reject || '阿明：這不是這堂課要的。');
        const needed = goal.count - (this.delivered[goal.id] || 0);
        if (needed <= 0) return this.message('阿明：這種食材已經足夠，看看另一張備料單。');
        const count = this.held.count || 1, accepted = Math.min(count, needed);
        this.delivered[goal.id] = (this.delivered[goal.id] || 0) + accepted;
        this.held = count > accepted ? { ...this.held, count: count - accepted } : null;
        this.served += accepted;
        this.message(`阿明：收到了 ${accepted} 份，多的食材幫你留在手上。`, 'done');
        if (this.level.goals.every(g => this.delivered[g.id] === g.count)) this.finish();
        return;
      }
      const item = this.held && ITEMS[this.held.id];
      const offer = item?.kind === 'dish' ? menuOffer(item.recipe) : item?.kind === 'juice' ? menuOffer(this.held.id) : null;
      if (!offer) return this.message('把完成的料理裝盤後送過來。');
      const match = this.orders.filter(o => o.recipe === offer.key).sort((a, b) => a.remaining - b.remaining)[0];
      if (!match) return this.message(offer.kind === 'drink' ? '目前沒有客人點這杯飲料，先放備料檯。' : '目前沒有客人點這道菜，先放備料檯。');
      const income = offer.price + Math.round(offer.price * .2 * match.remaining / match.total) + (offer.kind === 'dish' && this.held.quality ? Math.round(offer.price * this.mods.qualityBonus) : 0);
      this.revenue += income; this.served++; this.orders = this.orders.filter(o => o !== match); this.held = null;
      if (offer.kind === 'dish') this.returns.push(5);
      this.message('第 ' + match.table + ' 桌，上菜！收入 +$' + income, 'serve');
    }
    tick(dt, workingStation = null) {
      if (this.paused || this.phase === 'ended' || !Number.isFinite(dt) || dt <= 0) return;
      // Bounded steps keep cooking and phase boundaries correct even after a slow frame.
      while (dt > 1e-8 && this.phase !== 'ended') { const step = Math.min(dt, .05); this.step(step, workingStation); dt -= step; }
    }
    step(dt, workingStation) {
      this.clock += dt;
      if (this.level.mode !== 'training') this.time -= dt;
      for (let i = this.returns.length - 1; i >= 0; i--) { this.returns[i] -= dt; if (this.returns[i] <= 0) { this.plates++; this.returns.splice(i, 1); } }
      const board = this.stations.find(s => s.type === 'board' && s.id === workingStation);
      if (board && !this.held && board.item && ITEMS[board.item.id].processed) {
        board.progress += dt;
        if (board.progress >= chopDuration(board.item, this.mods)) { board.item.id = ITEMS[board.item.id].processed; board.progress = chopDuration(board.item, this.mods); this.message('切好了！按 E 拿起食材。', 'done'); }
      }
      const juicer = this.stations.find(s => s.type === 'juice' && s.id === workingStation);
      if (juicer && !this.held && !juicer.item) {
        const id = this.level.measure === 'juice' ? measuredJuiceMatch(juicer.mix) : juiceRecipe(juicer.ingredients);
        if (id) {
          juicer.progress += dt;
          if (juicer.progress >= MIX_TIME) {
            juicer.item = { id }; juicer.ingredients = []; juicer.progress = 0;
            if (juicer.mix) { juicer.mix = emptyJuiceMix(); juicer.pours = []; }
            this.message('調好了！按 E 拿起' + ITEMS[id].name + '。', 'done');
          }
        }
      }
      if (this.level.mode === 'training') return;
      for (const [id, w] of Object.entries(this.woks)) {
      const label = id === 'wok' ? '一號鍋' : '二號鍋';
      if (w.state === 'cooking') {
        const old = w.elapsed; w.elapsed += dt;
        if (old < cookDuration(w) * this.mods.flipStart && w.elapsed >= cookDuration(w) * this.mods.flipStart) this.message(label + '可以翻炒了！到炒爐前按 F。', 'order');
        if (w.elapsed >= cookDuration(w)) { w.state = 'ready'; w.readyTime = 0; this.message(label + `炒好了！拿盤盛裝，${+this.mods.burnTime.toFixed(1)} 秒後會燒焦。`, 'done'); }
      } else if (w.state === 'ready') {
        w.readyTime += dt;
        if (w.readyTime >= this.mods.burnTime) { w.state = 'burned'; this.burned++; this.message(label + '燒焦了！空手按住 F 清鍋。', 'bad'); }
      }
      if ((w.state === 'burned' || (w.state === 'loading' && !recipeFor(w.ingredients, this.level.menu))) && workingStation === id && !this.held) {
        w.clearProgress += dt;
        if (w.clearProgress >= 2) { this.wasted++; this.clearWok(id); this.message(label + '清乾淨了，重新出發。'); }
      } else w.clearProgress = 0;
      }
      if (this.phase !== 'prep') {
        for (const order of [...this.orders]) { order.remaining -= dt; if (order.remaining <= 0) { this.orders = this.orders.filter(o => o !== order); this.expired++; this.message('客人等太久，取消了一道菜。', 'bad'); } }
        if (this.phase === 'service' && this.time > 0) { this.spawnTime -= dt; if (this.spawnTime <= 0) { const count = this.orders.length; this.addOrder(); this.spawnTime = this.level.orderInterval; if (this.orders.length > count) this.message('新訂單！看一下點菜單。', 'order'); } }
      }
      if (this.time <= 0) {
        if (this.phase === 'prep') this.startService();
        else if (this.phase === 'service') { this.phase = 'closing'; this.time = this.level.closingTime; this.message('停止接單，完成最後幾道菜就打烊。', 'order'); }
        else this.finish();
      }
      if (this.phase === 'closing' && this.orders.length === 0) this.finish();
    }
    finish() { if (this.phase === 'ended') return; this.expired += this.orders.length; this.orders = []; this.phase = 'ended'; this.time = 0; }
  }
  const VERSION = '0.14.0';
  const api = { VERSION, Kitchen, ITEMS, RECIPES, DRINKS, JUICE_RECIPES, TRAINING_JUICE, SAUCE_SPOONS, SAUCE_CC, SYRUP_STEP_CC, SYRUP_TOLERANCE_CC, menuOffer, STATIONS, LEVELS, getStations, starCount, canAdd, recipeFor, portionsFor, cookDuration, chopDuration, MIX_TIME, juiceRecipe, measuredJuiceMatch, juiceOvershot, juiceMeasureLines, juiceTargetText, sauceMeasureLine, CHEF_STATS, getChefModifiers, flipWindowText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HotStirFry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
