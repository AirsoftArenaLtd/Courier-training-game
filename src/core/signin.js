/*
 * The sign-in screen for a training server with employee accounts (server/auth.js, docs/SIGN-IN.md).
 *
 *   OTR.signin.run(who) -> Promise<whoami>   resolves once the trainee is signed in with a password of their own
 *
 * A plain HTML form over the page, shown before the game boots (identity.js calls it from resolve()). The password
 * goes to the server and nowhere else: the server answers with an HttpOnly session cookie that page scripts cannot
 * read, and nothing is written to localStorage or sessionStorage. A new or reset account first chooses its own
 * password. Text is translated with OTR.i18n.t(); colours come from the theme; sizes are in rem, so larger text in the
 * browser grows the form instead of overflowing it.
 */
window.OTR = window.OTR || {};

OTR.signin = {
  MIN_LEN: 8,

  run(who) {
    const lang = OTR.i18n && OTR.i18n.load ? OTR.i18n.load() : Promise.resolve();
    return lang.then(() => new Promise(resolve => {
      this.done = resolve;
      this.build();
      if (who && who.mustChange) this.showChange(); else this.showSignIn();
    }));
  },

  t(s) { return OTR.i18n && OTR.i18n.t ? OTR.i18n.t(s) : s; },

  /** The page around the form: styles from the theme, a card in the middle, a live line for errors. */
  build() {
    const c = (n) => OTR_DATA.theme.css(n);
    const css = `
      #otr-signin { position: fixed; inset: 0; z-index: 10; overflow: auto; display: flex; align-items: center; justify-content: center;
        padding: 1rem; box-sizing: border-box; background: ${c('primaryDeep')}; font-family: "Segoe UI", "Nirmala UI", system-ui, sans-serif; }
      #otr-signin * { box-sizing: border-box; }
      #otr-signin .card { width: 100%; max-width: 28rem; margin: auto; padding: 1.75rem; border-radius: 1rem; background: ${c('paper')};
        color: ${c('ink')}; border: 2px solid ${c('tint')}; overflow-wrap: anywhere; }
      #otr-signin .brand { margin: 0 0 .25rem; font-size: .9rem; font-weight: 700; letter-spacing: .04em; color: ${c('muted')}; }
      #otr-signin h1 { margin: 0 0 .5rem; font-size: 1.6rem; line-height: 1.25; color: ${c('primary')}; }
      #otr-signin p { margin: 0 0 1rem; font-size: 1rem; line-height: 1.45; color: ${c('inkSoft')}; }
      #otr-signin label { display: block; margin: 0 0 .3rem; font-size: 1rem; font-weight: 700; }
      #otr-signin input { display: block; width: 100%; margin: 0 0 1rem; padding: .6rem .75rem; font: inherit; font-size: 1.1rem;
        color: ${c('ink')}; background: #fff; border: 2px solid ${c('mutedLight')}; border-radius: .5rem; }
      #otr-signin input:focus, #otr-signin button:focus { outline: 3px solid ${c('accent')}; outline-offset: 2px; }
      #otr-signin button { display: block; width: 100%; padding: .75rem 1rem; font: inherit; font-size: 1.1rem; font-weight: 800;
        color: #fff; background: ${c('primary')}; border: 0; border-radius: .5rem; cursor: pointer; white-space: normal; }
      #otr-signin button:hover { background: ${c('primaryLight')}; }
      #otr-signin button[disabled] { opacity: .65; cursor: wait; }
      #otr-signin .err { margin: 0 0 1rem; padding: .6rem .75rem; font-weight: 700; color: ${c('ink')}; background: ${c('paperTint')};
        border-left: .3rem solid ${c('accentDark')}; border-radius: .25rem; }
      #otr-signin .err:empty { display: none; }
      #otr-signin .note { margin: 1rem 0 0; font-size: .9rem; color: ${c('muted')}; }`;
    const style = document.createElement('style');
    style.id = 'otr-signin-style';
    style.textContent = css;
    document.head.appendChild(style);
    const root = document.createElement('div');
    root.id = 'otr-signin';
    root.innerHTML = '<main class="card"></main>';
    document.body.appendChild(root);
    this.root = root;
    this.card = root.firstChild;
  },

  /** A form: heading, a line of text, fields, the error line, a button. Enter submits; the first field has focus. */
  form(o) {
    const t = (s) => this.t(s);
    const esc = (s) => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    this.card.innerHTML =
      `<p class="brand">${esc(t('On The Route · Courier Training'))}</p>` +
      `<h1 id="otr-signin-title">${esc(t(o.title))}</h1>` +
      `<p id="otr-signin-intro">${esc(t(o.intro))}</p>` +
      `<form novalidate aria-labelledby="otr-signin-title" aria-describedby="otr-signin-intro">` +
      o.fields.map(f => `<label for="otr-${f.id}">${esc(t(f.label))}</label>` +
        `<input id="otr-${f.id}" name="${f.id}" type="${f.type || 'text'}" autocomplete="${f.auto}" ${f.type === 'password' ? '' : 'autocapitalize="none" spellcheck="false"'} maxlength="128" required>`).join('') +
      `<p class="err" id="otr-signin-err" role="alert" aria-live="assertive"></p>` +
      `<button type="submit">${esc(t(o.button))}</button>` +
      `</form>` +
      `<p class="note">${esc(t('Forgot your password? A trainer can reset it.'))}</p>`;
    const form = this.card.querySelector('form');
    const btn = form.querySelector('button');
    const fields = {};
    o.fields.forEach(f => { fields[f.id] = form.querySelector('#otr-' + f.id); });
    this.err = form.querySelector('.err');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      this.say('');
      const values = {};
      Object.keys(fields).forEach(k => { values[k] = fields[k].value; });
      const local = o.check ? o.check(values) : null;
      if (local) { this.say(local.msg); (fields[local.field] || btn).focus(); return; }
      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = t(o.busy);
      o.submit(values).then(res => {
        btn.disabled = false; btn.textContent = label;
        if (res && res.field && fields[res.field]) { fields[res.field].value = ''; fields[res.field].focus(); }
      });
    });
    const first = fields[o.fields[0].id];
    setTimeout(() => first.focus(), 0);
    return fields;
  },

  say(msg) { if (this.err) this.err.textContent = msg ? this.t(msg) : ''; },

  /** What the server's reason codes mean to a trainee. */
  message(reason) {
    return {
      bad: 'That employee ID and password don\'t match.',
      locked: 'Too many wrong tries. Try again later, or ask a trainer to reset your password.',
      throttled: 'Too many wrong tries from this computer. Wait a minute, then try again.',
      busy: 'The training server is busy. Try again in a moment.',
      short: 'Use at least 8 characters.',
      long: 'That password is too long.',
      same: 'Choose a new password, not the one your trainer gave you.',
      expired: 'Your sign-in has expired. Sign in again.'
    }[reason] || 'The training server isn\'t answering.';
  },

  post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', cache: 'no-store', body: JSON.stringify(body) })
      .then(r => r.json().catch(() => ({})).then(b => ({ ok: r.ok, reason: b.reason, mustChange: !!b.mustChange })))
      .catch(() => ({ ok: false, reason: 'network' }));
  },

  showSignIn(msg) {
    this.form({
      title: 'Sign in',
      intro: 'Sign in with your employee ID and password to keep your training progress.',
      button: 'Sign in', busy: 'Signing in…',
      fields: [
        { id: 'id', label: 'Employee ID', auto: 'username' },
        { id: 'password', label: 'Password', type: 'password', auto: 'current-password' }
      ],
      check: (v) => !v.id.trim() ? { field: 'id', msg: 'Type your employee ID.' } : !v.password ? { field: 'password', msg: 'Type your password.' } : null,
      submit: (v) => this.post('api/signin', { id: v.id.trim(), password: v.password }).then(r => {
        if (!r.ok) { this.say(this.message(r.reason)); return { field: 'password' }; }
        if (r.mustChange) { this.showChange(); return null; }
        return this.finish();
      })
    });
    if (msg) this.say(msg);
  },

  showChange() {
    this.form({
      title: 'Choose your password',
      intro: 'You signed in with a temporary password. Choose your own: at least 8 characters, that only you know.',
      button: 'Save and continue', busy: 'Saving…',
      fields: [
        { id: 'password', label: 'New password', type: 'password', auto: 'new-password' },
        { id: 'again', label: 'Type it again', type: 'password', auto: 'new-password' }
      ],
      check: (v) => v.password.length < this.MIN_LEN ? { field: 'password', msg: 'Use at least 8 characters.' }
        : v.password !== v.again ? { field: 'again', msg: 'The two passwords don\'t match.' } : null,
      submit: (v) => this.post('api/password', { password: v.password }).then(r => {
        if (r.ok) return this.finish();
        if (r.reason === 'expired') { this.showSignIn(this.message('expired')); return null; }
        this.say(this.message(r.reason));
        return { field: 'password' };
      })
    });
  },

  /** Signed in: check the server agrees (a browser that blocks cookies would loop here), then let the game boot. */
  finish() {
    return OTR.identity.fetchJSON('api/whoami', 5000).then(who => {
      if (who && who.id) { this.close(); this.done(who); return null; }
      this.showSignIn('This browser didn\'t keep the sign-in. Allow cookies for this site, then sign in again.');
      return null;
    }).catch(() => { this.say(this.message('network')); return null; });
  },

  close() {
    if (this.root) this.root.remove();
    const st = document.getElementById('otr-signin-style');
    if (st) st.remove();
    this.root = this.card = this.err = null;
  },

  /** Sign out (Settings in the hub): the last save reaches the server first, then the sign-in screen comes back. */
  signOut() {
    const save = OTR.save && OTR.save.flush ? Promise.resolve(OTR.save.flush(false)).catch(() => null) : Promise.resolve();
    return save.then(() => fetch('api/signout', { method: 'POST', credentials: 'same-origin', cache: 'no-store' }).catch(() => null))
      .then(() => { window.location.reload(); });
  }
};
