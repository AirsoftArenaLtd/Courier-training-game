"""Collect only intact, completed jobs from the frozen C-43 browser journal."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


evidence = Path(__file__).resolve().parent
root = evidence.parents[3]
pipeline = root / 'test/out/pipelines/c43-8d5fb383'
plan = json.loads((pipeline / 'plan.json').read_text())
ledger = json.loads((pipeline / 'results.json').read_text())
source = json.loads((evidence / 'source-equivalence.json').read_text())
for name, expected in plan['sources'].items():
    assert digest(root / name) == expected, 'Frozen source changed: ' + name
for name, expected in source['files'].items():
    original = subprocess.check_output(['git', 'show', source['runtime'] + ':' + name], cwd=root)
    assert hashlib.sha256(original).hexdigest() == expected, 'Runtime proof changed: ' + name

existing = {
    'scorm-2004': 'loaded-low-8d5fb383',
    'resource-loaded-low': 'loaded-low-8d5fb383',
    'native-low-en-normal-pod': 'native-low-en-pod-8d5fb383',
}
summary = dict(runtime=plan['runtime'], jobsTotal=len(plan['jobs']), completed=[],
               resources=[], native=[], scope='Completed jobs only. The whole matrix remains pending until every job passes.')
for job in plan['jobs']:
    entry = ledger.get(job['id'], {})
    if entry.get('exit') != 0:
        continue
    fingerprint = hashlib.sha256(json.dumps(dict(sources=plan['sources'], job=job,
        environment=plan.get('environment', {})), sort_keys=True).encode()).hexdigest()
    assert entry['fingerprint'] == fingerprint, 'Job definition changed: ' + job['id']
    log = pipeline / entry['log']
    assert digest(log) == entry['logSha256'], 'Job log changed: ' + job['id']
    destination = evidence / existing.get(job['id'], 'completed-8d5fb383/' + job['id'])
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copy2(log, destination / log.name)
    for name, expected in entry['artifacts'].items():
        artifact = root / name
        assert digest(artifact) == expected, 'Artifact changed: ' + name
        shutil.copy2(artifact, destination / artifact.name)
        if name.endswith('-quality.json'):
            report = json.loads(artifact.read_text())
            summary['resources'].extend(report['profiles'])
        elif job['id'].startswith('native-') and name.endswith('.json'):
            report = json.loads(artifact.read_text())
            assert report['complete'] and not report['errors'], 'Incomplete native journey: ' + name
            for source_name, source_hash in report['sourceFiles'].items():
                assert digest(root / source_name) == source_hash, 'Native source changed: ' + source_name
            for mode in report['modes']:
                assert mode['durable'] and len(mode['stops']) == 3, 'Incomplete stop/result evidence: ' + name
                result = mode['result']
                summary['native'].append(dict(job=job['id'], checks=report['checks'],
                    quality=mode['quality'], lang=mode['lang'], large=mode['large'], kind=mode['kind'],
                    id=result['id'], score=result['result']['score'], ratios=result['result']['ratios'],
                    stars=result['stars'], durable=mode['durable'], screenshots=len(mode['shots']),
                    report=str((destination / artifact.name).relative_to(evidence))))
        elif job['id'].startswith('resource-') and artifact.name.startswith('bench-') and name.endswith('.json'):
            report = json.loads(artifact.read_text())
            assert not report['errors'] and not report['missingViews'], 'Incomplete resource views: ' + name
            assert len(report['scannerProof']) == 14, 'Missing scanner poses: ' + name
    write(destination / (job['id'] + '-provenance.json'), dict(job=job, result=entry,
          runtime=plan['runtime'], sourceProof=os.path.relpath(evidence / 'source-equivalence.json', destination)))
    summary['completed'].append(dict(id=job['id'], directory=str(destination.relative_to(evidence))))

summary['jobsPassed'] = len(summary['completed'])
summary['allJobsPassed'] = summary['jobsPassed'] == summary['jobsTotal']
summary['resourceViews'] = 14 * len(summary['resources'])
summary['nativeJourneys'] = len(summary['native'])
summary['nativeChecks'] = sum(case['checks'] for case in summary['native'])
write(evidence / 'completed-summary.json', summary)
manifest_path = evidence / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
manifest.update(finalResourceViews=summary['resourceViews'], finalNativeJourneys=summary['nativeJourneys'],
                finalNativeChecks=summary['nativeChecks'], browserMatrixComplete=summary['allJobsPassed'],
                nativeComplete=summary['nativeJourneys'] == 24,
                finalJobsPassed=summary['jobsPassed'], finalJobsTotal=summary['jobsTotal'])
manifest['files'] = {str(f.relative_to(evidence)): digest(f) for f in sorted(evidence.rglob('*'))
                     if f.is_file() and f != manifest_path}
write(manifest_path, manifest)
print(json.dumps({k: summary[k] for k in ('jobsPassed', 'jobsTotal', 'resourceViews', 'nativeJourneys', 'nativeChecks')}))
