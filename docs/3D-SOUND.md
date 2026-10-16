# Sound in the 3D workday

Open H → Settings → Sound settings. Quieter/louder change the existing saved master effects volume in ten-point steps; mute uses the same preference as the main game. Arrow/Enter and number keys work like the other 3D panels. Narration remains controlled in Accessibility. Effects duck while narration is speaking, with the saved volume restored afterward.

The first morning and hub do not start any workday sound source. After a real keyboard/pointer gesture unlocks the shared AudioContext, the active workday uses two continuous sources: a quiet filtered triangle wave for the engine and filtered generated noise for rain/storm. The engine follows speed. Indicators, brakes, cab/house doors, cargo/parcel handling, dog and emergency-vehicle cues are short procedural effects. Scanning keeps the existing procedural beep and visible scanner result. No audio file or outside request is added.

Captions use whole sentences beneath the objective. They wrap at full text size, grow the header and move the mirror below it. They remain visible when effects are muted or AudioContext is unavailable. Loop captions persist while the condition is active; action captions remain briefly. Captions and sound never report scoring events or alter mission state.

Low uses native-resolution text canvases at the same on-screen font size and a vector handheld case with native company-name text. High retains the existing 2x text and painted case. The benchmark now reads intrinsic image/canvas dimensions: Phaser Text can leave stale 1×1 metadata in its texture source. Earlier texture-memory figures based on that metadata undercounted text and are superseded by the corrected C-17 reports. No graphics ceiling was raised.

The controller creates at most six owned audio nodes (two sources, two filters and two gains), both sources starting at zero gain. Gains ramp gently. Pausing, switching tabs or losing focus silences the ambience; shutdown stops/disconnects the sources and removes all owned listeners. Scene restarts keep the shared context and preferences and create a fresh controller. Narration ducking uses the shared master gain and leaves the saved volume intact.

## Verification

- `node test/fpsound.js`: no-audio captions, zero-gain startup, bounded nodes, narration/mute, pause/hidden-tab cleanup, effect rates and saved settings.
- `node test/fpsoundbrowser.js`: real AudioContext waveform, silence during narration/mute, five restarts without accumulating voices/listeners, real-key Settings and reload persistence. The analyser is a test probe; listening level still depends on the user's device.
- `QA_NO_AUDIO=1 node test/fpaccessbrowser.js`: the keyboard workday, scans, signatures, remaps, returns and finish without an AudioContext.
- `QA_TAG=c17 QA_FONT=noto QA_LANGS=en,ta,hi,bn,mr,te,gu,kn,ml,pa,es,fr node test/fpaccesslayout.js`: 288 selected normal/larger layouts, including sound settings and a combined-cue header, with actual canvas texture memory checked against the 4 MiB Low ceiling. Current dictionaries are used; new C-17 text awaits Claude's translation pass.
- `QA_SOUND=1 QA_GFX=low QA_PROTOTYPE_ONLY=1 QA_TAG=c17-final QA_A11Y=large,colour,reduced node test/fpbench.js`: graphics resource gate with the real audio context running.

Shared `audio.js`, `a11y.js` and save/scoring implementations are unchanged; the owned `fpsound.js` adapter uses their existing context and preferences.
