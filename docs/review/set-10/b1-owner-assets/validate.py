#!/usr/bin/env python3
"""Serial, bounded, source-frozen asset checks with one browser lease and an owned HTTP server."""
import fcntl,hashlib,json,os,shutil,subprocess,time
from pathlib import Path
import psutil
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[3];os.chdir(ROOT)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(s):
 p=OUT/'browser-status.json';t=p.with_suffix('.tmp');t.write_text(json.dumps(s,indent=2)+'\n');t.replace(p)
plan=json.loads((OUT/'browser-plan.json').read_text());state={'phase':'queued','pid':os.getpid(),'jobs':[],'startedAt':time.time()};write(state)
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX);server=None
 try:
  server=subprocess.Popen(['python3','-m','http.server','8398'],cwd=ROOT,stdout=open(OUT/'server.log','w'),stderr=subprocess.STDOUT);state['serverPid']=server.pid;time.sleep(.2)
  assert server.poll() is None,'Owned server could not start'
  for index,job in enumerate(plan['jobs']):
   assert all(sha(f)==h for f,h in plan['sources'].items()),'Frozen input changed'
   tag=job['tag'];state.update(phase='running',index=index,tag=tag);write(state)
   with open(OUT/(tag+'.log'),'w') as log:
    child=subprocess.Popen(['node',job['script']],env={**os.environ,**job['env'],'QA_BASE':plan['base'],'QA_TAG':tag},stdout=log,stderr=log,start_new_session=True);state['childPid']=child.pid;write(state)
    try:code=child.wait(timeout=1800)
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
   folder=OUT/'artifacts';folder.mkdir(exist_ok=True);files=[]
   for p in sorted((ROOT/'test/out/fp-review').glob('*'+tag+'*')):
    if p.is_file():shutil.copyfile(p,folder/p.name);files.append({'file':p.name,'sha256':sha(folder/p.name)})
   changed=[f for f,h in plan['sources'].items() if sha(f)!=h];accepted=code==0 and not changed
   state['jobs'].append({**job,'exit':code,'accepted':accepted,'changedSources':changed,'artifacts':files});write(state)
   assert accepted,'Browser case failed: '+tag
  state['phase']='complete'
 except Exception as error:state.update(phase='failed',failure=str(error))
 finally:
  if server is not None and server.poll() is None:server.terminate();server.wait(timeout=10)
  state.update(serverExited=server is None or server.poll() is not None,leaseReleased=True,endedAt=time.time());write(state)
