# Rejected native reverse fixture

Runtime source `ec9aaeae9461e15208942554d50509a204ccb1be`. The native school test clears the live bus and children, then times out reversing: the staged pre-bay position meets the same still-live departing bus. The real collision response correctly prevents movement. The corrected native test waits for that actor to reach its actual done state before placing the pre-bay pose. It changes no bus state, encounter flag, verdict, score or record.

The served runtime, resource benchmarks and six-ray sign proof remain frozen at ec9aaeae. The corrected native test runs separately from the owned branch; its exact source hash is recorded by the resumed controller. No passed eight-view Low resource evidence or Node baseline is rerun or re-labelled by this test-only fix.
