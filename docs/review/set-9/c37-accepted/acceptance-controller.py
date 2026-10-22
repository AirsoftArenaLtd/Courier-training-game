from pathlib import Path
import subprocess,os,json,time,hashlib
root=Path('/workspace/c37-replay');out=root/'test/out/fp-review'
env={**os.environ,'NODE_PATH':'/workspace/Courier-training-game/test/node_modules','QA_BROWSER':'/usr/bin/chromium','QA_BASE':'http://127.0.0.1:8347','QA_FPS_FLOOR':'0'}
paths=[p for p in subprocess.check_output(['git','ls-files'],cwd=root,text=True).splitlines() if p=='index.html' or p.endswith(('.js','.cjs')) and p.startswith(('src/','test/'))]
frozen={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in paths}
meta={'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'sourceSHA256':frozen,'complete':False,'jobs':[]};dest=out/'c37-release-acceptance.json'
def save():dest.write_text(json.dumps(meta,indent=2)+'\n')
jobs=[('native-low',['node','test/fpreplaybrowser.js'],{'QA_GFX':'low','QA_TAG':'c37-release-low'}),('native-later-low',['node','test/fpreplaybrowser.js'],{'QA_GFX':'low','QA_ROUTE_DAY':'4','QA_LANGS':'ta','QA_SIZES':'large','QA_TAG':'c37-release-later-low'}),('native-high',['node','test/fpreplaybrowser.js'],{'QA_GFX':'high','QA_ROUTE_DAY':'4','QA_LANGS':'en,ta','QA_SIZES':'large','QA_TAG':'c37-release-high'}),('drivemap',['node','test/drivemapbrowser.js'],{'NODE_OPTIONS':'--require=/tmp/c37-http-test-adapter.cjs'}),('drive-review',['node','test/qa.js','--only','drive-review','--pass','golden','--shots'],{'QA_GFX':'low','QA_PORT':'8350'}),('quality',['node','test/fpquality.js'],{'QA_TAG':'c37-release'})]
save()
for name,cmd,extra in jobs:
 if any(hashlib.sha256((root/p).read_bytes()).hexdigest()!=h for p,h in frozen.items()):raise RuntimeError('Frozen source changed before '+name)
 item={'name':name,'command':cmd,'environment':extra,'started':time.time()};meta['jobs'].append(item);save();print('START',name,flush=True)
 with (out/('c37-release-'+name+'.log')).open('w') as log:
  try:item['exit']=subprocess.run(cmd,cwd=root,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=14400).returncode
  except subprocess.TimeoutExpired:item['exit']=124
 item['ended']=time.time();save();print('END',name,item['exit'],flush=True)
 if item['exit']:meta['blockedAt']=name;save();raise SystemExit(1)
meta['complete']=True;save()
