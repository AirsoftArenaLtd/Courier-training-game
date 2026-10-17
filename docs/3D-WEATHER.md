# Visible weather

C-26, `codex/c26-visible-weather`. Originally stacked on C-25, then updated while unpublished to
pilot `492dcb1` after C-24/C-25 merged. The saved route-day weather, traction, safe speeds, following
rules, heat breaks and scores are unchanged. The first clear morning draws no weather pane or
surface effect with the wipers off. There are no new controls, reports or saved fields.

`src/core/fpweather.js` owns the physical windscreen, material hooks and bounded particle batch.
The existing physical wiper switch and remappable K shortcut clear two swept areas. Droplets
return gradually after switching off. The glass stays on the cab as the driver looks around;
walking and the hub hide it. Snow adds sparse melt droplets and snow/ice add subtle edge frost.
The pane uses one main-view call and two triangles on a dedicated camera layer; reflections do
not render this inside-facing pane. It allocates no image map or render target.

Wet surfaces reflect the current sky and sun analytically, with stronger grazing reflections
and ripples on High. Ice adds blue glossy patches and fine crack/glint cues. Snow adds irregular
coverage on upward-facing ground and roofs, while retaining road markings and access geometry.
The hooks shade eligible surfaces and restore the prior lighting hooks on disposal. Dry worlds
keep their original material shaders. The existing fog near/far ranges remain exactly 6/28 metres
for fog and 12/40 for storms; a small low-height mist cue strengthens depth within that range.

Rain and snow now share a soft billboard batch, with two triangles per particle instead of the
old twelve-triangle cubes. The existing bounds stay at 12 later-day / 18 other Low particles and
36 on High. Snow/ice walking uses four of those slots for cold breath in front of the courier.
Moving vans reuse six slots for spray from the wheels, trailing the actual forward or reverse
travel direction. Ice hides the batch in a stationary cab. The rest of the batch supplies falling
rain/snow; no separate spray or breath draw is added. The particles observe the existing depth fog
and follow the camera as billboards, including the live mirror/rear-camera renders.

All motion follows mission time. Pause freezes it; reduced motion freezes droplet/particle motion
and ripples, parks the blades and keeps clearing functional. Colour filtering runs through the
existing world/Phaser pipeline. The physical switch, keyboard route, larger text and narration
remain the existing cab features. There is no new on-screen text or translation surface.

Only adapter-owned transient state is added. Mission snapshot identity and workday reports remain
unchanged after rendering; the saved wiper boolean restores through the existing checkpoint code.
Weather material hooks, particle GPU buffers, glass geometry/material and the camera layer are
released on disposal, before lighting and cab disposal. The merged mirror/rear/lighting build,
sync and disposal order has been checked and retained.

Both 240,000-view complete-frame Low sweeps pass with wipers on, all control/look poses, loaded
cargo and all four reflection cameras. Loaded assets peak at 64 calls / 1,886 triangles; procedural
fallback peaks at 63 / 1,886. The ceilings remain 64 / 2,500, two Three.js textures, 4 MiB attachments
and 4 MiB estimated Phaser textures. Final rendered measurements and commands are in `docs/PERF.md`;
review images and reports are collected in `docs/review/set-8/c26.md`. Cloud software rendering
cannot establish the native Intel 60 fps gate (the existing O-1 owner check).
