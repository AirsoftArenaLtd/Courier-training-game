"""Collect hash-verified C45 jobs and independently replay original decisions; never open a browser."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import math
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
PLAN = OUT / 'plan.json'
VIEWS = 'pickupbusiness,pickupcart,pickupcount,pickupinspection,pickupreceipt,pickupcontrols,pickupinternational,pickupinvoice,pickupinvoicelast,pickupfindings,pickupexception,pickupdangerous,pickupdeclared,pickuprefusal,pickupsigned'.split(',')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def original(report_path):
    code = """const fs=require('node:fs'),a=require('node:assert/strict'),r=require('./test/tools/fp-pickup-original');
const m=JSON.parse(fs.readFileSync(process.argv[1])).modes[0],v=r.replay('m7-'+m.kind,m.observation);
a.deepEqual(r.normalize(m.result.result),v.result);a.deepEqual(m.original,v);a.deepEqual(m.result.stars,v.stars);
console.log(JSON.stringify(v));"""
    return json.loads(subprocess.check_output(['node', '-e', code, str(report_path)], cwd=ROOT, text=True))


def main():
    plan = json.loads(PLAN.read_text())
    assert Path(plan['root']) == ROOT
    assert len(plan['jobs']) == 40
    assert all(digest(ROOT / f) == h for f, h in plan['sources'].items()), 'Frozen source changed'
    nodes = json.loads(Path(plan['node_results']).read_text())
    node_base = Path(plan['node_results']).parent
    assert len(nodes) == plan['node_count'] == 97 and all(r['exit'] == 0 for r in nodes)
    assert all(digest(ROOT / r['file']) == r['sourceSha256'] and digest(node_base / r['log']) == r['logSha256'] for r in nodes)
    pipeline = Path(plan['output'])
    ledger = json.loads((pipeline / 'results.json').read_text()) if (pipeline / 'results.json').exists() else {}
    passed, pending, native, resources, followups, outcomes = [], [], [], [], [], []
    for job in plan['jobs']:
        entry = ledger.get(job['id'], {})
        if entry.get('exit') != 0:
            pending.append({'id': job['id'], 'state': entry.get('state') or ('failed' if entry.get('exit') is not None else 'not started'), 'exit': entry.get('exit')})
            continue
        fingerprint = hashlib.sha256(json.dumps(dict(sources=plan['sources'], job=job, environment=plan.get('environment', {})), sort_keys=True).encode()).hexdigest()
        assert entry['fingerprint'] == fingerprint, 'Job/source mismatch: ' + job['id']
        log = pipeline / entry['log']
        assert digest(log) == entry['logSha256'], 'Changed log: ' + job['id']
        assert all(digest(ROOT / f) == h for f, h in entry.get('artifacts', {}).items()), 'Changed artifact: ' + job['id']
        item = {'protocolRevision': plan['protocolRevision'], 'id': job['id'], 'fingerprint': fingerprint, 'logSha256': entry['logSha256'], 'artifacts': entry.get('artifacts', {})}
        tag = job['environment']['QA_TAG']
        if job['id'].startswith('native-'):
            report_path = ROOT / 'test/out/fp-review' / (tag + '.json')
            report = json.loads(report_path.read_text())
            assert report.get('complete') and not report['errors'] and not report['uncommittedRuntime'] and report['checks'] > 0
            assert report['protocolSha256'] == plan['sources']['test/fppickupbrowser.js']
            assert all(plan['sources'].get(f) == h for f, h in report['sourceFiles'].items())
            assert len(report['modes']) == 1
            mode = report['modes'][0]
            case = '-'.join([mode['quality'], mode['lang'], 'large' if mode['large'] else 'normal', mode['kind']])
            variant = report['variant']
            assert case == job['environment']['QA_CASE'] and variant == job['environment']['QA_VARIANT']
            reload = mode['reload']
            assert mode['durable'] and reload['scene'] == 'PickupScene' and reload['scene3d'] is None and not reload['default3d']
            assessment = reload.get('assessment')
            score, stars, seconds = None, None, None
            if variant == 'abandon':
                assert assessment == mode['abandoned']['assessment']
                assert assessment['attempts'] == 1 and assessment['abandoned'] and not assessment['pending'] and not assessment['passed']
                assert not reload.get('record', {}).get('plays') and not mode['abandoned'].get('record', {}).get('plays')
            else:
                replay = original(report_path)
                result = mode['result']
                score, stars, seconds = replay['result']['score'], replay['stars'], result['elapsed']
                assert len(mode['observation']['decisions']) == {'business': 6, 'intl': 2, 'dg': 4}[mode['kind']]
                assert result['record']['plays'] == reload['record']['plays'] == 1
                assert result['record']['bestScore'] == reload['record']['bestScore'] == score
                assert result['result']['stats']['seconds'] == math.floor(result['runElapsed'] + .5)
                if variant == 'good':
                    assert score == {'business': 2300, 'intl': 1800, 'dg': 1700}[mode['kind']]
                    assert sum(stars.values()) == 6 and not result['verdict']['criticals']
                if mode['large'] or variant != 'good':
                    assert assessment == result['assessment'] and assessment['attempts'] == 1 and not assessment['pending']
                    assert assessment['passed'] == (variant == 'good')
                if variant in ['bad-docs', 'bad-call']:
                    assert result['verdict']['criticals']
            for shot in mode['shots']:
                file = 'test/out/fp-review/' + shot
                assert file in entry['artifacts'], 'Unrecorded screenshot: ' + file
            item.update(checks=report['checks'], case=case, variant=variant, captures=len(mode['shots']))
            native.append(item)
            outcomes.append({'case': case, 'variant': variant, 'checks': report['checks'], 'captures': len(mode['shots']), 'score': score, 'stars': stars, 'seconds': seconds, 'durable': True, 'assessed': assessment is not None, 'assessmentPassed': assessment['passed'] if assessment else None, 'assessmentAttempts': assessment['attempts'] if assessment else None, 'abandoned': variant == 'abandon', 'completedPlays': 0 if variant == 'abandon' else 1})
        elif job['id'].startswith('resource-'):
            quality = json.loads((ROOT / 'test/out/fp-review' / (tag + '-quality.json')).read_text())
            assert quality['requestedViews'] == VIEWS
            assert len(quality['profiles']) == 1 and quality['profiles'][0]['exit'] == 0
            profile = quality['profiles'][0]
            assert profile['id'] == job['environment']['QA_PROFILES']
            raw_path = ROOT / 'test/out/fp-review' / profile['report']
            raw = json.loads(raw_path.read_text())
            assert raw['tag'] == tag + '-' + profile['id']
            assert raw['pickupFixture'] and not raw['errors'] and not raw['missingViews']
            assert list(raw['pickupProof']) == VIEWS
            high = profile['id'] == 'loaded-high'
            for q in raw['pickupProof'].values():
                assert q['source'] == 'pickup-static-render-fixture' and q['canonical'] and q['bounded'] and q['supported'] and q['viewedLabelPrinted']
                assert q['inkTextures'] == 0 and q['highShipper'] == high
                assert q['parcels'] == q['modelParcels'] == {'m7-business': 6, 'm7-intl': 2, 'm7-dg': 4}[q['id']]
                assert q['par'] == {'m7-business': 200, 'm7-intl': 210, 'm7-dg': 220}[q['id']]
                assert q['piece'] == 'street' and q['phase'] == 'active'
                assert q['checkpointUnchanged'] and q['eventsUnchanged'] and q['workdayUnchanged']
            assert raw['pickupProof']['pickupcart']['gaze'] == 'pickup-parcel-b6'
            code = "const fs=require('node:fs'),a=require('node:assert/strict'),q=require('./test/fpquality'),x=JSON.parse(fs.readFileSync(process.argv[1])),p=q.PROFILES.find(p=>p.id===process.argv[2]);console.log(JSON.stringify(q.checkReport(x,{...p,views:process.argv[3]},process.argv[4])));"
            peak = json.loads(subprocess.check_output(['node', '-e', code, str(raw_path), profile['id'], ','.join(VIEWS), raw['tag']], cwd=ROOT, text=True))
            assert peak == profile['peak']
            item.update(views=len(VIEWS), peak=peak, profile=profile['id'])
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
    summary = {'date': datetime.now(timezone.utc).isoformat(), 'applicationRuntime': plan['runtime'], 'protocolRevision': plan['protocolRevision'], 'expectedJobs': len(plan['jobs']), 'passedJobs': len(passed), 'complete': not pending, 'nativeGoodJourneys': sum(x['variant'] == 'good' for x in native), 'nativeChecks': sum(x['checks'] for x in native), 'nativeCaptures': sum(x['captures'] for x in native), 'resourceViews': sum(x['views'] for x in resources), 'native': native, 'resources': resources, 'followups': followups, 'pending': pending, 'scope': 'Hash-verified source-scoped jobs only. Independently replayed original callback results and durable native records. Static resource fixtures are separate. Shared readable-Tamil, current-pilot/default/A30/A31 and Intel O1 acceptance remain separate.'}
    (OUT / 'completed-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    (OUT / 'native-snapshot.json').write_text(json.dumps({'date': summary['date'], 'applicationRuntime': plan['runtime'], 'completed': outcomes}, indent=2) + '\n')
    manifest = {'status': 'source-scoped jobs complete; visual/shared rollout review still required' if not pending else 'doing; validation incomplete', 'planSha256': digest(PLAN), 'files': {str(f.relative_to(OUT)): digest(f) for f in sorted(OUT.rglob('*')) if f.is_file() and f.name != 'manifest.json'}}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({k: summary[k] for k in ['passedJobs', 'expectedJobs', 'nativeGoodJourneys', 'nativeChecks', 'resourceViews', 'nativeCaptures', 'complete']}))


if __name__ == '__main__':
    main()
