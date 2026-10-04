/*
 * Performance test (index.html?bench=1): plays the heaviest screens one after another on this computer, a few seconds
 * each, and reports the frame rate of every one: the average and the worst 1% of frames (the stutters a trainee
 * feels). The results can be copied and sent, so graphics changes are judged on the machines trainees really have,
 * not on a test machine.
 */
class BenchScene extends Phaser.Scene {
  constructor() { super('BenchScene'); }

  create() {
    OTR.save.ephemeral = true;
    if (!OTR.save.hasProfile()) OTR.save.data.profile = { name: 'Benchmark', createdAt: Date.now() };
    this.items = [
      { label: 'Title screen', key: 'TitleScene' },
      { label: 'Hub', key: 'HubScene' },
      { label: 'Town drive (traffic, driving)', key: 'TownDriveScene', data: { seed: 3, weather: 'clear', tod: 'midday', route: [] }, drive: true },
      { label: 'Town drive in rain at dusk', key: 'TownDriveScene', data: { seed: 4, weather: 'rain', tod: 'dusk', route: [] }, drive: true },
      { label: 'Town drive at night (lights)', key: 'TownDriveScene', data: { seed: 5, weather: 'clear', tod: 'night', route: [] }, drive: true, lights: true },
      { label: 'Road Hazards', scenario: 'm1-driving', drive: true },
      { label: 'Doorstep stop', scenario: 'm5-pod' },
      { label: 'Icy steps stop', scenario: 'm8-steps' },
      { label: 'Conversation', scenario: 'm3-missing' },
      { label: 'Sort belt', scenario: 'm2-sort' },
      { label: 'Pre-trip walkaround', scenario: 'm1-pretrip' },
      { label: 'Loading the truck', scenario: 'm6-load' }
    ];
    this.results = [];
    this.i = -1;
    this.frames = [];
    this.onFrame = (t, d) => { if (this.measuring) this.frames.push(d); };
    this.game.events.on('step', this.onFrame);
    this.events.once('shutdown', () => this.game.events.off('step', this.onFrame));
    this.scene.setVisible(false);
    this.next();
  }

  /** Every running scene but this one. */
  stopOthers() { this.game.scene.getScenes(true).forEach(s => { if (s !== this) this.game.scene.stop(s.sys.settings.key); }); }

  next() {
    this.i++;
    this.stopOthers();
    if (this.i >= this.items.length) { this.show(); return; }
    const it = this.items[this.i];
    const sc = it.scenario && OTR.registry.get(it.scenario);
    if (sc) this.game.scene.start(sc.scene, { scenarioId: it.scenario });
    else this.game.scene.start(it.key, it.data || {});
    this.scene.bringToTop();
    // past any opening card, then (on a drive) rolling, the camera moving as it does in play
    this.time.delayedCall(900, () => this.key('Enter'));
    this.time.delayedCall(1300, () => {
      const s = this.game.scene.getScenes(true).find(x => x !== this);
      if (it.drive && s && s.held) { s.buckled = true; s.started = true; s.held = { KeyW: true }; this.driving = s; if (it.lights) s.lights = true; }
    });
    this.time.delayedCall(2000, () => { this.frames = []; this.measuring = true; });
    this.time.delayedCall(6500, () => {
      this.measuring = false;
      if (this.driving) { this.driving.held = {}; this.driving = null; }
      this.record(it.label);
      this.next();
    });
  }

  key(code) {
    const kc = code === 'Enter' ? 13 : 0;
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, keyCode: kc, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, key: code, keyCode: kc, bubbles: true }));
  }

  record(label) {
    const f = this.frames.slice().sort((a, b) => a - b);
    if (!f.length) { this.results.push({ label, avg: 0, low: 0 }); return; }
    const mean = f.reduce((n, x) => n + x, 0) / f.length;
    const worst = f.slice(Math.floor(f.length * 0.99));
    const worstMean = worst.reduce((n, x) => n + x, 0) / Math.max(1, worst.length);
    this.results.push({ label, avg: Math.round(1000 / mean), low: Math.round(1000 / worstMean) });
  }

  gpu() {
    try {
      const gl = this.game.renderer.gl;
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (gl ? gl.getParameter(gl.RENDERER) : 'Canvas renderer');
    } catch (e) { return 'unknown'; }
  }

  show() {
    this.scene.setVisible(true);
    const W = OTR.W, H = OTR.H;
    this.add.rectangle(W / 2, H / 2, W, H, 0x16062B);
    OTR.txt(this, W / 2, 50, 'PERFORMANCE TEST', 28, '#ffffff', { weight: '900' });
    const gpu = this.gpu();
    OTR.txt(this, W / 2, 86, gpu, 15, '#C9B3F0', { bold: false, fit: W - 80 });
    const lines = [`On The Route performance test · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, `Graphics: ${gpu}`, `Screen: ${window.innerWidth}x${window.innerHeight} at ${window.devicePixelRatio}x`, ''];
    OTR.txt(this, 300, 130, 'SCREEN', 14, '#FF9447', { ox: 0, weight: '900' });
    OTR.txt(this, 780, 130, 'AVERAGE FPS', 14, '#FF9447', { weight: '900' });
    OTR.txt(this, 960, 130, 'WORST 1%', 14, '#FF9447', { weight: '900' });
    this.results.forEach((r, k) => {
      const y = 168 + k * 36;
      const col = (fps) => (fps >= 55 ? '#8BF0C6' : fps >= 40 ? '#FFC83D' : '#FF8A9A');
      OTR.txt(this, 300, y, r.label, 18, '#ffffff', { ox: 0 });
      OTR.txt(this, 780, y, String(r.avg), 20, col(r.avg), { weight: '900' });
      OTR.txt(this, 960, y, String(r.low), 20, col(r.low), { weight: '900' });
      lines.push(`${r.label}: ${r.avg} fps average, ${r.low} worst 1%`);
    });
    OTR.txt(this, W / 2, H - 112, 'Green: smooth (55+) · amber: playable (40+) · red: needs work', 14, '#C9B3F0', { bold: false });
    const text = lines.join('\n');
    this.report = text;
    console.log(text);
    const copy = OTR.ui.button(this, W / 2 - 150, H - 60, 'Copy results', () => {
      const done = () => OTR.ui.toast(this, 'Copied: paste it into a message', { color: 0x16062B, border: 0x2BC48A });
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => window.prompt('Copy these results:', text));
      else window.prompt('Copy these results:', text);
    }, { w: 240, h: 52, skin: 'orange', key: 'ENTER', hint: '⏎' });
    const again = OTR.ui.button(this, W / 2 + 150, H - 60, 'Run again', () => this.scene.restart(), { w: 240, h: 52, skin: 'ghost' });
    OTR.ui.focus(this, [copy, again], { start: 0 });
  }
}
OTR.registerScene(BenchScene);
