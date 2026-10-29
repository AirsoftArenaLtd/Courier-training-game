#!/usr/bin/env python3
"""Serial native blocked-drive journeys; frozen inputs and exact owned-process cleanup."""
from pathlib import Path
import os,json,hashlib,subprocess,fcntl,time,shutil,psutil
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];OUT=BASE/'acceptance';OUT.mkdir(parents=True,exist_ok=True);os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
files=[p for name in ['src','data','lib','assets/3d','css','test/tools'] for p in Path(name).rglob('*') if p.is_file()]+[p for p in Path('test').glob('*.js')]+[Path(p) for p in ['index.html','first-person.html','assets/art-pack.js']]
jobs=[{'tag': 'c45-rebase-business-low-en', 'script': 'test/fppickupbrowser.js', 'env': {'QA_CASE': 'low-en-normal-business'}}, {'tag': 'c45-rebase-intl-low-en', 'script': 'test/fppickupbrowser.js', 'env': {'QA_CASE': 'low-en-normal-intl'}}, {'tag': 'c45-rebase-dg-low-en', 'script': 'test/fppickupbrowser.js', 'env': {'QA_CASE': 'low-en-normal-dg'}}, {'tag': 'c45-rebase-business-high-ta', 'script': 'test/fppickupbrowser.js', 'env': {'QA_CASE': 'high-ta-large-business'}}, {'tag': 'c45-rebase-intl-high-ta', 'script': 'test/fppickupbrowser.js', 'env': {'QA_CASE': 'high-ta-large-intl'}}, {'tag': 'c45-rebase-dg-high-ta', 'script': 'test/fppickupbrowser.js', 'env': {'QA_CASE': 'high-ta-large-dg'}}, {'tag': 'c45-rebase-bad-business-high-ta', 'script': 'test/fppickupbrowser.js', 'env': {'QA_CASE': 'high-ta-large-business', 'QA_VARIANT': 'bad-business'}}, {'tag': 'c45-rebase-bad-docs-high-ta', 'script': 'test/fppickupbrowser.js', 'env': {'QA_CASE': 'high-ta-large-intl', 'QA_VARIANT': 'bad-docs'}}, {'tag': 'c45-rebase-bad-call-high-ta', 'script': 'test/fppickupbrowser.js', 'env': {'QA_CASE': 'high-ta-large-dg', 'QA_VARIANT': 'bad-call'}}, {'tag': 'c45-rebase-pickup-resources', 'script': 'test/tools/fp-pickup-quality.js', 'env': {'QA_FPS_FLOOR': '0'}}]
fonts=Path('/usr/share/fonts/truetype/noto');fontfiles=[fonts/p for p in ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','NotoSansTamil-Regular.ttf','NotoSansTamil-Bold.ttf']]
plan={'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'scope':'C45 pickups/paperwork rebased onto pushed C44 eca956a8 over current-pilot C43/C42/C41/C38. Nine actual native journeys: all three existing IDs in Low English normal/High Tamil larger plus each harmful variant. Actual scene3d registry links and real key controls, original callback reference, durable isolated results and shipped B178 fonts. Sixty resource views retain original profiles/caps and local High shadow span. No post-start pose/clock/verdict/score writes. Historical matrices remain source-scoped; latest shared A30/A31 merge and Intel FPS separate.','sources':{str(p):sha(p) for p in files},'hostFonts':{str(p):sha(p) for p in fontfiles},'jobs':jobs}
(OUT/'plan.json').write_text(json.dumps(plan,indent=2)+'\n');state={'phase':'queued','controllerPid':os.getpid(),'jobs':[],'startedAt':time.time()}
def save(): (OUT/'status.json').write_text(json.dumps(state,indent=2)+'\n')
save()
state['phase']='waiting-for-c42';save()
while not Path('/workspace/otr-c42-release-validation').exists():time.sleep(2)
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX);server=None
 try:
  server=subprocess.Popen(['python3','-m','http.server','8422','--bind','127.0.0.1'],stdout=open(OUT/'server.log','w'),stderr=subprocess.STDOUT,cwd=ROOT);state['serverPid']=server.pid;time.sleep(.2);assert server.poll() is None
  for job in jobs:
   assert all(sha(f)==h for f,h in plan['sources'].items()),'Frozen source changed'
   tag=job['tag'];state.update(phase='running',tag=tag);save();print(tag,flush=True);raw=ROOT/'test/out/fp-review'
   with open(OUT/(tag+'.log'),'w') as log:
    child=subprocess.Popen(['node',job['script']],env={**os.environ,**job['env'],'QA_BASE':'http://127.0.0.1:8422','QA_BROWSER':'/usr/bin/chromium','QA_TAG':tag},cwd=ROOT,stdout=log,stderr=log);state['childPid']=child.pid;save()
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
