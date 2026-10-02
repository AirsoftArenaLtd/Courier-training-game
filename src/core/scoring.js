/* Scoring helpers: ratio -> stars, dialogue max-points search. */
window.OTR = window.OTR || {};

OTR.scoring = {
  CATS: ['safety', 'efficiency', 'service'],

  /** A scenario's categories in the one order every screen uses (Safety · Efficiency · Service; SHELL-22). */
  ordered(cats) {
    return OTR.scoring.CATS.filter(c => cats.includes(c)).concat(cats.filter(c => !OTR.scoring.CATS.includes(c)));
  },

  stars(ratio, thresholds) {
    thresholds = thresholds || OTR_DATA.config.starThresholds;
    let s = 0;
    thresholds.forEach(t => { if (ratio >= t - 1e-6) s++; });
    return Math.min(3, s);
  },

  /**
   * Time is not a free star: a speed ratio (0..1) only counts as far as the calls made were right. accuracy is the
   * share of right calls (0..1). Rushing through with wrong calls earns nothing for the time.
   */
  gateTime(timeRatio, accuracy) {
    if (accuracy < 0.5) return 0;
    return Math.min(timeRatio, accuracy);
  },

  /**
   * The results headline, honest about the run. o: { stars: {cat: n}, cats, untested: [cat], criticals: [item],
   * mistakes: n, cap?: 'GOOD EFFORT' } (a scene's ceiling, when its outcome is not one to praise). Returns
   * { text, celebrate: 'big' | 'small' | null, critical }.
   */
  headline(o) {
    const h = OTR.scoring.rawHeadline(o);
    const tiers = ['KEEP PRACTICING', 'GOOD EFFORT', 'GREAT WORK!', 'FLAWLESS!'];
    if (o.cap && tiers.indexOf(h.text) > tiers.indexOf(o.cap)) return { text: o.cap, celebrate: null };
    return h;
  },

  rawHeadline(o) {
    const cats = o.cats.filter(c => (o.untested || []).indexOf(c) < 0);
    if (o.criticals && o.criticals.length) {
      const safety = o.criticals.some(it => it.cat === 'safety');
      return { text: safety ? 'SAFETY-CRITICAL MISTAKE' : 'CRITICAL MISTAKE', celebrate: null, critical: true };
    }
    if (!cats.length) return { text: 'NOTHING TESTED THIS RUN', celebrate: null };
    const got = cats.reduce((n, c) => n + (o.stars[c] || 0), 0), max = cats.length * 3;
    const weakest = Math.min(...cats.map(c => o.stars[c] || 0));
    if (got === max && !o.mistakes) return { text: 'FLAWLESS!', celebrate: 'big' };
    if (got >= max * 0.66 && weakest >= 2) return { text: 'GREAT WORK!', celebrate: got === max ? 'big' : 'small' };
    if (got >= max * 0.33 && weakest >= 1) return { text: 'GOOD EFFORT', celebrate: null };
    return { text: 'KEEP PRACTICING', celebrate: null };
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
