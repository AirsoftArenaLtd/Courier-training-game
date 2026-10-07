/*
 * Company theme: the one file a company edits to brand the game.
 * Colours are 0xRRGGBB numbers. Everything on screen that was once a brand colour reads from here
 * (OTR_DATA.theme.<name>); the defaults are neutral (steel blue and teal), with no company's colours.
 * To brand the game, change the values below (or load a copy of this file in its place).
 */
window.OTR_DATA = window.OTR_DATA || {};

OTR_DATA.theme = {
  // main colour: headers, buttons, panels, the uniform
  primary:      0x1F4E79,
  primaryDark:  0x0E2A47,   // deep backgrounds and shadows
  primaryDeep:  0x081828,   // the darkest background
  primaryNight: 0x0F2038,   // panel gradient ends
  primaryLight: 0x4A86C5,   // highlights and hover
  tint:         0xB8D2EA,   // pale text and lines on dark panels

  // second colour: calls to action, progress, live markers
  accent:       0x0FA3B1,
  accentLight:  0x4DCBD6,
  accentWarm:   0x2FB8C4,
  accentDark:   0x0A6B75,
  accentSoft:   0x9BE0E6,

  // text, panels and backgrounds (a cool blue-grey family)
  ink:          0x0F2030,   // dark text on light panels
  inkSoft:      0x24384C,
  muted:        0x62788E,   // secondary text
  mutedLight:   0x8AA0B6,
  mid:          0x3A6FA0,   // mid-tone panels and strokes
  paper:        0xE9F0F9,   // light panel fill
  paperTint:    0xECF4FF,
  line:         0xD6E2F2,   // light panel borders
  night:        0x061220,   // dark overlays
  nightPanel:   0x0A1C33,
  nightDeep:    0x040D18
};

/* The same colours as CSS strings, for pages that are not Phaser (print views, the page background). */
OTR_DATA.theme.css = function (name) {
  return '#' + OTR_DATA.theme[name].toString(16).padStart(6, '0');
};

/* Page background (css/style.css reads these). */
(function () {
  if (typeof document === 'undefined' || !document.documentElement || !document.documentElement.style) return;   // not a page (Node tests)
  const r = document.documentElement.style;
  r.setProperty('--otr-primary', OTR_DATA.theme.css('primary'));
  r.setProperty('--otr-primary-deep', OTR_DATA.theme.css('primaryDeep'));
})();
