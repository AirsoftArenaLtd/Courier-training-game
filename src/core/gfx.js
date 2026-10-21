/*
 * Graphics quality: 'high' (the default) or 'low', for computers that struggle.
 *
 * Settings → Graphics sets it (saved with the profile's settings); ?gfx=low or ?gfx=high in the address overrides it
 * for one visit (?gfx=lite: Low with less drawn, B-126). Effects that cost frame time on integrated graphics (moving 3D buildings, the light map, weather
 * on the ground) ask OTR.gfx.high() and fall back to a flat, cheaper version.
 */
window.OTR = window.OTR || {};

OTR.gfx = {
  level() {
    const q = new URLSearchParams(window.location.search).get('gfx');
    if (q === 'low' || q === 'high') return q;
    if (q === 'lite') return 'low';
    const s = OTR.save && OTR.save.data && OTR.save.data.settings;
    return s && s.gfx === 'low' ? 'low' : 'high';
  },
  high() { return this.level() === 'high'; },
  /**
   * B-126 (owner question 8, to try before deciding): ?gfx=lite is Low without the full-screen colour grade and the heat
   * overlays, for a PC without a graphics driver, where each full-screen layer costs about 9 ms a frame (docs/PERF.md).
   * Only the address turns it on; nothing else changes.
   */
  lite() { return new URLSearchParams(window.location.search).get('gfx') === 'lite'; }
};
