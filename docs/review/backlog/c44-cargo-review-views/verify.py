#!/usr/bin/env python3
"""Audit the recorded cohort and original resource checker without launching a browser."""
from pathlib import Path
import json,hashlib,subprocess,psutil,struct
KIND='cargo';PARENT='80bf9f94';EXPECTED_VIEWS=4;SCOPE='Static cargo review-pose polish only; production bytes match accepted C44. Native gameplay remains in the separate completed C44 cohort; Intel O1 is separate.'
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[3];OUT=BASE/'acceptance'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
plan=json.loads((OUT/'plan.json').read_text());status=json.loads((OUT/'status.json').read_text())
assert status['phase']=='complete' and status['serverExited'] and status['leaseReleased']
assert len(status['jobs'])==len(plan['jobs'])
for f,h in {**plan['sources'],**plan['hostFonts']}.items():assert sha(ROOT/f if not Path(f).is_absolute() else f)==h,f
artifacts=0
for expected,job in zip(plan['jobs'],status['jobs']):
 assert job['tag']==expected['tag'] and job['script']==expected['script'] and job['exit']==0 and not job['changedSources']
 for f,h in job['artifacts'].items():assert sha(OUT/'artifacts'/job['tag']/f)==h,f;artifacts+=1
cleanup={}
for key in ['controllerPid','serverPid','childPid']:
 pid=status[key]
 try:state=psutil.Process(pid).status();assert state==psutil.STATUS_ZOMBIE,(pid,state)
 except psutil.NoSuchProcess:state='gone'
 cleanup[key]={'pid':pid,'status':state}
scopes=['src','data','lib','assets','css','index.html','first-person.html']
if KIND=='combined':scopes+=['test']
diff=subprocess.check_output(['git','diff','--name-only',PARENT,'HEAD','--',*scopes],cwd=ROOT,text=True);assert not diff,diff
log_count=0
if KIND=='cargo':
 audit=json.loads((BASE/'source-audit.json').read_text());cpu=json.loads((BASE/'cpu.json').read_text())
 for p,h in audit['changedTestSources'].items():assert sha(ROOT/p)==h,p
 for p,h in audit['cpuLogs'].items():assert sha(BASE/p)==h;log_count+=1
 assert len(cpu['suites'])==3 and all(x['exit']==0 for x in cpu['suites'])
else:
 protocol=json.loads((BASE/'protocol.json').read_text());assert sha(ROOT/'test/fpquality.js')==protocol['originalQualityCheckerSha256'];assert sha(BASE/'validate.py')==protocol['controllerSha256']
visual=json.loads((BASE/'visual-review.json').read_text());assert len(visual['captures'])>=4
for capture in visual['captures']:
 p=BASE/capture['path'];assert sha(p)==capture['sha256'];raw=p.read_bytes();assert raw[:8]==b'\x89PNG\r\n\x1a\n';assert list(struct.unpack('>II',raw[16:24]))==capture['resolution']==[1280,720];assert capture['notes']
resources=json.loads(subprocess.check_output(['node',str(BASE/'verify-resources.js')],cwd=ROOT,text=True));assert resources['views']==EXPECTED_VIEWS
result={'scope':SCOPE,'sourceRevision':plan['sourceRevision'],'planSha256':sha(OUT/'plan.json'),'sourceCount':len(plan['sources']),'hostFontCount':len(plan['hostFonts']),'allInputHashesVerified':True,'productionDifferencesFromParent':[],'parent':PARENT,'cpuLogsVerified':log_count,'artifactCount':artifacts,'resourceViews':resources['views'],'profiles':resources['profiles'],'perViewLedger':resources.get('ledger',[]),'visualReadings':len(visual['captures']),'cleanup':cleanup,'allPassed':True}
(BASE/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='perViewLedger'},indent=2))
