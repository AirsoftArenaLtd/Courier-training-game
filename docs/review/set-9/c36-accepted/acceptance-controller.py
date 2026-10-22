from pathlib import Path
import subprocess,json,hashlib,os,time
root=Path('/workspace/c36-radio-night');out=root/'test/out/fp-review'
env={**os.environ,'QA_BASE':'http://127.0.0.1:8346','QA_BROWSER':'/usr/bin/chromium','QA_FPS_FLOOR':'0','NODE_PATH':'/workspace/Courier-training-game/test/node_modules'}
paths=[p for p in subprocess.check_output(['git','ls-files'],cwd=root,text=True).splitlines() if p=='index.html' or p.endswith(('.js','.cjs')) and p.startswith(('src/','test/'))]
frozen={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in paths}
q={'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'sourceSHA256':frozen,'complete':False,'jobs':[]}
meta=out/'c36-release-acceptance.json'
def save():meta.write_text(json.dumps(q,indent=2)+'\n')
jobs=[('quality',['node','test/fpquality.js'],{'QA_TAG':'c36-release'}),('shared',['node','test/qa.js','--only','drive-review,workday-3d,workday-aids,workday-3d-b,workday-3d-c,workday-3d-d,workday-3d-e,workday-3d-f,workday-3d-g','--pass','golden','--shots'],{'QA_GFX':'low','QA_PORT':'8348'})]
save()
for name,cmd,extra in jobs:
 if any(hashlib.sha256((root/p).read_bytes()).hexdigest()!=h for p,h in frozen.items()):raise RuntimeError('Source changed before '+name)
 item={'name':name,'command':cmd,'environment':extra,'started':time.time()};q['jobs'].append(item);save();print('START',name,flush=True)
 with (out/('c36-release-'+name+'.log')).open('w') as log:
  try:item['exit']=subprocess.run(cmd,cwd=root,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=14400).returncode
  except subprocess.TimeoutExpired:item['exit']=124
 item['ended']=time.time();save();print('END',name,item['exit'],flush=True)
 if item['exit']:q['blockedAt']=name;save();raise SystemExit(1)
q['complete']=True;save()
