"""Collect immutable, completed static-profile evidence without running a browser."""
from pathlib import Path
import hashlib, json, shutil

out = Path(__file__).resolve().parent
plan = json.loads((out / 'plan.json').read_text())
root = Path(plan['root'])
for name, expected in plan['sources'].items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, name

generated = root / 'test/out/fp-review'
summary_file = generated / (plan['tag'] + '-quality.json')
summary = json.loads(summary_file.read_text()) if summary_file.exists() else {'profiles': []}
status = json.loads((out / 'status.json').read_text())
completed = out / 'completed'
completed.mkdir(exist_ok=True)
profiles, files = [], {}
for profile in summary['profiles']:
    if profile['exit']:
        continue
    report = json.loads((generated / profile['report']).read_text())
    assert report['wellnessComponentFixture'] and len(report['prototype']) == 9
    assert len({q['fixtureSerial'] for q in report['wellnessProof'].values()}) == 9
    profile_files = [generated / profile['report'], generated / profile['log']]
    for view in report['prototype']:
        profile_files.append(generated / (plan['tag'] + '-' + profile['id'] + '-' + report['quality'] + '-' + view + '.png'))
    for source in profile_files:
        target = completed / source.name
        shutil.copy2(source, target)
        files[str(target.relative_to(out))] = hashlib.sha256(target.read_bytes()).hexdigest()
    profiles.append({'id': profile['id'], 'views': len(report['prototype']), 'peak': profile['peak'], 'report': profile['report']})

result = {'runtime': plan['runtime'], 'scope': plan['scope'], 'supervisorState': status['state'], 'profiles': profiles,
          'completedProfiles': len(profiles), 'completedViews': sum(p['views'] for p in profiles),
          'allResourceProfilesPass': status['state'] == 'passed' and len(profiles) == 4,
          'nativeGameplay': False, 'applicationAdapterLoaded': False, 'fullC46Acceptance': False}
(out / 'completed-summary.json').write_text(json.dumps(result, indent=2) + '\n')
(out / 'manifest.json').write_text(json.dumps({'runtime': plan['runtime'], 'files': files}, indent=2) + '\n')
images = [name for name in files if name.endswith('.png')]
(out / 'gallery.md').write_text('# Static safety component images\n\nRuntime `' + plan['runtime'][:8] + '`. Static resource poses only; no native gameplay or full C46 acceptance.\n\n' + '\n'.join('- [' + Path(name).name + '](' + name + ')' for name in images) + '\n')
print(json.dumps(result))
