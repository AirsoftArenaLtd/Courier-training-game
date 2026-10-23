# Bounded native driving waits — validation in progress

The current native test retains every original verdict and layout assertion. Its protocol timeout now exceeds the individual wait limits. Each reverse approach must reach the same physical target within 30 live game seconds and 15 wall minutes; a stuck vehicle still fails. Actual game seconds, frame counts and wall duration are recorded for every completed bay. Nested Puppeteer causes and actual target/renderer state are retained on failure.

The old High run is separately rejected under diagnostics/high-reverse-wait-b7dc5de8. No cause or corrected acceptance is asserted before the rerun completes. The retained runner runs first, followed sequentially by the three remaining High configurations against the frozen b7dc5de8 candidate.
