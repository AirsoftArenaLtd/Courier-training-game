import os,json,subprocess,time,hashlib
from pathlib import Path
root=Path('/workspace/c35-walkaround');out=root/'test/out/fp-review';
revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
paths=[p for p in subprocess.check_output(['git','ls-files'],cwd=root,text=True).splitlines() if p=='index.html' or p.endswith('.js') and p.startswith(('src/','test/'))]
hashes={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in paths}
jobs=[
 ('walk-high-en',['node','test/fpwalkaroundbrowser.js'],{'QA_GFX':'high','QA_TAG':'c35-final-high-en','QA_LANGS':'en','QA_SIZES':'normal'}),
 ('walk-high-ta',['node','test/fpwalkaroundbrowser.js'],{'QA_GFX':'high','QA_TAG':'c35-final-high-ta','QA_LANGS':'ta','QA_SIZES':'large'}),
 ('walk-low-en',['node','test/fpwalkaroundbrowser.js'],{'QA_GFX':'low','QA_TAG':'c35-final-low-en','QA_LANGS':'en','QA_SIZES':'normal,large'}),
 ('walk-low-ta',['node','test/fpwalkaroundbrowser.js'],{'QA_GFX':'low','QA_TAG':'c35-final-low-ta','QA_LANGS':'ta','QA_SIZES':'normal,large'}),
 ('guide',['node','test/fpguidebrowser.js'],{}),
 ('access',['node','test/fpaccessbrowser.js'],{}),
 ('damage-low',['node','test/fpdamagebrowser.js'],{'QA_GFX':'low','QA_TAG':'c35-current-damage-low'}),
 ('page-academy',['node','test/academy.js'],{}),
 ('page-enterprise',['node','test/enterprise.js'],{'NODE_OPTIONS':'--require /tmp/c35-http-test-adapter.cjs'}),
 ('page-routeday',['node','test/routeday.js'],{'NODE_OPTIONS':'--require /tmp/c35-http-test-adapter.cjs'}),
 ('page-driving',['node','test/driving.js'],{'NODE_OPTIONS':'--require /tmp/c35-http-test-adapter.cjs'}),
 ('quality',['node','test/fpquality.js'],{'QA_TAG':'c35-final'}),
 ('shared-flows',['node','test/qa.js','--only','workday-3d,workday-3d-b,workday-3d-c,workday-3d-d,workday-3d-e,workday-3d-f,workday-3d-g,workday-aids,drive-review','--pass','golden','--shots'],{'QA_GFX':'low'})
]
r={'sourceRevision':revision,'sourceSHA256':hashes,'prevalidated':[],'jobs':[],'complete':False};dest=out/'c35-final-browser-queue.json'
def save():dest.write_text(json.dumps(r,indent=2)+'\n')
save()
for name,args,extra in jobs:
 for p,h in hashes.items():
  if hashlib.sha256((root/p).read_bytes()).hexdigest()!=h:raise RuntimeError('Runtime changed during frozen browser queue: '+p)
 env={**os.environ,'NODE_PATH':'/workspace/Courier-training-game/test/node_modules','QA_BASE':'http://127.0.0.1:8345','QA_BROWSER':'/usr/bin/chromium','QA_FPS_FLOOR':'0',**extra}
 job={'name':name,'command':args,'environment':extra,'runtimeRevision':revision,'started':time.time()};r['jobs'].append(job);save();print('START',name,flush=True)
 with (out/('c35-final-batch-'+name+'.log')).open('w') as log:
  try:proc=subprocess.run(args,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=3600);job['exit']=proc.returncode
  except subprocess.TimeoutExpired:job['exit']='timeout'
 job['ended']=time.time();save();print('DONE',name,job['exit'],flush=True)
 if job['exit']!=0:
  r['stoppedOnFailure']=name;save();break
else:r['complete']=True;save()
