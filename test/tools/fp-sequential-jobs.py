"""One owned browser job at a time, with source-checked results that survive executor restarts."""
from pathlib import Path
import fcntl, hashlib, json, os, signal, socket, subprocess, sys, time


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def atomic(path, data):
    temporary = path.with_suffix(path.suffix + '.new')
    temporary.write_text(json.dumps(data, indent=2) + '\n')
    temporary.replace(path)


def main(plan_path):
    plan = json.loads(Path(plan_path).read_text())
    root, out = Path(plan['root']), Path(plan['output'])
    out.mkdir(parents=True, exist_ok=True)
    status = out / 'status.json'
    ledger_path = out / 'results.json'
    ledger = json.loads(ledger_path.read_text()) if ledger_path.exists() else {}
    child = server = None

    def state(phase, **extra):
        atomic(status, dict(phase=phase, pid=os.getpid(), runtime=plan['runtime'], updated=time.time(), **extra))
        print(phase, extra, flush=True)

    def stop(process):
        if process is not None:
            # The process group was created by this supervisor. Never select processes by name.
            try:
                os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError:
                return
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()

    def interrupt(signum, _frame):
        state('interrupted', state='interrupted', signal=signum)
        stop(child)
        stop(server)
        raise SystemExit(128 + signum)

    signal.signal(signal.SIGTERM, interrupt)
    signal.signal(signal.SIGINT, interrupt)

    def verify():
        for name, expected in plan['sources'].items():
            if digest(root / name) != expected:
                raise RuntimeError('Frozen source changed: ' + name)

    verify()
    if plan.get('node_results'):
        results = json.loads(Path(plan['node_results']).read_text())
        assert len(results) == plan['node_count'] and all(r['exit'] == 0 for r in results), 'The Node prerequisite failed.'
    lock_path = Path(plan.get('lock', '/workspace/.otr-browser-validation.lock'))
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open('a+') as lock:
        state('browser-slot', state='waiting')
        while True:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                time.sleep(5)
        verify()
        env = {**os.environ, **plan.get('environment', {})}
        server_log = None
        try:
            if plan.get('serve', True):
                port = plan['port']
                with socket.socket() as probe:
                    assert probe.connect_ex(('127.0.0.1', port)) != 0, 'The HTTP port is already owned.'
                server_log = (out / 'http.log').open('a')
                server = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=root, stdout=server_log, stderr=subprocess.STDOUT, start_new_session=True)
                for _ in range(100):
                    with socket.socket() as probe:
                        ready = probe.connect_ex(('127.0.0.1', port)) == 0
                    if ready:
                        break
                    assert server.poll() is None, 'The owned HTTP server exited.'
                    time.sleep(.1)
                assert ready, 'The owned HTTP server did not become ready.'
                env['QA_BASE'] = 'http://127.0.0.1:' + str(port)
            for job in plan['jobs']:
                verify()
                fingerprint = hashlib.sha256(json.dumps(dict(sources=plan['sources'], job=job, environment=plan.get('environment', {})), sort_keys=True).encode()).hexdigest()
                old = ledger.get(job['id'], {})
                old_log = out / old.get('log', 'missing.log')
                artifacts_ok = old_log.is_file() and digest(old_log) == old.get('logSha256') and all((root / f).is_file() and digest(root / f) == h for f, h in old.get('artifacts', {}).items())
                if old.get('exit') == 0 and old.get('fingerprint') == fingerprint and artifacts_ok:
                    state(job['id'], state='already-passed')
                    continue
                state(job['id'], state='running')
                attempts = old.get('attempts', 0) + 1
                log_name = job['id'] + '-attempt-' + str(attempts) + '.log'
                timed_out = False
                ledger[job['id']] = dict(exit=None, fingerprint=fingerprint, attempts=attempts, log=log_name, state='running')
                atomic(ledger_path, ledger)
                with (out / log_name).open('w') as log:
                    child = subprocess.Popen(job['command'], cwd=root, env={**env, **job.get('environment', {})}, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
                    try:
                        code = child.wait(timeout=job.get('timeout', 3600))
                    except subprocess.TimeoutExpired:
                        timed_out = True
                        stop(child)
                        code = 124
                artifacts = {}
                for pattern in job.get('artifacts', []):
                    for file in root.glob(pattern):
                        if file.is_file():
                            artifacts[str(file.relative_to(root))] = digest(file)
                ledger[job['id']] = dict(exit=code, fingerprint=fingerprint, attempts=attempts, log=log_name, logSha256=digest(out / log_name), timed_out=timed_out, artifacts=artifacts)
                atomic(ledger_path, ledger)
                if code:
                    state(job['id'], state='failed', exit=code)
                    return code
                # A successful Node test closes its browser; terminate any leftover owned descendants as well.
                stop(child)
                child = None
            state('all-browser-checks', state='passed')
            return 0
        finally:
            stop(child)
            stop(server)
            if server_log:
                server_log.close()


if __name__ == '__main__':
    try:
        raise SystemExit(main(sys.argv[1]))
    except Exception as error:
        try:
            plan = json.loads(Path(sys.argv[1]).read_text())
            atomic(Path(plan['output']) / 'status.json', dict(phase='supervisor-error', state='failed', message=str(error), pid=os.getpid(), runtime=plan['runtime']))
        except Exception:
            pass
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
