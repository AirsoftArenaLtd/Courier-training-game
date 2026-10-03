/*
 * Real images in place of the drawn art (docs/art/ has the prompts they are made from).
 *
 * The originals go in assets/img/ (named as the prompt packs say). `node test/tools/pack-art.js` trims each one, scales
 * it to the size the game draws it at (twice over, for sharpness) and writes assets/art-pack.js: the images as data
 * URIs, which every browser lets a WebGL game use, opened from disk or from a server alike (a plain image file opened
 * from disk is off limits to WebGL).
 *
 * OTR.tex.make asks OTR.assets.drawInto() first: if a texture has an image, the image is drawn into the texture's
 * canvas in the box the drawn art used (so every sprite keeps its size and scale), and the drawing is skipped. Any
 * texture without an image keeps its drawing, so images can arrive a few at a time.
 *
 *   ?art=real    prefer the "_real" versions where there are any (to compare the two styles in the game)
 *   ?art=drawn   ignore the images
 */
window.OTR = window.OTR || {};

OTR.assets = {
  /**
   * Image name (file name without .png) → the texture it replaces and the box it fills in that texture's canvas.
   * Vehicles are drawn with a non-uniform scale (a texture squeezed to the vehicle's real width and length), so their
   * box is not the shape they show on screen: `aspect` is the on-screen width : length, mirrors included, that the
   * pack tool checks an image against. `shadow`: true for the usual soft shadow, or [blur, drop, opacity].
   */
  KEYS: (() => {
    // a vehicle fills its texture nearly edge to edge: a wide soft shadow would be cut off at the texture's edges and
    // show as a faint dark rectangle around it, so vehicles get a tight one
    const V = [4, 3, 0.35];
    const K = {
      // the image includes its mirrors, which stick out past the body: the box takes in the whole width the drawn mirrors do
      van_top: { key: 'van_top', box: [-1, 8, 76, 126], shadow: V, aspect: 0.48 },
      ambulance_top: { key: 'ambulance_top', box: [0, 4, 64, 108], shadow: V, aspect: 0.47 },
      bus_top: { key: 'td_bus_0', box: [26, 10, 60, 230], shadow: V, aspect: 0.24 },
      bus_top_arm: { key: 'td_bus_1', box: [0, 10, 86, 230], shadow: V, aspect: 0.34 },
      td_apt: { key: 'td_apt', box: [14, 10, 370, 220], shadow: true },
      td_depot: { key: 'td_depot', box: [16, 12, 660, 380], shadow: true }
    };
    // traffic: one file per colour the town uses
    const cars = { red: 0xC8243B, blue: 0x3DA5FF, white: 0xF4F4F8, green: 0x2BC48A, black: 0x2A2A32, amber: 0xE8A33D };
    Object.keys(cars).forEach(n => { K['car_top_' + n] = { key: 'car_top_' + cars[n], box: [0, 4, 64, 108], shadow: V, aspect: 0.47 }; });
    const B = { house: [[190, 150], [210, 150], [180, 175], [220, 170]], biz: [[320, 220], [260, 250]] };
    B.house.forEach(([w, h], i) => { K['td_house_' + i] = { key: 'td_house_' + i, box: [14, 10, w, h], shadow: true, untinted: true }; });
    B.biz.forEach(([w, h], i) => { K['td_biz_' + i] = { key: 'td_biz_' + i, box: [14, 10, w, h], shadow: true }; });
    [46, 58, 38].forEach((r, i) => { K['td_tree_' + i] = { key: 'td_tree_' + i, box: [12, 12, r * 2, r * 2], shadow: true }; });
    return K;
  })(),

  images: {},      // texture key → decoded HTMLImageElement
  byKey: {},       // texture key → its KEYS entry

  /** Decode the packed images before the game boots. Resolves either way: no pack, or a broken one, means drawn art. */
  load() {
    const pack = window.OTR_ART || {};
    const mode = new URLSearchParams(window.location.search).get('art');
    if (mode === 'drawn') return Promise.resolve();
    const jobs = [];
    Object.keys(this.KEYS).forEach(name => {
      const spec = this.KEYS[name];
      const src = (mode === 'real' && pack[name + '_real']) || pack[name];
      if (!src) return;
      const img = new Image();
      img.src = src;
      jobs.push((img.decode ? img.decode() : Promise.resolve()).then(() => { this.images[spec.key] = img; this.byKey[spec.key] = spec; }).catch(() => {}));
    });
    return Promise.all(jobs);
  },

  has(key) { return !!this.images[key]; },
  /** A texture with an image is already coloured: callers that tint the drawn version leave it alone. */
  tintable(key) { return !(this.images[key] && this.byKey[key].untinted); },

  /** Draw a texture's image into its canvas, in the drawn art's box (with the same soft shadow). False: no image. */
  drawInto(key, ctx) {
    const img = this.images[key];
    if (!img) return false;
    const [x, y, w, h] = this.byKey[key].box;
    const sh = this.byKey[key].shadow;
    if (sh) OTR.cv.shadow(ctx, ...(Array.isArray(sh) ? sh : [12, 5, 0.35]));
    ctx.drawImage(img, x, y, w, h);
    OTR.cv.noShadow(ctx);
    return true;
  }
};
