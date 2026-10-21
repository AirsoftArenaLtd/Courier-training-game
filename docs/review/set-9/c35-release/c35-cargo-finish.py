from pathlib import Path
import os,json,hashlib,subprocess,time,concurrent.futures,socket
root=Path('/workspace/c35-walkaround');out=root/'test/out/fp-review';dest=out/'c35-cargo-finish-queue.json'
previous=json.loads((out/'c35-final-browser-queue.json').read_text());assert any(j['name']=='quality' and j.get('exit')==0 for j in previous['jobs']),'Finish and record the frozen quality gate first.'
revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip();paths=[p for p in subprocess.check_output(['git','ls-files'],cwd=root,text=True).splitlines() if p=='index.html' or p.endswith('.js') and p.startswith(('src/','test/'))];hashes={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in paths}
r={'sourceRevision':revision,'sourceSHA256':hashes,'inheritedQueue':'c35-final-browser-queue.json','inheritedScope':'Native1926, guide89/access145, damage80, four required pages and179 resource views retain their individual measured sources. The only subsequent product delta is the non-rendered rear proxy x/width; new CPU, real-key cargo and rendered cargo/rear checks follow.','jobs':[],'complete':False}
def save():dest.write_text(json.dumps(r,indent=2)+'\n')
def guard():
 for p,h in hashes.items():
  assert hashlib.sha256((root/p).read_bytes()).hexdigest()==h,'Frozen source changed: '+p
base={**os.environ,'NODE_PATH':'/workspace/Courier-training-game/test/node_modules','QA_BASE':'http://127.0.0.1:8345','QA_BROWSER':'/usr/bin/chromium','QA_FPS_FLOOR':'0'}
def execute(j):
 with (out/('c35-cargo-batch-'+j['name']+'.log')).open('w') as log:
  try:p=subprocess.run(j['command'],cwd=root,env={**base,**j['environment']},stdout=log,stderr=subprocess.STDOUT,timeout=10800 if j['name'].startswith('shared-') else 3600);code=p.returncode
  except subprocess.TimeoutExpired:code='timeout'
 return code,time.time()
save()
for name,command,env in [
 ('native-low-ta',['node','test/fpwalkaroundbrowser.js'],{'QA_GFX':'low','QA_TAG':'c35-cargo-native-low-ta','QA_LANGS':'ta','QA_SIZES':'large'}),
 ('native-high-en',['node','test/fpwalkaroundbrowser.js'],{'QA_GFX':'high','QA_TAG':'c35-cargo-native-high-en','QA_LANGS':'en','QA_SIZES':'normal'}),
 ('resource',['node','/tmp/c35-cargo-resource.cjs'],{})]:
 guard();j={'name':name,'command':command,'environment':env,'runtimeRevision':revision,'started':time.time()};r['jobs'].append(j);save();print('START',name,flush=True);j['exit'],j['ended']=execute(j);save();print('DONE',name,j['exit'],flush=True)
 if j['exit']!=0:r['stoppedOnFailure']=name;save();raise SystemExit(1)
# Match the shared review's two-browser approach, on separate ports; each scenario runs exactly once.
groups=[('shared-a','drive-review,workday-3d,workday-aids,workday-3d-c,workday-3d-e'),('shared-b','workday-3d-b,workday-3d-d,workday-3d-f,workday-3d-g')]
sockets=[]
for _ in groups:s=socket.socket();s.bind(('127.0.0.1',0));sockets.append(s)
ports=[s.getsockname()[1] for s in sockets]
for s in sockets:s.close()
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 tasks={}
 for (name,ids),port in zip(groups,ports):
  guard();j={'name':name,'command':['node','test/qa.js','--only',ids,'--pass','golden','--shots'],'environment':{'QA_GFX':'low','QA_PORT':str(port)},'runtimeRevision':revision,'started':time.time()};r['jobs'].append(j);save();print('START',name,flush=True);tasks[pool.submit(execute,j)]=j
 for future in concurrent.futures.as_completed(tasks):
  j=tasks[future];j['exit'],j['ended']=future.result();save();print('DONE',j['name'],j['exit'],flush=True)
r['complete']=True;save()
