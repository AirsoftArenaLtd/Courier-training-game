#!/usr/bin/env python3
"""Eight static blocked-drive poses in four original quality profiles, under the shared browser lease."""
from pathlib import Path
import os,json,hashlib,subprocess,fcntl,time,shutil,psutil
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];OUT=BASE/'resources';OUT.mkdir(parents=True,exist_ok=True);os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
files=[p for name in ['src','data','lib','assets/3d','css','test/tools'] for p in Path(name).rglob('*') if p.is_file()]+[p for p in Path('test').glob('*.js')]+[Path(p) for p in ['index.html','first-person.html','assets/art-pack.js']]
jobs=[]
for family,views,flag,tool,method in [('blocked','blockedcab,blockednotice,blockedcar,blockedcard,blockedcargo,blockeddevice,blockedcontrols,blockedgate','QA_PROBLEM_BLOCKED','fp-problem-blocked-quality','checkBlocked'),('closure','closurebarrier,closurebay','QA_PROBLEM_ROUTES','fp-problem-route-quality','checkClosure')]:
 for tag,gfx,a11y,fallback in [('loaded-low','low','','0'),('loaded-high','high','','0'),('accessible-low','low','large,colour,reduced','0'),('fallback-low','low','','1')]:
  jobs.append({'tag':'c42-rebase-'+family+'-'+tag,'tool':tool,'method':method,'env':{'QA_GFX':gfx,'QA_A11Y':a11y,'QA_FALLBACK':fallback,'QA_VIEWS':views,'QA_PROTOTYPE_ONLY':'1','QA_FPS_FLOOR':'0','QA_SOUND':'1','QA_MIRROR_PROBE':'1',flag:'1','QA_SHOTS':'1'}})

plan={'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'scope':'Current-pilot C42 source: 32 blocked-drive and eight focused closure views across original profiles/caps. Actual card/notice/gate targets, existing mounted lettering batches, current assets, sound, reflection and isolation. Static poses are separate from native movement. Old closure/native matrices keep their source scope; shared optional launcher, translations and Intel FPS remain separate.','sources':{str(p):sha(p) for p in sorted(set(files))},'jobs':jobs};(OUT/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
state={'phase':'queued','jobs':[],'controllerPid':os.getpid(),'startedAt':time.time()}
def save(): (OUT/'status.json').write_text(json.dumps(state,indent=2)+'\n')
save()
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX);server=None
 try:
  server=subprocess.Popen(['python3','-m','http.server','8419','--bind','127.0.0.1'],stdout=open(OUT/'server.log','w'),stderr=subprocess.STDOUT,cwd=ROOT);state['serverPid']=server.pid;time.sleep(.2);assert server.poll() is None
  for job in jobs:
   assert all(sha(f)==h for f,h in plan['sources'].items()),'Frozen source changed'
   tag=job['tag'];state.update(phase='running',tag=tag);save();print(tag,flush=True);raw=ROOT/'test/out/fp-review'
   with open(OUT/(tag+'.log'),'w') as log:
    child=subprocess.Popen(['node','test/fpbench.js'],env={**os.environ,**job['env'],'QA_BASE':'http://127.0.0.1:8419','QA_BROWSER':'/usr/bin/chromium','QA_TAG':tag},cwd=ROOT,stdout=log,stderr=log);state['childPid']=child.pid;save()
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
   for p in raw.glob('*'+tag+'*'):
    if p.is_file():shutil.copyfile(p,folder/p.name);artifacts[p.name]=sha(folder/p.name)
   changed=[f for f,h in plan['sources'].items() if sha(f)!=h];entry={**job,'exit':code,'changedSources':changed,'artifacts':artifacts};state['jobs'].append(entry);save();assert code==0 and not changed,'Browser job failed: '+tag
   env=job['env'];profile={'id':tag,'quality':env['QA_GFX'],'accessibility':env['QA_A11Y'],'fallback':env['QA_FALLBACK']=='1','views':env['QA_VIEWS']};report=folder/('bench-'+tag+'-'+env['QA_GFX']+'.json')
   checker="const fs=require('fs'),q=require('./test/tools/"+job['tool']+"');console.log(JSON.stringify(q['"+job['method']+"'](JSON.parse(fs.readFileSync(process.argv[1])),JSON.parse(process.argv[2]),process.argv[3])));"
   entry['peak']=json.loads(subprocess.check_output(['node','-e',checker,str(report),json.dumps(profile),tag],text=True));save()
  state['phase']='complete'
 except Exception as error:state.update(phase='failed',failure=str(error))
 finally:
  if server is not None and server.poll() is None:server.terminate();server.wait(timeout=10)
  state.update(serverExited=server is None or server.poll() is not None,leaseReleased=True,endedAt=time.time());save();print(state['phase'],flush=True)
