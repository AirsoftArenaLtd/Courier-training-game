# B-2 gamepad controller progress

`codex/b2-gamepad` starts from pilot `90844ac5`, independently of the pending graphics/scenario branches. B-1 is ready on `codex/b1-owner-assets` at `b646ee08`; C46's original-id/reverse validation is pushed at `714cc368`. This task remains doing.

The first slice is `src/core/fpgamepad.js`, a pure controller with an injectable `navigator.getGamepads` reader. It considers at most four standard-mapped device slots, retains the selected device while it remains connected, and owns one reusable frame plus fixed axis/button index buffers. Browser-returned Gamepad objects stay outside game/save state.

| API | Behavior |
| --- | --- |
| `OTR.fpGamepad.create(reader)` | Creates a controller; a fake reader can supply Gamepad-like objects in tests |
| `configure(overrides)` | Compiles axis/button indices once; missing values use defaults, -1 disables, malformed/out-of-range values disable that binding |
| `poll(enabled)` | Returns the same borrowed frame with continuous inputs and held/pressed/released action masks |
| `reset()` | Clears commands and requires neutral before accepting more input |
| `dispose()` | Stops API reads and leaves a neutral frame |

Steering, walking and looking use a rescaled stick dead zone; both triggers retain fractional values. Values are finite and clamped. Device connect/replacement, disabled input, reset and remapping all require the relevant controls to return to neutral before accepting input. Holding an action produces one edge. The frame separates continuous trigger/stick input from action edges, so the later adapter can preserve keyboard-held state and existing cab action guards.

Defaults follow the standard browser button layout: right/left triggers accelerate/brake, left stick steers/walks, right stick looks, bottom face button interacts, right face button goes back, left face button changes Drive/Reverse, top face button focuses a target, shoulders operate signals, View opens the handheld and Menu pauses. D-pad up/down are belt/parking-brake controls in the cab and navigation controls in menus; the scene adapter must dispatch only the active context. Stick presses supply careful walking and look-forward. Shared settings can override the mapped indices.

**Seven fake-pad cases pass:** held-input connection protection; fractional axes/triggers and noisy/nonfinite values; focus/modal/reset/reconnect rearming; stable device choice; remap while held and explicitly disabled indices; unavailable/nonstandard/disconnected devices; and 10,000 polls with a stable output frame followed by disposal. Both JS syntax checks and authored whitespace checks pass. Exact hashes and log scope are in `verification.json` and `controller-tests.log`.

The controller is **not loaded by index**. Scene/cab/motor integration, menu routing, real keyboard regression checks, fake-pad browser journeys, final resource evidence and remapping UI/storage remain. No native gameplay or rendering acceptance is claimed for this slice.

Claude's inbox requests the shared Controls/Accessibility writer and saved-settings contract. The proposed optional `a11y.gamepad` stores only overrides: `deadzone`, `axes:{steer,moveY,lookX,lookY}` and `buttons:{throttle,brake,interact,back,gear,focus,signalLeft,signalRight,handheld,pause,handbrake,belt,lookForward,menuUp,menuDown,menuLeft,menuRight,careful}`. Settings must preserve keyboard remaps and existing LMS limits. This branch writes no shared settings/save/UI files.

Independent next work is the owned scene/motor adapter: preserve the exact boolean keyboard path, add optional bounded analogue values, route action edges through the current cab/panel/handheld guards, reset on lifecycle/context changes, and validate real motor behavior with fake pads. Shared storage/UI approval does not block that adapter work.
