from pathlib import Path
import subprocess,json,hashlib,os
r=Path('/workspace/c48-cab-visibility');out=r/'test/out/fp-review'
m=json.loads(Path('/tmp/c48-marker-native-source.json').read_text());env={**os.environ,'QA_BROWSER':'/usr/bin/chromium','QA_BASE':'http://127.0.0.1:8348','QA_FPS_FLOOR':'0'}
def save(): (out/'c48-marker-acceptance.json').write_text(json.dumps(m,indent=2))
for name,cmd,extra in [('walk-high',['node','test/fpwalkaroundbrowser.js'],{'QA_GFX':'high','QA_LANGS':'en','QA_SIZES':'normal','QA_TAG':'c48-marker-high'}),('walk-low',['node','test/fpwalkaroundbrowser.js'],{'QA_GFX':'low','QA_LANGS':'ta','QA_SIZES':'large','QA_TAG':'c48-marker-low'}),('bench-low',['node','test/fpbench.js'],{'QA_PROTOTYPE_ONLY':'1','QA_GFX':'low','QA_TAG':'c48-marker','QA_VIEWS':'walkfront,walkrecord,walksummary','QA_WALKAROUND':'1','QA_DAMAGE':'1','QA_A11Y':'large,colour,reduced','QA_SHOTS':'1'}),('bench-high',['node','test/fpbench.js'],{'QA_PROTOTYPE_ONLY':'1','QA_GFX':'high','QA_TAG':'c48-marker','QA_VIEWS':'walkfront,walkrecord,walksummary','QA_WALKAROUND':'1','QA_DAMAGE':'1','QA_SHOTS':'1'})]:
 assert all(hashlib.sha256((r/p).read_bytes()).hexdigest()==h for p,h in m['sourceSHA256'].items());print('START',name,flush=True);j={'name':name,'command':cmd,'environment':extra};m['jobs'].append(j);save()
 with (out/('c48-marker-'+name+'.log')).open('w') as log:j['exit']=subprocess.run(cmd,cwd=r,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=3600).returncode
 save();print('END',name,j['exit'],flush=True)
 if j['exit']:raise SystemExit(1)
m['complete']=True;save()
