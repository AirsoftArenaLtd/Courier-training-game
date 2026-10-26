"""Complete current-source incident coverage after the active core matrix passes."""
from pathlib import Path
import fcntl, hashlib, json, os, signal, socket, subprocess, time

out = Path(__file__).resolve().parent
plan = json.loads((out / 'plan.json').read_text())
root = Path(plan['root'])
results = []

def write(name, value):
    target = out / name
    temporary = target.with_name(target.name + '.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    temporary.replace(target)

def state(phase, **fields):
    value = dict(phase=phase, runtime=plan['runtime'], pid=os.getpid(), **fields)
    write('status.json', value)
    print(json.dumps(value), flush=True)

def verify():
    for file, want in plan['sources'].items():
        assert hashlib.sha256((root / file).read_bytes()).hexdigest() == want, file
    retained = plan['retained']
    assert hashlib.sha256(Path(retained['report']).read_bytes()).hexdigest() == retained['sha256']

def core_complete():
    record = json.loads(Path(plan['waitFor']['results']).read_text())
    status = json.loads(Path(plan['waitFor']['status']).read_text())
    if status.get('state') == 'failed':
        raise RuntimeError('Core validation failed; incident follow-up is blocked until it is resolved')
    return (record['runtime'] == plan['runtime'] and record.get('complete') is True and
            len(record['jobs']) == plan['waitFor']['expectedPassingJobs'] and
            all(job['exit'] == 0 for job in record['jobs']))

def stop_owned(process):
    if process is None or process.poll() is not None:
        return
    os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()

def interrupted(signum, frame):
    raise SystemExit('Owned incident supervisor interrupted by signal ' + str(signum))

signal.signal(signal.SIGTERM, interrupted)
server = child = lock = None
try:
    verify()
    state('waiting-for-core-validation', state='waiting')
    write('released.json', dict(pid=os.getpid(), released=False))
    while not core_complete():
        time.sleep(30)
    lock = Path('/workspace/.otr-browser-validation.lock').open('a+')
    state('waiting-for-browser-lease', state='waiting')
    fcntl.flock(lock, fcntl.LOCK_EX)
    verify()
    assert core_complete()
    retained = json.loads(Path(plan['retained']['report']).read_text())
    assert retained['complete'] and retained['modes'][0]['durable']
    with socket.socket() as probe:
        assert probe.connect_ex(('127.0.0.1', plan['port'])) != 0, 'Port already owned'
    with (out / 'http.log').open('w') as log:
        server = subprocess.Popen(['python3', '-m', 'http.server', str(plan['port']), '--bind', '127.0.0.1'],
                                  cwd=root, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    ready = False
    for _ in range(50):
        with socket.socket() as probe:
            ready = probe.connect_ex(('127.0.0.1', plan['port'])) == 0
        if ready:
            break
        assert server.poll() is None
        time.sleep(.1)
    assert ready
    for job in plan['jobs']:
        verify()
        state(job['name'], state='running', server=server.pid)
        env = {**os.environ, 'QA_BROWSER': '/usr/bin/chromium',
               'QA_BASE': 'http://127.0.0.1:' + str(plan['port']), 'QA_FPS_FLOOR': '0', **job['env']}
        with (out / (job['name'] + '.log')).open('w') as log:
            child = subprocess.Popen(job['command'], cwd=root, env=env, stdout=log,
                                     stderr=subprocess.STDOUT, start_new_session=True)
            write('owned-processes.json', dict(supervisor=os.getpid(), server=server.pid, job=job['name'], child=child.pid))
            try:
                code = child.wait(timeout=job['timeout'])
            except subprocess.TimeoutExpired:
                stop_owned(child)
                code = 124
        verify()
        results.append(dict(name=job['name'], exit=code, env=job['env']))
        write('results.json', dict(runtime=plan['runtime'], scope=plan['scope'], retained=plan['retained'], jobs=results,
                                   complete=len(results) == len(plan['jobs']) and all(row['exit'] == 0 for row in results)))
        if code:
            state(job['name'], state='failed', exit=code)
            break
    else:
        state('complete', state='passed')
except BaseException as error:
    state('supervisor-error', state='failed', error=str(error))
    raise
finally:
    stop_owned(child)
    stop_owned(server)
    if lock is not None:
        fcntl.flock(lock, fcntl.LOCK_UN)
        lock.close()
    write('released.json', dict(pid=os.getpid(), released=True))
