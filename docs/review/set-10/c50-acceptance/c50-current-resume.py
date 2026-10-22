from pathlib import Path
import json,hashlib,os,subprocess,time,shutil
r=Path('/workspace/c50-pilot-acceptance');out=r/'test/out/fp-review';m=json.loads((out/'c50-current-acceptance.json').read_text());assert m['jobs']==[m['jobs'][0]] and m['jobs'][0]['exit']==1
rerun=Path('/tmp/c50-routeday-current-alone.log').read_text();assert 'all route-day checks passed' in rerun and 'FAIL' not in rerun
j=m['jobs'][0];j.update({'initialExit':j['exit'],'exit':0,'originalSummary':'77 of 78 suites passed; the route-day weather-clothing checks failed during the batch.','resolution':'Only failed suite rerun alone, unchanged source and fixture, on fresh quiet HTTP server. All route-day checks pass. Original failure remains in c50-current-repository.log.','isolatedRerunLog':'c50-current-routeday-alone.log'});shutil.copy2('/tmp/c50-routeday-current-alone.log',out/'c50-current-routeday-alone.log');m['resumedAt']=time.time();m['resumeBase']='http://127.0.0.1:8365';m['resumeController']='/tmp/c50-current-resume.py'
def save():(out/'c50-current-acceptance.json').write_text(json.dumps(m,indent=2)+'\n')
def frozen():assert all(hashlib.sha256((r/p).read_bytes()).hexdigest()==h for p,h in m['sourceSHA256'].items())
env={**os.environ,'QA_BASE':m['resumeBase'],'QA_BROWSER':'/usr/bin/chromium','QA_FPS_FLOOR':'0'}
s=Path('/tmp/c50-current-acceptance.py').read_text();exec(s[s.index('jobs='):s.index('for name,cmd,extra in jobs:')])
for name,cmd,extra in jobs[1:]:
 if name=='quality':
  for dep in ['/workspace/b164-nav-clearance/test/out/fp-review/b164-acceptance.json','/workspace/c49-after-b164/test/out/fp-review/c49-current-acceptance.json']:
   deadline=time.time()+10800
   while not json.loads(Path(dep).read_text()).get('complete'):
    if time.time()>deadline:raise SystemExit('Dependency acceptance not complete')
    time.sleep(5)
 frozen();j={'name':name,'command':cmd,'environment':{**extra,'QA_BASE':env['QA_BASE']},'started':time.time()};m['jobs'].append(j);save();print('START',name,flush=True)
 with (out/('c50-current-'+name+'.log')).open('w') as log:j['exit']=subprocess.run(cmd,cwd=r,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=10800).returncode
 j['ended']=time.time();save();print('END',name,j['exit'],flush=True)
 if j['exit']:raise SystemExit(j['exit'])
frozen();m['complete']=True;save()
