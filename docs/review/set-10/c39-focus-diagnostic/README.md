# Initial-focus diagnostic

Candidate 4306513b cancels the brake hold immediately in a focused startup tab: Phaser game.hasFocus is initially false until a later window focus event. The unchanged browser probe records document.hasFocus() true, document.hidden false, and game.hasFocus false. This failed native run reached 197 checks, not acceptance. The correction reads actual document focus and preserves blur, hidden-tab, release and lifecycle cancellation. Four UI cases now cover the startup discrepancy as well as slow rendering and early cancellation. Current native acceptance is separate.
