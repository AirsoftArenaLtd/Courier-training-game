/*
 * Procedural sound effects via Web Audio — no audio files needed.
 * OTR.audio.play('success'), OTR.audio.setMuted(true)
 */
window.OTR = window.OTR || {};

OTR.audio = {
  ctx: null,
  master: null,
  muted: false,
  volume: 0.55,
  _noiseBuf: null,
  _last: {},

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {
      this.ctx = null;
    }
  },

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
  },

  setMuted(m) {
    this.muted = !!m;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
  },

  tone(freq, dur, o) {
    if (!this.ctx || this.muted) return;
    o = o || {};
    const t0 = this.ctx.currentTime + (o.delay || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t0 + dur);
    const vol = o.vol === undefined ? 0.2 : o.vol;
    const atk = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    if (o.filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = o.filter; f.frequency.value = o.filterFreq || 1000;
      g.connect(f); f.connect(this.master);
    } else {
      g.connect(this.master);
    }
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },

  noise(dur, o) {
    if (!this.ctx || this.muted || !this._noiseBuf) return;
    o = o || {};
    const t0 = this.ctx.currentTime + (o.delay || 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 1200, t0);
    if (o.slideTo) f.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
    f.Q.value = o.q || 1;
    const g = this.ctx.createGain();
    const vol = o.vol === undefined ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  },

  /** Continuous filtered-noise ambience: loop('rain'|'wind'|'engine'|'crowd'|'hum', { vol }) */
  _loops: {},
  loop(name, o) {
    o = o || {};
    if (!this.ctx || !this._noiseBuf) return;
    const presets = {
      rain: { type: 'highpass', freq: 1200, q: 0.4, vol: 0.1 },
      wind: { type: 'bandpass', freq: 380, q: 0.6, vol: 0.06, wobble: 0.25 },
      engine: { type: 'lowpass', freq: 160, q: 2, vol: 0.12 },
      crowd: { type: 'bandpass', freq: 900, q: 0.8, vol: 0.03 },
      hum: { type: 'lowpass', freq: 260, q: 1, vol: 0.05 }
    };
    const p = Object.assign({}, presets[name] || presets.hum, o);
    let L = this._loops[name];
    if (!L) {
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuf; src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = p.type; f.frequency.value = p.freq; f.Q.value = p.q;
      const g = this.ctx.createGain(); g.gain.value = 0.0001;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start();
      L = this._loops[name] = { src, f, g };
      if (p.wobble) {
        const lfo = this.ctx.createOscillator(); const lg = this.ctx.createGain();
        lfo.frequency.value = 0.15; lg.gain.value = p.freq * p.wobble;
        lfo.connect(lg); lg.connect(f.frequency); lfo.start();
        L.lfo = lfo;
      }
    }
    if (o.freq) L.f.frequency.setTargetAtTime(o.freq, this.ctx.currentTime, 0.08);
    L.g.gain.setTargetAtTime(p.vol, this.ctx.currentTime, 0.3);
  },

  stopLoop(name) {
    const L = this._loops[name];
    if (!L || !this.ctx) return;
    L.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
    const t = setTimeout(() => {
      try { L.src.stop(); if (L.lfo) L.lfo.stop(); } catch (e) { /* already stopped */ }
    }, 900);
    void t;
    delete this._loops[name];
  },

  play(name, arg) {
    if (!this.ctx || this.muted) return;
    // Throttle identical sounds fired in the same few ms
    const now = performance.now();
    if (this._last[name] && now - this._last[name] < 25) return;
    this._last[name] = now;
    const s = this.sfx[name];
    if (s) s.call(this, arg);
  },

  sfx: {
    hover() { this.tone(1400, 0.035, { type: 'sine', vol: 0.035 }); },
    click() { this.tone(520, 0.07, { type: 'triangle', vol: 0.18, slideTo: 820 }); },
    back() { this.tone(600, 0.08, { type: 'triangle', vol: 0.15, slideTo: 380 }); },
    pop() { this.tone(320, 0.09, { type: 'sine', vol: 0.22, slideTo: 720 }); },
    success() {
      this.tone(660, 0.1, { type: 'triangle', vol: 0.2 });
      this.tone(990, 0.16, { type: 'triangle', vol: 0.2, delay: 0.07 });
    },
    good() {
      this.tone(523, 0.1, { type: 'triangle', vol: 0.18 });
      this.tone(659, 0.1, { type: 'triangle', vol: 0.18, delay: 0.08 });
      this.tone(784, 0.2, { type: 'triangle', vol: 0.18, delay: 0.16 });
    },
    fail() {
      this.tone(220, 0.28, { type: 'sawtooth', vol: 0.09, slideTo: 110, filter: 'lowpass', filterFreq: 900 });
      this.tone(233, 0.28, { type: 'square', vol: 0.05, slideTo: 116, filter: 'lowpass', filterFreq: 700 });
    },
    combo(n) {
      const semis = Math.min(n || 0, 14);
      const f = 440 * Math.pow(2, semis / 12);
      this.tone(f, 0.09, { type: 'square', vol: 0.06, filter: 'lowpass', filterFreq: 3000 });
      this.tone(f * 1.5, 0.12, { type: 'triangle', vol: 0.1, delay: 0.05 });
    },
    star(i) {
      const base = [1046, 1175, 1318, 1568][Math.min(i || 0, 3)];
      this.tone(base, 0.12, { type: 'triangle', vol: 0.18 });
      this.tone(base * 1.5, 0.3, { type: 'sine', vol: 0.12, delay: 0.06 });
      this.noise(0.15, { filter: 'highpass', freq: 6000, vol: 0.05, delay: 0.02 });
    },
    whoosh() { this.noise(0.32, { filter: 'bandpass', freq: 400, slideTo: 2600, q: 0.8, vol: 0.18, attack: 0.08 }); },
    thud() {
      this.tone(140, 0.22, { type: 'sine', vol: 0.45, slideTo: 45 });
      this.noise(0.1, { filter: 'lowpass', freq: 500, vol: 0.2 });
    },
    stamp() {
      this.noise(0.08, { filter: 'lowpass', freq: 1800, vol: 0.35 });
      this.tone(110, 0.15, { type: 'sine', vol: 0.4, slideTo: 60 });
    },
    brake() { this.noise(0.45, { filter: 'bandpass', freq: 3000, slideTo: 1800, q: 6, vol: 0.12 }); },
    horn() {
      this.tone(349, 0.4, { type: 'square', vol: 0.06, filter: 'lowpass', filterFreq: 1400 });
      this.tone(440, 0.4, { type: 'square', vol: 0.06, filter: 'lowpass', filterFreq: 1400 });
    },
    click_dud() { this.noise(0.04, { filter: 'highpass', freq: 2000, vol: 0.15 }); },
    tick() { this.tone(1300, 0.025, { type: 'square', vol: 0.04 }); },
    type() { this.tone(560 + Math.random() * 120, 0.018, { type: 'square', vol: 0.018 }); },
    coin() {
      this.tone(988, 0.06, { type: 'square', vol: 0.05 });
      this.tone(1319, 0.14, { type: 'square', vol: 0.05, delay: 0.06 });
    },
    fanfare() {
      [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.2, delay: i * 0.1 }));
      this.tone(1318, 0.5, { type: 'triangle', vol: 0.18, delay: 0.4 });
    },
    rankup() {
      [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.2, delay: i * 0.09 }));
      [523, 659, 784].forEach(f => this.tone(f * 2, 0.9, { type: 'sine', vol: 0.09, delay: 0.6 }));
      this.noise(0.6, { filter: 'highpass', freq: 7000, vol: 0.05, delay: 0.55 });
    },
    alarm() {
      this.tone(880, 0.12, { type: 'square', vol: 0.06 });
      this.tone(660, 0.12, { type: 'square', vol: 0.06, delay: 0.14 });
    },
    bark() {
      this.noise(0.09, { filter: 'bandpass', freq: 700, q: 2, vol: 0.4 });
      this.tone(300, 0.09, { type: 'sawtooth', vol: 0.1, slideTo: 180, filter: 'lowpass', filterFreq: 1200 });
      this.noise(0.09, { filter: 'bandpass', freq: 750, q: 2, vol: 0.35, delay: 0.16 });
      this.tone(320, 0.09, { type: 'sawtooth', vol: 0.1, slideTo: 190, filter: 'lowpass', filterFreq: 1200, delay: 0.16 });
    },
    strain() {
      this.tone(160, 0.3, { type: 'sawtooth', vol: 0.08, slideTo: 90, filter: 'lowpass', filterFreq: 600 });
      this.noise(0.06, { filter: 'highpass', freq: 3000, vol: 0.2, delay: 0.02 });
    },
    thunder() {
      this.noise(1.6, { filter: 'lowpass', freq: 400, slideTo: 80, vol: 0.5, attack: 0.02 });
    },
    swoosh_up() { this.tone(300, 0.25, { type: 'sine', vol: 0.12, slideTo: 1200 }); },
    buzz() { this.tone(90, 0.3, { type: 'square', vol: 0.05, filter: 'lowpass', filterFreq: 500 }); },
    phone() {
      for (let i = 0; i < 3; i++) this.tone(1200, 0.06, { type: 'square', vol: 0.04, delay: i * 0.1 });
    },
    splash() { this.noise(0.5, { filter: 'bandpass', freq: 1500, slideTo: 500, q: 0.7, vol: 0.25 }); },
    drive() { this.noise(0.6, { filter: 'lowpass', freq: 200, vol: 0.12, attack: 0.1 }); },
    knock() {
      for (let i = 0; i < 3; i++) {
        this.noise(0.05, { filter: 'lowpass', freq: 700, vol: 0.5, delay: i * 0.16 });
        this.tone(120, 0.06, { type: 'sine', vol: 0.35, delay: i * 0.16 });
      }
    },
    doorbell() {
      this.tone(784, 0.5, { type: 'sine', vol: 0.16 });
      this.tone(622, 0.8, { type: 'sine', vol: 0.16, delay: 0.42 });
    },
    buzzer() { this.tone(180, 0.5, { type: 'square', vol: 0.05, filter: 'lowpass', filterFreq: 900 }); },
    door_open() {
      this.noise(0.25, { filter: 'bandpass', freq: 900, q: 3, vol: 0.12, slideTo: 1400 });
      this.tone(90, 0.12, { type: 'sine', vol: 0.2 });
    },
    door_close() {
      this.noise(0.08, { filter: 'lowpass', freq: 600, vol: 0.4 });
      this.tone(80, 0.15, { type: 'sine', vol: 0.3, slideTo: 50 });
    },
    beep() { this.tone(1760, 0.08, { type: 'square', vol: 0.06 }); },
    scan() {
      this.tone(2200, 0.06, { type: 'square', vol: 0.05 });
      this.tone(2640, 0.09, { type: 'square', vol: 0.05, delay: 0.07 });
    },
    error() {
      this.tone(330, 0.12, { type: 'square', vol: 0.06 });
      this.tone(247, 0.2, { type: 'square', vol: 0.06, delay: 0.13 });
    },
    shutter() {
      this.noise(0.04, { filter: 'highpass', freq: 3000, vol: 0.3 });
      this.noise(0.06, { filter: 'bandpass', freq: 1500, vol: 0.2, delay: 0.07 });
    },
    step() { this.noise(0.04, { filter: 'lowpass', freq: 400 + Math.random() * 200, vol: 0.08 }); },
    slip() {
      this.noise(0.3, { filter: 'highpass', freq: 2500, vol: 0.12, slideTo: 5000 });
      this.tone(160, 0.3, { type: 'sine', vol: 0.4, slideTo: 60, delay: 0.25 });
    },
    growl() { this.noise(0.9, { filter: 'lowpass', freq: 180, q: 6, vol: 0.35 }); },
    whimper() { this.tone(1100, 0.3, { type: 'sine', vol: 0.06, slideTo: 800 }); },
    gulp() { this.tone(300, 0.08, { type: 'sine', vol: 0.15, slideTo: 150 }); this.tone(260, 0.08, { type: 'sine', vol: 0.12, slideTo: 130, delay: 0.25 }); },
    paper() { this.noise(0.18, { filter: 'highpass', freq: 3500, vol: 0.1 }); },
    engine_start() {
      this.noise(0.6, { filter: 'lowpass', freq: 300, slideTo: 120, vol: 0.2 });
      this.tone(60, 0.8, { type: 'sawtooth', vol: 0.05, slideTo: 45, filter: 'lowpass', filterFreq: 300 });
    },
    notify() {
      this.tone(988, 0.08, { type: 'sine', vol: 0.12 });
      this.tone(1318, 0.14, { type: 'sine', vol: 0.12, delay: 0.09 });
    }
  }
};
