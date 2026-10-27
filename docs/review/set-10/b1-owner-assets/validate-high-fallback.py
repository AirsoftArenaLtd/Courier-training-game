"""One additional High fallback comparison; retain the completed six-job plan unchanged."""
from pathlib import Path
import fcntl,hashlib,json,os,shutil,subprocess,time
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[3];os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
plan=json.loads((OUT/'browser-plan.json').read_text());assert json.loads((OUT/'browser-status.json').read_text())['phase']=='complete'
r={'tag':'b1-desk-fallback-high','scope':'All models404 at High; original procedural station bodies are the before/fallback comparison. Other source inputs match the completed six-job map.','priorPlanSha256':sha(OUT/'browser-plan.json'),'sourceInputsVerified':len(plan['sources'])}
with open('/workspace/.otr-browser-validation.lock','a') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX);server=None
 try:
  assert all(sha(f)==h for f,h in plan['sources'].items())
  with open(OUT/'high-fallback-server.log','w') as log:
   server=subprocess.Popen(['python3','-m','http.server','8398'],cwd=ROOT,stdout=log,stderr=log);r['serverPid']=server.pid;time.sleep(.2);assert server.poll() is None
   with open(OUT/'high-fallback.log','w') as output:
    r['exit']=subprocess.call(['node','test/fpbench.js'],env={**os.environ,'QA_BASE':plan['base'],'QA_TAG':r['tag'],'QA_HUB_ONLY':'1','QA_PROTOTYPE_ONLY':'1','QA_VIEWS':'hub','QA_GFX':'high','QA_FALLBACK':'1','QA_SHOTS':'1','QA_FPS_FLOOR':'0'},stdout=output,stderr=output,timeout=600)
  r['changedSources']=[f for f,h in plan['sources'].items() if sha(f)!=h];r['accepted']=r['exit']==0 and not r['changedSources'];r['artifacts']=[]
  for p in sorted((ROOT/'test/out/fp-review').glob('*'+r['tag']+'*')):
   if p.is_file():shutil.copyfile(p,OUT/'artifacts'/p.name);r['artifacts'].append({'file':p.name,'sha256':sha(OUT/'artifacts'/p.name)})
 finally:
  if server is not None and server.poll() is None:server.terminate();server.wait(timeout=10)
  r.update(serverExited=server is None or server.poll() is not None,leaseReleased=True);(OUT/'high-fallback-result.json').write_text(json.dumps(r,indent=2)+'\n')
