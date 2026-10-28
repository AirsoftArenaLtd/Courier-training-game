#!/usr/bin/env python3
"""Heavy handling: original resource protocol and additional real-adapter proof, serialized under the browser lease."""
from pathlib import Path
import os,json,hashlib,subprocess,fcntl,time,shutil,psutil
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];OUT=BASE/'resources';OUT.mkdir(parents=True,exist_ok=True);os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
files=[p for name in ['src','data','lib','assets/3d'] for p in Path(name).rglob('*') if p.is_file()]+[Path(p) for p in ['index.html','first-person.html','test/fpbench.js','test/fpquality.js','test/tools/fp-package-heavy-quality.js']]
views='heavyassess,heavygrip,heavyteam,heavytruck,heavycritical,heavystatus'
jobs=[]
for tag,gfx,a11y,fallback in [('loaded-low','low','','0'),('loaded-high','high','','0'),('accessible-low','low','large,colour,reduced','0'),('fallback-low','low','','1')]:
 jobs.append({'tag':'c40-rebase-heavy-budget-'+tag,'script':'test/fpbench.js','env':{'QA_GFX':gfx,'QA_A11Y':a11y,'QA_FALLBACK':fallback,'QA_VIEWS':views,'QA_PROTOTYPE_ONLY':'1','QA_FPS_FLOOR':'0','QA_SOUND':'1','QA_MIRROR_PROBE':'1','QA_PACKAGE_HEAVY':'1','QA_SHOTS':'1'}})
plan={'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'scope':'Heavy adapter focused resource poses. Runtime/HTML is identical to the completed native safe/unsafe runs. Explicit representative grip/team/truck/policy/critical/status poses measure resources only; actual movement and critical timing are proven independently by native controls. Original sound, reflection, loaded/missing-model and ceilings apply. New proof checker verifies actual registered heavy adapter, canonical loads, physical targets, bounded body and untouched workday state. This candidate is rebased on current pilot via C38; shared optional launcher and Intel FPS remain separate.','sources':{str(p):sha(p) for p in sorted(set(files))},'jobs':jobs};(OUT/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
state={'phase':'queued','jobs':[],'pid':os.getpid(),'startedAt':time.time()}
def save(): (OUT/'status.json').write_text(json.dumps(state,indent=2)+'\n')
save()
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX);server=None
 try:
  server=subprocess.Popen(['python3','-m','http.server','8415','--bind','127.0.0.1'],stdout=open(OUT/'server.log','w'),stderr=subprocess.STDOUT,cwd=ROOT);state['serverPid']=server.pid;time.sleep(.2);assert server.poll() is None
  for job in jobs:
   assert all(sha(f)==h for f,h in plan['sources'].items()),'Frozen source changed'
   tag=job['tag'];state.update(phase='running',tag=tag);save();raw=ROOT/'test/out/fp-review';before={p.name:p.stat().st_mtime_ns for p in raw.glob('*') if p.is_file()}
   with open(OUT/(tag+'.log'),'w') as log:
    child=subprocess.Popen(['node',job['script']],env={**os.environ,**job['env'],'QA_BASE':'http://127.0.0.1:8415','QA_BROWSER':'/usr/bin/chromium','QA_TAG':tag},cwd=ROOT,stdout=log,stderr=log);state['childPid']=child.pid;save()
    try:code=child.wait(timeout=3600)
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
   env=job['env'];profile={'id':tag,'quality':env['QA_GFX'],'accessibility':env['QA_A11Y'],'fallback':env['QA_FALLBACK']=='1','views':views};report=folder/('bench-'+tag+'-'+env['QA_GFX']+'.json')
   js="const fs=require('fs'),{checkHeavy}=require('./test/tools/fp-package-heavy-quality');console.log(JSON.stringify(checkHeavy(JSON.parse(fs.readFileSync(process.argv[1])),JSON.parse(process.argv[2]),process.argv[3])));"
   q=subprocess.run(['node','-e',js,str(report),json.dumps(profile),tag],cwd=ROOT,capture_output=True,text=True);(OUT/(tag+'-quality.log')).write_text(q.stdout+q.stderr);assert q.returncode==0,'Resource protocol failed: '+tag;entry['peak']=json.loads(q.stdout);save()
  state['phase']='complete'
 except Exception as error:state.update(phase='failed',failure=str(error))
 finally:
  if server is not None and server.poll() is None:server.terminate();server.wait(timeout=10)
  state.update(serverExited=server is None or server.poll() is not None,leaseReleased=True,endedAt=time.time());save()
