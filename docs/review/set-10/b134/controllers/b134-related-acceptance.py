from pathlib import Path
import subprocess,os,json,hashlib
r=Path('/workspace/b134-handheld-layout');o=r/'test/out/fp-review';env={**os.environ,'QA_BASE':'http://127.0.0.1:8352','QA_BROWSER':'/usr/bin/chromium','QA_FPS_FLOOR':'0'}
files=['src/core/fpaccess.js','test/fpaccess.js','test/fphandheldbrowser.js','test/fpaccessbrowser.js'];frozen={p:hashlib.sha256((r/p).read_bytes()).hexdigest() for p in files}
m={'source':'66440652','sourceSHA256':frozen,'complete':False,'jobs':[]}
for name in ['fpaccessbrowser','fphudbrowser']:
 assert all(hashlib.sha256((r/p).read_bytes()).hexdigest()==h for p,h in frozen.items());j={'name':name};m['jobs'].append(j);print('START',name,flush=True)
 with (o/('b134-final-'+name+'.log')).open('w') as f:j['exit']=subprocess.run(['node','test/'+name+'.js'],cwd=r,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=3600).returncode
 (o/'b134-related-acceptance.json').write_text(json.dumps(m,indent=2));print('END',name,j['exit'],flush=True)
 if j['exit']:raise SystemExit(1)
m['complete']=True;(o/'b134-related-acceptance.json').write_text(json.dumps(m,indent=2))
