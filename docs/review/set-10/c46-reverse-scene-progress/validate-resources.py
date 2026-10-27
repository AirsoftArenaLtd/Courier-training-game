#!/usr/bin/env python3
"""Own one queued browser lease, freeze this source, retain resource artifacts, release owned processes."""
import fcntl,hashlib,json,os,shutil,subprocess,time
from pathlib import Path
import psutil
ROOT=Path(__file__).resolve().parents[4]; OUT=Path(__file__).resolve().parent
os.chdir(ROOT)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(name,value):
 p=OUT/name;t=p.with_suffix(p.suffix+'.tmp');t.write_text(json.dumps(value,indent=2)+'\n');t.replace(p)
plan=json.loads((OUT/'resource-plan.json').read_text())
state={'phase':'queued','pid':os.getpid(),'startedAt':time.time(),'sourceRevision':plan['revision']}
write('resource-status.json',state)
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX)
 for f,h in plan['sources'].items():
  if sha(f)!=h:raise RuntimeError('Source changed before resource validation: '+f)
 state['phase']='running';write('resource-status.json',state)
 code=0
 with open(OUT/'resource-supervisor.log','w') as log:
  for i,job in enumerate(plan['jobs']):
   env={**os.environ,'QA_BASE':'http://127.0.0.1:8397','QA_TAG':job['tag'],'QA_PROFILES':job['profiles'],'QA_VIEWS':job.get('views','')}
   child=subprocess.Popen(['node','test/tools/fp-reverse-quality.js'],env=env,stdout=log,stderr=log,start_new_session=True)
   state.update(childPid=child.pid,job=i,tag=job['tag']);write('resource-status.json',state)
   try:code=child.wait(timeout=2400)
   except subprocess.TimeoutExpired:
    owned=psutil.Process(child.pid).children(recursive=True)+[psutil.Process(child.pid)]
    for p in reversed(owned):
     try:p.terminate()
     except psutil.NoSuchProcess:pass
    _,alive=psutil.wait_procs(owned,timeout=5)
    for p in alive:
     try:p.kill()
     except psutil.NoSuchProcess:pass
    child.wait();code=124
   if code:break
 changed=[f for f,h in plan['sources'].items() if sha(f)!=h]
 target=OUT/'current-resource-artifacts';target.mkdir(exist_ok=True);index=[]
 for p in sorted({p for job in plan['jobs'] for p in (ROOT/'test/out/fp-review').glob('*'+job['tag']+'*')}):
  if p.is_file():shutil.copyfile(p,target/p.name);index.append({'file':p.name,'sha256':sha(target/p.name)})
 write('resource-artifact-index.json',{'files':index})
 state.update(phase='complete' if code==0 and not changed else 'failed',exit=code,changedSources=changed,completedAt=time.time(),leaseReleased=True)
 write('resource-status.json',state)
