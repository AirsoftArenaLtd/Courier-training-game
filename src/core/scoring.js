/* Scoring helpers: ratio -> stars, dialogue max-points search. */
window.OTR = window.OTR || {};

OTR.scoring = {
  CATS: ['safety', 'efficiency', 'service'],

  stars(ratio, thresholds) {
    thresholds = thresholds || OTR_DATA.config.starThresholds;
    let s = 0;
    thresholds.forEach(t => { if (ratio >= t - 1e-6) s++; });
    return Math.min(3, s);
  },

  /**
   * For a dialogue graph, the best achievable total per category along any single path.
   * Categories are maximised independently (an upper bound used as the ratio denominator).
   */
  dialogueMax(dlg) {
    const cats = OTR.scoring.CATS;
    const memo = {};
    const visiting = {};
    const add = (a, eff) => {
      const r = Object.assign({}, a);
      if (eff) cats.forEach(c => { r[c] = (r[c] || 0) + (eff[c] || 0); });
      return r;
    };
    const best = (id) => {
      if (memo[id]) return memo[id];
      const zero = { safety: 0, efficiency: 0, service: 0 };
      const node = dlg.nodes[id];
      if (!node || visiting[id]) return zero;
      visiting[id] = true;
      let out;
      if (node.type === 'end') {
        out = add(zero, node.effects);
      } else if (node.choices) {
        out = { safety: -Infinity, efficiency: -Infinity, service: -Infinity };
        node.choices.forEach(ch => {
          const sub = add(best(ch.next), ch.effects);
          cats.forEach(c => { out[c] = Math.max(out[c], sub[c]); });
        });
        if (node.timeout) {
          const sub = add(best(node.timeout.next), node.timeout.effects);
          cats.forEach(c => { out[c] = Math.max(out[c], sub[c]); });
        }
      } else {
        out = add(best(node.next), node.effects);
      }
      visiting[id] = false;
      memo[id] = out;
      return out;
    };
    return best(dlg.start);
  }
};
