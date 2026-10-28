#!/usr/bin/env python3
"""Serial native blocked-drive journeys; frozen inputs and exact owned-process cleanup."""
from pathlib import Path
import os,json,hashlib,subprocess,fcntl,time,shutil,psutil
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];OUT=BASE/'native-font-retry';OUT.mkdir(parents=True,exist_ok=True);os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
files=[p for name in ['src','data','lib','assets/3d','css','test/tools'] for p in Path(name).rglob('*') if p.is_file()]+[p for p in Path('test').glob('*.js')]+[Path(p) for p in ['index.html','first-person.html','assets/art-pack.js']]
jobs=[{'tag': 'c41-fontfix-intercom-high', 'script': 'test/fpcustomerprotocolbrowser.js', 'env': {'QA_GFX': 'high', 'QA_LANG': 'ta', 'QA_LARGE': '1', 'QA_KIND': 'intercom'}}, {'tag': 'c41-fontfix-reception-high', 'script': 'test/fpcustomerprotocolbrowser.js', 'env': {'QA_GFX': 'high', 'QA_LANG': 'ta', 'QA_LARGE': '1', 'QA_KIND': 'reception'}}, {'tag': 'c41-fontfix-locker-high', 'script': 'test/fpcustomerprotocolbrowser.js', 'env': {'QA_GFX': 'high', 'QA_LANG': 'ta', 'QA_LARGE': '1', 'QA_KIND': 'locker'}}, {'tag': 'c41-fontfix-intercom-bad', 'script': 'test/fpcustomerprotocolbrowser.js', 'env': {'QA_GFX': 'high', 'QA_LANG': 'ta', 'QA_LARGE': '1', 'QA_KIND': 'intercom', 'QA_BAD': '1'}}, {'tag': 'c41-fontfix-missing-low', 'script': 'test/fpcustomerbrowser.js', 'env': {'QA_CASE': 'low-en-normal-missing'}}, {'tag': 'c41-fontfix-twostops-high-ta', 'script': 'test/fpcustomerbrowser.js', 'env': {'QA_CASE': 'high-ta-large-twostops'}}, {'tag': 'c41-fontfix-doorsteps-low', 'script': 'test/fpcustomerstopbrowser.js', 'env': {'QA_CASE': 'low-en-normal'}}, {'tag': 'c41-fontfix-doorsteps-high-ta', 'script': 'test/fpcustomerstopbrowser.js', 'env': {'QA_CASE': 'high-ta-large'}}]
fonts=Path('/usr/share/fonts/truetype/noto');fontfiles=[fonts/p for p in ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','NotoSansTamil-Regular.ttf','NotoSansTamil-Bold.ttf']]
plan={'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'scope':'C41 rebased via pushed C38 onto pilot 3678fba3 (51e066b5 changes docs only). Eight continuation jobs cover High optional protocols, bad intercom and original-id regressions; three completed Low protocols remain verified at the original frozen source. Only the off-screen font probe changed to wait for layout. Protocol runs use shipped B178 font selection without a pin and prove Tamil glyph-family resolution from actual Phaser font. Descriptor/profile/workday fixtures remain; no post-start pose/clock/score writes. Shared optional launcher, translations, resources and Intel FPS are separate.','sources':{str(p):sha(p) for p in files},'hostFonts':{str(p):sha(p) for p in fontfiles},'jobs':jobs}
(OUT/'plan.json').write_text(json.dumps(plan,indent=2)+'\n');state={'phase':'queued','controllerPid':os.getpid(),'jobs':[],'startedAt':time.time()}
def save(): (OUT/'status.json').write_text(json.dumps(state,indent=2)+'\n')
save()
state['phase']='waiting-for-c42';save()
while not Path('/workspace/otr-c42-release-validation').exists():time.sleep(2)
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX);server=None
 try:
  server=subprocess.Popen(['python3','-m','http.server','8416','--bind','127.0.0.1'],stdout=open(OUT/'server.log','w'),stderr=subprocess.STDOUT,cwd=ROOT);state['serverPid']=server.pid;time.sleep(.2);assert server.poll() is None
  for job in jobs:
   assert all(sha(f)==h for f,h in plan['sources'].items()),'Frozen source changed'
   tag=job['tag'];state.update(phase='running',tag=tag);save();print(tag,flush=True);raw=ROOT/'test/out/fp-review'
   with open(OUT/(tag+'.log'),'w') as log:
    child=subprocess.Popen(['node',job['script']],env={**os.environ,**job['env'],'QA_BASE':'http://127.0.0.1:8416','QA_BROWSER':'/usr/bin/chromium','QA_TAG':tag},cwd=ROOT,stdout=log,stderr=log);state['childPid']=child.pid;save()
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
 except Exception as error:state.update(phase='failed',failure=str(error))
 finally:
  if server is not None and server.poll() is None:server.terminate();server.wait(timeout=10)
  state.update(serverExited=server is None or server.poll() is not None,leaseReleased=True,endedAt=time.time());save();print(state['phase'],flush=True)
