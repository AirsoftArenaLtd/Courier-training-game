#!/usr/bin/env python3
"""Serial, source-frozen native cases; keep every completed case and stop on the first actual failure."""
import fcntl,hashlib,json,os,shutil,subprocess,time
from pathlib import Path
import psutil
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[3];os.chdir(ROOT)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(name,data):
 p=OUT/name;t=p.with_suffix(p.suffix+'.tmp');t.write_text(json.dumps(data,indent=2)+'\n');t.replace(p)
plan=json.loads((OUT/'plan.json').read_text());state={'phase':'queued','pid':os.getpid(),'startedAt':time.time(),'jobs':[]};write('status.json',state)
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX)
 try:
  for index,job in enumerate(plan['jobs']):
   changed=[f for f,h in plan['sources'].items() if sha(f)!=h]
   if changed:raise RuntimeError('Frozen source changed: '+','.join(changed))
   tag=job['tag'];env={**os.environ,'QA_BASE':'http://127.0.0.1:8397','QA_TAG':tag,'QA_GFX':job['quality'],'QA_LANG':job['language'],'QA_LARGE':'1' if job['large'] else '0','QA_VARIANT':job['variant']}
   state.update(phase='running',index=index,tag=tag);write('status.json',state)
   with open(OUT/(tag+'.log'),'w') as log:
    child=subprocess.Popen(['node','test/fpreversebrowser.js'],env=env,stdout=log,stderr=log,start_new_session=True)
    state['childPid']=child.pid;write('status.json',state)
    try:code=child.wait(timeout=job.get('wallSeconds',2400))
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
   for p in sorted((ROOT/'test/out/fp-review').glob(tag+'*')):
    if p.is_file():shutil.copyfile(p,folder/p.name);files.append({'file':p.name,'sha256':sha(folder/p.name)})
   report=folder/(tag+'.json');r=json.loads(report.read_text()) if report.exists() else {}
   changed=[f for f,h in plan['sources'].items() if sha(f)!=h]
   accepted=code==0 and r.get('complete') is True and r.get('durable') is True and not changed
   row={**job,'exit':code,'accepted':accepted,'checks':r.get('checks',0),'captures':len(r.get('shots',[])),'durable':r.get('durable',False),'score':r.get('result',{}).get('score'),'stars':r.get('result',{}).get('stars'),'assessment':r.get('result',{}).get('assessment') or r.get('abandoned',{}).get('assessment'),'changedSources':changed,'artifacts':files}
   state['jobs'].append(row);write('status.json',state)
   if not accepted:raise RuntimeError('Native case failed: '+tag)
  state['phase']='complete'
 except Exception as error:state.update(phase='failed',failure=str(error))
 finally:state.update(leaseReleased=True,endedAt=time.time());write('status.json',state)
