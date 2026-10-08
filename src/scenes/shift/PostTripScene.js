/*
 * End of the route day, back at the station, before the debrief: the post-trip. Three calls drawn from the day
 * itself: the fuel left, what happened to the van today (a curb strike or a crash gets reported and checked), and the
 * packages that came back plus the scanner. Each is scored into the day's log.
 */
class PostTripScene extends Phaser.Scene {
  constructor() { super('PostTripScene'); }

  create() {
    const W = OTR.W, H = OTR.H;
    const st = OTR.shift.state;
    if (!st) { this.scene.start('HubScene'); return; }
    OTR.fx.enter(this);
    this.add.image(W / 2, H / 2, OTR.tex.bg(this, 'posttrip_bg', [[0, '#0c1f34'], [0.6, '#26476c'], [1, '#C8703D']]));
    OTR.txt(this, W / 2, 50, 'BACK AT THE STATION', 34, '#ffffff', { weight: '900', shadow: true });
    this.qs = OTR.shift.postTripQuestions(st);
    OTR.txt(this, W / 2, 86, `The post-trip: ${['', 'one thing', 'two things', 'three things', 'four things'][this.qs.length] || this.qs.length + ' things'} before you clock off`, 18, '#FFE3C8', { bold: false });
    // a long day (four hours or more) with no break at all is on the record
    const len = st.clockMin - (8 * 60 + 20);
    if (len >= 240 && !st.breaks && !st.breakChecked) {
      st.breakChecked = true;
      const log = OTR.ScoreLog.from(st.log);
      log.check('safety', 0, 1, 'Took a rest break on a long day', { lesson: 'A short break every couple of hours (water, a stretch) keeps your reactions sharp for the afternoon.' });
      st.log = log.toJSON();
    }
    this.i = 0;
    this.log = OTR.ScoreLog.from(st.log);
    this.body = this.add.container(0, 0);
    this.ask();
  }

  ask() {
    const W = OTR.W, q = this.q = this.qs[this.i];
    this.body.removeAll(true);
    this.answered = false;
    this.body.add(OTR.txt(this, W / 2, 128, `${this.i + 1} of ${this.qs.length} · ${q.topic}`, 15, '#FFC83D', { weight: '900' }));
    this.body.add(this.add.image(W / 2, 214, OTR.tex.panel(this, 1000, 132, { top: 0xFFFFFF, bottom: OTR_DATA.theme.paper, border: OTR_DATA.theme.tint, radius: 18 })));
    const t = OTR.txt(this, W / 2, 214, q.text, 21, OTR_DATA.theme.css('primaryDark'), { weight: '900', align: 'center', wrap: 940, lineSpacing: 4 });
    if (t.height > 112) t.setScale(112 / t.height);
    this.body.add(t);
    this.opts = q.options.map((o, k) => {
      const b = OTR.ui.button(this, W / 2, 330 + k * 76, o, () => this.answer(k), { w: 920, h: 64, skin: 'ghost', fontSize: 18, key: ['ONE', 'TWO', 'THREE'][k], hint: String(k + 1) });
      this.body.add(b);
      return b;
    });
    OTR.ui.focus(this, this.opts, { start: 0 });
  }

  answer(k) {
    if (this.answered) return;
    this.answered = true;
    const W = OTR.W, q = this.q, ok = k === q.correct;
    OTR.audio.play(ok ? 'good' : 'fail');
    this.log.check(q.cat, ok ? 1 : 0, 1, q.label, { lesson: q.lesson, group: 'posttrip' });
    this.opts.forEach((b, j) => { if (j === q.correct) b.setSkin('green'); else if (j === k) b.setSkin('red'); b.setEnabled(false); b.setAlpha(j === q.correct || j === k ? 1 : 0.45); });
    const y = 330 + q.options.length * 76 + 4;
    const why = OTR.txt(this, W / 2, y, (ok ? 'Right. ' : 'Not quite. ') + q.lesson, 17, ok ? '#8BF0C6' : '#FFB3BF', { align: 'center', wrap: 960, bold: false, oy: 0, lineSpacing: 3 });
    this.body.add(why);
    const last = this.i === this.qs.length - 1;
    const next = OTR.ui.button(this, W / 2, Math.min(OTR.H - 40, y + why.height + 42), last ? 'Clock off ▶' : 'Next ▶', () => this.next(), { w: 280, h: 54, skin: 'orange', key: 'ENTER', hint: '⏎', keyAfter: 400 });
    this.body.add(next);
    OTR.ui.focus(this, [next], { start: 0 });
  }

  next() {
    this.i++;
    if (this.i < this.qs.length) { this.ask(); return; }
    const st = OTR.shift.state;
    st.log = this.log.toJSON();
    st.postTrip = true;
    OTR.shift.setPhase(this, 'debrief');
  }
}
OTR.registerScene(PostTripScene);
