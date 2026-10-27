from pathlib import Path
import json,hashlib,os,subprocess,time
r=Path('/workspace/c49-materials');out=r/'test/out/fp-review';meta=out/'c49-acceptance.json';deadline=time.time()+7200
# The shared credits are deliberately untouched. If that known gate stops the primary runner,
# continue the unaffected resource measurements after its other browsers have closed.
while True:
 if time.time()>deadline:raise SystemExit('Timed out waiting for the primary repository check')
 m=json.loads(meta.read_text());repo=next((j for j in m['jobs'] if j['name']=='repository'),None)
 if repo and 'exit' in repo:
  if repo['exit']==0:print('Primary runner handles quality',flush=True);raise SystemExit(0)
  break
 time.sleep(5)
assert all(hashlib.sha256((r/p).read_bytes()).hexdigest()==h for p,h in m['sourceSHA256'].items())
q={'source':m['source'],'runtimeSource':m['runtimeSource'],'sourceSHA256':m['sourceSHA256'],'reason':'Primary repository check failed; keep the independent graphics gate visible. Credits remain owned by Claude.','complete':False,'command':['node','test/fpquality.js'],'started':time.time()}
(out/'c49-quality-followup.json').write_text(json.dumps(q,indent=2)+'\n');print('START independent quality gate',flush=True)
env={**os.environ,'QA_BROWSER':'/usr/bin/chromium','QA_BASE':'http://127.0.0.1:8354','QA_FPS_FLOOR':'0','QA_TAG':'c49-final'}
with (out/'c49-final-quality.log').open('w') as log:q['exit']=subprocess.run(q['command'],cwd=r,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=7200).returncode
q['ended']=time.time();q['complete']=True;(out/'c49-quality-followup.json').write_text(json.dumps(q,indent=2)+'\n');print('END independent quality gate',q['exit'],flush=True)
raise SystemExit(q['exit'])
