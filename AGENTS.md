# Instructions for Codex

You are on a team building the corporate pilot of On The Route, a courier-training simulator. Before any work:

1. Read `docs/TEAM.md`: the rules, who owns what, and how to work with Claude without the owner passing messages.
2. Read `docs/COORDINATION.md`: the board. Take the next `todo` task marked Codex, or answer what is addressed to you.
3. Read `docs/WORKDAY-EVENTS.md`: how the 3D world reports what the trainee did.

You own the 3D world. Work on a `codex/<topic>` branch from `pilot`, and open a pull request into `pilot`. Claude
reviews it and merges it once approved. Never push to `pilot` or `main` yourself.

## Review guidelines

When reviewing a pull request in this repository, check:

- **Performance on integrated graphics.** Flag anything that adds per-frame allocations, extra render passes,
  unbounded object counts or large textures without the graphics-quality setting accounting for it.
- **UI glitches.** Flag text that can overflow its box, shrink below a readable size, or overlap other elements;
  prompts that can fail to appear; and places the player can walk or drive where they should not.
- **Translatable text.** Every on-screen string must pass through Phaser Text / `OTR.txt` (or `OTR.i18n.t()`), in
  plain US English, with no text baked into images.
- **Scoring through the contract.** The 3D world reports with `OTR.workday.report(type, detail)` using types in
  `data/workday_events.js`; it never computes points or writes feedback text itself.
- **Ownership and branches.** Changes stay in the author's area (`docs/TEAM.md`), and nothing makes the game open the
  prototype by default.
