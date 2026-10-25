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
phases = [(pipeline, plan, ledger)]
continuation = root / 'test/out/pipelines/c43-8d5fb383-signature'
if (continuation / 'plan.json').exists():
    phases.append((continuation, json.loads((continuation / 'plan.json').read_text()),
                   json.loads((continuation / 'results.json').read_text())))
previous_protocol = evidence / 'signature-race-20261025/previous-native-protocol.js'
for phase, definition, _ in phases:
    for name, expected in definition['sources'].items():
        actual = digest(root / name)
        if actual != expected and phase == pipeline and name == 'test/fpscannerstopbrowser.js':
            assert previous_protocol.is_file() and digest(previous_protocol) == expected, 'Previous protocol proof changed'
        else:
            assert actual == expected, 'Frozen source changed: ' + name
for name, expected in source['files'].items():
    original = subprocess.check_output(['git', 'show', source['runtime'] + ':' + name], cwd=root)
    assert hashlib.sha256(original).hexdigest() == expected, 'Runtime proof changed: ' + name

existing = {
    'scorm-2004': 'loaded-low-8d5fb383',
    'resource-loaded-low': 'loaded-low-8d5fb383',
    'native-low-en-normal-pod': 'native-low-en-pod-8d5fb383',
}
summary = dict(runtime=plan['runtime'], jobsTotal=len(plan['jobs']), completed=[],
               resources=[], native=[], followups=[], scope='Completed jobs only. The whole matrix remains pending until every job passes.')
for job in plan['jobs']:
    selected_pipeline, selected_plan, entry = pipeline, plan, ledger.get(job['id'], {})
    for phase, definition, journal in phases[1:]:
        candidate = next((item for item in definition['jobs'] if item['id'] == job['id']), None)
        if candidate and journal.get(job['id'], {}).get('exit') == 0:
            job, selected_pipeline, selected_plan, entry = candidate, phase, definition, journal[job['id']]
    if entry.get('exit') != 0:
        continue
    fingerprint = hashlib.sha256(json.dumps(dict(sources=selected_plan['sources'], job=job,
        environment=selected_plan.get('environment', {})), sort_keys=True).encode()).hexdigest()
    assert entry['fingerprint'] == fingerprint, 'Job definition changed: ' + job['id']
    log = selected_pipeline / entry['log']
    assert digest(log) == entry['logSha256'], 'Job log changed: ' + job['id']
    destination = evidence / existing.get(job['id'],
        ('completed-8d5fb383/' if selected_pipeline == pipeline else 'completed-signature-8d5fb383/') + job['id'])
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copy2(log, destination / log.name)
    followup = dict(job=job['id'], exit=0, directory=str(destination.relative_to(evidence)), log=log.name)
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
            assert report['protocolSha256'] == selected_plan['sources']['test/fpscannerstopbrowser.js'], 'Native protocol changed: ' + name
            for source_name, source_hash in report['sourceFiles'].items():
                assert digest(root / source_name) == source_hash, 'Native source changed: ' + source_name
            for mode in report['modes']:
                assert mode['durable'] and len(mode['stops']) == 3, 'Incomplete stop/result evidence: ' + name
                result = mode['result']
                summary['native'].append(dict(job=job['id'], checks=report['checks'],
                    quality=mode['quality'], lang=mode['lang'], large=mode['large'], kind=mode['kind'],
                    id=result['id'], score=result['result']['score'], ratios=result['result']['ratios'],
                    stars=result['stars'], durable=mode['durable'], screenshots=len(mode['shots']),
                    protocolSha256=report['protocolSha256'],
                    signatureObservations=mode.get('signatureObservations'),
                    report=str((destination / artifact.name).relative_to(evidence))))
        elif job['id'].startswith('resource-') and artifact.name.startswith('bench-') and name.endswith('.json'):
            report = json.loads(artifact.read_text())
            assert not report['errors'] and not report['missingViews'], 'Incomplete resource views: ' + name
            assert len(report['scannerProof']) == 14, 'Missing scanner poses: ' + name
        elif job['id'] in ('critical-id', 'doorstep-regression', 'problem-regression') and name.endswith('.json'):
            report = json.loads(artifact.read_text())
            assert report['complete'] and not report['errors'], 'Incomplete follow-up: ' + name
            for source_name, source_hash in report.get('sourceFiles', {}).items():
                assert digest(root / source_name) == source_hash, 'Follow-up source changed: ' + source_name
            followup.update(checks=report['checks'], report=str((destination / artifact.name).relative_to(evidence)), modes=[])
            for mode in report['modes']:
                assert mode['durable'], 'Follow-up record was not reloaded: ' + name
                result = mode['result']
                row = dict(score=result['result']['score'], stars=result['stars'], durable=mode['durable'],
                           assessment=result.get('assessment'), screenshots=len(mode['shots']))
                if job['id'] == 'critical-id':
                    assert report['protocolSha256'] == selected_plan['sources']['test/fpscannerstopbrowser.js']
                    assert len(mode['stops']) == 3 and row['stars']['service'] == 1
                    assert row['assessment']['attempts'] == 1 and not row['assessment']['passed'] and not row['assessment']['pending']
                    row['criticals'] = [item['label'] for item in result['result']['log']['items'] if item.get('critical')]
                    assert len(row['criticals']) >= 2
                followup['modes'].append(row)
    write(destination / (job['id'] + '-provenance.json'), dict(job=job, result=entry,
          runtime=selected_plan['runtime'], pipeline=str(selected_pipeline.relative_to(root)),
          sourceProof=os.path.relpath(evidence / 'source-equivalence.json', destination)))
    summary['completed'].append(dict(id=job['id'], directory=str(destination.relative_to(evidence))))
    if job['id'] in ('critical-id', 'doorstep-regression', 'problem-regression', 'academy', 'enterprise', 'routeday', 'driving'):
        summary['followups'].append(followup)

summary['jobsPassed'] = len(summary['completed'])
summary['allJobsPassed'] = summary['jobsPassed'] == summary['jobsTotal']
if summary['allJobsPassed']:
    summary['scope'] = 'All 36 source-scoped browser jobs passed. Shared font/translation, current-pilot/A30/A31, default rollout and owner Intel FPS acceptance remain separate.'
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
manifest['status'] = 'review-ready' if summary['allJobsPassed'] else 'doing'
manifest['files'] = {str(f.relative_to(evidence)): digest(f) for f in sorted(evidence.rglob('*'))
                     if f.is_file() and f != manifest_path}
write(manifest_path, manifest)
print(json.dumps({k: summary[k] for k in ('jobsPassed', 'jobsTotal', 'resourceViews', 'nativeJourneys', 'nativeChecks')}))
