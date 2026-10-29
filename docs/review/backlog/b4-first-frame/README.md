# B4: first 3D frame

Claimed from Backlog on current pilot `6ccbd85c`, on `codex/b4-first-frame`. C46’s physical inputs are frozen for browser/resource validation; this independent branch leaves that stack untouched.

The baseline will measure the actual Start/Resume workday action from the 2D hub at Low and High, with native button/confirmation input. It will record asset loading, world construction, first route composite and the first uncovered route frame after Phaser presentation. Cold starts and same-workday warm resumes stay separate. Wall times here are relative software-rendered diagnostics, not Intel O1 acceptance.

Static inspection finds that `FirstPersonScene.create` awaits the full asset preload, builds an initial prototype world, then direct workday/module launch builds its actual world again. This is a candidate to measure; no performance improvement or safe asset deferral is claimed yet. Runtime sources remain unchanged until the baseline is captured. The existing cancellation/context-loss/asset-fallback and graphics-budget behavior must remain intact.
