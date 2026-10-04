/*
 * Real lighting for the town at dusk and after dark: a light map.
 *
 * The screen is multiplied by a picture of how much light reaches each point: the ambient level everywhere (dim and
 * blue at night), brighter wherever a light falls (headlight beams, street lamps, porch lights, tail lights). So a
 * van driving without its headlights really is driving in the dark, and its beams show what is ahead.
 *
 * The light map is a render texture at half the screen's resolution, refilled every frame with a few dozen soft
 * sprites added onto the ambient colour: cheap on integrated graphics. The lights are given in world pixels.
 *
 *   const L = OTR.lighting.install(scene, { tod, weather })   null in daylight (or on the low graphics setting the
 *                                                              ambient darkening alone, with no light map)
 *   L.begin(); L.glow(x, y, r, color, k); L.beam(x, y, heading, length, width, color, k); L.end();
 */
window.OTR = window.OTR || {};

OTR.lighting = {
  RES: 0.5,             // the light map's resolution against the screen's

  /** How dark the time of day and the weather are (0 daylight .. 1 black), and the ambient light's tint. */
  ambient(tod, weather) {
    const T = OTR.scenery.TOD[tod] || OTR.scenery.TOD.midday;
    const dark = Math.min(0.9, T.dark + ({ rain: 0.12, storm: 0.28, cloudy: 0.05, snow: 0.02, fog: 0.08 }[weather] || 0));
    // a little darker than the old flat grade: with real lights in it, the dark between them can be dark
    const k = (ch) => Math.round(255 * (0.45 + 0.55 * ch / 255) * (1 - dark) * (1 - 0.4 * dark));
    const t = T.tint;
    return { dark, color: (k((t >> 16) & 255) << 16) | (k((t >> 8) & 255) << 8) | k(t & 255) };
  },

  /** Whether a drive at this time and weather is dark enough for lights to matter. */
  wanted(tod, weather) { return this.ambient(tod, weather).dark >= 0.2; },

  glowTex(scene) {
    return OTR.tex.make(scene, 'lt_glow', 128, 128, (ctx, w, h) => {
      ctx.fillStyle = OTR.cv.rad(ctx, 64, 64, 0, 64, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.75)'], [0.7, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(0, 0, w, h);
    });
  },

  /** A headlight beam lying along +x from its left-middle: bright near the lamp, fading with distance and to its edges. */
  beamTex(scene) {
    return OTR.tex.make(scene, 'lt_beam', 256, 128, (ctx, w, h) => {
      const img = ctx.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const u = x / w, half = 0.12 + 0.88 * u;                      // the beam spreads as it goes
          const off = Math.abs((y - h / 2) / (h / 2)) / half;
          const across = off >= 1 ? 0 : Math.pow(1 - off * off, 1.5);
          const along = u < 0.04 ? u / 0.04 : Math.pow(1 - (u - 0.04) / 0.96, 1.3);
          const a = Math.round(255 * across * along);
          const i = (y * w + x) * 4;
          d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a;
        }
      }
      ctx.putImageData(img, 0, 0);
    });
  },

  install(scene, o) {
    const amb = this.ambient(o.tod, o.weather);
    if (amb.dark < 0.2) return null;
    const W = OTR.W, H = OTR.H, R = this.RES;
    this.glowTex(scene); this.beamTex(scene);
    const rt = scene.add.renderTexture(0, 0, Math.round(W * R), Math.round(H * R)).setOrigin(0, 0)
      .setScrollFactor(0).setDisplaySize(W, H).setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(o.depth || 699);
    const ADD = Phaser.BlendModes.ADD;
    const L = {
      rt, amb, dark: amb.dark, cam: scene.cameras.main, n: 0,
      begin() {
        const cam = this.cam;
        this.vx = cam.worldView.x; this.vy = cam.worldView.y; this.z = cam.zoom * R;
        this.vw = cam.worldView.width; this.vh = cam.worldView.height;
        rt.fill(amb.color, 1);
        this.n = 0;
      },
      // each light is stamped on its own: added onto what is there (a batch of the same image drew each one's square
      // over the light before it)
      /** A round pool of light of radius r (world px) and strength k (0..1). */
      glow(x, y, r, color, k) {
        if (x + r < this.vx || x - r > this.vx + this.vw || y + r < this.vy || y - r > this.vy + this.vh) return;
        const s = (r * 2 / 128) * this.z;
        rt.stamp('lt_glow', null, (x - this.vx) * this.z, (y - this.vy) * this.z, { scale: s, tint: color, alpha: k, blendMode: ADD });
        this.n++;
      },
      /** A beam from (x, y) along heading (radians), `length` long and `width` wide at its far end. */
      beam(x, y, heading, length, width, color, k) {
        if (x + length < this.vx || x - length > this.vx + this.vw || y + length < this.vy || y - length > this.vy + this.vh) return;
        rt.stamp('lt_beam', null, (x - this.vx) * this.z, (y - this.vy) * this.z,
          { scaleX: length / 256 * this.z, scaleY: width / 128 * this.z, rotation: heading, originX: 0, originY: 0.5, tint: color, alpha: k, blendMode: ADD });
        this.n++;
      },
      end() { },
      destroy() { rt.destroy(); }
    };
    scene.events.once('shutdown', () => L.destroy());
    return L;
  }
};
