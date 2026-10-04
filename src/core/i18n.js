/*
 * Languages. English is the game's own language; another language is a data file of translations
 * (data/i18n/<code>.js, loaded at start-up only when that language is chosen).
 *
 * Text is translated as it is shown, not where it is written: every Phaser Text's setText (and so every label the
 * game makes) passes through OTR.i18n.tr. The game's data, its saved records and its score logs stay in English, so
 * a trainee who changes language keeps one record, and a trainer's reports read the same whoever made them.
 *
 * A translation file has:
 *   strings     English → translation, for whole strings ("Start the route" → "Empezar la ruta")
 *   templates   [English, translation] with {0}, {1}... for the changing parts ("Stop {0} of {1}" →
 *               "Parada {0} de {1}"); the parts are translated in their turn, so "Correct! {0}" works for any
 *               feedback the dictionary knows. A hole the translation leaves out is dropped, and where the English
 *               adds a plural ending ("{0} package{1}") the translation picks its own word with {1:plural|singular}
 *               ("{0} {1:paquetes|paquete}"), which reads the plural when the English ending was filled in
 * A string with neither is split where the game joins pieces (new lines, " · ") and each piece is tried; what is still
 * unknown is shown in English (and listed in OTR.i18n.missing, for the translators).
 *
 * The language: ?lang=es for one visit, else Settings → Language (saved on this computer), else the company's default
 * (OTR_DATA.config.lang), else the browser's, if the game has it, else English.
 */
window.OTR = window.OTR || {};
window.OTR_I18N = window.OTR_I18N || {};

OTR.i18n = {
  /** The languages there are, in their own names. */
  LANGS: { en: 'English', es: 'Español' },
  lang: 'en',
  dict: null, templates: [], cache: new Map(), missing: new Map(),

  /** Which language to use, before the profile has loaded (the profile's choice is applied by load()). */
  pick() {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q && this.LANGS[q]) return q;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('otr.lang') || 'null'); } catch (e) { saved = null; }
    if (saved && this.LANGS[saved]) return saved;
    const company = window.OTR_DATA && OTR_DATA.config && OTR_DATA.config.lang;
    if (company && this.LANGS[company]) return company;
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return this.LANGS[nav] ? nav : 'en';
  },

  /** Load the chosen language's file (before the game starts). Resolves either way: English if it cannot load. */
  load() {
    const lang = this.pick();
    if (lang === 'en') return Promise.resolve();
    return new Promise(res => {
      const done = () => { this.use(lang); res(); };
      if (window.OTR_I18N[lang]) { done(); return; }
      const s = document.createElement('script');
      s.src = `data/i18n/${lang}.js`;
      s.onload = done; s.onerror = () => res();
      document.head.appendChild(s);
    });
  },

  use(lang) {
    const L = window.OTR_I18N[lang];
    if (!L) return;
    this.lang = lang;
    this.dict = new Map(Object.entries(L.strings || {}));
    // templates: the English with its {n} holes as a regular expression, longest literal text first
    this.templates = (L.templates || []).map(([en, tr]) => {
      const parts = en.split(/\{(\d+)\}/);
      let re = '^', order = [];
      // a hole may be empty: the game's plural endings ("package{1}") are "" for one
      parts.forEach((p, i) => { if (i % 2) { re += '([\\s\\S]*?)'; order.push(+p); } else re += p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
      return { re: new RegExp(re + '$'), order, tr, weight: en.replace(/\{\d+\}/g, '').length };
    }).sort((a, b) => b.weight - a.weight);
    this.cache.clear();
    document.documentElement.lang = lang;
  },

  /** Choose a language: saved for this computer and the profile, and the game restarts in it. */
  set(lang) {
    if (!this.LANGS[lang]) return;
    try { localStorage.setItem('otr.lang', JSON.stringify(lang)); } catch (e) { /* private window */ }
    const u = new URL(window.location.href);
    u.searchParams.delete('lang');
    window.location.href = u.toString();
  },

  /** Translate a string shown on screen. */
  tr(s) {
    if (this.lang === 'en' || typeof s !== 'string' || !s || !this.dict) return s;
    const hit = this.cache.get(s);
    if (hit !== undefined) return hit;
    const out = this.translate(s, 0);
    if (this.cache.size > 4000) this.cache.clear();
    this.cache.set(s, out);
    return out;
  },

  translate(s, depth) {
    const d = this.dict.get(s);
    if (d !== undefined) return d;
    // nothing to translate: numbers, times, codes, single symbols
    if (!/[A-Za-z]{2,}/.test(s)) return s;
    const trimmed = s.trim();
    if (trimmed !== s) { const t = this.translate(trimmed, depth); return t === trimmed ? s : s.replace(trimmed, t); }
    if (depth < 4) {
      for (let i = 0; i < this.templates.length; i++) {
        const T = this.templates[i], m = T.re.exec(s);
        if (!m) continue;
        let out = T.tr;
        // {n:plural|singular} picks a word by whether the English plural ending {n} was filled in
        out = out.replace(/\{(\d+):([^|}]*)\|([^}]*)\}/g, (all, n, pl, sg) => { const k = T.order.indexOf(+n); return k >= 0 && m[k + 1] ? pl : sg; });
        T.order.forEach((n, k) => { out = out.split(`{${n}}`).join(this.translate(m[k + 1], depth + 1)); });
        return out;
      }
      // pieces the game joined: lines, then " · " lists, then "label: value"
      for (const sep of ['\n', ' · ', ' — ', ': ']) {
        if (s.indexOf(sep) > 0) {
          const parts = s.split(sep), tr = parts.map(p => this.translate(p, depth + 1));
          if (tr.some((t, i) => t !== parts[i])) return tr.join(sep);
        }
      }
    }
    if (OTR.flow && OTR.flow.dev && /[a-z]{3,}/.test(s) && !Object.values(this.LANGS).some(n => s.endsWith(n))) this.missing.set(s, (this.missing.get(s) || 0) + 1);
    return s;
  },

  /** For text that is not a Phaser Text (printed pages, speech, the page title). */
  t(s) { return this.tr(s); }
};

// Every Phaser Text is translated as it is set (a Text's constructor sets its text through here too).
(function () {
  if (!window.Phaser || !Phaser.GameObjects || !Phaser.GameObjects.Text) return;
  const P = Phaser.GameObjects.Text.prototype, set = P.setText;
  P.setText = function (value) {
    if (OTR.i18n.lang !== 'en' && !this.noTranslate) {
      if (Array.isArray(value)) value = value.map(v => OTR.i18n.tr(String(v)));
      else if (value !== undefined && value !== null) value = OTR.i18n.tr(String(value));
    }
    return set.call(this, value);
  };
})();
