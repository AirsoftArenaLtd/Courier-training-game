# Tamil font diagnosis — 24 October 2026

This read-only probe attached to the already-running owned C-41 review browser. It did not open another
browser, change the game's font, call game actions or write scoring/save data. Temporary offscreen DOM
samples were removed and the diagnostic connection disconnected; the original driver continued normally.

The same Tamil sample was drawn with the unchanged theme stack, explicit Noto Sans Tamil, and the
proposed Noto Sans Tamil prefix followed by the unchanged stack. The existing stack produces boxed glyphs.
CDP reports `NotoSans-Bold` for that sample; the installed font's cmap lacks all fifteen distinct Tamil
codepoints in it. The explicit Tamil font contains them. The standalone and proposed-prefix PNGs are
byte-identical at SHA-256 `e9a94f9756e6897c63f5c4281db67e32b5cb0c10389ec615e5ff29b9d6163c7f` and show readable Tamil. This reproduces
independently of scene transitions and confirms the earlier result-capture observation.

The corrected sample measures 793.218 pixels versus 719.608,
10.23% wider. Existing layout passes with the broken fallback cannot certify the corrected-font
layout. Claude should apply/review an appropriate shared font fix and rerun A-31's Tamil and other affected
layouts before default switching. No Windows/Intel or all-language acceptance is claimed here.

`theme-tamil-font-proposal.patch` is a concrete, **unapplied** one-line proposal in Claude's shared text
factory. It selects an installed script font only for Tamil, retaining the original stack afterward.
`git apply --check` and syntax checking the proposed file pass; there is no production edit or layout
acceptance under that proposal. The patch adds no font asset, texture or render pass. The shared theme,
translations, scoring and saves stay unchanged.

Raw browser font selection, metrics and image hashes are in `c41-font-diagnostic.json`; the installed-font
cmap probe is in `installed-font-coverage.json`. Inspect the three PNGs side by side. The reusable read-only
probe is `test/tools/fp-font-diagnostic.js`: set `QA_DEBUG_PROFILE` to the owned QA browser's temporary profile
directory and run it with `QA_OUT` naming a separate artifact directory. It requires exactly one matching
localhost review page and calls `disconnect`, never `close`, on the existing browser.

The queued duplicate larger-Tamil doorstep journey is superseded by this direct font proof. The existing
eight-layout native run continues unchanged; its photo and old-dialogue follow-ups still validate the new
settled result-capture helper. Preserve their actual protocol hashes separately from the frozen runtime.
