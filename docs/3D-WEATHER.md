# Visible weather: C-26 in progress

`codex/c26-visible-weather` is stacked on pushed C-25 `57273e6`. C-26 remains **doing**.

The first slice adds a physical, texture-free windscreen pane. The existing physical wiper stalk and
K shortcut clear two swept areas; droplets return after switching off. The pane belongs to the cab,
follows its body transform and appears only in the main view. It adds one call and two triangles,
with no new image texture, target or reflection pass. Walking and the hub hide it. The first day's
clear weather still draws no pane with the wipers off.

Rain and wiping follow mission elapsed time. Pausing freezes cosmetic motion. Reduced motion keeps
the blades parked and leaves the clearing effect functional. All runtime weather state belongs to
the adapter; mission checkpoints retain only the existing saved wiper switch. This adds no reports,
scoring rules, Settings or shared save fields.

Initial validation: `test/fpweather.js` has five passing cases; `test/fpweatherbrowser.js` passes 13
Low checks, including real K input, 2,302 changed pixels, restored switch state, no mirror-camera
layer overlap, reduced motion, no new score events and a clean shader/GL error state. The fixed
stationary rain fixture uses 46 calls / 1,260 triangles / two textures / 3,557,376 attachment bytes.
The loaded 162,000-view Low sweep also passes at 62 calls / 2,096 triangles.
These are initial slice checks, not the completed C-26 resource/review gate. C-25's twelve lighting
regressions also pass. Screenshots/reports are under `test/out/fp-review/c26-*` locally.

Remaining work before review:

- Add bounded wet-road reflections/highlights, snow and ice surface cues, breath and tire spray.
- Preserve existing fog/weather rule distances and scores while improving visible depth cues.
- Extend real-browser coverage across all weather states, Low/High and accessible layouts.
- Test the combined C-24/C-25/C-26 renderer. The existing combined CPU peak is 63 calls, so this pane
  uses the final available Low call. Any further Low effects must reuse batches or recover calls.
- Run the full Node, resume and `fpbench` gates, record final figures in `docs/PERF.md`, add the
  screenshot evidence and mark the board review only when the complete task is ready.
