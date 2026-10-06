/* Home dinner mode: cook a few dishes for a friend. Quality and warmth matter, speed does not. No DOM access. */
(function (root) {
  'use strict';
  const INGREDIENTS = { tomato: '番茄', egg: '雞蛋', scallion: '蔥', greens: '青菜', garlic: '蒜', chili: '辣椒' };
  // Step kinds map to the three close-up mini games: cut, stir, timing.
  // `needs` is the normal amount; `max` lets the cook add more for a small bonus at another dish's expense.
  // `cool` is how many seconds a plated dish takes to go from piping hot to cold.
  const DISHES = {
    tomatoEgg: { name: '番茄炒蛋', needs: { tomato: 2, egg: 3, scallion: 1 }, max: { tomato: 3 }, cool: 150, tags: ['egg'],
      steps: [{ id: 'cutTomato', kind: 'cut', label: '切番茄' }, { id: 'whisk', kind: 'stir', label: '打蛋' }, { id: 'cook', kind: 'timing', label: '看熟度起鍋' }] },
    garlicGreens: { name: '蒜炒青菜', needs: { greens: 1, garlic: 1 }, optional: { chili: 'spicy' }, cool: 90, tags: ['vegetable'],
      steps: [{ id: 'cutGarlic', kind: 'cut', label: '切蒜末' }, { id: 'stirFry', kind: 'timing', label: '大火快炒' }] },
    tomatoEggSoup: { name: '番茄蛋花湯', needs: { tomato: 1, egg: 1 }, cool: 400, tags: ['soup', 'egg'],
      steps: [{ id: 'cutTomato', kind: 'cut', label: '切番茄' }, { id: 'pourEgg', kind: 'stir', label: '倒蛋花' }] }
  };
  const FRIENDS = {
    roommate: { name: '室友', likes: ['soup'], dislikes: ['spicy'], invite: '今晚在家吃好不好？我想喝湯，不太敢吃辣。',
      menu: ['tomatoEgg', 'garlicGreens', 'tomatoEggSoup'], fridge: { tomato: 3, egg: 4, scallion: 1, greens: 1, garlic: 1, chili: 1 } }
  };
  const SHORT_PENALTY = 20, EXTRA_BONUS = 5, LIKE_BONUS = 10, DISLIKE_PENALTY = 20;
  const WARMTH = [[2 / 3, '熱騰騰', 100], [1 / 3, '溫的', 75], [-Infinity, '涼了', 50]];
  const RATINGS = [[80, '還想再來', 3], [55, '好吃', 2], [-Infinity, '普通', 1]];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const band = (table, value) => table.find(row => value >= row[0]);
  const warmthLabel = warmth => band(WARMTH, warmth)[1];

  class Dinner {
    constructor(friendId = 'roommate') {
      this.friendId = FRIENDS[friendId] ? friendId : 'roommate';
      const friend = this.friend;
      this.menu = [...friend.menu]; this.fridge = { ...friend.fridge };
      this.active = null; this.table = []; this.clock = 0; this.paused = false; this.result = null;
    }
    get friend() { return FRIENDS[this.friendId]; }
    get remaining() { return this.menu.filter(id => id !== this.active?.id && !this.table.some(d => d.id === id)); }
    // What `begin` would take from the fridge, without taking it.
    plan(dishId, amounts = {}, options = []) {
      const dish = DISHES[dishId]; if (!dish) return null;
      const used = {}, short = [], extra = [];
      for (const [item, need] of Object.entries(dish.needs)) {
        const want = clamp(Math.floor(amounts[item] ?? need), 0, dish.max?.[item] ?? need);
        used[item] = Math.min(want, this.fridge[item] || 0);
        if (used[item] < need) short.push(item); else if (used[item] > need) extra.push(item);
      }
      const tags = [...dish.tags];
      for (const item of options) if (dish.optional?.[item] && (this.fridge[item] || 0) > 0) { used[item] = 1; tags.push(dish.optional[item]); }
      return { used, short, extra, tags };
    }
    // One stove: a dish must be plated before the next one starts.
    begin(dishId, amounts, options) {
      if (this.result || this.active || !this.remaining.includes(dishId)) return false;
      const taken = this.plan(dishId, amounts, options);
      for (const [item, count] of Object.entries(taken.used)) this.fridge[item] -= count;
      this.active = { id: dishId, ...taken, scores: {} };
      return this.active;
    }
    get nextStep() { return this.active ? DISHES[this.active.id].steps.find(step => !(step.id in this.active.scores)) || null : null; }
    // Close-ups report 0–100. A bad step lowers the dish; nothing is redone.
    scoreStep(stepId, quality) {
      if (this.result || this.nextStep?.id !== stepId) return false;
      this.active.scores[stepId] = clamp(Math.round(Number(quality) || 0), 0, 100);
      return this.nextStep || 'ready';
    }
    plate() {
      if (this.result || !this.active || this.nextStep) return false;
      const dish = { ...this.active, warmth: 1 };
      this.table.push(dish); this.active = null;
      return dish;
    }
    // Only plated dishes cool, and only while the kitchen is live (not during close-ups or pause).
    tick(dt) {
      if (this.paused || this.result || !Number.isFinite(dt) || dt <= 0) return;
      this.clock += dt;
      for (const dish of this.table) dish.warmth = clamp(dish.warmth - dt / DISHES[dish.id].cool, 0, 1);
    }
    scoreDish(dish) {
      const scores = Object.values(dish.scores), craft = scores.reduce((sum, v) => sum + v, 0) / scores.length;
      const [, warmth, heat] = band(WARMTH, dish.warmth), friend = this.friend;
      const liked = dish.tags.some(tag => friend.likes.includes(tag)), disliked = dish.tags.some(tag => friend.dislikes.includes(tag));
      const score = clamp(Math.round(craft * .7 + heat * .3) - dish.short.length * SHORT_PENALTY + dish.extra.length * EXTRA_BONUS + (liked ? LIKE_BONUS : 0) - (disliked ? DISLIKE_PENALTY : 0), 0, 100);
      return { id: dish.id, name: DISHES[dish.id].name, score, craft: Math.round(craft), warmth, short: dish.short, extra: dish.extra, liked, disliked };
    }
    reaction(row) {
      const name = row.name;
      if (row.missing) return { mood: 'plain', line: `咦，今天沒有${name}嗎？` };
      if (row.disliked) return { mood: 'plain', line: `${name}有點辣……我慢慢吃。` };
      if (row.short.length) return { mood: 'plain', line: `${name}好像少了${row.short.map(item => INGREDIENTS[item]).join('和')}？` };
      if (row.warmth === '涼了') return { mood: 'plain', line: `${name}有點涼了，不過味道不錯。` };
      if (row.score >= 80) return { mood: 'yummy', line: row.liked ? `${name}！我最想吃這個，好好吃。` : `${name}好好吃！` };
      if (row.score >= 55) return { mood: 'yummy', line: `${name}不錯耶。` };
      return { mood: 'plain', line: `${name}……下次會更好的。` };
    }
    // Serving ends the dinner. Dishes that never reached the table count as zero.
    serve() {
      if (this.result || !this.table.length || this.active) return false;
      const dishes = this.menu.map(id => {
        const plated = this.table.find(d => d.id === id);
        const row = plated ? this.scoreDish(plated) : { id, name: DISHES[id].name, score: 0, missing: true };
        return { ...row, ...this.reaction(row) };
      });
      const total = Math.round(dishes.reduce((sum, d) => sum + d.score, 0) / dishes.length);
      const [, rating, stars] = band(RATINGS, total);
      const line = stars === 3 ? '吃得好飽！下次還要來你家吃。' : stars === 2 ? '謝謝招待，很好吃。' : '謝謝你煮飯，下次我們一起研究看看。';
      this.result = { dishes, total, rating, stars, line, seconds: Math.round(this.clock) };
      return this.result;
    }
  }
  const api = { INGREDIENTS, DISHES, FRIENDS, WARMTH, RATINGS, SHORT_PENALTY, EXTRA_BONUS, LIKE_BONUS, DISLIKE_PENALTY, warmthLabel, Dinner };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HotStirFryHome = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
