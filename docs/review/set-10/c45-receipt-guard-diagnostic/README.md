# C45 stale receipt diagnostic — 26 October 2026

The actual owned receipt callback reproduced an error on 629d899a: save the signature widget onDone, close the handheld, invoke the delayed callback. It set receiptSigned true and reopened the closed handheld. This can also arrive after a page/attempt changes. `stale-signature-before.log` is the failing assertion and actual values, with exact pre-correction source retained.

The owned supervisor PID40934 was interrupted by its exact PID before any frozen source/protocol change. It stopped its owned browser/HTTP processes and released the shared browser lock. Its completed or partial Low resource measurements retain their original source scope here and in the previous collector snapshot; they are not acceptance for the following receipt correction.

The correction will bind automatic signature, accessible confirmation and final completion to the current receipt page, active module attempt, same pickup state and open handheld. Tests must cover closed/replaced pages and abandoned attempts. No original scoring, records/defaults or shared handheld/widget source change is needed. C45 stays doing.
