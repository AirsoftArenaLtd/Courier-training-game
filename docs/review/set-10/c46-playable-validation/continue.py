"""Resume only unfinished jobs, retaining exact source and passed evidence hashes."""
from pathlib import Path
import fcntl, hashlib, json, os, signal, socket, subprocess, time

out = Path(__file__).resolve().parent
plan = json.loads((out / 'continuation-plan.json').read_text())
root = Path(plan['root'])
results = list(plan['retainedJobs'])

def write(name, value):
    target = out / name
    temporary = target.with_name(target.name + '.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    temporary.replace(target)

def state(phase, **fields):
    record = dict(phase=phase, runtime=plan['runtime'], pid=os.getpid(), **fields)
    write('status.json', record)
    print(json.dumps(record), flush=True)

def verify():
    for file, want in plan['sources'].items():
        assert hashlib.sha256((root / file).read_bytes()).hexdigest() == want, file
    for file, want in plan['retainedProofFiles'].items():
        assert hashlib.sha256((out / file).read_bytes()).hexdigest() == want, file

def publish():
    expected = [job for job in plan['jobs'] if job['group'] == 'preflight']
    preflight = [job for job in results if job['group'] == 'preflight']
    write('results.json', dict(
        runtime=plan['runtime'], scope=plan['scope'], retained=plan['retained'],
        jobs=results, preflightComplete=len(preflight) == len(expected) and all(job['exit'] == 0 for job in preflight),
        complete=len(results) == len(plan['jobs']) and all(job['exit'] == 0 for job in results),
        earlierFailedAttempts=[plan['continuation']['earlierFailedAttempt']],
        continuation=plan['continuation']))

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
    raise SystemExit('Owned supervisor interrupted by signal ' + str(signum))

signal.signal(signal.SIGTERM, interrupted)
lock = Path('/workspace/.otr-browser-validation.lock').open('a+')
state('waiting-for-browser-lease')
fcntl.flock(lock, fcntl.LOCK_EX)
server = child = None
try:
    verify()
    assert len(results) == 21 and all(row['exit'] == 0 for row in results)
    assert [row['name'] for row in results] == [job['name'] for job in plan['jobs'][:len(results)]]
    assert len(plan['jobs']) - len(results) == 15
    write('released.json', dict(pid=os.getpid(), released=False))
    publish()
    with socket.socket() as probe:
        assert probe.connect_ex(('127.0.0.1', plan['port'])) != 0, 'Port already owned'
    with (out / 'continuation-http.log').open('w') as log:
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
    for job in plan['jobs'][len(results):]:
        verify()
        state(job['name'], state='running', group=job['group'], server=server.pid, timeout=job['timeout'])
        env = {**os.environ, 'QA_BROWSER': '/usr/bin/chromium',
               'QA_BASE': 'http://127.0.0.1:' + str(plan['port']), 'QA_FPS_FLOOR': '0', **job['env']}
        with (out / ('resume-' + job['name'] + '.log')).open('w') as log:
            child = subprocess.Popen(job['command'], cwd=root, env=env, stdout=log,
                                     stderr=subprocess.STDOUT, start_new_session=True)
            write('owned-processes.json', dict(supervisor=os.getpid(), server=server.pid, job=job['name'], child=child.pid))
            try:
                code = child.wait(timeout=job['timeout'])
            except subprocess.TimeoutExpired:
                stop_owned(child)
                code = 124
        verify()
        results.append(dict(name=job['name'], group=job['group'], exit=code, env=job['env']))
        publish()
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
    fcntl.flock(lock, fcntl.LOCK_UN)
    lock.close()
    write('released.json', dict(pid=os.getpid(), released=True))
