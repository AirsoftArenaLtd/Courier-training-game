/*
 * Trainer tools, behind the PIN (Settings → Trainer tools): the academy's rules on the left, the trainees on the right.
 * On a training server every trainee is listed; otherwise this PC's (or this LMS learner's) trainee.
 * Rules: practice and/or assessment, the pass mark in each category, assessment attempts, the refresher interval.
 */
class TrainerScene extends Phaser.Scene {
  constructor() { super('TrainerScene'); }

  create() {
    const W = OTR.W, H = OTR.H;
    OTR.fx.enter(this);
    this.add.image(W / 2, H / 2, OTR.tex.bg(this, 'trainer_bg', [[0, '#1B2A3A'], [1, '#0B1320']]));
    OTR.tex.shape(this, (g) => { g.fillStyle(0x0B1320, 0.9); g.fillRect(0, 0, W, 64); g.fillStyle(0x3DA5FF, 1); g.fillRect(0, 64, W, 3); });
    const head = OTR.txt(this, 24, 32, 'TRAINER TOOLS', 26, '#ffffff', { ox: 0, weight: '900' });
    const where = OTR.identity.mode === 'server' ? 'training server · settings apply to every trainee'
      : OTR.identity.mode === 'scorm' ? 'learning system · settings apply on this PC' : 'this PC only';
    OTR.txt(this, 24 + head.width + 18, 34, where, 15, '#9CC8F0', { ox: 0, bold: false });
    this.focusables = [];
    // Done locks the tools again (the PIN is forgotten): a trainee who sits down next can't walk in
    this.focusables.push(OTR.ui.button(this, W - 110, 32, 'Done', () => { OTR.academy.pin = null; OTR.fx.transition(this, 'HubScene'); }, { w: 170, h: 44, skin: 'ghost', fontSize: 18, key: 'ESC', hint: 'ESC' }));

    this.draft = JSON.parse(JSON.stringify(OTR.academy.get()));
    this.buildRules();
    this.buildTrainees();
    this.ring = OTR.ui.focus(this, this.focusables, { start: 0 });
  }

  /* ------------------------------------------------------------------ rules */
  buildRules() {
    const x = 34, top = 90, w = 560, h = 604;
    this.add.image(x + w / 2, top + h / 2, OTR.tex.panel(this, w, h, { top: 0xFFFFFF, bottom: 0xEEF4FA, border: 0x9CC8F0, radius: 20 }));
    OTR.txt(this, x + 28, top + 34, 'ACADEMY RULES', 16, '#1B5E9E', { ox: 0, weight: '900' });

    // mode
    OTR.txt(this, x + 28, top + 76, 'What trainees can do', 15, '#243447', { ox: 0, weight: '900' });
    const modes = [['both', 'Both'], ['practice', 'Practice only'], ['assessment', 'Assessment only']];
    this.modeBtns = modes.map(([id, label], i) => {
      const b = OTR.ui.button(this, x + 108 + i * 172, top + 116, label, () => { this.draft.mode = id; this.refreshRules(); }, { w: 160, h: 44, skin: 'ghost', fontSize: 15 });
      b.mode = id;
      this.focusables.push(b);
      return b;
    });

    // pass mark per category
    OTR.txt(this, x + 28, top + 172, 'Pass mark (stars needed in each category a scenario tests)', 15, '#243447', { ox: 0, weight: '900', fit: w - 56 });
    this.passTexts = {};
    OTR.scoring.CATS.forEach((c, i) => {
      const y = top + 214 + i * 50;
      const def = OTR_DATA.config.categories[c];
      OTR.txt(this, x + 48, y, def.label, 16, OTR.color.css(OTR.color.shade(def.color, -0.25)), { ox: 0, weight: '900' });
      this.focusables.push(OTR.ui.button(this, x + 250, y, '−', () => this.step(['passStars', c], -1, 1, 3), { w: 44, h: 40, skin: 'ghost', fontSize: 22 }));
      this.passTexts[c] = OTR.txt(this, x + 320, y, '', 18, '#243447', { weight: '900' });
      this.focusables.push(OTR.ui.button(this, x + 390, y, '+', () => this.step(['passStars', c], 1, 1, 3), { w: 44, h: 40, skin: 'ghost', fontSize: 22 }));
    });

    // attempts and refresher
    OTR.txt(this, x + 28, top + 386, 'Assessment attempts per scenario', 15, '#243447', { ox: 0, weight: '900' });
    this.focusables.push(OTR.ui.button(this, x + 250, top + 426, '−', () => this.step(['attempts'], -1, 0, 5), { w: 44, h: 40, skin: 'ghost', fontSize: 22 }));
    this.attText = OTR.txt(this, x + 320, top + 426, '', 18, '#243447', { weight: '900' });
    this.focusables.push(OTR.ui.button(this, x + 390, top + 426, '+', () => this.step(['attempts'], 1, 0, 5), { w: 44, h: 40, skin: 'ghost', fontSize: 22 }));
    OTR.txt(this, x + 28, top + 470, 'Refresher quiz after a module is passed', 15, '#243447', { ox: 0, weight: '900' });
    this.focusables.push(OTR.ui.button(this, x + 250, top + 510, '−', () => this.step(['refresherDays'], -15, 15, 180), { w: 44, h: 40, skin: 'ghost', fontSize: 22 }));
    this.refText = OTR.txt(this, x + 320, top + 510, '', 18, '#243447', { weight: '900' });
    this.focusables.push(OTR.ui.button(this, x + 390, top + 510, '+', () => this.step(['refresherDays'], 15, 15, 180), { w: 44, h: 40, skin: 'ghost', fontSize: 22 }));

    this.saveBtn = OTR.ui.button(this, x + w / 2 - 70, top + h - 38, 'Save rules', () => this.saveRules(), { w: 220, h: 50, skin: 'orange', fontSize: 19 });
    this.focusables.push(this.saveBtn);
    this.saveNote = OTR.txt(this, x + w - 24, top + h - 38, '', 14, '#1E9E6B', { ox: 1, weight: '900' });
    this.refreshRules();
  }

  step(path, d, lo, hi) {
    let o = this.draft;
    for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
    const k = path[path.length - 1];
    o[k] = Math.max(lo, Math.min(hi, (o[k] || 0) + d));
    OTR.audio.play('pop');
    this.refreshRules();
  }

  refreshRules() {
    const d = this.draft;
    this.modeBtns.forEach(b => b.setSkin(b.mode === d.mode ? 'purple' : 'ghost'));
    OTR.scoring.CATS.forEach(c => this.passTexts[c].setText(`${d.passStars[c]} ★`));
    this.attText.setText(d.attempts ? String(d.attempts) : 'no limit');
    this.refText.setText(`${d.refresherDays} days`);
    const same = JSON.stringify(d) === JSON.stringify(OTR.academy.get());
    this.saveNote.setText(same ? 'Saved' : 'Not saved yet').setColor(same ? '#1E9E6B' : '#B26A00');
  }

  saveRules() {
    this.saveNote.setText('Saving…').setColor('#7A8CA0');
    OTR.academy.saveSettings(this.draft).then(res => {
      if (res === true) { OTR.audio.play('success'); this.refreshRules(); } else { OTR.audio.play('fail'); this.saveNote.setText(res).setColor('#C8243B'); }
    });
  }

  /* ------------------------------------------------------------------ trainees */
  buildTrainees() {
    const x = 614, top = 90, w = 632, h = 604;
    this.tx = x; this.ttop = top; this.tw = w; this.th = h;
    this.add.image(x + w / 2, top + h / 2, OTR.tex.panel(this, w, h, { top: 0xFFFFFF, bottom: 0xEEF4FA, border: 0x9CC8F0, radius: 20 }));
    OTR.txt(this, x + 28, top + 34, OTR.identity.mode === 'server' ? 'TRAINEES' : 'THIS TRAINEE', 16, '#1B5E9E', { ox: 0, weight: '900' });
    this.list = this.add.container(0, 0);
    this.page = 0;
    if (OTR.identity.mode === 'server') {
      // a server with employee accounts: the trainer makes them here (docs/SIGN-IN.md)
      if (OTR.identity.accounts) this.focusables.push(OTR.ui.button(this, x + w - 112, top + 34, 'New account', () => this.newAccount(), { w: 190, h: 40, skin: 'purple', fontSize: 15 }));
      this.status = OTR.txt(this, x + w / 2, top + 120, 'Loading…', 16, '#7A8CA0', { bold: false });
      this.loadTrainees();
    } else {
      this.localTrainee();
    }
  }

  loadTrainees() {
    OTR.academy.trainerApi('trainees').then(list => {
      this.trainees = list;
      this.status.setText(list.length ? '' : 'Nobody has trained on this server yet.');
      this.drawPage();
    }).catch(e => this.status.setText(String(e.message || e)).setColor('#C8243B'));
  }

  drawPage() {
    const x = this.tx, top = this.ttop, w = this.tw, per = 7;
    this.list.removeAll(true);
    (this.pageBtns || []).forEach(b => { const i = this.focusables.indexOf(b); if (i >= 0) this.focusables.splice(i, 1); b.destroy(); });
    this.pageBtns = [];
    const rows = this.trainees.slice(this.page * per, this.page * per + per);
    const total = OTR.registry.all().length;
    rows.forEach((t, i) => {
      const y = top + 84 + i * 66;
      this.list.add(OTR.tex.shape(this, (g) => { g.fillStyle(0x1B5E9E, i % 2 ? 0.04 : 0.08); g.fillRoundedRect(x + 18, y - 28, w - 36, 58, 10); }));
      const nm = OTR.txt(this, x + 34, y - 10, t.name, 17, '#243447', { ox: 0, weight: '900' });
      if (nm.width > 250) nm.setScale(250 / nm.width);
      this.list.add(nm);
      const s = t.summary || {};
      const when = t.savedAt ? new Date(t.savedAt).toLocaleDateString() : 'never';
      const sub = OTR.txt(this, x + 34, y + 13, `${t.id !== t.name ? t.id + ' · ' : ''}passed ${s.passed || 0}/${total} · ${s.routeDays || 0} route days · ${when}`, 13, '#5A6B80', { ox: 0, bold: false });
      if (sub.width > w - 290) sub.setScale((w - 290) / sub.width);
      this.list.add(sub);
      if (nm.displayWidth > w - 290) nm.setScale((w - 290) / nm.width);
      const rec = OTR.ui.button(this, x + w - 195, y, 'Record', () => this.openRecord(t.id, t.name), { w: 100, h: 40, skin: 'purple', fontSize: 15 });
      const more = OTR.ui.button(this, x + w - 80, y, 'Manage', () => this.manage(t), { w: 110, h: 40, skin: 'ghost', fontSize: 15 });
      this.pageBtns.push(rec, more);
    });
    const pages = Math.ceil(this.trainees.length / per);
    if (pages > 1) {
      const prev = OTR.ui.button(this, x + 110, top + this.th - 38, '◀ Prev', () => { this.page = Math.max(0, this.page - 1); this.drawPage(); }, { w: 130, h: 44, skin: 'ghost', fontSize: 16 });
      const next = OTR.ui.button(this, x + w - 110, top + this.th - 38, 'Next ▶', () => { this.page = Math.min(pages - 1, this.page + 1); this.drawPage(); }, { w: 130, h: 44, skin: 'ghost', fontSize: 16 });
      prev.setEnabled(this.page > 0); next.setEnabled(this.page < pages - 1);
      this.list.add(OTR.txt(this, x + w / 2, top + this.th - 38, `Page ${this.page + 1} of ${pages}`, 14, '#5A6B80', { bold: false }));
      this.pageBtns.push(prev, next);
    }
    this.focusables.push(...this.pageBtns);
  }

  manage(t) {
    const acct = OTR.identity.accounts && t.account;
    OTR.ui.modal(this, {
      title: t.name, w: acct ? 840 : 560, h: acct ? 360 : 330, escClose: true,
      // one literal, so the catalogue (test/tools/i18n-extract.js) has the whole text to translate
      body: acct ? 'Allow another attempt at every assessment they have not passed, reset all their progress (their old progress is kept on the server as a backup), or give them a new password to sign in with. Do this while they are not signed in.'
        : 'Allow another attempt at every assessment they have not passed, or reset all their progress (their old ' +
        'progress is kept on the server as a backup). Do this while they are not signed in.',
      buttons: [
        { label: 'Back', skin: 'ghost' },
        ...(acct ? [{ label: 'New password', skin: 'purple', onClick: () => this.time.delayedCall(250, () => OTR.ui.confirm(this, `A new password for ${t.name}?`,
          'Their password stops working and they are signed out. They sign in with the temporary password and choose their own.', () =>
            OTR.academy.trainerApi(`accounts/${encodeURIComponent(t.id)}/reset`, 'POST').then(r => this.showTemp(r))
              .catch(e => OTR.ui.toast(this, this.accountError(e), 0xF0435A)), { yes: 'New password' })) }] : []),
        { label: 'Allow retakes', skin: 'purple', onClick: () => this.time.delayedCall(250, () => OTR.academy.trainerApi(`trainees/${encodeURIComponent(t.id)}/allow`, 'POST')
          .then(r => OTR.ui.toast(this, `${t.name}: ${r.allowed} assessment${r.allowed === 1 ? '' : 's'} opened for another attempt`, 0x2BC48A))
          .catch(e => OTR.ui.toast(this, String(e.message || e), 0xF0435A))) },
        { label: 'Reset', skin: 'red', onClick: () => this.time.delayedCall(250, () => OTR.ui.confirm(this, `Reset ${t.name}?`, 'All their stars, assessments and route days start again from nothing.', () =>
          OTR.academy.trainerApi(`trainees/${encodeURIComponent(t.id)}`, 'DELETE').then(() => { OTR.ui.toast(this, `${t.name} was reset`, 0x2BC48A); this.loadTrainees(); })
            .catch(e => OTR.ui.toast(this, String(e.message || e), 0xF0435A)), { yes: 'Reset', danger: true })) }
      ]
    });
  }

  /** A new employee account: their ID, their name, then the temporary password to give them. */
  newAccount() {
    // the server's own rule (server/auth.js, sent with api/whoami); the same rule written out if an older server sent none
    const rule = OTR.identity.idRule || { pattern: '^[a-z0-9][a-z0-9._@-]{0,63}$', chars: '[a-z0-9._@-]', max: 64 };
    const whole = new RegExp(rule.pattern, 'i'), one = new RegExp('^' + rule.chars + '$', 'i');
    OTR.ui.nameEntry(this, { title: 'New account: employee ID', confirm: 'Next', hint: 'Their employee ID · Enter to confirm',
      max: rule.max, chars: one, refused: 'Letters, numbers and . _ @ - only', empty: 'Type their employee ID first',
      onDone: (id) => {
        if (!whole.test(id)) { OTR.ui.toast(this, 'An employee ID has letters, numbers and . _ @ - only, with no spaces.', 0xF0435A); return; }
        this.time.delayedCall(200, () => OTR.ui.nameEntry(this, { title: 'Their name', confirm: 'Create',
          onDone: (name) => OTR.academy.trainerApi('accounts', 'POST', { id, name })
            .then(r => { this.showTemp(r); this.loadTrainees(); })
            .catch(e => OTR.ui.toast(this, this.accountError(e), 0xF0435A)) }));
      } });
  }

  accountError(e) {
    return { exists: 'There is already an account with that employee ID.', id: 'An employee ID has letters, numbers and . _ @ - only, with no spaces.',
      missing: 'That trainee has no account.' }[e && e.reason] || String((e && e.message) || e);
  }

  /** The temporary password, shown once: the server keeps only its hash. */
  showTemp(r) {
    OTR.ui.modal(this, {
      title: 'Temporary password', w: 620, h: 400, escClose: true,
      body: `Give this to ${r.name || r.id} (employee ID ${r.id}). It works once: they choose their own password when they sign in. It will not be shown again.`,
      build: (box) => {
        const pw = OTR.txt(this, 0, 70, '', 40, OTR_DATA.theme.css('primaryDark'), { weight: '900' });
        pw.noTranslate = true;                 // a password, not words
        pw.setText(r.tempPassword);
        box.add(pw);
      },
      buttons: [{ label: 'Done', skin: 'orange', key: 'ENTER', hint: '⏎' }]
    });
  }

  /** Browser-only or LMS: the one trainee using this PC. */
  localTrainee() {
    const x = this.tx, top = this.ttop, w = this.tw;
    const s = OTR.academy.summary();
    const name = OTR.save.displayName() || 'No trainee yet';
    OTR.txt(this, x + w / 2, top + 110, name, 26, '#243447', { weight: '900', fit: w - 40 });
    OTR.txt(this, x + w / 2, top + 148, `Assessments passed ${s.passed} of ${s.total} · ${(OTR.save.data.route && OTR.save.data.route.days) || 0} route days`, 16, '#5A6B80', { bold: false, fit: w - 40 });
    const cx = x + w / 2;
    this.focusables.push(OTR.ui.button(this, cx, top + 220, 'View record', () => this.openRecord(null, name), { w: 300, h: 52, skin: 'purple', fontSize: 18 }));
    this.focusables.push(OTR.ui.button(this, cx, top + 290, 'Allow retakes', () => {
      let n = 0;
      Object.keys(OTR.save.data.assess || {}).forEach(k => { const r = OTR.save.data.assess[k]; if (r && !r.passed) { r.allowed = (r.allowed || 0) + 1; n++; } });
      OTR.save.write();
      OTR.ui.toast(this, `${n} assessment${n === 1 ? '' : 's'} opened for another attempt`, 0x2BC48A);
    }, { w: 300, h: 52, skin: 'ghost', fontSize: 18 }));
    if (OTR.save.hasProfile()) {
      this.focusables.push(OTR.ui.button(this, cx, top + 360, 'Reset their progress', () => OTR.ui.confirm(this, `Reset ${name}?`,
        'All their stars, assessments and route days start again from nothing.', () => { OTR.save.reset(); this.scene.restart(); }, { yes: 'Reset', danger: true }),
      { w: 300, h: 52, skin: 'red', fontSize: 18 }));
    }
    OTR.txt(this, cx, top + 470, OTR.identity.mode === 'scorm'
      ? 'Progress is kept by the learning system. Its own reports show every learner.'
      : 'Run the academy on a training server to see every trainee here\n(README: "Running it at a company").', 14, '#5A6B80', { bold: false, align: 'center', wrap: w - 60 });
  }

  openRecord(id, name) {
    if (!OTR.game.scene.keys.RecordScene) { OTR.ui.toast(this, 'The trainee record isn\'t available.'); return; }
    OTR.fx.transition(this, 'RecordScene', { traineeId: id, name, back: 'TrainerScene' });
  }
}
OTR.registerScene(TrainerScene);
