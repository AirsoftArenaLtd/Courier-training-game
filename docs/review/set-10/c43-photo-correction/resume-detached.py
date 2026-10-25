"""Resume the frozen scanner validation without retaining a terminal output pipe."""
from pathlib import Path
import datetime
import json
import os
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[4]
output = root / 'test/out/pipelines/c43-8d5fb383'
status = output / 'status.json'
previous = json.loads(status.read_text())
pid = previous.get('pid')
if pid:
    process = Path('/proc') / str(pid)
    if (process / 'cmdline').exists():
        command = (process / 'cmdline').read_bytes().decode().replace('\0', ' ')
        if str(output) in command:
            raise SystemExit('This validation already has a live supervisor: ' + str(pid))

stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
archive = output / ('resume-' + stamp)
archive.mkdir()
for name in ('status.json', 'results.json'):
    (archive / name).write_bytes((output / name).read_bytes())
log_path = archive / 'supervisor.log'
with log_path.open('ab', buffering=0) as log:
    child = subprocess.Popen([sys.executable, str(root / 'test/tools/fp-sequential-jobs.py'),
                              str(output / 'plan.json')], cwd=root,
                             stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
                             start_new_session=True)
for _ in range(100):
    if child.poll() is not None:
        raise SystemExit('The supervisor exited during startup; inspect ' + str(log_path))
    current = json.loads(status.read_text())
    if current.get('pid') == child.pid:
        break
    time.sleep(.1)
else:
    # The exact owned process is deliberately left available for inspection.
    raise SystemExit('No startup status arrived from owned supervisor ' + str(child.pid))
record = dict(pid=child.pid, processGroup=os.getpgid(child.pid),
              stdin='DEVNULL', stdout=str(log_path), stderr='STDOUT',
              previousState=previous, status=current)
(archive / 'launch.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record, indent=2))
