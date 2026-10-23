from pathlib import Path
import subprocess, json, hashlib, os, time, urllib.request, copy

root = Path('/workspace/c39-school-next')
owned = Path('/workspace/c39-route-driving')
target = Path('/tmp/c39-school-acceptance-state.json')
state = json.loads(target.read_text())
assert state['source'] == 'b7dc5de8059d4b0e2f55039487cdb696751f120a'
assert next(s for s in state['steps'] if s['name'] == 'painted-driving-resources')['exit'] == 0
assert state['failure'] == 'driving-high-en-large failed; inspect its log and raw report.'
native = owned / 'test/fpdrivinglessonbrowser.js'
native_sha = hashlib.sha256(native.read_bytes()).hexdigest()
state['correctedDrivingNative'] = {
    'path': str(native), 'sha256': native_sha,
    'change': 'Test-only protocol timeout, live-game-time bounded parking wait, progress timings and nested error cause capture. Gameplay and parking predicates are unchanged.'
}
for step in state['steps']:
    if step['name'].startswith('driving-high-'):
        if step.get('exit') is not None:
            step.setdefault('previousAttempts', []).append(copy.deepcopy({k:v for k,v in step.items() if k != 'previousAttempts'}))
        for field in ['exit', 'started', 'finished', 'pid']:
            step.pop(field, None)
        step['command'] = ['node', str(native)]
        step['env']['QA_TAG'] = step['env']['QA_TAG'].replace('c39-driving-current-', 'c39-driving-bounded-')
        step['testSource'] = native_sha
        step['reportRoot'] = str(owned / 'test/out/fp-review')
        step['log'] = '/tmp/c39-driving-bounded-' + step['name'] + '.log'
# The retained runner is independent and uses the same frozen candidate.
retained = next(s for s in state['steps'] if s['name'] == 'retained-runner')
state['steps'].remove(retained)
first_pending = next(i for i,s in enumerate(state['steps']) if s.get('exit') != 0)
state['steps'].insert(first_pending, retained)
state['failure'] = None
state['complete'] = False
def save(): target.write_text(json.dumps(state, indent=2) + '\n')
save()
common = {'QA_BASE': state['base'], 'QA_BROWSER':'/usr/bin/chromium', 'QA_FPS_FLOOR':'0'}
for step in state['steps']:
    if step.get('exit') == 0:
        continue
    assert hashlib.sha256(native.read_bytes()).hexdigest() == native_sha
    assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip() == state['source']
    assert not subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip()
    expected = hashlib.sha256((root/'src/core/fplessonbays.js').read_bytes()).hexdigest()
    with urllib.request.urlopen(state['base']+'/src/core/fplessonbays.js',timeout=15) as response:
        assert hashlib.sha256(response.read()).hexdigest() == expected
    step['started'] = time.time()
    step.setdefault('log','/tmp/c39-driving-bounded-'+step['name']+'.log')
    step.setdefault('reportRoot',str(root/'test/out/fp-review'))
    save()
    with open(step['log'],'w') as log:
        p = subprocess.Popen(step['command'],cwd=root,env={**os.environ,**common,**step['env']},stdout=log,stderr=subprocess.STDOUT)
        step['pid'] = p.pid
        save()
        step['exit'] = p.wait()
    step['finished'] = time.time()
    save()
    print(step['name'],step['exit'],flush=True)
    if step['exit']:
        state['failure'] = step['name']+' failed; inspect its log and raw report.'
        save()
        raise SystemExit(step['exit'])
state['complete'] = True
save()
