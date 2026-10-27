#!/usr/bin/env python3
"""Verify retained evidence without rerunning or changing a browser verdict."""
import hashlib
import json
import re
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text())


archives = {}
for path in OUT.rglob('*'):
    if path.is_file():
        archives.setdefault(digest(path), str(path.relative_to(ROOT)))

phases = [
    ('before-plan.json', 'before-status.json', 'old pilot baseline, expected failure'),
    ('first-recovery/after-plan.json', 'first-recovery/after-status.json', 'historical first implementation'),
    ('recovery/recovery-plan.json', 'recovery/recovery-status.json', 'old pilot complete recovery'),
    ('recovery/regression-plan.json', 'recovery/regression-status.json', 'old pilot regressions, High exception'),
    ('recovery/budget-plan.json', 'recovery/budget-status.json', 'old pilot resource protocol'),
    ('recovery/layout-plan.json', 'recovery/layout-status.json', 'old pilot High layout only'),
    ('current-pilot/plan.json', 'current-pilot/status.json', 'b27954c4 before two input guards, High exception'),
    ('current-pilot/budget-plan.json', 'current-pilot/budget-status.json', 'b27954c4 before two input guards, resources'),
    ('current-pilot/keyboard/plan.json', 'current-pilot/keyboard/status.json', 'final 1d0b4234 input guards and full recovery'),
    ('lighting-baseline/plan.json', 'lighting-baseline/status.json', 'unchanged 90844ac5 High failure'),
    ('lighting-baseline/current-pilot/plan.json', 'lighting-baseline/current-pilot/status.json', 'unchanged b27954c4 High failure'),
]
verified = []
for plan_name, status_name, scope in phases:
    plan, status = read(OUT / plan_name), read(OUT / status_name)
    archived = {}
    for name, expected in plan['sources'].items():
        path = ROOT / name
        if not path.is_file() or digest(path) != expected:
            assert expected in archives, (plan_name, name)
            archived[name] = archives[expected]
    count = 0
    for job in status['jobs']:
        assert not job.get('changedSources'), (status_name, job['tag'])
        for artifact in job['artifacts']:
            path = (OUT / status_name).parent / 'artifacts' / artifact['file']
            assert digest(path) == artifact['sha256'], path
            count += 1
    assert status['serverExited'] and status['leaseReleased'], status_name
    verified.append(dict(plan=plan_name, scope=scope, inputs=len(plan['sources']),
                         artifacts=count, archivedInputs=archived, phase=status['phase']))

current = read(OUT / 'current-pilot/status.json')
final = read(OUT / 'current-pilot/keyboard/status.json')
assert final['phase'] == 'complete' and all(j['accepted'] for j in final['jobs'])
assert [j['accepted'] for j in current['jobs']] == [True, True, True, True, False]
assert sum(j['checks'] for j in current['jobs']) == 352
assert sum(j['checks'] for j in final['jobs']) == 196
assert not verified[8]['archivedInputs'], 'Final frozen sources must still match the worktree'

cpu = {}
for suite in ['firstperson', 'fpaccess', 'fpcab', 'keyboard-after', 'fpdriving',
              'fplighting', 'fpmirrors', 'fpmission', 'fprear', 'fpsignal',
              'fpsound', 'fpworld', 'workday', 'savesize']:
    log = (OUT / 'current-pilot' / (suite + '.log')).read_text()
    assert re.search(r'ℹ fail 0\b', log), suite
    cpu[suite] = int(re.search(r'ℹ pass (\d+)', log)[1])
assert sum(cpu.values()) == 251

budget = read(OUT / 'current-pilot/budget-status.json')
assert budget['phase'] == 'complete' and all(j['accepted'] for j in budget['jobs'])
profiles = {j['tag']: j['peak'] for j in budget['jobs']}
for job in final['jobs']:
    report = read(OUT / 'current-pilot/keyboard/artifacts' / job['tag'] / (job['tag'] + '.json'))
    assert report['complete'] and not report['errors']
    if 'resources' in report:
        before, restored = report['resources'][:2]
        assert restored['mirror']['filled'] == 7
        assert all(b > a for a, b in zip(before['mirror']['updates'][:3], restored['mirror']['updates'][:3]))

assert read(OUT / 'current-pilot/catalogue-delta.json') == {'strings': [], 'templates': []}
summary = dict(
    base='b27954c42a789a00d80d87076b4c45c2840c73d6', product='1d0b4234',
    verifiedPhases=verified, cpu=cpu, cpuChecks=251,
    currentPilotFocusedChecks=548, finalInputGuardChecks=196,
    standardResourceViews=12, resourceProfiles=profiles,
    sourceScope='Current-pilot pre-keyboard phases differ only in the two archived input-guard files; the final 526-input phase matches current files. Raw plans retain a stale source label; scope and exact source hashes establish provenance.',
    exception='Unchanged full High lighting test samples black at (650,403) both off/on; reproduced on unchanged old and new pilot. No passing full High lighting gate is claimed.',
    cleanup=True, intel60fpsCertified=False, catalogueDeltaEmpty=True)
(OUT / 'verification.json').write_text(json.dumps(summary, indent=2) + '\n')
print('Verified 11 source/artifact phases, 251 CPU checks, 548 scoped native checks and 12 resource views; inherited High lighting failure retained.')
