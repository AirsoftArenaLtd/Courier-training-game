# B-2 gamepad integration

`codex/b2-gamepad` starts from pilot `90844ac5`. The owned runtime is integrated and validated; gamepad instructions/remapping UI and the shared bounded settings-persistence contract remain. B-2 stays doing. B-1 remains review on `codex/b1-owner-assets`; the C46 original-id/reversing components retain their separate pushed evidence.

The scene polls the standard browser Gamepad API through `fpgamepad.js` and `fpgamepadscene.js`. Four bounded device slots, one reusable frame, one reusable controls object and fixed binding buffers keep controller work bounded. Keyboard-held state is separate. The selected connected driver keeps ownership across menu, focus and remapping resets. A replacement must return to neutral before producing commands. Shutdown disposes the controller and removes its listeners.

The current motor accepts fractional forward/brake/left/right pressures while retaining the exact original boolean-key path, speed/steering limits, assists, collision checks, reverse creep and cab guards. Gamepad action edges and real keyboard events share `FirstPersonScene.inputAction`; there are no synthetic keyboard events or new scoring rules. D-pad menu navigation cannot toggle cab controls. Mouse-capture loss leaves gamepad menus usable, while window blur/hidden tabs suspend input. Held throttle and action presses cannot leak across context changes.

| Controls | Default standard mapping |
| --- | --- |
| Walk / steer | Left stick |
| Look | Right stick |
| Accelerate / brake | Right / left trigger |
| Interact / back | Bottom / right face button |
| Drive–Reverse / focus a target | Left / top face button |
| Signals | Shoulders |
| Handheld / pause | View / Menu |
| Belt / parking brake | D-pad up / down in the cab; D-pad navigates menus in UI contexts |
| Careful walking / look forward | Stick presses |

`configure(overrides)` compiles only changed bindings. `poll(enabled)` returns the same borrowed frame with continuous inputs and held/pressed/released masks. `reset()` clears commands and requires neutral while retaining a connected driver's slot; disposal or unavailable/disconnected hardware clears the selection. Invalid/out-of-range bindings disable that input; -1 explicitly disables it. The settings reader writes no shared settings/save fields and saves no hardware identity.

## Validation

**274 affected/required CPU cases pass**, composed of 256 unchanged-source motor/mission/cab/mirror/rear/damage/signal/accessibility/world/scoring/save cases and 18 current controller/scene/affinity cases. The current catalogue and English-text assertion guard pass. The original motor and current motor match **57,600 exact states across 288 boolean input histories** spanning gears, assists, braking, traction, loads and a collision wall. Both JS syntax and authored whitespace checks pass.

The first source-frozen browser phase completed **16/16 jobs / 665 assertions**, with all 525 input hashes and artifact hashes verified at completion:

- Eight Low/High × English/Tamil × normal/larger Gamepad-API cases: **272 assertions**, using actual driving, fractional triggers/steering, keyboard override, stopped-gear guards, reverse travel, camera look, pause/handheld navigation, blur/focus and remapped physical keyboard input.
- Four existing keyboard suites: **393 assertions**, covering cab/controls and reload, driving, accessibility/remapping and signal observations.
- Twelve rendered cab/mirror/handheld resource views across the four original quality profiles, including actual reflected pixels and sound.

A separate two-controller regression then exposed loss of ownership when a lower-index pad appeared before a menu reset. The retained `affinity-before.log` fails on the old controller. The focused correction preserves the connected slot across resets and clears it only when appropriate. **20,000 complete single-pad public frames remain exactly identical** before/after this correction, across focus, settings, context resets, identity and disconnect histories.

The current follow-up completes **3/3 jobs / 89 assertions** against all **526 unchanged current inputs**: **21 real two-pad ownership assertions**, plus fresh Low English normal and High Tamil larger driving cases at 34 each. Current core/scene/affinity CPU cases pass 18/18 after the fix. No predecessor is relabelled as a current-source full matrix. Across the two explicit scopes, 19 browser jobs pass 754 assertions. Exact manifests, source hashes and artifact hashes are in `phase-one-summary.json`, `followup-{plan,status}.json` and `integration-verification.json`.

| Retained resource profile | Calls | Triangles | Three textures | Attachments, bytes | Phaser estimate, bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Loaded Low | 41 | 1330 | 2 | 3,557,376 | 1,925,291 |
| Loaded High | 70 | 92730 | 3 | 11,239,424 | 5,530,395 |
| Accessible Low | 41 | 1330 | 2 | 3,557,376 | 1,960,507 |
| Missing-model Low | 34 | 956 | 2 | 3,557,376 | 1,972,891 |

All original ceilings remain unchanged. The 12-view matrix keeps its pre-affinity source map: only the reset helper changed afterward; geometry, assets, render protocol/passes and single-pad public input traces are identical. No repeated full 207-view route gate or Intel 60 fps certification is claimed.

All browsers, both loopback-only HTTP servers and both browser leases are released. An initial all-interface server launch was rejected before execution; the actual validators bind only `127.0.0.1`. Four captures inspected at original resolution are hashed in `visual-review.json`. The existing paused-shift body remains English in larger Tamil, and the current keyboard-only instructions remain visible; shared translation/A31 and the gamepad instruction UI are not claimed complete. This branch does not certify the pending C49/C50/C51/C52 visual stack or production defaults.

## Remaining work

The owned instructions/remapping presentation is next. Claude's inbox requests the shared Controls/Accessibility writer and saved-settings contract: optional `a11y.gamepad` overrides for `deadzone`, `axes:{steer,moveY,lookX,lookY}` and `buttons:{throttle,brake,interact,back,gear,focus,signalLeft,signalRight,handheld,pause,handbrake,belt,lookForward,menuUp,menuDown,menuLeft,menuRight,careful}`. Runtime changes to this reader shape are already tested, including in-place remapping.

Shared persistence needs an explicit bound: `save.js` can delete `settings.a11y` if the SCORM payload remains over its limit. The product UI must preserve keyboard remaps and fit the existing heavy-course cases. No new shared writer or alternative store is introduced here. The next UI slice can proceed against the bounded controller API while Claude supplies that contract; task completion and shared/pilot acceptance remain separate.

The earlier unloaded seven-case controller proof remains historical in `verification.json` and `controller-tests.log`. The current accepted proof is `integration-verification.json`.
