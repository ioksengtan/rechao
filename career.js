/* Career mode: eight weeks of choices that produce a chef card. No DOM access. */
(function (root) {
  'use strict';
  const KEY = 'hot-stir-fry-career-v1';
  const WEEKS = 8, MAX_CARDS = 5, EXAM_LEVEL = 'opening', EVENT_CHANCE = .6;
  const STAT_NAMES = { knife: '刀工', heat: '火候', season: '調味', charm: '人緣', control: '控鍋' };
  const STAT_EFFECTS = { knife: '切料更快', heat: '翻炒區間更寬', season: '翻炒品質加成更高', charm: '客人更有耐心', control: '更晚燒焦' };
  const ACTIONS = {
    knife: { name: '練刀工', main: 'knife', sub: 'control', stamina: -25 },
    heat: { name: '練火候', main: 'heat', sub: 'control', stamina: -25 },
    season: { name: '學調味', main: 'season', sub: 'heat', stamina: -20 },
    floor: { name: '顧外場', main: 'charm', sub: 'season', stamina: -20 },
    rest: { name: '休息', stamina: 40 }
  };
  const MAIN_GAIN = 12, SUB_GAIN = 5;
  const TITLES = ['見習生', '見習生', '二廚', '總舖師'];
  const EVENTS = [
    { id: 'late-practice', speaker: 'aming', scene: '打烊後，廚房只剩一盞燈', text: '阿明：還有力氣嗎？我把剩下的蔥拿出來，要不要留下來多練幾刀？',
      choices: [{ label: '留下練習', stamina: -15, stats: { knife: 8 }, result: 'Alex 切到手痠，刀工更穩了。' }, { label: '先回去休息', stamina: 15, result: '阿明：也好，明天見。' }] },
    { id: 'secret-dish', speaker: 'guest', scene: '熟客王先生舉手', text: '王先生：老闆不在喔？那你幫我炒一盤菜單上沒有的「老闆特製」好不好？',
      choices: [{ label: '挑戰做看看', stamina: -10, stats: { heat: 6, season: 4 }, result: '雖然有點焦，王先生還是吃光了。' }, { label: '老實說還不會', stats: { charm: 6 }, result: '王先生笑著說：誠實最好，下次再來！' }] },
    { id: 'typhoon', speaker: 'aming', scene: '颱風天，店門半掩', text: '阿明：今天不會有客人啦。你要回去睡覺，還是陪我把廚房整理一下？',
      choices: [{ label: '一起大掃除', stamina: -10, stats: { control: 6 }, result: '擦亮每一口鍋，Alex 更懂得看火。' }, { label: '在家睡飽', stamina: 30, result: '聽著雨聲，Alex 睡了好長一覺。' }] },
    { id: 'night-market', speaker: 'alex', scene: '週末的夜市', text: 'Alex：隔壁攤位的阿姨缺人手，但我也好想到處吃吃看……',
      choices: [{ label: '幫忙顧攤', stamina: -15, stats: { charm: 8 }, result: '阿姨塞了一袋雞蛋糕當謝禮。' }, { label: '逛夜市學味道', stats: { season: 6 }, result: '胡椒餅、滷味、麻辣鴨血，Alex 記了滿滿一頁筆記。' }] },
    { id: 'homesick', speaker: 'alex', scene: '宿舍的窗邊', text: 'Alex：好久沒跟家人說話了。今天有點想家。',
      choices: [{ label: '打視訊電話回家', stamina: 20, result: '家人說：你看起來好有精神！' }, { label: '把心情寫進料理筆記', stats: { season: 4, heat: 4 }, result: '寫著寫著，Alex 想通了一道菜的火候。' }] },
    { id: 'old-wok', speaker: 'aming', scene: '阿明拿出一口黑亮的老鍋', text: '阿明：這口鍋跟了我二十年。想學怎麼養鍋嗎？要花點力氣喔。',
      choices: [{ label: '學習養鍋', stamina: -10, stats: { control: 8 }, result: '鍋子熱了、油亮了，Alex 摸到了控鍋的訣竅。' }, { label: '在旁邊看就好', stats: { heat: 4 }, result: '光是看，也學到不少火候的變化。' }] },
    { id: 'market', speaker: 'aming', scene: '清晨五點，手機響了', text: '阿明：我要去市場採買，要一起來嗎？很早喔。',
      choices: [{ label: '跟去市場', stamina: -20, stats: { knife: 5, season: 5 }, result: 'Alex 學會挑牛肉的紋路，也認識了香料攤老闆。' }, { label: '睡晚一點', stamina: 15, result: '阿明：年輕人要睡飽，下次再帶你去。' }] },
    { id: 'big-order', speaker: 'guest', scene: '電話那頭是公司聚餐', text: '客人：今晚二十個人要外帶，來得及嗎？',
      choices: [{ label: '接下大單', stamina: -25, stats: { heat: 6, control: 6 }, result: '兩口鍋同時開火，Alex 撐過了最忙的一晚。' }, { label: '婉拒，專心練基本功', stats: { knife: 4 }, result: '阿明點點頭：量力而為也是本事。' }] }
  ];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const emptyStats = () => ({ knife: 0, heat: 0, season: 0, charm: 0, control: 0 });
  const eventById = id => EVENTS.find(e => e.id === id);

  function newRun(random = Math.random) {
    return { id: 'run-' + Date.now().toString(36) + '-' + Math.floor(random() * 1e6).toString(36), week: 1, stamina: 100, injured: 0, stats: emptyStats(), usedEvents: [], log: [], pending: null, result: null };
  }
  function efficiency(run) {
    const base = run.stamina >= 50 ? 1 : run.stamina >= 25 ? .7 : .4;
    return run.injured > 0 ? base * .5 : base;
  }
  const injuryChance = run => run.stamina < 25 ? .3 : run.stamina < 50 ? .1 : 0;
  function previewAction(run, actionId) {
    const a = ACTIONS[actionId]; if (!a) return null;
    if (!a.main) return { gains: {}, stamina: Math.min(a.stamina, 100 - run.stamina), efficiency: 1, injuryChance: 0 };
    const eff = efficiency(run);
    return { gains: { [a.main]: Math.round(MAIN_GAIN * eff), [a.sub]: Math.round(SUB_GAIN * eff) }, stamina: Math.max(a.stamina, -run.stamina), efficiency: eff, injuryChance: injuryChance(run) };
  }
  function applyStats(run, stats = {}) { for (const [key, value] of Object.entries(stats)) if (key in run.stats) run.stats[key] = clamp(run.stats[key] + value, 0, 100); }
  function chooseAction(run, actionId, random = Math.random) {
    if (!run || run.pending || run.result || run.week > WEEKS || !ACTIONS[actionId]) return false;
    const a = ACTIONS[actionId], preview = previewAction(run, actionId);
    const hurt = preview.injuryChance > 0 && random() < preview.injuryChance;
    if (run.injured > 0) run.injured--;
    applyStats(run, preview.gains);
    run.stamina = clamp(run.stamina + preview.stamina, 0, 100);
    if (hurt) run.injured = 1;
    run.log.push({ week: run.week, action: actionId, gains: preview.gains, injured: hurt });
    if (run.week === WEEKS) run.pending = { type: 'exam', id: run.id + '-final' };
    else {
      const pool = EVENTS.filter(e => !run.usedEvents.includes(e.id));
      if (pool.length && random() < EVENT_CHANCE) {
        const event = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
        run.usedEvents.push(event.id); run.pending = { type: 'event', id: event.id };
      } else run.week++;
    }
    return { hurt, preview };
  }
  function resolveEvent(run, index) {
    const event = run?.pending?.type === 'event' && eventById(run.pending.id), choice = event && event.choices[index];
    if (!choice) return false;
    applyStats(run, choice.stats); run.stamina = clamp(run.stamina + (choice.stamina || 0), 0, 100);
    run.log.push({ week: run.week, event: event.id, choice: index });
    run.pending = null; run.week++;
    return choice;
  }
  // An exam id settles once, so replays or repeated result screens cannot grant the bonus twice.
  function settleExam(run, examId, revenue, stars) {
    if (run?.pending?.type !== 'exam' || run.pending.id !== examId) return false;
    stars = clamp(Math.floor(Number(stars) || 0), 0, 3);
    const bonus = [0, 2, 4, 6][stars];
    for (const key of Object.keys(run.stats)) run.stats[key] = clamp(run.stats[key] + bonus, 0, 100);
    run.result = { revenue: Math.max(0, Math.floor(Number(revenue) || 0)), stars, bonus, title: TITLES[stars] };
    run.pending = { type: 'card' };
    return run.result;
  }
  function makeCard(run, nickname) {
    if (!run?.result) return null;
    const name = String(nickname || '').trim().slice(0, 12) || `Alex #${run.id.slice(-4)}`;
    return { id: run.id, nickname: name, title: run.result.title, stats: { ...run.stats }, examRevenue: run.result.revenue, examStars: run.result.stars };
  }
  const validCard = c => c && typeof c.id === 'string' && c.stats && typeof c.stats === 'object';

  class CareerSave {
    constructor(storage) {
      this.storage = storage;
      let raw = {};
      try { raw = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch (_) {}
      this.run = raw.run && raw.run.stats && Number.isFinite(raw.run.week) ? raw.run : null;
      this.cards = Array.isArray(raw.cards) ? raw.cards.filter(validCard).slice(0, MAX_CARDS) : [];
      this.records = raw.records && typeof raw.records === 'object' ? raw.records : {};
    }
    save() { try { this.storage?.setItem(KEY, JSON.stringify({ run: this.run, cards: this.cards, records: this.records })); } catch (_) { /* Career stays session-only. */ } }
    start(random) { this.run = newRun(random); this.save(); return this.run; }
    abandon() { this.run = null; this.save(); }
    get full() { return this.cards.length >= MAX_CARDS; }
    // Keeps the finished card; when the roster is full, the player must name the slot to replace.
    keep(nickname, replaceIndex) {
      const card = makeCard(this.run, nickname); if (!card) return false;
      if (this.full) { if (!(replaceIndex >= 0 && replaceIndex < this.cards.length)) return false; this.cards[replaceIndex] = card; }
      else this.cards.push(card);
      this.run = null; this.save(); return card;
    }
    discard() { if (!this.run?.result) return false; this.run = null; this.save(); return true; }
    card(id) { return this.cards.find(c => c.id === id) || null; }
    record(levelId, card, revenue, stars) {
      const row = this.records[levelId] ||= { revenue: 0, stars: 0, runs: 0, chef: null };
      row.runs++;
      if (!row.chef || revenue > row.revenue || (revenue === row.revenue && stars > row.stars)) Object.assign(row, { revenue, stars, chef: { nickname: card.nickname, title: card.title, stats: { ...card.stats } } });
      this.save(); return { ...row };
    }
  }
  const api = { KEY, WEEKS, MAX_CARDS, EXAM_LEVEL, STAT_NAMES, STAT_EFFECTS, ACTIONS, EVENTS, TITLES, newRun, previewAction, efficiency, injuryChance, chooseAction, resolveEvent, settleExam, makeCard, eventById, CareerSave };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HotStirFryCareer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
