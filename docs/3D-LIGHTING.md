# Lighting and time of day

C-25, 17 October 2026. `src/core/fplighting.js` owns the sky, route lighting and van lamps.
The default uses the existing saved briefing start minute plus mission elapsed time. Morning starts at
06:00, midday at 11:00, dusk at 17:00 and night at 19:00. The first workday keeps its existing start time,
weather and scoring. C-36 supplies the later night scenarios and `drive.lights` grading.

An optional `routePlan.timeOfDay` can pin `morning`, `midday`, `dusk` or `night`. Owned route validation
rejects other values; old checkpoints need no migration. The four presets survive mission restoration.
Trainer rules are cached by the existing `OTR.fp.applyDriveRules` call on launch/resume/Settings return,
using the same `routePlan.day` as before. With `night: false`, a night preset displays morning without
rewriting the saved plan. No settings getters, saved lighting objects or score reports run in this module.

The sky is a two-triangle, texture-free gradient with a sun/moon disc, weather tint and restrained glare.
High adds static stars. Each reflection uses its own camera rotation and field of view. Reduced motion
removes glare; there is no animated sky, screen flash or postprocessing pass. The route fog takes the
horizon colour, and the hub returns to its original neutral lighting.

The physical headlight switch and the existing L shortcut use the same saved van state. Low has one
combined spotlight; High has two. A failed left lamp reduces Low illumination and disables High's left
beam until repair. Headlights use real spot illumination on world surfaces. A reverse spotlight comes
on automatically in R. The rig follows the chassis, independently of head movement and of the van mesh
being hidden in the cab. Cab surfaces dim at dusk/night, with warm interior illumination and readable
instrument shaders. Whole-sentence captions state the time and whether dusk/night headlights are on;
they share the existing accessible, translated sound-cue line.

High uses one 512 × 512 soft directional shadow map. The map covers a bounded 90-metre square, snaps to
texels and refreshes at 8 Hz or after a sufficient position/heading change. Reflection culling temporarily
changes town instance buffers, so the shadow map updates after the main scene, with those buffers restored
and the hidden cab van temporarily visible to cast its shadow. Reflections use the preceding map. The
manual call uses the pinned Three.js r158 shadow renderer; its compatibility is covered by the browser
pixel regression. There is no shadow-only duplicate world. Night disables sun shadows.

High contact occlusion shades ambient light near the van and seven nearby solid footprints, using eight
reused uniforms. Selection is bounded and refreshed every quarter second. This is a simple contact cue,
not a screen-space effect: it allocates no target or texture. Material hooks, sky geometry, lamp rig and
shadow resources are released on world disposal.

Low keeps shadows and contact occlusion off. Its only extra geometry is the sky: at most two calls and
four triangles across the main and one reflected view. It retains two Three.js textures and 3,557,376
estimated attachment bytes at 1280 × 720. High's allocated estimate includes its shadow map. Resource
ceilings, measurements and commands are in `docs/PERF.md`; review evidence is in `docs/review/set-8/c25.md`.
