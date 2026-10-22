from pathlib import Path
import subprocess,os,json,hashlib,time
root=Path('/workspace/c48-pilot-acceptance');out=root/'test/out/fp-review';out.mkdir(parents=True,exist_ok=True)
env={**os.environ,'QA_BROWSER':'/usr/bin/chromium','QA_FPS_FLOOR':'0','QA_GFX':'low','QA_PORT':'8353'}
paths=[p for p in subprocess.check_output(['git','ls-files'],cwd=root,text=True).splitlines() if (p.startswith(('src/','test/')) and p.endswith('.js')) or p=='index.html']
frozen={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in paths}
m={'pilotBase':'d1caa22e','ownedC48Source':'bf60fc1f','patchSHA256':hashlib.sha256(Path('/tmp/c48-pilot-owned.patch').read_bytes()).hexdigest(),'sourceSHA256':frozen,'complete':False,'jobs':[]}
def save(): (out/'c48-current-pilot-acceptance.json').write_text(json.dumps(m,indent=2))
save();print('Waiting for B-134 browser slot',flush=True)
while True:
 p=Path('/workspace/b134-handheld-layout/test/out/fp-review/b134-acceptance.json')
 if p.exists():
  b=json.loads(p.read_text())
  if b.get('complete'):break
 time.sleep(5)
for name,cmd in [('mission',['node','test/fpmission.js']),('world',['node','test/fpworld.js']),('workday',['node','test/workday.js']),('save',['node','test/savesize.js']),('shared-strict',['node','test/qa.js','--only','workday-3d,workday-3d-b','--pass','golden','--shots'])]:
 if any(hashlib.sha256((root/p).read_bytes()).hexdigest()!=h for p,h in frozen.items()):raise RuntimeError('Candidate source changed')
 print('START',name,flush=True);j={'name':name,'command':cmd};m['jobs'].append(j);save()
 with (out/('c48-current-pilot-'+name+'.log')).open('w') as f:j['exit']=subprocess.run(cmd,cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=7200).returncode
 save();print('END',name,j['exit'],flush=True)
 if j['exit']:raise SystemExit(1)
m['complete']=True;save()
