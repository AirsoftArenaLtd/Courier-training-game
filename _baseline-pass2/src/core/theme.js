/* Theme: fonts, colour helpers and text factory. */
window.OTR = window.OTR || {};

OTR.W = 1280;
OTR.H = 720;

OTR.theme = {
  font: '"Segoe UI", "Trebuchet MS", system-ui, -apple-system, sans-serif',
  get pal() { return OTR_DATA.config.palette; }
};

/* Colour helpers (colours are 0xRRGGBB numbers throughout) */
OTR.color = {
  css(num, alpha) {
    const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    return alpha === undefined ? '#' + num.toString(16).padStart(6, '0') : `rgba(${r},${g},${b},${alpha})`;
  },
  shade(num, amt) {
    // amt -1..1 : darken (negative) or lighten (positive)
    let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    if (amt >= 0) {
      r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
    } else {
      r *= 1 + amt; g *= 1 + amt; b *= 1 + amt;
    }
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  },
  lerp(a, b, t) {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
  }
};

/*
 * Text factory.
 * opts: bold(true) | weight | align | wrap | stroke | strokeW | shadow | italic | ox | oy | lineSpacing
 */
OTR.txt = function (scene, x, y, str, size, color, opts) {
  opts = opts || {};
  size = size || 24;
  let weight = opts.weight || (opts.bold === false ? 'normal' : 'bold');
  if (opts.italic) weight = 'italic ' + weight;
  const style = {
    fontFamily: OTR.theme.font,
    fontSize: size + 'px',
    color: color || '#ffffff',
    fontStyle: weight,
    align: opts.align || 'left',
    resolution: 2
  };
  if (opts.wrap) style.wordWrap = { width: opts.wrap, useAdvancedWrap: true };
  if (opts.stroke) { style.stroke = opts.stroke; style.strokeThickness = opts.strokeW || 4; }
  if (opts.shadow) style.shadow = { offsetX: 0, offsetY: 2, color: 'rgba(0,0,0,0.4)', blur: 6, fill: true };
  if (opts.lineSpacing) style.lineSpacing = opts.lineSpacing;
  const t = scene.add.text(x, y, str, style);
  t.setOrigin(opts.ox === undefined ? 0.5 : opts.ox, opts.oy === undefined ? 0.5 : opts.oy);
  return t;
};

/*
 * Phaser can re-deliver the same native keyboard event if several keys arrive within one frame.
 * Wrap keyboard handlers with this so each native event is handled once per handler.
 */
OTR.dedupe = function (fn) {
  const seen = new WeakSet();
  return function (e) {
    if (e && typeof e === 'object') {
      if (seen.has(e)) return undefined;
      seen.add(e);
    }
    return fn.apply(this, arguments);
  };
};

/** Listen for a keyboard event on a scene with dedupe. name: 'keydown-SPACE', 'keydown', etc. */
OTR.onKey = function (scene, name, fn) {
  const h = OTR.dedupe(fn);
  scene.input.keyboard.on(name, h);
  return h;
};

OTR.util = {
  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
  clamp01(v) { return Math.max(0, Math.min(1, v)); },
  lerp(a, b, t) { return a + (b - a) * t; },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  },
  formatTime(sec) {
    sec = Math.max(0, Math.ceil(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
};
