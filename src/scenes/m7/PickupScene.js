/*
 * Module 7 · Pickups & Paperwork. Count the pieces against the manifest, inspect each one,
 * check customs paperwork, refuse what can't ship, then capture the pickup signature.
 * Content: data/m7_pickups.js
 *
 * The pieces are staged on the floor in front of the counter, the shipper stands behind it, and the courier
 * comes in from the left. Each piece is decided once: what you accept or refuse at the counter is final.
 */
class PickupScene extends BaseScenarioScene {
  constructor() { super('PickupScene'); }

  create() {
    const C = this.content;
    this.setupBase();
    this.log = new OTR.ScoreLog();
    this.cats = this.scenario ? this.scenario.categories : ['service', 'safety'];
    this.elapsed = 0;
    this.running = false;
    this.manifest = C.manifest;       // corrected if the courier raises a count that doesn't match
    this.counted = {};
    this.decided = {};
    this.docFlags = {};
    this.docDone = false;
    this.countAnswered = false;
    this.finishing = false;

    this.buildWorld();
    this.buildPanel();
    this.showPanel(false);          // the manifest comes up after the shipper has spoken (it showed its steps behind the card)
    this.hud({ score: false, timer: true });

    this.introCard(C.intro.title, C.intro.lines, () => {
      this.running = true;
      this.startTalk();
    }, { h: 460 });
  }

  /* ------------------------------------------------------------------ world */
  buildWorld() {
    const C = this.content;
    const place = C.place || {};
    // wide enough to reach the right-hand edge of the screen once it is shifted to put the counter at x = 700 (at
    // 1600 it stopped 30 px short, a dark strip that showed whenever the side panel stepped aside)
    const I = OTR.scenery.interior(this, { kind: place.kind || 'counter', sign: place.sign || 'PICKUP', accent: place.accent || 0x3DA5FF, w: 1640, counterX: 1050 });
    const offX = 700 - I.layout.counterX;
    const top = OTR.H - I.layout.h;
    this.add.image(offX, top, I.key).setOrigin(0, 0).setDepth(-10);
    this.add.image(offX, top, I.frontKey).setOrigin(0, 0).setDepth(27);
    this.counterX = offX + I.layout.counterX;
    this.counterTopY = top + I.layout.counterTop;

    // the shipper works behind the counter (it hides their legs); the courier stands on the lobby side
    const ship = C.shipper || {};
    this.shipper = OTR.rig.person(this, this.counterX + 60, OTR.H - 6, ship.spec || {}, { scale: 0.78, facing: -1, depth: 26 });
    this.me = OTR.rig.person(this, 190, OTR.H - 4, OTR.hub.playerSpec, { scale: 0.8, facing: 1, depth: 30 });
    this.me.play('idle');

    // The pieces wait in a taped OUTGOING area on the floor in front of the counter (they used to stand in a strip
    // along the bottom edge, easy to take for more of the shop's stock on the shelves behind).
    const floorY = OTR.H - 30;
    OTR.tex.shape(this, (g) => {
      g.lineStyle(4, 0xFFC83D, 0.9);
      g.strokeRect(282, floorY - 150, 626, 162);
    }).setDepth(26);
    OTR.txt(this, 292, floorY - 164, 'OUTGOING — COUNT THESE', 13, '#FFC83D', { ox: 0, weight: '900', stroke: '#1D1030', strokeW: 4 }).setDepth(26);
    // a click on the shelves behind the counter is answered, not ignored
    this.add.zone(700, 250, 900, 300).setInteractive().on('pointerup', () => {
      if (this.running && !this.talkCtl && !this.countAnswered) OTR.ui.toast(this, 'That is the shop\'s own stock. Count what is waiting in the OUTGOING area.', { hold: 2400, y: 672 });
    }).setDepth(-5);
    this.pieces = C.pieces.map(p => Object.assign({}, p));
    this.pieceImgs = {};
    const keys = this.pieces.map(p => this.pieceTex(p));
    const widths = keys.map(k => this.textures.get(k).getSourceImage().width);
    const gap = 16, left = 290, right = 900;
    const total = widths.reduce((a, b) => a + b, 0) + gap * (this.pieces.length - 1);
    const k = Math.min(0.9, (right - left) / total);
    let x = (left + right) / 2 - (total * k) / 2;
    this.pieces.forEach((p, i) => {
      const w = widths[i] * k;
      const img = this.add.image(x + w / 2, floorY, keys[i]).setOrigin(0.5, 1).setScale(k).setDepth(28).setInteractive({ useHandCursor: true });
      img.on('pointerover', () => { img.setTint(0xFFE3C8); this.hover(p, img); });
      img.on('pointerout', () => { img.clearTint(); this.unhover(p); });
      img.on('pointerup', () => this.clickPiece(p));
      this.pieceImgs[p.id] = img;
      const badge = this.add.container(x + w / 2 + w * 0.28, floorY - img.displayHeight + 4).setDepth(29).setVisible(false);
      const g = OTR.tex.shape(this, (g) => { g.fillStyle(0x2BC48A, 1); g.fillCircle(0, 0, 14); });
      badge.add([g,OTR.txt(this, 0, 0, '✓', 15, '#ffffff', { weight: '900' })]);
      p.badge = badge;
      x += w + gap * k;
    });
  }

  pieceTex(p) {
    const dims = { s: [86, 64], m: [116, 86], l: [150, 110], env: [116, 28] }[p.size || 'm'];
    const key = `pu_${p.id}`;
    return OTR.tex.make(this, key, dims[0] + 30, dims[1] + 40, (ctx) => {
      const cv = OTR.cv;
      const issues = p.issues || [];
      const dmg = issues.indexOf('crushed') >= 0 ? 'crushed' : (issues.indexOf('leaking') >= 0 || issues.indexOf('wet') >= 0) ? 'leak' : null;
      if (p.size === 'env') {
        cv.rr(ctx, 4, 12, dims[0], dims[1], 3); ctx.fillStyle = '#F4F1FA'; ctx.fill();
        ctx.fillStyle = '#4D148C'; ctx.fillRect(4, 12, dims[0], 7);
      } else {
        OTR.draw.box(ctx, { fw: dims[0], fh: dims[1], d: 18, x: 4, y: 26, color: p.color || (p.declared ? 0xD8C9A8 : 0xC99A62), damage: dmg });
      }
      const ly = p.size === 'env' ? 18 : 40;
      if (issues.indexOf('no_label') < 0) {
        cv.rr(ctx, 14, ly, dims[0] * 0.62, 26, 2); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.fillStyle = '#1D1030'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        cv.fitText(ctx, `${p.number} ${p.street || ''}`, 18, ly + 9, dims[0] * 0.62 - 8, 12);
        ctx.fillStyle = '#6A5A80';
        cv.fitText(ctx, String(p.city || ''), 18, ly + 20, dims[0] * 0.62 - 8, 10, { weight: '800' });
      }
      // (a missing label is simply not there, and the weight tag is the same for every piece: judging is the
      // trainee's job, not the art's)
      cv.rr(ctx, 14, ly + 30, 52, 18, 3); ctx.fillStyle = '#3A2A50'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 11px "Segoe UI", Arial'; ctx.textBaseline = 'middle';
      ctx.fillText(`${p.weight} LB`, 19, ly + 39);
      (p.marks || []).forEach((m, i) => OTR.draw.mark(ctx, m, dims[0] - 10 - i * 34, ly + 26, 17));
      if (p.intl) {
        cv.rr(ctx, dims[0] - 52, ly - 21, 64, 18, 3); ctx.fillStyle = '#2F6B5A'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '900 10px "Segoe UI", Arial'; ctx.textAlign = 'center';
        ctx.fillText('CUSTOMS', dims[0] - 20, ly - 12);
      }
    });
  }

  /* ------------------------------------------------------------------ side panel */
  buildPanel() {
    const px = 1108;
    this.panelBg = this.add.image(px, 388, OTR.tex.panel(this, 316, 596, { top: 0x2A0F4F, bottom: 0x1A0733, border: 0x6A45A0, radius: 18 })).setDepth(40);
    this.panel = this.add.container(0, 0).setDepth(41);
    this.px = px;
    this.refreshPanel();
  }

  /**
   * The panel steps aside while the shipper is talking: the conversation's answers and its caption box take the
   * right-hand side of the screen, and used to be drawn straight over the manifest.
   */
  showPanel(on) {
    [this.panelBg, this.panel].forEach(o => {
      this.tweens.killTweensOf(o);
      if (on) { o.setVisible(true); this.tweens.add({ targets: o, alpha: 1, duration: 260 }); }
      else o.setVisible(false).setAlpha(0);
    });
  }

  refreshPanel() {
    const px = this.px, C = this.content;
    this.panel.removeAll(true);
    const add = (o) => { this.panel.add(o); return o; };
    add(OTR.txt(this, px, 116, 'PICKUP MANIFEST', 15, '#FF9447', { weight: '900' }));
    add(OTR.txt(this, px - 132, 152, `Account: ${(C.place && C.place.sign) || ''}`, 14, '#C9B3F0', { ox: 0, bold: false }));
    const corrected = this.manifest !== C.manifest;
    add(OTR.txt(this, px - 132, 178, corrected ? `Manifest: ${this.manifest} pieces (corrected from ${C.manifest})` : `Manifest says: ${this.manifest} piece${this.manifest === 1 ? '' : 's'}`, corrected ? 15 : 17, '#ffffff', { ox: 0, weight: '900', wrap: 272 }));
    const countedN = Object.keys(this.counted).length;
    // the running count only: telling the trainee how many there are would give the exercise away
    add(OTR.txt(this, px - 132, 206, `You've counted: ${countedN} piece${countedN === 1 ? '' : 's'}`, 14, '#8FD3FF', { ox: 0, bold: false }));

    let y = 246;
    if (!this.countAnswered) {
      add(OTR.txt(this, px, y, 'Click each piece waiting for pickup to count it, then confirm your count.', 14, '#F3ECFF', { align: 'center', wrap: 280, bold: false }));
      y += 64;
      const b = OTR.ui.button(this, px, y, 'Confirm the count', () => this.confirmCount(), { w: 280, h: 46, skin: 'orange', fontSize: 16 });
      b.setEnabled(countedN > 0);
      add(b);
    } else {
      const decidedN = Object.keys(this.decided).length;
      add(OTR.txt(this, px - 132, y, `Inspected: ${decidedN} of ${this.pieces.length}`, 15, '#ffffff', { ox: 0, weight: '900' }));
      y += 30;
      this.pieces.forEach(p => {
        const d = this.decided[p.id];
        const col = !d ? '#9A8AB0' : d.accept ? '#8BF0C6' : '#FF9A9A';
        const label = !d ? 'not inspected' : d.accept ? 'accepted' : `refused (${d.reason})`;
        add(OTR.txt(this, px - 132, y, `${p.number ? p.number + ' ' + p.street : 'no label'} · ${label}`, 13, col, { ox: 0, bold: false, wrap: 272 }));
        y += 22;
      });
      y += 10;
      if (C.docs) {
        add(OTR.ui.button(this, px, y + 16, this.docDone ? 'Paperwork checked ✓ (re-read)' : 'Check the paperwork', () => this.openDocs(), { w: 280, h: 44, skin: this.docDone ? 'ghost' : 'purple', fontSize: 15 }));
        y += 56;
      }
      const fin = OTR.ui.button(this, px, y + 26, 'Finish the pickup ▶', () => this.finishPickup(), { w: 280, h: 48, skin: 'orange', fontSize: 17 });
      fin.setEnabled(decidedN === this.pieces.length && (!C.docs || this.docDone) && !this.finishing);
      add(fin);
    }
  }

  /** Hovering a piece lifts its label up above it, where it can be read. */
  hover(p, img) {
    this.unhover();
    if (p.issues && p.issues.indexOf('no_label') >= 0) return;
    const w = 264, h = 176;
    const x = OTR.util.clamp(img.x, w / 2 + 12, 940 - w / 2);
    const y = OTR.util.clamp(img.y - img.displayHeight - 14 - h / 2, 76 + h / 2, OTR.H);
    this.hoverCard = this.add.image(x, y, OTR.labelArt.key(this, p, w, h)).setDisplaySize(w, h).setDepth(42);
    this.hoverFor = p;
  }

  unhover(p) {
    if (p && this.hoverFor !== p) return;
    if (this.hoverCard) { this.hoverCard.destroy(); this.hoverCard = null; this.hoverFor = null; }
  }

  /* ------------------------------------------------------------------ steps */
  startTalk() {
    const C = this.content;
    if (!C.talk) { this.showPanel(true); return; }
    this.me.face(this.shipper.x);
    this.showPanel(false);
    this.talkCtl = OTR.talk.run(this, C.talk, {
      cast: { shipper: { name: C.shipper.name, color: 0x3DA5FF, rig: this.shipper } },
      courier: { rig: this.me, name: OTR.save.data.profile ? OTR.save.displayName() : 'You' },
      log: this.log, cats: OTR.scoring.CATS, feedback: 'immediate', depth: 3000,
      onEnd: () => { this.talkCtl = null; this.refreshPanel(); this.showPanel(true); }
    });
  }

  clickPiece(p) {
    if (!this.running || this.talkCtl || this.finishing) return;
    if (!this.countAnswered) {
      if (this.counted[p.id]) return;
      this.counted[p.id] = true;
      p.badge.setVisible(true);
      OTR.fx.pop(this, p.badge, 1.3);
      OTR.audio.play('beep');
      this.refreshPanel();
      return;
    }
    const d = this.decided[p.id];
    if (d) { OTR.ui.toast(this, `Already ${d.accept ? 'accepted' : 'refused'}. Your call at the counter is final.`, { hold: 1800, y: 672 }); return; }
    // customs paperwork first: the invoice decides what happens to the pieces
    if (this.content.docs && !this.docDone) { OTR.ui.toast(this, 'Check the paperwork first (right): the invoice decides what happens to these pieces.', { hold: 2600, y: 672 }); return; }
    this.inspect(p);
  }

  /**
   * Reconcile the count. The choices follow what the courier counted against what the manifest says, and
   * exactly one of them is the right call. A short count that is raised gets the shipper's recount ("I make it
   * six") and the counting starts again: a miscount is never a reconciliation, and the shipper only answers what
   * was actually said.
   */
  confirmCount() {
    const C = this.content;
    const k = Object.keys(this.counted).length, M = this.manifest;
    const who = C.shipper.name.split(' ')[0];
    const opts = k === M ? [
      { text: `Sign for ${k}. The count matches the manifest.`, got: 2 },
      { text: `Ask ${who} to recount anyway, just in case.`, got: 1, note: 'Your count matched. A recount costs the shipper time for nothing.' },
      { text: 'Take what\'s here and sort the paperwork out at the station.', got: 0 }
    ] : [
      { text: `Tell ${who} you count ${k}, not ${M}, and ask them to check before you sign.`, got: 2, raise: true },
      { text: `Sign for the manifest number (${M}) — close enough.`, got: 0 },
      { text: 'Take what\'s here and sort the paperwork out at the station.', got: 0 }
    ];
    OTR.ui.modal(this, {
      title: 'Piece count', w: 700, h: 420,
      body: `The manifest says ${M}. You counted ${k}.`,
      buttons: [],
      build: (box, api, w, h) => {
        this.countChoices = OTR.util.shuffle(opts);
        this.countChoices.forEach((o, i) => {
          box.add(OTR.ui.button(this, 0, -h / 2 + 170 + i * 68, `${i + 1}.  ${o.text}`, () => api.close(() => this.answerCount(o)), { w: w - 70, h: 58, skin: 'ghost', fontSize: 15, key: ['ONE', 'TWO', 'THREE'][i] }));
        });
      }
    });
  }

  answerCount(o) {
    const C = this.content;
    const n = this.pieces.length, k = Object.keys(this.counted).length;
    const who = C.shipper.name.split(' ')[0];
    if (o.raise && k < n) {
      // raising it was right, but the count was short: the shipper counts what is there, and you count again
      this.shortRaised = (this.shortRaised || 0) + 1;
      OTR.ui.modal(this, {
        title: 'The count doesn\'t add up', w: 640, h: 320,
        body: `${who} counts the outgoing pieces. "I make it ${n} here, not ${k}. Have another look?"`,
        buttons: [{ label: 'Count again', skin: 'orange', key: ['ENTER', 'SPACE'], onClick: () => this.refreshPanel() }]
      });
      return;
    }
    this.log.check('service', k === n && !this.shortRaised ? 1 : 0, 1, `Counted every piece waiting${this.shortRaised ? ' (on the second try)' : ` (${k} of ${n})`}`, { lesson: 'Count every piece yourself. Your signature on the manifest says you did.' });
    const got = k < n ? 0 : o.got;
    this.log.check('service', got, 2, 'Reconciled the piece count with the manifest', {
      lesson: got < 2 ? (o.note || 'Never sign for a number you did not count. Raise any difference with the shipper there and then.') : null
    });
    this.countAnswered = true;
    const next = () => {
      OTR.ui.toast(this, C.docs ? 'Now check the paperwork (right), then inspect each piece.' : 'Now inspect each piece: click a package to look it over.', { hold: 3000, y: 672 });
      this.refreshPanel();
    };
    if (o.raise && C.recount) {
      this.manifest = C.recount.corrected;
      OTR.ui.modal(this, { title: 'You raised the count', w: 640, h: 300, body: C.recount.text, buttons: [{ label: 'OK', skin: 'orange', key: ['ENTER', 'SPACE'], onClick: next }] });
    } else next();
  }

  inspect(p) {
    const R = OTR_DATA.pickups.reasons;
    const issues = p.issues || [];
    // What there is to see, described the same way for every piece, never the verdict: no "packaging is sound",
    // no "declaration matches". Deciding is the exercise.
    const has = (x) => issues.indexOf(x) >= 0;
    const box = has('crushed') ? 'one edge caved in, re-taped' : has('leaking') ? 'a dark patch spreading at the bottom corner'
      : has('wet') ? 'damp and soft along the bottom' : has('poor_packaging') ? 'thin single-wall carton, no padding, heavy contents'
        : p.size === 'env' ? 'envelope, flat and sealed' : 'corners square, tape intact';
    const label = has('no_label') ? 'none' : has('bad_label') ? 'torn across the address' : 'printed, address and service';
    const noteLines = [
      `Box: ${box}.`,
      `Label: ${label}.`,
      `Scale: ${p.weight} lb.`,
      `Hazard marks: ${(p.marks || []).length ? (p.marks || []).map(m => (m === 'class3' ? 'Class 3 flammable liquid' : m)).join(', ') : 'none'}.`
    ];
    if (p.declared) noteLines.push('Papers: a dangerous goods declaration in the pouch.');
    else if (has('docs')) noteLines.push('Papers: a commercial invoice in the pouch.');
    if (has('hazmat_undeclared')) noteLines.push(p.hint || `Shipper: "${(this.content.dgSaid || 'just a liter of solvent')}".`);

    OTR.ui.modal(this, {
      w: 760, h: 520, escClose: true,
      build: (box, api, w, h) => {
        box.add(OTR.txt(this, 0, -h / 2 + 34, 'INSPECT THIS PIECE', 15, '#FF6600', { weight: '900' }));
        if (issues.indexOf('no_label') < 0) {
          box.add(this.add.image(-w / 2 + 210, -h / 2 + 170, OTR.labelArt.key(this, p, 330, 220)).setDisplaySize(330, 220));
        } else {
          box.add(OTR.tex.shape(this, (g) => {
            g.fillStyle(0xEDE7F6, 1); g.fillRoundedRect(-w / 2 + 45, -h / 2 + 60, 330, 220, 10);
            g.lineStyle(3, 0xE8304A, 1); g.strokeRoundedRect(-w / 2 + 45, -h / 2 + 60, 330, 220, 10);
          }));
          box.add(OTR.txt(this, -w / 2 + 210, -h / 2 + 170, 'NO LABEL', 32, '#C8243B', { weight: '900' }));
        }
        // notes column, padded clear of the modal's right edge
        let y = -h / 2 + 70;
        noteLines.forEach(l => {
          box.add(this.add.image(w / 2 - 318, y + 10, 'ic_flag').setDisplaySize(16, 16).setTint(0xFF6600));
          const t = OTR.txt(this, w / 2 - 300, y, l, 16, '#3A2A50', { ox: 0, oy: 0, bold: false, wrap: 262, lineSpacing: 2 });
          box.add(t);
          y += t.height + 12;
        });
        box.add(OTR.txt(this, w / 2 - 300, Math.min(y + 6, h / 2 - 104), `Service: ${(OTR.labelArt.SERVICE[p.service || 'standard'] || {}).text || ''}`, 14, '#7A6A90', { ox: 0, oy: 0, bold: false, wrap: 262 }));
      },
      // A accepts, R refuses; the reasons are numbered and say what each one covers
      buttons: [
        { label: 'Accept (A)', skin: 'green', key: 'A', onClick: () => this.decide(p, true, null) },
        {
          label: 'Refuse… (R)', skin: 'red', key: 'R', onClick: () => {
            OTR.ui.modal(this, {
              title: 'Why are you refusing it?', w: 720, h: 560, escClose: true,
              buttons: [],
              build: (box2, api2, w2, h2) => {
                R.forEach((r, i) => {
                  const y = -h2 / 2 + 110 + i * 84;
                  box2.add(OTR.ui.button(this, 0, y, `${i + 1}.  ${r.label}`, () => api2.close(() => this.decide(p, false, r.id)), { w: w2 - 80, h: 52, skin: 'ghost', fontSize: 16, key: ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][i] }));
                  box2.add(OTR.txt(this, 0, y + 36, r.desc, 13, '#7A6A90', { bold: false }));
                });
              }
            });
          }
        }
      ]
    });
  }

  decide(p, accept, reason) {
    if (this.decided[p.id]) return;                     // one call per piece
    this.decided[p.id] = { accept, reason };
    const right = accept === p.accept;
    const img = this.pieceImgs[p.id];
    OTR.audio.play(right ? 'success' : 'error');
    if (accept) img.setTint(0xBFF5D8);
    else this.tweens.add({ targets: img, alpha: 0.4, duration: 300 });
    const cat = (p.issues || []).indexOf('hazmat_undeclared') >= 0 ? 'safety' : 'service';
    const name = p.number ? `${p.number} ${p.street}` : 'the unlabeled piece';
    // A piece that was fine: its `why` says why it was fine, which reads as praise out of context
    const lesson = right ? null : p.accept ? `This one was fine to ship (${p.why.replace(/\.$/, '')}). Refusing a good piece fails the customer.` : p.why;
    // Never averaged away: undeclared dangerous goods or a failed customs invoice sent into the network, or a
    // correctly declared dangerous-goods shipment turned away
    const critical = !right && (accept ? (p.reason === 'DG' || p.reason === 'DOC') : p.service === 'hazmat');
    this.log.check(cat, right ? 2 : 0, 2, `${accept ? 'Accepted' : 'Refused'} ${name}`, { lesson, feedback: p.why, critical });
    let reasonRight = true;
    if (!accept && p.accept === false) {
      reasonRight = reason === p.reason;
      this.log.check('service', reasonRight ? 1 : 0, 1, 'Gave the right refusal reason', { lesson: reasonRight ? null : `The right reason here was "${(OTR_DATA.pickups.reasons.find(r => r.id === p.reason) || {}).label}".` });
    }
    // say straight away when a call was wrong, and why: a report at the end is too late to learn from
    if (!right) OTR.ui.toast(this, `✗  ${p.accept ? 'That piece was fine' : 'Should have been refused'}: ${p.why}`, { border: 0xF0435A, hold: 4200, size: 17, y: 672 });
    else if (!reasonRight) OTR.ui.toast(this, `Right to refuse it, wrong reason: it was "${(OTR_DATA.pickups.reasons.find(r => r.id === p.reason) || {}).label}".`, { border: 0xFFB020, hold: 3800, size: 17, y: 672 });
    this.refreshPanel();
  }

  /** The invoice. After the findings are in it opens again read-only, with them marked, to re-read while deciding. */
  openDocs() {
    const D = this.content.docs;
    const readOnly = this.docDone;
    const flags = this.docFlags;
    OTR.ui.modal(this, {
      // as tall as its lines (a fuller invoice has eleven)
      w: 820, h: Math.min(OTR.H - 40, Math.max(600, 210 + D.fields.length * 40)), escClose: true,
      build: (box, api, w, h) => {
        box.add(OTR.tex.shape(this, (g) => {
          g.fillStyle(0xFFFFFF, 1); g.fillRoundedRect(-w / 2 + 30, -h / 2 + 30, w - 60, h - 120, 10);
          g.lineStyle(2, 0xC9B3F0, 1); g.strokeRoundedRect(-w / 2 + 30, -h / 2 + 30, w - 60, h - 120, 10);
        }));
        box.add(OTR.txt(this, 0, -h / 2 + 58, D.title, 22, '#250849', { weight: '900' }));
        box.add(OTR.txt(this, 0, -h / 2 + 84, readOnly ? 'Your findings are marked in red.' : D.instructions, 14, '#7A6A90', { bold: false }));
        let y = -h / 2 + 116;
        D.fields.forEach((f, i) => {
          const row = this.add.container(0, y + 18);
          const rg = OTR.tex.liveShape(this);
          const draw = () => rg.redraw((g) => {
            const on = !!flags[i];
            g.fillStyle(on ? 0xFFE0E6 : 0xF6F1FD, 1); g.fillRoundedRect(-w / 2 + 50, -17, w - 100, 34, 8);
            g.lineStyle(2, on ? 0xE8304A : 0xE0D4F2, 1); g.strokeRoundedRect(-w / 2 + 50, -17, w - 100, 34, 8);
          });
          draw();
          row.add(rg);
          row.add(OTR.txt(this, -w / 2 + 66, 0, f.label, 14, '#7A6A90', { ox: 0 }));
          row.add(OTR.txt(this, -w / 2 + 300, 0, f.value, 15, '#250849', { ox: 0, weight: '900' }));
          if (!readOnly) {
            const hit = this.add.zone(0, 0, w - 100, 34).setInteractive({ useHandCursor: true });
            hit.on('pointerup', () => { flags[i] = !flags[i]; draw(); OTR.audio.play(flags[i] ? 'beep' : 'click'); });
            row.add(hit);
          }
          box.add(row);
          y += 40;
        });
      },
      buttons: readOnly ? [{ label: 'Close', skin: 'orange', key: ['ENTER', 'SPACE'] }] : [{
        label: 'Submit findings', skin: 'orange', key: 'ENTER', onClick: () => {
          if (this.docDone) return;
          let hits = 0, misses = 0, falsePos = 0;
          D.fields.forEach((f, i) => {
            if (f.bad && flags[i]) hits++;
            else if (f.bad && !flags[i]) misses++;
            else if (!f.bad && flags[i]) falsePos++;
          });
          const bad = D.fields.filter(f => f.bad).length;
          const missed = D.fields.filter((f, i) => f.bad && !flags[i]);
          const wrong = D.fields.filter((f, i) => !f.bad && flags[i]);
          this.log.check('service', Math.max(0, hits - falsePos), bad, `Found the customs paperwork problems (${hits}/${bad})`, {
            lesson: misses ? missed[0].why : (falsePos ? 'Flagging correct lines slows the shipper down: check carefully before you reject something.' : null)
          });
          this.docDone = true;
          // what was missed, and what was flagged but fine (those cost a point, and used to go unmentioned)
          const parts = [];
          if (missed.length) parts.push('You missed:\n' + missed.map(f => `• ${f.label}: ${f.why}`).join('\n'));
          if (wrong.length) parts.push('Flagged but fine:\n' + wrong.map(f => `• ${f.label}: ${f.okWhy || 'nothing wrong with this line'}`).join('\n'));
          OTR.ui.modal(this, {
            title: `${hits} of ${bad} problems found`, w: 700, h: 460,
            body: parts.length ? parts.join('\n\n') : 'Every problem on the invoice was caught, and nothing else was flagged. That shipment will clear customs once it is fixed.',
            bodySize: 16,
            buttons: [{ label: 'OK', skin: 'orange', key: ['ENTER', 'SPACE'] }]
          });
          this.refreshPanel();
        }
      }]
    });
  }

  finishPickup() {
    if (this.finishing) return;
    this.finishing = true;
    this.unhover();
    this.refreshPanel();
    const accepted = this.pieces.filter(p => this.decided[p.id] && this.decided[p.id].accept);
    const refused = this.pieces.length - accepted.length;
    // the handheld is only a receipt here: no TAB toggling it back up over the report
    this.hh = this.hh || new OTR.Handheld(this, { depth: 2600, clock: () => '—', tabVisible: () => false, canToggle: () => false });
    this.hh.setTabVisible(false);
    if (!accepted.length) {
      // nothing is going: there is nothing to sign for, but the refusal is recorded
      this.hh.open({
        title: 'PICKUP EXCEPTION', color: 0xC8243B,
        lines: [
          { text: 'No pieces accepted', bold: true },
          { text: `${refused} refused — the shipper keeps them`, color: '#C8243B' },
          'Exception recorded against the pickup.'
        ],
        options: [{ label: 'Done', onPick: () => { this.hh.close(); this.endScenario(); } }]
      });
      return;
    }
    this.shipper.play('sign');
    this.hh.open({
      title: 'PICKUP RECEIPT', color: 0x1E9E6B,
      lines: [
        { text: `${accepted.length} piece${accepted.length === 1 ? '' : 's'} accepted`, bold: true },
        { text: `${refused} refused`, color: '#C8243B' },
        `${this.content.shipper.name} signs for the pickup.`
      ],
      widget: { type: 'signature', onDone: () => { this.shipper.play('idle'); } },
      options: [{ label: 'Done', onPick: () => { this.hh.close(); this.endScenario(); } }]
    });
  }

  endScenario() {
    if (this.cats.indexOf('efficiency') >= 0) {
      const par = this.content.par || 200;
      // speed only counts as far as the piece calls were right (PRP-14)
      const calls = this.log.filter(it => /^(Accepted|Refused) /.test(it.label));
      const accuracy = calls.length ? calls.filter(it => it.good).length / calls.length : 1;
      const time = this.elapsed <= par ? 1 : this.elapsed <= par * 1.5 ? 0.5 : 0;
      this.log.check('efficiency', Math.round(OTR.scoring.gateTime(time, accuracy) * 2), 2, `Worked the pickup in good time (${Math.round(this.elapsed)}s)`,
        { lesson: accuracy < 1 ? 'Speed only counts when the calls are right: check every piece before you accept or refuse it.' : null });
    }
    const ratios = this.log.ratios(this.cats);
    this.running = false;
    this.finish({ score: this.log.score(), ratios, log: this.log, lessons: this.content.keyLessons || [], stats: { log: this.log.toJSON() } }, 400);
  }

  update(time, delta) {
    if (!this.running || this.finished) return;
    this.elapsed += delta / 1000;
    this.setTimer(this.elapsed, this.elapsed > (this.content.par || 200));
  }
}
OTR.registerScene(PickupScene);
