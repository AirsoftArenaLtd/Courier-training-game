from pathlib import Path
import subprocess,os,json,hashlib,time
root=Path('/workspace/b134-handheld-layout');out=root/'test/out/fp-review'
env={**os.environ,'QA_BROWSER':'/usr/bin/chromium','QA_BASE':'http://127.0.0.1:8352','QA_FPS_FLOOR':'0'}
files=['src/core/fpaccess.js','test/fpaccess.js','test/fphandheldbrowser.js'];frozen={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files}
m={'source':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'sourceSHA256':frozen,'complete':False,'jobs':[]}
def save(): (out/'b134-acceptance.json').write_text(json.dumps(m,indent=2))
for name,cmd,extra in [('access',['node','test/fpaccess.js'],{}),('handheld-low',['node','test/fphandheldbrowser.js'],{'QA_TAG':'b134-final'}),('handheld-high',['node','test/fphandheldbrowser.js'],{'QA_TAG':'b134-final','QA_GFX':'high','QA_LANGS':'en,ta'}),('doors',['node','test/fpdoorsbrowser.js'],{}),('bench',['node','test/fpbench.js'],{'QA_PROTOTYPE_ONLY':'1','QA_GFX':'low','QA_TAG':'b134-final','QA_VIEWS':'cab,handheld,doorsignature,doorid','QA_A11Y':'large,colour,reduced'})]:
 if any(hashlib.sha256((root/p).read_bytes()).hexdigest()!=h for p,h in frozen.items()):raise RuntimeError('Frozen source changed')
 print('START',name,flush=True);j={'name':name,'command':cmd,'environment':extra};m['jobs'].append(j);save()
 with (out/('b134-final-'+name+'.log')).open('w') as f:j['exit']=subprocess.run(cmd,cwd=root,env={**env,**extra},stdout=f,stderr=subprocess.STDOUT,timeout=3600).returncode
 save();print('END',name,j['exit'],flush=True)
 if j['exit']:raise SystemExit(1)
m['complete']=True;save()
