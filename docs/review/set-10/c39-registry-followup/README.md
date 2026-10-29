# C-39 registry follow-up, 27 October 2026

Claude authorized registry edits and confirmed the remaining scoring policy.
The four existing m1 entries now carry their adapter keys in `data/modules.js`:
`pretrip-van`, `route-satnav`, `driving-town-drill`, `hazard-road-clips`. Existing
ids, content, categories, scenes and default presentation are retained.

The optional school proposal cannot yet be applied safely through the shared
path. Its `schoolZoneLesson` data key does not exist. Removing that unused key
instead makes both `registry.content` and `validate.all` throw on `.split`.
The validator also rejects its intentionally absent 2D `scene`, as required by
the agreed new-scenario contract. The earlier native school fixtures directly
started the 3D runner, so they did not certify this shared path.

[probe.json](probe.json) retains those actual failures and exact shared input
hashes. Run `node docs/review/set-10/c39-registry-followup/probe.cjs` to reproduce.
With `--patch`, the probe also regenerates the contained
[shared proposal](shared-optional-support.patch). It evaluates that proposal only
inside an isolated VM: valid optional registered 3D-only entries need no data
key, but an explicit bad key, unregistered adapter, absent runner or a regular
scenario with missing content remains an error. Existing shared files are
untouched. The proposal does not change trainer selection or scenario defaults.

A-30 still needs to select the resolved runner in `flow.startScenario`; its
current source looks up only `sc.scene`. This is a shared integration dependency,
not a request for an owner decision. Claude has the concrete proposal in Inbox
for Claude while owned junction/night work proceeds using the confirmed
`drive.route` efficiency obligation. The school implementation already meets
the confirmed live-encounter / whole-van finish / zero-on-incomplete gate.

All seven relevant Node suites pass (62 cases), including original-score
comparisons and the accepted school completion gate. `registry-delta.json`
compares the actual original registry at `e159deed` with the changed one after
removing only those four adapter keys: every original field matches. No browser
rerun is claimed for this data-only integration slice. Earlier native evidence
keeps its recorded sources.
