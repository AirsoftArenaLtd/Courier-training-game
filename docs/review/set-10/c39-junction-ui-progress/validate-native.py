#!/usr/bin/env python3
"""Frozen native checks, serial browsers, loopback server and an exclusive workspace lease."""
from pathlib import Path
import fcntl,hashlib,json,os,shutil,subprocess,time
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[3];os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
files=[p for root in ['src','data','lib','assets/3d'] for p in Path(root).rglob('*') if p.is_file()]+[Path(p) for p in ['index.html','first-person.html','test/fpjunctionlessonbrowser.js','test/tools/fp-junction-lesson-fixture.js']]
plan={'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'scope':'Owned junction UI on existing C-38 stack, before current-pilot integration. Final source hashes include uncommitted adapter/render files. Test-only descriptor is not shared A-30 launcher acceptance.','sources':{str(p):sha(p) for p in sorted(set(files))},'jobs':[{'tag':'junction-low-en-normal','env':{'QA_QUALITIES':'low','QA_LANGS':'en','QA_SIZES':'normal'}},{'tag':'junction-high-ta-large','env':{'QA_QUALITIES':'high','QA_LANGS':'ta','QA_SIZES':'large'}}]}
(OUT/'native-plan.json').write_text(json.dumps(plan,indent=2)+'\n')
state={'phase':'queued','jobs':[],'startedAt':time.time(),'pid':os.getpid()}
def save(): (OUT/'native-status.json').write_text(json.dumps(state,indent=2)+'\n')
save()
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX);server=None
 try:
  server=subprocess.Popen(['python3','-m','http.server','8400','--bind','127.0.0.1'],cwd=ROOT,stdout=open(OUT/'native-server.log','w'),stderr=subprocess.STDOUT);state['serverPid']=server.pid;time.sleep(.2);assert server.poll() is None
  for job in plan['jobs']:
   assert all(sha(f)==h for f,h in plan['sources'].items()),'Frozen source changed'
   tag=job['tag'];state.update(phase='running',tag=tag);save();raw=ROOT/'test/out/fp-review';before={p.name:p.stat().st_mtime_ns for p in raw.glob('*') if p.is_file()}
   with open(OUT/(tag+'.log'),'w') as log:
    child=subprocess.Popen(['node','test/fpjunctionlessonbrowser.js'],env={**os.environ,**job['env'],'QA_BASE':'http://127.0.0.1:8400','QA_TAG':tag,'QA_FONT':'noto'},stdout=log,stderr=log);state['childPid']=child.pid;save();code=child.wait(timeout=1800)
   folder=OUT/'native'/tag;folder.mkdir(parents=True,exist_ok=True);artifacts={}
   for p in raw.glob('*'):
    if p.is_file() and before.get(p.name)!=p.stat().st_mtime_ns:shutil.copyfile(p,folder/p.name);artifacts[p.name]=sha(folder/p.name)
   changed=[f for f,h in plan['sources'].items() if sha(f)!=h];entry={'tag':tag,'exit':code,'changed':changed,'artifacts':artifacts};state['jobs'].append(entry);save();assert code==0 and not changed,'Native job failed: '+tag
  state['phase']='complete'
 except Exception as error:state.update(phase='failed',failure=str(error))
 finally:
  if server is not None and server.poll() is None:server.terminate();server.wait(timeout=10)
  state.update(serverExited=server is None or server.poll() is not None,leaseReleased=True,endedAt=time.time());save()
