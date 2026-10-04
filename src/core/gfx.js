/*
 * Graphics quality: 'high' (the default) or 'low', for computers that struggle.
 *
 * Settings → Graphics sets it (saved with the profile's settings); ?gfx=low or ?gfx=high in the address overrides it
 * for one visit. Effects that cost frame time on integrated graphics (moving 3D buildings, the light map, weather
 * on the ground) ask OTR.gfx.high() and fall back to a flat, cheaper version.
 */
window.OTR = window.OTR || {};

OTR.gfx = {
  level() {
    const q = new URLSearchParams(window.location.search).get('gfx');
    if (q === 'low' || q === 'high') return q;
    const s = OTR.save && OTR.save.data && OTR.save.data.settings;
    return s && s.gfx === 'low' ? 'low' : 'high';
  },
  high() { return this.level() === 'high'; }
};
