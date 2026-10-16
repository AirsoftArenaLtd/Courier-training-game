# Company appearance in the 3D workday

Edit `OTR_DATA.theme` in `data/theme.js`. The existing `primary`, `primaryDark`, `accent`, `paper` and `ink` colours now reach the 3D van livery, depot and handheld. The van body defaults to `paper`; the courier's sleeves default to `primary`.

These optional fields use the same theme object:

```js
companyName: 'Your company name',
logo: 'assets/company-logo.png', // optional local image, including transparent PNG/SVG
logoText: 'YC',                 // optional fallback mark when there is no image
vanBody: 0xE9F0F9,              // optional override of paper
uniform: 0x1F4E79               // optional override of primary
```

An empty company name uses the existing `data/config.js` brand, then “On The Route.” Without a logo, the first letters of the company name form a neutral mark. Existing themes need no new fields. Training cues, such as the barcode, stop lines and warning lamps, retain their own meanings and shapes.

The optional logo is served from the game's origin (or an embedded image). A missing image falls back to the mark; a remote image is not requested. It is fitted into one 256 × 64 Phaser canvas, shared by the visible van-side and depot labels. The physical panels use shared flat materials. Labels follow the van and are hidden on its opposite side or behind solid objects. No Three.js image map or render target is added. The handheld replaces the existing `handheld_body` canvas in place. Its page backgrounds use native graphics; unused generated page images are released while images referenced by other scenes are preserved. Uniform sleeves are visible while carrying and scanning a package.

`node test/fpbranding.js` checks materials, neutral defaults, moving labels and occlusion. `node test/fpbrandingbrowser.js` loads two fictional themes and checks their local logos, handheld pixels, visible labels and resource bounds; screenshots go to `test/out/fp-review/`. For a benchmark, `QA_THEME` accepts a JSON object of theme overrides, alongside the normal options in `docs/FRAME-BUDGET.md`.
