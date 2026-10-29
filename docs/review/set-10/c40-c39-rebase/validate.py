#!/usr/bin/env python3
"""Serial native blocked-drive journeys; frozen inputs and exact owned-process cleanup."""
from pathlib import Path
import os,json,hashlib,subprocess,fcntl,time,shutil,psutil
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];OUT=BASE/'acceptance';OUT.mkdir(parents=True,exist_ok=True);os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
files=[p for name in ['src','data','lib','assets/3d','css','test/tools'] for p in Path(name).rglob('*') if p.is_file()]+[p for p in Path('test').glob('*.js')]+[Path(p) for p in ['index.html','first-person.html','assets/art-pack.js']]
jobs=[{'tag': 'c40-c39-label-low', 'script': 'test/fppackagelabelbrowser.js', 'env': {'QA_QUALITIES': 'low', 'QA_LANGS': 'en', 'QA_SIZES': 'normal', 'QA_DURABLE': '1'}}, {'tag': 'c40-c39-sort-low', 'script': 'test/fppackagesortbrowser.js', 'env': {'QA_QUALITIES': 'low', 'QA_LANGS': 'en', 'QA_SIZES': 'normal', 'QA_DURABLE': '1'}}, {'tag': 'c40-c39-lift-low', 'script': 'test/fppackageliftbrowser.js', 'env': {'QA_QUALITIES': 'low', 'QA_LANGS': 'en', 'QA_SIZES': 'normal', 'QA_DURABLE': '1'}}, {'tag': 'c40-c39-heavy-low', 'script': 'test/fppackageheavybrowser.js', 'env': {'QA_GFX': 'low', 'QA_LANG': 'en', 'QA_LARGE': '0'}}, {'tag': 'c40-c39-label-high', 'script': 'test/fppackagelabelbrowser.js', 'env': {'QA_QUALITIES': 'high', 'QA_LANGS': 'ta', 'QA_SIZES': 'large', 'QA_DURABLE': '1'}}, {'tag': 'c40-c39-sort-high', 'script': 'test/fppackagesortbrowser.js', 'env': {'QA_QUALITIES': 'high', 'QA_LANGS': 'ta', 'QA_SIZES': 'large', 'QA_DURABLE': '1'}}, {'tag': 'c40-c39-lift-high', 'script': 'test/fppackageliftbrowser.js', 'env': {'QA_QUALITIES': 'high', 'QA_LANGS': 'ta', 'QA_SIZES': 'large', 'QA_DURABLE': '1'}}, {'tag': 'c40-c39-heavy-high', 'script': 'test/fppackageheavybrowser.js', 'env': {'QA_GFX': 'high', 'QA_LANG': 'ta', 'QA_LARGE': '1'}}, {'tag': 'c40-c39-heavy-unsafe-high', 'script': 'test/fppackageheavybrowser.js', 'env': {'QA_GFX': 'high', 'QA_LANG': 'ta', 'QA_LARGE': '1', 'QA_UNSAFE': '1'}}, {'tag': 'c40-c39-heavy-budget-loaded-low', 'script': 'test/fpbench.js', 'env': {'QA_GFX': 'low', 'QA_A11Y': '', 'QA_FALLBACK': '0', 'QA_VIEWS': 'heavyassess,heavygrip,heavyteam,heavytruck,heavycritical,heavystatus', 'QA_PROTOTYPE_ONLY': '1', 'QA_FPS_FLOOR': '0', 'QA_SOUND': '1', 'QA_MIRROR_PROBE': '1', 'QA_PACKAGE_HEAVY': '1', 'QA_SHOTS': '1'}}, {'tag': 'c40-c39-heavy-budget-loaded-high', 'script': 'test/fpbench.js', 'env': {'QA_GFX': 'high', 'QA_A11Y': '', 'QA_FALLBACK': '0', 'QA_VIEWS': 'heavyassess,heavygrip,heavyteam,heavytruck,heavycritical,heavystatus', 'QA_PROTOTYPE_ONLY': '1', 'QA_FPS_FLOOR': '0', 'QA_SOUND': '1', 'QA_MIRROR_PROBE': '1', 'QA_PACKAGE_HEAVY': '1', 'QA_SHOTS': '1'}}, {'tag': 'c40-c39-heavy-budget-accessible-low', 'script': 'test/fpbench.js', 'env': {'QA_GFX': 'low', 'QA_A11Y': 'large,colour,reduced', 'QA_FALLBACK': '0', 'QA_VIEWS': 'heavyassess,heavygrip,heavyteam,heavytruck,heavycritical,heavystatus', 'QA_PROTOTYPE_ONLY': '1', 'QA_FPS_FLOOR': '0', 'QA_SOUND': '1', 'QA_MIRROR_PROBE': '1', 'QA_PACKAGE_HEAVY': '1', 'QA_SHOTS': '1'}}, {'tag': 'c40-c39-heavy-budget-fallback-low', 'script': 'test/fpbench.js', 'env': {'QA_GFX': 'low', 'QA_A11Y': '', 'QA_FALLBACK': '1', 'QA_VIEWS': 'heavyassess,heavygrip,heavyteam,heavytruck,heavycritical,heavystatus', 'QA_PROTOTYPE_ONLY': '1', 'QA_FPS_FLOOR': '0', 'QA_SOUND': '1', 'QA_MIRROR_PROBE': '1', 'QA_PACKAGE_HEAVY': '1', 'QA_SHOTS': '1'}}]
fonts=Path('/usr/share/fonts/truetype/noto');fontfiles=[fonts/p for p in ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','NotoSansTamil-Regular.ttf','NotoSansTamil-Bold.ttf']]
plan={'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'scope':'C40 rebased onto merged C39/pilot 5ac9bd74. Nine explicit native label/sort/lift/heavy scopes, actual B178 font selection for heavy controls, and 24 original-profile heavy resource views. C39 lesson files/imports are retained exactly; no old-source result is relabelled. Native sort fixtures/assessment abandonment retain their recorded scope; shared optional registry, A31 and Intel O1 remain separate.','sources':{str(p):sha(p) for p in files},'hostFonts':{str(p):sha(p) for p in fontfiles},'jobs':jobs}
(OUT/'plan.json').write_text(json.dumps(plan,indent=2)+'\n');state={'phase':'queued','controllerPid':os.getpid(),'jobs':[],'startedAt':time.time()}
def save(): (OUT/'status.json').write_text(json.dumps(state,indent=2)+'\n')
save()
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX);server=None
 try:
  server=subprocess.Popen(['python3','-m','http.server','8428','--bind','127.0.0.1'],stdout=open(OUT/'server.log','w'),stderr=subprocess.STDOUT,cwd=ROOT);state['serverPid']=server.pid;time.sleep(.2);assert server.poll() is None
  for job in jobs:
   assert all(sha(f)==h for f,h in plan['sources'].items()),'Frozen source changed'
   tag=job['tag'];state.update(phase='running',tag=tag);save();print(tag,flush=True);raw=ROOT/'test/out/fp-review'
   with open(OUT/(tag+'.log'),'w') as log:
    child=subprocess.Popen(['node',job['script']],env={**os.environ,**job['env'],'QA_BASE':'http://127.0.0.1:8428','QA_BROWSER':'/usr/bin/chromium','QA_TAG':tag},cwd=ROOT,stdout=log,stderr=log);state['childPid']=child.pid;save()
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
   changed=[f for f,h in plan['sources'].items() if sha(f)!=h];entry={**job,'exit':code,'changedSources':changed,'artifacts':artifacts};state['jobs'].append(entry);save();assert code==0 and not changed,'Browser job failed: '+tag
   if job['script']=='test/fpbench.js':
    env=job['env'];profile={'id':tag,'quality':env['QA_GFX'],'accessibility':env['QA_A11Y'],'fallback':env['QA_FALLBACK']=='1','views':env['QA_VIEWS']};report=folder/('bench-'+tag+'-'+env['QA_GFX']+'.json')
    js="const fs=require('node:fs'),{checkHeavy}=require('./test/tools/fp-package-heavy-quality');console.log(JSON.stringify(checkHeavy(JSON.parse(fs.readFileSync(process.argv[1])),JSON.parse(process.argv[2]),process.argv[3])));"
    q=subprocess.run(['node','-e',js,str(report),json.dumps(profile),tag],capture_output=True,text=True,cwd=ROOT);(OUT/(tag+'-quality.log')).write_text(q.stdout+q.stderr);assert q.returncode==0,'Original heavy resource proof failed: '+tag;entry['peak']=json.loads(q.stdout);save()
  state['phase']='complete'
 except Exception as error:state.update(phase='failed',failure=str(error))
 finally:
  if server is not None and server.poll() is None:server.terminate();server.wait(timeout=10)
  state.update(serverExited=server is None or server.poll() is not None,leaseReleased=True,endedAt=time.time());save();print(state['phase'],flush=True)
