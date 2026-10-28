# B-2 controls screen and raw-input capture

Owned code is pushed at `deba244b` on `codex/b2-gamepad`. Instructions and remapping are reachable through both existing 3D controls and guidance. Button numbers and stick axes can be changed or disabled; dead zones can be adjusted and defaults restored with confirmation. Drafts explicitly apply to this 3D session and disappear on scene recreation. No shared writer, saved payload, alternate store or hardware identity is introduced.

Capture inspects at most four devices, eight axes and 32 buttons, including unassigned physical inputs. It requires neutral on entry, one deliberate input and whole-controller release before committing. Ambiguous gestures, disconnects and focus changes rearm it. Normal gamepad actions remain suppressed during capture; Escape and the visible Cancel choice remain available. Conflicts are rejected only for actions used simultaneously, preserving the original cab/menu D-pad reuse. The shared keyboard map stays untouched.

## Verified scope

- **93 current CPU cases** across seven suites, plus syntax checks and the English-text guard.
- **7/7 native jobs, 489 assertions:** four real controls-screen runs (400), fresh Low/High actual driving (68) and two-controller ownership (21). The UI audits **84 rendered layouts** at 1280×720, EN/TA and normal/larger text, with no text overlap, clipping or effective size under 17px. All new UI translation keys are passed through the existing translation pipeline; new Tamil strings remain English pending Claude.
- **4/4 focused resource jobs, 324 assertions:** 16 menu presentations each, three rendered frames per presentation. All existing Low/High caps pass. No frame-rate or full-route gate is claimed.

| Menu profile | Calls | Triangles | Three textures | Attachments, bytes | Phaser estimate, bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| menu-low-en-0 | 41 | 1236 | 2 | 3557376 | 1772422 |
| menu-high-en-0 | 49 | 65391 | 3 | 11239424 | 6179046 |
| menu-low-ta-1 | 41 | 1236 | 2 | 3557376 | 2031611 |
| menu-high-ta-1 | 49 | 65391 | 3 | 11239424 | 7171718 |

`verification.json` composes the two explicit frozen phases, with 531 and 532 input hashes respectively. `summarize.py` verifies current input and artifact hashes before producing the handoff. Both private servers bind only to 127.0.0.1; all browsers, servers and leases are released. Four captures were inspected at original resolution (`visual-review.json`). The retained first attempt documents a mistaken test gesture, correctly rejected as an action conflict; only the test was corrected.

## Shared handoff and limitations

The freshly extracted catalogue intentionally fails the translation guard: **31 new strings and nine templates** are missing in all eleven translated languages. The exact delta is `catalogue-delta.json`; the full probe log is retained. The probe ran in temporary copies and did not change shared catalogue/translation files. Existing Tamil translations and text-size behavior are exercised; complete Tamil or twelve-language acceptance is not claimed.

B-2 remains blocked on Claude's bounded existing Controls/Accessibility writer and SCORM capacity contract, preserving keyboard remaps, and these translations. `save.js` can discard a11y settings under pressure; this owned UI therefore uses explicitly labeled scene drafts. The earlier motor, single-pad oracle, keyboard and full resource proofs keep their exact historical source scopes in the parent evidence folder. This branch does not certify the pending graphics stack, production defaults or Intel 60fps.
