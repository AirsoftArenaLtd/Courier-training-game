#!/usr/bin/env python3
"""Combined visual-pass resource evidence, using unmodified fpbench and original quality ceilings."""
from pathlib import Path
import os,json,hashlib,subprocess,fcntl,time,shutil,psutil
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];OUT=BASE/'acceptance';OUT.mkdir(parents=True,exist_ok=True);os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
common='cab,mirror,mirrorRight,mirrorInterior,lightingnightreverse,visibleweatherrainnight,visibleweatherrainreverse,visibleweatherstorm,navdouble,trafficschool,trafficpeak,ambientcab,ambientmirror,ambientnight'
profiles=[{'id':'loaded-high','quality':'high','views':common+',ambientbench'},{'id':'loaded-low','quality':'low','views':common},{'id':'accessible-low','quality':'low','accessibility':'large,colour,reduced','views':common},{'id':'fallback-low','quality':'low','fallback':True,'views':common}]
files=[p for name in ['src','data','lib','assets/3d','css','test/tools'] for p in Path(name).rglob('*') if p.is_file()]+[p for p in Path('test').glob('*.js')]+[Path(p) for p in ['index.html','first-person.html','assets/art-pack.js']]
fonts=Path('/usr/share/fonts/truetype/noto');fontfiles=[fonts/p for p in ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','NotoSansTamil-Regular.ttf','NotoSansTamil-Bold.ttf']]
jobs=[{'tag':'b132-c39-'+p['id'],'script':'test/fpbench.js','profile':p} for p in profiles]
plan={'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'pilotBase':'a7bd8b5785f6b13ffeebce60070caa625a9340b5','scope':'B132 combined visual-pass static resource fixtures at current pilot. Fifteen loaded High and fourteen each loaded/accessibility/missing-model Low views (57 total). Unmodified fpbench and checkReport, original profiles/budgets, all existing fixture flags and actual live mirror pixel probes. No product or test-source changes. Software-rendering frame times are diagnostic only, not owner Intel O1 acceptance.','sources':{str(p):sha(p) for p in files},'hostFonts':{str(p):sha(p) for p in fontfiles},'jobs':jobs}
(OUT/'plan.json').write_text(json.dumps(plan,indent=2)+'\n');state={'phase':'queued','controllerPid':os.getpid(),'jobs':[],'startedAt':time.time()}
def save():(OUT/'status.json').write_text(json.dumps(state,indent=2)+'\n')
save()
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX);server=None
 try:
  server=subprocess.Popen(['python3','-m','http.server','8440','--bind','127.0.0.1'],stdout=open(OUT/'server.log','w'),stderr=subprocess.STDOUT,cwd=ROOT);state['serverPid']=server.pid;time.sleep(.2);assert server.poll() is None
  for job in jobs:
   assert all(sha(f)==h for f,h in plan['sources'].items()),'Frozen source changed'
   tag=job['tag'];profile=job['profile'];state.update(phase='running',tag=tag);save();print(tag,flush=True)
   env={**os.environ,'QA_BASE':'http://127.0.0.1:8440','QA_BROWSER':'/usr/bin/chromium','QA_GFX':profile['quality'],'QA_TAG':tag,'QA_PROTOTYPE_ONLY':'1','QA_FPS_FLOOR':'0','QA_MODULES':'','QA_THEME':'','QA_SHOTS':'1','QA_VIEWS':profile['views'],'QA_A11Y':profile.get('accessibility',''),'QA_FALLBACK':'1' if profile.get('fallback') else '0'}
   for key in ['AMBIENT','RADIO','WALKAROUND','DAMAGE','STOPS','TRAFFIC','NAV','SIGNS','ACTORS','TOWN','LIGHTING','WEATHER','SOUND','MIRROR_PROBE']:env['QA_'+key]='1'
   with open(OUT/(tag+'.log'),'w') as log:
    child=subprocess.Popen(['node',job['script']],env=env,cwd=ROOT,stdout=log,stderr=log);state['childPid']=child.pid;save()
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
   for p in (ROOT/'test/out/fp-review').glob('*'+tag+'*'):
    if p.is_file():shutil.copyfile(p,folder/p.name);artifacts[p.name]=sha(folder/p.name)
   changed=[f for f,h in plan['sources'].items() if sha(f)!=h];entry={**job,'exit':code,'changedSources':changed,'artifacts':artifacts};state['jobs'].append(entry);save();assert code==0 and not changed,'Browser job failed: '+tag
   report=folder/('bench-'+tag+'-'+profile['quality']+'.json')
   js="const fs=require('node:fs'),{checkReport}=require('./test/fpquality');console.log(JSON.stringify(checkReport(JSON.parse(fs.readFileSync(process.argv[1])),JSON.parse(process.argv[2]),process.argv[3])));"
   q=subprocess.run(['node','-e',js,str(report),json.dumps(profile),tag],capture_output=True,text=True,cwd=ROOT);(OUT/(tag+'-quality.log')).write_text(q.stdout+q.stderr);assert q.returncode==0,'Original resource ceilings or fixture proof failed: '+tag
   entry['peak']=json.loads(q.stdout);save()
  state['phase']='complete'
 except Exception as error:state.update(phase='failed',failure=str(error))
 finally:
  if server is not None and server.poll() is None:server.terminate();server.wait(timeout=10)
  state.update(serverExited=server is None or server.poll() is not None,leaseReleased=True,endedAt=time.time());save();print(state['phase'],flush=True)
