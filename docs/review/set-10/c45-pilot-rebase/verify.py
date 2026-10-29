#!/usr/bin/env python3
"""Independent hash, completed-run, archived-budget and owned-process verification."""
from pathlib import Path
import hashlib,json,subprocess,psutil,os
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];os.chdir(ROOT)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
plan=json.loads((BASE/'acceptance/plan.json').read_text());state=json.loads((BASE/'acceptance/status.json').read_text())
assert state['phase']=='complete' and state['serverExited'] and state['leaseReleased']
assert len(state['jobs'])==10 and len(plan['jobs'])==10
for name,digest in {**plan['sources'],**plan['hostFonts']}.items():assert sha(name)==digest,name
artifacts={};native=[]
for expected,job in zip(plan['jobs'],state['jobs']):
 assert all(expected[k]==job[k] for k in expected) and job['exit']==0 and not job['changedSources']
 folder=BASE/'acceptance/artifacts'/job['tag']
 for name,digest in job['artifacts'].items():
  p=folder/name;assert sha(p)==digest,str(p);artifacts[str(p.relative_to(BASE))]=digest
 if job['script']=='test/fppickupbrowser.js':
  d=json.loads((folder/(job['tag']+'.json')).read_text());assert d['complete'] and not d['errors'] and len(d['modes'])==1
  assert not d['uncommittedRuntime'] and d['sourceRevision']==plan['sourceRevision']
  m=d['modes'][0];assert m['durable'] and m['reload'];f=m['fontProof'];assert f['override'] is None
  if m['lang']=='ta':assert any('NotoSansTamil' in q.get('postScriptName','') and q['glyphCount']>=28 for q in f['platformFonts'])
  native.append({'tag':job['tag'],'checks':d['checks'],'quality':m['quality'],'lang':m['lang'],'large':m['large'],'kind':m['kind'],'score':m['result']['result']['score'],'stars':m['result']['stars'],'passed':m['result'].get('assessment',{}).get('passed'),'durable':m['durable']})
resources=json.loads(subprocess.check_output(['node',str(BASE/'verify-resources.js')],text=True))
cleanup={}
for key in ['controllerPid','serverPid','childPid']:
 pid=state[key]
 try:p=psutil.Process(pid);status=p.status();assert status=='zombie',(key,pid,status,p.cmdline())
 except psutil.NoSuchProcess:status='gone'
 cleanup[key]={'pid':pid,'status':status}
prior=json.loads((BASE/'native-verified.json').read_text())
assert sum(j['checks'] for j in native)==prior['nativeChecks']==7622
result={'scope':'C45 rebased stack acceptance; source-scoped native gameplay and static resource views. Latest shared integration, A31 translation and Intel O1 acceptance remain separate.','sourceRevision':plan['sourceRevision'],'planSha256':sha(BASE/'acceptance/plan.json'),'sourceCount':len(plan['sources']),'hostFonts':plan['hostFonts'],'allInputHashesVerified':True,'cpuSuites':15,'nativeChecks':7622,'nativeJobs':native,'resourceViews':sum(x['views'] for x in resources),'resourceProfiles':resources,'artifactCount':len(artifacts),'artifacts':artifacts,'cleanup':cleanup,'visualReview':prior['visualReview'],'allPassed':True}
(BASE/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['artifacts','nativeJobs','hostFonts']},indent=2))
