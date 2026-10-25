"""Collect only hash-verified jobs from the frozen C44 plan; never launch a browser."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[4]
PLAN = Path(__file__).with_name('plan.json')
OUT = ROOT / 'docs/review/set-10/c44-low-label-validation'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    plan = json.loads(PLAN.read_text())
    assert Path(plan['root']) == ROOT
    assert all(digest(ROOT / f) == h for f, h in plan['sources'].items()), 'Frozen source changed'
    generations = []
    for prior in plan.get('priorAccepted', []):
        old = json.loads(Path(prior['plan']).read_text())
        overrides = prior.get('sourceOverrides', {})
        # A completed protocol generation may differ, but product bytes may not.
        assert all(digest(Path(overrides.get(name, ROOT / name))) == h for name, h in old['sources'].items()), 'Prior source changed'
        generations.extend((old, job, json.loads(Path(prior['ledger']).read_text()), Path(old['output'])) for job in old['jobs'] if job['id'] in prior['jobs'])
    pipeline = Path(plan['output'])
    ledger_file = pipeline / 'results.json'
    ledger = json.loads(ledger_file.read_text()) if ledger_file.exists() else {}
    generations.extend((plan, job, ledger, pipeline) for job in plan['jobs'])
    OUT.mkdir(parents=True, exist_ok=True)
    passed, pending, native, resources, followups = [], [], [], [], []
    for generation, job, ledger, pipeline in generations:
        entry = ledger.get(job['id'], {})
        if entry.get('exit') != 0:
            pending.append({'id': job['id'], 'state': entry.get('state') or ('failed' if entry.get('exit') is not None else 'not started'), 'exit': entry.get('exit')})
            continue
        fingerprint = hashlib.sha256(json.dumps(dict(sources=generation['sources'], job=job, environment=generation.get('environment', {})), sort_keys=True).encode()).hexdigest()
        assert entry['fingerprint'] == fingerprint, 'Job/source mismatch: ' + job['id']
        log = pipeline / entry['log']
        assert digest(log) == entry['logSha256'], 'Changed log: ' + job['id']
        assert all(digest(ROOT / f) == h for f, h in entry.get('artifacts', {}).items()), 'Changed artifact: ' + job['id']
        item = {'protocolRevision': generation['protocolRevision'], 'id': job['id'], 'fingerprint': fingerprint, 'logSha256': entry['logSha256'], 'artifacts': entry.get('artifacts', {})}
        if job['id'].startswith('native-'):
            report = json.loads((ROOT / 'test/out/fp-review' / (job['environment']['QA_TAG'] + '.json')).read_text())
            assert report.get('complete') and not report['errors'] and not report['uncommittedRuntime'] and report['checks'] > 0
            assert report['protocolSha256'] == generation['sources']['test/fploadingbrowser.js']
            assert all(generation['sources'].get(f) == h for f, h in report['sourceFiles'].items())
            assert len(report['modes']) == 1
            mode = report['modes'][0]
            assert '-'.join([mode['quality'], mode['lang'], 'large' if mode['large'] else 'normal', mode['kind']]) == job['environment']['QA_CASE']
            assert report['variant'] == job['environment']['QA_VARIANT'] and mode['durable']
            assert mode['reload']['scene3d'] is None and not mode['reload']['default3d']
            if report['variant'] == 'abandon':
                a = mode['abandoned']['assessment']
                assert a['attempts'] == 1 and a['abandoned'] and not a['pending'] and not a['passed']
            else:
                # Re-run the actual 2D callbacks from recorded observations, without trusting
                # the expected result embedded by the browser protocol.
                code = "const fs=require('node:fs'),a=require('node:assert/strict'),r=require('./test/tools/fp-loading-original');const m=JSON.parse(fs.readFileSync(process.argv[1])).modes[0],v=r[m.kind](m.observation);a.deepEqual(r.normalize(m.result.result),v.result);a.deepEqual(m.original,v);console.log(JSON.stringify(v.stars));"
                stars = json.loads(subprocess.check_output(['node', '-e', code, str(ROOT / 'test/out/fp-review' / (job['environment']['QA_TAG'] + '.json'))], cwd=ROOT, text=True))
                assert stars == mode['result']['stars']
                assert len(mode['placements']) == 12 if mode['kind'] == 'load' else len(mode['findEvents']) == (10 if report['variant'] == 'wrong-find' else 5)
                assert mode['result']['record']['plays'] == 1
                if report['variant'] != 'good':
                    assert not mode['result']['assessment']['passed']
            item.update(checks=report['checks'], case=job['environment']['QA_CASE'], variant=report['variant'], captures=len(mode['shots']))
            native.append(item)
        elif job['id'].startswith('resource-'):
            tag = job['environment']['QA_TAG']
            quality = json.loads((ROOT / 'test/out/fp-review' / (tag + '-quality.json')).read_text())
            assert len(quality['profiles']) == 1 and quality['profiles'][0]['exit'] == 0
            profile = quality['profiles'][0]
            raw = json.loads((ROOT / 'test/out/fp-review' / profile['report']).read_text())
            assert raw['loadingFixture'] and not raw['errors'] and not raw['missingViews']
            assert len(raw['loadingProof']) == 14
            assert all(q['source'] == 'loading-static-render-fixture' and q['canonical'] and q['bounded'] and q['inkFacesClear'] and q['viewedLabelPrinted'] and q['cargoFit']['floor'] >= .6 and q['slots'] == 21 and q['parcels'] == 12 and q['checkpointUnchanged'] and q['eventsUnchanged'] and q['workdayUnchanged'] for q in raw['loadingProof'].values())
            unit = raw['loadingProof']['findunit']
            assert unit['gazeTarget'] == 'loading-parcel-f10' and 'f10' in unit['printedParcelIds']
            item.update(views=14, peak=profile['peak'], profile=profile['id'])
            resources.append(item)
        else:
            followups.append(item)
        destination = OUT / 'completed' / job['id']
        destination.mkdir(parents=True, exist_ok=True)
        shutil.copy2(log, destination / entry['log'])
        for f, h in entry.get('artifacts', {}).items():
            target = destination / Path(f).name
            assert not target.exists() or digest(target) == h, 'A completed capture would be overwritten'
            if not target.exists():
                shutil.copy2(ROOT / f, target)
        passed.append(item)
    summary = {'date': datetime.now(timezone.utc).isoformat(), 'applicationRuntime': plan['runtime'], 'protocolRevision': plan['protocolRevision'], 'expectedJobs': len(generations), 'passedJobs': len(passed), 'complete': not pending, 'nativeGoodJourneys': sum(x['variant'] == 'good' for x in native), 'nativeChecks': sum(x['checks'] for x in native), 'nativeCaptures': sum(x['captures'] for x in native), 'resourceViews': sum(x['views'] for x in resources), 'native': native, 'resources': resources, 'followups': followups, 'pending': pending, 'scope': 'Hash-verified source-scoped results only. Static resource fixtures are separate from native controls/records. Corrected-font Tamil, current-pilot/default rollout and Intel FPS remain separate.'}
    (OUT / 'completed-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    manifest = {'status': 'source-scoped jobs complete; visual/shared rollout review still required' if not pending else 'doing; validation incomplete', 'planSha256': digest(PLAN), 'files': {str(f.relative_to(OUT)): digest(f) for f in sorted(OUT.rglob('*')) if f.is_file() and f.name != 'manifest.json'}}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({k: summary[k] for k in ['passedJobs', 'expectedJobs', 'nativeGoodJourneys', 'nativeChecks', 'resourceViews', 'nativeCaptures', 'complete']}))


if __name__ == '__main__':
    main()
