from pathlib import Path
import json,hashlib,os,subprocess,time
r=Path('/workspace/c49-materials');out=r/'test/out/fp-review';m=json.loads(Path('/tmp/c49-final-source.json').read_text())
env={**os.environ,'QA_BROWSER':'/usr/bin/chromium','QA_BASE':'http://127.0.0.1:8354','QA_FPS_FLOOR':'0'}
def save(): (out/'c49-acceptance.json').write_text(json.dumps(m,indent=2)+'\n')
jobs=[('pixels',['node','test/fpmaterialsbrowser.js'],{'QA_TAG':'c49-final-materials'}),('assets',['node','test/fpassetsbrowser.js'],{'QA_MODES':'high,high-fallback','QA_TAG':'c49-final-assets'}),('town-high',['node','test/fptownbrowser.js'],{'QA_GFX':'high','QA_TAG':'c49-final-town'}),('repository',['node','test/run-all.js'],{}),('quality',['node','test/fpquality.js'],{'QA_TAG':'c49-final'})]
for name,cmd,extra in jobs:
 assert all(hashlib.sha256((r/p).read_bytes()).hexdigest()==h for p,h in m['sourceSHA256'].items())
 print('START',name,flush=True);j={'name':name,'command':cmd,'environment':extra,'started':time.time()};m['jobs'].append(j);save()
 with (out/('c49-final-'+name+'.log')).open('w') as log:j['exit']=subprocess.run(cmd,cwd=r,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=7200).returncode
 j['ended']=time.time();save();print('END',name,j['exit'],flush=True)
 if j['exit']:raise SystemExit(1)
assert all(hashlib.sha256((r/p).read_bytes()).hexdigest()==h for p,h in m['sourceSHA256'].items())
m['complete']=True;save()
