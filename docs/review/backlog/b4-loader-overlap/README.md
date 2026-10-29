# B4 loader overlap

Doing on `codex/b4-loader-overlap`, stacked on pushed B4 candidate `96f1fe66`. Start the singleton local glTF loader after manifest validation, while model bytes arrive. Each job retains its original loader await/retry, decoder validation and abort behavior. Asset choices, bytes, first-view graphics and the already queued paired cohort remain unchanged. No measured first-frame improvement is claimed.
