# C-52 cab and handheld review sheet

C-52 remains in progress. These completed native checks and selected captures are available while final High sign clearance and the 224-view rendered resource gate run. No final C-52 performance peak or review-ready claim is made here. The current owner preview has not been updated.

The candidate is `7dcbd2b6`, carrying the current pilot and the pushed B-164/C-49/C-50/C-51 changes, with owned runtime and fixture `f5d4ab68`. The 272-check Low run remains at `8a06a4b2`: the subsequent correction changes only the High instrument hood. Exact source hashes and job scopes are in `manifest.json`.

| Completed validation | Result |
| --- | --- |
| Repository | 81 of 81 suites pass on the current candidate. |
| Low devices, all 12 languages, normal and larger text | 272 checks across 24 layouts pass. |
| High devices, English and Tamil, normal and larger text | 45 checks across four layouts pass. |
| High instrument hood regression | 27 focused checks pass; hiding the hood changes zero pixels inside the instrument face. |
| Compact HUD | 186 checks pass in each quality preset. |
| Physical cab controls | 200 checks pass. |
| Delivery pages | 394 checks pass, including the larger Tamil delivery checks page. |
| Company themes and texture cleanup | 51 checks pass. |
| Cab narration | 19 checks pass. |
| Low sign clearance | 240 approaches and 192 first-day poses pass, with no failures or page errors. |

All device cases keep colour-blind and reduced-motion settings enabled. Choice hit heights stay at least 46 pixels; normal labels stay at least 15 pixels and larger labels at least 17 pixels. The native fixture checks real pointer selection, remapped target selection and numbered choices, not just drawn bounds. The instrument pixel probe also confirms no mission or report change. Reported Three texture counts are two on Low and four on High; these focused observations do not replace the complete resource gate.

The selected captures were inspected for instrument visibility, wrapping, choice separation, focus and footer placement. They are fixed native-browser poses, not an owner driving review. Existing block geometry and the separately logged unsupported address-plate mounting issue remain follow-ups.

| View | Capture |
| --- | --- |
| High physical cab and readable instruments | [Cab](c52-final-design-high-high-en-normal-cab.png) |
| High instruments with live speed, RPM and lighting | [Live instruments](c52-final-design-high-high-en-normal-live-instruments.png) |
| High English handheld and keyboard focus | [Handheld](c52-final-design-high-high-en-normal-handheld.png) |
| High larger Tamil cab | [Cab](c52-final-design-high-high-ta-large-cab.png) |
| High larger Tamil handheld | [Handheld](c52-final-design-high-high-ta-large-handheld.png) |
| Low physical cab | [Cab](c52-final-design-low-low-en-normal-cab.png) |
| Low larger Tamil handheld | [Handheld](c52-final-design-low-low-ta-large-handheld.png) |
| Low larger Malayalam handheld | [Handheld](c52-final-design-low-low-ml-large-handheld.png) |

No new string, control, event type, save field, shared setting, image or render pass was added. Project-made GLSL, Canvas and vector artwork is recorded in ASSETS. The existing Low/High resource ceilings stay unchanged. SwiftShader does not establish the owner's Intel 60 fps floor; O-1 remains. The hourly check-in remains enabled with no end date and was not changed.
