#!/usr/bin/env python3
"""Current-pilot candidate: strict language regression and bounded focused resource validation, one browser at a time."""
from pathlib import Path
import os,json,hashlib,subprocess,fcntl,time,shutil,re,psutil
OUT=Path(__file__).resolve().parent;ROOT=Path('/workspace/c50-notice-pilot');os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
files=[p for name in ['src','data','lib','assets/3d'] for p in Path(name).rglob('*') if p.is_file()]+[Path(p) for p in ['index.html','first-person.html','test/fplangsbrowser.js','test/fpbench.js','test/fpquality.js','test/fpsignlayoutbrowser.js']]
jobs=[{'tag':'notice-layout-low','script':'test/fpsignlayoutbrowser.js','env':{'QA_GFX':'low','QA_LANGS':'en,ta','QA_SIZES':'normal,large'}},{'tag':'notice-layout-high','script':'test/fpsignlayoutbrowser.js','env':{'QA_GFX':'high','QA_LANGS':'en,ta','QA_SIZES':'normal,large'}}]
plan={'candidateBase':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'ownedFix':'e82091aafe09625d9e046a52084a2457264d5679','scope':'Complete C-50 runtime on current pilot, including its original address-label suppression and the translated signal/yield notice correction. Current pilot index scripts are retained; one lettering tag is added. No branch merge. Native sign/head/mirror/nav occlusion audits run in English and Tamil, normal/larger, Low and High. The separate final phase retains strict all-language and resource checks.','sources':{str(p):sha(p) for p in sorted(set(files))},'jobs':jobs};(OUT/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
state={'phase':'queued','jobs':[],'pid':os.getpid(),'startedAt':time.time()}
def save(): (OUT/'status.json').write_text(json.dumps(state,indent=2)+'\n')
save()
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX);server=None
 try:
  server=subprocess.Popen(['python3','-m','http.server','8401','--bind','127.0.0.1'],stdout=open(OUT/'server.log','w'),stderr=subprocess.STDOUT,cwd=ROOT);state['serverPid']=server.pid;time.sleep(.2);assert server.poll() is None
  for job in jobs:
   assert all(sha(f)==h for f,h in plan['sources'].items()),'Frozen source changed'
   tag=job['tag'];state.update(phase='running',tag=tag);save();raw=ROOT/'test/out/fp-review';raw.mkdir(parents=True,exist_ok=True);before={p.name:p.stat().st_mtime_ns for p in raw.glob('*') if p.is_file()}
   with open(OUT/(tag+'.log'),'w') as log:
    child=subprocess.Popen(['node',job['script']],env={**os.environ,**job['env'],'QA_BASE':'http://127.0.0.1:8401','QA_BROWSER':'/usr/bin/chromium','QA_TAG':tag},cwd=ROOT,stdout=log,stderr=log);state['childPid']=child.pid;save()
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
   if job['script']=='test/fpbench.js':
    env=job['env'];profile={'id':tag,'quality':env['QA_GFX'],'accessibility':env['QA_A11Y'],'fallback':env['QA_FALLBACK']=='1','views':views};report=folder/('bench-'+tag+'-'+env['QA_GFX']+'.json')
    js="const fs=require('fs'),{checkReport}=require('./test/fpquality');console.log(JSON.stringify(checkReport(JSON.parse(fs.readFileSync(process.argv[1])),JSON.parse(process.argv[2]),process.argv[3])));"
    p=subprocess.run(['node','-e',js,str(report),json.dumps(profile),tag],cwd=ROOT,capture_output=True,text=True);(OUT/(tag+'-quality.log')).write_text(p.stdout+p.stderr);assert p.returncode==0,'Quality protocol failed: '+tag;entry['peak']=json.loads(p.stdout);save()
  state['phase']='complete'
 except Exception as error:state.update(phase='failed',failure=str(error))
 finally:
  if server is not None and server.poll() is None:server.terminate();server.wait(timeout=10)
  state.update(serverExited=server is None or server.poll() is not None,leaseReleased=True,endedAt=time.time());save()
