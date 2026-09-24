/*
 * Conversation / situation overlay usable on top of any scene (stage stays visible).
 *
 *   const ctl = OTR.talk.run(scene, graph, {
 *     cast: { dana: { name: 'Dana', color: 0xC8243B, rig, moodStart: -2 } },
 *     courier: { rig, name },
 *     log, cats: ['service', 'safety'], feedback: 'immediate' | 'deferred',
 *     flags: {}, acts: { knock(arg, done) { ...; done(); } }, onEnd(node) {}
 *   });
 *
 * Graph nodes
 *   line   { speaker, text, next, expr, anim, act, arg, set, sfx, shake, auto (ms) }
 *   choice { speaker, text, check, choices: [{ text, grade, effects, feedback, lesson, next, set, if, act, arg, expr }], timer, timeout }
 *   branch { if, then, else }       if: 'flag' | '!flag' | ['a', '!b'] (all) | fn(flags)
 *   act    { act, arg, next }
 *   end    { type: 'end', outcome, title, text }
 * Choice order is shuffled. Choices with an `if` that fails are hidden.
 */
window.OTR = window.OTR || {};

OTR.talk = {
  test(cond, flags) {
    if (cond === undefined || cond === null) return true;
    if (typeof cond === 'function') return !!cond(flags);
    if (Array.isArray(cond)) return cond.every(c => OTR.talk.test(c, flags));
    if (typeof cond === 'string') return cond[0] === '!' ? !flags[cond.slice(1)] : !!flags[cond];
    return true;
  },

  run(scene, graph, o) {
    const ctl = new OTR.TalkController(scene, graph, o || {});
    ctl.start();
    return ctl;
  },

  /** Exhaustive best-path points per category (used for validation and ratio denominators). */
  maxPoints(graph, cats) {
    const memo = {};
    const best = (id, depth) => {
      if (depth > 200) return {};
      if (memo[id]) return memo[id];
      const n = graph.nodes[id];
      const zero = {};
      cats.forEach(c => { zero[c] = 0; });
      if (!n || n.type === 'end') return zero;
      let out;
      if (n.choices) {
        out = {};
        cats.forEach(c => { out[c] = -Infinity; });
        n.choices.forEach(ch => {
          const sub = best(ch.next, depth + 1);
          cats.forEach(c => { out[c] = Math.max(out[c], sub[c] + Math.max(0, (ch.effects && ch.effects[c]) || 0)); });
        });
      } else if (n.if !== undefined && n.then) {
        const a = best(n.then, depth + 1), b = n.else ? best(n.else, depth + 1) : zero;
        out = {};
        cats.forEach(c => { out[c] = Math.max(a[c], b[c]); });
      } else {
        out = best(n.next, depth + 1);
      }
      memo[id] = out;
      return out;
    };
    return best(graph.start, 0);
  }
};

OTR.TalkController = class {
  constructor(scene, graph, o) {
    this.scene = scene;
    this.graph = graph;
    this.o = o;
    this.flags = o.flags || {};
    this.cast = o.cast || {};
    this.moods = {};
    Object.keys(this.cast).forEach(k => { this.moods[k] = this.cast[k].moodStart || 0; });
    this.depth = o.depth || 3000;
    this.mode = 'idle';
    this.done = false;
    this.history = [];
    this.root = scene.add.container(0, 0).setDepth(this.depth).setScrollFactor(0);
    this.build();
    this.handlers = [];
    const key = (name, fn) => { this.handlers.push([name, OTR.onKey(scene, name, fn)]); };
    key('keydown-SPACE', () => this.advance());
    key('keydown-ENTER', () => this.advance());
    ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((k, i) => key('keydown-' + k, () => { if (this.mode === 'choices' && this.cards[i]) this.pick(i); }));
  }

  build() {
    const s = this.scene;
    this.catcher = s.add.zone(OTR.W / 2, OTR.H / 2, OTR.W, OTR.H).setInteractive().setScrollFactor(0);
    this.catcher.on('pointerup', () => this.advance());
    this.root.add(this.catcher);

    this.panel = s.add.container(0, 0);
    const g = OTR.tex.shape(s, (g) => {
      g.fillStyle(0x0E0620, 0.86); g.fillRoundedRect(24, 566, OTR.W - 48, 140, 18);
      g.lineStyle(2, 0x6A45A0, 0.8); g.strokeRoundedRect(24, 566, OTR.W - 48, 140, 18);
      g.fillStyle(0xFF6600, 1); g.fillRect(44, 566, 120, 3);
    });
    this.panel.add(g);
    this.nameBg = OTR.tex.liveShape(s);
    this.nameText = OTR.txt(s, 0, 0, '', 18, '#ffffff', { weight: '900' });
    this.panel.add([this.nameBg, this.nameText]);
    this.lineText = OTR.txt(s, 56, 600, '', 22, '#F4ECFF', { ox: 0, oy: 0, bold: false, wrap: OTR.W - 150, lineSpacing: 5 });
    this.panel.add(this.lineText);
    this.arrow = s.add.image(OTR.W - 60, 684, 'ic_arrow').setDisplaySize(20, 20).setTint(0xFF6600).setAngle(90).setVisible(false);
    s.tweens.add({ targets: this.arrow, y: 690, duration: 380, yoyo: true, repeat: -1 });
    this.panel.add(this.arrow);
    this.root.add(this.panel);
    this.panel.setAlpha(0).setY(30);
    s.tweens.add({ targets: this.panel, alpha: 1, y: 0, duration: 240, ease: 'Cubic.out' });

    this.choiceLayer = s.add.container(0, 0);
    this.coachLayer = s.add.container(0, 0);
    this.root.add([this.choiceLayer, this.coachLayer]);

    this.pointer = s.add.image(0, 0, 'ic_arrow').setDisplaySize(26, 26).setTint(0xFF6600).setAngle(90).setDepth(this.depth - 1).setVisible(false);
    this.pointerTw = s.tweens.add({ targets: this.pointer, displayHeight: 22, duration: 300, yoyo: true, repeat: -1 });
    this._upd = () => this.trackPointer();
    s.events.on('update', this._upd);
    // a restart or quit from the pause menu mid-conversation ends the scene without finishing the talk: unhook
    // then too (the frame listener used to outlive the scene, one more per restart)
    this._shutdown = () => this.destroy();
    s.events.once('shutdown', this._shutdown);
  }

  start() { this.goto(this.graph.start); }

  /* ------------------------------------------------------------ flow */
  goto(id) {
    if (this.done) return;
    const n = this.graph.nodes[id];
    if (!n) { console.warn('[talk] missing node', id); this.finish({ type: 'end', outcome: 'mixed' }); return; }
    this.node = n;
    this.nodeId = id;
    if (n.set) Object.assign(this.flags, n.set);
    if (n.sfx) OTR.audio.play(n.sfx);
    if (n.shake) OTR.fx.shake(this.scene, 260, 0.008);
    if (n.type === 'end') { this.finish(n); return; }
    if (n.if !== undefined && n.then) { this.goto(OTR.talk.test(n.if, this.flags) ? n.then : n.else); return; }
    const afterAct = () => {
      if (n.effects) this.applyEffects(n.effects, n.check || null, null);
      if (n.text === undefined && !n.choices) { this.goto(n.next); return; }
      this.say(n, () => {
        if (n.choices) this.showChoices(n);
        else if (n.auto) this.scene.time.delayedCall(n.auto, () => { if (this.node === n) this.goto(n.next); });
        else { this.mode = 'line'; this.arrow.setVisible(true); this.onAdvance = () => this.goto(n.next); }
      });
    };
    if (n.act) this.runAct(n.act, n.arg, afterAct);
    else afterAct();
  }

  runAct(name, arg, cb) {
    const fn = this.o.acts && this.o.acts[name];
    if (!fn) { console.warn('[talk] missing act', name); cb(); return; }
    if (fn.length >= 2) {
      this.mode = 'acting';
      this.setPanelVisible(false);
      let called = false;
      fn(arg, () => { if (called) return; called = true; this.setPanelVisible(true); cb(); }, this);
    } else {
      fn(arg, null, this);
      cb();
    }
  }

  setPanelVisible(v) {
    this.scene.tweens.add({ targets: this.panel, alpha: v ? 1 : 0, duration: 160 });
    if (!v) this.pointer.setVisible(false);
  }

  who(key) {
    if (key === 'courier') return { name: (this.o.courier && this.o.courier.name) || 'You', color: 0xFF6600, rig: this.o.courier && this.o.courier.rig };
    if (key === 'narrator' || !key) return null;
    return this.cast[key] || { name: key, color: 0x4D148C };
  }

  say(n, onDone) {
    const w = this.who(n.speaker);
    this.speakerRig = w && w.rig;
    Object.keys(this.cast).forEach(k => { const r = this.cast[k].rig; if (r && r.talk) r.talk(false); });
    if (this.o.courier && this.o.courier.rig) this.o.courier.rig.talk(false);
    if (w && w.rig) {
      if (n.expr) w.rig.setExpression && w.rig.setExpression(n.expr);
      else if (n.speaker !== 'courier' && this.cast[n.speaker]) this.applyMoodExpr(n.speaker);
      if (n.anim) w.rig.play(n.anim);
      if (w.rig.talk) w.rig.talk(true);
    }
    this.nameText.setText(w ? w.name : '');
    const tw = this.nameText.width + 36;
    this.nameBg.redraw((g) => {
      if (!w) return;
      g.fillStyle(w.color || 0x4D148C, 1);
      g.fillRoundedRect(44, 548, tw, 34, 12);
    });
    if (w) this.nameText.setPosition(44 + tw / 2, 565);
    this.lineText.setFontStyle(w ? 'normal' : 'italic');
    this.lineText.setColor(w ? '#F4ECFF' : '#C9B3F0');
    this.type(n.text || '', onDone);
  }

  type(text, onDone) {
    this.mode = 'typing';
    this.arrow.setVisible(false);
    this.full = text;
    this.chars = 0;
    this.typing = true;
    this.typeDone = onDone;
    if (this.typeEv) this.typeEv.remove();
    this.lineText.setText('');
    this.typeEv = this.scene.time.addEvent({
      delay: 15, loop: true, callback: () => {
        this.chars = Math.min(this.full.length, this.chars + 1);
        this.lineText.setText(this.full.slice(0, this.chars));
        if (this.chars % 3 === 0) OTR.audio.play('type');
        if (this.chars >= this.full.length) this.finishTyping();
      }
    });
  }

  finishTyping() {
    if (!this.typing) return;
    this.typing = false;
    if (this.typeEv) { this.typeEv.remove(); this.typeEv = null; }
    this.lineText.setText(this.full);
    if (this.speakerRig && this.speakerRig.talk) this.scene.time.delayedCall(250, () => { if (!this.typing && this.speakerRig && this.speakerRig.talk) this.speakerRig.talk(false); });
    const cb = this.typeDone; this.typeDone = null;
    if (cb) cb();
  }

  advance() {
    if (this.done || this.scene.scene.isPaused()) return;
    if (this.typing) { this.finishTyping(); return; }
    if ((this.mode === 'line' || this.mode === 'coach') && this.onAdvance) {
      const fn = this.onAdvance; this.onAdvance = null;
      this.arrow.setVisible(false);
      OTR.audio.play('click');
      fn();
    }
  }

  trackPointer() {
    const r = this.speakerRig;
    if (!r || !r.c || !r.c.active || this.mode === 'acting' || this.done) { this.pointer.setVisible(false); return; }
    const cam = this.scene.cameras.main;
    const h = (r.headHeight ? r.headHeight() : 280) * r.baseScale;
    this.pointer.setVisible(true).setPosition(r.x, r.y - h - 22);
    this.pointer.setScrollFactor(1);
    void cam;
  }

  /* ------------------------------------------------------------ choices */
  showChoices(n) {
    this.mode = 'choices';
    const s = this.scene;
    this.choiceLayer.removeAll(true);
    this.cards = [];
    const visible = n.choices.filter(ch => OTR.talk.test(ch.if, this.flags));
    const list = n.noShuffle ? visible : OTR.util.shuffle(visible);
    this.choiceList = list;
    const w = this.o.choiceWidth || 700;
    const cx = this.o.choiceX || (OTR.W - 28 - w / 2);
    const heights = list.map(ch => {
      const t = OTR.txt(s, 0, 0, ch.text, 19, '#000', { bold: false, wrap: w - 100 });
      const h = Math.max(54, t.height + 24); t.destroy(); return h;
    });
    const gap = 10;
    let y = 552 - heights.reduce((a, b) => a + b + gap, 0);
    const top = y;
    list.forEach((ch, i) => {
      const h = heights[i];
      const c = s.add.container(cx, y + h / 2);
      const bg = OTR.tex.liveShape(s);
      const draw = (hover) => bg.redraw((bg) => {
        bg.fillStyle(hover ? 0x3A1870 : 0x1A0B33, 0.94); bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
        bg.lineStyle(2, hover ? 0xFF6600 : 0x6A45A0, 1); bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
        bg.fillStyle(hover ? 0xFF6600 : 0x4D148C, 1); bg.fillRoundedRect(-w / 2 + 12, -15, 30, 30, 9);
      });
      draw(false);
      const num = OTR.txt(s, -w / 2 + 27, 0, String(i + 1), 16, '#ffffff', { weight: '900' });
      const t = OTR.txt(s, -w / 2 + 56, 0, ch.text, 19, '#F4ECFF', { ox: 0, bold: false, wrap: w - 100, lineSpacing: 2 });
      const hit = s.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true }).setScrollFactor(0);
      hit.on('pointerover', () => { draw(true); OTR.audio.play('hover'); });
      hit.on('pointerout', () => draw(false));
      hit.on('pointerup', () => this.pick(i));
      c.add([bg, num, t, hit]);
      c.hit = hit;
      c.setAlpha(0).setX(cx + 30);
      s.tweens.add({ targets: c, alpha: 1, x: cx, delay: 50 * i, duration: 220, ease: 'Cubic.out' });
      this.choiceLayer.add(c);
      this.cards.push(c);
      y += h + gap;
    });
    if (n.timer) {
      const bar = OTR.ui.bar(s, cx - w / 2 + 20, top - 22, w - 40, 12, { color: (v) => OTR.color.lerp(0xF0435A, 0xFFC83D, v), bgAlpha: 0.55, value: 1 });
      const label = OTR.txt(s, cx, top - 42, n.timerLabel || 'DECIDE!', 15, '#FFC83D', { weight: '900', stroke: '#1D1030', strokeW: 4 });
      this.choiceLayer.add([bar, label]);
      bar.setValue(0, true, n.timer * 1000, 'Linear');
      this.choiceTimer = s.time.delayedCall(n.timer * 1000, () => {
        if (this.mode !== 'choices' || this.node !== n) return;
        this.resolve(Object.assign({ grade: 'bad', text: '(no decision)' }, n.timeout || {}), null);
      });
      this.tickEv = s.time.addEvent({ delay: 1000, repeat: n.timer - 1, callback: () => OTR.audio.play('tick') });
    }
  }

  pick(i) {
    if (this.mode !== 'choices') return;
    this.resolve(this.choiceList[i], this.cards[i]);
  }

  resolve(ch, card) {
    const n = this.node;
    this.mode = 'resolving';
    if (this.choiceTimer) { this.choiceTimer.remove(); this.choiceTimer = null; }
    if (this.tickEv) { this.tickEv.remove(); this.tickEv = null; }
    this.cards.forEach(c => { if (c.hit && c.hit.active) c.hit.disableInteractive(); if (c !== card) this.scene.tweens.add({ targets: c, alpha: 0.2, duration: 140 }); });
    if (card) this.scene.tweens.add({ targets: card, scale: 1.03, duration: 110, yoyo: true });
    this.history.push({ node: this.nodeId, text: ch.text, grade: ch.grade });
    if (ch.set) Object.assign(this.flags, ch.set);
    this.applyEffects(ch.effects || {}, n.check || this.o.checkLabel || 'Conversation choice', ch, n);
    const deferred = this.o.feedback === 'deferred';
    if (!deferred) {
      if (ch.grade === 'good') OTR.audio.play('good');
      else if (ch.grade === 'ok') OTR.audio.play('pop');
      else OTR.audio.play('fail');
    } else OTR.audio.play('click');
    if (ch.expr && this.speakerRig && this.speakerRig.setExpression) this.speakerRig.setExpression(ch.expr);
    const next = () => {
      const go = () => this.goto(ch.next);
      if (ch.act) this.runAct(ch.act, ch.arg, go); else go();
    };
    this.scene.time.delayedCall(deferred ? 200 : 380, () => {
      // Fade out only the cards that were just answered. Skipping the next line can put the next set of
      // choices up before this fade ends, and clearing the whole layer then wiped them out.
      const old = this.choiceLayer.list.slice();
      this.scene.tweens.add({ targets: old, alpha: 0, duration: 150, onComplete: () => old.forEach(o => { if (o.active) o.destroy(); }) });
      if (!deferred && ch.feedback) this.coach(ch, next);
      else next();
    });
  }

  applyEffects(eff, label, ch, node) {
    const log = this.o.log;
    const cats = this.o.cats || OTR.scoring.CATS;
    if (log && node && node.choices) {
      const all = node.choices;
      cats.forEach(cat => {
        const max = Math.max(0, ...all.map(c => (c.effects && c.effects[cat]) || 0), (node.timeout && node.timeout.effects && node.timeout.effects[cat]) || 0);
        const got = eff[cat] || 0;
        const touched = all.some(c => c.effects && c.effects[cat] !== undefined);
        if (!touched) return;
        const feedback = ch && ch.feedback;
        if (max > 0) log.check(cat, got, max, label, { lesson: ch && ch.lesson, feedback, choice: ch && ch.text });
        else if (got < 0) log.penalty(cat, -got, label, { lesson: ch && ch.lesson, feedback });
      });
    } else if (log) {
      cats.forEach(cat => {
        const v = eff[cat];
        if (!v) return;
        if (v > 0) log.bonus(cat, v, label || 'Bonus');
        else log.penalty(cat, -v, label || 'Penalty');
      });
    }
    if (eff.mood) {
      const key = eff.moodTarget || (node && node.speaker && this.cast[node.speaker] ? node.speaker : Object.keys(this.cast)[0]);
      if (key && this.moods[key] !== undefined) {
        this.moods[key] = OTR.util.clamp(this.moods[key] + eff.mood, -3, 3);
        this.applyMoodExpr(key);
        const r = this.cast[key].rig;
        if (r && r.emote && this.o.feedback !== 'deferred') r.emote(eff.mood > 0 ? '♥' : '💢', { color: eff.mood > 0 ? '#FF5C8A' : '#F0435A', size: 22 });
      }
      this.flags['mood_' + key] = this.moods[key];
    }
    if (this.o.onEffects) this.o.onEffects(eff, ch, node);
  }

  applyMoodExpr(key) {
    const c = this.cast[key];
    if (!c || !c.rig) return;
    const m = this.moods[key];
    if (c.rig.setMood && c.dog) { c.rig.setMood(m <= -2 ? 'aggressive' : m >= 1 ? 'friendly' : 'alert'); return; }
    if (!c.rig.setExpression) return;
    c.rig.setExpression(m <= -2 ? 'angry' : m === -1 ? 'annoyed' : m >= 2 ? 'happy' : 'neutral');
  }

  coach(ch, next) {
    this.mode = 'coach';
    const s = this.scene;
    const col = ch.grade === 'good' ? 0x2BC48A : ch.grade === 'ok' ? 0xFFB020 : 0xF0435A;
    const head = ch.grade === 'good' ? '✓  GOOD CALL' : ch.grade === 'ok' ? '~  OKAY, BUT…' : '✗  NOT QUITE';
    const w = 760;
    const body = OTR.txt(s, 0, 0, ch.feedback, 19, '#F4ECFF', { bold: false, wrap: w - 70, lineSpacing: 4 });
    const h = body.height + 90;
    const c = s.add.container(OTR.W / 2, 110 + h / 2);
    const g = OTR.tex.shape(s, (g) => {
      g.fillStyle(0x0E0620, 0.94); g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      g.lineStyle(3, col, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
      g.fillStyle(col, 1); g.fillRoundedRect(-w / 2 + 22, -h / 2 + 16, 190, 32, 16);
    });
    const ht = OTR.txt(s, -w / 2 + 117, -h / 2 + 32, head, 15, '#ffffff', { weight: '900' });
    body.setOrigin(0, 0).setPosition(-w / 2 + 34, -h / 2 + 60);
    const hint = OTR.txt(s, w / 2 - 24, -h / 2 + 32, 'click / SPACE ▶', 13, '#9A8AB0', { ox: 1 });
    c.add([g, ht, body, hint]);
    c.setScale(0.9).setAlpha(0);
    s.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 200, ease: 'Back.out' });
    this.coachLayer.add(c);
    this.onAdvance = () => {
      s.tweens.add({ targets: c, alpha: 0, duration: 140, onComplete: () => c.destroy() });
      next();
    };
  }

  /* ------------------------------------------------------------ end */
  finish(node) {
    if (this.done) return;
    this.done = true;
    this.mode = 'end';
    const s = this.scene;
    this.pointer.setVisible(false);
    Object.keys(this.cast).forEach(k => { const r = this.cast[k].rig; if (r && r.talk) r.talk(false); });
    if (this.o.courier && this.o.courier.rig && this.o.courier.rig.talk) this.o.courier.rig.talk(false);
    s.tweens.add({
      targets: this.root, alpha: 0, duration: 180, onComplete: () => this.destroy()
    });
    if (this.o.onEnd) this.o.onEnd(node, this);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    const s = this.scene;
    if (this.typeEv) this.typeEv.remove();
    if (this.choiceTimer) this.choiceTimer.remove();
    if (this.tickEv) this.tickEv.remove();
    s.events.off('update', this._upd);
    s.events.off('shutdown', this._shutdown);
    this.handlers.forEach(([name, h]) => s.input.keyboard && s.input.keyboard.off(name, h));
    if (this.pointer) this.pointer.destroy();
    if (this.root && this.root.active) this.root.destroy();
  }
};
