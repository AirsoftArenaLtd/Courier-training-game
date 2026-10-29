#!/usr/bin/env python3
"""Serial native blocked-drive journeys; frozen inputs and exact owned-process cleanup."""
from pathlib import Path
import os,json,hashlib,subprocess,fcntl,time,shutil,psutil
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];OUT=BASE/'acceptance';OUT.mkdir(parents=True,exist_ok=True);os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
files=[p for name in ['src','data','lib','assets/3d','css','test/tools'] for p in Path(name).rglob('*') if p.is_file()]+[p for p in Path('test').glob('*.js')]+[Path(p) for p in ['index.html','first-person.html','assets/art-pack.js']]
jobs=[{'tag': 'c39-rebase-pretrip-low', 'script': 'test/fppretripbrowser.js', 'env': {'QA_QUALITIES': 'low', 'QA_LANGS': 'en', 'QA_SIZES': 'normal', 'QA_GFX': 'low'}}, {'tag': 'c39-rebase-routelesson-low', 'script': 'test/fproutelessonbrowser.js', 'env': {'QA_QUALITIES': 'low', 'QA_LANGS': 'en', 'QA_SIZES': 'normal', 'QA_GFX': 'low'}}, {'tag': 'c39-rebase-hazardlesson-low', 'script': 'test/fphazardlessonbrowser.js', 'env': {'QA_QUALITIES': 'low', 'QA_LANGS': 'en', 'QA_SIZES': 'normal', 'QA_GFX': 'low'}}, {'tag': 'c39-rebase-drivinglesson-low', 'script': 'test/fpdrivinglessonbrowser.js', 'env': {'QA_QUALITIES': 'low', 'QA_LANGS': 'en', 'QA_SIZES': 'normal', 'QA_GFX': 'low'}}, {'tag': 'c39-rebase-junctionlesson-low', 'script': 'test/fpjunctionlessonbrowser.js', 'env': {'QA_QUALITIES': 'low', 'QA_LANGS': 'en', 'QA_SIZES': 'normal', 'QA_GFX': 'low'}}, {'tag': 'c39-rebase-schoollesson-low', 'script': 'test/fpschoollessonbrowser.js', 'env': {'QA_QUALITIES': 'low', 'QA_LANGS': 'en', 'QA_SIZES': 'normal', 'QA_GFX': 'low'}}, {'tag': 'c39-rebase-nightlesson-low', 'script': 'test/fpnightlessonbrowser.js', 'env': {'QA_QUALITIES': 'low', 'QA_LANGS': 'en', 'QA_SIZES': 'normal', 'QA_GFX': 'low'}}, {'tag': 'c39-rebase-junctionlesson-high-ta', 'script': 'test/fpjunctionlessonbrowser.js', 'env': {'QA_QUALITIES': 'high', 'QA_LANGS': 'ta', 'QA_SIZES': 'large', 'QA_GFX': 'high'}}, {'tag': 'c39-rebase-schoollesson-high-ta', 'script': 'test/fpschoollessonbrowser.js', 'env': {'QA_QUALITIES': 'high', 'QA_LANGS': 'ta', 'QA_SIZES': 'large', 'QA_GFX': 'high'}}, {'tag': 'c39-rebase-nightlesson-high-ta', 'script': 'test/fpnightlessonbrowser.js', 'env': {'QA_QUALITIES': 'high', 'QA_LANGS': 'ta', 'QA_SIZES': 'large', 'QA_GFX': 'high'}}, {'tag': 'c39-rebase-junctionlesson-resources', 'script': 'test/fpquality.js', 'env': {'QA_JUNCTIONLESSON_ONLY': '1', 'QA_FPS_FLOOR': '0'}}, {'tag': 'c39-rebase-schoollesson-resources', 'script': 'test/fpquality.js', 'env': {'QA_SCHOOLLESSON_ONLY': '1', 'QA_FPS_FLOOR': '0'}}, {'tag': 'c39-rebase-nightlesson-resources', 'script': 'test/fpquality.js', 'env': {'QA_NIGHTLESSON_ONLY': '1', 'QA_FPS_FLOOR': '0'}}]
fonts=Path('/usr/share/fonts/truetype/noto');fontfiles=[fonts/p for p in ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','NotoSansTamil-Regular.ttf','NotoSansTamil-Bold.ttf']]
plan={'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'scope':'C39 rebased via C38 onto pilot 3678fba3: each native adapter on Low, junction/school/night High larger Tamil, and 92 current-source resource views in the three new courses. Each native runner retains its declared target/skip-travel fixtures. Shared launcher and Intel FPS remain separate; historical manifests retain their original source scope.','sources':{str(p):sha(p) for p in files},'hostFonts':{str(p):sha(p) for p in fontfiles},'jobs':jobs}
(OUT/'plan.json').write_text(json.dumps(plan,indent=2)+'\n');state={'phase':'queued','controllerPid':os.getpid(),'jobs':[],'startedAt':time.time()}
def save(): (OUT/'status.json').write_text(json.dumps(state,indent=2)+'\n')
save()
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX);server=None
 try:
  server=subprocess.Popen(['python3','-m','http.server','8413','--bind','127.0.0.1'],stdout=open(OUT/'server.log','w'),stderr=subprocess.STDOUT,cwd=ROOT);state['serverPid']=server.pid;time.sleep(.2);assert server.poll() is None
  for job in jobs:
   assert all(sha(f)==h for f,h in plan['sources'].items()),'Frozen source changed'
   tag=job['tag'];state.update(phase='running',tag=tag);save();print(tag,flush=True);raw=ROOT/'test/out/fp-review'
   with open(OUT/(tag+'.log'),'w') as log:
    child=subprocess.Popen(['node',job['script']],env={**os.environ,**job['env'],'QA_BASE':'http://127.0.0.1:8413','QA_BROWSER':'/usr/bin/chromium','QA_TAG':tag},cwd=ROOT,stdout=log,stderr=log);state['childPid']=child.pid;save()
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
