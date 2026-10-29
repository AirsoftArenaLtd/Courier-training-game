# Intermediate school validation — not final acceptance

Source `ef7121e0ff2e6311799df6eb33451ec8c6435b0c`. All 85 non-browser suites pass at this source. The eight Low resource views pass the earlier budget and single-point sightline gate, but visual inspection then found that a mirror covers part of the school-sign wording. The corrected gate requires six clear rays across both text lines, and the parked van starts half a metre farther forward, still fully inside the map. These intermediate reports do not satisfy that stronger wording check.

The first native school preflight passes 83 checks, including the actual bus stop and clear crossing. It then times out while trying to move: the staged crossing pose overlapped the still-live departing bus. The test now waits for the actual bus to clear that approach before moving the van there. No bus state, encounter flag, judgement, score or record is injected by that fix. This is rejected test-development evidence, not a complete native run.

The next frozen source is `ec9aaeae9461e15208942554d50509a204ccb1be`; its Node, resource and native gates are separate.
