# Font measurement correction

Three current-source Low protocols passed and remain in `native-low-verified.json`. High stopped at the read-only glyph probe before any gameplay. The diagnostic attached to the existing owned resource browser created the same off-screen Tamil span: Chrome initially returned no platform fonts; after layout/font loading/two animation frames it returned Noto Sans Tamil Bold with 28 glyphs. `font-probe-diagnostic.json` preserves that result.

The helper now waits for layout/font readiness before the same strict family/glyph assertion. It retains the actual Phaser text font and no-theme-override check; no product font, geometry, timing, scoring, camera or input changed. Eight native continuation jobs cover the failed/unstarted scopes; the three passed Low jobs are not repeated. The superseded resource controller had not started; a fresh 32-view plan captures the corrected test helper. These run after C42's active final gate.
