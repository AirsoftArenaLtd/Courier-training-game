#!/usr/bin/env python3
"""Preserve the independent baseline, then serialize candidate browser checks under the shared lease."""
from pathlib import Path
import os,json,hashlib,subprocess,fcntl,time,shutil,psutil
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];OUT=BASE/'acceptance';OUT.mkdir(parents=True,exist_ok=True);os.chdir(ROOT)
BASELINE=Path('/workspace/b4-first-frame-candidate/docs/review/backlog/b4-first-frame-c39/candidate/resources-ready/status.json')
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
files=[p for name in ['src','data','lib','assets/3d','css','test/tools'] for p in Path(name).rglob('*') if p.is_file()]+[p for p in Path('test').glob('*.js')]+[Path(p) for p in ['index.html','first-person.html','assets/art-pack.js']]
jobs=[{'tag': 'b4-overlap-assets', 'script': 'test/fpassetsbrowser.js', 'env': {}}, {'tag': 'b4-overlap-frame-low', 'script': 'test/fpfirstframebrowser.js', 'env': {'QA_GFX': 'low'}}, {'tag': 'b4-overlap-frame-high', 'script': 'test/fpfirstframebrowser.js', 'env': {'QA_GFX': 'high'}}, {'tag': 'b4-overlap-recovery-low', 'script': 'test/fpcontextrecoverybrowser.js', 'env': {'QA_GFX': 'low', 'QA_LANG': 'en', 'QA_LARGE': '0'}}, {'tag': 'b4-overlap-resources', 'script': 'test/tools/fp-startup-quality.js', 'env': {}}]
fonts=Path('/usr/share/fonts/truetype/noto');fontfiles=[fonts/p for p in ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','NotoSansTamil-Regular.ttf','NotoSansTamil-Bold.ttf']]
plan={'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'scope':'B4b overlaps the required local glTF script with selected model transfer after manifest validation. Full Low/High asset choices, original per-model await/retries, validation and cancellation remain. The previous paired candidate must complete before comparing identical native cold/resume probes. Asset failure/layout/restart, Low recovery and 16 original resource views remain separate checks; cloud wall times cannot certify owner Intel O1.','sources':{str(p):sha(p) for p in files},'hostFonts':{str(p):sha(p) for p in fontfiles},'jobs':jobs,'baselineStatus':str(BASELINE)}
(OUT/'plan.json').write_text(json.dumps(plan,indent=2)+'\n');state={'phase':'waiting-for-parent-candidate','controllerPid':os.getpid(),'jobs':[],'startedAt':time.time()}
def save():(OUT/'status.json').write_text(json.dumps(state,indent=2)+'\n')
save()
try:
 while True:
  baseline=json.loads(BASELINE.read_text())
  if baseline['phase']=='failed':raise RuntimeError('Parent candidate failed; preserve it and resolve before measuring loader overlap')
  if baseline['phase']=='complete':
   assert baseline['serverExited'] and baseline['leaseReleased'];break
  time.sleep(2)
 with open('/workspace/.otr-browser-validation.lock','a') as lease:
  state['phase']='queued';save();fcntl.flock(lease,fcntl.LOCK_EX);server=None
  try:
   server=subprocess.Popen(['python3','-m','http.server','8441','--bind','127.0.0.1'],stdout=open(OUT/'server.log','w'),stderr=subprocess.STDOUT,cwd=ROOT);state['serverPid']=server.pid;time.sleep(.2);assert server.poll() is None
   for job in jobs:
    assert all(sha(f)==h for f,h in plan['sources'].items()),'Frozen source changed'
    tag=job['tag'];state.update(phase='running',tag=tag);save();print(tag,flush=True);raw=ROOT/'test/out/fp-review'
    with open(OUT/(tag+'.log'),'w') as log:
     child=subprocess.Popen(['node',job['script']],env={**os.environ,**job['env'],'QA_BASE':'http://127.0.0.1:8441','QA_BROWSER':'/usr/bin/chromium','QA_TAG':tag},cwd=ROOT,stdout=log,stderr=log);state['childPid']=child.pid;save()
     try:code=child.wait(timeout=7200)
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
    for p in raw.glob('*'+tag+'*'):
     if p.is_file():shutil.copyfile(p,folder/p.name);artifacts[p.name]=sha(folder/p.name)
    changed=[f for f,h in plan['sources'].items() if sha(f)!=h];state['jobs'].append({**job,'exit':code,'changedSources':changed,'artifacts':artifacts});save();assert code==0 and not changed,'Browser job failed: '+tag
   state['phase']='complete'
  finally:
   if server is not None and server.poll() is None:server.terminate();server.wait(timeout=10)
   state.update(serverExited=server is None or server.poll() is not None,leaseReleased=True,endedAt=time.time());save()
except Exception as error:state.update(phase='failed',failure=str(error),endedAt=time.time());save()
print(state['phase'],flush=True)
