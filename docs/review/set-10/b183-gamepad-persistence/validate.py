#!/usr/bin/env python3
"""Current-pilot C-52 candidate: serial native road/device/layout and original resource checks."""
from pathlib import Path
import os,json,hashlib,subprocess,fcntl,time,shutil,psutil
OUT=Path(__file__).resolve().parent/'attempt-1';OUT.mkdir(exist_ok=True);ROOT=Path('/workspace/b183-gamepad-persistence');os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
files=[p for name in ['src','data','lib','assets/3d'] for p in Path(name).rglob('*') if p.is_file()]+list(Path('test').glob('fp*.js'))+[Path('index.html'),Path('first-person.html')]
jobs=[{'tag':'saved-remap-low-en','script':'test/fpgamepadremapbrowser.js','env':{'QA_GFX':'low','QA_LANG':'en','QA_LARGE':'0'}},{'tag':'saved-remap-high-ta','script':'test/fpgamepadremapbrowser.js','env':{'QA_GFX':'high','QA_LANG':'ta','QA_LARGE':'1'}}]
plan={'candidateBase':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'ownedBranch':'codex/b183-gamepad-persistence','scope':'B-183 saved gamepad overrides on current pilot 9105e301. Actual remapping, cancellation/conflict, disable, sensitivity, reset, profile writer and reload. The only synthetic setup is a parked cab/profile/fake Gamepad API plus an oversize-feedback layout. No subsequent mission/position/verdict/clock changes. Scene/index and B-3 guards are unchanged; no graphics-resource change is claimed. Three new body strings await shared translations.','sources':{str(p):sha(p) for p in sorted(set(files))},'jobs':jobs};(OUT/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
state={'phase':'queued','jobs':[],'pid':os.getpid(),'startedAt':time.time()}
def save():(OUT/'status.json').write_text(json.dumps(state,indent=2)+'\n')
save()
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX);server=None
 try:
  server=subprocess.Popen(['python3','-m','http.server','8404','--bind','127.0.0.1'],stdout=open(OUT/'server.log','w'),stderr=subprocess.STDOUT,cwd=ROOT);state['serverPid']=server.pid;time.sleep(.2);assert server.poll() is None,'Loopback server did not start'
  for job in jobs:
   assert all(sha(f)==h for f,h in plan['sources'].items()),'Frozen source changed'
   tag=job['tag'];state.update(phase='running',tag=tag);save();raw=ROOT/'test/out/fp-review';raw.mkdir(parents=True,exist_ok=True);before={p.name:p.stat().st_mtime_ns for p in raw.glob('*') if p.is_file()}
   with open(OUT/(tag+'.log'),'w') as log:
    child=subprocess.Popen(['node',job['script']],env={**os.environ,**job['env'],'QA_BASE':'http://127.0.0.1:8404','QA_BROWSER':'/usr/bin/chromium','QA_TAG':tag},cwd=ROOT,stdout=log,stderr=log);state['childPid']=child.pid;save()
    try:code=child.wait(timeout=2400)
    except subprocess.TimeoutExpired:
     owned=psutil.Process(child.pid).children(recursive=True)+[psutil.Process(child.pid)]
     for proc in reversed(owned):
      try:proc.terminate()
      except psutil.NoSuchProcess:pass
     _,alive=psutil.wait_procs(owned,timeout=5)
     for proc in alive:
      try:proc.kill()
      except psutil.NoSuchProcess:pass
     child.wait();code=124
   folder=OUT/'artifacts'/tag;folder.mkdir(parents=True,exist_ok=True);artifacts={}
   for p in raw.glob('*'):
    if p.is_file() and before.get(p.name)!=p.stat().st_mtime_ns:shutil.copyfile(p,folder/p.name);artifacts[p.name]=sha(folder/p.name)
   changed=[f for f,h in plan['sources'].items() if sha(f)!=h];entry={**job,'exit':code,'changedSources':changed,'artifacts':artifacts};state['jobs'].append(entry);save();assert code==0 and not changed,'Browser job failed: '+tag
  state['phase']='complete'
 except Exception as error:state.update(phase='failed',failure=str(error))
 finally:
  if server is not None and server.poll() is None:server.terminate();server.wait(timeout=10)
  state.update(serverExited=server is None or server.poll() is not None,leaseReleased=True,endedAt=time.time());save()
