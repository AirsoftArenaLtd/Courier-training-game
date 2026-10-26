"""One owned, source-frozen browser process group; never stop another task's browser."""
from pathlib import Path
import fcntl, hashlib, json, os, signal, socket, subprocess, time

out = Path(__file__).resolve().parent
plan = json.loads((out / 'plan.json').read_text())
root = Path(plan['root'])

def state(phase, **fields):
    record = dict(phase=phase, runtime=plan['runtime'], pid=os.getpid(), **fields)
    (out / 'status.json').write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps(record), flush=True)

def verify():
    for file, expected in plan['sources'].items():
        assert hashlib.sha256((root / file).read_bytes()).hexdigest() == expected, file

def stop_owned(process):
    if process is None or process.poll() is not None:
        return
    os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()

lock = Path('/workspace/.otr-browser-validation.lock').open('a+')
state('waiting-for-shared-browser-lock', state='waiting')
fcntl.flock(lock, fcntl.LOCK_EX)
server = child = None
try:
    verify()
    prerequisite = json.loads((root / 'docs/review/set-10/c46-wellness-lettering-correction/results.json').read_text())
    assert len(prerequisite['suites']) == 13 and all(x['exit'] == 0 for x in prerequisite['suites'] + prerequisite['syntax'])
    with socket.socket() as probe:
        assert probe.connect_ex(('127.0.0.1', plan['port'])) != 0, 'The port is owned by another process.'
    with (out / 'http.log').open('w') as log:
        server = subprocess.Popen(['python3', '-m', 'http.server', str(plan['port']), '--bind', '127.0.0.1'], cwd=root, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    ready = False
    for _ in range(50):
        with socket.socket() as probe:
            ready = probe.connect_ex(('127.0.0.1', plan['port'])) == 0
        if ready:
            break
        assert server.poll() is None
        time.sleep(.1)
    assert ready
    state('four-resource-profiles', state='running', serverPid=server.pid)
    with (out / 'resource-supervisor.log').open('w') as log:
        env = {**os.environ, 'QA_BROWSER': '/usr/bin/chromium', 'QA_BASE': 'http://127.0.0.1:' + str(plan['port']), 'QA_FPS_FLOOR': '0', 'QA_TAG': plan['tag']}
        child = subprocess.Popen(['node', 'test/tools/fp-wellness-quality.js'], cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        (out / 'owned-processes.json').write_text(json.dumps(dict(supervisor=os.getpid(), server=server.pid, resources=child.pid), indent=2) + '\n')
        try:
            code = child.wait(timeout=2400)
        except subprocess.TimeoutExpired:
            stop_owned(child)
            code = 124
    verify()
    (out / 'results.json').write_text(json.dumps(dict(exit=code, runtime=plan['runtime'], tag=plan['tag'], scope=plan['scope']), indent=2) + '\n')
    state('component-resources', state='passed' if code == 0 else 'failed', exit=code)
finally:
    stop_owned(child)
    stop_owned(server)
    fcntl.flock(lock, fcntl.LOCK_UN)
    lock.close()
