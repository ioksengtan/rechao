(function (root) {
  'use strict';
  const KEY = 'hot-stir-fry-progress-v2';
  const IDS = ['opening', 'rush', 'friday', 'prep-school', 'spice-school', 'sauce-school', 'juice-school'];
  const validNumber = value => Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  class Progress {
    constructor(storage) {
      this.storage = storage;
      this.records = {};
      let raw = {};
      try { raw = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch (_) {}
      for (const id of IDS) {
        const row = raw[id] || {};
        this.records[id] = { revenue: validNumber(row.revenue), stars: Math.min(3, validNumber(row.stars)), runs: validNumber(row.runs) };
      }
      try {
        const legacy = Number(storage?.getItem('hot-stir-fry-best'));
        this.records.opening.revenue = Math.max(this.records.opening.revenue, validNumber(legacy));
      } catch (_) {}
    }
    record(id, revenue, stars) {
      if (!IDS.includes(id)) return;
      const row = this.records[id];
      row.revenue = Math.max(row.revenue, validNumber(revenue));
      row.stars = Math.max(row.stars, Math.min(3, validNumber(stars)));
      row.runs++;
      try { this.storage?.setItem(KEY, JSON.stringify(this.records)); } catch (_) { /* Keep session records if persistence is unavailable. */ }
      return { ...row };
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { Progress, KEY };
  else root.HotStirFryProgress = { Progress, KEY };
})(typeof globalThis !== 'undefined' ? globalThis : this);
