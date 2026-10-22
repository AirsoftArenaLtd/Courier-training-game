from pathlib import Path
import json,hashlib,os,subprocess,time
r=Path('/workspace/c50-pilot-acceptance');out=r/'test/out/fp-review';m=json.loads(Path('/tmp/c50-current-source.json').read_text());env={**os.environ,'QA_BASE':'http://127.0.0.1:8363','QA_BROWSER':'/usr/bin/chromium','QA_FPS_FLOOR':'0'}
def save():(out/'c50-current-acceptance.json').write_text(json.dumps(m,indent=2)+'\n')
def frozen():assert all(hashlib.sha256((r/p).read_bytes()).hexdigest()==h for p,h in m['sourceSHA256'].items())
jobs=[('repository',['node','test/run-all.js'],{}),('ink',['node','test/fpsignletteringbrowser.js'],{'QA_TAG':'c50-current-ink'}),('reading',['node','test/fpsignsbrowser.js'],{'QA_TAG':'c50-current-reading'}),('layout-low',['node','test/fpsignlayoutbrowser.js'],{'QA_TAG':'c50-current-layout'}),('layout-high',['node','test/fpsignlayoutbrowser.js'],{'QA_GFX':'high','QA_LANGS':'en,ta','QA_TAG':'c50-current-layout-high'}),('town',['node','test/fptownbrowser.js'],{'QA_GFX':'high','QA_TAG':'c50-current-town'}),('quality',['node','test/fpquality.js'],{'QA_TAG':'c50-current'})]
for name,cmd,extra in jobs:
 if name=='quality':
  for dep in ['/workspace/b164-nav-clearance/test/out/fp-review/b164-acceptance.json','/workspace/c49-after-b164/test/out/fp-review/c49-current-acceptance.json']:
   deadline=time.time()+10800
   while not json.loads(Path(dep).read_text()).get('complete'):
    if time.time()>deadline:raise SystemExit('Dependency acceptance not complete')
    time.sleep(5)
 frozen();j={'name':name,'command':cmd,'environment':extra,'started':time.time()};m['jobs'].append(j);save();print('START',name,flush=True)
 with (out/('c50-current-'+name+'.log')).open('w') as log:j['exit']=subprocess.run(cmd,cwd=r,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=10800).returncode
 j['ended']=time.time();save();print('END',name,j['exit'],flush=True)
 if j['exit']:raise SystemExit(j['exit'])
frozen();m['complete']=True;save()
