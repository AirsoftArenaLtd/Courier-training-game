from pathlib import Path
import subprocess as s,os,json
r=Path('/workspace/c33-stops');out=r/'test/out/fp-review';env=os.environ.copy();env.update({k:'1' for k in ['QA_STOPS','QA_DAMAGE','QA_TRAFFIC','QA_LATER','QA_NAV','QA_SIGNS','QA_CAMERA','QA_CAB','QA_MIRRORS','QA_REAR','QA_LIGHTING','QA_WEATHER','QA_CARGO','QA_ACTORS','QA_TOWN']})
for kind,on in [('loaded','1'),('fallback','0')]:
 tag='c33-combined-'+kind;print('Running '+tag,flush=True)
 with (out/(tag+'-sweep.log')).open('w') as log:p=s.run(['node','--test','--test-isolation=none','test/fproute.js'],cwd=r,env=env|{'QA_ASSETS':on,'QA_TAG':tag},stdout=log,stderr=s.STDOUT)
 print(json.dumps({'kind':kind,'exit':p.returncode}),flush=True)
 if p.returncode:raise SystemExit(p.returncode)
 print((out/(tag+'-geometry.json')).read_text(),flush=True)
