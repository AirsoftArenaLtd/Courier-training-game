from pathlib import Path
import json,hashlib,os,subprocess
r=Path('/workspace/b138-signal-scoring');out=r/'test/out/fp-review'
m=json.loads(Path('/tmp/b138-native-source.json').read_text())
env={**os.environ,'QA_BROWSER':'/usr/bin/chromium','QA_BASE':'http://127.0.0.1:8355','QA_FPS_FLOOR':'0'}
jobs=[('native-low',['node','test/fpsignalbrowser.js'],{'QA_GFX':'low','QA_TAG':'b138-final-low'}),('native-high',['node','test/fpsignalbrowser.js'],{'QA_GFX':'high','QA_LANGS':'en','QA_SIZES':'normal','QA_TAG':'b138-final-high'}),('bench-low',['node','test/fpbench.js'],{'QA_PROTOTYPE_ONLY':'1','QA_GFX':'low','QA_TAG':'b138-final','QA_VIEWS':'cab,handheld','QA_A11Y':'large,colour,reduced','QA_SHOTS':'1'}),('bench-high',['node','test/fpbench.js'],{'QA_PROTOTYPE_ONLY':'1','QA_GFX':'high','QA_TAG':'b138-final','QA_VIEWS':'cab,handheld','QA_SHOTS':'1'})]
for name,cmd,extra in jobs:
 assert all(hashlib.sha256((r/p).read_bytes()).hexdigest()==h for p,h in m['sourceSHA256'].items())
 print('START',name,flush=True);j={'name':name,'command':cmd,'environment':extra};m['jobs'].append(j)
 with (out/('b138-'+name+'.log')).open('w') as log:j['exit']=subprocess.run(cmd,cwd=r,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=2400).returncode
 (out/'b138-acceptance.json').write_text(json.dumps(m,indent=2)+'\n');print('END',name,j['exit'],flush=True)
 if j['exit']:raise SystemExit(1)
m['complete']=True;(out/'b138-acceptance.json').write_text(json.dumps(m,indent=2)+'\n')
